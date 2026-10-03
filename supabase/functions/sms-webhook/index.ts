// Expenso — SMS ingestion webhook.
//
// Pipeline:  SMS Forwarder → this function → sms_events → (later) parser → transactions
//
// Responsibilities (this phase ONLY):
//   1. Authenticate the device via `x-device-token` (SHA-256 hash match).
//   2. Accept only active devices and resolve their `user_id`.
//   3. Insert the raw SMS into `sms_events` (column `raw_message`) BEFORE any
//      parsing. `received_at`/`status` use DB defaults unless the payload
//      supplies a valid timestamp.
//   4. Update `devices.last_seen_at`.
//   5. Classify the SMS (OTP / transaction / unsupported) safely.
//   6. Parse financial SMS and insert a `transactions` row (real columns only),
//      with window-based duplicate protection and best-effort status updates.
//
// No fake data is ever created; parsing failure keeps the sms_event.
//
// Security:
//   - Raw token is never stored or logged (only its SHA-256 hex digest).
//   - Raw SMS contents are never logged.
//   - Service-role key lives only as a Supabase secret (never in the frontend).

import { errorResponse, isPreflight, json } from '../_shared/http.ts'
import { createServiceRoleClient } from '../_shared/supabase.ts'
import { hashDeviceToken } from '../_shared/deviceToken.ts'
import { classifySms } from '../_shared/smsClassifier.ts'
import { parseTransactionSms } from '../_shared/smsParser.ts'
import type { DeviceRow, SmsWebhookPayload } from '../_shared/types.ts'

const MAX_MESSAGE_LENGTH = 2000
const MAX_SENDER_LENGTH = 120

/**
 * Window (ms) within which two transactions from the same user with the same
 * amount are treated as duplicates. Bank SMS are sometimes re-delivered by the
 * forwarder; we also de-duplicate explicitly here because no DB unique
 * constraint is assumed.
 */
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000

/** Verified `sms_event_status` enum members (remote DB). */
const SMS_EVENT_STATUS = {
  received: 'received',
  processed: 'processed',
  ignored: 'ignored',
  failed: 'failed',
} as const

/** Verified `transaction_status` enum members (remote DB). */
const TRANSACTION_STATUS = {
  pending: 'pending',
  processed: 'processed',
  failed: 'failed',
  ignored: 'ignored',
} as const

Deno.serve(async (req: Request): Promise<Response> => {
  if (isPreflight(req)) {
    return new Response('ok', { status: 204 })
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405, 'method_not_allowed')
  }

  // ---- 1. Device token presence -------------------------------------------
  const deviceToken = req.headers.get('x-device-token')
  if (!deviceToken || deviceToken.trim().length === 0) {
    return errorResponse('Missing device token', 401, 'missing_token')
  }

  // ---- 2. Parse & validate body -------------------------------------------
  let payload: SmsWebhookPayload
  try {
    payload = (await req.json()) as SmsWebhookPayload
  } catch {
    return errorResponse('Malformed JSON body', 400, 'malformed_body')
  }

  const message = typeof payload?.message === 'string' ? payload.message.trim() : ''
  const sender = typeof payload?.sender === 'string' ? payload.sender.trim() : null

  if (message.length === 0) {
    return errorResponse('Missing message', 400, 'missing_message')
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return errorResponse('Message too long', 413, 'message_too_long')
  }

  const senderSafe =
    sender && sender.length > MAX_SENDER_LENGTH ? sender.slice(0, MAX_SENDER_LENGTH) : sender

  // ---- 3. Resolve device by token hash ------------------------------------
  let supabase
  try {
    supabase = createServiceRoleClient()
  } catch {
    // Secrets not configured; do not leak details.
    return errorResponse('Server not configured', 500, 'server_error')
  }

  let tokenHash: string
  try {
    tokenHash = await hashDeviceToken(deviceToken)
  } catch {
    return errorResponse('Authentication failed', 401, 'auth_failed')
  }

  const { data: device, error: deviceError } = await supabase
    .from('devices')
    .select('id, user_id, is_active, webhook_token_hash')
    .eq('webhook_token_hash', tokenHash)
    .maybeSingle<DeviceRow>()

  if (deviceError) {
    return errorResponse('Server error', 500, 'server_error')
  }
  if (!device) {
    return errorResponse('Invalid device token', 401, 'invalid_token')
  }
  if (!device.is_active) {
    return errorResponse('Device is not active', 403, 'device_inactive')
  }



  // ---- 5. Insert the SMS event BEFORE parsing -----------------------------
  const receivedAt =
    typeof payload?.timestamp === 'string' && !Number.isNaN(Date.parse(payload.timestamp))
      ? new Date(payload.timestamp).toISOString()
      : new Date().toISOString()

  // Real columns: id, user_id, device_id, sender, raw_message, received_at,
  // status (enum: received|processed|ignored|failed), processing_error,
  // created_at. Initial status is explicitly the verified value `received`.
  const { data: eventRow, error: insertError } = await supabase
    .from('sms_events')
    .insert({
      user_id: device.user_id,
      device_id: device.id,
      sender: senderSafe,
      raw_message: message,
      received_at: receivedAt,
      status: SMS_EVENT_STATUS.received,
    })
    .select('id')
    .single<{ id: string }>()

  if (insertError || !eventRow) {
    return errorResponse('Failed to store SMS event', 500, 'insert_failed')
  }

  // ---- 6. Update device last_seen_at --------------------------------------
  // Best-effort: a failure here must NOT fail the ingestion, since the SMS
  // event is already durably stored.
  const { error: touchError } = await supabase
    .from('devices')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', device.id)

  if (touchError) {
    // Non-fatal. No SMS content or token is ever logged.
    console.warn('devices.last_seen_at update failed')
  }

  // ---- 7. Set initial status + classify -----------------------------------
  // `status` is an unverified enum. We use conservative, self-describing
  // lowercase strings; if the DB enum rejects them the update fails softly and
  // the row keeps its DB default (ingestion is never lost).
  const classification = classifySms(message)

  if (classification.kind !== 'transaction') {
    await setStatus(supabase, eventRow.id, SMS_EVENT_STATUS.ignored, classification.reason)
    return json({
      ok: true,
      sms_event_id: eventRow.id,
      classification: classification.kind,
      parsed: false,
    })
  }

  // ---- 8. Parse the financial SMS -----------------------------------------
  const parsed = parseTransactionSms(message, senderSafe, receivedAt)
  if (!parsed) {
    await setStatus(supabase, eventRow.id, SMS_EVENT_STATUS.failed, 'parse_no_amount_or_type')
    return json({
      ok: true,
      sms_event_id: eventRow.id,
      classification: classification.kind,
      parsed: false,
    })
  }

  // ---- 9. Duplicate protection (no DB constraint assumed) -----------------
  // Same user + same amount within a short window → treat as a re-delivery.
  const windowStart = new Date(Date.parse(receivedAt) - DUPLICATE_WINDOW_MS).toISOString()
  const { data: existing } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', device.user_id)
    .eq('amount', parsed.amount)
    .gte('created_at', windowStart)
    .limit(1)

  if (existing && existing.length > 0) {
    await setStatus(supabase, eventRow.id, SMS_EVENT_STATUS.ignored, 'duplicate')
    return json({
      ok: true,
      sms_event_id: eventRow.id,
      classification: classification.kind,
      parsed: false,
      duplicate: true,
    })
  }

  // ---- 10. Insert the transaction (REAL columns only) ---------------------
  // NOTE: `is_small_transaction` does NOT exist in the real schema, so
  // small-spend status is derived in application logic (amount < 100), never
  // stored. `status` uses the verified `transaction_status` enum.
  const { data: txnRow, error: txnError } = await supabase
    .from('transactions')
    .insert({
      user_id: device.user_id,
      device_id: device.id,
      sms_event_id: eventRow.id,
      amount: parsed.amount,
      transaction_type: parsed.transactionType,
      payment_method: parsed.paymentMethod,
      merchant_name: parsed.merchantName,
      merchant_raw: parsed.merchantRaw,
      bank_name: parsed.bankName,
      account_last4: parsed.accountLast4,
      transaction_reference: parsed.transactionReference,
      transaction_at: parsed.transactionAt,
      confidence: parsed.confidence,
      status: TRANSACTION_STATUS.processed,
    })
    .select('id')
    .single<{ id: string }>()

  if (txnError || !txnRow) {
    await setStatus(supabase, eventRow.id, SMS_EVENT_STATUS.failed, 'transaction_insert_failed')
    return errorResponse('Failed to store transaction', 500, 'transaction_failed')
  }

  await setStatus(supabase, eventRow.id, SMS_EVENT_STATUS.processed, null)

  return json({
    ok: true,
    sms_event_id: eventRow.id,
    transaction_id: txnRow.id,
    classification: classification.kind,
    parsed: true,
  })
})

/**
 * Best-effort `sms_events` status/error update.
 *
 * `status` MUST be one of the verified `sms_event_status` enum members
 * (`received` | `processed` | `ignored` | `failed`). Failures are swallowed so
 * ingestion is never lost (the event row already exists).
 */
async function setStatus(
  supabase: ReturnType<typeof createServiceRoleClient>,
  eventId: string,
  status: string,
  processingError: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('sms_events')
    .update({ status, processing_error: processingError })
    .eq('id', eventId)
  if (error) {
    console.warn('sms_events status update skipped')
  }
}

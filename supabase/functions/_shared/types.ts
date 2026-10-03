// Minimal row shapes used by the SMS webhook Edge Function.
//
// These mirror the documented Supabase schema (devices, sms_events). They are
// intentionally narrow: only the columns this function reads/writes. No fake
// data is created anywhere.

/** Row from `devices` — only the columns the webhook needs. */
export interface DeviceRow {
  id: string
  user_id: string
  is_active: boolean
  webhook_token_hash: string
}

/** Shape accepted by the webhook POST body. */
export interface SmsWebhookPayload {
  message: string
  sender?: string
  timestamp?: string
}

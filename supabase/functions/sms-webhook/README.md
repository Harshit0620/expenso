# `sms-webhook` — SMS ingestion Edge Function

Receives forwarded SMS from an Android device, authenticates the device, and
stores the raw message in `sms_events`. **It does not parse or create
transactions yet** — that is a separate, modular step added next.

## Pipeline

```
Android SMS Forwarder
        │  POST + x-device-token
        ▼
sms-webhook (this function)
        │  SHA-256(token) → devices.webhook_token_hash (active only)
        │  insert raw SMS → sms_events
        │  update devices.last_seen_at
        ▼
(later) parser reads sms_events → inserts transactions
```

## Request

```
POST /functions/v1/sms-webhook
x-device-token: <raw device token>
Content-Type: application/json

{
  "message": "Rs.45.00 debited from A/C XX1234 ...",
  "sender": "VK-HDFCBK",          // optional
  "timestamp": "2026-10-03T09:12:00Z"  // optional, ISO-8601
}
```

`message` is required. `sender` and `timestamp` are optional. Missing/invalid
`timestamp` falls back to server time.

## Responses

| Status | `code`             | Meaning                                     |
| ------ | ------------------ | ------------------------------------------- |
| 200    | —                  | Stored. Body: `{ ok, sms_event_id, classification, parseable, parsed }` |
| 400    | `missing_message`  | `message` empty or absent                   |
| 400    | `malformed_body`   | Body is not valid JSON                      |
| 401    | `missing_token`    | `x-device-token` header absent              |
| 401    | `invalid_token`    | Hash not found in `devices`                 |
| 403    | `device_inactive`  | Device exists but `is_active = false`       |
| 404    | —                  | (not used)                                  |
| 405    | `method_not_allowed` | Non-POST request                          |
| 413    | `message_too_long` | `message` exceeds 2000 chars                |
| 500    | `server_error`     | Misconfigured secrets or DB error           |

`classification` is one of `transaction`, `otp`, `unsupported`, `malformed`.
`parsed` is always `false` in this phase.

## Required secrets

Set these once via the Supabase CLI (they are automatically available to
functions running on the platform; do **not** commit them):

```bash
supabase secrets set SUPABASE_URL=https://<project-ref>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically for
deployed functions, so you only need to set extra custom values (none for this
function). **Never** expose the service-role key to the frontend.

## Security properties

- The raw device token is **never** stored or logged — only its SHA-256 hex
  digest is compared against `devices.webhook_token_hash`.
- Raw SMS contents are **never** logged.
- OTP / security codes are classified and stored but never parsed as
  transactions.
- Service-role client is created server-side only and every query is scoped
  explicitly (by token hash / device id).

## Deploy

```bash
# Link once (if not already linked)
supabase link --project-ref <project-ref>

# Deploy this function (JWT verification disabled per supabase/config.toml)
supabase functions deploy sms-webhook
```

## Test

Local:

```bash
supabase functions serve sms-webhook --no-verify-jwt
curl -i --request POST 'http://localhost:54321/functions/v1/sms-webhook' \
  --header 'x-device-token: <raw-device-token>' \
  --header 'Content-Type: application/json' \
  --data '{"message":"Rs.45.00 debited from A/C XX1234","sender":"VK-HDFCBK"}'
```

Remote:

```bash
curl -i --request POST 'https://<project-ref>.supabase.co/functions/v1/sms-webhook' \
  --header 'x-device-token: <raw-device-token>' \
  --header 'Content-Type: application/json' \
  --data '{"message":"Rs.45.00 debited from A/C XX1234","sender":"VK-HDFCBK"}'
```

## Assumed schema (PROVISIONAL — reconcile with the real DB)

- `devices(id, user_id, webhook_token_hash, is_active, last_seen_at)`
- `sms_events(id, user_id, device_id, sender, body, received_at, processed_at)`

These were taken from the product brief. If the real columns differ, update
`supabase/functions/_shared/types.ts` and the `.insert(...)` call in `index.ts`.

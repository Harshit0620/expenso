// Device-token hashing utilities.
//
// The raw device token is NEVER stored or logged. Only its SHA-256 hex digest
// is compared against `devices.webhook_token_hash`.

/**
 * Computes a lowercase SHA-256 hex digest of the given token.
 * Uses the Web Crypto API available in the Deno edge runtime.
 */
export async function hashDeviceToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token.trim())
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Constant-time-ish comparison of two hex hashes. */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

// SMS classification — decides whether an incoming SMS is a transaction-like
// message before any parsing happens.
//
// This is intentionally a lightweight, dependency-free classifier. The full
// transaction parser will be added later (Phase 10) and will build on top of
// this. Nothing here creates transactions or fake data.

export type SmsKind = 'transaction' | 'otp' | 'unsupported' | 'malformed'

export interface Classification {
  kind: SmsKind
  /** Short, non-sensitive reason tag for observability (no SMS content). */
  reason: string
}

// OTP / security / non-transaction markers. Checked FIRST so we never treat
// security messages as transactions.
const OTP_PATTERNS: RegExp[] = [
  /\botp\b/i,
  /\bo\.t\.p\b/i,
  /\bone[\s-]?time[\s-]?(password|code|pin)\b/i,
  /\bverification\s+code\b/i,
  /\bdo not share\b/i,
  /\bnever share\b/i,
  /\bsecure\s+code\b/i,
  /\blogin\s+code\b/i,
  /\bauth(entication)?\s+code\b/i,
  /\b\d{4,8}\s+is\s+your\s+(otp|code|pin)\b/i,
]

// Amount markers typical of bank/payment transaction SMS.
const AMOUNT_PATTERNS: RegExp[] = [
  /(?:₹|rs\.?|inr)\s*[\d,]+(?:\.\d{1,2})?/i,
  /\b(?:debited|credited|debit|credit|spent|paid|withdrawn|received|deposited)\b/i,
]

// Debit/credit action words used to positively identify transaction SMS.
const TXN_ACTION_PATTERN =
  /\b(debited|credited|debit|credited|spent|paid|payment|withdrawn|sent|received|deposited|added|transferred)\b/i

/** Classifies a raw SMS body into a coarse kind for safe downstream handling. */
export function classifySms(body: string): Classification {
  const text = (body ?? '').trim()

  if (text.length === 0) {
    return { kind: 'malformed', reason: 'empty_body' }
  }

  if (OTP_PATTERNS.some((re) => re.test(text))) {
    return { kind: 'otp', reason: 'otp_marker' }
  }

  const hasAmount = AMOUNT_PATTERNS[0].test(text) || AMOUNT_PATTERNS[1].test(text)
  const hasAction = TXN_ACTION_PATTERN.test(text)

  if (hasAmount && hasAction) {
    return { kind: 'transaction', reason: 'amount_and_action' }
  }

  // Ambiguous financial-looking message without both signals.
  if (hasAmount || hasAction) {
    return { kind: 'unsupported', reason: 'partial_financial_signal' }
  }

  return { kind: 'unsupported', reason: 'no_financial_signal' }
}

/** True when the SMS is safe and worth parsing later. */
export function isParseable(classification: Classification): boolean {
  return classification.kind === 'transaction'
}

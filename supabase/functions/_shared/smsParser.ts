// Expenso — SMS transaction parser.
//
// Extracts structured fields from common Indian bank / UPI / payment SMS.
// Pure, dependency-free. It NEVER creates transactions by itself; the webhook
// decides what to persist. Nothing here fabricates data.

export type ParsedTransactionType = 'debit' | 'credit'
// VERIFIED against the remote DB enum `payment_method`.
export type ParsedPaymentMethod =
  | 'upi'
  | 'card'
  | 'atm'
  | 'neft'
  | 'imps'
  | 'bank_transfer'
  | 'other'
  | 'unknown'

export interface ParsedTransaction {
  amount: number
  transactionType: ParsedTransactionType
  paymentMethod: ParsedPaymentMethod
  merchantName: string | null
  merchantRaw: string | null
  bankName: string | null
  accountLast4: string | null
  transactionReference: string | null
  transactionAt: string | null
  /** 0–1 heuristic confidence in the extraction. */
  confidence: number
}

const CREDIT_WORDS = /\b(credited|credit|received|deposited|refund|cashback|reversed|added)\b/i
const DEBIT_WORDS = /\b(debited|debit|spent|paid|payment|withdrawn|sent|transferred|purchase)\b/i

const AMOUNT_PREFIXED = /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i
const AMOUNT_TRAILING = /\b([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹)/i

const BANK_HINTS: ReadonlyArray<[RegExp, string]> = [
  [/\b(hdfc)\b/i, 'HDFC Bank'],
  [/\b(icici)\b/i, 'ICICI Bank'],
  [/\b(sbi|state bank)\b/i, 'State Bank of India'],
  [/\b(axis)\b/i, 'Axis Bank'],
  [/\b(kotak)\b/i, 'Kotak Mahindra Bank'],
  [/\b(pnb|punjab national)\b/i, 'Punjab National Bank'],
  [/\b(bob|bank of baroda)\b/i, 'Bank of Baroda'],
  [/\b(yes\s?bank)\b/i, 'Yes Bank'],
  [/\b(idfc)\b/i, 'IDFC First Bank'],
  [/\b(indus)\b/i, 'IndusInd Bank'],
]

const UPI_HINT = /\b(upi|vpa|@ok|@ybl|@paytm|@upi|gpay|googlepay|phonepe|paytm|bhim)\b/i
const CARD_HINT = /\b(card|credit card|debit card|xx\d{4})\b/i
const ATM_HINT = /\b(atm|cash withdrawal|withdrawn at)\b/i
const NEFT_HINT = /\b(neft)\b/i
const IMPS_HINT = /\b(imps)\b/i
const BANK_TRANSFER_HINT = /\b(bank transfer|transfer(?:red)? to (?:a\/c|account)|to (?:a\/c|account)|rtgs)\b/i

const ACCOUNT_LAST4 = /\b(?:a\/c|ac|account|card)\s*(?:no\.?\s*)?[x*]*(\d{4})\b/i
const REFERENCE =
  /\b(?:ref(?:erence)?\.?\s*(?:no\.?)?|utr|txn\s*id|txn\s*no\.?|rrn)\s*[:#]?\s*([A-Za-z0-9]{6,})\b/i

function parseAmount(text: string): number | null {
  const match = AMOUNT_PREFIXED.exec(text) ?? AMOUNT_TRAILING.exec(text)
  if (!match) return null
  const value = Number.parseFloat(match[1].replace(/,/g, ''))
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

function detectBank(text: string, sender: string | null): string | null {
  const haystack = `${sender ?? ''} ${text}`
  for (const [re, name] of BANK_HINTS) {
    if (re.test(haystack)) return name
  }
  return null
}

function detectPaymentMethod(text: string): ParsedPaymentMethod {
  if (UPI_HINT.test(text)) return 'upi'
  if (ATM_HINT.test(text)) return 'atm'
  if (NEFT_HINT.test(text)) return 'neft'
  if (IMPS_HINT.test(text)) return 'imps'
  if (BANK_TRANSFER_HINT.test(text)) return 'bank_transfer'
  if (CARD_HINT.test(text)) return 'card'
  // Cannot determine → verified enum member `unknown`.
  return 'unknown'
}

function detectType(text: string): ParsedTransactionType | null {
  const isCredit = CREDIT_WORDS.test(text)
  const isDebit = DEBIT_WORDS.test(text)
  if (isCredit && !isDebit) return 'credit'
  if (isDebit) return 'debit'
  return null
}

function extractMerchant(text: string): { name: string | null; raw: string | null } {
  const patterns: RegExp[] = [
    /\b(?:to|at|towards|info)\s+([A-Za-z0-9@._\- ]{3,40}?)(?:\s+(?:on|via|ref|using|from|upi|for)\b|[.,]|$)/i,
    /\bfrom\s+([A-Za-z0-9@._\- ]{3,40}?)(?:\s+(?:on|via|ref|using|to)\b|[.,]|$)/i,
  ]
  for (const re of patterns) {
    const m = re.exec(text)
    if (m) {
      const raw = m[1].trim()
      if (raw.length >= 3) {
        const name = raw.replace(/\s+/g, ' ').replace(/[.,;:]+$/, '').trim()
        return { name, raw }
      }
    }
  }
  return { name: null, raw: null }
}

function detectAccountLast4(text: string): string | null {
  const m = ACCOUNT_LAST4.exec(text)
  return m ? m[1] : null
}

function detectReference(text: string): string | null {
  const m = REFERENCE.exec(text)
  return m ? m[1] : null
}

function detectTimestamp(text: string, fallbackIso: string): string | null {
  // Only explicit ISO timestamps are trusted; bank dd-mm-yy formats are NOT
  // guessed, to avoid writing wrong data.
  const iso = /\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)\b/.exec(text)
  if (iso) {
    const t = Date.parse(iso[1])
    if (!Number.isNaN(t)) return new Date(t).toISOString()
  }
  return fallbackIso
}

/**
 * Parses an SMS body into a transaction. Returns `null` when the message is
 * not a confidently-parseable financial transaction (e.g. no amount / no
 * debit-or-credit signal).
 */
export function parseTransactionSms(
  body: string,
  sender: string | null = null,
  receivedAtIso: string = new Date().toISOString(),
): ParsedTransaction | null {
  const text = (body ?? '').trim()
  if (text.length === 0) return null

  const amount = parseAmount(text)
  if (amount === null) return null

  const transactionType = detectType(text)
  if (transactionType === null) return null

  const { name, raw } = extractMerchant(text)
  const bankName = detectBank(text, sender)
  const accountLast4 = detectAccountLast4(text)
  const reference = detectReference(text)
  const transactionAt = detectTimestamp(text, receivedAtIso)
  const paymentMethod = detectPaymentMethod(text)

  // Heuristic confidence: amount + type required; other signals raise it.
  let confidence = 0.5
  if (bankName) confidence += 0.15
  if (name) confidence += 0.15
  if (reference) confidence += 0.1
  if (accountLast4) confidence += 0.05
  confidence = Math.min(1, Number(confidence.toFixed(2)))

  return {
    amount,
    transactionType,
    paymentMethod,
    merchantName: name,
    merchantRaw: raw,
    bankName,
    accountLast4,
    transactionReference: reference,
    transactionAt,
    confidence,
  }
}


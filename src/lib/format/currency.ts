import { CURRENCY } from '../config/smallSpend'

/** Formats a number as Indian currency, e.g. 49 -> "₹49.00". */
export function formatCurrency(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: CURRENCY,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(safe)
  } catch {
    return `₹${safe.toFixed(2)}`
  }
}

/** Formats an ISO timestamp as a short, locale-friendly date+time. */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(parsed))
}

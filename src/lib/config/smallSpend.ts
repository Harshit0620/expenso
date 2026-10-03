/**
 * Small-spend configuration — the single source of truth for the core concept.
 *
 * A "small spend" is any transaction below {@link SMALL_SPEND_THRESHOLD}.
 * Do NOT hardcode this threshold anywhere else (UI, analytics, parser).
 * Change it here once and the whole app follows.
 */

/** Currency used across the app. */
export const CURRENCY = 'INR'

/** Amount (in {@link CURRENCY}) below which a transaction counts as "small". */
export const SMALL_SPEND_THRESHOLD = 100

/**
 * Returns true when an amount should be treated as a small spend.
 *
 * @param amount Transaction amount (positive number).
 * @param threshold Optional override; defaults to {@link SMALL_SPEND_THRESHOLD}.
 */
export function isSmallSpend(
  amount: number,
  threshold: number = SMALL_SPEND_THRESHOLD,
): boolean {
  return Number.isFinite(amount) && amount > 0 && amount < threshold
}

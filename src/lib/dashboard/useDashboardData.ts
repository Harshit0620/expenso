import { useEffect, useState } from 'react'
import { getSupabaseClient, isSupabaseConfigured } from '../supabase/client'
import type { Transaction } from '../../types'
import type { PostgrestError } from '@supabase/supabase-js'

export interface DashboardData {
  transactions: Transaction[]
  totalSpend: number
  transactionCount: number
  smallSpendCount: number
  smallSpendTotal: number
  smallSpendShare: number
  topMerchants: MerchantSpend[]
  dailySpend: DailySpend[]
  categoryBreakdown: CategorySpend[]
}

export interface CategorySpend {
  categoryId: string | null
  total: number
  count: number
}

export interface MerchantSpend {
  merchant: string
  total: number
  count: number
  smallSpendCount: number
}

export interface DailySpend {
  /** ISO date (YYYY-MM-DD). */
  date: string
  total: number
  smallTotal: number
}

export interface UseTransactionsResult {
  data: DashboardData | null
  loading: boolean
  error: string | null
}

/** Columns fetched from `transactions`. Mirrors the real schema. */
const TRANSACTION_COLUMNS =
  'id, user_id, device_id, sms_event_id, amount, transaction_type, payment_method, ' +
  'merchant_name, merchant_raw, category_id, bank_name, account_last4, ' +
  'transaction_reference, transaction_at, confidence, status, notes, created_at, updated_at'

/**
 * Loads the current user's transactions from Supabase and derives the
 * dashboard aggregates in application logic. No mock/demo data is ever used.
 */
export function useDashboardData(smallSpendThreshold: number): UseTransactionsResult {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!isSupabaseConfigured) {
        if (!cancelled) {
          setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
          setLoading(false)
        }
        return
      }

      try {
        const supabase = getSupabaseClient()
        const { data: rows, error: queryError } = await supabase
          .from('transactions')
          .select(TRANSACTION_COLUMNS)
          .order('transaction_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })

        if (cancelled) return

        if (queryError) {
          setError(toFriendlyError(queryError))
          setLoading(false)
          return
        }

        const transactions = (rows ?? []) as unknown as Transaction[]
        setData(aggregate(transactions, smallSpendThreshold))
        setError(null)
        setLoading(false)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load transactions.')
        setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [smallSpendThreshold])

  return { data, loading, error }
}

/** Derives totals + category/merchant/daily breakdowns from raw transactions (pure). */
function aggregate(transactions: Transaction[], smallSpendThreshold: number): DashboardData {
  let totalSpend = 0
  let smallSpendCount = 0
  let smallSpendTotal = 0
  const byCategory = new Map<string | null, CategorySpend>()
  const byMerchant = new Map<string, MerchantSpend>()
  const byDay = new Map<string, DailySpend>()

  for (const txn of transactions) {
    const amount = Number(txn.amount)
    if (!Number.isFinite(amount)) continue

    totalSpend += amount

    const isSmall = amount > 0 && amount < smallSpendThreshold
    if (isSmall) {
      smallSpendCount += 1
      smallSpendTotal += amount
    }

    const categoryKey = txn.category_id ?? null
    const category = byCategory.get(categoryKey)
    if (category) {
      category.total += amount
      category.count += 1
    } else {
      byCategory.set(categoryKey, { categoryId: categoryKey, total: amount, count: 1 })
    }

    const merchant = (txn.merchant_name || txn.merchant_raw || 'Unknown').trim()
    const merchantEntry = byMerchant.get(merchant)
    if (merchantEntry) {
      merchantEntry.total += amount
      merchantEntry.count += 1
      if (isSmall) merchantEntry.smallSpendCount += 1
    } else {
      byMerchant.set(merchant, {
        merchant,
        total: amount,
        count: 1,
        smallSpendCount: isSmall ? 1 : 0,
      })
    }

    const when = txn.transaction_at ?? txn.created_at
    const date = when ? when.slice(0, 10) : null
    if (date) {
      const day = byDay.get(date)
      if (day) {
        day.total += amount
        if (isSmall) day.smallTotal += amount
      } else {
        byDay.set(date, { date, total: amount, smallTotal: isSmall ? amount : 0 })
      }
    }
  }

  const categoryBreakdown = [...byCategory.values()].sort((a, b) => b.total - a.total)
  const topMerchants = [...byMerchant.values()].sort((a, b) => b.total - a.total)
  const dailySpend = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date))
  const smallSpendShare = totalSpend > 0 ? smallSpendTotal / totalSpend : 0

  return {
    transactions,
    totalSpend,
    transactionCount: transactions.length,
    smallSpendCount,
    smallSpendTotal,
    smallSpendShare,
    topMerchants,
    dailySpend,
    categoryBreakdown,
  }
}

/** Maps a Postgrest error to a non-technical message. */
function toFriendlyError(error: PostgrestError): string {
  if (error.code === 'PGRST301' || error.code === '401') {
    return 'Your session has expired. Please sign in again.'
  }
  return error.message || 'Failed to load transactions.'
}

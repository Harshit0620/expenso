import { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { Badge, Card, SectionHeader, Skeleton } from '../components/ui/primitives'
import { SMALL_SPEND_THRESHOLD, isSmallSpend } from '../lib/config/smallSpend'
import { useDashboardData } from '../lib/dashboard/useDashboardData'
import { formatCurrency, formatDateTime } from '../lib/format/currency'
import { categoryIconElement, categoryLabel } from '../lib/format/display'
import type { Transaction } from '../types'

type DirectionFilter = 'all' | 'debit' | 'credit'
type SpendFilter = 'all' | 'small' | 'large'

function merchantOf(txn: Transaction): string {
  return txn.merchant_name || txn.merchant_raw || 'Unknown merchant'
}

function TransactionTableRow({ txn }: { txn: Transaction }) {
  const small = isSmallSpend(Number(txn.amount))
  const isDebit = txn.transaction_type === 'debit'
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            {categoryIconElement(txn.category_id, 'h-4 w-4')}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-slate-900">{merchantOf(txn)}</span>
              {small ? <Badge tone="amber">Small</Badge> : null}
            </div>
            <span className="text-xs text-slate-400">{categoryLabel(txn.category_id)}</span>
          </div>
        </div>
      </td>
      <td className="hidden px-5 py-3 text-sm text-slate-500 sm:table-cell">
        {formatDateTime(txn.transaction_at ?? txn.created_at)}
      </td>
      <td className="hidden px-5 py-3 md:table-cell">
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <CreditCard className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          {txn.payment_method ? txn.payment_method.toUpperCase() : '—'}
        </span>
      </td>
      <td className="px-5 py-3">
        <Badge tone={isDebit ? 'rose' : 'emerald'}>{isDebit ? 'Debit' : 'Credit'}</Badge>
      </td>
      <td className="px-5 py-3 text-right">
        <span
          className={`inline-flex items-center gap-1 text-sm font-semibold ${
            isDebit ? 'text-slate-900' : 'text-emerald-600'
          }`}
        >
          {isDebit ? (
            <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {formatCurrency(Number(txn.amount))}
        </span>
      </td>
    </tr>
  )
}

function MobileTransactionCard({ txn }: { txn: Transaction }) {
  const small = isSmallSpend(Number(txn.amount))
  const isDebit = txn.transaction_type === 'debit'
  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        {categoryIconElement(txn.category_id, 'h-4.5 w-4.5')}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-900">{merchantOf(txn)}</p>
          {small ? <Badge tone="amber">Small</Badge> : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-400">
          {categoryLabel(txn.category_id)} · {formatDateTime(txn.transaction_at ?? txn.created_at)}
        </p>
      </div>
      <span
        className={`shrink-0 text-sm font-semibold ${
          isDebit ? 'text-slate-900' : 'text-emerald-600'
        }`}
      >
        {formatCurrency(Number(txn.amount))}
      </span>
    </li>
  )
}
export function TransactionsPage() {
  const { data, loading, error } = useDashboardData(SMALL_SPEND_THRESHOLD)
  const [query, setQuery] = useState('')
  const [direction, setDirection] = useState<DirectionFilter>('all')
  const [spend, setSpend] = useState<SpendFilter>('all')

  const filtered = useMemo(() => {
    const all = data?.transactions ?? []
    const q = query.trim().toLowerCase()
    return all.filter((txn) => {
      if (direction !== 'all' && txn.transaction_type !== direction) return false
      const small = isSmallSpend(Number(txn.amount))
      if (spend === 'small' && !small) return false
      if (spend === 'large' && small) return false
      if (!q) return true
      const haystack = [merchantOf(txn), txn.category_id, txn.payment_method, txn.bank_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [data, query, direction, spend])

  const total = filtered.reduce((sum, txn) => sum + Number(txn.amount), 0)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Transactions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every parsed SMS transaction, searchable and filterable.
        </p>
      </header>

      <Card className="mb-6 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search merchant, category or method"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              Filters
            </span>
            <SegmentedControl
              value={direction}
              onChange={setDirection}
              options={[
                { value: 'all', label: 'All' },
                { value: 'debit', label: 'Debit' },
                { value: 'credit', label: 'Credit' },
              ]}
            />
            <SegmentedControl
              value={spend}
              onChange={setSpend}
              options={[
                { value: 'all', label: 'Any' },
                { value: 'small', label: 'Small' },
                { value: 'large', label: 'Large' },
              ]}
            />
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <Card className="border-rose-200 bg-rose-50/60 p-6">
          <p className="text-sm font-semibold text-rose-700">Could not load transactions</p>
          <p className="mt-1 text-sm text-rose-600">{error}</p>
        </Card>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <Card className="border-dashed border-slate-300 p-10 text-center">
          <p className="text-sm font-semibold text-slate-900">No matching transactions</p>
          <p className="mt-1 text-sm text-slate-500">
            Try clearing the search box or switching filters.
          </p>
        </Card>
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <Card>
          <SectionHeader
            title="All transactions"
            subtitle={`${filtered.length} shown · ${formatCurrency(total)} total`}
          />
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Merchant</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">Date</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Method</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((txn) => (
                  <TransactionTableRow key={txn.id} txn={txn} />
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-slate-100 sm:hidden">
            {filtered.map((txn) => (
              <MobileTransactionCard key={txn.id} txn={txn} />
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  )
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: readonly { value: T; label: string }[]
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === option.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}



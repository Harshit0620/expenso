import { useMemo } from 'react'
import { Coffee, PiggyBank, Sparkles, TrendingDown } from 'lucide-react'
import { Badge, Card, ProgressRing, SectionHeader, Skeleton, StatCard } from '../components/ui/primitives'
import { SMALL_SPEND_THRESHOLD, isSmallSpend } from '../lib/config/smallSpend'
import { useDashboardData } from '../lib/dashboard/useDashboardData'
import { formatCurrency, formatDateTime } from '../lib/format/currency'
import { categoryIconElement, categoryLabel } from '../lib/format/display'
import type { Transaction } from '../types'

function SmallSpendRow({ txn }: { txn: Transaction }) {
  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
        {categoryIconElement(txn.category_id, 'h-4.5 w-4.5')}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-900">
            {txn.merchant_name || txn.merchant_raw || 'Unknown merchant'}
          </p>
          <Badge tone="amber">Small</Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-400">
          {categoryLabel(txn.category_id)} · {formatDateTime(txn.transaction_at ?? txn.created_at)}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold text-slate-900">
        {formatCurrency(Number(txn.amount))}
      </span>
    </li>
  )
}

export function SmallSpendsPage() {
  const { data, loading, error } = useDashboardData(SMALL_SPEND_THRESHOLD)

  const smallTransactions = useMemo(
    () =>
      (data?.transactions ?? [])
        .filter((txn) => isSmallSpend(Number(txn.amount)))
        .sort((a, b) => Number(b.amount) - Number(a.amount)),
    [data],
  )

  const topCategories = useMemo(() => {
    const map = new Map<string | null, number>()
    for (const txn of smallTransactions) {
      const key = txn.category_id ?? null
      map.set(key, (map.get(key) ?? 0) + Number(txn.amount))
    }
    return [...map.entries()]
      .map(([categoryId, total]) => ({ categoryId, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [smallTransactions])

  const smallSharePct = data ? Math.round(data.smallSpendShare * 100) : 0
  const avgSmall = smallTransactions.length
    ? (data?.smallSpendTotal ?? 0) / smallTransactions.length
    : 0



  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Small Spends</h1>
          <Badge tone="amber">Under {formatCurrency(SMALL_SPEND_THRESHOLD)}</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          The little purchases that quietly add up — tracked automatically.
        </p>
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <Card className="border-rose-200 bg-rose-50/60 p-6">
          <p className="text-sm font-semibold text-rose-700">Could not load small spends</p>
          <p className="mt-1 text-sm text-rose-600">{error}</p>
        </Card>
      ) : null}

      {!loading && !error && data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Small-spend total"
              value={formatCurrency(data.smallSpendTotal)}
              hint={`${data.smallSpendCount} transactions`}
              icon={PiggyBank}
              tone="amber"
            />
            <StatCard
              label="Share of spending"
              value={`${smallSharePct}%`}
              hint="Of every rupee spent"
              icon={TrendingDown}
              tone="brand"
            />
            <StatCard
              label="Average small spend"
              value={formatCurrency(avgSmall)}
              hint="Per small transaction"
              icon={Coffee}
              tone="emerald"
            />
            <StatCard
              label="Threshold"
              value={formatCurrency(SMALL_SPEND_THRESHOLD)}
              hint="Configured cutoff"
              icon={Sparkles}
              tone="slate"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="flex flex-col items-center justify-center p-6 text-center">
              <ProgressRing
                value={smallSharePct}
                size={132}
                stroke={12}
                label={`${smallSharePct}%`}
                sublabel="of spending"
              />
              <p className="mt-4 max-w-xs text-sm text-slate-500">
                {data.smallSpendCount} small purchases made up{' '}
                <span className="font-semibold text-slate-900">
                  {formatCurrency(data.smallSpendTotal)}
                </span>{' '}
                of your total spend.
              </p>
            </Card>

            <Card className="lg:col-span-2">
              <SectionHeader title="Biggest small spends" subtitle="Largest first, still under the cutoff" />
              {smallTransactions.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {smallTransactions.slice(0, 8).map((txn) => (
                    <SmallSpendRow key={txn.id} txn={txn} />
                  ))}
                </ul>
              ) : (
                <div className="p-10 text-center text-sm text-slate-500">
                  No small spends yet. Once transactions under{' '}
                  {formatCurrency(SMALL_SPEND_THRESHOLD)} arrive, they will appear here.
                </div>
              )}
            </Card>
          </div>

          {topCategories.length > 0 ? (
            <Card>
              <SectionHeader title="Small spends by category" subtitle="Where the small money goes" />
              <ul className="divide-y divide-slate-100">
                {topCategories.map((c) => {
                  const share =
                    data.smallSpendTotal > 0 ? (c.total / data.smallSpendTotal) * 100 : 0
                  return (
                    <li key={c.categoryId ?? 'uncategorized'} className="px-5 py-3.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">
                          {categoryLabel(c.categoryId)}
                        </span>
                        <span className="text-slate-500">{formatCurrency(c.total)}</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${Math.round(share)}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}


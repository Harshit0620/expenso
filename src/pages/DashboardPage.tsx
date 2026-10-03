import { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  PiggyBank,
  Receipt,
  Sparkles,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Badge,
  Card,
  ProgressRing,
  SectionHeader,
  Skeleton,
  StatCard,
} from '../components/ui/primitives'
import { SMALL_SPEND_THRESHOLD, isSmallSpend } from '../lib/config/smallSpend'
import { useDashboardData } from '../lib/dashboard/useDashboardData'
import { formatCurrency, formatDateTime } from '../lib/format/currency'
import { categoryLabel } from '../lib/format/display'
import type { Transaction } from '../types'

const PIE_COLORS = ['#4f46e5', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#10b981', '#64748b']

/** Compact axis tick — ₹1.2k style. */
function shortCurrency(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`
  return `₹${Math.round(value)}`
}

function dayLabel(iso: string): string {
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return iso
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(
    new Date(parsed),
  )
}

function merchantInitials(name: string): string {
  const clean = name.trim()
  if (!clean) return '?'
  const parts = clean.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || clean[0].toUpperCase()
}


function TransactionRow({ txn }: { txn: Transaction }) {
  const small = isSmallSpend(Number(txn.amount))
  const title = txn.merchant_name || txn.merchant_raw || 'Unknown merchant'
  const isDebit = txn.transaction_type === 'debit'
  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          isDebit ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
        }`}
      >
        {isDebit ? (
          <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-900">{title}</p>
          {small ? <Badge tone="amber">Small</Badge> : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-400">
          {formatDateTime(txn.transaction_at ?? txn.created_at)}
          {txn.payment_method ? ` · ${txn.payment_method.toUpperCase()}` : ''}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold text-slate-900">
        {formatCurrency(Number(txn.amount))}
      </span>
    </li>
  )
}

function EmptyState() {
  return (
    <Card className="flex flex-col items-center justify-center gap-2 border-dashed border-slate-300 p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
        <Receipt className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-slate-900">No transactions yet</p>
      <p className="max-w-sm text-sm text-slate-500">
        Once your device forwards a bank SMS, it will appear here automatically.
      </p>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { data, loading, error } = useDashboardData(SMALL_SPEND_THRESHOLD)
  const [showAll, setShowAll] = useState(false)

  const chartData = useMemo(
    () =>
      (data?.dailySpend ?? []).map((d) => ({
        label: dayLabel(d.date),
        total: Number(d.total.toFixed(2)),
        small: Number(d.smallTotal.toFixed(2)),
      })),
    [data],
  )

  const pieData = useMemo(
    () =>
      (data?.categoryBreakdown ?? []).slice(0, 6).map((c) => ({
        name: categoryLabel(c.categoryId),
        value: Number(c.total.toFixed(2)),
      })),
    [data],
  )

  const visibleTransactions = useMemo(() => {
    const all = data?.transactions ?? []
    return showAll ? all.slice(0, 12) : all.slice(0, 6)
  }, [data, showAll])

  const smallSharePct = data ? Math.round(data.smallSpendShare * 100) : 0

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
            <Badge tone="brand">Live</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Your spending overview, derived from your linked SMS transactions.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
          <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span>All-time</span>
        </div>
      </header>

      {loading ? <DashboardSkeleton /> : null}

      {!loading && error ? (
        <Card className="border-rose-200 bg-rose-50/60 p-6">
          <p className="text-sm font-semibold text-rose-700">Could not load your data</p>
          <p className="mt-1 text-sm text-rose-600">{error}</p>
        </Card>
      ) : null}

      {!loading && !error && data && data.transactionCount === 0 ? <EmptyState /> : null}

      {!loading && !error && data && data.transactionCount > 0 ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total spending"
              value={formatCurrency(data.totalSpend)}
              hint={`Across ${data.transactionCount} transactions`}
              icon={TrendingDown}
              tone="rose"
            />
            <StatCard
              label="Small spends"
              value={String(data.smallSpendCount)}
              hint={`${formatCurrency(data.smallSpendTotal)} under ${formatCurrency(SMALL_SPEND_THRESHOLD)}`}
              icon={PiggyBank}
              tone="amber"
            />
            <StatCard
              label="Average / txn"
              value={formatCurrency(data.totalSpend / data.transactionCount)}
              hint="Mean transaction value"
              icon={Wallet}
              tone="brand"
            />
            <StatCard
              label="Merchants"
              value={String(data.topMerchants.length)}
              hint={data.topMerchants[0] ? `Top: ${data.topMerchants[0].merchant}` : '—'}
              icon={Banknote}
              tone="emerald"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <SectionHeader
                title="Spending trend"
                subtitle="Daily totals from your transactions"
                action={<Badge tone="brand">INR</Badge>}
              />
              <div className="h-64 px-2 py-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={52}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      tickFormatter={(v: number) => shortCurrency(v)}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        fontSize: 12,
                        boxShadow: '0 10px 30px -12px rgba(15,23,42,0.25)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      fill="url(#spendFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="flex flex-col">
              <SectionHeader title="Small-spend share" subtitle="Portion of total spend" />
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
                <ProgressRing value={smallSharePct} label={`${smallSharePct}%`} sublabel="of spend" />
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700">
                    {formatCurrency(data.smallSpendTotal)}
                  </p>
                  <p className="text-xs text-slate-400">
                    across {data.smallSpendCount} small purchases
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Small spends quietly add up</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <SectionHeader title="By category" subtitle="Where money goes" />
              <div className="p-4">
                {pieData.length > 0 ? (
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={45}
                          outerRadius={72}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value))}
                          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}
                <ul className="mt-2 space-y-2">
                  {data.categoryBreakdown.slice(0, 5).map((c, index) => (
                    <li key={c.categoryId ?? 'uncategorized'} className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
                        {categoryLabel(c.categoryId)}
                      </span>
                      <span className="text-sm font-medium text-slate-900">
                        {formatCurrency(c.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <SectionHeader
                title="Recent transactions"
                subtitle="Latest parsed SMS activity"
                action={
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    {showAll ? 'Show less' : 'View all'}
                  </button>
                }
              />
              <ul className="divide-y divide-slate-100">
                {visibleTransactions.map((txn) => (
                  <TransactionRow key={txn.id} txn={txn} />
                ))}
              </ul>
            </Card>
          </div>

          <Card>
            <SectionHeader title="Top merchants" subtitle="Highest spend by merchant" />
            <ul className="divide-y divide-slate-100">
              {data.topMerchants.slice(0, 5).map((m) => (
                <li key={m.merchant} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                    {merchantInitials(m.merchant)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{m.merchant}</p>
                    <p className="text-xs text-slate-400">
                      {m.count} txn{m.count === 1 ? '' : 's'}
                      {m.smallSpendCount > 0 ? ` · ${m.smallSpendCount} small` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatCurrency(m.total)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}
    </div>
  )
}



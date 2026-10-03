import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, CreditCard, PieChart as PieIcon, TrendingUp } from 'lucide-react'
import { Badge, Card, SectionHeader, Skeleton, StatCard } from '../components/ui/primitives'
import { SMALL_SPEND_THRESHOLD } from '../lib/config/smallSpend'
import { useDashboardData } from '../lib/dashboard/useDashboardData'
import { formatCurrency } from '../lib/format/currency'
import { categoryLabel } from '../lib/format/display'

const PIE_COLORS = ['#4f46e5', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#10b981', '#64748b']

function shortCurrency(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`
  return `₹${Math.round(value)}`
}

function monthLabel(iso: string): string {
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return iso
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' }).format(
    new Date(parsed),
  )
}
export function AnalyticsPage() {
  const { data, loading, error } = useDashboardData(SMALL_SPEND_THRESHOLD)

  const monthlyData = useMemo(() => {
    const map = new Map<string, { total: number; small: number }>()
    for (const txn of data?.transactions ?? []) {
      const when = txn.transaction_at ?? txn.created_at
      if (!when) continue
      const key = when.slice(0, 7)
      const entry = map.get(key) ?? { total: 0, small: 0 }
      const amount = Number(txn.amount)
      entry.total += amount
      if (amount > 0 && amount < SMALL_SPEND_THRESHOLD) entry.small += amount
      map.set(key, entry)
    }
    return [...map.entries()]
      .map(([month, v]) => ({
        month: monthLabel(`${month}-01`),
        total: Number(v.total.toFixed(2)),
        small: Number(v.small.toFixed(2)),
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }, [data])

  const categoryData = useMemo(
    () =>
      (data?.categoryBreakdown ?? []).slice(0, 7).map((c) => ({
        name: categoryLabel(c.categoryId),
        value: Number(c.total.toFixed(2)),
      })),
    [data],
  )

  const methodData = useMemo(() => {
    const map = new Map<string, number>()
    for (const txn of data?.transactions ?? []) {
      const key = (txn.payment_method || 'unknown').toUpperCase()
      map.set(key, (map.get(key) ?? 0) + Number(txn.amount))
    }
    return [...map.entries()]
      .map(([method, total]) => ({ method, total: Number(total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }, [data])

  const smallSharePct = data ? Math.round(data.smallSpendShare * 100) : 0
  const avgTxn =
    data && data.transactionCount > 0 ? data.totalSpend / data.transactionCount : 0
  const hasData = !!data && data.transactionCount > 0




  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Analytics</h1>
          <Badge tone="brand">Recharts</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          How, when and where your money moves — from real transaction data.
        </p>
      </header>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : null}

      {!loading && error ? (
        <Card className="border-rose-200 bg-rose-50/60 p-6">
          <p className="text-sm font-semibold text-rose-700">Could not load analytics</p>
          <p className="mt-1 text-sm text-rose-600">{error}</p>
        </Card>
      ) : null}

      {!loading && !error && !hasData ? (
        <Card className="border-dashed border-slate-300 p-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-900">Not enough data yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Analytics will populate automatically once your first transactions are parsed from SMS.
          </p>
        </Card>
      ) : null}

      {!loading && !error && hasData && data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total spending"
              value={formatCurrency(data.totalSpend)}
              hint={`${data.transactionCount} transactions`}
              icon={TrendingUp}
              tone="brand"
            />
            <StatCard
              label="Average / txn"
              value={formatCurrency(avgTxn)}
              hint="Mean spend per transaction"
              icon={Activity}
              tone="emerald"
            />
            <StatCard
              label="Small-spend share"
              value={`${smallSharePct}%`}
              hint={formatCurrency(data.smallSpendTotal)}
              icon={PieIcon}
              tone="amber"
            />
            <StatCard
              label="Payment methods"
              value={String(methodData.length)}
              hint={methodData[0] ? `Top: ${methodData[0].method}` : '—'}
              icon={CreditCard}
              tone="rose"
            />
          </div>

          <Card>
            <SectionHeader
              title="Spending over time"
              subtitle="Monthly totals with small-spend overlay"
              action={<Badge tone="brand">Monthly</Badge>}
            />
            <div className="h-72 px-2 py-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="aTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="aSmall" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={(v: number) => shortCurrency(v)}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Area type="monotone" name="Total" dataKey="total" stroke="#4f46e5" strokeWidth={2.5} fill="url(#aTotal)" />
                  <Area type="monotone" name="Small" dataKey="small" stroke="#f59e0b" strokeWidth={2.5} fill="url(#aSmall)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <SectionHeader title="Category breakdown" subtitle="Share of total spending" />
              <div className="h-72 p-4">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none">
                        {categoryData.map((entry, index) => (
                          <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    No category data yet.
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <SectionHeader title="By payment method" subtitle="Spend per method" />
              <div className="h-72 p-4">
                {methodData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={methodData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="method" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={52}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        tickFormatter={(v: number) => shortCurrency(v)}
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      />
                      <Bar dataKey="total" radius={[8, 8, 0, 0]} fill="#4f46e5" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    No payment method data yet.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}


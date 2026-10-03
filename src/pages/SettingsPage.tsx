import type { ReactNode } from 'react'
import { LogOut, Mail, Smartphone, Tag, User as UserIcon } from 'lucide-react'
import { Badge, Card, SectionHeader } from '../components/ui/primitives'
import { APP_NAME, APP_TAGLINE } from '../lib/config/app'
import { CURRENCY, SMALL_SPEND_THRESHOLD } from '../lib/config/smallSpend'
import { useAuth } from '../lib/auth/authContext'
import { formatCurrency } from '../lib/format/currency'

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="truncate text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  )
}

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const initial = (user?.email?.[0] ?? 'U').toUpperCase()
  const memberSince = user?.created_at
    ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(
        new Date(user.created_at),
      )
    : '—'

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your account, app preferences and session controls.
        </p>
      </header>

      <div className="space-y-6">
        <Card>
          <div className="flex items-center gap-4 p-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-semibold text-white">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-slate-900">
                {user?.email ?? 'Signed out'}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">Member since {memberSince}</p>
            </div>
            <Badge tone="emerald">Active</Badge>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Account" subtitle="Read-only details from your session" />
          <div className="divide-y divide-slate-100">
            <InfoRow
              icon={<Mail className="h-4 w-4" aria-hidden="true" />}
              label="Email"
              value={user?.email ?? '—'}
            />
            <InfoRow
              icon={<UserIcon className="h-4 w-4" aria-hidden="true" />}
              label="User ID"
              value={user?.id ?? '—'}
            />
          </div>
        </Card>

        <Card>
          <SectionHeader title="Preferences" subtitle="Fixed for this build" />
          <div className="divide-y divide-slate-100">
            <InfoRow
              icon={<Tag className="h-4 w-4" aria-hidden="true" />}
              label="Small-spend threshold"
              value={`${formatCurrency(SMALL_SPEND_THRESHOLD)} · transactions below this count as small`}
            />
            <InfoRow
              icon={<Tag className="h-4 w-4" aria-hidden="true" />}
              label="Currency"
              value={CURRENCY}
            />
            <InfoRow
              icon={<Smartphone className="h-4 w-4" aria-hidden="true" />}
              label="Data source"
              value="Bank SMS forwarded from your paired device"
            />
          </div>
        </Card>

        <Card>
          <SectionHeader title="About" subtitle={APP_TAGLINE} />
          <div className="divide-y divide-slate-100">
            <InfoRow
              icon={<Smartphone className="h-4 w-4" aria-hidden="true" />}
              label="Application"
              value={APP_NAME}
            />
            <InfoRow
              icon={<Smartphone className="h-4 w-4" aria-hidden="true" />}
              label="Version"
              value="1.0.0 · Hackathon build"
            />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Sign out</p>
              <p className="text-xs text-slate-400">End your session on this device.</p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-100"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Log out
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}

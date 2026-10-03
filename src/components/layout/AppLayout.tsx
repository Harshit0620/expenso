import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  PiggyBank,
  ReceiptText,
  Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { APP_NAME, APP_TAGLINE } from '../../lib/config/app'
import { useAuth } from '../../lib/auth/authContext'
import { ROUTES } from '../../routes/paths'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: ROUTES.dashboard, label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: ROUTES.transactions, label: 'Transactions', icon: ReceiptText },
  { to: ROUTES.smallSpends, label: 'Small Spends', icon: PiggyBank },
  { to: ROUTES.analytics, label: 'Analytics', icon: BarChart3 },
  { to: ROUTES.settings, label: 'Settings', icon: Settings },
]

function navLinkClass({ isActive }: { isActive: boolean }): string {
  const base =
    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors'
  return isActive
    ? `${base} bg-indigo-600 text-white shadow-sm shadow-indigo-600/20`
    : `${base} text-slate-600 hover:bg-slate-100 hover:text-slate-900`
}

/** Minimal responsive app shell: sidebar on desktop, top nav on mobile. */
export function AppLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex">
          <div className="mb-6 flex items-center gap-3 px-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
              E
            </span>
            <div>
              <p className="text-lg font-semibold leading-none tracking-tight">{APP_NAME}</p>
              <p className="mt-1 text-xs text-slate-400">{APP_TAGLINE}</p>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={navLinkClass}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>

          {user?.email ? (
            <div className="mt-auto border-t border-slate-100 pt-4">
              <p className="truncate px-2 text-xs text-slate-400" title={user.email}>
                {user.email}
              </p>
              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Log out
              </button>
            </div>
          ) : null}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="flex items-center gap-2 px-4 py-3">
              <p className="text-base font-semibold tracking-tight md:hidden">{APP_NAME}</p>
              <div className="ml-auto flex items-center gap-3">
                <span className="hidden max-w-[12rem] truncate text-xs text-slate-400 sm:inline" title={user?.email ?? ''}>
                  {user?.email ?? 'Signed out'}
                </span>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  Log out
                </button>
              </div>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:hidden">
              {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className={navLinkClass}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </header>

          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth/authContext'
import { ROUTES } from './paths'

/**
 * Guards the app shell. When there is no session, redirects to /login and
 * remembers where the user was headed so they can be returned after sign-in.
 */
export function ProtectedRoute() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />
  }

  return <Outlet />
}

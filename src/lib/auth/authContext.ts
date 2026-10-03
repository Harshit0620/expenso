import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export interface AuthContextValue {
  /** Current Supabase session (null when signed out). */
  session: Session | null
  /** Current user (null when signed out). */
  user: User | null
  /** True while the initial session is being restored. */
  loading: boolean
  /** Signs in with email + password. Throws on failure. */
  signIn: (email: string, password: string) => Promise<void>
  /** Signs the current user out. */
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

/** Access the auth context. Must be used within an AuthProvider. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

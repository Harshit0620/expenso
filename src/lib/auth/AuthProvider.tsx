import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabaseClient, isSupabaseConfigured } from '../supabase/client'
import { AuthContext } from './authContext'
import type { AuthContextValue } from './authContext'

/**
 * Provides Supabase auth state to the app.
 *
 * Restores the persisted session on mount and subscribes to auth changes.
 * The dashboard query is unchanged; this only gates access to protected routes.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  // When Supabase is not configured we can never resolve a session, so start
  // in the "resolved" state instead of hanging on "Loading…" forever.
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    const supabase = getSupabaseClient()
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session)
      })
      .catch(() => {
        setSession(null)
      })
      .finally(() => {
        setLoading(false)
      })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    return {
      session,
      user: (session?.user as User | undefined) ?? null,
      loading,
      signIn,
      signOut,
    }
  }, [session, loading, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}


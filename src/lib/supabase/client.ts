import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client for the Expenso / SmallSpend frontend.
 *
 * Security notes:
 * - Only the ANON (public) key is used here. The service-role key must never
 *   reach the browser and must never be referenced from frontend code.
 * - Credentials come from environment variables (see `.env.example`).
 *
 * The client is created lazily so the app can boot (and render onboarding /
 * empty states) even before real credentials are configured.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

/** True when both required Supabase env vars are present. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

let cachedClient: SupabaseClient | null = null

/**
 * Returns the shared Supabase client.
 *
 * @throws If the Supabase environment variables are not configured.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.',
    )
  }

  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  return cachedClient
}

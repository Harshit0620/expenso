// Server-only Supabase client for Edge Functions.
//
// Uses the SERVICE ROLE key, which is available ONLY as a Supabase secret and
// must NEVER be exposed to the frontend. This client bypasses RLS, so every
// query MUST be explicitly scoped (e.g. filter by user_id / device ownership).
//
// Deno runtime.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

/**
 * Creates a service-role Supabase client from function secrets.
 *
 * @param urlEnvName Env var holding the project URL (default SUPABASE_URL).
 * @param keyEnvName Env var holding the service role key.
 * @throws If either secret is missing.
 */
export function createServiceRoleClient(
  urlEnvName = 'SUPABASE_URL',
  keyEnvName = 'SUPABASE_SERVICE_ROLE_KEY',
): SupabaseClient {
  const url = Deno.env.get(urlEnvName)
  const serviceKey = Deno.env.get(keyEnvName)

  if (!url || !serviceKey) {
    throw new Error(`Missing required secrets: ${urlEnvName} and/or ${keyEnvName}`)
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

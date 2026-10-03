/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Supabase project. */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase anon/public key (safe for the browser, protected by RLS). */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

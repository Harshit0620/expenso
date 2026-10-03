// Shared HTTP helpers for Expenso Supabase Edge Functions.
// Deno runtime. Keep tiny and dependency-free.

/** Standard CORS headers for browser-invoked functions. */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-device-token, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** JSON response helper. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Error response helper. Never includes sensitive details. */
export function errorResponse(message: string, status: number, code?: string): Response {
  return json({ ok: false, error: message, ...(code ? { code } : {}) }, status)
}

/** Returns true when the request is a CORS preflight. */
export function isPreflight(req: Request): boolean {
  return req.method === 'OPTIONS'
}

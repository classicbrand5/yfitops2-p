// ─────────────────────────────────────────────────────────
// Supabase Client — YFitOps AI Agent
// Single instance, PKCE flow for OAuth, session persistence.
// ─────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;

// ─────────────────────────────────────────────────────────
// withAuthRefresh — auto-retry on 401 / JWT-expired errors
// Wraps any async fn, refreshes the session once, retries.
// ─────────────────────────────────────────────────────────
export async function withAuthRefresh<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e: unknown) {
    const err = e as { message?: string; status?: number; response?: { status?: number } };
    const msg = String(err?.message ?? e);
    const status = err?.status ?? err?.response?.status;

    const looksExpired =
      status === 401 ||
      msg.toLowerCase().includes('jwt') ||
      msg.toLowerCase().includes('expired') ||
      msg.toLowerCase().includes('unauthorized');

    if (!looksExpired) throw e;

    // Force session refresh
    const { data } = await supabase.auth.refreshSession();
    if (!data?.session) throw e; // give up if refresh fails

    // Retry once with fresh token
    return await fn();
  }
}

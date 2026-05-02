// ─────────────────────────────────────────────────────────
// GitHubCallback — Phase 9
//
// Handles the OAuth callback at /auth/github/callback.
// Exchanges the `code` query param for an access token
// via the `github-oauth-token` Supabase Edge Function,
// then stores the token in profiles.github_access_token.
// ─────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, withAuthRefresh } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { CheckCircle, AlertTriangle, Loader2, Github } from 'lucide-react';

type Phase = 'exchanging' | 'storing' | 'done' | 'error';

export default function GitHubCallback() {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [phase, setPhase] = useState<Phase>('exchanging');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code  = params.get('code');
    const state = params.get('state');

    // Validate state to prevent CSRF
    const savedState = sessionStorage.getItem('github_oauth_state');
    sessionStorage.removeItem('github_oauth_state');

    if (!code) {
      setError('No authorization code received from GitHub.');
      setPhase('error');
      return;
    }

    if (state && savedState && state !== savedState) {
      setError('State mismatch — possible CSRF attack. Please try again.');
      setPhase('error');
      return;
    }

    void (async () => {
      try {
        // ── Step 1: Exchange code for access token ──────
        setPhase('exchanging');

        const { data, error: fnErr } = await supabase.functions.invoke<{ access_token: string }>(
          'github-oauth-token',
          { body: { code } },
        );

        if (fnErr) {
          let msg = fnErr.message;
          if (fnErr instanceof FunctionsHttpError) {
            try {
              const text = await fnErr.context?.text();
              msg = `[${fnErr.context?.status ?? 500}] ${text || msg}`;
            } catch {}
          }
          throw new Error(msg);
        }

        const token = data?.access_token;
        if (!token) throw new Error('Edge function returned no access_token');

        // ── Step 2: Store token in profiles table ───────
        setPhase('storing');

        if (user) {
          const { error: upsertErr } = await withAuthRefresh(() =>
            supabase
              .from('profiles')
              .update({ github_access_token: token })
              .eq('id', user.id)
          );
          if (upsertErr) throw new Error(upsertErr.message);
        }

        // ── Step 3: Done ────────────────────────────────
        setPhase('done');
        setTimeout(() => navigate('/dashboard'), 1500);
      } catch (err: any) {
        console.error('[GitHubCallback] Error:', err);
        setError(err?.message ?? String(err));
        setPhase('error');
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#060609', fontFamily: 'var(--font-body)' }}
    >
      <div
        className="rounded-2xl p-8 max-w-sm w-full mx-4 text-center"
        style={{
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="mb-5">
          {phase === 'done' ? (
            <CheckCircle className="w-10 h-10 mx-auto" style={{ color: '#00F5A0' }} />
          ) : phase === 'error' ? (
            <AlertTriangle className="w-10 h-10 mx-auto" style={{ color: '#FF4D6D' }} />
          ) : (
            <Github className="w-10 h-10 mx-auto" style={{ color: '#EEEEFF' }} />
          )}
        </div>

        <h1 className="text-lg font-semibold mb-2" style={{ color: '#EEEEFF', fontFamily: 'var(--font-display)' }}>
          {phase === 'done'    ? 'GitHub Connected!'    :
           phase === 'error'   ? 'Connection Failed'    :
           phase === 'storing' ? 'Saving token…'        :
                                  'Connecting GitHub…'}
        </h1>

        {phase !== 'error' && phase !== 'done' && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#9B6EF5' }} />
            <p className="text-sm" style={{ color: '#5C5C7A' }}>
              {phase === 'exchanging' ? 'Exchanging authorization code…' : 'Storing your token securely…'}
            </p>
          </div>
        )}

        {phase === 'done' && (
          <p className="text-sm" style={{ color: '#5C5C7A' }}>
            Redirecting to dashboard…
          </p>
        )}

        {phase === 'error' && error && (
          <>
            <p className="text-sm mb-4 leading-relaxed" style={{ color: '#FF4D6D' }}>
              {error}
            </p>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#9494B8',
              }}
            >
              Back to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}

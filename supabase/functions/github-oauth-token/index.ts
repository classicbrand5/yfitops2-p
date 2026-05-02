// ─────────────────────────────────────────────────────────
// github-oauth-token — Supabase Edge Function
//
// Exchanges a GitHub OAuth authorization code for an
// access token using the app's CLIENT_ID + CLIENT_SECRET.
// The secret never leaves the server.
//
// Request body: { code: string }
// Response: { access_token: string }
// ─────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code } = await req.json() as { code: string };

    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientId     = Deno.env.get('GITHUB_CLIENT_ID');
    const clientSecret = Deno.env.get('GITHUB_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'GitHub OAuth app not configured — set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Exchange code for access token with GitHub
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json() as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (tokenData.error) {
      console.error('[github-oauth-token] GitHub error:', tokenData.error_description);
      return new Response(
        JSON.stringify({ error: tokenData.error_description ?? tokenData.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!tokenData.access_token) {
      return new Response(
        JSON.stringify({ error: 'No access_token in GitHub response' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ access_token: tokenData.access_token }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[github-oauth-token] Unhandled error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

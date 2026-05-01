// ─────────────────────────────────────────────────────────────
// YFitOps Agent Inference — Supabase Edge Function
// Receives chat messages, calls OnSpace AI, returns structured JSON.
// ─────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight — MUST be first
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Extract JWT from Authorization header ─────────────
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Create client with user JWT ───────────────────────
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );

    // ── Verify the token (throws if invalid/expired) ──────
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('[agent-inference] Auth error:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[agent-inference] Authenticated user:', user.id);

    // ── Parse request body ────────────────────────────────
    let body: {
      messages?: Array<{ role: string; content: string }>;
      context?: unknown;
      expertMode?: boolean;
      conversationId?: string;
    };

    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, context, expertMode, conversationId } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages must be a non-empty array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── AI provider config ────────────────────────────────
    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      return new Response(
        JSON.stringify({ error: 'AI provider not configured — check ONSPACE_AI_API_KEY and ONSPACE_AI_BASE_URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Build system prompt ───────────────────────────────
    const expertNote = expertMode
      ? '\n\nEXPERT MODE: Populate "steps.draft" with initial analysis and "steps.critique" with self-critique before giving the final answer.'
      : '';

    const systemPrompt = `You are YFitOps Agent, an autonomous AI coding assistant embedded inside a browser-based IDE.
You have full access to the user's workspace context and can read/write files, run commands, and open PRs.

## Response Format
You MUST ALWAYS respond with valid JSON matching this exact schema:
{
  "final": "<markdown-formatted answer>",
  "actions": [
    {
      "type": "write_file | edit_file | delete_file | read_file | run_command | create_dir | search_files | open_pr",
      "path": "<file path if applicable>",
      "content": "<full file content for write_file>",
      "diff": "<unified diff for edit_file>",
      "command": "<shell command for run_command>",
      "args": ["<arg1>"],
      "explanation": "<plain English explanation>",
      "requiresConfirmation": false
    }
  ],
  "steps": {
    "draft": "<optional: initial thinking in expert mode>",
    "critique": "<optional: self-critique in expert mode>"
  }
}

## Rules
- Set requiresConfirmation to TRUE for: file deletions, force pushes, deployments, destructive DB operations
- Set requiresConfirmation to FALSE for: reads, safe writes, npm install, test runs
- Always write TypeScript with strict types unless told otherwise
- NEVER return plain text — only valid JSON
- If you cannot complete a task, still return JSON with "final" explaining why and empty "actions"${expertNote}

## Current Workspace Context
${JSON.stringify(context ?? {}, null, 2)}`;

    // ── Call OnSpace AI ───────────────────────────────────
    let aiResponse: Response;
    try {
      aiResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map((m) => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 8192,
        }),
      });
    } catch (fetchErr) {
      console.error('[agent-inference] AI fetch failed:', fetchErr);
      return new Response(
        JSON.stringify({ error: `AI provider unreachable: ${fetchErr}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('[agent-inference] AI error response:', errText);
      return new Response(
        JSON.stringify({ error: `AI provider error: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData?.choices?.[0]?.message?.content;

    if (!rawContent) {
      return new Response(
        JSON.stringify({ error: 'Empty AI response' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Parse response ────────────────────────────────────
    let parsed: { final: string; actions?: unknown[]; steps?: unknown };
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      // AI returned plain text — wrap it
      parsed = { final: rawContent, actions: [] };
    }

    // Ensure required fields
    if (typeof parsed.final !== 'string') {
      parsed.final = rawContent;
    }
    if (!Array.isArray(parsed.actions)) {
      parsed.actions = [];
    }

    // ── Analytics log (non-fatal) ─────────────────────────
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      await supabaseAdmin.from('events').insert({
        user_id: user.id,
        event_type: 'ai_request',
        payload: {
          conversationId,
          messageCount: messages.length,
          expertMode: expertMode ?? false,
          actionCount: parsed.actions?.length ?? 0,
        },
      });
    } catch (logErr) {
      console.error('[agent-inference] Analytics log failed (non-fatal):', logErr);
    }

    // ── Return response ───────────────────────────────────
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[agent-inference] Unhandled error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ─────────────────────────────────────────────────────────────
// YFitOps Agent Inference — v3 (multi-provider + typed SSE)
//
// Streaming protocol:
//   data: {"t":"token","v":"chunk"}   ← text delta
//   data: {"t":"done","actions":[…],"steps":{},"meta":{…}}
//   data: [DONE]
//
// All providers use OpenAI-compatible /chat/completions.
// Provider routing: resolveProvider(modelId) → apiKey + baseUrl
// ─────────────────────────────────────────────────────────────

import { serve }       from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { trimWorkspaceContext } from '../_shared/contextTrimmer.ts';
import { validateActions }      from '../_shared/actionValidator.ts';

// ── PLAN LIMITS ──────────────────────────────────────────────
const PLAN_LIMITS: Record<string, number> = {
  starter: 500, pro: 5000, team: 99999, enterprise: 99999,
};

// ── CORS ─────────────────────────────────────────────────────
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonRes = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

// ── MODULE-LEVEL SINGLETON ADMIN CLIENT ──────────────────────
const adminClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// ── TYPES ─────────────────────────────────────────────────────
type SlashCommand = 'CODE_REVIEW_MODE' | 'EXPLAIN_MODE' | 'TEST_MODE' | null;

interface RequestBody {
  messages:        Array<{ role: string; content: string }>;
  context?:        Record<string, unknown>;
  expertMode?:     boolean;
  conversationId?: string;
  slashCommand?:   SlashCommand;
  stream?:         boolean;
  model?:          string;
}

// ── SSE FRAME TYPES ──────────────────────────────────────────
type SseFrame =
  | { t: 'token';  v: string }
  | { t: 'done';   actions: unknown[]; steps: unknown;
      meta: { model: string; latencyMs: number } }
  | { t: 'error';  message: string };

// ── PROVIDER ROUTING ─────────────────────────────────────────
interface ProviderConfig {
  apiKey:             string;
  baseUrl:            string;
  supportsJsonMode:   boolean;
  extraHeaders?:      Record<string, string>;
}

function resolveProvider(modelId: string): ProviderConfig | null {
  // ── Google AI Studio ─────────────────────────────────────
  // gemini-* (without google/ prefix) → direct Google AI Studio endpoint
  if (modelId.startsWith('gemini-') && !modelId.startsWith('google/gemini')) {
    const key = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!key) return null;
    return {
      apiKey:           key,
      baseUrl:          'https://generativelanguage.googleapis.com/v1beta/openai',
      supportsJsonMode: false,
    };
  }

  // ── Cerebras ─────────────────────────────────────────────
  // Explicit cerebras/ prefix to disambiguate from Groq's llama models
  if (modelId.startsWith('cerebras/')) {
    const key = Deno.env.get('CEREBRAS_API_KEY');
    if (!key) return null;
    return {
      apiKey:           key,
      baseUrl:          'https://api.cerebras.ai/v1',
      supportsJsonMode: true,
    };
  }

  // ── Groq Cloud ────────────────────────────────────────────
  // llama-3.x-*, mixtral-*
  if (modelId.startsWith('llama-') || modelId.startsWith('mixtral-')) {
    const key = Deno.env.get('GROQ_API_KEY');
    if (!key) return null;
    return {
      apiKey:           key,
      baseUrl:          'https://api.groq.com/openai/v1',
      supportsJsonMode: true,
    };
  }

  // ── OpenRouter ────────────────────────────────────────────
  // deepseek/*, google/gemma*, meta-llama/*, *:free
  if (
    modelId.startsWith('deepseek/') ||
    modelId.startsWith('google/gemma') ||
    modelId.startsWith('meta-llama/') ||
    modelId.includes(':free')
  ) {
    const key = Deno.env.get('OPENROUTER_API_KEY');
    if (!key) return null;
    return {
      apiKey:           key,
      baseUrl:          'https://openrouter.ai/api/v1',
      supportsJsonMode: false,
      extraHeaders: {
        'HTTP-Referer': 'https://yfitops2.pages.dev',
        'X-Title':      'YFitOps AI Agent',
      },
    };
  }

  // ── Together AI ───────────────────────────────────────────
  // Qwen/*, mistralai/*, togethercomputer/*
  if (
    modelId.startsWith('Qwen/') ||
    modelId.startsWith('mistralai/') ||
    modelId.startsWith('togethercomputer/')
  ) {
    const key = Deno.env.get('TOGETHER_AI_API_KEY');
    if (!key) return null;
    return {
      apiKey:           key,
      baseUrl:          'https://api.together.xyz/v1',
      supportsJsonMode: false,
    };
  }

  // ── Cloudflare Workers AI ─────────────────────────────────
  // @cf/* prefix or cloudflare/* prefix
  if (modelId.startsWith('@cf/') || modelId.startsWith('cloudflare/')) {
    const key       = Deno.env.get('CLOUDFLARE_AI_API_KEY');
    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    if (!key || !accountId) return null;
    return {
      apiKey:           key,
      baseUrl:          `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
      supportsJsonMode: false,
    };
  }

  // ── OnSpace AI (default) ──────────────────────────────────
  // google/gemini-* or anything not matched above
  const apiKey  = Deno.env.get('ONSPACE_AI_API_KEY');
  const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');
  if (!apiKey || !baseUrl) return null;
  return {
    apiKey,
    baseUrl,
    supportsJsonMode: true,
  };
}

/** Strip cerebras/ prefix — Cerebras API expects the bare model name */
function normalizeModelId(modelId: string): string {
  if (modelId.startsWith('cerebras/')) return modelId.replace('cerebras/', '');
  if (modelId.startsWith('cloudflare/')) return modelId.replace('cloudflare/', '@cf/');
  return modelId;
}

// ── SSE HELPERS ──────────────────────────────────────────────
function encodeFrame(frame: SseFrame): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(frame)}\n\n`);
}
const DONE_SENTINEL = new TextEncoder().encode('data: [DONE]\n\n');

// ── STREAMING RESPONSE BUILDER ────────────────────────────────
/**
 * Pipes an upstream OpenAI-compatible SSE stream through our typed envelope.
 * Accumulates fullText → parses JSON at end → emits done frame.
 */
function buildStreamingResponse(
  upstreamBody: ReadableStream<Uint8Array>,
  startMs:       number,
  selectedModel: string,
): Response {
  let fullText = '';

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstreamBody
        .pipeThrough(new TextDecoderStream())
        .getReader();

      let lineBuffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          lineBuffer += value;
          const lines = lineBuffer.split('\n');
          lineBuffer  = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;

            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') continue;

            let chunk: Record<string, unknown>;
            try { chunk = JSON.parse(payload); }
            catch { continue; }

            // Extract OpenAI-compatible delta
            const delta   = (chunk?.choices as Array<Record<string, unknown>>)?.[0]
              ?.delta as Record<string, unknown> | undefined;
            const content = delta?.content;

            if (typeof content === 'string' && content.length > 0) {
              fullText += content;
              controller.enqueue(encodeFrame({ t: 'token', v: content }));
            }
          }
        }
      } catch (streamErr) {
        controller.enqueue(encodeFrame({ t: 'error', message: String(streamErr) }));
        controller.enqueue(DONE_SENTINEL);
        controller.close();
        return;
      }

      // ── Parse accumulated JSON for actions/steps ──────────
      let actions: unknown[] = [];
      let steps: unknown     = {};

      try {
        const parsed = JSON.parse(fullText) as Record<string, unknown>;
        if (parsed.actions !== undefined || parsed.final !== undefined) {
          actions = Array.isArray(parsed.actions) ? parsed.actions : [];
          steps   = parsed.steps ?? {};

          // Model streamed raw JSON wrapper → re-emit just the final text
          if (typeof parsed.final === 'string' && fullText.trim().startsWith('{')) {
            controller.enqueue(
              encodeFrame({ t: 'token', v: '\x00REPLACE\x00' + parsed.final }),
            );
          }
        }
      } catch {
        // Plain text, not JSON — actions stay empty
      }

      controller.enqueue(
        encodeFrame({
          t:       'done',
          actions: validateActions(actions),
          steps,
          meta: { model: selectedModel, latencyMs: Date.now() - startMs },
        }),
      );
      controller.enqueue(DONE_SENTINEL);
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      ...cors,
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      'Connection':        'keep-alive',
    },
  });
}

// ── SYSTEM PROMPT BUILDER ────────────────────────────────────
function buildSystemPrompt(ctx: string, expertMode: boolean, slashCommand: SlashCommand): string {
  const base = `<identity>
You are YFitOps Agent — an autonomous AI pair-programmer embedded in a browser IDE.
You have full access to the user's WebContainer filesystem and terminal.
Your job: read, write, debug, refactor, and ship code. Be decisive. Be concise.
</identity>

<output_format>
Respond with ONLY a single valid JSON object. No markdown fences. No preamble.

{
  "final": "string — your markdown-formatted answer",
  "actions": [
    {
      "type": "write_file|edit_file|delete_file|read_file|run_command|create_dir|search_files|open_pr",
      "path": "string",
      "content": "string — for write_file",
      "diff": "string — unified diff for edit_file (preferred for small edits)",
      "command": "string — for run_command",
      "args": ["string"],
      "explanation": "one sentence",
      "requiresConfirmation": false
    }
  ],
  "steps": { "draft": "expert only", "critique": "expert only" }
}
</output_format>

<rules>
requiresConfirmation TRUE  → delete_file, open_pr, rm -rf, DROP TABLE, git push --force
requiresConfirmation FALSE → read_file, write_file, edit_file, create_dir, npm install

Use edit_file + unified diff for changes < 50 lines.
Use write_file for full rewrites.
Never hallucinate file contents.
Return empty actions [] if task cannot be completed; explain why in "final".
</rules>

<examples>
Edit: {"type":"edit_file","path":"src/hooks/useAuth.ts","diff":"@@ -45,6 +45,7 @@\n  const { data, error } = await supabase.auth.getSession();\n+ console.log('[useAuth] session:', data?.session?.user?.id);\n  if (error) throw error;","explanation":"Add debug log after getSession","requiresConfirmation":false}
Run:  {"type":"run_command","command":"npm","args":["test","--","--watchAll=false"],"explanation":"Run tests once","requiresConfirmation":false}
Delete: {"type":"delete_file","path":"old.sql","explanation":"Remove deprecated migration","requiresConfirmation":true}
</examples>`;

  const expertNote = expertMode
    ? '\n<expert_mode>Populate steps.draft with reasoning. Populate steps.critique with risks.</expert_mode>'
    : '';

  const slashNotes: Record<NonNullable<SlashCommand>, string> = {
    CODE_REVIEW_MODE: `
<mode_override>CODE REVIEW MODE — "final" must be structured as:
## Summary (score X/10 + rationale)
## Critical Issues (each with edit_file fix action)
## Warnings
## What\'s Good</mode_override>`,
    EXPLAIN_MODE: `
<mode_override>EXPLAIN MODE — "final" must contain:
1. TL;DR one sentence
2. Step-by-step with actual line/function references
3. Gotchas and non-obvious behaviour
No actions unless requested.</mode_override>`,
    TEST_MODE: `
<mode_override>TEST MODE — Generate comprehensive Vitest tests:
happy path, edge cases, error conditions.
Return as write_file creating *.test.ts.</mode_override>`,
  };

  const slashNote = slashCommand && slashNotes[slashCommand] ? slashNotes[slashCommand] : '';

  return `${base}${expertNote}${slashNote}\n\n<workspace_context>\n${ctx}\n</workspace_context>`;
}

// ── MAIN HANDLER ─────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const startMs = Date.now();

  try {
    // ── Auth ──────────────────────────────────────────────
    const token = (req.headers.get('Authorization') ?? '')
      .replace('Bearer ', '').trim();
    if (!token) return jsonRes({ error: 'Missing authorization token' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      console.error('[agent-inference] Auth error:', authErr?.message);
      return jsonRes({ error: 'Unauthorized' }, 401);
    }

    console.log('[agent-inference] Authenticated user:', user.id);

    // ── Rate limit check ──────────────────────────────────
    const { data: profile } = await adminClient
      .from('profiles')
      .select('plan, ai_requests_used, ai_requests_limit')
      .eq('id', user.id)
      .single();

    const plan  = (profile?.plan as string) ?? 'starter';
    const limit = profile?.ai_requests_limit ?? PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;
    const used  = profile?.ai_requests_used ?? 0;

    if (used >= limit) {
      return jsonRes({ error: 'AI request limit reached', used, limit, plan, upgradeUrl: '/billing' }, 429);
    }

    // ── Parse body ────────────────────────────────────────
    let body: RequestBody;
    try { body = await req.json(); }
    catch { return jsonRes({ error: 'Invalid JSON body' }, 400); }

    const {
      messages, context = {}, expertMode = false,
      conversationId, slashCommand = null, stream = false, model,
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonRes({ error: 'messages must be a non-empty array' }, 400);
    }

    // ── Model selection ───────────────────────────────────
    // Phase 0 fix: default model updated to gemini-2.5-flash-preview per Phase 0 requirements
    const selectedModel = model ?? Deno.env.get('DEFAULT_AI_MODEL') ?? 'google/gemini-2.5-flash-preview';

    // ── Provider routing ──────────────────────────────────
    const provider = resolveProvider(selectedModel);
    if (!provider) {
      return jsonRes({
        error: `No API key configured for model "${selectedModel}". Add the required secret in Supabase → Project Settings → Edge Functions → Secrets.`,
        model: selectedModel,
      }, 503);
    }

    const normalizedModel = normalizeModelId(selectedModel);
    console.log(`[agent-inference] Model: ${selectedModel} | Provider: ${provider.baseUrl}`);

    // ── Build system prompt ───────────────────────────────
    const { context: trimmedCtx } = trimWorkspaceContext(context as never);
    const systemPrompt = buildSystemPrompt(trimmedCtx, expertMode, slashCommand);

    // ── Build AI payload ──────────────────────────────────
    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role:    m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content),
      })),
    ];

    const aiPayload: Record<string, unknown> = {
      model:       normalizedModel,
      messages:    aiMessages,
      temperature: 0.3,
      max_tokens:  8192,
    };

    if (provider.supportsJsonMode) aiPayload.response_format = { type: 'json_object' };
    if (stream) aiPayload.stream = true;

    // ── Call AI provider ──────────────────────────────────
    let aiRes: Response;
    try {
      aiRes = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization':  `Bearer ${provider.apiKey}`,
          'Content-Type':   'application/json',
          ...(provider.extraHeaders ?? {}),
        },
        body: JSON.stringify(aiPayload),
      });
    } catch (fetchErr) {
      console.error('[agent-inference] Provider fetch error:', fetchErr);
      return jsonRes({ error: `AI provider unreachable: ${String(fetchErr)}`, model: selectedModel }, 502);
    }

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('[agent-inference] Provider error:', aiRes.status, errText);
      return jsonRes({ error: `AI provider error (${aiRes.status}): ${errText}`, model: selectedModel }, 502);
    }

    // ── Fire-and-forget: increment usage ──────────────────
    void adminClient
      .from('profiles')
      .update({ ai_requests_used: used + 1 })
      .eq('id', user.id)
      .then(() => {})
      .catch(console.error);

    // ── STREAMING PATH ────────────────────────────────────
    if (stream && aiRes.body) {
      // Log analytics fire-and-forget
      void adminClient.from('events').insert({
        user_id:    user.id,
        event_type: 'ai_request',
        payload: {
          conversationId, model: selectedModel,
          messageCount: messages.length, expertMode,
          stream: true, slashCommand,
        },
      }).catch(console.error);

      return buildStreamingResponse(aiRes.body, startMs, selectedModel);
    }

    // ── NON-STREAMING PATH ────────────────────────────────
    const aiData = await aiRes.json() as Record<string, unknown>;
    const rawContent =
      (aiData?.choices as Array<{ message: { content: string } }>)?.[0]?.message?.content ?? '';

    if (!rawContent) {
      return jsonRes({ error: 'Empty response from AI provider', model: selectedModel }, 502);
    }

    // Strip markdown code fences that some models add despite json_object instruction
    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith('```')) {
      const fenceEnd = jsonStr.indexOf('\n', 3);
      const closing  = jsonStr.lastIndexOf('```');
      if (fenceEnd !== -1 && closing > fenceEnd) {
        jsonStr = jsonStr.slice(fenceEnd + 1, closing).trim();
      }
    }

    let parsed: { final: string; actions?: unknown[]; steps?: unknown };
    try   { parsed = JSON.parse(jsonStr); }
    catch { parsed = { final: rawContent, actions: [] }; }

    if (typeof parsed.final !== 'string') parsed.final = rawContent;
    if (!Array.isArray(parsed.actions))   parsed.actions = [];

    const validatedActions = validateActions(parsed.actions);
    const latencyMs        = Date.now() - startMs;
    const estimatedTokens  = Math.round(
      (systemPrompt.length + messages.map((m) => m.content).join('').length) / 4,
    );

    // Analytics fire-and-forget
    void adminClient.from('events').insert({
      user_id:    user.id,
      event_type: 'ai_request',
      payload: {
        conversationId, model: selectedModel, latencyMs, estimatedTokens,
        messageCount: messages.length, expertMode, stream: false,
        actionCount: validatedActions.length,
        actionTypes: validatedActions.map((a) => a.type),
        slashCommand, wasJsonValid: rawContent.trim().startsWith('{'),
      },
    }).catch(console.error);

    return jsonRes({
      final:   parsed.final,
      actions: validatedActions,
      steps:   parsed.steps ?? {},
      _meta: { latencyMs, model: selectedModel, estimatedTokens, provider: provider.baseUrl },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[agent-inference] Unhandled error:', msg);
    return jsonRes({ error: msg }, 500);
  }
});

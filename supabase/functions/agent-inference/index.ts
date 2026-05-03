// ─────────────────────────────────────────────────────────────
// YFitOps Agent Inference — v2 (multi-provider)
//
// Routes requests to the correct AI provider based on model ID.
// Supports: OnSpace AI, Google AI Studio, Groq, OpenRouter,
//           Cerebras, Together AI.
//
// Changes from v1:
//   • Multi-provider routing with per-model API key + base URL
//   • Context trimmer (prioritised, max 12k chars)
//   • Action validator (typed + normalised)
//   • Rate limit check from profiles table
//   • Enriched analytics (latency, tokens, model, action types)
//   • Typed slash commands: CODE_REVIEW_MODE, EXPLAIN_MODE, TEST_MODE
//   • SSE streaming pass-through when stream=true
//   • Production-grade system prompt with examples
// ─────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── PLAN LIMITS ──────────────────────────────────────────────
const PLAN_LIMITS: Record<string, number> = {
  starter: 500,
  pro: 5000,
  team: 99999,
  enterprise: 99999,
};

// ── MAX CONTEXT SIZE (chars) ─────────────────────────────────
const MAX_CONTEXT_CHARS = 12_000;

// ── CORS ─────────────────────────────────────────────────────
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

// ── MODULE-LEVEL SINGLETON ADMIN CLIENT ──────────────────────
const _supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// ── TYPES ─────────────────────────────────────────────────────
type SlashCommand = 'CODE_REVIEW_MODE' | 'EXPLAIN_MODE' | 'TEST_MODE' | null;

interface RequestBody {
  messages: Array<{ role: string; content: string }>;
  context?: WorkspaceContext;
  expertMode?: boolean;
  conversationId?: string;
  slashCommand?: SlashCommand;
  stream?: boolean;
  model?: string;
}

interface WorkspaceContext {
  openFiles?: string[];
  activeFile?: string;
  fileTree?: unknown;
  terminalOutput?: string;
  pinnedContext?: Array<{ label: string; content: string; type: string }>;
  repoInfo?: unknown;
  [key: string]: unknown;
}

interface AgentAction {
  type: 'write_file' | 'edit_file' | 'delete_file' | 'read_file' |
        'run_command' | 'create_dir' | 'search_files' | 'open_pr';
  path?: string;
  content?: string;
  diff?: string;
  command?: string;
  args?: string[];
  explanation: string;
  requiresConfirmation: boolean;
}

// ── PROVIDER ROUTING ─────────────────────────────────────────
// Determines which API key + base URL to use for a given model ID.
// All providers use OpenAI-compatible /chat/completions endpoints.
interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  supportsJsonMode: boolean; // whether response_format: json_object is supported
}

function resolveProvider(modelId: string): ProviderConfig | null {
  // ── Google AI Studio ────────────────────────────────
  // Models: gemini-2.5-flash-preview-*, gemini-2.0-flash, gemini-*
  if (
    modelId.startsWith('gemini-') &&
    !modelId.startsWith('google/gemini')
  ) {
    const key = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!key) return null;
    return {
      apiKey: key,
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      supportsJsonMode: false, // Gemini doesn't support response_format via this endpoint
    };
  }

  // ── Cerebras ────────────────────────────────────────
  // IMPORTANT: Must come BEFORE the Groq llama-* check.
  // Model IDs with 'cerebras/' prefix route here.
  // normalizeModelId() strips 'cerebras/' before the API call.
  // e.g. 'cerebras/llama-3.3-70b' → API receives 'llama-3.3-70b'
  if (modelId.startsWith('cerebras/')) {
    const key = Deno.env.get('CEREBRAS_API_KEY');
    if (!key) return null;
    return {
      apiKey: key,
      baseUrl: 'https://api.cerebras.ai/v1',
      supportsJsonMode: true,
    };
  }

  // ── Groq Cloud ──────────────────────────────────────
  // Models: llama-3.3-70b-versatile, mixtral-8x7b-32768, llama-3.*
  // NOTE: plain 'llama-3.3-70b' (without cerebras/) also routes to Groq.
  if (
    modelId.startsWith('llama-') ||
    modelId.startsWith('mixtral-')
  ) {
    const groqKey = Deno.env.get('GROQ_API_KEY');
    if (!groqKey) return null;
    return {
      apiKey: groqKey,
      baseUrl: 'https://api.groq.com/openai/v1',
      supportsJsonMode: true,
    };
  }

  // ── OpenRouter ──────────────────────────────────────
  // Models: deepseek/*, google/gemma-*, meta-llama/*, etc.
  if (
    modelId.includes('/') &&
    (modelId.startsWith('deepseek/') ||
     modelId.startsWith('google/gemma') ||
     modelId.startsWith('meta-llama/') ||
     modelId.includes(':free'))
  ) {
    const key = Deno.env.get('OPENROUTER_API_KEY');
    if (!key) return null;
    return {
      apiKey: key,
      baseUrl: 'https://openrouter.ai/api/v1',
      supportsJsonMode: false, // OpenRouter varies by model — skip json mode
    };
  }

  // ── Together AI ─────────────────────────────────────
  // Models: Qwen/*, mistralai/*, togethercomputer/*
  if (
    modelId.startsWith('Qwen/') ||
    modelId.startsWith('mistralai/') ||
    modelId.startsWith('togethercomputer/')
  ) {
    const key = Deno.env.get('TOGETHER_AI_API_KEY');
    if (!key) return null;
    return {
      apiKey: key,
      baseUrl: 'https://api.together.xyz/v1',
      supportsJsonMode: false,
    };
  }

  // ── OnSpace AI (default) ─────────────────────────────
  // Models: google/gemini-*, or anything not matched above
  const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
  const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');
  if (!apiKey || !baseUrl) return null;
  return {
    apiKey,
    baseUrl,
    supportsJsonMode: true,
  };
}

// Special: Cerebras uses its own model IDs — strip prefix if needed
function normalizeModelId(modelId: string): string {
  if (modelId.startsWith('cerebras/')) {
    return modelId.replace('cerebras/', '');
  }
  return modelId;
}

// ── CONTEXT TRIMMER ──────────────────────────────────────────
function trimContext(ctx: WorkspaceContext): string {
  const priority: Record<string, unknown> = {};

  if (ctx.pinnedContext?.length) {
    priority.pinnedContext = ctx.pinnedContext;
  }
  if (ctx.activeFile) priority.activeFile = ctx.activeFile;
  if (ctx.openFiles?.length) {
    priority.openFiles = ctx.openFiles.slice(0, 10);
  }
  if (ctx.terminalOutput) {
    const lines = ctx.terminalOutput.split('\n');
    priority.terminalOutput = lines.slice(-50).join('\n');
  }
  if (ctx.repoInfo) priority.repoInfo = ctx.repoInfo;
  if (ctx.fileTree) {
    const treeStr = JSON.stringify(ctx.fileTree);
    priority.fileTree = treeStr.length > 3000
      ? treeStr.slice(0, 3000) + '... [truncated]'
      : ctx.fileTree;
  }

  const full = JSON.stringify(priority, null, 2);
  if (full.length <= MAX_CONTEXT_CHARS) return full;

  // Over budget — drop fileTree, truncate terminal
  delete priority.fileTree;
  if (typeof priority.terminalOutput === 'string') {
    priority.terminalOutput = (priority.terminalOutput as string)
      .split('\n').slice(-20).join('\n');
  }
  return JSON.stringify(priority, null, 2).slice(0, MAX_CONTEXT_CHARS) + '\n... [context truncated]';
}

// ── ACTION VALIDATOR ─────────────────────────────────────────
const VALID_TYPES = [
  'write_file', 'edit_file', 'delete_file', 'read_file',
  'run_command', 'create_dir', 'search_files', 'open_pr',
] as const;

const ALWAYS_CONFIRM_TYPES: AgentAction['type'][] = ['delete_file', 'open_pr'];

function validateActions(raw: unknown[]): AgentAction[] {
  const valid: AgentAction[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const a = item as Record<string, unknown>;
    const type = a.type as AgentAction['type'];
    if (!VALID_TYPES.includes(type as typeof VALID_TYPES[number])) continue;
    if ((type === 'write_file' || type === 'edit_file' || type === 'delete_file') && typeof a.path !== 'string') continue;
    if (type === 'run_command' && typeof a.command !== 'string') continue;

    valid.push({
      type,
      path:    typeof a.path    === 'string' ? a.path    : undefined,
      content: typeof a.content === 'string' ? a.content : undefined,
      diff:    typeof a.diff    === 'string' ? a.diff    : undefined,
      command: typeof a.command === 'string' ? a.command : undefined,
      args: Array.isArray(a.args) ? a.args.map(String) : undefined,
      explanation: typeof a.explanation === 'string' ? a.explanation : `${type} action`,
      requiresConfirmation: ALWAYS_CONFIRM_TYPES.includes(type) || a.requiresConfirmation === true,
    });
  }
  return valid;
}

// ── SYSTEM PROMPT BUILDER ────────────────────────────────────
function buildSystemPrompt(ctx: string, expertMode: boolean, slashCommand: SlashCommand): string {
  const base = `<identity>
You are YFitOps Agent — an autonomous AI pair-programmer embedded in a browser IDE.
You have full access to the user's WebContainer filesystem and terminal.
Your job: read, write, debug, refactor, and ship code. Be decisive. Be concise.
</identity>

<output_format>
You MUST respond with ONLY a single valid JSON object. No markdown fences. No preamble. No explanation outside the JSON.

Schema:
{
  "final": "string — your markdown-formatted answer to the user",
  "actions": [
    {
      "type": "write_file | edit_file | delete_file | read_file | run_command | create_dir | search_files | open_pr",
      "path": "string — required for file operations",
      "content": "string — full file content for write_file",
      "diff": "string — unified diff for edit_file (prefer over full content for small edits)",
      "command": "string — required for run_command",
      "args": ["string"],
      "explanation": "string — one sentence plain English",
      "requiresConfirmation": false
    }
  ],
  "steps": {
    "draft": "string — initial thinking (expert mode only)",
    "critique": "string — self-critique (expert mode only)"
  }
}
</output_format>

<rules>
CONFIRMATION RULES:
- requiresConfirmation: TRUE  → delete_file, open_pr, git push --force, DROP TABLE, rm -rf
- requiresConfirmation: FALSE → read_file, write_file, edit_file, create_dir, npm install, test runs

CODE RULES:
- Default to TypeScript with strict types
- Always handle errors in async functions
- Use edit_file with unified diff for changes <50 lines; write_file for full rewrites
- Never hallucinate file contents

RESPONSE RULES:
- Answer directly in "final" — no filler phrases
- Return empty actions: [] if you cannot complete a task — explain why in "final"
</rules>

<examples>
Edit existing file (prefer diff):
{ "type": "edit_file", "path": "src/hooks/useAuth.ts", "diff": "@@ -45,6 +45,7 @@\n   const { data, error } = ...\n+  console.log('[useAuth] session:', data?.session?.user?.id);\n   if (error) throw error;", "explanation": "Add debug log after getSession", "requiresConfirmation": false }

Run a command:
{ "type": "run_command", "command": "npm", "args": ["test", "--", "--watchAll=false"], "explanation": "Run tests once", "requiresConfirmation": false }

Destructive action:
{ "type": "delete_file", "path": "supabase/migrations/old.sql", "explanation": "Remove deprecated migration", "requiresConfirmation": true }
</examples>`;

  const expertNote = expertMode
    ? '\n<expert_mode>Populate "steps.draft" with step-by-step reasoning before writing "final". Populate "steps.critique" with potential issues in your approach.</expert_mode>'
    : '';

  const slashNotes: Record<NonNullable<SlashCommand>, string> = {
    CODE_REVIEW_MODE: `
<mode_override>CODE REVIEW MODE — Structure "final" as:
## Summary (score X/10 + rationale)
## Critical Issues (with suggested edit_file fix actions)
## Warnings
## What's Good (genuine strengths, not generic praise)
Include edit_file actions for each critical/warning issue fix.</mode_override>`,

    EXPLAIN_MODE: `
<mode_override>EXPLAIN MODE — Structure "final" as:
1. TL;DR (one sentence)
2. Step-by-step walkthrough referencing actual line numbers / function names
3. Gotchas or non-obvious behaviours
No actions unless user requests changes.</mode_override>`,

    TEST_MODE: `
<mode_override>TEST GENERATION MODE — Generate comprehensive Vitest tests:
- Happy path, edge cases, error conditions
- Return as write_file action creating *.test.ts alongside the source file</mode_override>`,
  };

  const slashNote = slashCommand && slashNotes[slashCommand] ? slashNotes[slashCommand] : '';

  return `${base}${expertNote}${slashNote}

<workspace_context>
${ctx}
</workspace_context>`;
}

// ── MAIN HANDLER ─────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  const startMs = Date.now();

  try {
    // ── Auth ─────────────────────────────────────────────
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Missing authorization token' }, 401);

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error('[agent-inference] Auth error:', authError?.message);
      return json({ error: 'Unauthorized' }, 401);
    }

    console.log('[agent-inference] Authenticated:', user.id);

    // ── Rate limit check ─────────────────────────────────
    const { data: profile } = await _supabaseAdmin
      .from('profiles')
      .select('plan, ai_requests_used, ai_requests_limit')
      .eq('id', user.id)
      .single();

    if (profile) {
      const plan = (profile.plan as string) ?? 'starter';
      const limit = profile.ai_requests_limit ?? PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;
      const used = profile.ai_requests_used ?? 0;
      if (used >= limit) {
        return json({ error: 'AI request limit reached', used, limit, plan, upgradeUrl: '/billing' }, 429);
      }
    }

    // ── Parse body ───────────────────────────────────────
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const {
      messages,
      context = {},
      expertMode = false,
      conversationId,
      slashCommand = null,
      stream = false,
      model,
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'messages must be a non-empty array' }, 400);
    }

    // ── Model selection ───────────────────────────────────
    // Priority: client request → env default → OnSpace Gemini Flash
    const selectedModel = model
      ?? Deno.env.get('DEFAULT_AI_MODEL')
      ?? 'google/gemini-2.5-flash';

    // ── Provider routing ──────────────────────────────────
    const provider = resolveProvider(selectedModel);
    if (!provider) {
      return json({
        error: `No API key configured for model "${selectedModel}". Add the required secret in Supabase → Project Settings → Edge Functions → Secrets.`,
        model: selectedModel,
      }, 503);
    }

    const normalizedModel = normalizeModelId(selectedModel);
    console.log(`[agent-inference] Model: ${selectedModel} → Provider base: ${provider.baseUrl}`);

    // ── Build system prompt ───────────────────────────────
    const trimmedCtx = trimContext(context as WorkspaceContext);
    const systemPrompt = buildSystemPrompt(trimmedCtx, expertMode, slashCommand);

    // ── Build AI payload ──────────────────────────────────
    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content),
      })),
    ];

    const aiPayload: Record<string, unknown> = {
      model: normalizedModel,
      messages: aiMessages,
      temperature: 0.3,
      max_tokens: 8192,
    };

    // Only add response_format if the provider supports it
    if (provider.supportsJsonMode) {
      aiPayload.response_format = { type: 'json_object' };
    }

    if (stream) aiPayload.stream = true;

    // ── Call AI provider ──────────────────────────────────
    let aiResponse: Response;
    try {
      aiResponse = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
          // OpenRouter requires site URL header
          ...(selectedModel.startsWith('deepseek/') || selectedModel.startsWith('google/gemma') || selectedModel.includes(':free')
            ? { 'HTTP-Referer': 'https://yfitops2.pages.dev', 'X-Title': 'YFitOps AI Agent' }
            : {}),
        },
        body: JSON.stringify(aiPayload),
      });
    } catch (fetchErr) {
      console.error('[agent-inference] Provider fetch error:', fetchErr);
      return json({ error: `AI provider unreachable: ${String(fetchErr)}`, model: selectedModel }, 502);
    }

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('[agent-inference] Provider error response:', errText);
      return json({ error: `AI provider error (${aiResponse.status}): ${errText}`, model: selectedModel }, 502);
    }

    // ── STREAMING PATH ────────────────────────────────────
    if (stream && aiResponse.body) {
      // Fire-and-forget usage increment
      _supabaseAdmin
        .from('profiles')
        .update({ ai_requests_used: (profile?.ai_requests_used ?? 0) + 1 })
        .eq('id', user.id)
        .then(() => {})
        .catch(console.error);

      return new Response(aiResponse.body, {
        headers: {
          ...cors,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // ── NON-STREAMING PATH ────────────────────────────────
    const aiData = await aiResponse.json() as Record<string, unknown>;
    const rawContent = (aiData?.choices as Array<{ message: { content: string } }>)?.[0]?.message?.content ?? '';

    if (!rawContent) {
      return json({ error: 'Empty response from AI provider', model: selectedModel }, 502);
    }

    // Extract JSON from response (handles models that wrap in markdown fences)
    let jsonStr = rawContent.trim();
    if (jsonStr.startsWith('```')) {
      const fenceEnd = jsonStr.indexOf('\n', 3);
      const closing = jsonStr.lastIndexOf('```');
      if (fenceEnd !== -1 && closing > fenceEnd) {
        jsonStr = jsonStr.slice(fenceEnd + 1, closing).trim();
      }
    }

    let parsed: { final: string; actions?: unknown[]; steps?: unknown };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Model returned plain text — wrap it gracefully
      parsed = { final: rawContent, actions: [] };
    }

    if (typeof parsed.final !== 'string') parsed.final = rawContent;
    if (!Array.isArray(parsed.actions)) parsed.actions = [];

    const validatedActions = validateActions(parsed.actions);
    const latencyMs = Date.now() - startMs;
    const estimatedTokens = Math.round(
      (systemPrompt.length + messages.map((m) => m.content).join('').length) / 4,
    );

    // ── Analytics (fire-and-forget) ───────────────────────
    const logAnalytics = async () => {
      try {
        await Promise.all([
          _supabaseAdmin.from('events').insert({
            user_id: user.id,
            event_type: 'ai_request',
            payload: {
              conversationId,
              messageCount: messages.length,
              expertMode,
              actionCount: validatedActions.length,
              actionTypes: validatedActions.map((a) => a.type),
              model: selectedModel,
              latencyMs,
              estimatedTokens,
              wasJsonValid: rawContent.trim().startsWith('{'),
              slashCommand,
            },
          }),
          _supabaseAdmin
            .from('profiles')
            .update({ ai_requests_used: (profile?.ai_requests_used ?? 0) + 1 })
            .eq('id', user.id),
        ]);
      } catch (e) {
        console.error('[agent-inference] Analytics failed (non-fatal):', e);
      }
    };

    // Use EdgeRuntime.waitUntil if available (Deno Deploy), else fire-and-forget
    if (typeof (globalThis as Record<string, unknown>).EdgeRuntime !== 'undefined') {
      // @ts-ignore — Deno Deploy global
      EdgeRuntime.waitUntil(logAnalytics());
    } else {
      void logAnalytics();
    }

    return json({
      final: parsed.final,
      actions: validatedActions,
      steps: parsed.steps ?? {},
      _meta: {
        latencyMs,
        model: selectedModel,
        estimatedTokens,
        provider: provider.baseUrl,
      },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[agent-inference] Unhandled error:', message);
    return json({ error: message }, 500);
  }
});

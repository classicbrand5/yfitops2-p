// ─────────────────────────────────────────────────────────────
// YFitOps Agent Inference — Supabase Edge Function
// Receives chat messages, calls OnSpace AI, returns structured JSON.
// ─────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// ── System prompt ─────────────────────────────────────────
const SYSTEM_PROMPT = `You are YFitOps, an autonomous engineering AI agent with world-class software engineering expertise. You help developers write code, manage repositories, run terminal commands, and ship faster.

## Response Format

You MUST ALWAYS respond with valid JSON matching this exact schema:
{
  "final": "<markdown-formatted answer>",
  "actions": [
    {
      "type": "write_file | edit_file | delete_file | read_file | run_command | create_dir",
      "path": "<file path if applicable>",
      "content": "<full file content for write_file>",
      "diff": "<unified diff for edit_file>",
      "command": "<shell command for run_command>",
      "args": ["<arg1>", "<arg2>"],
      "explanation": "<plain English explanation of what this action does>",
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
- In expert mode, populate the "steps" field with your draft and critique
- Always write TypeScript with strict types unless told otherwise
- Always format code with 2-space indentation
- NEVER return plain text — only valid JSON
- If you cannot complete a task, still return JSON with "final" explaining why and empty "actions"
- For edit_file, use standard unified diff format (--- +++ @@ lines)`;

// ── Schema validator ──────────────────────────────────────
function validateAgentResponse(raw: unknown): void {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Agent response is not an object');
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.final !== 'string') {
    throw new Error('Agent response missing "final" string');
  }
  if (r.actions !== undefined && !Array.isArray(r.actions)) {
    throw new Error('"actions" must be an array');
  }
}

// ── Error response helper ─────────────────────────────────
function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── Main handler ──────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Handle CORS preflight — MUST be first
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth verification ──────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonError('Missing Authorization header', 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return jsonError('Unauthorized', 401);
  }

  // ── Parse request body ────────────────────────────────
  let body: {
    messages?: Array<{ role: string; content: string }>;
    conversationId?: string;
    expertMode?: boolean;
    workspaceContext?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const { messages, conversationId, expertMode, workspaceContext } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError('messages must be a non-empty array', 400);
  }

  // ── AI provider config ────────────────────────────────
  const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
  const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

  if (!apiKey || !baseUrl) {
    return jsonError('AI provider not configured — check ONSPACE_AI_API_KEY and ONSPACE_AI_BASE_URL', 500);
  }

  // ── Build full system prompt with context ─────────────
  const contextBlock = workspaceContext
    ? `\n\n## Current Workspace Context\n${JSON.stringify(workspaceContext, null, 2)}`
    : '';

  const expertModeNote = expertMode
    ? '\n\nEXPERT MODE ACTIVE: Populate the "steps.draft" field with your initial analysis, then "steps.critique" with your self-critique, then provide the refined "final" and "actions".'
    : '';

  const fullSystemPrompt = SYSTEM_PROMPT + contextBlock + expertModeNote;

  // ── Assemble AI messages ──────────────────────────────
  const aiMessages = [
    { role: 'system', content: fullSystemPrompt },
    ...messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
  ];

  // ── Call OnSpace AI ───────────────────────────────────
  let aiResponse: Response;
  try {
    aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: aiMessages,
        stream: false,
        temperature: 0.3,
        max_tokens: 8192,
        response_format: { type: 'json_object' },
      }),
    });
  } catch (err) {
    console.error('[agent-inference] AI fetch failed:', err);
    return jsonError(`AI provider unreachable: ${err}`, 502);
  }

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    console.error('[agent-inference] AI error response:', errText);
    return jsonError(`AI provider error: ${errText}`, 502);
  }

  const aiData = await aiResponse.json();
  const rawContent = aiData?.choices?.[0]?.message?.content;

  if (!rawContent) {
    return jsonError('Empty AI response — no content in choices[0].message.content', 502);
  }

  // ── Parse and validate the structured JSON response ───
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    console.error('[agent-inference] Non-JSON AI response:', rawContent.slice(0, 500));
    return jsonError(`AI returned non-JSON: ${rawContent.slice(0, 200)}`, 502);
  }

  try {
    validateAgentResponse(parsed);
  } catch (err) {
    console.error('[agent-inference] Schema validation failed:', err);
    return jsonError(`Invalid AI response schema: ${err}`, 502);
  }

  // ── Log analytics event ───────────────────────────────
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseAdmin.from('events').insert({
      user_id: user.id,
      event_type: 'ai_request',
      payload: {
        conversationId,
        messageCount: messages.length,
        expertMode: expertMode ?? false,
        actionCount: (parsed as { actions?: unknown[] }).actions?.length ?? 0,
      },
    });
  } catch (err) {
    // Non-fatal — don't fail the request if analytics logging fails
    console.error('[agent-inference] Analytics log failed:', err);
  }

  // ── Return validated response ─────────────────────────
  return new Response(JSON.stringify(parsed), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

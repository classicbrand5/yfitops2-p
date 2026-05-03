// ─────────────────────────────────────────────────────────
// Model & Provider Definitions — YFitOps AI Agent
//
// Single source of truth for all supported AI models.
// Used by the frontend model selector and sent as the
// `model` field to the agent-inference edge function,
// which routes to the correct provider API.
// ─────────────────────────────────────────────────────────

export type ProviderId =
  | 'onspace'
  | 'google'
  | 'groq'
  | 'openrouter'
  | 'cerebras'
  | 'together';

export interface ModelOption {
  id: string;                // The model ID sent to the edge function
  label: string;             // Human-readable name shown in UI
  provider: ProviderId;
  providerLabel: string;     // Human-readable provider name
  description: string;       // Short feature description
  badge?: string;            // Optional badge (e.g. "Fastest", "Free", "Code")
  badgeColor?: string;       // Badge background color token
  contextWindow?: string;    // Human-readable context size
  speed?: 'blazing' | 'fast' | 'normal';
  isFree?: boolean;          // True when no API key required beyond provider key
  requiresSecret: string;    // Supabase secret name that must be set
}

// ── Provider metadata ────────────────────────────────────
export interface ProviderMeta {
  id: ProviderId;
  label: string;
  color: string;             // Accent color for provider badge
  dashboardUrl: string;      // Where to get an API key
  secretName: string;        // Supabase secret key name
  description: string;
}

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  onspace: {
    id: 'onspace',
    label: 'OnSpace AI',
    color: '#00F5A0',
    dashboardUrl: 'https://onspace.ai',
    secretName: 'ONSPACE_AI_API_KEY',
    description: 'Default OnSpace AI proxy — no setup required',
  },
  google: {
    id: 'google',
    label: 'Google AI Studio',
    color: '#4285F4',
    dashboardUrl: 'https://aistudio.google.com/apikey',
    secretName: 'GOOGLE_AI_API_KEY',
    description: 'Direct Gemini access — 1M token context, 15 RPM free',
  },
  groq: {
    id: 'groq',
    label: 'Groq Cloud',
    color: '#F55036',
    dashboardUrl: 'https://console.groq.com/keys',
    secretName: 'GROQ_API_KEY',
    description: '600+ tok/s inference — fastest in the world',
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    color: '#6366F1',
    dashboardUrl: 'https://openrouter.ai/keys',
    secretName: 'OPENROUTER_API_KEY',
    description: 'Routes to 200+ models including free tier models',
  },
  cerebras: {
    id: 'cerebras',
    label: 'Cerebras',
    color: '#FF6B35',
    dashboardUrl: 'https://cloud.cerebras.ai',
    secretName: 'CEREBRAS_API_KEY',
    description: '2000+ tok/s — streaming tokens appear near-instantly',
  },
  together: {
    id: 'together',
    label: 'Together AI',
    color: '#7C3AED',
    dashboardUrl: 'https://api.together.ai/settings/api-keys',
    secretName: 'TOGETHER_AI_API_KEY',
    description: 'State-of-the-art code generation models ($1 free credit)',
  },
};

// ── All available models ─────────────────────────────────
export const ALL_MODELS: ModelOption[] = [
  // ── OnSpace AI (default, always available) ───────────
  {
    id: 'google/gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'onspace',
    providerLabel: 'OnSpace AI',
    description: 'Default — fast reasoning, great code quality',
    badge: 'Default',
    badgeColor: '#00F5A0',
    contextWindow: '1M',
    speed: 'fast',
    isFree: true,
    requiresSecret: 'ONSPACE_AI_API_KEY',
  },

  // ── Google AI Studio ─────────────────────────────────
  {
    id: 'gemini-2.5-flash-preview-05-20',
    label: 'Gemini 2.5 Flash Preview',
    provider: 'google',
    providerLabel: 'Google AI Studio',
    description: 'Native Gemini access · 1M context · 15 RPM free',
    badge: 'Free',
    badgeColor: '#4285F4',
    contextWindow: '1M',
    speed: 'fast',
    isFree: true,
    requiresSecret: 'GOOGLE_AI_API_KEY',
  },
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    provider: 'google',
    providerLabel: 'Google AI Studio',
    description: 'Stable Gemini 2.0 · production ready · fast',
    contextWindow: '1M',
    speed: 'fast',
    isFree: true,
    requiresSecret: 'GOOGLE_AI_API_KEY',
  },

  // ── Groq Cloud ───────────────────────────────────────
  {
    id: 'llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B',
    provider: 'groq',
    providerLabel: 'Groq Cloud',
    description: '600+ tok/s · perfect for autocomplete & fast iteration',
    badge: 'Fastest',
    badgeColor: '#F55036',
    contextWindow: '128K',
    speed: 'blazing',
    isFree: true,
    requiresSecret: 'GROQ_API_KEY',
  },
  {
    id: 'mixtral-8x7b-32768',
    label: 'Mixtral 8x7B',
    provider: 'groq',
    providerLabel: 'Groq Cloud',
    description: 'MoE architecture · balanced speed + quality',
    contextWindow: '32K',
    speed: 'blazing',
    isFree: true,
    requiresSecret: 'GROQ_API_KEY',
  },

  // ── OpenRouter ───────────────────────────────────────
  {
    id: 'deepseek/deepseek-r1:free',
    label: 'DeepSeek R1',
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    description: 'Best reasoning model · permanently free via OpenRouter',
    badge: 'Free',
    badgeColor: '#6366F1',
    contextWindow: '64K',
    speed: 'normal',
    isFree: true,
    requiresSecret: 'OPENROUTER_API_KEY',
  },
  {
    id: 'google/gemma-3-27b-it:free',
    label: 'Gemma 3 27B',
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    description: 'Google open model · permanently free · good coding',
    badge: 'Free',
    badgeColor: '#6366F1',
    contextWindow: '128K',
    speed: 'fast',
    isFree: true,
    requiresSecret: 'OPENROUTER_API_KEY',
  },

  // ── Cerebras ─────────────────────────────────────────
  {
    id: 'cerebras/llama-3.3-70b',
    label: 'Llama 3.3 70B (Cerebras)',
    // NOTE: The 'cerebras/' prefix is stripped by normalizeModelId() in the edge function
    // before forwarding to the Cerebras API. This prefix is only used for routing.
    provider: 'cerebras',
    providerLabel: 'Cerebras',
    description: '2000+ tok/s · streaming tokens appear near-instantly',
    badge: 'Ultra Fast',
    badgeColor: '#FF6B35',
    contextWindow: '128K',
    speed: 'blazing',
    isFree: true,
    requiresSecret: 'CEREBRAS_API_KEY',
  },

  // ── Together AI ──────────────────────────────────────
  {
    id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    label: 'Qwen 2.5 Coder 32B',
    provider: 'together',
    providerLabel: 'Together AI',
    description: 'State-of-the-art code gen · $1 free credit to start',
    badge: 'Best Code',
    badgeColor: '#7C3AED',
    contextWindow: '32K',
    speed: 'normal',
    requiresSecret: 'TOGETHER_AI_API_KEY',
  },
];

// ── Helper: get model by ID ───────────────────────────────
export function getModelById(id: string): ModelOption | undefined {
  return ALL_MODELS.find((m) => m.id === id);
}

// ── Helper: get models grouped by provider ────────────────
export function getModelsByProvider(): Record<ProviderId, ModelOption[]> {
  const grouped: Partial<Record<ProviderId, ModelOption[]>> = {};
  for (const model of ALL_MODELS) {
    if (!grouped[model.provider]) grouped[model.provider] = [];
    grouped[model.provider]!.push(model);
  }
  return grouped as Record<ProviderId, ModelOption[]>;
}

// ── Default model ID ─────────────────────────────────────
export const DEFAULT_MODEL_ID = 'google/gemini-2.5-flash';

// ── Model ID routing notes ────────────────────────────────
// The model ID sent to agent-inference determines which provider is used:
//   'google/gemini-*'         → OnSpace AI (default proxy)
//   'gemini-*' (no google/)   → Google AI Studio (GOOGLE_AI_API_KEY)
//   'llama-*', 'mixtral-*'    → Groq Cloud (GROQ_API_KEY)
//   'cerebras/*'              → Cerebras (CEREBRAS_API_KEY); prefix stripped before API call
//   'deepseek/*', '*:free'    → OpenRouter (OPENROUTER_API_KEY)
//   'Qwen/*', 'mistralai/*'   → Together AI (TOGETHER_AI_API_KEY)
// See supabase/functions/agent-inference/index.ts → resolveProvider()

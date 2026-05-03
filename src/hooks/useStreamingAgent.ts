// ─────────────────────────────────────────────────────────
// useStreamingAgent — SSE streaming AI agent hook
//
// Owns the entire streaming lifecycle:
//   • session refresh → fetch with stream:true
//   • ReadableStream line-by-line SSE frame parsing
//   • Zustand token-by-token updates (live cursor in chat)
//   • done frame hydration (actions, steps appear after text)
//   • AbortController cancellation
//   • Error recovery with friendly toasts
// ─────────────────────────────────────────────────────────

import { useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import type { AgentAction, AgentMessage } from '@/types/agent.types';
import { getModelById } from '@/types/models';

// ── SSE frame shapes (mirror of edge function types) ─────
type SseFrame =
  | { t: 'token';  v: string }
  | { t: 'done';   actions: AgentAction[]; steps: unknown;
      meta: { model: string; latencyMs: number } }
  | { t: 'error';  message: string };

interface SendOptions {
  text:             string;
  conversationId:   string;
  context:          Record<string, unknown>;
  expertMode:       boolean;
  selectedModelId:  string;
  slashCommand?:    string | null;
  onDone?:          () => void;
}

const SUPABASE_FUNCTIONS_URL =
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

// Strip JSON wrapper that some models stream instead of pure text.
// e.g.  {"final":"  →  (empty, wait for real tokens)
const JSON_WRAPPER_RE = /^\s*\{\s*"final"\s*:\s*"/;
const JSON_TRAILER_RE = /"\s*,?\s*"(actions|steps)"[\s\S]*$/;

function stripJsonWrapper(text: string): string {
  return text
    .replace(JSON_WRAPPER_RE, '')
    .replace(JSON_TRAILER_RE, '');
}

export function useStreamingAgent() {
  const abortRef    = useRef<AbortController | null>(null);
  const isStreaming  = useRef(false);

  const addMessage        = useAppStore((s) => s.addMessage);
  const updateMessage     = useAppStore((s) => s.updateMessage);
  const setIsThinking     = useAppStore((s) => s.setIsThinking);
  const setStreamingMessageId = useAppStore((s) => s.setStreamingMessageId);
  const appendStreamToken  = useAppStore((s) => s.appendStreamToken);

  // ── Cancel any in-flight stream ──────────────────────────
  const cancelStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    isStreaming.current = false;
    setIsThinking(false);
    setStreamingMessageId(null);
  }, [setIsThinking, setStreamingMessageId]);

  // ── Send message and stream response ─────────────────────
  const sendMessage = useCallback(async (opts: SendOptions) => {
    if (isStreaming.current) return;

    const {
      text, conversationId, context, expertMode,
      selectedModelId, slashCommand, onDone,
    } = opts;

    // ── 1. Proactive session refresh ──────────────────────
    let { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      session = refreshed.session;
    }

    if (!session) {
      toast.error('Session expired — please sign in again');
      return;
    }

    const expiresAt = session.expires_at ?? 0;
    if (Math.floor(Date.now() / 1000) + 60 > expiresAt) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session) session = refreshed.session;
    }

    // ── 2. Add user message ───────────────────────────────
    const userMsg: AgentMessage = {
      id:        crypto.randomUUID(),
      role:      'user',
      content:   text,
      timestamp: Date.now(),
      actions:   [],
    };
    addMessage(conversationId, userMsg);

    // ── 3. Add empty assistant placeholder ───────────────
    const assistantId = crypto.randomUUID();
    addMessage(conversationId, {
      id:          assistantId,
      role:        'assistant',
      content:     '',
      timestamp:   Date.now(),
      isStreaming: true,
      actions:     [],
    });

    setIsThinking(true);
    setStreamingMessageId(assistantId);
    isStreaming.current = true;

    // ── 4. Build message history for edge function ────────
    const storeMessages = useAppStore.getState().messages[conversationId] ?? [];
    const history = storeMessages
      .filter((m) => m.id !== assistantId)
      .map((m) => ({ role: m.role, content: m.content }));

    // ── 5. Fetch with streaming ───────────────────────────
    abortRef.current = new AbortController();
    let accumulatedText = '';

    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/agent-inference`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type':  'application/json',
          'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          messages:       history,
          context,
          expertMode,
          slashCommand:   slashCommand ?? null,
          model:          selectedModelId,
          conversationId,
          stream:         true,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errText = await res.text();

        // Provider not configured → actionable toast
        if (res.status === 503) {
          const model = getModelById(selectedModelId);
          toast.error('Provider API key missing', {
            description: `Add "${model?.requiresSecret ?? 'API key'}" to Supabase → Edge Functions → Secrets`,
            duration: 7000,
          });
        } else if (res.status === 401) {
          toast.error('Authentication failed', {
            description: 'Please sign out and sign in again.',
            action: {
              label: 'Sign Out',
              onClick: () => void supabase.auth.signOut(),
            },
          });
        } else {
          toast.error(`Agent error (${res.status})`, { description: errText.slice(0, 120) });
        }

        updateMessage(conversationId, assistantId, {
          content:     '',
          error:       `Error ${res.status}: ${errText.slice(0, 200)}`,
          isStreaming: false,
        });
        return;
      }

      if (!res.body) throw new Error('No response body');

      // ── 6. Read SSE stream line-by-line ──────────────────
      const reader = res.body
        .pipeThrough(new TextDecoderStream())
        .getReader();

      let lineBuffer = '';

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

          let frame: SseFrame;
          try { frame = JSON.parse(payload) as SseFrame; }
          catch { continue; }

          // ── Token frame: append to streaming content ────
          if (frame.t === 'token') {
            // Handle the \x00REPLACE\x00 signal from edge function
            if (frame.v.startsWith('\x00REPLACE\x00')) {
              accumulatedText = frame.v.slice('\x00REPLACE\x00'.length);
            } else {
              accumulatedText += frame.v;
            }

            // Strip raw JSON wrapper if model streamed { "final": "..."
            const display = stripJsonWrapper(accumulatedText);

            appendStreamToken(conversationId, assistantId, display || accumulatedText);
          }

          // ── Done frame: hydrate actions + finalise ──────
          else if (frame.t === 'done') {
            updateMessage(conversationId, assistantId, {
              content:     stripJsonWrapper(accumulatedText) || accumulatedText,
              actions:     (frame.actions ?? []) as AgentAction[],
              isStreaming: false,
            });
            onDone?.();
          }

          // ── Error frame from edge function ──────────────
          else if (frame.t === 'error') {
            updateMessage(conversationId, assistantId, {
              content:     '',
              error:       frame.message,
              isStreaming: false,
            });
            toast.error('Agent error', { description: frame.message });
          }
        }
      }

    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled — update message to show partial content
        updateMessage(conversationId, assistantId, {
          content:     accumulatedText || '',
          isStreaming: false,
          error:       accumulatedText ? undefined : 'Cancelled',
        });
        return;
      }

      const msg = err instanceof Error ? err.message : String(err);
      console.error('[useStreamingAgent] Error:', msg);
      updateMessage(conversationId, assistantId, {
        content:     '',
        error:       msg,
        isStreaming: false,
      });
      toast.error('Agent request failed', { description: msg.slice(0, 100) });

    } finally {
      isStreaming.current = false;
      abortRef.current    = null;
      setIsThinking(false);
      setStreamingMessageId(null);
    }
  }, [
    addMessage, updateMessage, setIsThinking,
    setStreamingMessageId, appendStreamToken,
  ]);

  return {
    sendMessage,
    cancelStream,
    isStreaming: isStreaming.current,
  };
}

// ─────────────────────────────────────────────────────────
// AgentChat — Phase 6
//
// Full AI chat panel wired to agent-inference Edge Function.
// Features:
// - Conversation history with user/assistant messages
// - Real agent call via Supabase Edge Function
// - Action cards rendered per AgentAction type
// - Enter to send, Shift+Enter for newline
// - Thinking indicator (animated dots)
// - Workspace context passed to agent (file tree, open files)
// - Inline error display on failure
// - Auto-scroll to latest message
// ─────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  Send,
  Bot,
  User,
  Terminal,
  FileEdit,
  FilePlus,
  Trash2,
  FolderPlus,
  Search,
  GitPullRequest,
  FileText,
  AlertCircle,
  Plus,
  Loader2,
  Sparkles,
} from 'lucide-react';
import type { AgentAction, AgentMessage, AgentResponse } from '@/types/agent.types';
import { FunctionsHttpError } from '@supabase/supabase-js';

// ── Action type → icon + label ────────────────────────────
const ACTION_META: Record<
  string,
  { Icon: React.ElementType; label: string; color: string }
> = {
  read_file:    { Icon: FileText,      label: 'Read file',    color: '#38BDF8' },
  write_file:   { Icon: FilePlus,      label: 'Write file',   color: '#00F5A0' },
  edit_file:    { Icon: FileEdit,      label: 'Edit file',    color: '#9B6EF5' },
  delete_file:  { Icon: Trash2,        label: 'Delete file',  color: '#FF4D6D' },
  create_dir:   { Icon: FolderPlus,    label: 'Create dir',   color: '#FBBF24' },
  run_command:  { Icon: Terminal,      label: 'Run command',  color: '#22D3EE' },
  search_files: { Icon: Search,        label: 'Search',       color: '#38BDF8' },
  open_pr:      { Icon: GitPullRequest,label: 'Open PR',      color: '#00F5A0' },
};

// ── ActionCard ────────────────────────────────────────────
function ActionCard({ action }: { action: AgentAction }) {
  const meta = ACTION_META[action.type] ?? {
    Icon: Sparkles,
    label: action.type,
    color: '#9494B8',
  };
  const { Icon, label, color } = meta;

  const statusColor =
    action.status === 'done'      ? '#00F5A0' :
    action.status === 'failed'    ? '#FF4D6D' :
    action.status === 'executing' ? '#FBBF24' :
    action.status === 'rejected'  ? '#FF4D6D' :
    '#5C5C7A';

  return (
    <div
      className="flex items-start gap-2 rounded-lg px-3 py-2 mt-2"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid rgba(255,255,255,0.07)`,
      }}
    >
      <div
        className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center mt-0.5"
        style={{ background: `${color}15`, border: `1px solid ${color}30` }}
      >
        <Icon className="w-3 h-3" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium" style={{ color }}>
            {label}
          </span>
          {action.status !== 'pending' && (
            <span
              className="text-xs font-medium px-1.5 py-0.5 rounded"
              style={{
                background: `${statusColor}18`,
                color: statusColor,
                fontSize: '10px',
              }}
            >
              {action.status}
            </span>
          )}
          {action.requiresConfirmation && action.status === 'pending' && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                background: 'rgba(251,191,36,0.12)',
                color: '#FBBF24',
                fontSize: '10px',
              }}
            >
              needs approval
            </span>
          )}
        </div>
        {action.path && (
          <p
            className="text-xs truncate mb-0.5"
            style={{ color: '#9494B8', fontFamily: 'var(--font-mono)' }}
          >
            {action.path}
          </p>
        )}
        {action.command && (
          <p
            className="text-xs truncate mb-0.5"
            style={{ color: '#9494B8', fontFamily: 'var(--font-mono)' }}
          >
            $ {action.command} {action.args?.join(' ')}
          </p>
        )}
        <p className="text-xs leading-relaxed" style={{ color: '#5C5C7A' }}>
          {action.explanation}
        </p>
        {action.result && (
          <div
            className="mt-1.5 rounded px-2 py-1 text-xs"
            style={{
              background: action.result.success
                ? 'rgba(0,245,160,0.06)'
                : 'rgba(255,77,109,0.06)',
              color: action.result.success ? '#00F5A0' : '#FF4D6D',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {action.result.output ?? action.result.error ?? (action.result.success ? 'Done' : 'Failed')}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ThinkingDots ──────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1" aria-label="Agent thinking">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full animate-thinking"
          style={{
            background: '#9B6EF5',
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── MessageBubble ─────────────────────────────────────────
function MessageBubble({ msg }: { msg: AgentMessage }) {
  const isUser = msg.role === 'user';

  return (
    <div className={cn('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
          style={{ background: 'rgba(155,110,245,0.15)', border: '1px solid rgba(155,110,245,0.2)' }}
        >
          <Bot className="w-3.5 h-3.5" style={{ color: '#9B6EF5' }} />
        </div>
      )}

      <div className={cn('max-w-[85%] min-w-0', isUser ? 'items-end' : 'items-start')}>
        <div
          className="rounded-xl px-3 py-2.5 text-xs leading-relaxed"
          style={
            isUser
              ? {
                  background: 'rgba(0,245,160,0.08)',
                  border: '1px solid rgba(0,245,160,0.18)',
                  color: '#EEEEFF',
                }
              : {
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: '#C8C8E8',
                }
          }
        >
          {/* Content */}
          {msg.content ? (
            <pre
              className="whitespace-pre-wrap break-words"
              style={{ fontFamily: 'var(--font-body)', fontSize: '12px', lineHeight: '1.6' }}
            >
              {msg.content}
            </pre>
          ) : msg.role === 'assistant' && !msg.content ? (
            <ThinkingDots />
          ) : null}

          {/* Error */}
          {msg.error && (
            <div className="flex items-start gap-1.5 mt-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#FF4D6D' }} />
              <span style={{ color: '#FF4D6D', fontSize: '11px' }}>{msg.error}</span>
            </div>
          )}
        </div>

        {/* Action cards */}
        {msg.actions && msg.actions.length > 0 && (
          <div className="mt-1">
            {msg.actions.map((action, idx) => (
              <ActionCard key={idx} action={action} />
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
          style={{ background: 'rgba(0,245,160,0.12)', border: '1px solid rgba(0,245,160,0.2)' }}
        >
          <User className="w-3.5 h-3.5" style={{ color: '#00F5A0' }} />
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════
// AgentChat — main component
// ═════════════════════════════════════════════════════════
export function AgentChat() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendInFlightRef = useRef(false);

  // Store selectors
  const conversations        = useAppStore((s) => s.conversations);
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const createNewConversation = useAppStore((s) => s.createNewConversation);
  const addMessage           = useAppStore((s) => s.addMessage);
  const updateMessage        = useAppStore((s) => s.updateMessage);
  const setIsThinking        = useAppStore((s) => s.setIsThinking);
  const isThinking           = useAppStore((s) => s.isThinking);
  const expertMode           = useAppStore((s) => s.expertMode);

  // Workspace context selectors
  const fileTree          = useAppStore((s) => s.fileTree);
  const openTabs          = useAppStore((s) => s.openTabs);
  const activeTabId       = useAppStore((s) => s.activeTabId);
  const terminalSessions  = useAppStore((s) => s.terminalSessions);
  const activeTerminalId  = useAppStore((s) => s.activeTerminalId);

  // Derive current messages
  // Subscribe reactively
  const reactiveMessages = useAppStore(
    (s) => (s.activeConversationId ? (s.messages[s.activeConversationId] ?? []) : [])
  );

  // ── Bootstrap: ensure at least one conversation ───────
  useEffect(() => {
    if (conversations.length === 0) {
      createNewConversation();
    }
  }, []);  // run once on mount

  // ── Auto-scroll ───────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [reactiveMessages, isThinking]);

  // ── Auto-resize textarea ──────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  // ── Build workspace context ───────────────────────────
  const buildContext = useCallback(() => {
    const activeTerminal = activeTerminalId ? terminalSessions[activeTerminalId] : null;
    return {
      fileTree: fileTree.slice(0, 80).map((f) => ({
        name: f.name,
        path: f.path,
        type: f.type,
      })),
      openFiles: openTabs.map((t) => ({ path: t.path, language: t.language })),
      activeFile: openTabs.find((t) => t.id === activeTabId)?.path ?? null,
      terminalOutput: activeTerminal?.output?.slice(-30) ?? [],
      expertMode,
    };
  }, [fileTree, openTabs, activeTabId, terminalSessions, activeTerminalId, expertMode]);

  // ── Send handler ──────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isThinking || sendInFlightRef.current) return;
    if (!activeConversationId) return;

    sendInFlightRef.current = true;

    // 1. Add user message
    const userMsg: AgentMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      actions: [],
    };
    addMessage(activeConversationId, userMsg);
    setInput('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // 2. Add empty assistant placeholder (shows thinking dots)
    const assistantId = crypto.randomUUID();
    const assistantPlaceholder: AgentMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      actions: [] as AgentAction[],
    };
    addMessage(activeConversationId, assistantPlaceholder);
    setIsThinking(true);

    try {
      // 3. Build message history
      const storeMessages = useAppStore.getState().messages[activeConversationId] ?? [];
      const history = storeMessages
        .filter((m) => m.id !== assistantId)  // exclude the placeholder
        .map((m) => ({ role: m.role, content: m.content }));

      // 4. Call edge function
      const { data, error } = await supabase.functions.invoke('agent-inference', {
        body: {
          messages: history,
          workspaceContext: buildContext(),
          expertMode,
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[${statusCode}] ${textContent || error.message}`;
          } catch {
            errorMessage = error.message;
          }
        }
        throw new Error(errorMessage);
      }

      const response = data as AgentResponse;

      // 5. Update placeholder with real content
      updateMessage(activeConversationId, assistantId, {
        content: response.final ?? 'No response',
        actions: response.actions ?? [],
        isStreaming: false,
      });
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : 'Agent request failed';
      updateMessage(activeConversationId, assistantId, {
        content: '',
        error: errorText,
        isStreaming: false,
      });
      console.error('[AgentChat] Send failed:', err);
    } finally {
      setIsThinking(false);
      sendInFlightRef.current = false;
    }
  }, [
    input, isThinking, activeConversationId,
    addMessage, updateMessage, setIsThinking,
    buildContext, expertMode,
  ]);

  // ── Keyboard handler ──────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // ── Empty conversation welcome ────────────────────────
  const isEmpty = reactiveMessages.length === 0;

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: '#09090F' }}
    >
      {/* ── Messages area ─────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A35 transparent' }}
        aria-live="polite"
        aria-label="Chat messages"
      >
        {isEmpty && !isThinking && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'rgba(155,110,245,0.1)', border: '1px solid rgba(155,110,245,0.2)' }}
            >
              <Bot className="w-6 h-6" style={{ color: '#9B6EF5' }} />
            </div>
            <p
              className="text-sm font-medium mb-1"
              style={{ color: '#5C5C7A', fontFamily: 'var(--font-display)' }}
            >
              YFitOps AI Agent
            </p>
            <p className="text-xs leading-relaxed max-w-[180px]" style={{ color: '#3A3A52' }}>
              Ask about your code, request edits, or run commands.
            </p>
          </div>
        )}

        {reactiveMessages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ────────────────────────────────── */}
      <div
        className="flex-shrink-0 p-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{
            background: '#13131C',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isThinking ? 'Agent is thinking…' : 'Ask the agent… (Enter to send)'}
            rows={1}
            disabled={isThinking}
            className="flex-1 bg-transparent text-xs outline-none resize-none leading-relaxed"
            style={{
              color: '#EEEEFF',
              fontFamily: 'var(--font-body)',
              minHeight: '20px',
              maxHeight: '120px',
              overflow: 'auto',
            }}
            aria-label="Chat input"
            aria-multiline="true"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: input.trim() && !isThinking
                ? 'rgba(0,245,160,0.15)'
                : 'rgba(255,255,255,0.04)',
              border: `1px solid ${input.trim() && !isThinking ? 'rgba(0,245,160,0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: input.trim() && !isThinking ? '#00F5A0' : '#3A3A52',
            }}
            aria-label="Send message"
          >
            {isThinking ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Keyboard hint */}
        <p className="text-center mt-1 text-xs" style={{ color: '#2A2A35', fontSize: '10px' }}>
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}

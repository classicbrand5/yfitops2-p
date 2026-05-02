
// ─────────────────────────────────────────────────────────
// AgentChat — Enhanced with Voice Input + Pinned Context
//            + Slash Commands + DiffPreview (Sections C1,C2,C5,B3)
// ─────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  Send, Bot, User, Terminal, FileEdit, FilePlus, Trash2,
  FolderPlus, Search, GitPullRequest, FileText, AlertCircle,
  Loader2, Sparkles, Play, Eye, Mic, MicOff, Pin, X,
  ChevronDown, ChevronUp, Code2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AgentAction, AgentMessage, AgentResponse } from '@/types/agent.types';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { executeAction, isFileSystemAction } from '@/agent/executeAction';
import { buildFileTree } from '@/core/webcontainer/fs';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { DiffPreview } from '@/components/features/DiffPreview';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import type { WebContainer } from '@webcontainer/api';

// ── Action meta ───────────────────────────────────────────
const ACTION_META: Record<string, { Icon: React.ElementType; label: string; color: string }> = {
  read_file:    { Icon: FileText,       label: 'Read file',    color: '#38BDF8' },
  write_file:   { Icon: FilePlus,       label: 'Write file',   color: '#00F5A0' },
  edit_file:    { Icon: FileEdit,       label: 'Edit file',    color: '#9B6EF5' },
  delete_file:  { Icon: Trash2,         label: 'Delete file',  color: '#FF4D6D' },
  create_dir:   { Icon: FolderPlus,     label: 'Create dir',   color: '#FBBF24' },
  run_command:  { Icon: Terminal,       label: 'Run command',  color: '#22D3EE' },
  search_files: { Icon: Search,         label: 'Search',       color: '#38BDF8' },
  open_pr:      { Icon: GitPullRequest, label: 'Open PR',      color: '#00F5A0' },
};

const DESTRUCTIVE_TYPES: AgentAction['type'][] = ['delete_file', 'open_pr'];

// ── ActionCard ────────────────────────────────────────────
function ActionCard({
  action, onApply, onReview, isExecuting,
}: {
  action: AgentAction;
  onApply: (a: AgentAction) => void;
  onReview: (a: AgentAction) => void;
  isExecuting: boolean;
}) {
  const [showDiff, setShowDiff] = useState(false);
  const meta = ACTION_META[action.type] ?? { Icon: Sparkles, label: action.type, color: '#9494B8' };
  const { Icon, label, color } = meta;

  const statusColor =
    action.status === 'done'      ? '#00F5A0' :
    action.status === 'failed'    ? '#FF4D6D' :
    action.status === 'executing' ? '#FBBF24' :
    action.status === 'rejected'  ? '#FF4D6D' : '#5C5C7A';

  const hasDiff = action.type === 'edit_file' && !!action.diff;

  return (
    <div
      className="flex items-start gap-2 rounded-lg px-3 py-2 mt-2 transition-colors duration-100"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center mt-0.5" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
        <Icon className="w-3 h-3" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-xs font-medium" style={{ color }}>{label}</span>
          {action.status !== 'pending' && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ background: `${statusColor}18`, color: statusColor, fontSize: '10px' }}>
              {action.status}
            </span>
          )}
          {action.requiresConfirmation && action.status === 'pending' && (
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(251,191,36,0.12)', color: '#FBBF24', fontSize: '10px' }}>
              needs approval
            </span>
          )}
        </div>

        {action.path && (
          <p className="text-xs truncate mb-0.5" style={{ color: '#9494B8', fontFamily: 'var(--font-mono)' }}>{action.path}</p>
        )}
        {action.command && (
          <p className="text-xs truncate mb-0.5" style={{ color: '#9494B8', fontFamily: 'var(--font-mono)' }}>
            $ {action.command} {action.args?.join(' ')}
          </p>
        )}
        <p className="text-xs leading-relaxed" style={{ color: '#5C5C7A' }}>{action.explanation}</p>

        {/* Diff preview toggle */}
        {hasDiff && (
          <button
            type="button"
            onClick={() => setShowDiff((v) => !v)}
            className="mt-1.5 flex items-center gap-1 text-xs transition-colors"
            style={{ color: '#9B6EF5' }}
          >
            <Code2 className="w-3 h-3" />
            {showDiff ? 'Hide diff' : 'View diff'}
            {showDiff ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
        {hasDiff && showDiff && <DiffPreview diff={action.diff!} />}

        {/* Apply / Review */}
        {action.status === 'pending' && action.type !== 'open_pr' && (
          <button
            type="button"
            disabled={isExecuting}
            onClick={() => {
              if (action.requiresConfirmation || DESTRUCTIVE_TYPES.includes(action.type)) {
                onReview(action);
              } else {
                onApply(action);
              }
            }}
            className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: action.requiresConfirmation || DESTRUCTIVE_TYPES.includes(action.type) ? 'rgba(251,191,36,0.1)' : 'rgba(0,245,160,0.1)',
              border: action.requiresConfirmation || DESTRUCTIVE_TYPES.includes(action.type) ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(0,245,160,0.25)',
              color: action.requiresConfirmation || DESTRUCTIVE_TYPES.includes(action.type) ? '#FBBF24' : '#00F5A0',
            }}
          >
            {isExecuting ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> :
              action.requiresConfirmation || DESTRUCTIVE_TYPES.includes(action.type) ? <Eye className="w-2.5 h-2.5" /> :
              <Play className="w-2.5 h-2.5" />}
            {action.requiresConfirmation || DESTRUCTIVE_TYPES.includes(action.type) ? 'Review' : 'Apply'}
          </button>
        )}

        {action.result && (
          <div
            className="mt-1.5 rounded px-2 py-1 text-xs"
            style={{
              background: action.result.success ? 'rgba(0,245,160,0.06)' : 'rgba(255,77,109,0.06)',
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
        <div key={i} className="w-1.5 h-1.5 rounded-full animate-thinking" style={{ background: '#9B6EF5', animationDelay: `${i * 0.18}s` }} />
      ))}
    </div>
  );
}

// ── MessageBubble ─────────────────────────────────────────
function MessageBubble({
  msg, onApply, onReview, executingActionId,
}: {
  msg: AgentMessage;
  onApply: (a: AgentAction) => void;
  onReview: (a: AgentAction) => void;
  executingActionId: string | null;
}) {
  const isUser = msg.role === 'user';

  return (
    <div className={cn('flex gap-2.5 animate-fade-up', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5" style={{ background: 'rgba(155,110,245,0.15)', border: '1px solid rgba(155,110,245,0.2)' }}>
          <Bot className="w-3.5 h-3.5" style={{ color: '#9B6EF5' }} />
        </div>
      )}

      <div className={cn('max-w-[85%] min-w-0', isUser ? 'items-end' : 'items-start')}>
        <div
          className="rounded-xl px-3 py-2.5 text-xs leading-relaxed"
          style={isUser ? {
            background: 'rgba(0,245,160,0.08)',
            border: '1px solid rgba(0,245,160,0.18)',
            color: '#EEEEFF',
          } : {
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: '#C8C8E8',
          }}
        >
          {msg.content ? (
            <pre className="whitespace-pre-wrap break-words" style={{ fontFamily: 'var(--font-body)', fontSize: '12px', lineHeight: '1.6' }}>
              {msg.content}
            </pre>
          ) : msg.role === 'assistant' ? (
            <ThinkingDots />
          ) : null}

          {msg.error && (
            <div className="flex items-start gap-1.5 mt-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#FF4D6D' }} />
              <span style={{ color: '#FF4D6D', fontSize: '11px' }}>{msg.error}</span>
            </div>
          )}
        </div>

        {msg.actions && msg.actions.length > 0 && (
          <div className="mt-1">
            {msg.actions.map((action, idx) => (
              <ActionCard
                key={idx}
                action={action}
                onApply={onApply}
                onReview={onReview}
                isExecuting={executingActionId === `${msg.id}-${idx}`}
              />
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5" style={{ background: 'rgba(0,245,160,0.12)', border: '1px solid rgba(0,245,160,0.2)' }}>
          <User className="w-3.5 h-3.5" style={{ color: '#00F5A0' }} />
        </div>
      )}
    </div>
  );
}

// ── PinnedContextChip ─────────────────────────────────────
function PinnedContextChip({ item, onRemove }: { item: { id: string; label: string; type: string }; onRemove: (id: string) => void }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-full flex-shrink-0"
      style={{ background: 'rgba(155,110,245,0.1)', border: '1px solid rgba(155,110,245,0.2)' }}
    >
      <Pin className="w-2.5 h-2.5" style={{ color: '#9B6EF5' }} />
      <span className="text-xs truncate max-w-[100px]" style={{ color: '#9B6EF5', fontFamily: 'var(--font-mono)' }}>
        {item.label}
      </span>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="flex-shrink-0"
        style={{ color: '#5C5C7A' }}
        aria-label={`Unpin ${item.label}`}
      >
        <X className="w-2.5 h-2.5" />
      </button>
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

  const conversations        = useAppStore((s) => s.conversations);
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const createNewConversation = useAppStore((s) => s.createNewConversation);
  const addMessage           = useAppStore((s) => s.addMessage);
  const updateMessage        = useAppStore((s) => s.updateMessage);
  const updateActionStatus   = useAppStore((s) => s.updateActionStatus);
  const setIsThinking        = useAppStore((s) => s.setIsThinking);
  const isThinking           = useAppStore((s) => s.isThinking);
  const expertMode           = useAppStore((s) => s.expertMode);
  const agentAutonomy        = useAppStore((s) => s.agentAutonomy);
  const setFileTree          = useAppStore((s) => s.setFileTree);
  const pinnedContext        = useAppStore((s) => s.pinnedContext);
  const removePinnedContext  = useAppStore((s) => s.removePinnedContext);

  const fileTree         = useAppStore((s) => s.fileTree);
  const openTabs         = useAppStore((s) => s.openTabs);
  const activeTabId      = useAppStore((s) => s.activeTabId);
  const terminalSessions = useAppStore((s) => s.terminalSessions);
  const activeTerminalId = useAppStore((s) => s.activeTerminalId);

  const [pendingAction, setPendingAction] = useState<{
    action: AgentAction;
    msgId: string;
    actionIdx: number;
  } | null>(null);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const containerRef = useRef<WebContainer | null>(null);

  const reactiveMessages = useAppStore(
    (s) => (s.activeConversationId ? (s.messages[s.activeConversationId] ?? []) : [])
  );

  // Voice input hook
  const { isRecording, isTranscribing, toggleRecording } = useVoiceInput({
    onTranscript: (text) => {
      setInput((prev) => prev + (prev ? ' ' : '') + text);
      textareaRef.current?.focus();
    },
  });

  useEffect(() => {
    if (conversations.length === 0) createNewConversation();
  }, [conversations, createNewConversation]); // Removed eslint-disable-line

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [reactiveMessages, isThinking]);

  useEffect(() => {
    const check = () => {
      const wc = (window as Window & { __yfitops_container?: WebContainer }).__yfitops_container;
      if (wc) containerRef.current = wc;
    };
    check();
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  const refreshTree = useCallback(async () => {
    const wc = containerRef.current;
    if (!wc) return;
    try {
      const tree = await buildFileTree(wc, '/');
      setFileTree(tree);
    } catch (err) {
      console.warn('[AgentChat] Tree refresh failed:', err);
    }
  }, [setFileTree]);

  const runAction = useCallback(async (action: AgentAction, msgId: string, actionIdx: number) => {
    const wc = containerRef.current;
    if (!wc) { toast.error('Workspace not ready'); return; }

    const execKey = `${msgId}-${actionIdx}`;
    setExecutingActionId(execKey);
    updateActionStatus(msgId, actionIdx, 'executing');

    const result = await executeAction(wc, action);
    updateActionStatus(msgId, actionIdx, result.success ? 'done' : 'failed', result);
    setExecutingActionId(null);

    if (result.success) {
      toast.success(result.output ?? 'Action completed');
      if (isFileSystemAction(action.type)) await refreshTree();
    } else {
      toast.error(result.error ?? 'Action failed');
    }
  }, [updateActionStatus, refreshTree]);

  // Auto-execute based on autonomy level (Section A2)
  const SAFE_TYPES: AgentAction['type'][] = ['read_file', 'write_file', 'create_dir', 'search_files'];
  const ALWAYS_CONFIRM: AgentAction['type'][] = ['delete_file', 'open_pr'];

  const shouldAutoExecute = useCallback((action: AgentAction): boolean => {
    if (ALWAYS_CONFIRM.includes(action.type)) return false;
    if (action.requiresConfirmation) return false;
    switch (agentAutonomy) {
      case 'full-auto': return true;
      case 'auto-safe': return SAFE_TYPES.includes(action.type);
      default: return false;
    }
  }, [agentAutonomy]);

  const handleApplyAction = useCallback((action: AgentAction) => {
    const msgs = useAppStore.getState().messages[activeConversationId ?? ''] ?? [];
    for (const msg of msgs) {
      if (!msg.actions) continue;
      const idx = msg.actions.findIndex((a) => a === action);
      if (idx !== -1) { runAction(action, msg.id, idx); return; }
    }
    // If action is not found in current messages, assume it's a new action or from a different context
    // This 'unknown' fallback is a workaround for actions not directly linked to a msg.id/idx from current state.
    // In a production app, you might want to ensure actions are always tied to a message for proper tracking.
    // For now, this ensures `runAction` can still be called.
    runAction(action, 'unknown', 0);
  }, [activeConversationId, runAction]);

  const handleReviewAction = useCallback((action: AgentAction) => {
    const msgs = useAppStore.getState().messages[activeConversationId ?? ''] ?? [];
    for (const msg of msgs) {
      if (!msg.actions) continue;
      const idx = msg.actions.findIndex((a) => a === action);
      if (idx !== -1) { setPendingAction({ action, msgId: msg.id, actionIdx: idx }); return; }
    }
    // Similar fallback as handleApplyAction for consistency if action not found.
    setPendingAction({ action, msgId: 'unknown', actionIdx: 0 });
  }, [activeConversationId]);

  const buildContext = useCallback(() => {
    const activeTerminal = activeTerminalId ? terminalSessions[activeTerminalId] : null;
    return {
      fileTree: fileTree.slice(0, 80).map((f) => ({ name: f.name, path: f.path, type: f.type })),
      openFiles: openTabs.map((t) => ({ path: t.path, language: t.language })),
      activeFile: openTabs.find((t) => t.id === activeTabId)?.path ?? null,
      terminalOutput: activeTerminal?.output?.slice(-30) ?? [],
      expertMode,
      // Section C5: pinned context
      pinnedContext: pinnedContext.map((p) => ({ label: p.label, content: p.content, type: p.type })),
    };
  }, [fileTree, openTabs, activeTabId, terminalSessions, activeTerminalId, expertMode, pinnedContext]);

  // Detect /review slash command (Section C2)
  const buildSystemOverride = useCallback((text: string): string | null => {
    if (text.startsWith('/review ')) {
      return 'CODE_REVIEW_MODE';
    }
    return null;
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isThinking || sendInFlightRef.current) return;
    if (!activeConversationId) return;

    sendInFlightRef.current = true;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('You must be logged in to use the agent');
      sendInFlightRef.current = false;
      return;
    }

    const userMsg: AgentMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      actions: [],
    };
    addMessage(activeConversationId, userMsg);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

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
      const storeMessages = useAppStore.getState().messages[activeConversationId] ?? [];
      const history = storeMessages
        .filter((m) => m.id !== assistantId)
        .map((m) => ({ role: m.role, content: m.content }));

      const slashMode = buildSystemOverride(text);
      const ctx = buildContext();

      const { data, error } = await supabase.functions.invoke('agent-inference', {
        body: {
          messages: history,
          context: ctx,
          expertMode,
          slashCommand: slashMode,
        },
      });

      if (error) {
        let errorMessage = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const statusCode = error.context?.status ?? 500;
            const textContent = await error.context?.text();
            errorMessage = `[${statusCode}] ${textContent || error.message}`;
          } catch { /* ignore */ }
        }
        throw new Error(errorMessage);
      }

      const response = data as AgentResponse;

      updateMessage(activeConversationId, assistantId, {
        content: response.final ?? 'No response',
        actions: response.actions ?? [],
        isStreaming: false,
      });

      // Auto-execute safe actions based on autonomy level (Section A2)
      if (response.actions && agentAutonomy !== 'ask') {
        for (let idx = 0; idx < response.actions.length; idx++) {
          const action = response.actions[idx];
          if (shouldAutoExecute(action)) {
            // Small delay between auto-executions
            await new Promise((r) => setTimeout(r, 300 * idx));
            await runAction(action as AgentAction, assistantId, idx);
          }
        }
      }
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
    buildContext, expertMode, agentAutonomy, shouldAutoExecute, runAction, buildSystemOverride,
  ]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }, [handleSend]);

  const isEmpty = reactiveMessages.length === 0;

  return (
    <div className="flex flex-col h-full" style={{ background: '#09090F' }}>
      {/* Pinned context chips */}
      {pinnedContext.length > 0 && (
        <div
          className="flex-shrink-0 flex items-center gap-2 px-3 py-2 overflow-x-auto"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', scrollbarWidth: 'thin' }}
        >
          <Pin className="w-3 h-3 flex-shrink-0" style={{ color: '#9B6EF5' }} />
          {pinnedContext.map((item) => (
            <PinnedContextChip key={item.id} item={item} onRemove={removePinnedContext} />
          ))}
        </div>
      )}

      {/* Autonomy indicator */}
      {agentAutonomy !== 'ask' && (
        <div
          className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(251,191,36,0.04)' }}
        >
          <Sparkles className="w-3 h-3" style={{ color: '#FBBF24' }} />
          <span className="text-xs" style={{ color: '#FBBF24' }}>
            {agentAutonomy === 'full-auto' ? 'Full Auto — all actions execute automatically' : 'Auto-Safe — safe actions execute automatically'}
          </span>
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A35 transparent' }}
        aria-live="polite"
        aria-label="Chat messages"
      >
        {isEmpty && !isThinking && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(155,110,245,0.1)', border: '1px solid rgba(155,110,245,0.2)' }}>
              <Bot className="w-6 h-6" style={{ color: '#9B6EF5' }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: '#5C5C7A', fontFamily: 'var(--font-display)' }}>YFitOps AI Agent</p>
            <p className="text-xs leading-relaxed max-w-[200px]" style={{ color: '#3A3A52' }}>
              Ask about your code, request edits, or run commands.{'\n'}Try <code style={{ color: '#9B6EF5' }}>/review src/App.tsx</code> for a code review.
            </p>
          </div>
        )}

        {reactiveMessages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onApply={handleApplyAction}
            onReview={handleReviewAction}
            executingActionId={executingActionId}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{ background: '#13131C', border: `1px solid ${isRecording ? 'rgba(255,77,109,0.3)' : 'rgba(255,255,255,0.07)'}` }}
        >
          {/* Voice button */}
          <button
            type="button"
            onClick={toggleRecording}
            disabled={isTranscribing}
            className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-md transition-all duration-150 disabled:opacity-40"
            style={{
              background: isRecording ? 'rgba(255,77,109,0.15)' : 'transparent',
              color: isRecording ? '#FF4D6D' : '#3A3A52',
            }}
            aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
            title={isRecording ? 'Stop recording' : 'Voice input (Whisper)'}
          >
            {isTranscribing ? <Loader2 className="w-3 h-3 animate-spin" /> :
              isRecording ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording ? '🔴 Recording…' :
              isTranscribing ? 'Transcribing…' :
              isThinking ? 'Agent is thinking…' :
              'Ask the agent… (/review file.ts for code review)'
            }
            rows={1}
            disabled={isThinking || isTranscribing}
            className="flex-1 bg-transparent text-xs outline-none resize-none leading-relaxed"
            style={{ color: '#EEEEFF', fontFamily: 'var(--font-body)', minHeight: '20px', maxHeight: '120px', overflow: 'auto' }}
            aria-label="Chat input"
            aria-multiline="true"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!input.trim() || isThinking}
            className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: input.trim() && !isThinking ? 'rgba(0,245,160,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${input.trim() && !isThinking ? 'rgba(0,245,160,0.3)' : 'rgba(255,255,255,0.06)'}`,
              color: input.trim() && !isThinking ? '#00F5A0' : '#3A3A52',
            }}
            aria-label="Send message"
          >
            {isThinking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3 h-3" />}
          </button>
        </div>
        <p className="text-center mt-1" style={{ color: '#2A2A35', fontSize: '10px' }}>
          Enter to send · Shift+Enter for newline · /review for code review
        </p>
      </div>

      {/* Confirmation modal */}
      <ConfirmModal
        open={!!pendingAction}
        title={`Confirm: ${pendingAction?.action.type.replace(/_/g, ' ')}`}
        description={pendingAction ? `${pendingAction.action.explanation}${pendingAction.action.path ? ` — ${pendingAction.action.path}` : ''}${pendingAction.action.command ? ` — $ ${pendingAction.action.command} ${pendingAction.action.args?.join(' ') ?? ''}` : ''}` : ''}
        detail={pendingAction?.action.content?.slice(0, 400)}
        isDestructive={DESTRUCTIVE_TYPES.includes(pendingAction?.action.type ?? 'read_file')}
        onConfirm={() => {
          if (pendingAction) {
            void runAction(pendingAction.action, pendingAction.msgId, pendingAction.actionIdx);
            setPendingAction(null);
          }
        }}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}

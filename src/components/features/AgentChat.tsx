// ─────────────────────────────────────────────────────────
// AgentChat — multi-model selector, SSE streaming,
//             voice input, pinned context, /slash commands
// ─────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  Send, Bot, Mic, MicOff, Pin, X,
  ChevronDown, ChevronRight, Zap, Sparkles,
  Loader2, Square,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AgentAction } from '@/types/agent.types';
import { executeAction, isFileSystemAction } from '@/agent/executeAction';
import { buildFileTree } from '@/core/webcontainer/fs';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { AgentMessageBubble } from '@/components/features/AgentMessage';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useStreamingAgent } from '@/hooks/useStreamingAgent';
import {
  ALL_MODELS, getModelsByProvider, getModelById,
  PROVIDERS, DEFAULT_MODEL_ID,
} from '@/types/models';
import type { WebContainer } from '@webcontainer/api';

// ═══════════════════════════════════════════════════════════
// ModelSelector
// ═══════════════════════════════════════════════════════════
function ModelSelector() {
  const selectedModelId = useAppStore((s) => s.selectedModelId) ?? DEFAULT_MODEL_ID;
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentModel = getModelById(selectedModelId) ?? ALL_MODELS[0];
  const byProvider   = getModelsByProvider();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all duration-150"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border:     '1px solid rgba(255,255,255,0.08)',
          color:      '#9494B8',
        }}
        title="Switch AI model"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: PROVIDERS[currentModel.provider].color }}
        />
        <span className="max-w-[120px] truncate" style={{ color: '#C8C8E8' }}>
          {currentModel.label}
        </span>
        {currentModel.badge && (
          <span
            className="px-1 py-0.5 rounded text-[9px] font-semibold flex-shrink-0"
            style={{ background: `${currentModel.badgeColor}20`, color: currentModel.badgeColor }}
          >
            {currentModel.badge}
          </span>
        )}
        <ChevronDown className={cn('w-3 h-3 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className="absolute bottom-full mb-1 left-0 z-50 rounded-xl overflow-hidden shadow-2xl"
          style={{
            background: '#111118',
            border:     '1px solid rgba(255,255,255,0.08)',
            width:      '320px',
            maxHeight:  '400px',
            overflowY:  'auto',
          }}
          role="listbox"
          aria-label="Select AI model"
        >
          <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs font-semibold" style={{ color: '#5C5C7A' }}>AI MODEL</p>
          </div>

          {(Object.entries(byProvider) as [string, typeof ALL_MODELS[number]][]).map(([providerId, models]) => {
            const provider = PROVIDERS[providerId as keyof typeof PROVIDERS];
            if (!provider) return null;
            return (
              <div key={providerId}>
                <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: provider.color }} />
                  <span className="text-xs font-medium" style={{ color: '#5C5C7A' }}>{provider.label}</span>
                </div>

                {models.map((model) => {
                  const isSelected = model.id === selectedModelId;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSelectedModel(model.id);
                        setOpen(false);
                        toast.success(`Switched to ${model.label}`, { description: model.description, duration: 2500 });
                      }}
                      className="w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors duration-100"
                      style={{
                        background:  isSelected ? 'rgba(0,245,160,0.05)' : 'transparent',
                        borderLeft:  isSelected ? '2px solid #00F5A0'    : '2px solid transparent',
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium" style={{ color: isSelected ? '#00F5A0' : '#EEEEFF' }}>
                            {model.label}
                          </span>
                          {model.badge && (
                            <span className="px-1 py-0.5 rounded text-[9px] font-semibold"
                              style={{ background: `${model.badgeColor}20`, color: model.badgeColor }}>
                              {model.badge}
                            </span>
                          )}
                          {model.contextWindow && (
                            <span className="text-[9px]" style={{ color: '#3A3A52' }}>
                              {model.contextWindow} ctx
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: '#5C5C7A' }}>
                          {model.description}
                        </p>
                        {model.speed === 'blazing' && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Zap className="w-2.5 h-2.5" style={{ color: '#FBBF24' }} />
                            <span className="text-[10px]" style={{ color: '#FBBF24' }}>Blazing fast</span>
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#00F5A0' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}

          <div className="px-3 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[10px]" style={{ color: '#3A3A52' }}>
              Add API keys in Supabase → Project Settings → Edge Functions → Secrets
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PinnedContextChip ─────────────────────────────────────
function PinnedContextChip({ item, onRemove }: {
  item: { id: string; label: string; type: string };
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-full flex-shrink-0"
      style={{ background: 'rgba(155,110,245,0.1)', border: '1px solid rgba(155,110,245,0.2)' }}
    >
      <Pin className="w-2.5 h-2.5" style={{ color: '#9B6EF5' }} />
      <span className="text-xs truncate max-w-[100px]" style={{ color: '#9B6EF5', fontFamily: 'var(--font-mono)' }}>
        {item.label}
      </span>
      <button type="button" onClick={() => onRemove(item.id)} style={{ color: '#5C5C7A' }} aria-label={`Unpin ${item.label}`}>
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// AgentChat — main component
// ═══════════════════════════════════════════════════════════
export function AgentChat() {
  const [input, setInput] = useState('');
  const messagesEndRef   = useRef<HTMLDivElement>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);

  const conversations         = useAppStore((s) => s.conversations);
  const activeConversationId  = useAppStore((s) => s.activeConversationId);
  const createNewConversation = useAppStore((s) => s.createNewConversation);
  const updateActionStatus    = useAppStore((s) => s.updateActionStatus);
  const isThinking            = useAppStore((s) => s.isThinking);
  const streamingMessageId    = useAppStore((s) => s.streamingMessageId);
  const expertMode            = useAppStore((s) => s.expertMode);
  const agentAutonomy         = useAppStore((s) => s.agentAutonomy);
  const selectedModelId       = useAppStore((s) => s.selectedModelId) ?? DEFAULT_MODEL_ID;
  const setFileTree           = useAppStore((s) => s.setFileTree);
  const pinnedContext         = useAppStore((s) => s.pinnedContext);
  const removePinnedContext   = useAppStore((s) => s.removePinnedContext);

  const fileTree         = useAppStore((s) => s.fileTree);
  const openTabs         = useAppStore((s) => s.openTabs);
  const activeTabId      = useAppStore((s) => s.activeTabId);
  const terminalSessions = useAppStore((s) => s.terminalSessions);
  const activeTerminalId = useAppStore((s) => s.activeTerminalId);

  const reactiveMessages = useAppStore(
    (s) => s.activeConversationId ? (s.messages[s.activeConversationId] ?? []) : [],
  );

  const [pendingAction, setPendingAction] = useState<{
    action: AgentAction; msgId: string; actionIdx: number;
  } | null>(null);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const containerRef = useRef<WebContainer | null>(null);

  const { sendMessage, cancelStream } = useStreamingAgent();

  const { isRecording, isTranscribing, toggleRecording } = useVoiceInput({
    onTranscript: (text) => {
      setInput((prev) => prev + (prev ? ' ' : '') + text);
      textareaRef.current?.focus();
    },
  });

  // Bootstrap conversation
  useEffect(() => {
    if (conversations.length === 0) createNewConversation();
  }, [conversations, createNewConversation]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [reactiveMessages, isThinking]);

  // Acquire WebContainer reference
  useEffect(() => {
    const check = () => {
      const wc = (window as Window & { __yfitops_container?: WebContainer }).__yfitops_container;
      if (wc) containerRef.current = wc;
    };
    check();
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, []);

  // Auto-resize textarea
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

  const SAFE_TYPES:        AgentAction['type'][] = ['read_file', 'write_file', 'create_dir', 'search_files'];
  const ALWAYS_CONFIRM:    AgentAction['type'][] = ['delete_file', 'open_pr'];

  const shouldAutoExecute = useCallback((action: AgentAction): boolean => {
    if (ALWAYS_CONFIRM.includes(action.type)) return false;
    if (action.requiresConfirmation) return false;
    if (agentAutonomy === 'full-auto') return true;
    if (agentAutonomy === 'auto-safe') return SAFE_TYPES.includes(action.type);
    return false;
  }, [agentAutonomy]);

  const handleApplyAction = useCallback((action: AgentAction) => {
    const msgs = useAppStore.getState().messages[activeConversationId ?? ''] ?? [];
    for (const msg of msgs) {
      if (!msg.actions) continue;
      const idx = msg.actions.findIndex((a) => a === action);
      if (idx !== -1) { void runAction(action, msg.id, idx); return; }
    }
    void runAction(action, 'unknown', 0);
  }, [activeConversationId, runAction]);

  const handleReviewAction = useCallback((action: AgentAction) => {
    const msgs = useAppStore.getState().messages[activeConversationId ?? ''] ?? [];
    for (const msg of msgs) {
      if (!msg.actions) continue;
      const idx = msg.actions.findIndex((a) => a === action);
      if (idx !== -1) { setPendingAction({ action, msgId: msg.id, actionIdx: idx }); return; }
    }
    setPendingAction({ action, msgId: 'unknown', actionIdx: 0 });
  }, [activeConversationId]);

  const buildContext = useCallback(() => {
    const activeTerminal = activeTerminalId ? terminalSessions[activeTerminalId] : null;
    return {
      fileTree:       fileTree.slice(0, 80).map((f) => ({ name: f.name, path: f.path, type: f.type })),
      openFiles:      openTabs.map((t) => t.path),
      activeFile:     openTabs.find((t) => t.id === activeTabId)?.path ?? null,
      terminalOutput: activeTerminal?.output?.slice(-30).join('\n') ?? '',
      expertMode,
      pinnedContext:  pinnedContext.map((p) => ({ label: p.label, content: p.content, type: p.type })),
    };
  }, [fileTree, openTabs, activeTabId, terminalSessions, activeTerminalId, expertMode, pinnedContext]);

  const buildSlashCommand = useCallback((text: string): string | null => {
    if (text.startsWith('/review '))  return 'CODE_REVIEW_MODE';
    if (text.startsWith('/explain ')) return 'EXPLAIN_MODE';
    if (text.startsWith('/test '))    return 'TEST_MODE';
    return null;
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isThinking) return;
    if (!activeConversationId) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    await sendMessage({
      text,
      conversationId:  activeConversationId,
      context:         buildContext() as Record<string, unknown>,
      expertMode,
      selectedModelId,
      slashCommand:    buildSlashCommand(text),
      onDone: async () => {
        // Auto-execute safe actions when stream completes
        if (agentAutonomy === 'ask') return;
        const msgs = useAppStore.getState().messages[activeConversationId] ?? [];
        const lastAssistant = [...msgs].reverse().find((m) => m.role === 'assistant');
        if (!lastAssistant?.actions) return;
        for (let idx = 0; idx < lastAssistant.actions.length; idx++) {
          const action = lastAssistant.actions[idx];
          if (shouldAutoExecute(action)) {
            await new Promise((r) => setTimeout(r, 300 * idx));
            await runAction(action, lastAssistant.id, idx);
          }
        }
      },
    });
  }, [
    input, isThinking, activeConversationId, selectedModelId,
    expertMode, agentAutonomy, shouldAutoExecute, runAction,
    sendMessage, buildContext, buildSlashCommand,
  ]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }, [handleSend]);

  const isEmpty       = reactiveMessages.length === 0;
  const currentModel  = getModelById(selectedModelId);
  // Check if we should verify session — only used for non-streaming path fallback
  void supabase; // keep import alive

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

      {/* Autonomy banner */}
      {agentAutonomy !== 'ask' && (
        <div
          className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(251,191,36,0.04)' }}
        >
          <Sparkles className="w-3 h-3" style={{ color: '#FBBF24' }} />
          <span className="text-xs" style={{ color: '#FBBF24' }}>
            {agentAutonomy === 'full-auto'
              ? 'Full Auto — all actions execute automatically'
              : 'Auto-Safe — safe actions execute automatically'}
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
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'rgba(155,110,245,0.1)', border: '1px solid rgba(155,110,245,0.2)' }}
            >
              <Bot className="w-6 h-6" style={{ color: '#9B6EF5' }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: '#5C5C7A' }}>YFitOps AI Agent</p>
            <p className="text-xs leading-relaxed max-w-[200px]" style={{ color: '#3A3A52' }}>
              Ask about your code, request edits, or run commands.
              Try{' '}
              <code style={{ color: '#9B6EF5' }}>/review file.ts</code>,{' '}
              <code style={{ color: '#9B6EF5' }}>/explain</code>, or{' '}
              <code style={{ color: '#9B6EF5' }}>/test</code>.
            </p>
          </div>
        )}

        {reactiveMessages.map((msg) => (
          <AgentMessageBubble
            key={msg.id}
            msg={msg}
            isCurrentlyStreaming={msg.id === streamingMessageId}
            onApply={handleApplyAction}
            onReview={handleReviewAction}
            executingActionId={executingActionId}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 p-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Toolbar row: model selector + speed badge */}
        <div className="flex items-center justify-between mb-1.5 gap-2">
          <ModelSelector />
          <div className="flex items-center gap-2">
            {currentModel?.speed === 'blazing' && (
              <span className="text-[10px] flex items-center gap-0.5" style={{ color: '#FBBF24' }}>
                <Zap className="w-2.5 h-2.5" /> Blazing fast
              </span>
            )}
            {/* Cancel stream button — shown only while streaming */}
            {isThinking && (
              <button
                type="button"
                onClick={cancelStream}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors duration-150"
                style={{
                  background: 'rgba(255,77,109,0.1)',
                  border:     '1px solid rgba(255,77,109,0.25)',
                  color:      '#FF4D6D',
                }}
                aria-label="Cancel streaming response"
              >
                <Square className="w-2.5 h-2.5" />
                Stop
              </button>
            )}
          </div>
        </div>

        {/* Input row */}
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{
            background: '#13131C',
            border: `1px solid ${isRecording ? 'rgba(255,77,109,0.3)' : 'rgba(255,255,255,0.07)'}`,
          }}
        >
          {/* Mic button */}
          <button
            type="button"
            onClick={toggleRecording}
            disabled={isTranscribing}
            className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-md transition-all duration-150 disabled:opacity-40"
            style={{
              background: isRecording ? 'rgba(255,77,109,0.15)' : 'transparent',
              color:      isRecording ? '#FF4D6D' : '#3A3A52',
            }}
            aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
          >
            {isTranscribing
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : isRecording
                ? <MicOff className="w-3 h-3" />
                : <Mic className="w-3 h-3" />}
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording    ? '🔴 Recording…' :
              isTranscribing ? 'Transcribing…' :
              isThinking     ? `${currentModel?.label ?? 'Agent'} thinking…` :
              'Ask the agent… (/review /explain /test)'
            }
            rows={1}
            disabled={isThinking || isTranscribing}
            className="flex-1 bg-transparent text-xs outline-none resize-none leading-relaxed"
            style={{
              color:      '#EEEEFF',
              fontFamily: 'var(--font-body)',
              minHeight:  '20px',
              maxHeight:  '120px',
              overflow:   'auto',
            }}
            aria-label="Chat input"
          />

          {/* Send button */}
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!input.trim() || isThinking}
            className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: input.trim() && !isThinking ? 'rgba(0,245,160,0.15)'        : 'rgba(255,255,255,0.04)',
              border:     input.trim() && !isThinking ? '1px solid rgba(0,245,160,0.3)' : '1px solid rgba(255,255,255,0.06)',
              color:      input.trim() && !isThinking ? '#00F5A0'                       : '#3A3A52',
            }}
            aria-label="Send message"
          >
            {isThinking
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3 h-3" />}
          </button>
        </div>

        <p className="text-center mt-1" style={{ color: '#2A2A35', fontSize: '10px' }}>
          Enter to send · Shift+Enter for newline · /review /explain /test
        </p>
      </div>

      {/* Confirmation modal */}
      <ConfirmModal
        open={!!pendingAction}
        title={`Confirm: ${pendingAction?.action.type.replace(/_/g, ' ')}`}
        description={pendingAction
          ? `${pendingAction.action.explanation}${pendingAction.action.path ? ` — ${pendingAction.action.path}` : ''}`
          : ''}
        detail={pendingAction?.action.content?.slice(0, 400)}
        isDestructive={['delete_file', 'open_pr'].includes(pendingAction?.action.type ?? '')}
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

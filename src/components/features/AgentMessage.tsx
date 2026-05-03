// ─────────────────────────────────────────────────────────
// AgentMessage — renders a single chat message bubble
// with live streaming cursor while isStreaming is true.
// ─────────────────────────────────────────────────────────

import { useState } from 'react';
import {
  Bot, User, AlertCircle,
  FileText, FilePlus, FileEdit, Trash2, FolderPlus,
  Terminal, Search, GitPullRequest, Sparkles,
  Play, Eye, Loader2, Code2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiffPreview } from '@/components/features/DiffPreview';
import type { AgentAction, AgentMessage } from '@/types/agent.types';

// ── Action meta map ────────────────────────────────────────
const ACTION_META: Record<string, { Icon: React.ElementType; label: string; color: string }> = {
  read_file:    { Icon: FileText,       label: 'Read file',   color: '#38BDF8' },
  write_file:   { Icon: FilePlus,       label: 'Write file',  color: '#00F5A0' },
  edit_file:    { Icon: FileEdit,       label: 'Edit file',   color: '#9B6EF5' },
  delete_file:  { Icon: Trash2,         label: 'Delete file', color: '#FF4D6D' },
  create_dir:   { Icon: FolderPlus,     label: 'Create dir',  color: '#FBBF24' },
  run_command:  { Icon: Terminal,       label: 'Run command', color: '#22D3EE' },
  search_files: { Icon: Search,         label: 'Search',      color: '#38BDF8' },
  open_pr:      { Icon: GitPullRequest, label: 'Open PR',     color: '#00F5A0' },
};

const DESTRUCTIVE_TYPES: AgentAction['type'][] = ['delete_file', 'open_pr'];

// ── StreamingCursor ────────────────────────────────────────
// Blinking block cursor that appears at the end of streaming text.
function StreamingCursor() {
  return (
    <span
      className="inline-block w-[2px] h-[1em] ml-[1px] align-middle"
      style={{
        background: '#00F5A0',
        animation: 'streaming-cursor-blink 1s step-end infinite',
        verticalAlign: 'text-bottom',
      }}
      aria-hidden="true"
    />
  );
}

// ── ThinkingDots ───────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1" aria-label="Agent thinking">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: '#9B6EF5',
            animation: `thinking-bounce 1.2s ease-in-out ${i * 0.18}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ── ActionCard ─────────────────────────────────────────────
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

  const hasDiff    = action.type === 'edit_file' && !!action.diff;
  const needsConfirm = action.requiresConfirmation || DESTRUCTIVE_TYPES.includes(action.type);

  return (
    <div
      className="flex items-start gap-2 rounded-lg px-3 py-2 mt-2 transition-colors duration-100"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div
        className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center mt-0.5"
        style={{ background: `${color}15`, border: `1px solid ${color}30` }}
      >
        <Icon className="w-3 h-3" style={{ color }} />
      </div>

      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-xs font-medium" style={{ color }}>{label}</span>
          {action.status !== 'pending' && (
            <span
              className="px-1.5 py-0.5 rounded"
              style={{
                background: `${statusColor}18`, color: statusColor,
                fontSize: '10px', fontWeight: 600,
              }}
            >
              {action.status}
            </span>
          )}
          {action.requiresConfirmation && action.status === 'pending' && (
            <span className="px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(251,191,36,0.12)', color: '#FBBF24', fontSize: '10px' }}>
              needs approval
            </span>
          )}
        </div>

        {/* Path / command */}
        {action.path && (
          <p className="text-xs truncate mb-0.5"
            style={{ color: '#9494B8', fontFamily: 'var(--font-mono)' }}>
            {action.path}
          </p>
        )}
        {action.command && (
          <p className="text-xs truncate mb-0.5"
            style={{ color: '#9494B8', fontFamily: 'var(--font-mono)' }}>
            $ {action.command} {action.args?.join(' ')}
          </p>
        )}

        {/* Explanation */}
        <p className="text-xs leading-relaxed" style={{ color: '#5C5C7A' }}>
          {action.explanation}
        </p>

        {/* Diff toggle */}
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

        {/* Apply / Review button */}
        {action.status === 'pending' && action.type !== 'open_pr' && (
          <button
            type="button"
            disabled={isExecuting}
            onClick={() => needsConfirm ? onReview(action) : onApply(action)}
            className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: needsConfirm ? 'rgba(251,191,36,0.10)' : 'rgba(0,245,160,0.10)',
              border: needsConfirm ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(0,245,160,0.25)',
              color: needsConfirm ? '#FBBF24' : '#00F5A0',
            }}
          >
            {isExecuting
              ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
              : needsConfirm
                ? <Eye className="w-2.5 h-2.5" />
                : <Play className="w-2.5 h-2.5" />}
            {needsConfirm ? 'Review' : 'Apply'}
          </button>
        )}

        {/* Result */}
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

// ═══════════════════════════════════════════════════════════
// AgentMessageBubble — exported component
// ═══════════════════════════════════════════════════════════
interface AgentMessageBubbleProps {
  msg: AgentMessage;
  isCurrentlyStreaming?: boolean; // true only for the active streaming message
  onApply: (a: AgentAction) => void;
  onReview: (a: AgentAction) => void;
  executingActionId: string | null;
}

export function AgentMessageBubble({
  msg, isCurrentlyStreaming = false, onApply, onReview, executingActionId,
}: AgentMessageBubbleProps) {
  const isUser = msg.role === 'user';

  return (
    <div className={cn('flex gap-2.5 animate-fade-up', isUser ? 'justify-end' : 'justify-start')}>
      {/* Assistant avatar */}
      {!isUser && (
        <div
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
          style={{
            background: 'rgba(155,110,245,0.15)',
            border: '1px solid rgba(155,110,245,0.2)',
          }}
        >
          <Bot className="w-3.5 h-3.5" style={{ color: '#9B6EF5' }} />
        </div>
      )}

      <div className={cn('max-w-[85%] min-w-0', isUser ? 'items-end' : 'items-start')}>
        {/* Bubble */}
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
          {/* Content */}
          {msg.content ? (
            <span>
              <pre
                className="whitespace-pre-wrap break-words"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  lineHeight: '1.6',
                  display: 'inline',
                }}
              >
                {msg.content}
              </pre>
              {/* Blinking cursor while streaming */}
              {isCurrentlyStreaming && <StreamingCursor />}
            </span>
          ) : isCurrentlyStreaming ? (
            <ThinkingDots />
          ) : msg.role === 'assistant' && !msg.error ? (
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

        {/* Action cards — only shown after streaming completes */}
        {!isCurrentlyStreaming && msg.actions && msg.actions.length > 0 && (
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

      {/* User avatar */}
      {isUser && (
        <div
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
          style={{
            background: 'rgba(0,245,160,0.12)',
            border: '1px solid rgba(0,245,160,0.2)',
          }}
        >
          <User className="w-3.5 h-3.5" style={{ color: '#00F5A0' }} />
        </div>
      )}
    </div>
  );
}

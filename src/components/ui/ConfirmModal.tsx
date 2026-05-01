// ─────────────────────────────────────────────────────────
// ConfirmModal — Phase 7
//
// Generic confirmation dialog for agent actions that
// requiresConfirmation === true.
//
// Destructive variant: red accents for delete_file / risky commands.
// Approve variant: mint accents for safe-but-explicit operations.
//
// Design: glassmorphism card over a blurred backdrop.
// Focus is trapped inside; Escape cancels.
// ─────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Props ─────────────────────────────────────────────────
export interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  /** Details block shown in a monospace code-like box */
  detail?: string;
  isDestructive?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  detail,
  isDestructive = false,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // ── Auto-focus the confirm button when opened ─────────
  useEffect(() => {
    if (open) {
      // Small delay for animation
      const t = setTimeout(() => confirmBtnRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ── Escape key closes the modal ───────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  const Icon = isDestructive ? AlertTriangle : CheckCircle2;
  const iconColor = isDestructive ? '#FF4D6D' : '#00F5A0';
  const confirmColor = isDestructive
    ? { bg: 'rgba(255,77,109,0.12)', border: 'rgba(255,77,109,0.3)', text: '#FF4D6D', hover: 'rgba(255,77,109,0.22)' }
    : { bg: 'rgba(0,245,160,0.1)',  border: 'rgba(0,245,160,0.28)', text: '#00F5A0', hover: 'rgba(0,245,160,0.18)' };

  const resolvedConfirmLabel = confirmLabel ?? (isDestructive ? 'Confirm' : 'Approve');

  return (
    /* Backdrop */
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* Card */}
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(13,13,20,0.97)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: `0 24px 64px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-start gap-3 p-5 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
            style={{
              background: `${iconColor}12`,
              border: `1px solid ${iconColor}25`,
            }}
          >
            <Icon className="w-4.5 h-4.5" style={{ color: iconColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2
              id="confirm-modal-title"
              className="text-sm font-semibold leading-snug"
              style={{ color: '#EEEEFF', fontFamily: 'var(--font-display)' }}
            >
              {title}
            </h2>
            <p
              className="text-xs leading-relaxed mt-1"
              style={{ color: '#7A7A99' }}
            >
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 hover:bg-white/5"
            style={{ color: '#5C5C7A' }}
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Detail block */}
        {detail && (
          <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <pre
              className="text-xs leading-relaxed rounded-lg px-3 py-2.5 overflow-x-auto"
              style={{
                fontFamily: 'var(--font-mono)',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: '#9494B8',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '120px',
                overflowY: 'auto',
              }}
            >
              {detail}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 p-4">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-medium transition-colors duration-150',
            )}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#7A7A99',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
            }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors duration-150"
            style={{
              background: confirmColor.bg,
              border: `1px solid ${confirmColor.border}`,
              color: confirmColor.text,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = confirmColor.hover;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = confirmColor.bg;
            }}
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

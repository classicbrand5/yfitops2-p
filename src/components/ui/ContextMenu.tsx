// ─────────────────────────────────────────────────────────
// ContextMenu — Phase 8: Polish & Completion
//
// Glassmorphism right-click context menu rendered at the
// cursor position. Closes on click-outside, Escape, or
// scroll. Teleported to document.body via a portal.
// ─────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ContextMenuItem {
  id: string;
  label: string;
  Icon?: LucideIcon;
  color?: string;
  disabled?: boolean;
  separator?: boolean;
  action: () => void;
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}

interface ContextMenuProps {
  open: boolean;
  position: ContextMenuPosition;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ open, position, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click-outside
  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleScroll = () => onClose();

    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, onClose]);

  // Clamp position to viewport
  useEffect(() => {
    if (!open || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const el = menuRef.current;

    if (rect.right > vw) {
      el.style.left = `${Math.max(0, position.x - rect.width)}px`;
    }
    if (rect.bottom > vh) {
      el.style.top = `${Math.max(0, position.y - rect.height)}px`;
    }
  }, [open, position]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[300] py-1 rounded-xl overflow-hidden min-w-[160px]"
      style={{
        left: position.x,
        top: position.y,
        background: 'rgba(13,13,20,0.98)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.04)',
        backdropFilter: 'blur(16px)',
        fontFamily: 'var(--font-body)',
      }}
      role="menu"
      aria-label="Context menu"
    >
      {items.map((item, idx) => {
        if (item.separator) {
          return (
            <div
              key={`sep-${idx}`}
              className="my-1 mx-2"
              style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }}
              role="separator"
            />
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled}
            onClick={() => {
              if (!item.disabled) {
                item.action();
                onClose();
              }
            }}
            className={cn(
              'flex items-center gap-2.5 w-full px-3 py-2 text-xs text-left transition-colors duration-100',
              item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
            )}
            style={{
              color: item.color ?? '#C8C8E8',
              background: 'transparent',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
            role="menuitem"
          >
            {item.Icon && (
              <item.Icon
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: item.color ?? '#5C5C7A' }}
                aria-hidden="true"
              />
            )}
            {item.label}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}

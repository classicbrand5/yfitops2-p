// ─────────────────────────────────────────────────────────
// PanelShell — Generic IDE panel wrapper
// Provides consistent header, title, icon, action buttons,
// and focus ring for each panel in the workspace grid.
// ─────────────────────────────────────────────────────────

import { useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { PanelId } from '@/types/dev.types';

interface PanelShellProps {
  panelId: PanelId;
  title: string;
  Icon: React.ElementType;
  iconColor?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PanelShell({
  panelId,
  title,
  Icon,
  iconColor = '#5C5C7A',
  actions,
  children,
  className = '',
}: PanelShellProps) {
  const { focusedPanel, setFocusedPanel } = useAppStore();
  const isFocused = focusedPanel === panelId;

  const handleFocus = useCallback(() => {
    setFocusedPanel(panelId);
  }, [panelId, setFocusedPanel]);

  return (
    <div
      className={`flex flex-col h-full overflow-hidden ${className}`}
      style={{
        background: '#0F0F17',
        border: `1px solid ${isFocused ? 'rgba(0,245,160,0.18)' : 'rgba(255,255,255,0.05)'}`,
        borderRadius: '8px',
        transition: 'border-color 200ms',
        boxShadow: isFocused ? '0 0 0 1px rgba(0,245,160,0.08) inset' : 'none',
      }}
      onFocus={handleFocus}
      onMouseDown={handleFocus}
      role="region"
      aria-label={`${title} panel`}
    >
      {/* Panel header */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
        style={{
          background: '#111118',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          minHeight: '36px',
        }}
      >
        <Icon
          className="w-3.5 h-3.5 flex-shrink-0"
          style={{ color: iconColor }}
          aria-hidden="true"
        />
        <span
          className="text-xs font-semibold tracking-wide uppercase flex-1 truncate"
          style={{ color: '#5C5C7A', fontFamily: 'var(--font-body)', letterSpacing: '0.06em' }}
        >
          {title}
        </span>
        {actions && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

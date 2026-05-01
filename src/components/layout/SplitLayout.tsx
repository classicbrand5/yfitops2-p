// ─────────────────────────────────────────────────────────
// SplitLayout — Resizable two-pane split with drag handle
//
// Props:
//   direction   — 'horizontal' | 'vertical'
//   ratio       — initial split ratio (0.0–1.0), stored in global store
//   onRatioChange — callback when drag ends
//   minRatio    — floor clamp (default 0.2)
//   maxRatio    — ceiling clamp (default 0.8)
//   primarySlot — JSX for the first (left/top) pane
//   secondarySlot — JSX for the second (right/bottom) pane
// ─────────────────────────────────────────────────────────

import { useRef, useCallback, useState, useEffect } from 'react';

interface SplitLayoutProps {
  direction?: 'horizontal' | 'vertical';
  ratio?: number;
  onRatioChange?: (ratio: number) => void;
  minRatio?: number;
  maxRatio?: number;
  primarySlot: React.ReactNode;
  secondarySlot: React.ReactNode;
  className?: string;
}

export function SplitLayout({
  direction = 'horizontal',
  ratio = 0.5,
  onRatioChange,
  minRatio = 0.2,
  maxRatio = 0.8,
  primarySlot,
  secondarySlot,
  className = '',
}: SplitLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localRatio, setLocalRatio] = useState(ratio);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ pos: number; ratio: number } | null>(null);

  // Sync external ratio changes (e.g., from store hydration)
  useEffect(() => {
    setLocalRatio(ratio);
  }, [ratio]);

  const clamp = useCallback(
    (v: number) => Math.max(minRatio, Math.min(maxRatio, v)),
    [minRatio, maxRatio]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const pos = direction === 'horizontal' ? e.clientX : e.clientY;
      dragStartRef.current = { pos, ratio: localRatio };
      setIsDragging(true);
    },
    [direction, localRatio]
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !dragStartRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const { pos: startPos, ratio: startRatio } = dragStartRef.current;

      let delta: number;
      let size: number;

      if (direction === 'horizontal') {
        delta = e.clientX - startPos;
        size = rect.width;
      } else {
        delta = e.clientY - startPos;
        size = rect.height;
      }

      if (size === 0) return;

      const newRatio = clamp(startRatio + delta / size);
      setLocalRatio(newRatio);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      onRatioChange?.(localRatio);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, direction, clamp, onRatioChange, localRatio]);

  const isH = direction === 'horizontal';
  const primarySize = `${(localRatio * 100).toFixed(2)}%`;
  const secondarySize = `${((1 - localRatio) * 100).toFixed(2)}%`;

  // Handle styles
  const handleBase: React.CSSProperties = {
    flexShrink: 0,
    position: 'relative',
    zIndex: 10,
    cursor: isH ? 'col-resize' : 'row-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: isDragging ? 'none' : 'background 150ms',
    background: isDragging ? 'rgba(0,245,160,0.08)' : 'transparent',
    ...(isH
      ? { width: '5px', height: '100%' }
      : { height: '5px', width: '100%' }),
  };

  const gripStyle: React.CSSProperties = {
    borderRadius: '2px',
    background: isDragging ? '#00F5A0' : 'rgba(255,255,255,0.12)',
    transition: 'background 150ms',
    ...(isH
      ? { width: '2px', height: '32px' }
      : { height: '2px', width: '32px' }),
  };

  return (
    <div
      ref={containerRef}
      className={`flex ${isH ? 'flex-row' : 'flex-col'} h-full w-full overflow-hidden ${className}`}
      style={{ userSelect: isDragging ? 'none' : undefined }}
    >
      {/* Primary pane */}
      <div
        style={{ [isH ? 'width' : 'height']: primarySize, flexShrink: 0, overflow: 'hidden' }}
        className="relative"
      >
        {primarySlot}
      </div>

      {/* Drag handle */}
      <div
        role="separator"
        aria-orientation={isH ? 'vertical' : 'horizontal'}
        aria-label={`Drag to resize ${isH ? 'left/right' : 'top/bottom'} panels`}
        onMouseDown={onMouseDown}
        style={handleBase}
      >
        <div style={gripStyle} />
        {/* Ghost line during drag */}
        {isDragging && (
          <div
            style={{
              position: 'fixed',
              ...(isH
                ? { top: 0, bottom: 0, width: '1px' }
                : { left: 0, right: 0, height: '1px' }),
              background: 'rgba(0,245,160,0.4)',
              pointerEvents: 'none',
              zIndex: 200,
            }}
          />
        )}
      </div>

      {/* Secondary pane */}
      <div
        style={{ [isH ? 'width' : 'height']: secondarySize, flexShrink: 0, overflow: 'hidden' }}
        className="relative flex-1"
      >
        {secondarySlot}
      </div>
    </div>
  );
}

export default SplitLayout;

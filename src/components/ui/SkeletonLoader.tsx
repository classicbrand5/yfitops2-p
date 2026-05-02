// ─────────────────────────────────────────────────────────
// SkeletonLoader — Section D2
//
// Reusable shimmer skeleton components for async content.
// ─────────────────────────────────────────────────────────

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn('animate-shimmer rounded', className)}
      style={{
        background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.8s infinite',
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

// ── File tree skeleton ────────────────────────────────────
export function FileTreeSkeleton() {
  const rows = [120, 90, 150, 80, 110, 95, 130, 75];
  return (
    <div className="px-3 py-2 space-y-2">
      {rows.map((w, i) => (
        <div key={i} className="flex items-center gap-2" style={{ paddingLeft: i % 3 === 0 ? 0 : i % 3 === 1 ? 16 : 32 }}>
          <Skeleton style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0 }} />
          <Skeleton style={{ width: w, height: 12, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

// ── Message skeleton ──────────────────────────────────────
export function MessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={cn('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && <Skeleton style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />}
      <div className="flex flex-col gap-1.5 max-w-[75%]">
        <Skeleton style={{ height: 12, width: '100%', borderRadius: 4 }} />
        <Skeleton style={{ height: 12, width: '80%', borderRadius: 4 }} />
        <Skeleton style={{ height: 12, width: '60%', borderRadius: 4 }} />
      </div>
      {isUser && <Skeleton style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />}
    </div>
  );
}

// ── Stat card skeleton ────────────────────────────────────
export function StatCardSkeleton() {
  return (
    <div className="rounded-xl p-5" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-col gap-2">
          <Skeleton style={{ width: 80, height: 10, borderRadius: 4 }} />
          <Skeleton style={{ width: 60, height: 28, borderRadius: 4 }} />
        </div>
        <Skeleton style={{ width: 36, height: 36, borderRadius: 8 }} />
      </div>
      <div className="flex items-end justify-between">
        <Skeleton style={{ width: 60, height: 10, borderRadius: 4 }} />
        <Skeleton style={{ width: 80, height: 28, borderRadius: 4 }} />
      </div>
    </div>
  );
}

// ── Table row skeleton ────────────────────────────────────
export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} style={{ flex: 1, height: 12, borderRadius: 4, maxWidth: i === 0 ? 120 : undefined }} />
      ))}
    </div>
  );
}

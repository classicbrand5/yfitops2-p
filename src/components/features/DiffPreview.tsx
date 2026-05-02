// ─────────────────────────────────────────────────────────
// DiffPreview — Section B3
//
// Renders a unified diff string with proper syntax
// highlighting: green for additions, red for deletions,
// violet-tinted for hunk headers, normal for context.
// ─────────────────────────────────────────────────────────

import { useMemo } from 'react';

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header' | 'meta';
  content: string;
  lineNumOld: number | null;
  lineNumNew: number | null;
}

function parseDiff(diff: string): DiffLine[] {
  const lines = diff.split('\n');
  const result: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const raw of lines) {
    if (raw.startsWith('@@')) {
      // Parse hunk header: @@ -a,b +c,d @@
      const m = raw.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) {
        oldLine = parseInt(m[1], 10);
        newLine = parseInt(m[2], 10);
      }
      result.push({ type: 'header', content: raw, lineNumOld: null, lineNumNew: null });
    } else if (raw.startsWith('+') && !raw.startsWith('+++')) {
      result.push({ type: 'add', content: raw.slice(1), lineNumOld: null, lineNumNew: newLine++ });
    } else if (raw.startsWith('-') && !raw.startsWith('---')) {
      result.push({ type: 'remove', content: raw.slice(1), lineNumOld: oldLine++, lineNumNew: null });
    } else if (raw.startsWith('---') || raw.startsWith('+++')) {
      result.push({ type: 'meta', content: raw, lineNumOld: null, lineNumNew: null });
    } else {
      const stripped = raw.startsWith(' ') ? raw.slice(1) : raw;
      result.push({ type: 'context', content: stripped, lineNumOld: oldLine++, lineNumNew: newLine++ });
    }
  }

  return result;
}

interface DiffPreviewProps {
  diff: string;
  maxLines?: number;
}

export function DiffPreview({ diff, maxLines = 80 }: DiffPreviewProps) {
  const lines = useMemo(() => parseDiff(diff), [diff]);
  const visible = lines.slice(0, maxLines);
  const truncated = lines.length > maxLines;

  if (!diff.trim()) return null;

  return (
    <div
      className="rounded-lg overflow-hidden mt-2"
      style={{
        border: '1px solid rgba(255,255,255,0.06)',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        lineHeight: '1.5',
      }}
    >
      <div
        className="px-3 py-1.5 flex items-center justify-between"
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <span style={{ color: '#5C5C7A', fontSize: '10px' }}>Diff Preview</span>
        <span style={{ color: '#3A3A52', fontSize: '10px' }}>
          +{lines.filter((l) => l.type === 'add').length}{' '}
          -{lines.filter((l) => l.type === 'remove').length}
        </span>
      </div>

      <div className="overflow-x-auto max-h-64 overflow-y-auto">
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '40px' }} />
            <col style={{ width: '40px' }} />
            <col />
          </colgroup>
          <tbody>
            {visible.map((line, i) => {
              let bg = 'transparent';
              let color = '#C8C8E8';
              let prefix = ' ';

              switch (line.type) {
                case 'add':
                  bg = 'rgba(0,245,160,0.07)';
                  color = '#00F5A0';
                  prefix = '+';
                  break;
                case 'remove':
                  bg = 'rgba(255,77,109,0.07)';
                  color = '#FF4D6D';
                  prefix = '-';
                  break;
                case 'header':
                  bg = 'rgba(155,110,245,0.07)';
                  color = '#9B6EF5';
                  prefix = ' ';
                  break;
                case 'meta':
                  color = '#5C5C7A';
                  prefix = ' ';
                  break;
                default:
                  color = '#9494B8';
                  prefix = ' ';
              }

              if (line.type === 'header' || line.type === 'meta') {
                return (
                  <tr key={i} style={{ background: bg }}>
                    <td colSpan={3} className="px-3 py-px" style={{ color }}>
                      {line.content}
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={i} style={{ background: bg }}>
                  <td
                    className="px-2 py-px text-right select-none"
                    style={{ color: '#3A3A52', borderRight: '1px solid rgba(255,255,255,0.04)', userSelect: 'none' }}
                  >
                    {line.lineNumOld ?? ''}
                  </td>
                  <td
                    className="px-2 py-px text-right select-none"
                    style={{ color: '#3A3A52', borderRight: '1px solid rgba(255,255,255,0.04)', userSelect: 'none' }}
                  >
                    {line.lineNumNew ?? ''}
                  </td>
                  <td className="px-3 py-px whitespace-pre" style={{ color }}>
                    <span style={{ color: line.type === 'add' ? '#00D488' : line.type === 'remove' ? '#FF4D6D' : '#5C5C7A', marginRight: '8px', userSelect: 'none' }}>
                      {prefix}
                    </span>
                    {line.content}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {truncated && (
          <div
            className="px-3 py-2 text-center text-xs"
            style={{ color: '#3A3A52', borderTop: '1px solid rgba(255,255,255,0.04)' }}
          >
            + {lines.length - maxLines} more lines
          </div>
        )}
      </div>
    </div>
  );
}

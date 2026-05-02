// ─────────────────────────────────────────────────────────
// FileTimeline — Section C3
//
// Shows a scrollable list of all file changes made during
// the session (created/modified/deleted by user or agent).
// Click any entry to open the file in the editor.
// ─────────────────────────────────────────────────────────

import { useState } from 'react';
import {
  FilePlus, FileEdit, Trash2, Bot, User,
  Clock, ChevronDown, ChevronUp, X,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { formatRelativeTime } from '@/lib/utils';

const ACTION_META = {
  created:  { Icon: FilePlus, color: '#00F5A0', label: 'Created' },
  modified: { Icon: FileEdit, color: '#9B6EF5', label: 'Modified' },
  deleted:  { Icon: Trash2,   color: '#FF4D6D', label: 'Deleted' },
};

const SOURCE_META = {
  user:  { Icon: User, color: '#00F5A0', label: 'You' },
  agent: { Icon: Bot,  color: '#9B6EF5', label: 'Agent' },
};

interface FileTimelineProps {
  onClose?: () => void;
}

export function FileTimeline({ onClose }: FileTimelineProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const fileChanges  = useAppStore((s) => s.fileChanges);
  const clearChanges = useAppStore((s) => s.clearFileChanges);
  const openFile     = useAppStore((s) => s.openFile);

  const handleOpen = (path: string, action: string) => {
    if (action !== 'deleted') {
      // Determine language from path
      const ext = path.split('.').pop()?.toLowerCase() ?? '';
      const langMap: Record<string, string> = {
        ts: 'typescript', tsx: 'typescriptreact',
        js: 'javascript', jsx: 'javascriptreact',
        py: 'python', json: 'json', css: 'css', md: 'markdown',
      };
      openFile(path, langMap[ext] ?? 'plaintext');
    }
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
        style={{ borderBottom: isCollapsed ? 'none' : '1px solid rgba(255,255,255,0.05)' }}
        onClick={() => setIsCollapsed((v) => !v)}
      >
        <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#5C5C7A' }} />
        <span className="text-xs font-medium flex-1" style={{ color: '#9494B8' }}>
          Session Timeline
        </span>
        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: '#5C5C7A' }}>
          {fileChanges.length}
        </span>
        {!isCollapsed && fileChanges.length > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); clearChanges(); }}
            className="p-0.5 rounded hover:bg-white/5"
            style={{ color: '#3A3A52' }}
            title="Clear timeline"
          >
            <X className="w-3 h-3" />
          </button>
        )}
        {onClose && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-0.5 rounded hover:bg-white/5" style={{ color: '#3A3A52' }}>
            <X className="w-3 h-3" />
          </button>
        )}
        {isCollapsed ? <ChevronDown className="w-3 h-3" style={{ color: '#3A3A52' }} /> : <ChevronUp className="w-3 h-3" style={{ color: '#3A3A52' }} />}
      </div>

      {/* Timeline entries */}
      {!isCollapsed && (
        <div className="max-h-52 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A35 transparent' }}>
          {fileChanges.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Clock className="w-6 h-6 mb-2 opacity-20" style={{ color: '#5C5C7A' }} />
              <p className="text-xs" style={{ color: '#3A3A52' }}>No file changes yet</p>
            </div>
          ) : (
            fileChanges.map((event) => {
              const actionMeta = ACTION_META[event.action];
              const sourceMeta = SOURCE_META[event.source];
              const ActionIcon = actionMeta.Icon;
              const SourceIcon = sourceMeta.Icon;

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors duration-100"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => handleOpen(event.path, event.action)}
                  title={event.action !== 'deleted' ? `Open ${event.path}` : event.path}
                >
                  <div
                    className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center"
                    style={{ background: `${actionMeta.color}12`, border: `1px solid ${actionMeta.color}25` }}
                  >
                    <ActionIcon className="w-3 h-3" style={{ color: actionMeta.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <SourceIcon className="w-2.5 h-2.5 flex-shrink-0" style={{ color: sourceMeta.color }} />
                      <span
                        className="text-xs truncate"
                        style={{ color: event.action === 'deleted' ? '#5C5C7A' : '#EEEEFF', fontFamily: 'var(--font-mono)', textDecoration: event.action === 'deleted' ? 'line-through' : 'none' }}
                      >
                        {event.path.split('/').pop()}
                      </span>
                    </div>
                    <p className="text-xs truncate" style={{ color: '#3A3A52', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                      {event.path}
                    </p>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    {event.linesChanged !== undefined && (
                      <p className="text-xs" style={{ color: event.action === 'created' ? '#00F5A0' : event.action === 'deleted' ? '#FF4D6D' : '#9B6EF5', fontSize: '10px' }}>
                        {event.action === 'deleted' ? '-' : '+'}{event.linesChanged}
                      </p>
                    )}
                    <p className="text-xs" style={{ color: '#2A2A35', fontSize: '10px' }}>
                      {formatRelativeTime(event.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

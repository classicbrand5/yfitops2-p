import { useAppStore } from '@/store/useAppStore';
import { getLanguageFromPath } from '@/lib/utils';
import { GitBranch, AlertTriangle, Info, CheckCircle, Wifi, WifiOff } from 'lucide-react';

export default function StatusBar() {
  const { openTabs, activeTabId, workspaceReady, workspaceError } = useAppStore();

  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const language = activeTab ? getLanguageFromPath(activeTab.path) : 'plaintext';
  const cursorInfo = activeTab
    ? `Ln ${activeTab.cursorLine ?? 1}, Col ${activeTab.cursorCol ?? 1}`
    : 'Ln 1, Col 1';

  const langDisplay = {
    typescript: 'TypeScript',
    typescriptreact: 'TSX',
    javascript: 'JavaScript',
    javascriptreact: 'JSX',
    python: 'Python',
    json: 'JSON',
    markdown: 'Markdown',
    css: 'CSS',
    html: 'HTML',
    shell: 'Shell',
    yaml: 'YAML',
    plaintext: 'Plain Text',
    rust: 'Rust',
    go: 'Go',
  }[language] ?? language;

  return (
    <div
      className="flex items-center justify-between px-3 h-6 flex-shrink-0 select-none"
      style={{
        background: '#060609',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
      }}
      role="status"
      aria-label="Status bar"
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          {workspaceReady ? (
            <>
              <Wifi className="w-3 h-3" style={{ color: '#00F5A0' }} />
              <span style={{ color: '#00F5A0' }}>Connected</span>
            </>
          ) : workspaceError ? (
            <>
              <WifiOff className="w-3 h-3" style={{ color: '#FF4D6D' }} />
              <span style={{ color: '#FF4D6D' }}>Error</span>
            </>
          ) : (
            <>
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#FBBF24' }}
              />
              <span style={{ color: '#FBBF24' }}>Connecting…</span>
            </>
          )}
        </div>

        <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {/* Git branch */}
        <div className="flex items-center gap-1.5" style={{ color: '#5C5C7A' }}>
          <GitBranch className="w-3 h-3" />
          <span>main</span>
        </div>

        <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {/* Error/warning counts (placeholder — Monaco markers in Phase 3) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1" style={{ color: '#FF4D6D' }}>
            <AlertTriangle className="w-3 h-3" />
            <span>0 errors</span>
          </div>
          <div className="flex items-center gap-1" style={{ color: '#FBBF24' }}>
            <Info className="w-3 h-3" />
            <span>0 warnings</span>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3" style={{ color: '#5C5C7A' }}>
        {activeTab && (
          <>
            <span>UTF-8</span>
            <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ color: '#9494B8' }}>{langDisplay}</span>
            <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span>{cursorInfo}</span>
            <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span>Spaces: 2</span>
          </>
        )}

        {!activeTab && (
          <span style={{ color: '#3A3A52' }}>No file open</span>
        )}
      </div>
    </div>
  );
}

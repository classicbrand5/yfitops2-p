// ─────────────────────────────────────────────────────────
// WorkspacePage — Enhanced Boot Sequence + Quad Layout (Section D1 + C4)
// ─────────────────────────────────────────────────────────

import { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { SplitLayout } from '@/components/layout/SplitLayout';
import { PanelShell } from '@/components/features/PanelShell';
import { FileTree } from '@/components/features/FileTree';
import { RealTerminalPanel } from '@/components/features/RealTerminalPanel';
import { useWebContainer } from '@/hooks/useWebContainer';
import { MonacoEditor } from '@/components/features/Editor/MonacoEditor';
import { AgentChat } from '@/components/features/AgentChat';
import { WorkspaceErrorBoundary } from '@/components/layout/WorkspaceErrorBoundary';
import { PanelErrorBoundary } from '@/components/ui/PanelErrorBoundary'; // Phase 2 fix: per-panel error isolation
import { WebContainerError } from '@/lib/errors';
import {
  FolderOpen, Code2, Terminal, Bot,
  Plus, X, AlertTriangle, RefreshCw,
  Zap, HardDrive, Cpu,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
// Enhanced Boot Overlay — D1
// ─────────────────────────────────────────────────────────
const BOOT_PHASES = [
  { pct: 5,  label: 'Initializing sandbox…',    icon: Zap,        detail: 'Starting WebContainer runtime' },
  { pct: 25, label: 'Mounting workspace…',       icon: HardDrive,  detail: 'Creating filesystem structure' },
  { pct: 55, label: 'Wiring terminal shell…',    icon: Terminal,   detail: 'Spawning jsh interactive shell' },
  { pct: 80, label: 'Loading AI context…',       icon: Cpu,        detail: 'Connecting to agent systems' },
  { pct: 100, label: 'Ready.',                   icon: Zap,        detail: 'Workspace is live' },
];

function BootOverlay({ progress, error }: { progress: number; error?: string | null }) {
  const phase = BOOT_PHASES.reduce(
    (acc, p) => (progress >= p.pct ? p : acc),
    BOOT_PHASES[0],
  );
  const PhaseIcon = phase.icon;

  if (error) {
    return (
      <div
        className="absolute inset-0 flex flex-col items-center justify-center z-50"
        style={{ background: 'rgba(12,12,18,0.97)', backdropFilter: 'blur(8px)' }}
      >
        <div
          className="rounded-2xl p-8 max-w-md w-full mx-4 text-center"
          style={{ background: '#111118', border: '1px solid rgba(255,77,109,0.25)' }}
        >
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: '#FF4D6D' }} />
          <h2 className="text-lg font-bold mb-2" style={{ color: '#FF4D6D', fontFamily: 'var(--font-display)' }}>
            Workspace Boot Error
          </h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#9494B8' }}>{error}</p>
          {error?.includes('SharedArrayBuffer') && (
            <p className="text-xs" style={{ color: '#5C5C7A' }}>
              COOP/COEP headers may be misconfigured. Check{' '}
              <code className="px-1 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: '#38BDF8' }}>
                public/_headers
              </code>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: 'rgba(12,12,18,0.95)', backdropFilter: 'blur(8px)' }}
    >
      {/* Blurred workspace behind overlay is the real content — this just sits on top */}
      <div className="text-center max-w-xs w-full px-6">
        {/* Phase icon */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{
            background: progress === 100 ? 'rgba(0,245,160,0.12)' : 'rgba(0,245,160,0.06)',
            border: `1px solid rgba(0,245,160,${progress === 100 ? 0.3 : 0.15})`,
            transition: 'all 600ms ease',
          }}
        >
          <PhaseIcon
            className={progress < 100 ? 'animate-pulse' : ''}
            style={{ color: '#00F5A0', width: 28, height: 28 }}
          />
        </div>

        {/* Phase label */}
        <h2
          className="text-base font-semibold mb-1 transition-all duration-300"
          style={{ color: '#EEEEFF', fontFamily: 'var(--font-display)' }}
        >
          {phase.label}
        </h2>
        <p className="text-xs mb-6" style={{ color: '#5C5C7A', fontFamily: 'var(--font-mono)' }}>
          {phase.detail}
        </p>

        {/* Progress bar */}
        <div
          className="h-1 rounded-full overflow-hidden mb-2"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: progress === 100
                ? 'linear-gradient(90deg, #00F5A0, #9B6EF5)'
                : '#00F5A0',
              boxShadow: `0 0 8px rgba(0,245,160,${progress === 100 ? 0.7 : 0.4})`,
            }}
          />
        </div>
        <p className="text-xs" style={{ color: '#3A3A52', fontFamily: 'var(--font-mono)' }}>
          {progress}%
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Panel Bodies
// ─────────────────────────────────────────────────────────

function ExplorerBody() {
  // Phase 2 fix: Explorer wrapped in PanelErrorBoundary
  return (
    <PanelErrorBoundary panelName="Explorer">
      <div className="h-full overflow-hidden">
        <FileTree />
      </div>
    </PanelErrorBoundary>
  );
}

function EditorTab({
  tab,
  isActive,
}: {
  tab: { id: string; name: string; isDirty: boolean };
  isActive: boolean;
}) {
  const { setActiveTab, closeTab } = useAppStore();

  return (
    <div
      className="flex items-center gap-1.5 pl-3 pr-1.5 flex-shrink-0 border-r cursor-pointer"
      style={{
        background: isActive ? '#0F0F17' : 'transparent',
        borderColor: 'rgba(255,255,255,0.05)',
        minHeight: '32px',
        borderBottom: isActive ? '1px solid rgba(0,245,160,0.3)' : '1px solid transparent',
        transition: 'background 120ms ease',
      }}
      onClick={() => setActiveTab(tab.id)}
      role="tab"
      aria-selected={isActive}
    >
      {tab.isDirty && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: '#00F5A0' }}
          title="Unsaved changes"
        />
      )}
      <span
        className="text-xs truncate max-w-[120px]"
        style={{
          color: isActive ? '#EEEEFF' : '#5C5C7A',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {tab.name}
      </span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
        className="p-0.5 rounded opacity-0 hover:opacity-100 transition-opacity duration-100 flex-shrink-0 min-w-[16px] min-h-[16px] flex items-center justify-center hover:bg-white/5"
        style={{ color: '#5C5C7A' }}
        aria-label={`Close ${tab.name}`}
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}

function EditorBody() {
  const { openTabs, activeTabId } = useAppStore();

  return (
    <div className="flex flex-col h-full">
      {openTabs.length > 0 && (
        <div
          className="flex items-center overflow-x-auto flex-shrink-0"
          role="tablist"
          aria-label="Open editor tabs"
          style={{
            background: '#0D0D14',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            minHeight: '33px',
            scrollbarWidth: 'thin',
            scrollbarColor: '#2A2A35 transparent',
          }}
        >
          {openTabs.map((tab) => (
            <EditorTab key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
          ))}
        </div>
      )}
      {/* Phase 2 fix: Editor wrapped in PanelErrorBoundary */}
      <PanelErrorBoundary panelName="Editor">
        <div className="flex-1 min-h-0 overflow-hidden">
          <MonacoEditor />
        </div>
      </PanelErrorBoundary>
    </div>
  );
}

function TerminalBody({ container }: { container: import('@webcontainer/api').WebContainer | null }) {
  const { terminalSessions, activeTerminalId, createTerminalSession } = useAppStore();

  if (!container) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ background: '#080810' }}>
        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin mb-3" style={{ borderColor: '#38BDF8', borderTopColor: 'transparent' }} />
        <p className="text-xs" style={{ color: '#3A3A52', fontFamily: 'var(--font-mono)' }}>Waiting for WebContainer…</p>
      </div>
    );
  }

  if (!activeTerminalId || !terminalSessions[activeTerminalId]) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ background: '#080810' }}>
        <Terminal className="w-10 h-10 mb-3 opacity-20" style={{ color: '#38BDF8' }} />
        <p className="text-xs font-medium mb-2" style={{ color: '#5C5C7A', fontFamily: 'var(--font-mono)' }}>No terminal session</p>
        <button
          type="button"
          onClick={() => createTerminalSession(crypto.randomUUID())}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
          style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', color: '#38BDF8' }}
        >
          <Plus className="w-3.5 h-3.5" /> New Terminal
        </button>
      </div>
    );
  }

  // Phase 2 fix: Terminal wrapped in PanelErrorBoundary
  return (
    <PanelErrorBoundary panelName="Terminal">
      <RealTerminalPanel
        key={activeTerminalId}
        container={container}
        sessionId={activeTerminalId}
      />
    </PanelErrorBoundary>
  );
}

// ─────────────────────────────────────────────────────────
// Panel factory wrappers
// ─────────────────────────────────────────────────────────

function ExplorerPanel({ onRefresh }: { onRefresh: () => void }) {
  return (
    <PanelShell
      panelId="explorer"
      title="Explorer"
      Icon={FolderOpen}
      iconColor="#00F5A0"
      actions={
        <button type="button" onClick={onRefresh} className="p-1 rounded hover:bg-white/5 min-w-[24px] min-h-[24px] flex items-center justify-center" style={{ color: '#5C5C7A' }} aria-label="Refresh file tree" title="Refresh">
          <RefreshCw className="w-3 h-3" />
        </button>
      }
    >
      <ExplorerBody />
    </PanelShell>
  );
}

function EditorPanel() {
  const { openTabs } = useAppStore();
  return (
    <PanelShell panelId="editor" title="Editor" Icon={Code2} iconColor="#9B6EF5"
      actions={openTabs.length > 0 ? <span className="text-xs" style={{ color: '#3A3A52', fontFamily: 'var(--font-mono)' }}>{openTabs.length} tab{openTabs.length !== 1 ? 's' : ''}</span> : undefined}
    >
      <EditorBody />
    </PanelShell>
  );
}

function TerminalPanel({ container }: { container: import('@webcontainer/api').WebContainer | null }) {
  const { createTerminalSession } = useAppStore();
  return (
    <PanelShell panelId="terminal" title="Terminal" Icon={Terminal} iconColor="#38BDF8"
      actions={
        <button type="button" onClick={() => createTerminalSession(crypto.randomUUID())} className="p-1 rounded hover:bg-white/5 min-w-[24px] min-h-[24px] flex items-center justify-center" style={{ color: '#5C5C7A' }} aria-label="New terminal session" title="New terminal">
          <Plus className="w-3 h-3" />
        </button>
      }
    >
      <TerminalBody container={container} />
    </PanelShell>
  );
}

function ChatPanel() {
  const { createNewConversation } = useAppStore();
  return (
    <PanelShell panelId="chat" title="AI Agent" Icon={Bot} iconColor="#FBBF24"
      actions={
        <button type="button" onClick={createNewConversation} className="p-1 rounded hover:bg-white/5 min-w-[24px] min-h-[24px] flex items-center justify-center" style={{ color: '#5C5C7A' }} aria-label="New conversation" title="New conversation">
          <Plus className="w-3 h-3" />
        </button>
      }
    >
      {/* Phase 2 fix: AgentChat wrapped in PanelErrorBoundary */}
      <PanelErrorBoundary panelName="Agent Chat">
        <AgentChat />
      </PanelErrorBoundary>
    </PanelShell>
  );
}

// ═════════════════════════════════════════════════════════
// WorkspacePage
// ═════════════════════════════════════════════════════════
export default function WorkspacePage() {
  const { layoutMode, splitRatio, setSplitRatio, setFocusedPanel } = useAppStore();
  const [bootProgress, setBootProgress] = useState(0);

  // Boot WebContainer
  const { container, bootError, isBooting, refreshFileTree } = useWebContainer();

  // Check SharedArrayBuffer availability (Section E2)
  useEffect(() => {
    if (typeof SharedArrayBuffer === 'undefined') {
      throw new WebContainerError(
        'SharedArrayBuffer is unavailable. COOP/COEP headers may be misconfigured. Check public/_headers and vite.config.ts server.headers.',
      );
    }
  }, []);

  // Simulate boot progress phases
  useEffect(() => {
    if (!isBooting) {
      setBootProgress(100);
      return;
    }

    // Phase 1: 0→25%
    setBootProgress(5);
    const t1 = setTimeout(() => setBootProgress(25), 800);
    const t2 = setTimeout(() => setBootProgress(55), 2000);
    const t3 = setTimeout(() => setBootProgress(80), 3500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [isBooting]);

  useEffect(() => { setFocusedPanel('editor'); }, [setFocusedPanel]);

  const handleRatioChange = useCallback((r: number) => setSplitRatio(r), [setSplitRatio]);

  const renderLayout = () => {
    switch (layoutMode) {
      case 'editor-only':
        return <div className="h-full p-2"><EditorPanel /></div>;

      case 'terminal-only':
        return <div className="h-full p-2"><TerminalPanel container={container} /></div>;

      case 'chat-only':
        return <div className="h-full p-2"><ChatPanel /></div>;

      case 'split-vertical':
        return (
          <div className="h-full p-2">
            <SplitLayout direction="vertical" ratio={splitRatio} onRatioChange={handleRatioChange}
              primarySlot={<SplitLayout direction="horizontal" ratio={0.25} primarySlot={<ExplorerPanel onRefresh={refreshFileTree} />} secondarySlot={<EditorPanel />} />}
              secondarySlot={<SplitLayout direction="horizontal" ratio={0.55} primarySlot={<TerminalPanel container={container} />} secondarySlot={<ChatPanel />} />}
            />
          </div>
        );

      // Section C4: True Quad-Pane Layout
      case 'full-ide':
        return (
          <div className="h-full p-2">
            <SplitLayout direction="horizontal" ratio={0.18}
              primarySlot={<ExplorerPanel onRefresh={refreshFileTree} />}
              secondarySlot={
                <SplitLayout direction="horizontal" ratio={splitRatio} onRatioChange={handleRatioChange}
                  primarySlot={
                    <SplitLayout direction="vertical" ratio={0.65}
                      primarySlot={<EditorPanel />}
                      secondarySlot={<TerminalPanel container={container} />}
                    />
                  }
                  secondarySlot={<ChatPanel />}
                />
              }
            />
          </div>
        );

      case 'split-horizontal':
      default:
        return (
          <div className="h-full p-2">
            <SplitLayout direction="horizontal" ratio={splitRatio} onRatioChange={handleRatioChange}
              primarySlot={
                <SplitLayout direction="horizontal" ratio={0.25}
                  primarySlot={<ExplorerPanel onRefresh={refreshFileTree} />}
                  secondarySlot={<EditorPanel />}
                />
              }
              secondarySlot={
                <SplitLayout direction="vertical" ratio={0.55}
                  primarySlot={<TerminalPanel container={container} />}
                  secondarySlot={<ChatPanel />}
                />
              }
            />
          </div>
        );
    }
  };

  return (
    <WorkspaceErrorBoundary>
      <div
        className="h-full w-full overflow-hidden relative"
        style={{ background: '#0C0C12', fontFamily: 'var(--font-body)' }}
      >
        {/* Panel focus indicator styles */}
        <style>{`
          .panel-shell:focus-within { border-color: rgba(0,245,160,0.2) !important; }
        `}</style>

        {/* Boot overlay */}
        {(isBooting || bootError) && (
          <BootOverlay progress={bootProgress} error={bootError} />
        )}

        {renderLayout()}
      </div>
    </WorkspaceErrorBoundary>
  );
}

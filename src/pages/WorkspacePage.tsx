// ─────────────────────────────────────────────────────────
// WorkspacePage — Full IDE layout (Phase 4)
//
// Now wired to real WebContainer:
// - FileTree reads from live FS
// - TerminalPanel spawns real jsh shell via xterm.js
// - Editor tabs functional (Monaco wired in Phase 5)
// - All 6 layout modes from Phase 3 preserved
// ─────────────────────────────────────────────────────────

import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { SplitLayout } from '@/components/layout/SplitLayout';
import { PanelShell } from '@/components/features/PanelShell';
import { FileTree } from '@/components/features/FileTree';
import { RealTerminalPanel } from '@/components/features/RealTerminalPanel';
import { useWebContainer } from '@/hooks/useWebContainer';
import { MonacoEditor } from '@/components/features/Editor/MonacoEditor';
import { AgentChat } from '@/components/features/AgentChat';
import {
  FolderOpen, Code2, Terminal, Bot,
  Plus, X, AlertTriangle, RefreshCw,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
// Panel Bodies
// ─────────────────────────────────────────────────────────

// ── Explorer Body — real file tree ────────────────────────
function ExplorerBody() {
  return (
    <div className="h-full overflow-hidden">
      <FileTree />
    </div>
  );
}

// ── Editor Tab ────────────────────────────────────────────
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
      className="flex items-center gap-1.5 pl-3 pr-1.5 flex-shrink-0 border-r cursor-pointer transition-colors duration-100"
      style={{
        background: isActive ? '#0F0F17' : 'transparent',
        borderColor: 'rgba(255,255,255,0.05)',
        minHeight: '32px',
        borderBottom: isActive ? '1px solid rgba(0,245,160,0.3)' : '1px solid transparent',
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
        onClick={(e) => {
          e.stopPropagation();
          closeTab(tab.id);
        }}
        className="p-0.5 rounded opacity-0 hover:opacity-100 transition-opacity duration-100 flex-shrink-0 min-w-[16px] min-h-[16px] flex items-center justify-center hover:bg-white/5"
        style={{ color: '#5C5C7A' }}
        aria-label={`Close ${tab.name}`}
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}

// ── Editor Body ───────────────────────────────────────────
function EditorBody() {
  const { openTabs, activeTabId } = useAppStore();

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
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

      {/* Monaco Editor — Phase 5 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <MonacoEditor />
      </div>
    </div>
  );
}

// ── Terminal Body — real xterm.js + jsh ───────────────────
interface TerminalBodyProps {
  container: import('@webcontainer/api').WebContainer | null;
}

function TerminalBody({ container }: TerminalBodyProps) {
  const { terminalSessions, activeTerminalId, createTerminalSession } = useAppStore();

  if (!container) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full text-center p-6"
        style={{ background: '#080810' }}
      >
        <div
          className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin mb-3"
          style={{ borderColor: '#38BDF8', borderTopColor: 'transparent' }}
          role="status"
        />
        <p className="text-xs" style={{ color: '#3A3A52', fontFamily: 'var(--font-mono)' }}>
          Waiting for WebContainer…
        </p>
      </div>
    );
  }

  if (!activeTerminalId || !terminalSessions[activeTerminalId]) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full text-center p-6"
        style={{ background: '#080810' }}
      >
        <Terminal className="w-10 h-10 mb-3 opacity-20" style={{ color: '#38BDF8' }} />
        <p className="text-xs font-medium mb-2" style={{ color: '#5C5C7A', fontFamily: 'var(--font-mono)' }}>
          No terminal session
        </p>
        <button
          type="button"
          onClick={() => createTerminalSession(crypto.randomUUID())}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150"
          style={{
            background: 'rgba(56,189,248,0.08)',
            border: '1px solid rgba(56,189,248,0.2)',
            color: '#38BDF8',
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          New Terminal
        </button>
      </div>
    );
  }

  return (
    <RealTerminalPanel
      key={activeTerminalId}
      container={container}
      sessionId={activeTerminalId}
    />
  );
}

// ── Chat Body — Phase 6: real AgentChat ──────────────────
function ChatBody() {
  return <AgentChat />;
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
        <button
          type="button"
          onClick={onRefresh}
          className="p-1 rounded transition-colors duration-100 hover:bg-white/5 min-w-[24px] min-h-[24px] flex items-center justify-center"
          style={{ color: '#5C5C7A' }}
          aria-label="Refresh file tree"
          title="Refresh"
        >
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
    <PanelShell
      panelId="editor"
      title="Editor"
      Icon={Code2}
      iconColor="#9B6EF5"
      actions={
        openTabs.length > 0 ? (
          <span className="text-xs" style={{ color: '#3A3A52', fontFamily: 'var(--font-mono)' }}>
            {openTabs.length} tab{openTabs.length !== 1 ? 's' : ''}
          </span>
        ) : undefined
      }
    >
      <EditorBody />
    </PanelShell>
  );
}

function TerminalPanel({ container }: { container: import('@webcontainer/api').WebContainer | null }) {
  const { createTerminalSession } = useAppStore();
  return (
    <PanelShell
      panelId="terminal"
      title="Terminal"
      Icon={Terminal}
      iconColor="#38BDF8"
      actions={
        <button
          type="button"
          onClick={() => createTerminalSession(crypto.randomUUID())}
          className="p-1 rounded transition-colors duration-100 hover:bg-white/5 min-w-[24px] min-h-[24px] flex items-center justify-center"
          style={{ color: '#5C5C7A' }}
          aria-label="New terminal session"
          title="New terminal"
        >
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
    <PanelShell
      panelId="chat"
      title="AI Agent"
      Icon={Bot}
      iconColor="#FBBF24"
      actions={
        <button
          type="button"
          onClick={createNewConversation}
          className="p-1 rounded transition-colors duration-100 hover:bg-white/5 min-w-[24px] min-h-[24px] flex items-center justify-center"
          style={{ color: '#5C5C7A' }}
          aria-label="New conversation"
          title="New conversation"
        >
          <Plus className="w-3 h-3" />
        </button>
      }
    >
      <ChatBody />
    </PanelShell>
  );
}

// ═════════════════════════════════════════════════════════
// WorkspacePage — root
// ═════════════════════════════════════════════════════════
export default function WorkspacePage() {
  const { layoutMode, splitRatio, setSplitRatio, setFocusedPanel } = useAppStore();

  // Boot WebContainer — singleton, safe to call here
  const { container, bootError, isBooting, refreshFileTree } = useWebContainer();

  // Set initial focus to editor
  useEffect(() => {
    setFocusedPanel('editor');
  }, [setFocusedPanel]);

  const handleRatioChange = useCallback(
    (r: number) => setSplitRatio(r),
    [setSplitRatio],
  );

  // ── Boot error surface ────────────────────────────────
  if (bootError) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ background: '#0C0C12' }}
      >
        <div
          className="rounded-xl p-8 max-w-md w-full mx-4 text-center"
          style={{
            background: 'rgba(255,77,109,0.06)',
            border: '1px solid rgba(255,77,109,0.2)',
          }}
        >
          <AlertTriangle
            className="w-10 h-10 mx-auto mb-4"
            style={{ color: '#FF4D6D' }}
          />
          <h2
            className="text-base font-semibold mb-2"
            style={{ color: '#FF4D6D', fontFamily: 'var(--font-display)' }}
          >
            Workspace Boot Error
          </h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#9494B8' }}>
            {bootError}
          </p>
          <p className="text-xs" style={{ color: '#5C5C7A' }}>
            WebContainer requires <code className="text-xs px-1 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: '#38BDF8' }}>SharedArrayBuffer</code>.
            Ensure COOP/COEP headers are present.
          </p>
        </div>
      </div>
    );
  }

  // ── Layout rendering ──────────────────────────────────
  const renderLayout = () => {
    switch (layoutMode) {
      case 'editor-only':
        return (
          <div className="h-full p-2">
            <EditorPanel />
          </div>
        );

      case 'terminal-only':
        return (
          <div className="h-full p-2">
            <TerminalPanel container={container} />
          </div>
        );

      case 'chat-only':
        return (
          <div className="h-full p-2">
            <ChatPanel />
          </div>
        );

      case 'split-vertical':
        return (
          <div className="h-full p-2">
            <SplitLayout
              direction="vertical"
              ratio={splitRatio}
              onRatioChange={handleRatioChange}
              primarySlot={
                <SplitLayout
                  direction="horizontal"
                  ratio={0.25}
                  primarySlot={<ExplorerPanel onRefresh={refreshFileTree} />}
                  secondarySlot={<EditorPanel />}
                />
              }
              secondarySlot={
                <SplitLayout
                  direction="horizontal"
                  ratio={0.55}
                  primarySlot={<TerminalPanel container={container} />}
                  secondarySlot={<ChatPanel />}
                />
              }
            />
          </div>
        );

      case 'full-ide':
        return (
          <div className="h-full p-2">
            <SplitLayout
              direction="horizontal"
              ratio={0.18}
              primarySlot={<ExplorerPanel onRefresh={refreshFileTree} />}
              secondarySlot={
                <SplitLayout
                  direction="horizontal"
                  ratio={splitRatio}
                  onRatioChange={handleRatioChange}
                  primarySlot={
                    <SplitLayout
                      direction="vertical"
                      ratio={0.65}
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
            <SplitLayout
              direction="horizontal"
              ratio={splitRatio}
              onRatioChange={handleRatioChange}
              primarySlot={
                <SplitLayout
                  direction="horizontal"
                  ratio={0.25}
                  primarySlot={<ExplorerPanel onRefresh={refreshFileTree} />}
                  secondarySlot={<EditorPanel />}
                />
              }
              secondarySlot={
                <SplitLayout
                  direction="vertical"
                  ratio={0.55}
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
    <div
      className="h-full w-full overflow-hidden relative"
      style={{ background: '#0C0C12', fontFamily: 'var(--font-body)' }}
    >
      {/* Boot progress overlay */}
      {isBooting && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-50"
          style={{ background: 'rgba(12,12,18,0.92)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mb-4"
            style={{ borderColor: '#00F5A0', borderTopColor: 'transparent' }}
            role="status"
            aria-label="Booting workspace"
          />
          <p className="text-sm font-medium" style={{ color: '#00F5A0', fontFamily: 'var(--font-display)' }}>
            Booting WebContainer
          </p>
          <p className="text-xs mt-1" style={{ color: '#3A3A52', fontFamily: 'var(--font-mono)' }}>
            Mounting filesystem…
          </p>
        </div>
      )}

      {renderLayout()}
    </div>
  );
}

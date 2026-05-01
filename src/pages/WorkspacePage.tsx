// ─────────────────────────────────────────────────────────
// WorkspacePage — Full IDE layout scaffold (Phase 3)
//
// Layout modes driven by store:
//   split-horizontal  — [Explorer+Editor | Terminal+Chat] stacked left/right
//   split-vertical    — [Explorer+Editor] top / [Terminal+Chat] bottom
//   editor-only       — full-width editor
//   terminal-only     — full-width terminal
//   chat-only         — full-width agent chat
//   full-ide          — 3-column: Explorer | Editor | Chat, Terminal beneath editor
//
// Each pane is a PanelShell placeholder; real components
// (FileExplorer, MonacoEditor, TerminalPanel, AgentChat)
// are imported as they are built in Phases 4–6.
// ─────────────────────────────────────────────────────────

import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { SplitLayout } from '@/components/layout/SplitLayout';
import { PanelShell } from '@/components/features/PanelShell';
import {
  FolderOpen, Code2, Terminal, Bot,
  Plus, RefreshCw, X, Zap,
} from 'lucide-react';

// ── Placeholder panel bodies ──────────────────────────────
function ExplorerBody() {
  return (
    <div
      className="flex flex-col items-center justify-center h-full p-6 text-center"
      style={{ color: '#3A3A52' }}
    >
      <FolderOpen className="w-10 h-10 mb-3 opacity-30" />
      <p className="text-xs font-medium mb-1" style={{ color: '#5C5C7A' }}>File Explorer</p>
      <p className="text-xs leading-relaxed">
        Connect a repo to browse the real WebContainer filesystem tree.
      </p>
      <div className="mt-4 text-xs" style={{ color: '#2A2A35' }}>Phase 5</div>
    </div>
  );
}

function EditorBody() {
  const { openTabs, activeTabId } = useAppStore();
  const activeTab = openTabs.find((t) => t.id === activeTabId);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      {openTabs.length > 0 && (
        <div
          className="flex items-center overflow-x-auto flex-shrink-0"
          style={{ background: '#111118', borderBottom: '1px solid rgba(255,255,255,0.05)', minHeight: '32px' }}
        >
          {openTabs.map((tab) => (
            <EditorTab key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
          ))}
        </div>
      )}

      {/* Editor area */}
      <div className="flex-1 flex items-center justify-center p-6 text-center" style={{ color: '#3A3A52' }}>
        {activeTab ? (
          <div>
            <Code2 className="w-8 h-8 mb-3 opacity-30 mx-auto" />
            <p className="text-xs font-medium mb-1" style={{ color: '#5C5C7A' }}>{activeTab.name}</p>
            <p className="text-xs">{activeTab.path}</p>
            <div className="mt-4 text-xs" style={{ color: '#2A2A35' }}>Monaco Editor — Phase 3</div>
          </div>
        ) : (
          <div>
            <Code2 className="w-10 h-10 mb-3 opacity-30 mx-auto" />
            <p className="text-xs font-medium mb-1" style={{ color: '#5C5C7A' }}>Monaco Editor</p>
            <p className="text-xs leading-relaxed">
              Custom YFitOps dark theme, FS sync, multi-tab with unsaved indicators.
            </p>
            <div className="mt-4 text-xs" style={{ color: '#2A2A35' }}>Phase 3</div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditorTab({ tab, isActive }: { tab: { id: string; name: string; isDirty: boolean }; isActive: boolean }) {
  const { setActiveTab, closeTab } = useAppStore();
  return (
    <button
      type="button"
      onClick={() => setActiveTab(tab.id)}
      className="flex items-center gap-2 px-3 py-1.5 text-xs border-r whitespace-nowrap flex-shrink-0 min-h-[32px] transition-colors duration-100"
      style={{
        background: isActive ? '#0F0F17' : 'transparent',
        borderColor: 'rgba(255,255,255,0.05)',
        color: isActive ? '#EEEEFF' : '#5C5C7A',
        borderBottom: isActive ? '1px solid transparent' : '1px solid transparent',
        boxShadow: isActive ? 'inset 0 -1px 0 0 #0F0F17' : 'none',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {tab.isDirty && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#00F5A0' }} />
      )}
      <span className="truncate max-w-[120px]">{tab.name}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
        className="p-0.5 rounded opacity-0 hover:opacity-100 transition-opacity duration-100 flex-shrink-0 min-w-[16px] min-h-[16px] flex items-center justify-center"
        style={{ color: '#5C5C7A' }}
        aria-label={`Close ${tab.name}`}
      >
        <X className="w-3 h-3" />
      </button>
    </button>
  );
}

function TerminalBody() {
  const { terminalSessions, activeTerminalId } = useAppStore();
  const hasSession = activeTerminalId && terminalSessions[activeTerminalId];

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: '#0A0A10', fontFamily: 'var(--font-mono)' }}
    >
      {hasSession ? (
        <div className="p-3">
          <div className="text-xs" style={{ color: '#00F5A0' }}>
            {terminalSessions[activeTerminalId!].output.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6" style={{ color: '#3A3A52' }}>
          <Terminal className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-xs font-medium mb-1" style={{ color: '#5C5C7A' }}>Terminal Panel</p>
          <p className="text-xs leading-relaxed">
            Real xterm.js, WebContainer bash, multi-session with process streaming.
          </p>
          <div className="mt-4 text-xs" style={{ color: '#2A2A35' }}>Phase 4</div>
        </div>
      )}
    </div>
  );
}

function ChatBody() {
  const { conversations, messages, activeConversationId, isThinking } = useAppStore();
  const convoMsgs = activeConversationId ? (messages[activeConversationId] ?? []) : [];

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {convoMsgs.length > 0 ? (
          convoMsgs.map((msg) => (
            <div
              key={msg.id}
              className="text-xs leading-relaxed rounded-lg px-3 py-2"
              style={{
                background: msg.role === 'user' ? 'rgba(0,245,160,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(0,245,160,0.15)' : 'rgba(255,255,255,0.05)'}`,
                color: '#9494B8',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <span style={{ color: msg.role === 'user' ? '#00F5A0' : '#9B6EF5', fontWeight: 600 }}>
                {msg.role === 'user' ? 'You' : 'YFitOps AI'}
              </span>
              <p className="mt-1">{msg.content}</p>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6" style={{ color: '#3A3A52' }}>
            <Bot className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-xs font-medium mb-1" style={{ color: '#5C5C7A' }}>AI Agent Chat</p>
            <p className="text-xs leading-relaxed">
              Streaming responses, ActionCards, DiffPreview, and autonomous execution.
            </p>
            <div className="mt-4 text-xs" style={{ color: '#2A2A35' }}>Phase 6</div>
          </div>
        )}
        {isThinking && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(155,110,245,0.06)', border: '1px solid rgba(155,110,245,0.15)' }}>
            <div className="w-3 h-3 rounded-full border border-t-transparent animate-spin" style={{ borderColor: '#9B6EF5', borderTopColor: 'transparent' }} />
            <span className="text-xs" style={{ color: '#9B6EF5' }}>YFitOps is thinking…</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: '#13131C', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <input
            type="text"
            placeholder="Ask YFitOps…"
            className="flex-1 text-xs outline-none bg-transparent"
            style={{ color: '#EEEEFF', fontFamily: 'var(--font-body)' }}
            disabled
          />
          <button
            type="button"
            disabled
            className="flex items-center justify-center w-7 h-7 rounded-lg"
            style={{ background: 'rgba(0,245,160,0.12)', color: '#00F5A0' }}
            aria-label="Send message"
          >
            <Zap className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Panel factory ─────────────────────────────────────────
function ExplorerPanel() {
  return (
    <PanelShell panelId="explorer" title="Explorer" Icon={FolderOpen} iconColor="#00F5A0">
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

function TerminalPanel() {
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
        >
          <Plus className="w-3 h-3" />
        </button>
      }
    >
      <TerminalBody />
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

  // Set initial focus to editor on mount
  useEffect(() => {
    setFocusedPanel('editor');
  }, [setFocusedPanel]);

  const handleRatioChange = useCallback(
    (r: number) => setSplitRatio(r),
    [setSplitRatio]
  );

  // ── Layout rendering ──────────────────────────────────
  const renderLayout = () => {
    switch (layoutMode) {
      // ── Editor Only ───────────────────────────────────
      case 'editor-only':
        return (
          <div className="h-full p-2">
            <EditorPanel />
          </div>
        );

      // ── Terminal Only ─────────────────────────────────
      case 'terminal-only':
        return (
          <div className="h-full p-2">
            <TerminalPanel />
          </div>
        );

      // ── Chat Only ─────────────────────────────────────
      case 'chat-only':
        return (
          <div className="h-full p-2">
            <ChatPanel />
          </div>
        );

      // ── Split Vertical (top/bottom) ───────────────────
      case 'split-vertical':
        return (
          <div className="h-full p-2 gap-2 flex flex-col">
            <SplitLayout
              direction="vertical"
              ratio={splitRatio}
              onRatioChange={handleRatioChange}
              primarySlot={
                <SplitLayout
                  direction="horizontal"
                  ratio={0.25}
                  primarySlot={<ExplorerPanel />}
                  secondarySlot={<EditorPanel />}
                />
              }
              secondarySlot={
                <SplitLayout
                  direction="horizontal"
                  ratio={0.5}
                  primarySlot={<TerminalPanel />}
                  secondarySlot={<ChatPanel />}
                />
              }
            />
          </div>
        );

      // ── Full IDE (3-column) ───────────────────────────
      case 'full-ide':
        return (
          <div className="h-full p-2">
            <SplitLayout
              direction="horizontal"
              ratio={0.2}
              primarySlot={<ExplorerPanel />}
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
                      secondarySlot={<TerminalPanel />}
                    />
                  }
                  secondarySlot={<ChatPanel />}
                />
              }
            />
          </div>
        );

      // ── Split Horizontal (default: left/right) ────────
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
                  primarySlot={<ExplorerPanel />}
                  secondarySlot={<EditorPanel />}
                />
              }
              secondarySlot={
                <SplitLayout
                  direction="vertical"
                  ratio={0.55}
                  primarySlot={<TerminalPanel />}
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
      className="h-full w-full overflow-hidden"
      style={{ background: '#0C0C12', fontFamily: 'var(--font-body)' }}
    >
      {renderLayout()}
    </div>
  );
}

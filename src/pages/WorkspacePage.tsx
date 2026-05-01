import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Terminal, Bot, FolderOpen, Code2, Zap, AlertCircle } from 'lucide-react';

// Phase 2+ will import real panels:
// import FileExplorer from '@/components/features/FileExplorer/FileExplorer';
// import CodeEditor from '@/components/features/Editor/CodeEditor';
// import TerminalPanel from '@/components/features/Terminal/TerminalPanel';
// import AgentChat from '@/components/features/AgentChat/AgentChat';

export default function WorkspacePage() {
  const { workspaceReady, setWorkspaceReady, setFocusedPanel, layoutMode } = useAppStore();

  useEffect(() => {
    setFocusedPanel('editor');
    // Phase 2 will boot the real WebContainer here
    // For now, show the coming-soon placeholder
  }, [setFocusedPanel]);

  return (
    <div
      className="h-full flex flex-col items-center justify-center p-8"
      style={{ background: '#0C0C12', fontFamily: 'var(--font-body)' }}
    >
      {/* Glass container */}
      <div
        className="max-w-2xl w-full rounded-2xl p-10 text-center animate-fade-up"
        style={{
          background: 'rgba(17,17,24,0.8)',
          border: '1px solid rgba(0,245,160,0.12)',
          boxShadow: '0 0 40px rgba(0,245,160,0.05)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(0,245,160,0.1), rgba(124,58,237,0.1))',
            border: '1px solid rgba(0,245,160,0.2)',
          }}
        >
          <Zap className="w-8 h-8 animate-pulse-glow" style={{ color: '#00F5A0' }} />
        </div>

        <h1
          className="text-2xl font-bold mb-3"
          style={{ fontFamily: 'var(--font-display)', color: '#EEEEFF' }}
        >
          Workspace IDE
        </h1>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: '#5C5C7A', maxWidth: '440px', margin: '0 auto 32px' }}>
          The full IDE workspace is being built phase by phase. The design system, store, and shell are live. WebContainer, Monaco, xterm.js, and the AI Agent panel come next.
        </p>

        {/* Phase checklist */}
        <div className="text-left space-y-3 mb-8">
          {[
            { phase: 'Phase 1', label: 'Foundation — Design system, Zustand store, AppShell', done: true },
            { phase: 'Phase 2', label: 'WebContainer — Real filesystem, process.spawn, FS API', done: false },
            { phase: 'Phase 3', label: 'Monaco Editor — Custom theme, FS sync, multi-tab', done: false },
            { phase: 'Phase 4', label: 'Terminal — xterm.js, WebContainer spawn, multi-tab', done: false },
            { phase: 'Phase 5', label: 'File Explorer — Real FS tree, context menu, drag-drop', done: false },
            { phase: 'Phase 6', label: 'Agent Chat — Streaming, ActionCard, DiffPreview', done: false },
          ].map((item) => (
            <div
              key={item.phase}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: item.done ? 'rgba(0,245,160,0.04)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${item.done ? 'rgba(0,245,160,0.15)' : 'rgba(255,255,255,0.04)'}`,
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{
                  background: item.done ? '#00F5A0' : 'rgba(255,255,255,0.06)',
                  color: item.done ? '#060609' : '#3A3A52',
                }}
              >
                {item.done ? '✓' : '○'}
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className="text-xs font-semibold mr-2"
                  style={{ color: item.done ? '#00F5A0' : '#5C5C7A' }}
                >
                  {item.phase}
                </span>
                <span className="text-xs" style={{ color: item.done ? '#9494B8' : '#3A3A52' }}>
                  {item.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Panel previews */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: FolderOpen, label: 'File Explorer', desc: 'Real WebContainer FS', color: '#00F5A0' },
            { icon: Code2, label: 'Monaco Editor', desc: 'Custom YFitOps theme', color: '#9B6EF5' },
            { icon: Terminal, label: 'Terminal Panel', desc: 'Real xterm.js + bash', color: '#38BDF8' },
            { icon: Bot, label: 'AI Agent Chat', desc: 'Streaming + ActionCards', color: '#FBBF24' },
          ].map((panel) => (
            <div
              key={panel.label}
              className="rounded-xl p-4 text-left"
              style={{
                background: '#16161F',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <panel.icon className="w-5 h-5 mb-2" style={{ color: panel.color }} />
              <p className="text-xs font-semibold mb-0.5" style={{ color: '#9494B8' }}>{panel.label}</p>
              <p className="text-xs" style={{ color: '#3A3A52' }}>{panel.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

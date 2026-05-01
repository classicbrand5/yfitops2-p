// ─────────────────────────────────────────────────────────
// CommandPalette — Cmd+K / Ctrl+K global palette
// Uses cmdk for fuzzy search over a typed command registry.
// ─────────────────────────────────────────────────────────

import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { useAppStore } from '@/store/useAppStore';
import {
  LayoutDashboard, Zap, Terminal, Bot, BarChart2,
  Settings, CreditCard, FolderOpen, Code2, Sun, Moon,
  SplitSquareHorizontal, SplitSquareVertical, Maximize2, X,
} from 'lucide-react';

// ── Command type ──────────────────────────────────────────
interface PaletteCommand {
  id: string;
  label: string;
  description?: string;
  Icon: React.ElementType;
  iconColor?: string;
  group: string;
  shortcut?: string[];
  action: () => void;
}

// ═════════════════════════════════════════════════════════
// CommandPalette
// ═════════════════════════════════════════════════════════
export function CommandPalette() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    commandPaletteOpen,
    closeCommandPalette,
    setLayoutMode,
    toggleTheme,
    theme,
    openTabs,
    setActiveTab,
    createNewConversation,
  } = useAppStore();

  // Focus input when opened
  useEffect(() => {
    if (commandPaletteOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [commandPaletteOpen]);

  const close = useCallback(() => closeCommandPalette(), [closeCommandPalette]);

  // ── Command registry ──────────────────────────────────
  const commands: PaletteCommand[] = [
    // Navigation
    { id: 'nav-dashboard', label: 'Go to Dashboard', Icon: LayoutDashboard, iconColor: '#00F5A0', group: 'Navigation', action: () => { navigate('/dashboard'); close(); } },
    { id: 'nav-workspace', label: 'Go to Workspace',  Icon: Code2,           iconColor: '#9B6EF5', group: 'Navigation', action: () => { navigate('/workspace'); close(); } },
    { id: 'nav-builds',    label: 'Build Monitor',    Icon: Zap,             iconColor: '#FBBF24', group: 'Navigation', action: () => { navigate('/builds'); close(); } },
    { id: 'nav-analytics', label: 'Analytics',        Icon: BarChart2,       iconColor: '#38BDF8', group: 'Navigation', action: () => { navigate('/analytics'); close(); } },
    { id: 'nav-settings',  label: 'Settings',         Icon: Settings,        iconColor: '#5C5C7A', group: 'Navigation', action: () => { navigate('/settings'); close(); } },
    { id: 'nav-billing',   label: 'Billing',          Icon: CreditCard,      iconColor: '#FF9F43', group: 'Navigation', action: () => { navigate('/billing'); close(); } },

    // Layout
    { id: 'layout-h',    label: 'Layout: Split Horizontal', Icon: SplitSquareHorizontal, iconColor: '#00F5A0', group: 'Layout', shortcut: ['Alt', 'H'], action: () => { setLayoutMode('split-horizontal'); close(); } },
    { id: 'layout-v',    label: 'Layout: Split Vertical',   Icon: SplitSquareVertical,   iconColor: '#00F5A0', group: 'Layout', shortcut: ['Alt', 'V'], action: () => { setLayoutMode('split-vertical'); close(); } },
    { id: 'layout-e',    label: 'Layout: Editor Only',      Icon: Code2,                 iconColor: '#9B6EF5', group: 'Layout', shortcut: ['Alt', 'E'], action: () => { setLayoutMode('editor-only'); close(); } },
    { id: 'layout-t',    label: 'Layout: Terminal Only',    Icon: Terminal,              iconColor: '#38BDF8', group: 'Layout', shortcut: ['Alt', 'T'], action: () => { setLayoutMode('terminal-only'); close(); } },
    { id: 'layout-c',    label: 'Layout: Chat Only',        Icon: Bot,                   iconColor: '#FBBF24', group: 'Layout', shortcut: ['Alt', 'C'], action: () => { setLayoutMode('chat-only'); close(); } },
    { id: 'layout-full', label: 'Layout: Full IDE',         Icon: Maximize2,             iconColor: '#00F5A0', group: 'Layout',                         action: () => { setLayoutMode('full-ide'); close(); } },

    // Agent
    { id: 'agent-new', label: 'New AI Conversation', Icon: Bot, iconColor: '#FBBF24', group: 'Agent', action: () => { createNewConversation(); navigate('/workspace'); close(); } },

    // Appearance
    {
      id: 'theme-toggle',
      label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      Icon: theme === 'dark' ? Sun : Moon,
      iconColor: '#FBBF24',
      group: 'Appearance',
      shortcut: ['Ctrl', 'Shift', 'L'],
      action: () => { toggleTheme(); close(); },
    },

    // Open tabs (dynamic)
    ...openTabs.map((tab) => ({
      id: `tab-${tab.id}`,
      label: tab.name,
      description: tab.path,
      Icon: FolderOpen,
      iconColor: '#5C5C7A',
      group: 'Open Tabs',
      action: () => { setActiveTab(tab.id); navigate('/workspace'); close(); },
    })),
  ];

  const groups = Array.from(new Set(commands.map((c) => c.group)));

  if (!commandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]"
      style={{ background: 'rgba(6,6,9,0.72)', backdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden animate-scale-in"
        style={{
          background: '#111118',
          border: '1px solid rgba(0,245,160,0.15)',
          boxShadow: '0 0 60px rgba(0,245,160,0.08), 0 40px 80px rgba(0,0,0,0.6)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Command label="Command palette" className="flex flex-col" style={{ background: 'transparent' }}>
          {/* Search input */}
          <div
            className="flex items-center gap-3 px-4 py-3.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Zap className="w-4 h-4 flex-shrink-0" style={{ color: '#00F5A0' }} aria-hidden="true" />
            <Command.Input
              ref={inputRef}
              placeholder="Type a command or search…"
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: '#EEEEFF', fontFamily: 'var(--font-body)' }}
            />
            <button
              type="button"
              onClick={close}
              className="text-xs px-2 py-1 rounded"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#5C5C7A', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'var(--font-mono)' }}
              aria-label="Close command palette"
            >
              Esc
            </button>
          </div>

          {/* Results list */}
          <Command.List
            className="overflow-y-auto max-h-[380px] py-2"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A35 transparent' }}
          >
            <Command.Empty
              className="flex flex-col items-center justify-center py-12 text-sm"
              style={{ color: '#3A3A52' }}
            >
              <X className="w-8 h-8 mb-3 opacity-30" aria-hidden="true" />
              No commands found
            </Command.Empty>

            {groups.map((group) => {
              const groupCmds = commands.filter((c) => c.group === group);
              if (groupCmds.length === 0) return null;
              return (
                <Command.Group key={group} heading={group} className="px-1">
                  {groupCmds.map((cmd) => (
                    <Command.Item
                      key={cmd.id}
                      value={`${cmd.label} ${cmd.description ?? ''}`}
                      onSelect={cmd.action}
                      className="cmd-item flex items-center gap-3 px-3 py-2.5 rounded-lg mx-1 mb-0.5 cursor-pointer outline-none"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `${cmd.iconColor ?? '#00F5A0'}14`,
                          border: `1px solid ${cmd.iconColor ?? '#00F5A0'}22`,
                        }}
                      >
                        <cmd.Icon className="w-3.5 h-3.5" style={{ color: cmd.iconColor ?? '#00F5A0' }} aria-hidden="true" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block truncate" style={{ color: '#EEEEFF' }}>
                          {cmd.label}
                        </span>
                        {cmd.description && (
                          <span className="text-xs block truncate" style={{ color: '#3A3A52' }}>
                            {cmd.description}
                          </span>
                        )}
                      </div>

                      {cmd.shortcut && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {cmd.shortcut.map((key) => (
                            <kbd
                              key={key}
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: '#5C5C7A',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-4 py-2.5 text-xs"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#3A3A52', fontFamily: 'var(--font-mono)' }}
          >
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>Esc close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

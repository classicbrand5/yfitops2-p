import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';

/**
 * Global keyboard shortcut handler.
 * Registered once at the app level via useEffect on window.
 *
 * Shortcuts:
 *  Cmd/Ctrl+K or Cmd/Ctrl+Shift+P  → open command palette
 *  Cmd/Ctrl+P                       → open command palette (file search)
 *  Cmd/Ctrl+B                       → toggle sidebar collapsed
 *  Cmd/Ctrl+`                       → focus terminal panel
 *  Cmd/Ctrl+Shift+E                 → focus explorer panel
 *  Alt+H/V/E/T/C                    → layout mode
 *  Cmd/Ctrl+Shift+L                 → toggle theme
 *  Cmd/Ctrl+W                       → close active tab
 *  Escape                           → close command palette
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const {
    openCommandPalette,
    closeCommandPalette,
    commandPaletteOpen,
    setLayoutMode,
    toggleTheme,
    activeTabId,
    closeTab,
    sidebarCollapsed,
    setSidebarCollapsed,
    setFocusedPanel,
  } = useAppStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrl  = isMac ? e.metaKey : e.ctrlKey;
      const shift = e.shiftKey;
      const alt   = e.altKey;
      const key   = e.key.toLowerCase();

      // Skip shortcuts when typing inside input / textarea / contenteditable
      // EXCEPT for the special meta-key combos we specifically want to intercept
      const target = e.target as HTMLElement;
      const isTyping =
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
        !ctrl && !alt;
      if (isTyping) return;

      // ── Command Palette ──────────────────────────────
      // Cmd+K, Cmd+Shift+P — toggle palette
      if ((ctrl && key === 'k') || (ctrl && shift && key === 'p')) {
        e.preventDefault();
        commandPaletteOpen ? closeCommandPalette() : openCommandPalette();
        return;
      }

      // Cmd+P — open palette (file search intent, same UI for now)
      if (ctrl && !shift && key === 'p') {
        // Only if not inside Monaco editor (Monaco has its own Ctrl+P handler)
        if (!(target.closest('.monaco-editor'))) {
          e.preventDefault();
          openCommandPalette();
        }
        return;
      }

      // Escape — close palette
      if (key === 'escape' && commandPaletteOpen) {
        e.preventDefault();
        closeCommandPalette();
        return;
      }

      // ── Sidebar Toggle ───────────────────────────────
      // Cmd/Ctrl+B
      if (ctrl && !shift && !alt && key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(!sidebarCollapsed);
        return;
      }

      // ── Panel Focus ──────────────────────────────────
      // Cmd/Ctrl+` → terminal
      if (ctrl && !shift && !alt && (key === '`' || e.code === 'Backquote')) {
        e.preventDefault();
        setFocusedPanel('terminal');
        setLayoutMode('split-horizontal'); // ensure terminal is visible
        return;
      }

      // Cmd/Ctrl+Shift+E → explorer
      if (ctrl && shift && !alt && key === 'e') {
        e.preventDefault();
        setFocusedPanel('explorer');
        return;
      }

      // ── Layout Shortcuts (Alt+key) ───────────────────
      if (alt && !ctrl && !shift) {
        switch (key) {
          case 'h':
            e.preventDefault();
            setLayoutMode('split-horizontal');
            return;
          case 'v':
            e.preventDefault();
            setLayoutMode('split-vertical');
            return;
          case 'e':
            e.preventDefault();
            setLayoutMode('editor-only');
            return;
          case 't':
            e.preventDefault();
            setLayoutMode('terminal-only');
            return;
          case 'c':
            e.preventDefault();
            setLayoutMode('chat-only');
            return;
        }
      }

      // ── Theme Toggle ─────────────────────────────────
      if (ctrl && shift && key === 'l') {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // ── Tab Management ───────────────────────────────
      if (ctrl && !shift && key === 'w' && activeTabId) {
        // Only close tab if Monaco editor is focused
        // (avoid closing browser tab when not in editor context)
        if (target.closest('.monaco-editor') || target.closest('[data-editor-tab]')) {
          e.preventDefault();
          closeTab(activeTabId);
        }
        return;
      }

      // Suppress unused-variable warning for navigate
      void navigate;
    },
    [
      commandPaletteOpen,
      openCommandPalette,
      closeCommandPalette,
      setLayoutMode,
      toggleTheme,
      activeTabId,
      closeTab,
      sidebarCollapsed,
      setSidebarCollapsed,
      setFocusedPanel,
      navigate,
    ],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

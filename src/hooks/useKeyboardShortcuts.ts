import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';

/**
 * Global keyboard shortcut handler.
 * Registered once at the app level via useEffect on window.
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
    markTabDirty,
  } = useAppStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrl = isMac ? e.metaKey : e.ctrlKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      const key = e.key.toLowerCase();

      // ── Command Palette ──────────────────────────────
      if ((ctrl && key === 'k') || (ctrl && shift && key === 'p')) {
        e.preventDefault();
        commandPaletteOpen ? closeCommandPalette() : openCommandPalette();
        return;
      }

      // Close palette with Escape
      if (key === 'escape' && commandPaletteOpen) {
        e.preventDefault();
        closeCommandPalette();
        return;
      }

      // ── Layout Shortcuts ─────────────────────────────
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

      // ── Navigation ───────────────────────────────────
      if (ctrl && key === 'p') {
        e.preventDefault();
        openCommandPalette();
        return;
      }

      // ── Tab Management ───────────────────────────────
      if (ctrl && key === 'w' && activeTabId) {
        e.preventDefault();
        closeTab(activeTabId);
        return;
      }
    },
    [
      commandPaletteOpen,
      openCommandPalette,
      closeCommandPalette,
      setLayoutMode,
      toggleTheme,
      activeTabId,
      closeTab,
      navigate,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

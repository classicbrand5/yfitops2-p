# Phase 3: AppShell Polish + SplitLayout + CommandPalette — ✅ Complete

**Date**: 2026-05-01  
**Status**: Done  
**Depends on**: Phase 1 (Foundation), Phase 2 (Supabase Auth)

---

## What Was Built

### `src/components/layout/SplitLayout.tsx`

Resizable two-pane split with live drag handle:

- **`direction`**: `'horizontal'` (left/right) | `'vertical'` (top/bottom)
- **Drag handle**: 5px wide/tall with centered 32px grip, accent color (`#00F5A0`) on drag
- **Ghost line**: Fixed-position `1px` overlay follows cursor during drag for visual feedback
- **Clamping**: `minRatio=0.2`, `maxRatio=0.8` prevent panels from collapsing entirely
- **External ratio**: Syncs with `useAppStore.splitRatio` via `onRatioChange` callback
- **StrictMode safe**: `dragStartRef` carries the start position and start ratio, avoiding stale closure issues
- **Accessibility**: `role="separator"`, `aria-orientation`, `aria-label` on the handle

```typescript
<SplitLayout
  direction="horizontal"
  ratio={splitRatio}
  onRatioChange={setSplitRatio}
  primarySlot={<ExplorerPanel />}
  secondarySlot={<EditorPanel />}
/>
```

---

### `src/components/ui/CommandPalette.tsx`

Cmd+K / Ctrl+K fuzzy-search command palette:

- **Library**: `cmdk` — composable command menu primitives
- **Groups**: Navigation | Layout | Agent | Appearance | Open Tabs
- **Navigation commands**: Dashboard, Workspace, Builds, Analytics, Settings, Billing
- **Layout commands**: Split H/V, Editor Only, Terminal Only, Chat Only, Full IDE — each with Alt+key shortcut chips
- **Dynamic commands**: Open editor tabs appear as "Open Tabs" group with path description
- **Agent**: New conversation → navigates to workspace
- **Appearance**: Theme toggle with dynamic label
- **Keyboard**: ↑↓ navigate, ↵ select, Esc close
- **Backdrop**: `blur(6px)` dark overlay, click-outside closes
- **Animation**: `animate-scale-in` on the palette container
- **Footer hint**: monospace legend row

---

### `src/components/features/PanelShell.tsx`

Generic IDE panel wrapper used by all 4 workspace panels:

- Consistent panel header (icon + UPPERCASE label + optional actions slot)
- Focus ring: `rgba(0,245,160,0.18)` border on focused panel
- `setFocusedPanel(panelId)` on `onFocus` and `onMouseDown`
- Correct ARIA: `role="region"`, `aria-label="{title} panel"`
- Actions slot for panel-specific buttons (+ new terminal, + new conversation, etc.)

---

### `src/pages/WorkspacePage.tsx` — Full layout scaffold

All 6 layout modes now render real split pane structures:

| Mode | Layout |
|---|---|
| `split-horizontal` (default) | [Explorer+Editor (25/75)] | [Terminal+Chat (55/45 vertical)] |
| `split-vertical` | [Explorer+Editor] top / [Terminal+Chat] bottom |
| `editor-only` | Full-width EditorPanel |
| `terminal-only` | Full-width TerminalPanel |
| `chat-only` | Full-width ChatPanel |
| `full-ide` | 3-column: [Explorer (20%)] \| [Editor+Terminal vertical (split)] \| [Chat] |

Each panel is a `PanelShell` wrapping a placeholder body (shown until Phase 4–6 imports real components):

- **ExplorerBody**: "Connect a repo" placeholder with FolderOpen icon
- **EditorBody**: Tab bar (functional for open tabs) + placeholder; tabs have ×-close and dirty indicators
- **TerminalBody**: Shows session output array if session exists; otherwise placeholder
- **ChatBody**: Renders real `messages` from store if available; shows thinking spinner; has disabled input

**Real tab management** works already:
- `setActiveTab()`, `closeTab()`, dirty indicator (`isDirty` dot)
- `createTerminalSession()` wired to + button in TerminalPanel header
- `createNewConversation()` wired to + button in ChatPanel header

---

### `src/components/layout/AppShell.tsx` — Updated

- **`useKeyboardShortcuts()`** now called inside `AppShell` (inside Router context — no more "must be in Router" risk)
- **`<CommandPalette />`** rendered inside AppShell — it's a portal-like overlay that reads `commandPaletteOpen` from store and renders nothing when closed

```typescript
// AppShell now includes:
useKeyboardShortcuts();  // Registers Cmd+K, Alt+H/V/E/T/C, Ctrl+Shift+L, Ctrl+W
// ...
<CommandPalette />       // Renders overlay when commandPaletteOpen === true
```

---

## Keyboard Shortcuts (Live)

| Shortcut | Action |
|---|---|
| `Cmd+K` / `Ctrl+K` | Open command palette |
| `Cmd+Shift+P` / `Ctrl+Shift+P` | Open command palette |
| `Esc` | Close command palette |
| `Alt+H` | Layout: Split Horizontal |
| `Alt+V` | Layout: Split Vertical |
| `Alt+E` | Layout: Editor Only |
| `Alt+T` | Layout: Terminal Only |
| `Alt+C` | Layout: Chat Only |
| `Ctrl+Shift+L` | Toggle theme |
| `Ctrl+W` | Close active tab |

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| `cmdk` for CommandPalette | Composable, headless, accessible. Handles fuzzy search and keyboard navigation natively. Styled via Tailwind + inline styles to match design system. |
| `SplitLayout` is generic (not IDE-specific) | Can be composed arbitrarily. `full-ide` uses 3 levels of nesting. Each level is independent with its own ratio. |
| `PanelShell` as the single panel wrapper | Eliminates copy-paste of header + focus ring logic. Decoupled from what's rendered inside. |
| Panel bodies are placeholders | Real component imports (`FileExplorer`, `MonacoEditor`, `TerminalPanel`, `AgentChat`) are dropped in as Phase 4–6 complete without changing the layout composition logic. |
| `createTerminalSession(crypto.randomUUID())` | Uses browser crypto for unique session IDs without importing a library. Safe because we never need predictable IDs here. |

---

## Known Gaps (Addressed in Later Phases)

- `EditorBody` shows tab bar but no real Monaco editor — Phase 3 (actual Monaco integration) wires this
- `TerminalBody` renders output array text but no xterm.js — Phase 4 handles this
- `ChatBody` input is disabled — Phase 6 wires the agent inference call
- `ExplorerBody` shows placeholder — Phase 5 wires real WebContainer FS tree

---

## Next Phase

**Phase 4: WebContainer + Real FS**
- Singleton WebContainer boot with error surface
- `readFile`, `writeFile`, `readdir`, `mkdir`, `unlink`, `exists`, `buildFileTree()`
- Process `spawn` with `stdout` streaming → `appendTerminalOutput`
- `isDangerousCommand` safety gate
- Integrate into WorkspacePage to load real file tree on connect

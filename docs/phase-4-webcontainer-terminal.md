# Phase 4: WebContainer + Real FS + Terminal — ✅ Complete

**Date**: 2026-05-01  
**Status**: Done  
**Depends on**: Phase 1 (Foundation), Phase 2 (Supabase Auth), Phase 3 (Workspace Layout)

---

## What Was Built

### New Files

| File | Purpose |
|---|---|
| `src/core/webcontainer/webcontainer.ts` | Singleton boot — `WebContainer.boot()` runs exactly once per page load |
| `src/core/webcontainer/fs.ts` | FS API wrappers: readFile, writeFile, readDir, mkdir, unlink, exists, buildFileTree, mountStarterFiles |
| `src/core/webcontainer/process.ts` | Process API: spawnProcess (safety-gated) + spawnTerminalShell (jsh) |
| `src/hooks/useWebContainer.ts` | React hook that boots the container, mounts starter files, builds file tree, exposes typed fs/process facades |
| `src/components/features/FileTree.tsx` | Real recursive file tree — reads from Zustand store, expand/collapse, double-click → openFile |
| `src/components/features/RealTerminalPanel.tsx` | Full xterm.js terminal wired to WebContainer jsh shell with ResizeObserver + FitAddon |

### Modified Files

| File | Change |
|---|---|
| `index.html` | Added COOP/COEP headers required for SharedArrayBuffer (WebContainer dependency) |
| `src/pages/WorkspacePage.tsx` | Wired all real components; added boot progress overlay and error surface |

---

## Architecture

### WebContainer Singleton Pattern

```typescript
// webcontainer.ts — boots once, resolves to same instance
let instancePromise: Promise<WebContainer> | null = null;

export function getWebContainer(): Promise<WebContainer> {
  if (!instancePromise) {
    instancePromise = WebContainer.boot();
  }
  return instancePromise;
}
```

- `useWebContainer()` called in `WorkspacePage` and `RealTerminalPanel` — both resolve to the **same** container
- No risk of double-boot even in React StrictMode because the Promise is stored outside the component tree

### FS Module

```typescript
// Starter files mounted via WebContainer.mount() — idempotent
const STARTER_FILES: FileSystemTree = {
  'package.json': { file: { contents: '...' } },
  'index.js':     { file: { contents: '...' } },
  'README.md':    { file: { contents: '...' } },
  src: {
    directory: {
      'hello.js': { file: { contents: '...' } }
    }
  }
};
```

Tree builder (`buildFileTree`):
- Recursive, handles depth
- Skips `.` (dotfiles) and `node_modules`
- Sorts: directories first, then files, both alphabetical

### Terminal Architecture

```
User types → xterm.js onData → WritableStreamDefaultWriter (shell.input)
Shell stdout → ReadableStream → pipeTo WritableStream → term.write()
ResizeObserver → FitAddon.fit() → shellProcess.resize({ cols, rows })
```

- `RealTerminalPanel` uses `useRef` for xterm + shell process to avoid React re-render issues
- `cleanedUpRef` prevents `term.write()` after component unmount
- `ResizeObserver` replaces `window.resize` — properly detects panel resize from `SplitLayout` drag

### Safety Gate

```typescript
// process.ts — applied to non-terminal spawns only
const fullCmd = `${command} ${args.join(' ')}`.trim();
if (isDangerousCommand(fullCmd)) {
  throw new Error(`[Safety Gate] Command blocked: ${fullCmd}`);
}
```

Terminal shell (`jsh`) is spawned directly and is intentionally **not** gated — the user has full control of the interactive terminal, identical to any local shell.

---

## FileTree Component

Key behaviors:
- **Single-click directory**: expand/collapse (`toggleFolder`)
- **Double-click file**: open in editor tab (`openFile(path, language)`)
- **Keyboard**: `Enter` / `Space` activates item — fully accessible
- **Active file highlight**: mint accent on the currently-open file
- **Language detection**: `getLanguageFromPath(path)` for correct Monaco mode later
- **Icon set**: File, FileCode, FileJson, FileText, FileType, Folder, FolderOpen — all from lucide-react

---

## WorkspacePage Changes

1. `useWebContainer()` called once at root level
2. **Boot overlay**: `isBooting === true` shows spinner over the entire workspace
3. **Error surface**: if `bootError` is set, replaces the workspace with a clear error card (mentions COOP/COEP headers)
4. `container` passed down to `TerminalPanel` → `TerminalBody` → `RealTerminalPanel`
5. `ExplorerPanel` gets an `onRefresh` prop → calls `refreshFileTree()` to re-scan FS after mutations
6. All 6 layout modes preserved from Phase 3

---

## SharedArrayBuffer Requirements

WebContainer requires `SharedArrayBuffer` which is only available in cross-origin isolated contexts.

Added to `index.html`:
```html
<meta http-equiv="Cross-Origin-Embedder-Policy" content="require-corp" />
<meta http-equiv="Cross-Origin-Opener-Policy" content="same-origin" />
```

OnSpace's preview environment serves these headers automatically. If deploying to a custom domain, the HTTP server must add:
```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

---

## Keyboard / UX Flows

| Action | Result |
|---|---|
| Load workspace | Container boots, starter files mounted, tree appears |
| Click folder in tree | Expand/collapse |
| Double-click file | Opens editor tab (path shown in EditorBody) |
| Click ⊕ in Terminal header | Creates new terminal session |
| Type in terminal | Real bash-like commands via jsh |
| `node index.js` in terminal | Runs actual Node.js in the browser sandbox |
| `npm install lodash` in terminal | Installs packages into WebContainer FS |
| Drag split handle | Resizes terminal → `ResizeObserver` adjusts xterm rows/cols |
| Click ⟳ in Explorer header | Re-scans FS and updates file tree |

---

## Next Phase

**Phase 5: Monaco Editor**
- Install `@monaco-editor/react`
- Create custom YFitOps dark theme (mint + violet accents, JetBrains Mono)
- Wire file open from `FileTree` → read file content → Monaco value
- Debounced 500ms FS writes back to WebContainer on change
- `Ctrl+S` / `Cmd+S` save shortcut → immediate write + `markTabDirty(false)`
- Dirty indicators (dot on tab) linked to `markTabDirty`
- Language mode auto-detection from `EditorTab.language`

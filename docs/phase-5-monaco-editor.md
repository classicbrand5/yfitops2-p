# Phase 5 — Monaco Editor

**Status:** ✅ Complete  
**Deployed:** https://yfitops2.pages.dev

---

## Goal

Replace the editor placeholder in `WorkspacePage` with a fully functional Monaco code editor wired to the WebContainer filesystem.

---

## What Was Built

### Files Created

| File | Purpose |
|------|---------|
| `src/editor/yfitopsTheme.ts` | Custom Monaco theme matching design system |
| `src/editor/monacoEnv.ts` | Monaco web worker environment setup (must import before monaco) |
| `src/components/features/Editor/MonacoEditor.tsx` | Full Monaco editor component |

### Files Modified

| File | Change |
|------|--------|
| `src/pages/WorkspacePage.tsx` | Replaced `EditorBody` placeholder with `<MonacoEditor />` |
| `src/main.tsx` | Added `import './editor/monacoEnv'` as first import |
| `vite.config.ts` | Added Monaco worker chunks and optimizeDeps |
| `index.html` | Updated fonts: Orbitron → Space Grotesk + Inter |
| `.github/workflows/deploy.yml` | Auto-installs `monaco-editor` if absent from package.json |

---

## Architecture Decisions

### 1. One ITextModel per file path
Each opened file gets a `monaco.editor.ITextModel` stored in `modelsRef` (a `Map<path, { model, viewState }>`). Switching tabs saves the current view state and restores it — preserving scroll position, cursor, and undo/redo history.

### 2. `automaticLayout: false` + ResizeObserver
Monaco's built-in `automaticLayout: true` polls with `setInterval`, which is wasteful. Instead, a `ResizeObserver` on the container div calls `editor.layout()` on every dimension change — triggered correctly when SplitLayout panels are dragged.

### 3. Monaco worker setup via `?worker` imports
`monacoEnv.ts` imports each language worker using Vite's `?worker` suffix and installs them as `self.MonacoEnvironment.getWorker`. This gives TypeScript IntelliSense, JSON schema validation, CSS completions, and HTML formatting without requiring a CDN.

### 4. URI scheme: `yfitops://fs/<path>`
Each model is keyed by `monaco.Uri.parse('yfitops://fs/<path>')` to avoid collisions with built-in `file://` URIs, which Monaco treats specially.

### 5. Ctrl/Cmd+S → WebContainer FS write
The save shortcut writes model content to WebContainer via `fs.writeFile(path, content)` and clears the dirty flag in Zustand. An in-flight guard (`saveInFlightRef`) prevents concurrent saves.

### 6. Dirty indicators
Each `model.onDidChangeContent` handler marks the tab as dirty in the Zustand store. The tab bar renders a mint dot when `tab.isDirty === true`. Saving clears it.

---

## Custom Theme: `yfitops-dark`

Built on `vs-dark` with:

| Token | Color | Role |
|-------|-------|------|
| `keyword` | `#9B6EF5` (violet-400) | `import`, `const`, `return` |
| `string` | `#00F5A0` (mint) | String literals |
| `number` | `#38BDF8` (info blue) | Numeric literals |
| `type` | `#67E3FF` | TypeScript types |
| `comment` | `#4A4A6A` italic | Comments |
| `constant` | `#FBBF24` (warning yellow) | `true`, `null`, enums |
| Cursor | `#00F5A0` | Mint cursor |
| Selection | `#00F5A030` | Mint tint |
| Background | `#09090F` | Void dark |

Full token list, minimap colors, gutter diff indicators, bracket pair colorization, and suggest widget colors are all defined to match the design system.

---

## Editor Options

```ts
{
  fontSize: 13,
  fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
  fontLigatures: true,
  lineHeight: 20,
  minimap: { enabled: true, scale: 1, renderCharacters: false },
  scrollBeyondLastLine: false,
  automaticLayout: false,       // driven by ResizeObserver
  tabSize: 2,
  bracketPairColorization: { enabled: true },
  guides: { indentation: true, bracketPairs: true },
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
  padding: { top: 12, bottom: 12 },
}
```

---

## Font Update

Replaced **Orbitron** (retro sci-fi) with **Space Grotesk** (geometric, modern) as the display font. Body font changed from **DM Sans** to **Inter** — the most legible sans-serif at small IDE sizes.

| Token | Before | After |
|-------|--------|-------|
| `--font-display` | Orbitron | Space Grotesk |
| `--font-body` | DM Sans | Inter |
| `--font-mono` | JetBrains Mono | JetBrains Mono *(unchanged)* |

---

## Keyboard Shortcuts Registered

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save file to WebContainer FS, clear dirty flag |
| `Ctrl/Cmd + W` | Close active tab |

---

## Known Limitations

- **No IntelliSense for project dependencies** — TypeScript worker has type info for built-ins but not installed `node_modules` (would require mounting the full `node_modules` type definitions).
- **No format-on-save** — intentionally disabled to avoid unexpected reformatting; can be added via `editor.getAction('editor.action.formatDocument').run()` in the save handler.
- **Monaco bundle size** — ~6MB (gzipped: ~2MB). Split into its own chunk via Vite's `manualChunks`. Lazy-load via `React.lazy` is possible in a future optimization pass.

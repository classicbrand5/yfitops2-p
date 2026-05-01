# YFitOps — Humanoid Reference Document

> **Living document.** Updated after every phase. This is the single source of truth for every design decision, architectural choice, dependency, plugin, and implementation detail across the entire YFitOps IDE project.

**Live URL:** https://yfitops2.pages.dev  
**Last updated:** Phase 7 — Agent Action Execution complete

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Frontend Design System](#2-frontend-design-system)
3. [Typography & Fonts](#3-typography--fonts)
4. [Color System](#4-color-system)
5. [Component Architecture](#5-component-architecture)
6. [Layout System](#6-layout-system)
7. [State Management](#7-state-management)
8. [Backend Architecture](#8-backend-architecture)
9. [Database Schema](#9-database-schema)
10. [AI Agent System](#10-ai-agent-system)
11. [WebContainer & Terminal](#11-webcontainer--terminal)
12. [Monaco Editor](#12-monaco-editor)
13. [Authentication](#13-authentication)
14. [Plugins & Libraries](#14-plugins--libraries)
15. [Build & Deployment](#15-build--deployment)
16. [Project Structure](#16-project-structure)
17. [Modals & Overlays](#17-modals--overlays)
18. [Keyboard Shortcuts](#18-keyboard-shortcuts)
19. [Tweaks & Adjustments](#19-tweaks--adjustments)
20. [Phase History](#20-phase-history)
21. [Deferred Items](#21-deferred-items)

---

## 1. Project Overview

**YFitOps AI Agent** is a fully browser-based IDE that allows developers to:
- Connect GitHub repositories
- Write, read, and edit production code in a Monaco editor
- Run real terminal commands via a WebContainer-hosted Node.js sandbox
- Chat with an autonomous AI agent (Gemini 2.5 Flash) that can suggest and execute code changes, run commands, and open PRs
- Do all of this in a single browser tab — no local install, no copy-paste context-switching

**Target audience:** Solo developers and small teams who want an AI-pair-programmer embedded directly in their development environment.

**Core philosophy:**
- The AI agent has full workspace context (file tree, open files, terminal output)
- Every agent action is traceable, confirmable, and reversible
- The IDE never feels like a chatbot with a code pane bolted on — it feels like a real editor

---

## 2. Frontend Design System

### 2.1 Physical Metaphor

**Glass + Void.** The UI is built on a deep void background (`#060609` → `#0A0A0A`) with frosted-glass panels that have subtle borders and minimal shadows. The visual language is: *depth without noise*.

- **Panels:** `rgba(13,13,20,0.97)` background + `rgba(255,255,255,0.08)` border
- **Elevated surfaces:** `rgba(255,255,255,0.04)` lift
- **Inputs:** `#13131C` with `rgba(255,255,255,0.07)` border

### 2.2 Signature Features

1. **Electric mint accent** (`#00F5A0`) — used for primary CTAs, active states, dirty-file indicators, terminal cursor, save confirmations
2. **Deep violet accent** (`#7C3AED` / `#9B6EF5`) — used for AI/agent elements (Bot icon, keyword highlighting, assistant message avatar)
3. **Monospace-first aesthetic** — most interactive data (file paths, tab names, terminal output) uses JetBrains Mono, reinforcing the IDE feeling

### 2.3 Border Radius Scale

| Use | Value |
|-----|-------|
| Panels / cards | `12px` – `16px` (`rounded-xl`) |
| Buttons | `8px` – `12px` (`rounded-lg`) |
| Inputs | `8px` – `12px` (`rounded-xl`) |
| Badges / pills | `4px` – `6px` (`rounded`) |
| Avatars | `9999px` (`rounded-full`) |

### 2.4 Shadow Scale

No heavy drop shadows. Depth is communicated through:
- **Border luminosity** — brighter borders = higher elevation
- **Background opacity** — lighter backgrounds = more prominent surfaces
- **Inset borders** — `inset 0 0 0 1px rgba(255,255,255,0.05)` for glass effect on modals

---

## 3. Typography & Fonts

### 3.1 Font Stack

| Token | Family | Weight | Usage |
|-------|--------|--------|-------|
| `--font-display` | **Space Grotesk** | 500–700 | Panel headers, modal titles, branding |
| `--font-body` | **Inter** | 400–500 | All body text, labels, descriptions |
| `--font-mono` | **JetBrains Mono** | 400 | Code, terminal, file paths, tab names |

**Source:** All three fonts are loaded from Google Fonts via `<link>` in `index.html`.

```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### 3.2 Font History

- **Phase 1:** Orbitron (display) + DM Sans (body) — chosen for sci-fi/space aesthetic
- **Phase 5:** Swapped to Space Grotesk + Inter — more legible at small IDE sizes, less retro

### 3.3 Type Scale (within CSS variables)

```css
--font-size-xs:  11px;
--font-size-sm:  12px;
--font-size-base: 13px;   /* editor, terminal */
--font-size-md:  14px;    /* body labels */
--font-size-lg:  16px;    /* section headers */
--font-size-xl:  18px;    /* panel titles */
--font-size-2xl: 22px;    /* page titles */
```

---

## 4. Color System

All colors are defined as CSS custom properties in `src/index.css`. Component code **never uses raw hex** — it uses semantic tokens.

### 4.1 Primary Palette

| Token | Hex | Role |
|-------|-----|------|
| `--color-mint` | `#00F5A0` | Primary accent, CTAs, active states |
| `--color-violet` | `#7C3AED` | Secondary accent, AI elements |
| `--color-violet-400` | `#9B6EF5` | Softer violet for text on dark |
| `--color-info` | `#38BDF8` | Terminal highlights, info states |
| `--color-warning` | `#FBBF24` | Pending actions, warnings |
| `--color-danger` | `#FF4D6D` | Destructive actions, errors |
| `--color-success` | `#00F5A0` | Success states (shares mint) |

### 4.2 Neutral Palette

| Token | Hex | Role |
|-------|-----|------|
| `--color-void` | `#060609` | Page background |
| `--color-base` | `#0C0C12` | Workspace background |
| `--color-surface` | `#0D0D14` | Panel backgrounds |
| `--color-elevated` | `#13131C` | Input / card backgrounds |
| `--color-border` | `rgba(255,255,255,0.08)` | Default borders |
| `--color-text-primary` | `#EEEEFF` | Primary text |
| `--color-text-secondary` | `#C8C8E8` | Secondary text |
| `--color-text-muted` | `#7A7A99` | Muted labels |
| `--color-text-faint` | `#3A3A52` | Disabled / hint text |

### 4.3 Action Type Colors (Agent Chat)

| Action | Color |
|--------|-------|
| `read_file` | `#38BDF8` (info blue) |
| `write_file` | `#00F5A0` (mint) |
| `edit_file` | `#9B6EF5` (violet) |
| `delete_file` | `#FF4D6D` (danger) |
| `create_dir` | `#FBBF24` (warning) |
| `run_command` | `#22D3EE` (cyan) |
| `search_files` | `#38BDF8` (info blue) |
| `open_pr` | `#00F5A0` (mint) |

---

## 5. Component Architecture

### 5.1 Folder Organization

```
src/components/
├── ui/              # Low-level, reusable (shadcn/ui base + custom)
│   ├── CommandPalette.tsx
│   └── ConfirmModal.tsx
├── features/        # Domain-specific composites
│   ├── AgentChat.tsx
│   ├── FileTree.tsx
│   ├── PanelShell.tsx
│   ├── RealTerminalPanel.tsx
│   └── Editor/
│       └── MonacoEditor.tsx
└── layout/          # App-level structure
    ├── AppShell.tsx
    ├── Sidebar.tsx
    ├── SplitLayout.tsx
    ├── StatusBar.tsx
    └── TopBar.tsx
```

### 5.2 Key Components

#### `PanelShell`
Wraps every panel with a standard header (icon, title, action buttons). Props: `panelId`, `title`, `Icon`, `iconColor`, `actions`, `children`. All panels (Explorer, Editor, Terminal, Chat) use this component for visual consistency.

#### `SplitLayout`
Draggable two-panel layout with a 4px hit-area divider. Props: `direction` (`horizontal` | `vertical`), `ratio`, `onRatioChange`, `primarySlot`, `secondarySlot`. Min panel size: 20% / Max: 80%.

#### `FileTree`
Recursive tree renderer. Features: single-click expand/collapse for directories, double-click to open files in editor, active file highlight with mint left-border, language detection via `getLanguageFromPath()`. Reads from Zustand `fileTree` (populated by WebContainer FS scan).

#### `MonacoEditor`
Full Monaco editor with per-tab `ITextModel` + `ICodeEditorViewState` preservation. Uses `ResizeObserver` (not `automaticLayout: true`) for panel-resize-aware layout. Registers `Ctrl/Cmd+S` save and `Ctrl/Cmd+W` close-tab shortcuts.

#### `RealTerminalPanel`
xterm.js terminal wired to WebContainer jsh shell. `ResizeObserver` drives `fitAddon.fit()` + `shellProcess.resize()`. Cleanup on unmount: kills shell, closes writer, disposes xterm.

#### `AgentChat`
Full AI chat with: conversation history, `ThinkingDots` animation, auto-resize textarea, per-action-type `ActionCard` components with Apply/Review buttons, `ConfirmModal` for destructive actions, `executeAction()` bridge to WebContainer, file tree refresh after FS mutations.

#### `ConfirmModal`
Phase 7 confirmation dialog. Glassmorphism card, blurred backdrop, Escape-to-cancel, auto-focus on confirm button, destructive (red) vs approve (mint) visual variant. Props: `open`, `title`, `description`, `detail` (monospace code block), `isDestructive`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`.

---

## 6. Layout System

### 6.1 Layout Modes

Controlled by `layoutMode` in Zustand, toggled from `TopBar` buttons.

| Mode | Description |
|------|-------------|
| `split-horizontal` | Explorer + Editor | Terminal + Chat (default) |
| `split-vertical` | Explorer + Editor top | Terminal + Chat bottom |
| `full-ide` | Explorer sidebar | Editor+Terminal+Chat |
| `editor-only` | Full-screen editor panel |
| `terminal-only` | Full-screen terminal panel |
| `chat-only` | Full-screen AI chat panel |

### 6.2 Spacing Grid

**8px base grid.** All spacing uses multiples of 4/8/12/16/24/32/48/64px.

Panel padding: `p-2` (8px). Panel gap: `gap-2`. Inner content padding: `px-3 py-4`. All via Tailwind.

### 6.3 Z-Index Stack

| Layer | Z-Index | Elements |
|-------|---------|---------|
| Base | 0 | Panels, editor |
| Overlay | 10 | Boot loading screen |
| Panel header | 20 | Sticky panel headers |
| Command palette | 100 | `CommandPalette` |
| Confirm modal | 200 | `ConfirmModal` |
| Toast | 300+ | Sonner toasts |

---

## 7. State Management

### 7.1 Zustand Store

**File:** `src/store/useAppStore.ts`

**Middleware stack:** `subscribeWithSelector` → `persist` → `immer`

- `subscribeWithSelector` — enables fine-grained reactive subscriptions (`useAppStore(s => s.messages[id])`)
- `persist` — saves non-ephemeral state to `localStorage` under key `yfitops-app-store`
- `immer` — all mutations use draft-based immutable updates; no manual spread required

### 7.2 Store Slices

| Slice | Key State |
|-------|-----------|
| **Auth** | `user`, `isAuthLoading` |
| **Layout** | `layoutMode`, `splitRatio`, `activePanelIds`, `sidebarCollapsed`, `expertMode`, `commandPaletteOpen` |
| **FileSystem** | `fileTree`, `openTabs`, `activeTabId`, `dirtyFiles`, `expandedFolders` |
| **Terminal** | `terminalSessions` (Record), `activeTerminalId` |
| **Processes** | `processes` (Record), output buffers |
| **Agent** | `conversations`, `messages` (Record), `isThinking`, `agentAutonomy`, `agentContext` |
| **Notifications** | `notifications[]`, `unreadNotificationCount` |
| **Build** | `activeBuildId` |

### 7.3 Persisted Keys

Only non-ephemeral state is persisted:
```
layoutMode, splitRatio, sidebarCollapsed, sidebarWidth, rightPanelWidth,
theme, expertMode, agentAutonomy, agentContext, expandedFolders,
activeConversationId, conversations, messages
```

**NOT persisted:** `user`, `isAuthLoading`, `fileTree`, `openTabs`, `terminalSessions`, `processes`, `workspaceReady`

### 7.4 `generateId()`

Utility in `src/lib/utils.ts`. Uses `crypto.randomUUID()` for all entity IDs (tabs, messages, conversations, sessions).

---

## 8. Backend Architecture

### 8.1 Supabase Configuration

- **Project ID:** `bwiudgrsglnmseggcind`
- **Client:** Singleton in `src/lib/supabase.ts` with PKCE flow for OAuth, session auto-refresh, `detectSessionInUrl: true`
- **Auth flow:** OTP + Password (3-step: Email → OTP verify → Set password)

### 8.2 Edge Functions

| Function | Purpose |
|----------|---------|
| `agent-inference` | Receives chat messages + workspace context, calls OnSpace AI (Gemini 2.5 Flash), returns structured JSON (`{ final, actions, steps }`) |

**Edge Function stack:**
- Runtime: Deno (Supabase managed)
- HTTP server: `serve()` from `https://deno.land/std@0.168.0/http/server.ts`
- Supabase client: `https://esm.sh/@supabase/supabase-js@2`
- Auth: JWT extracted from `Authorization` header, verified via `supabaseClient.auth.getUser()`
- AI: OnSpace AI API (`ONSPACE_AI_BASE_URL` + `ONSPACE_AI_API_KEY`)
- Analytics: Non-fatal event insert to `public.events` table after each AI call
- CORS: Full `*` allow-all with OPTIONS preflight handler as first check

### 8.3 Secrets (Supabase Edge Functions)

| Secret | Value |
|--------|-------|
| `ONSPACE_AI_API_KEY` | OnSpace AI API key |
| `ONSPACE_AI_BASE_URL` | OnSpace AI base URL |
| `SUPABASE_URL` | Auto-provisioned |
| `SUPABASE_ANON_KEY` | Auto-provisioned |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-provisioned |

---

## 9. Database Schema

### 9.1 Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | Extended user data, plan info, GitHub token, AI usage counters | ✅ |
| `connected_repos` | GitHub repos linked per user | ✅ |
| `builds` | CI/CD build records per repo | ✅ |
| `ai_conversations` | Chat conversation metadata | ✅ |
| `ai_messages` | Individual messages per conversation | ✅ |
| `terminal_sessions` | Terminal session start/end/log | ✅ |
| `events` | Analytics event stream | ✅ |

### 9.2 Triggers

| Trigger | Table | Action |
|---------|-------|--------|
| `on_auth_user_created` | `auth.users` | Auto-creates `profiles` row on signup |
| `on_ai_message_inserted` | `ai_messages` | Increments `ai_conversations.message_count` |
| `profiles_updated_at` | `profiles` | Updates `updated_at` on any change |

### 9.3 RPC Functions

| Function | Returns |
|----------|---------|
| `get_dashboard_stats(user_id)` | Repo count, build count, AI requests, terminal sessions |
| `get_ai_usage(user_id)` | AI request count vs limit, reset date |
| `get_build_success_rate(repo_id)` | Success/failure counts, average duration |

### 9.4 Key Schema Details

- All foreign keys from `profiles` reference `auth.users(id) ON DELETE CASCADE`
- `ai_messages` RLS: users access messages only through conversations they own
- `profiles.plan` default: `'starter'`; values: `starter | pro | team | enterprise`
- `profiles.ai_requests_used` incremented on each agent call (deferred — not yet wired)
- `profiles.github_access_token` stored in plaintext (security debt — see deferred items)

---

## 10. AI Agent System

### 10.1 Architecture

```
AgentChat.tsx
  → supabase.functions.invoke('agent-inference')
    → Deno Edge Function
      → OnSpace AI (Gemini 2.5 Flash)
      → Returns { final, actions, steps }
  → updateMessage(assistantId, { content, actions })
  → ActionCard per action (Apply / Review buttons)
    → executeAction(container, action)       [Phase 7]
      → WebContainer FS / process API
      → updateActionStatus(done | failed)
      → refreshFileTree()
```

### 10.2 System Prompt

The `agent-inference` edge function sends a comprehensive system prompt instructing the agent to:
- Always return valid JSON matching the `AgentResponse` schema
- Set `requiresConfirmation: true` for destructive operations (delete, force push, deployments)
- Set `requiresConfirmation: false` for safe reads and writes
- Include `steps.draft` and `steps.critique` in expert mode
- Never return plain text — only JSON

The current workspace context is serialized to JSON and appended to the system prompt.

### 10.3 AgentAction Types

| Type | Requires Confirmation | Executable |
|------|----------------------|------------|
| `read_file` | No | ✅ WebContainer fs.readFile |
| `write_file` | No | ✅ WebContainer fs.writeFile |
| `edit_file` | No | ✅ WebContainer fs.writeFile (full replace or diff) |
| `delete_file` | **Yes** | ✅ WebContainer fs.rm |
| `create_dir` | No | ✅ WebContainer fs.mkdir |
| `run_command` | Depends on `requiresConfirmation` | ✅ WebContainer spawn |
| `search_files` | No | ✅ File tree walk |
| `open_pr` | **Yes** | ❌ Browser-only info (GitHub UI required) |

### 10.4 Diff Application

`executeAction.ts` implements a minimal unified diff applicator for `edit_file` when the agent provides `diff` instead of full `content`. It handles `+`/`-`/context lines. For complex diffs, the agent should provide full `content`.

### 10.5 `executeAction.ts`

**File:** `src/agent/executeAction.ts`

Key exports:
- `executeAction(container, action): Promise<ActionResult>` — routes each action type to the appropriate WebContainer call
- `isFileSystemAction(type): boolean` — returns true for types that touch the FS (used to decide whether to refresh the file tree)

### 10.6 WebContainer Reference in AgentChat

`AgentChat` needs access to the WebContainer instance but cannot call `useWebContainer()` deep in the component tree without prop-drilling. The solution: `useWebContainer` sets `window.__yfitops_container` after boot, and `AgentChat` polls for it with a 500ms interval, storing the reference in `containerRef`.

### 10.7 Expert Mode

When `expertMode === true` in Zustand (toggled in user settings), it's passed to the edge function which instructs the AI to populate `steps.draft` (initial thinking) and `steps.critique` (self-critique) before the final answer. Currently the steps are returned but not yet rendered in the UI.

---

## 11. WebContainer & Terminal

### 11.1 WebContainer Setup

**Package:** `@webcontainer/api`

**Singleton boot pattern:** `src/core/webcontainer/webcontainer.ts` stores a `Promise<WebContainer>` at module scope. `bootWebContainer()` calls `WebContainer.boot()` only on the first call; subsequent calls return the same promise. This ensures the boot sequence runs exactly once even if multiple components call the hook simultaneously.

**COOP/COEP headers required** for `SharedArrayBuffer` support (needed by WebContainer):
- **Production (Cloudflare Pages):** `public/_headers` file
- **Local dev:** `vite.config.ts` `server.headers`

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

### 11.2 Starter Files

On first boot, `mountStarterFiles()` mounts:
- `package.json` — minimal Node.js package
- `index.js` — Hello World entry point
- `README.md` — workspace orientation
- `src/hello.js` — sample module

### 11.3 FS API (`src/core/webcontainer/fs.ts`)

| Function | WebContainer Method |
|----------|-------------------|
| `readFile(container, path)` | `fs.readFile(path, 'utf-8')` |
| `writeFile(container, path, content)` | `fs.writeFile(path, content)` |
| `readDir(container, path)` | `fs.readdir(path)` |
| `mkdir(container, path)` | `fs.mkdir(path, { recursive: true })` |
| `unlink(container, path)` | `fs.rm(path, { recursive: true })` |
| `exists(container, path)` | `fs.stat(path)` (returns false on throw) |
| `buildFileTree(container, dir)` | Recursive `readdir` with `withFileTypes: true` |

`buildFileTree` skips hidden files and `node_modules`. Sorts directories before files.

### 11.4 Process API (`src/core/webcontainer/process.ts`)

| Function | Purpose |
|----------|---------|
| `spawnProcess(container, cmd, args)` | Non-interactive spawn with stdout/stderr collection. Guarded by `isDangerousCommand()` from `utils.ts`. |
| `spawnTerminalShell(container, cols, rows)` | Interactive jsh shell — returns `{ process, inputWriter, exitPromise }` |

### 11.5 Terminal (xterm.js)

**Packages:** `xterm` + `xterm-addon-fit`

**Theme:** Custom YFitOps terminal theme — void background (`#080810`), mint cursor, violet magenta, info blue, danger red — matching the design system.

**Resize:** `ResizeObserver` on the terminal container div drives `fitAddon.fit()` + `shellProcess.resize({ cols, rows })`. This correctly handles panel drag resizes without relying on `window.resize`.

**Input piping:** xterm `onData` → shell input writer  
**Output piping:** shell `output.pipeTo(WritableStream)` → `term.write(chunk)`

**Scrollback:** 5000 lines

**Clean up on unmount:** kills shell, closes writer, disconnects ResizeObserver, disposes xterm instance.

---

## 12. Monaco Editor

### 12.1 Setup

**Package:** `monaco-editor` (^0.46.0)  
**Vite config:** Manual chunks for Monaco workers + `optimizeDeps.include`  
**Worker setup:** `src/editor/monacoEnv.ts` — must be imported before any `monaco-editor` import (done in `src/main.tsx` as first import)

**Workers registered via Vite `?worker` suffix:**
- `editor.worker` — base editor
- `ts.worker` — TypeScript / JavaScript IntelliSense
- `json.worker` — JSON schema validation
- `css.worker` — CSS/SCSS/Less completions
- `html.worker` — HTML formatting

### 12.2 Custom Theme: `yfitops-dark`

Base: `vs-dark`. Key token overrides:

| Token | Color |
|-------|-------|
| `keyword` | `#9B6EF5` (violet) |
| `string` | `#00F5A0` (mint) |
| `number` | `#38BDF8` (info blue) |
| `type` | `#67E3FF` (light cyan) |
| `comment` | `#4A4A6A` italic |
| `constant` | `#FBBF24` (warning yellow) |
| cursor | `#00F5A0` (mint) |
| selection | `#00F5A030` (mint tint) |
| background | `#09090F` (void) |

### 12.3 Per-Tab Model Management

Each opened file gets a `monaco.editor.ITextModel` stored in `modelsRef: Map<path, { model, viewState }>`. On tab switch:
1. Current view state (scroll, cursor, undo stack) saved to `viewStatesRef`
2. New tab's model activated with `editor.setModel(model)`
3. Saved view state restored via `editor.restoreViewState(viewState)`

URI scheme: `yfitops://fs/<path>` (avoids Monaco's special handling of `file://`).

### 12.4 Dirty Indicators

`model.onDidChangeContent` → `markTabDirty(tabId, true)` → mint dot in tab bar  
`Ctrl/Cmd+S` → `fs.writeFile(path, content)` → `markTabDirty(tabId, false)` → dot disappears

### 12.5 Editor Options

```ts
fontSize: 13, fontFamily: '"JetBrains Mono"', fontLigatures: true,
lineHeight: 20, minimap: { enabled: true, scale: 1 },
tabSize: 2, scrollBeyondLastLine: false, automaticLayout: false,
bracketPairColorization: { enabled: true },
guides: { indentation: true, bracketPairs: true },
cursorBlinking: 'smooth', cursorSmoothCaretAnimation: 'on'
```

---

## 13. Authentication

### 13.1 Flow

**Method:** OTP + Password (3-step wizard)

1. **Email step:** User enters email → `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })`
2. **OTP step:** User enters 6-digit code → `supabase.auth.verifyOtp({ email, token, type: 'email' })`
3. **Password step:** User sets password + username → `supabase.auth.updateUser({ password, data: { username } })`

For subsequent logins: `supabase.auth.signInWithPassword({ email, password })`

### 13.2 Auth State

Single source of truth: `onAuthStateChange` subscription in `src/hooks/useAuth.ts`. No `getSession()` bootstrap (eliminated to prevent double state flush). Handles events: `INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`.

### 13.3 OTP Rate Limiting

`src/hooks/useOtpCooldown.ts`:
- 60-second default cooldown after each OTP send
- Email-keyed in `sessionStorage` — survives page refresh, per-user
- `forceCooldown(seconds)` — called on 429 response, extends gate
- `canSend` boolean — gates both send and resend handlers
- `useRef`-based in-flight lock — prevents concurrent sends on double-click

### 13.4 User Mapping

```ts
function mapSupabaseUser(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email!,
    username: user.user_metadata?.username || user.email!.split('@')[0],
    avatar: user.user_metadata?.avatar_url,
    plan: 'starter',
  };
}
```

---

## 14. Plugins & Libraries

### 14.1 Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 18.3.1 | UI framework |
| `react-dom` | 18.3.1 | DOM rendering |
| `react-router-dom` | 6.x | SPA routing |
| `@supabase/supabase-js` | 2.x | Supabase client |
| `@webcontainer/api` | latest | Browser Node.js sandbox |
| `monaco-editor` | ^0.46.0 | Code editor |
| `xterm` | latest | Terminal emulator |
| `xterm-addon-fit` | latest | Terminal auto-resize |
| `zustand` | 5.x | State management |
| `immer` | latest | Immutable state mutations |
| `tailwindcss` | 3.4.11 | Utility CSS framework |
| `lucide-react` | latest | Icon set (outline style) |
| `sonner` | latest | Toast notifications |
| `cmdk` | latest | Command palette (Cmd+K) |
| `react-hook-form` | latest | Form state |
| `zod` | latest | Schema validation |
| `recharts` | latest | Charts (Dashboard — planned) |

### 14.2 Dev Dependencies

| Package | Purpose |
|---------|---------|
| `vite` | 5.4.1 | Build tool + dev server |
| `typescript` | 5.5.3 | Type system |
| `@vitejs/plugin-react` | JSX transform |
| `eslint` | Linting |
| `postcss` | CSS processing |
| `autoprefixer` | CSS vendor prefixes |

### 14.3 shadcn/ui Components Used

Installed via `components.json` config. Components in `src/components/ui/` (read-only):
- `Button`, `Input`, `Label`, `Textarea`
- `Dialog`, `Tabs`, `Tooltip`
- `Card`, `Badge`, `Avatar`
- `ScrollArea`, `Separator`
- `DropdownMenu`, `Select`

### 14.4 Icon Library

**Package:** `lucide-react` (outline style, consistent 1.5px stroke weight)

Key icons in use:
- `Bot` — AI agent avatar
- `User` — user message avatar
- `Terminal` — terminal panel
- `Code2` — editor panel
- `FolderOpen` — explorer panel
- `Play`, `Eye` — action execution buttons (Phase 7)
- `AlertTriangle`, `CheckCircle2` — modal icons
- `Send`, `Loader2`, `Sparkles` — chat UI
- `FileEdit`, `FilePlus`, `Trash2`, `FolderPlus`, `Search`, `GitPullRequest`, `FileText` — action type icons

---

## 15. Build & Deployment

### 15.1 Deployment Platform

**Cloudflare Pages** — continuous deployment from GitHub `main` branch via GitHub Actions.

**Workflow:** `.github/workflows/deploy.yml`  
**Build command:** `npm install && npm run build`  
**Output directory:** `dist/`  
**Node version:** 20

### 15.2 Required Environment Variables (Cloudflare)

Set in Cloudflare Pages dashboard → Settings → Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 15.3 Headers File

`public/_headers` — served as HTTP response headers by Cloudflare Pages:

```
/*
  Cross-Origin-Embedder-Policy: require-corp
  Cross-Origin-Opener-Policy: same-origin
```

These headers are **required** for `SharedArrayBuffer` (used by WebContainer) to be available in the browser.

### 15.4 Vite Config (`vite.config.ts`)

Key settings:
- `plugins: [react()]`
- `resolve.alias: { '@': path.resolve('./src') }` — enables `@/` imports
- `server.headers` — COOP/COEP for local dev
- `optimizeDeps.exclude: ['@webcontainer/api']` — prevents Vite from bundling it
- `build.rollupOptions.output.manualChunks` — splits Monaco into its own chunk

### 15.5 TypeScript Config

- `tsconfig.app.json`: `strict: true`, `target: ES2020`, `moduleResolution: bundler`
- Path alias: `"@/*": ["./src/*"]`

---

## 16. Project Structure

```
yfitops/
├── .env                          # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── .github/workflows/deploy.yml  # CI/CD: Cloudflare Pages deployment
├── public/
│   ├── _headers                  # COOP/COEP headers for Cloudflare Pages
│   └── favicon-new.png           # AI-generated mint "Y" favicon
├── docs/
│   ├── phase-1-foundation.md
│   ├── phase-2-supabase-backend.md
│   ├── phase-2b-auth-hardening.md
│   ├── phase-3-workspace-layout.md
│   ├── phase-4-webcontainer-terminal.md
│   ├── phase-5-monaco-editor.md
│   ├── phase-6-agent-chat.md
│   ├── phase-7-agent-action-execution.md
│   ├── review.md
│   └── humanoid.md               ← this file
├── src/
│   ├── agent/
│   │   └── executeAction.ts      # Phase 7: action → WebContainer bridge
│   ├── assets/
│   │   └── hero-ide.jpg
│   ├── components/
│   │   ├── features/
│   │   │   ├── AgentChat.tsx
│   │   │   ├── Editor/MonacoEditor.tsx
│   │   │   ├── FileTree.tsx
│   │   │   ├── PanelShell.tsx
│   │   │   └── RealTerminalPanel.tsx
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── SplitLayout.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   └── TopBar.tsx
│   │   └── ui/
│   │       ├── CommandPalette.tsx
│   │       └── ConfirmModal.tsx
│   ├── core/
│   │   └── webcontainer/
│   │       ├── fs.ts
│   │       ├── process.ts
│   │       └── webcontainer.ts
│   ├── editor/
│   │   ├── monacoEnv.ts
│   │   └── yfitopsTheme.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useOtpCooldown.ts
│   │   └── useWebContainer.ts
│   ├── lib/
│   │   ├── errors.ts
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Analytics.tsx
│   │   ├── Auth.tsx
│   │   ├── Billing.tsx
│   │   ├── BuildMonitor.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Index.tsx
│   │   ├── Landing.tsx
│   │   ├── NotFound.tsx
│   │   ├── PlaceholderPage.tsx
│   │   ├── Settings.tsx
│   │   └── WorkspacePage.tsx
│   ├── store/
│   │   └── useAppStore.ts
│   └── types/
│       ├── agent.types.ts
│       └── dev.types.ts
├── supabase/
│   └── functions/
│       ├── _shared/cors.ts
│       └── agent-inference/index.ts
├── index.html
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.app.json
```

---

## 17. Modals & Overlays

| Component | Z-Index | Trigger | Style |
|-----------|---------|---------|-------|
| `ConfirmModal` | 200 | "Review" on destructive agent actions | Glassmorphism card, blurred backdrop |
| `CommandPalette` | 100 | `Cmd+K` | cmdk popover |
| Boot overlay | 50 | `isBooting === true` | Full-screen with spinner |
| Boot error overlay | 50 | `bootError !== null` | Red-tinted card |
| Sonner toasts | 9999 | `toast.success/error/info()` | Bottom-right, stacked |

### ConfirmModal Variants

**Destructive (red):**
- `AlertTriangle` icon in danger red
- Confirm button: `rgba(255,77,109,0.12)` background, red border + text
- Triggered by: `delete_file`, `open_pr`

**Approve (mint):**
- `CheckCircle2` icon in mint
- Confirm button: `rgba(0,245,160,0.1)` background, mint border + text
- Triggered by: `run_command` with `requiresConfirmation: true`

---

## 18. Keyboard Shortcuts

| Shortcut | Location | Action |
|----------|---------|--------|
| `Cmd/Ctrl + K` | Global | Open command palette |
| `Cmd/Ctrl + S` | Monaco Editor | Save file to WebContainer FS |
| `Cmd/Ctrl + W` | Monaco Editor | Close active tab |
| `Enter` | AgentChat textarea | Send message |
| `Shift + Enter` | AgentChat textarea | Insert newline |
| `Escape` | ConfirmModal | Cancel and close |
| `Escape` | CommandPalette | Close palette |

**Not yet implemented:**
- `Cmd/Ctrl + P` — fuzzy file picker
- `Cmd/Ctrl + Shift + P` — command palette with prefilled query
- `` Cmd/Ctrl + ` `` — focus terminal
- `Cmd/Ctrl + B` — toggle sidebar

---

## 19. Tweaks & Adjustments

### 19.1 `window.__yfitops_container`

`useWebContainer` sets `(window as any).__yfitops_container = wc` after the container boots. `AgentChat` polls this every 500ms to acquire the container reference without prop-drilling. This is an intentional singleton side-channel — the alternative would be a React Context which would require wrapping WorkspacePage.

### 19.2 xterm import path fix

xterm packages were initially imported as `@xterm/xterm` and `@xterm/addon-fit` (incorrect). Fixed to `xterm` and `xterm-addon-fit` which are the correct npm package names.

### 19.3 COOP/COEP for local dev

Added to `vite.config.ts` under `server.headers` so `SharedArrayBuffer` (required by WebContainer) works during `npm run dev`, not just in production.

### 19.4 Monaco worker chunk split

Monaco's TypeScript worker is ~2MB. Added to `build.rollupOptions.output.manualChunks` to prevent it from blocking the main bundle load.

### 19.5 Immer + Zustand arrays

Zustand's Immer middleware enables direct array mutations (`state.openTabs.push(tab)`) without spreading. All store mutations use this pattern for consistency.

### 19.6 `sendInFlightRef` pattern

`AgentChat` uses a `useRef<boolean>` (not `useState`) for the in-flight lock to avoid triggering re-renders on lock acquire/release. Same pattern used in `useAuth.ts` for OTP sends.

### 19.7 Diff applicator

`executeAction.ts` includes a minimal unified diff applicator (`applyDiff`) for `edit_file` actions. It handles standard `+`/`-`/context lines but not advanced hunk anchoring. For complex edits the AI should return full `content`.

---

## 20. Phase History

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Foundation (Vite + React + Tailwind + Routing + Zustand + shadcn) | ✅ |
| 2 | Supabase backend (schema, RLS, triggers, edge functions) | ✅ |
| 2b | Auth hardening (OTP cooldown, in-flight locks, 429 handling) | ✅ |
| 3 | Workspace layout (6 modes, PanelShell, SplitLayout, TopBar, StatusBar) | ✅ |
| 4 | WebContainer + Terminal (xterm.js, jsh shell, FileTree, FS API) | ✅ |
| 5 | Monaco Editor (custom theme, per-tab models, dirty indicators, Cmd+S) | ✅ |
| 6 | Agent Chat (full chat UI, action cards, workspace context, edge function) | ✅ |
| 7 | Agent Action Execution (executeAction bridge, ConfirmModal, file tree refresh) | ✅ |

---

## 21. Deferred Items

See `docs/review.md` for the full audit. Key high-priority items:

| Item | Priority |
|------|----------|
| Agent action execution — auto-execute safe actions | Phase 7 ✅ Done |
| Confirmation modal for destructive actions | Phase 7 ✅ Done |
| File tree refresh after agent FS mutations | Phase 7 ✅ Done |
| GitHub repo connect → clone into WebContainer | High |
| Streaming agent responses (SSE) | Medium |
| Conversation persistence to Supabase | Medium |
| File context menu (new, rename, delete) | Medium |
| Dashboard with real analytics | Medium |
| Format-on-save in Monaco | Low |
| Expert mode steps rendered in chat | Low |
| `profiles.ai_requests_used` rate limiting | Low |
| Accessibility audit (WCAG AA) | Low |
| Test suite (Vitest + Playwright) | Low |

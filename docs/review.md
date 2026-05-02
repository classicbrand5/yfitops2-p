# YFitOps — Phase Review & Deferred Items

**Last updated:** Phase 6 complete  
**Live URL:** https://yfitops2.pages.dev

This document tracks everything that was intentionally deferred, skipped, partially implemented, or needs revisiting across all phases.

---

## Phase 1 — Foundation

### ✅ Completed
- Vite + React 18 + TypeScript strict mode
- Tailwind CSS with custom CSS variables and dark theme
- shadcn/ui component library
- React Router 6 multi-page routing
- Zustand store scaffold with all slices
- Landing page, Auth page, Dashboard, WorkspacePage shells
- Custom design tokens (mint #00F5A0, violet #7C3AED, JetBrains Mono)

### ⚠️ Deferred / Skipped
- **Animated mesh background** — specified in the design system but not implemented. The landing page uses a static gradient instead of the animated SVG mesh.
- **Command palette (Cmd+K)** — `CommandPalette.tsx` was created with cmdk but the keybinding in `useKeyboardShortcuts` was not wired to globally available actions (file open, layout switch, etc.). Currently only opens/closes the palette; actions are stubs.
- **`useKeyboardShortcuts` hook** — created but not all shortcuts are wired up (only Cmd+K and layout toggles). Missing: Cmd+P (file picker), Cmd+Shift+P (command palette with query), Cmd+` (terminal focus), Cmd+B (sidebar toggle).
- **Toast provider** — `sonner` is imported and used in Auth.tsx but the `<Toaster />` component may not be mounted in the root App. **Action needed:** verify `<Toaster />` is inside `AppShell` or `App.tsx`.
- **NotFound page** — exists but has no navigation links back to the app.
- **PlaceholderPage** — generic page used for Analytics, Billing, BuildMonitor, Settings. These are production pages that need real implementations.

---

## Phase 2 — Supabase Backend

### ✅ Completed
- Supabase client singleton with PKCE flow
- Full database schema (7 tables, 18 RLS policies, 3 triggers, 12 indexes)
- Analytics RPC functions: `get_dashboard_stats`, `get_ai_usage`, `get_build_success_rate`
- `handle_new_user` trigger auto-creates a `profiles` row on signup
- `on_ai_message_inserted` trigger increments `message_count`

### ⚠️ Deferred / Skipped
- **Real-time subscriptions** — the `ai_messages` and `builds` tables have realtime enabled in the schema, but no Supabase Realtime channel subscriptions are wired in the frontend. Phase 6 agent chat polls rather than subscribes.
- **`connected_repos` sync** — the table exists and has RLS, but no UI to connect a GitHub repo from the Dashboard. The connect-repo flow (OAuth → store token → insert row) is entirely unbuilt.
- **Builds table** — schema and RLS exist, but `BuildMonitor.tsx` is a placeholder with no real data fetch or webhook trigger.
- **`terminal_sessions` table** — schema exists with RLS, but the terminal session start/end lifecycle is not persisted to Supabase. Sessions live only in Zustand.
- **`ai_conversations` / `ai_messages` Supabase sync** — conversations and messages are stored only in Zustand `localStorage` persist. They are NOT synced to the `ai_conversations` / `ai_messages` Supabase tables. This means chat history is lost if the user clears local storage or switches devices.
- **`profiles` avatar upload** — the column exists in the DB and the Settings page is a placeholder. No file upload to Supabase Storage is implemented.

---

## Phase 2b — Auth Hardening

### ✅ Completed
- Single source of truth: only `onAuthStateChange` updates user state
- `useOtpCooldown` hook with sessionStorage persistence, email-keyed cooldown
- In-flight locks (`useRef`) prevent concurrent OTP sends
- 429 error detection extends client-side cooldown via `forceCooldown()`
- `mountedRef` guard for StrictMode double-mount

### ⚠️ Deferred / Skipped
- **GitHub OAuth** — `signInWithOAuth` for GitHub is implemented in `useAuth.ts` but there is no UI button on the Auth page to trigger it. It was intentionally omitted since GitHub OAuth requires additional Supabase dashboard configuration (Client ID/Secret).
- **Password reset flow** — not implemented. No "Forgot password?" link or `supabase.auth.resetPasswordForEmail` call exists.
- **Email change flow** — not implemented. Settings page is a placeholder.
- **Session expiry handling** — `TOKEN_REFRESHED` event is handled, but there is no UI notification when a session expires mid-use (e.g., if the user leaves the tab open overnight).
- **2FA / MFA** — not implemented; not in the original spec either.

---

## Phase 3 — Workspace Layout

### ✅ Completed
- 6 layout modes: `split-horizontal`, `split-vertical`, `full-ide`, `editor-only`, `terminal-only`, `chat-only`
- Draggable `SplitLayout` with Zustand-persisted ratio
- `PanelShell` with header, icon, and action slots
- `StatusBar` with cursor position, language, WebContainer status
- `TopBar` with layout mode buttons and sidebar toggle

### ⚠️ Deferred / Skipped
- **Panel drag-to-reorder** — panels have fixed positions within layouts. No drag-and-drop to rearrange panels (e.g., move Chat to the left of Editor).
- **Panel show/hide toggles** — `togglePanel(panelId)` exists in the store but is not hooked to any UI control. There's no eye icon or checkbox to hide/show individual panels.
- **Persistent panel sizes per layout mode** — the `splitRatio` is global, not per-layout-mode. Switching from `full-ide` to `split-horizontal` resets the ratio.
- **Sidebar navigation items** — `Sidebar.tsx` has placeholder nav items. No active-route highlighting wired via React Router's `useMatch`.
- **Mobile responsive layout** — WorkspacePage is desktop-only. No breakpoint handling for `< 768px`.

---

## Phase 4 — WebContainer + Terminal

### ✅ Completed
- `@webcontainer/api` singleton boot with Promise-based guard
- FS API: `readFile`, `writeFile`, `readDir`, `mkdir`, `unlink`, `exists`, `buildFileTree`
- Process API with safety gate for non-terminal spawns
- `useWebContainer` hook with starter file mounting
- `FileTree` with single-click expand, double-click open, language detection
- `RealTerminalPanel` with xterm.js, FitAddon, ResizeObserver resize
- `public/_headers` for COOP/COEP (Cloudflare Pages)
- `vite.config.ts` server headers for local dev COOP/COEP

### ⚠️ Deferred / Skipped
- **File rename / delete in FileTree** — right-click context menu was in the spec but not built. `removeFileFromTree` and the WebContainer `unlink` API exist but no UI triggers them.
- **New file / new folder creation from FileTree** — no "+" button in the Explorer panel that creates a new file in WebContainer FS.
- **File search (Cmd+P)** — fuzzy file picker across the file tree is not implemented.
- **`node_modules` in starter files** — WebContainer can run `npm install`, but the starter `package.json` only has a minimal set. No `npm install` is auto-run on boot.
- **Multiple terminal sessions** — the store supports multiple sessions (`terminalSessions` map), and there's a "New Terminal" button, but xterm/jsh instances are keyed by `activeTerminalId`. Switching between sessions destroys and re-creates xterm instances; view state is not preserved.
- **WebContainer FS ↔ FileTree sync** — the file tree is built once on boot. If the terminal creates new files (e.g., `touch foo.ts`), the FileTree doesn't update automatically. `refreshFileTree` is exposed but must be called manually.
- **WebSocket terminal fallback** — the spec mentioned a WebSocket fallback for environments where WebContainer can't boot. Not implemented; only WebContainer jsh is used.

---

## Phase 5 — Monaco Editor

### ✅ Completed
- `MonacoEditor.tsx` with per-tab model management and view state preservation
- `yfitops-dark` custom theme (mint cursor, violet keywords, mint strings)
- JetBrains Mono font, ligatures, smooth cursor animation
- Ctrl/Cmd+S to save to WebContainer FS
- Ctrl/Cmd+W to close tab
- Dirty indicator (mint dot) in tab bar
- ResizeObserver-driven `editor.layout()` (not the polling `automaticLayout: true`)
- Monaco worker setup via `?worker` Vite imports (TS, JSON, CSS, HTML workers)
- Font update: Orbitron → Space Grotesk, DM Sans → Inter

### ⚠️ Deferred / Skipped
- **Format on save** — not wired. `editor.getAction('editor.action.formatDocument').run()` exists but not called in the Ctrl+S handler.
- **IntelliSense for project `node_modules`** — TypeScript worker has built-in lib types but no access to installed package types (e.g., `react`, `@supabase/supabase-js`). Would require mounting `node_modules/@types` into Monaco's virtual FS.
- **Find-in-files** — Monaco has a built-in single-file find (Ctrl+F). Cross-file search (Ctrl+Shift+F) is not implemented.
- **Go-to-definition across files** — requires the TypeScript language server to know about all project files. Not wired.
- **Diff viewer** — for reviewing agent `edit_file` actions side-by-side. Not implemented.
- **Minimap performance** — large files (>2000 lines) may cause visible lag in the minimap. Consider disabling for files over a threshold.
- **Monaco bundle size** — ~2MB gzipped. It is split into its own Vite chunk but is not lazy-loaded. Consider `React.lazy()` wrapping `MonacoEditor` for initial page load performance.

---

## Phase 6 — Agent Chat

### ✅ Completed
- `AgentChat.tsx` with full message history, user/assistant bubbles
- `ActionCard` per action type (8 types, color-coded icons)
- `ThinkingDots` animation during agent response
- Enter to send, Shift+Enter for newline, auto-resize textarea
- Workspace context injected (file tree, open files, terminal output, expertMode)
- `FunctionsHttpError` handling for detailed error messages
- `sendInFlightRef` prevents concurrent sends
- Session check before invoking edge function

### ⚠️ Deferred / Skipped
- **Streaming responses** — the edge function returns a complete response. Token-by-token streaming via SSE is not implemented. The placeholder bubble shows ThinkingDots until the full response arrives.
- **Action execution** — ✅ Completed in Phase 7.
- **Confirmation modal for destructive actions** — ✅ Completed in Phase 7.
- **Rollback on failure** — no pre-action snapshots are taken; failed actions cannot be undone.
- **Conversation persistence to Supabase** — conversations live only in Zustand + localStorage. Switching devices or clearing storage loses all chat history.
- **Conversation list / history sidebar** — no UI to browse past conversations; only the active conversation is shown.
- **Conversation title generation** — new conversations are titled "New Task". Auto-generating a title from the first user message (via a second AI call) is not implemented.
- **`expertMode` steps display** — `response.steps.draft` and `response.steps.critique` are returned by the edge function in expert mode but are not rendered in the UI.
- **Agent context: active file content** — the agent receives the active file's *path* but not its *content*. Reading the file content from WebContainer and including it in the context would make the agent significantly more useful.
- **Rate limiting / usage tracking** — `profiles.ai_requests_used` exists in the DB but is never incremented from the frontend or checked before invoking the edge function.

---

## Phase 7 — Agent Action Execution

### ✅ Completed
- `src/agent/executeAction.ts` — routes all 8 `AgentActionType` values to WebContainer FS / process API
- `ensureParentDir()` — auto-creates parent directories before `write_file`
- Minimal unified diff applicator (`applyDiff`) for `edit_file` with `diff` field
- `isFileSystemAction()` — determines whether file tree needs refresh
- `src/components/ui/ConfirmModal.tsx` — glassmorphism modal with Escape-to-cancel, auto-focus, destructive (red) and approve (mint) variants
- `ActionCard` Apply/Review buttons — Apply for safe actions (instant), Review for destructive/requiresConfirmation (opens modal)
- `executingActionId` state — shows spinner on active button while executing
- `updateActionStatus()` called at each stage: `executing` → `done` | `failed`
- File tree refresh via `buildFileTree()` + `setFileTree()` after FS mutations
- WebContainer reference exposed via `window.__yfitops_container` from `useWebContainer`
- `containerRef` poll in AgentChat (500ms interval) acquires container without prop-drilling

### ⚠️ Deferred / Skipped
- **Rollback on failure** — no pre-action snapshots; failed writes cannot be automatically undone
- **`run_command` quoted args** — commands with quoted arguments may not parse correctly (only splits on whitespace)
- **`search_files` content search** — current implementation only matches filenames, not file content
- **`open_pr` execution** — informational only; requires GitHub API integration (Phase 8)

---

## Cross-Cutting Concerns

### Security
- **GitHub access token storage** — `profiles.github_access_token` is stored in plaintext in the DB. Should use Supabase Vault or encrypt before storing.
- **Agent action safety gate** — `run_command` actions with `requiresConfirmation: false` could be exploited to run arbitrary shell commands in the WebContainer. A whitelist of safe commands should be enforced before auto-execution is added in Phase 7.
- **`supabase.functions.invoke` auth** — currently relies on the Supabase client auto-attaching the session token. If the session expires mid-request, the edge function returns 401 with no client-side retry. Add a session refresh before each invoke call.

### Performance
- **Zustand `persist` with large message history** — localStorage has a ~5MB limit. Long conversations (hundreds of messages) could exceed this. Add a message count cap or move to IndexedDB.
- **File tree deep scan** — `buildFileTree` recursively scans the entire WebContainer FS on every `refreshFileTree` call. For large repos, this could block the UI thread. Add a depth limit or worker offload.
- **`openTabs` model memory** — Monaco models are never GC'd unless `closeTab` is called. Many open tabs accumulate memory. Consider a max-tab limit (e.g., 15) with LRU eviction.

### Accessibility
- **Focus management** — no `aria-live` regions for dynamic content updates (new messages, file tree changes) except in AgentChat.
- **Keyboard navigation in FileTree** — files can only be opened by mouse double-click. No keyboard (arrow keys + Enter) navigation.
- **Monaco accessibility** — `accessibilitySupport: 'auto'` is the default; consider `'on'` for screen reader users.
- **Color contrast** — the `#5C5C7A` muted text color on `#09090F` background is ~3.2:1 contrast ratio, below the WCAG AA 4.5:1 minimum for normal text. Should be lightened to `#7A7A99` or similar.

### Testing
- **No tests** — zero unit, integration, or E2E tests exist. Key areas that need coverage:
  - `useOtpCooldown` hook (cooldown logic, sessionStorage keying)
  - `useAuth` (INITIAL_SESSION, SIGNED_OUT, TOKEN_REFRESHED branches)
  - `useAppStore` (tab management, conversation mutations)
  - `AgentChat` send flow (mocked edge function)
  - `FileTree` (expand/collapse, double-click open)

---

## Recommended Next Phases

| Phase | Feature | Priority |
|-------|---------|----------|
| 7 | Agent action execution (WebContainer FS + process bridge) | High |
| 7b | Confirmation modal for destructive actions + rollback | High |
| 8 | GitHub repo connect → clone into WebContainer | High |
| 9 | Conversation persistence to Supabase (ai_conversations + ai_messages) | Medium |
| 10 | Streaming agent responses (SSE edge function) | Medium |
| 11 | File create / rename / delete in FileTree (context menu) | Medium |
| 12 | Dashboard with real analytics (get_dashboard_stats RPC) | Medium |
| 13 | Settings page (profile, avatar upload, GitHub token) | Low |
| 14 | Accessibility audit + WCAG AA compliance | Low |
| 15 | Test suite (Vitest + Playwright) | Low |

---

## Phase 9 — GitHub Integration & Conversation Persistence

### ✅ Completed
- `withAuthRefresh<T>` utility added to `src/lib/supabase.ts` — auto-retries on 401/JWT-expired with one session refresh
- `useConversationSync` hook — loads up to 50 conversations + messages for top-5 convos from Supabase on auth ready; merges into Zustand without overwriting in-progress chats
- `createNewConversation` — now inserts into `ai_conversations` in background; falls back to local UUID on network error
- `addMessage` — inserts into `ai_messages` in background (non-blocking)
- `updateMessage` — patches `content` + `actions` in `ai_messages` in background
- `GitHubRepoConnect` component — OAuth connect button + repository clone form using `git clone https://<token>@github.com/owner/repo.git` via WebContainer
- `GitHubCallback` page (`/auth/github/callback`) — CSRF-safe code exchange via `github-oauth-token` edge function; stores token in `profiles.github_access_token`
- `github-oauth-token` Supabase Edge Function — server-side token exchange (client secret never exposed to browser)
- Dashboard — replaced mock stats with live `get_dashboard_stats()` + `get_ai_usage(30)` RPC data; recharts AreaChart for AI usage; GitHub connect card
- Settings — full profile editor (full_name, github_username) + avatar upload to Supabase Storage bucket `avatars`; deferred sections (Security, Notifications, Appearance, Editor) shown as locked cards
- AppShell wires `useConversationSync()`; App.tsx registers `/auth/github/callback` route

### ⚠️ Deferred / Skipped
- **Conversation delete from DB** — store `clearChat` / delete not wired to Supabase delete yet
- **GitHub token encryption** — stored as plaintext; RLS protects it but Supabase Vault should be used in production
- **Private repo multi-clone** — clones to `/repo-name`; multiple clones would conflict without a directory picker
- **Real-time conversation sync** — messages written on creation but not subscribed via Supabase Realtime; multi-device requires page reload
- **Offline message replay** — if Supabase is unreachable, local messages are not queued for later upload
- **avatars bucket SQL** — must be run manually (see phase-9 docs for the CREATE POLICY statements)
- **`VITE_GITHUB_CLIENT_ID` env var** — must be set in Cloudflare Pages environment variables and local `.env` by the user
- **`github-oauth-token` edge function** — must be deployed manually via `supabase functions deploy github-oauth-token` + secrets set

---

### ✅ Completed
- `useKeyboardShortcuts` — added Cmd+B (sidebar toggle), Cmd+` (focus terminal), Cmd+Shift+E (focus explorer), Cmd+P (open palette), input-field guard
- `CommandPalette` — wired real FS actions: "File: New File" and "File: New Folder" via `window.__yfitops_container`
- `FileTree` context menu — right-click on any node: New File, New Folder, Rename (inline input), Delete (ConfirmModal)
- `ContextMenu.tsx` — new portal-based glassmorphism context menu component (z-300)
- `NotFound.tsx` — added "Go Back" and "Back to Dashboard" navigation links
- Toast provider verified — already mounted in `App.tsx` via `<Sonner />`

### ⚠️ Deferred / Skipped
- **Directory rename with child copy** — rename only recreates the directory (children not migrated)
- **True fuzzy file picker (Cmd+P)** — opens the command palette; a dedicated file picker UI is deferred
- **Mobile context menu** — long-press support not implemented
- **Format-on-save** — still not wired to Monaco's `formatDocument` action

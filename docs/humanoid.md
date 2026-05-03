# YFitOps AI Agent — Humanoid Project Documentation
# The Complete Technical & Design Reference

> **Living document** — updated every phase.
> Last updated: **Phase 10** (Mega Merge — Project 1 gap closure + experimental features)

---

## 1. Project Identity

**Product:** YFitOps AI Agent  
**Purpose:** A production-grade browser IDE where an AI agent reads codebases, writes real code, runs real terminal commands, and pushes PRs — all in a single unified browser interface. Zero mocks. Every file operation hits a real sandboxed filesystem. Every terminal command executes in a real bash process.  
**Target users:** Senior engineers, tech leads, engineering managers who need an AI that can actually code.  
**Target emotions:** Focused, confident, powerful — like a seasoned pair programmer who never sleeps.  
**Tagline:** *"Your autonomous engineering brain — code, run, ship, repeat."*

---

## 2. Technology Stack

### Frontend
| Technology | Version | Role |
|---|---|---|
| React | 18.3.1 | UI framework |
| TypeScript | 5.5.3 (strict) | Language |
| Vite | 5.4.1 | Build tool, dev server |
| Tailwind CSS | 3.4.11 | Utility styling |
| shadcn/ui | Latest | Component primitives |
| Zustand | 5.x | Global state management |
| @tanstack/react-query | 5.x | Server state, data fetching |
| react-hook-form + zod | Latest | Form validation |
| react-router-dom | 6.x | Client-side routing |
| recharts | Latest | Analytics charts |
| cmdk | Latest | Command palette fuzzy search |
| lucide-react | Latest | Icon library |

### Editor
| Technology | Role |
|---|---|
| monaco-editor + @monaco-editor/react | Monaco Editor (VS Code engine) |
| Custom theme: `yfitops-dark` | Electric mint + deep violet theme |
| Monaco.Uri.file() cache | One ITextModel per file path (undo history preserved) |

### Terminal
| Technology | Role |
|---|---|
| xterm 5.3.0 | Terminal emulator |
| xterm-addon-fit 0.8.0 | Responsive terminal resize |
| ResizeObserver | Triggers fitAddon.fit() on container resize |
| WebContainer process streams | stdin/stdout wired to xterm data handlers |

### Backend
| Technology | Role |
|---|---|
| Supabase | Auth, PostgreSQL, Realtime, Edge Functions, Storage |
| @supabase/supabase-js | Client SDK |
| Supabase Edge Functions (Deno) | AI proxy, analytics, GitHub OAuth, voice transcription |
| Supabase Realtime | Live event/build subscriptions (useRealtimeEvents, useRealtimeBuilds) |

### AI
| Technology | Role |
|---|---|
| OnSpace AI (ONSPACE_AI_API_KEY) | LLM API proxy |
| Model: google/gemini-2.5-flash | Default AI model |
| Supabase Edge Function: agent-inference | Secure AI proxy (auth required) |
| Structured JSON output | Enforces action schema |
| OpenAI Whisper (via transcribe-audio EF) | Voice transcription |

### Deployment
| Technology | Role |
|---|---|
| GitHub Actions | CI/CD pipeline |
| Cloudflare Pages | Hosting, CDN, HTTP headers |
| public/_headers | COOP/COEP/CORP headers for SharedArrayBuffer |
| vite.config.ts server.headers | Dev server COOP/COEP mirrors |

---

## 3. Design System

### 3.1 Physical Metaphor
**Terminal / Glass** — Dark void base with frosted glass panels, electric mint primary, deep violet secondary. Matte dark backgrounds with subtle glassmorphism overlays. Depth: layered shadows, backdrop blur, glowing borders.

### 3.2 Color Tokens
```css
--bg-void:        #060609;   /* deepest black */
--bg-base:        #0C0C12;   /* page background */
--bg-surface:     #111118;   /* cards, panels */
--bg-elevated:    #16161F;   /* dropdowns */
--bg-overlay:     #1C1C27;   /* hover states */
--bg-input:       #13131C;   /* form inputs */

--accent-400: #00F5A0;       /* Electric Mint — primary CTA */
--accent-500: #00D488;
--violet-400: #9B6EF5;       /* Deep Violet — AI features */
--violet-500: #7C3AED;

--success: #00F5A0;
--warning: #FBBF24;
--danger:  #FF4D6D;
--info:    #38BDF8;

--text-primary:   #EEEEFF;
--text-secondary: #9494B8;
--text-muted:     #5C5C7A;
--text-disabled:  #3A3A52;
```

### 3.3 Typography
| Role | Font | Weight | Size |
|---|---|---|---|
| Display | Space Grotesk | 600–700 | 14–72px |
| Body / UI | Inter | 400–600 | 12–16px |
| Code / Terminal | JetBrains Mono | 400 | 12–14px |

### 3.4 Animations (defined in src/index.css)
- `fade-up` — new messages, activity items
- `fade-in` — overlays
- `thinking-bounce` — AI thinking dots
- `shimmer` — skeleton loaders
- `pulse-glow` — running builds
- `scan-line` — CRT scan effect on AppShell
- `drift-1/2` — landing page decorative

---

## 4. Architecture

### 4.1 Complete File Structure
```
src/
├── App.tsx                          # Routes + QueryClient + Sonner
├── main.tsx                         # React root
├── index.css                        # Design system: tokens, components, animations
├── assets/
│   └── hero-ide.jpg
├── agent/
│   └── executeAction.ts             # Agent action executor (8 action types)
├── components/
│   ├── features/
│   │   ├── AgentChat.tsx            # Chat UI + voice input + pinned context + /review
│   │   ├── DiffPreview.tsx          # Unified diff renderer (green/red/violet)
│   │   ├── FileTimeline.tsx         # Session file change history (C3)
│   │   ├── FileTree.tsx             # FS tree with right-click context menu
│   │   ├── GitHubRepoConnect.tsx    # GitHub OAuth connect + clone form
│   │   ├── PanelShell.tsx           # Panel wrapper with header + actions
│   │   ├── RealTerminalPanel.tsx    # xterm.js + WebContainer jsh shell
│   │   └── Editor/
│   │       └── MonacoEditor.tsx     # Monaco editor + tabs + per-model cache
│   ├── layout/
│   │   ├── AppShell.tsx             # Root layout + Realtime hooks + keyboard shortcuts
│   │   ├── Sidebar.tsx              # Icon rail, navigation
│   │   ├── SplitLayout.tsx          # Drag-resize divider
│   │   ├── StatusBar.tsx            # Cursor, branch, clock
│   │   ├── TopBar.tsx               # Breadcrumb, search, notifications
│   │   └── WorkspaceErrorBoundary.tsx  # React error boundary (E1)
│   └── ui/
│       ├── CommandPalette.tsx       # cmdk 22 commands / 7 groups
│       ├── ConfirmModal.tsx         # Glassmorphism confirm/destructive modal
│       ├── ContextMenu.tsx          # Right-click context menu portal
│       └── SkeletonLoader.tsx       # Shimmer skeletons (D2)
├── core/
│   └── webcontainer/
│       ├── fs.ts                    # readFile, writeFile, unlink, mkdir, buildFileTree
│       ├── process.ts               # spawn() with safety gate
│       └── webcontainer.ts          # Singleton boot
├── hooks/
│   ├── useAuth.ts                   # OTP+Password auth
│   ├── useConversationSync.ts       # Supabase ↔ Zustand conversation sync
│   ├── useKeyboardShortcuts.ts      # Cmd+K, Cmd+B, Cmd+`, etc.
│   ├── useOtpCooldown.ts            # Per-email rate-limit gate
│   ├── useRealtimeBuilds.ts         # Supabase Realtime builds (A4)
│   ├── useRealtimeEvents.ts         # Supabase Realtime events (A4)
│   ├── useVoiceInput.ts             # MediaRecorder + Whisper transcription (C1)
│   └── useWebContainer.ts           # Boot orchestration + FS/process facade
├── lib/
│   ├── errors.ts                    # Typed error hierarchy: 8 classes (A3)
│   ├── github.ts                    # GitHub REST API client (A5)
│   ├── supabase.ts                  # Supabase client + withAuthRefresh
│   └── utils.ts                     # cn(), generateId(), isDangerousCommand(), etc.
├── pages/
│   ├── Analytics.tsx
│   ├── Auth.tsx                     # OTP+Password login/signup
│   ├── Billing.tsx
│   ├── BuildMonitor.tsx
│   ├── Dashboard.tsx                # Live RPC stats + Realtime feed + GitHub
│   ├── GitHubCallback.tsx           # OAuth callback page
│   ├── Index.tsx
│   ├── Landing.tsx
│   ├── NotFound.tsx
│   ├── Settings.tsx                 # Profile + avatar upload + GitHub PAT
│   └── WorkspacePage.tsx            # IDE: enhanced boot + quad pane + ErrorBoundary
├── store/
│   └── useAppStore.ts               # 80+ actions: auth, layout, FS, terminal, agent, pins, timeline
├── types/
│   ├── agent.types.ts               # AgentAction, AgentMessage, ConversationMeta
│   ├── dev.types.ts                 # FileNode, EditorTab, TerminalSession
│   └── global.d.ts                  # Window.__yfitops_container, window.monaco (E3)
└── editor/
    ├── monacoEnv.ts                 # Monaco worker environment setup
    └── yfitopsTheme.ts              # Custom dark theme registration
```

### 4.2 Routing
```
/                     → Landing page
/auth                 → Auth (OTP+Password)
/home                 → Index (redirect)
/dashboard            → Dashboard (live stats + activity)
/workspace            → WorkspacePage (full IDE)
/builds               → BuildMonitor (Realtime)
/analytics            → Analytics
/settings             → Settings (profile + avatar + GitHub)
/billing              → Billing
/auth/github/callback → GitHubCallback (OAuth exchange)
*                     → NotFound
```

### 4.3 State Management (useAppStore.ts)
Single Zustand store with `subscribeWithSelector` + `persist` (localStorage) + `immer`.

**Key slices:**
- `auth` — user, isAuthLoading
- `layout` — layoutMode (6 modes), splitRatio, panels, theme, expertMode, commandPaletteOpen
- `filesystem` — fileTree, openTabs, activeTabId, dirtyFiles, expandedFolders
- `terminal` — terminalSessions map, activeTerminalId
- `processes` — background spawn tracking
- `pinnedContext` — up to 5 pinned snippets/files/notes (Section C5)
- `fileChanges` — session file mutation timeline (Section C3)
- `agent` — conversations, messages, isThinking, agentAutonomy, agentContext
- `notifications` — toast-level notification queue
- `builds` — activeBuildId

---

## 4.5 Multi-Provider AI System

### Supported Providers & Models

The model selector in AgentChat lets users switch between any of these providers at runtime.
The selected model ID is sent to `agent-inference` which routes to the correct provider.

| Provider | Model IDs | Speed | Free Tier | Secret Required |
|---|---|---|---|---|
| OnSpace AI | `google/gemini-2.5-flash` | Fast | ✅ Default | `ONSPACE_AI_API_KEY` |
| Google AI Studio | `gemini-2.5-flash-preview-05-20`, `gemini-2.0-flash` | Fast | 15 RPM / 1500 req/day | `GOOGLE_AI_API_KEY` |
| Groq Cloud | `llama-3.3-70b-versatile`, `mixtral-8x7b-32768` | 🔥 Blazing (600+ tok/s) | Generous | `GROQ_API_KEY` |
| OpenRouter | `deepseek/deepseek-r1:free`, `google/gemma-3-27b-it:free` | Normal | 200+ free models | `OPENROUTER_API_KEY` |
| Cerebras | `llama-3.3-70b` (prefix: `cerebras/`) | 🔥 Ultra (2000+ tok/s) | Generous | `CEREBRAS_API_KEY` |
| Together AI | `Qwen/Qwen2.5-Coder-32B-Instruct` | Normal | $1 free credit | `TOGETHER_AI_API_KEY` |

### Provider Routing Logic (agent-inference edge function)

The `resolveProvider(modelId)` function determines which API key + base URL to use:
- `gemini-*` (no `google/` prefix) → Google AI Studio
- `llama-*`, `mixtral-*` → Groq Cloud
- `cerebras/*` → Cerebras (strips prefix before sending to API)
- `deepseek/*`, `google/gemma*`, `*:free` → OpenRouter
- `Qwen/*`, `mistralai/*` → Together AI
- Everything else → OnSpace AI (default)

All providers use OpenAI-compatible `/chat/completions` endpoints.
OpenRouter receives extra `HTTP-Referer` and `X-Title` headers per their requirements.
`response_format: json_object` is only sent to providers that support it.

### Model Definition Files
- `src/types/models.ts` — `ALL_MODELS`, `PROVIDERS`, `DEFAULT_MODEL_ID`, `getModelById()`, `getModelsByProvider()`
- `src/store/useAppStore.ts` — `selectedModelId` (persisted), `setSelectedModel(modelId)` action
- `src/components/features/AgentChat.tsx` — `<ModelSelector />` component (grouped dropdown with badges, speed indicators, provider color dots)

### Adding a New Provider
1. Add to `PROVIDERS` in `src/types/models.ts`
2. Add model(s) to `ALL_MODELS` with correct `provider`, `requiresSecret`, and metadata
3. Add routing logic in `resolveProvider()` in `supabase/functions/agent-inference/index.ts`
4. Add the API key as a Supabase secret

### Slash Commands
| Command | Mode | Edge Function Behavior |
|---|---|---|
| `/review <path>` | `CODE_REVIEW_MODE` | Structured code review with score, issues, fix actions |
| `/explain <text>` | `EXPLAIN_MODE` | TL;DR + step-by-step walkthrough, no actions |
| `/test <text>` | `TEST_MODE` | Generates Vitest test file as `write_file` action |

---

## 5. Backend

### 5.1 Supabase Project
- **Project ID:** bwiudgrsglnmseggcind
- **Status:** ACTIVE_HEALTHY
- **URL:** https://bwiudgrsglnmseggcind.supabase.co

### 5.2 Database Tables (7)
profiles, connected_repos, builds, events, ai_conversations, ai_messages, terminal_sessions

### 5.3 Edge Functions
| Function | Purpose |
|---|---|
| agent-inference | Auth-protected AI proxy → OnSpace AI (Gemini 2.5 Flash) |
| github-oauth-token | Server-side GitHub OAuth code exchange |
| create-checkout | Stripe Checkout session creation |
| stripe-webhook | Stripe webhook verification + plan updates |
| transcribe-audio | OpenAI Whisper voice transcription (Phase 10, Section C1) |

### 5.4 Storage Buckets
| Bucket | Public | Max Size | Types |
|---|---|---|---|
| avatars | ✅ | 5MB | JPEG, PNG, WebP, GIF |

### 5.5 Realtime Subscriptions
| Hook | Table | Events | Purpose |
|---|---|---|---|
| useRealtimeEvents | events | INSERT | Dashboard activity feed live updates |
| useRealtimeBuilds | builds | INSERT + UPDATE | BuildMonitor real-time status |

### 5.6 Required Secrets
| Secret | Where | Purpose |
|---|---|---|
| ONSPACE_AI_API_KEY | Supabase secrets | OnSpace AI API |
| ONSPACE_AI_BASE_URL | Supabase secrets | OnSpace AI base URL |
| GITHUB_CLIENT_ID | Supabase secrets | GitHub OAuth |
| GITHUB_CLIENT_SECRET | Supabase secrets | GitHub OAuth |
| OPENAI_API_KEY | Supabase secrets | Whisper transcription (Phase 10) |
| STRIPE_SECRET_KEY | Supabase secrets | Stripe billing |
| STRIPE_WEBHOOK_SECRET | Supabase secrets | Stripe webhooks |

---

## 6. Core Features

### 6.1 AI Agent
- System prompt with workspace context (file tree, open files, terminal output, pinned context)
- Slash command detection: `/review path` triggers code review mode
- Action auto-execution based on `agentAutonomy` level:
  - `ask` — every action needs approval (default)
  - `auto-safe` — auto-executes reads, writes, create_dir
  - `full-auto` — executes all except delete_file and open_pr
- DiffPreview rendered on `edit_file` actions with diff field
- Pinned context chips bar (max 5 items, FIFO eviction)

### 6.2 Voice Input (Section C1)
- Mic button in PromptBar
- `MediaRecorder` API captures audio (webm/opus format)
- Blob sent to `transcribe-audio` Edge Function → OpenAI Whisper
- Transcript injected into PromptBar textarea
- Requires `OPENAI_API_KEY` secret in Supabase

### 6.3 File Change Timeline (Section C3)
- `fileChanges` array in Zustand (ephemeral, max 200 entries)
- `recordFileChange(event)` — called by executeAction on FS mutations
- `<FileTimeline />` component — collapsible, click to open file in editor
- Source: 'user' or 'agent', action: 'created' | 'modified' | 'deleted'

### 6.4 Pinned Context (Section C5)
- `pinnedContext` array in Zustand (persisted, max 5 items)
- `addPinnedContext(item)` — type: 'snippet' | 'file' | 'note'
- Displayed as chips above AgentChat input
- Injected into agent context as high-priority system prompt section
- `removePinnedContext(id)` — removes chip

### 6.5 Enhanced Boot Sequence (Section D1)
5 phases with progress bar and icon animation:
1. 5% — Initializing sandbox (Zap icon)
2. 25% — Mounting workspace (HardDrive icon)
3. 55% — Wiring terminal shell (Terminal icon)
4. 80% — Loading AI context (Cpu icon)
5. 100% — Ready (mint gradient progress bar)

Progress is simulated via setTimeout intervals keyed to `isBooting` state.

### 6.6 Typed Error Hierarchy (Section A3)
```
YFitOpsError (base)
├── WebContainerError     — boot/FS failures
├── FilesystemError       — read/write/unlink (includes path)
├── AgentExecutionError   — action executor (includes actionType)
├── BackendUnavailableError — Supabase not configured
├── AuthError             — auth failures
├── DangerousCommandError — blocked commands (includes cmd)
├── RateLimitError        — rate limit (includes retryAfter)
└── NetworkError          — network failures
```

### 6.7 Supabase Realtime (Section A4)
- **Events**: `useRealtimeEvents(userId)` — subscribes to `events` table `INSERT` filtered by `user_id=eq.${userId}`. On new event, prepends to `['events-feed', userId]` React Query cache and invalidates dashboard stats.
- **Builds**: `useRealtimeBuilds(repoIds)` — subscribes to `builds` table `INSERT + UPDATE`. Updates `['builds']` React Query cache in place.
- Both hooks called in `AppShell` after user auth and repo IDs are available.

### 6.8 GitHub REST Client (Section A5)
`src/lib/github.ts` — no external dependencies:
- `getGitHubToken()` — reads from profiles
- `saveGitHubToken(token)` — validates against /user, saves to profiles + github_username
- `listUserRepos(token?)` — GET /user/repos?sort=updated&per_page=100
- `connectReposToSupabase(repos)` — bulk upsert to connected_repos
- `createPullRequest(owner, repo, head, base, title, body)`
- `getGitHubUser(token?)`

### 6.9 Code Review Slash Command (Section C2)
Type `/review path/to/file.ts` in AgentChat. The `slashCommand: 'CODE_REVIEW_MODE'` field is sent to `agent-inference`. The edge function detects this and uses a specialized code review system prompt that returns structured issues (Critical/Warning/Suggestion) with line numbers and `edit_file` fix actions.

---

## 7. Layout Modes

| Mode | Description |
|---|---|
| `split-horizontal` (default) | Explorer + Editor | Terminal + Chat |
| `editor-only` | Full-width editor |
| `terminal-only` | Full-screen terminal |
| `chat-only` | Full-screen AI chat |
| `split-vertical` | Editor (top) + Chat (bottom) |
| `full-ide` | True quad pane: Explorer + Editor (top-left + top-right) + Terminal + Chat (bottom) |

---

## 8. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Cmd/Ctrl+K | Open command palette |
| Cmd/Ctrl+P | Open command palette |
| Cmd/Ctrl+B | Toggle sidebar collapse |
| Cmd/Ctrl+` | Focus terminal panel |
| Cmd/Ctrl+Shift+E | Focus explorer panel |
| Ctrl+S (in editor) | Save file |
| Ctrl+L (in terminal) | Clear terminal |
| Ctrl+C (in terminal) | SIGINT |
| Ctrl+D (in terminal) | EOF |
| Enter (PromptBar) | Send to agent |
| Shift+Enter (PromptBar) | Insert newline |
| Escape | Close modals/palette |

---

## 9. Fonts

| Font | Weights | Usage |
|---|---|---|
| Space Grotesk | 400, 500, 600, 700 | Display headings, brand elements |
| Inter | 300, 400, 500, 600, 700 | Body text, labels, UI chrome |
| JetBrains Mono | 300, 400, 500, 600 + italic | Code, terminal, file paths |

All loaded from Google Fonts in `index.html` with `display=swap`.

---

## 10. Favicon & Icons

**Favicon:** `/public/favicon-new.png` — Electric mint on dark background.  
**Icons:** `lucide-react` — outline style, consistent 12–24px. Never mix styles.

---

## 11. Modals & Overlays

| Component | Trigger |
|---|---|
| CommandPalette | Cmd+K (z-50) |
| ConfirmModal | ActionCard "Review" button |
| ContextMenu | Right-click in FileTree |
| BootOverlay | isBooting === true (z-50, 5-phase) |
| WorkspaceErrorBoundary | React render error |

---

## 12. Error Handling

All user-facing errors use `sonner` toasts. All async functions use try/catch where appropriate. The typed error hierarchy (`src/lib/errors.ts`) provides semantic error types for different failure modes. `withAuthRefresh` in `src/lib/supabase.ts` auto-retries on JWT expiry.

---

## 13. Security

### Command Safety Gate
`isDangerousCommand()` in `src/lib/utils.ts` blocks 20+ patterns before WebContainer spawn.

### Auth Guards
- `agent-inference`: JWT required → 401 if missing/invalid
- `AgentChat.handleSend()`: checks session before invoking
- RLS on all 7 tables (user isolation)
- OTP multi-layer rate limiting (in-flight lock + cooldown + 429 handler)

### COOP/COEP Headers
Both `public/_headers` (Cloudflare Pages) and `vite.config.ts` server headers set:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Resource-Policy: cross-origin`

SharedArrayBuffer runtime check in WorkspacePage throws `WebContainerError` if missing.

---

## 14. Performance

### Bundle Splitting (vite.config.ts)
```js
manualChunks: {
  'monaco-editor':   ['monaco-editor'],
  'vendor-ui':       ['react', 'react-dom', 'react-router-dom'],
  'vendor-state':    ['zustand', '@tanstack/react-query'],
  'vendor-charts':   ['recharts'],
  'vendor-supabase': ['@supabase/supabase-js'],
}
```

### React Query
- Default staleTime: 60s
- Dashboard stats: refetch every 30s
- Realtime updates bypass polling entirely

---

## 15. Phase History

| Phase | What Was Built |
|---|---|
| 1 | Foundation: design system, AppShell, routing, page shells |
| 2 | Supabase: auth, profiles, OTP, DB schema (7 tables) |
| 2b | Auth hardening: OTP rate limiting, cooldowns, in-flight locks |
| 3 | Workspace layout: 6 modes, SplitLayout, PanelShell, StatusBar |
| 4 | WebContainer + FileTree + xterm terminal |
| 5 | Monaco Editor (custom theme, per-tab models, Ctrl+S) |
| 6 | Agent Chat (ActionCards, workspace context, 401 fix) |
| 7 | Agent Action Execution (executeAction.ts, ConfirmModal) |
| 8 | Polish: keyboard shortcuts, context menu, CommandPalette actions, NotFound |
| 9 | GitHub OAuth + Conversation Persistence + Dashboard RPCs + Settings avatar |
| 10 | Mega Merge: Realtime, typed errors, GitHub REST, voice input, DiffPreview, FileTimeline, pinned context, enhanced boot, WorkspaceErrorBoundary |

---

## 16. Known Gaps

See `docs/review.md` for full audit. Key remaining items:

| Item | Priority |
|---|---|
| Inline Monaco ghost text suggestions (C6) | 🟡 Medium |
| Multi-tab xterm terminal | 🟡 Medium |
| Whisper OPENAI_API_KEY setup guide for user | 🟢 Low |
| GitHub zip clone via fflate (alternative to git cli) | 🟢 Low |
| Expert Mode steps display (draft/critique) | 🟢 Low |
| Stripe Customer Portal (manage subscription) | 🟢 Low |
| True test suite (Vitest + Playwright) | 🟢 Low |

---

*Updated by YFitOps AI Agent build process — Phase 10 complete.*

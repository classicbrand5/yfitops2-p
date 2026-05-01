# Phase 2: Supabase Backend — ✅ Complete

**Date**: 2026-05-01  
**Status**: Done  
**Depends on**: Phase 1 (Foundation)

---

## What Was Built

### Database Schema (via `prepare_supabase_sql`)

All tables created with full production config:

| Table | Description |
|---|---|
| `profiles` | User profiles, plan, AI request counts, agent settings |
| `connected_repos` | GitHub repos linked per user |
| `builds` | CI/CD build records per repo |
| `ai_conversations` | Chat session metadata |
| `ai_messages` | Individual messages per conversation |
| `terminal_sessions` | WebContainer/remote terminal session records |
| `events` | Analytics event log (ai_request, build, etc.) |

**Indexes**: 12 optimized indexes on foreign keys, status columns, and `created_at DESC`  
**RLS**: Enabled on all 7 tables. 18 separate policies (select/insert/update/delete per role).  
**Triggers**:
- `on_auth_user_created` → auto-creates `profiles` row on signup
- `on_ai_message_inserted` → increments `ai_conversations.message_count`
- `profiles_updated_at` → auto-sets `updated_at` on every UPDATE

**Analytics RPC functions**:
- `get_build_success_rate(weeks)` — build success % per week for last N weeks
- `get_ai_usage(days)` — AI request count per day for last N days
- `get_dashboard_stats()` — single JSON with all 4 dashboard stat counts

---

### Supabase Client (`src/lib/supabase.ts`)

- `createClient` with `flowType: 'pkce'` for OAuth security
- `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`
- Throws at module load if env vars are missing (fails fast, never silently)
- Exported as `supabase` singleton

---

### Real Auth Hook (`src/hooks/useAuth.ts`)

**Replaced**: Mock localStorage auth  
**Implemented**: OTP + Password flow as per spec

#### Auth Service (`authService`)
- `sendOtp(email)` → `supabase.auth.signInWithOtp` with `shouldCreateUser: true`
- `verifyOtp(email, token)` → `supabase.auth.verifyOtp` with `type: 'email'`
- `setPasswordAndName(password, fullName, role)` → `supabase.auth.updateUser` sets password + user_metadata
- `signInWithPassword(email, password)` → `supabase.auth.signInWithPassword`
- `signInWithGitHub()` → `supabase.auth.signInWithOAuth` with GitHub provider + repo scopes
- `signOut()` → `supabase.auth.signOut`
- `mapUser(user)` → synchronous mapping from `User` → `UserProfile` (reads from `user_metadata`)

#### `useAuth` Hook
- **Double-safety init**: `getSession()` + `onAuthStateChange()` listener — both call `setUser`
- Handles: `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`
- `signOut()` calls `authService.signOut()` then `navigate('/auth')`
- `setAuthLoading(false)` called in all branches — no infinite loading

---

### Updated Auth Page (`src/pages/Auth.tsx`)

**Multi-step Sign Up** (OTP flow):

```
Step 1: Email  →  Step 2: OTP Verify  →  Step 3: Set Password
```

- Step indicators show current/completed/pending state with color transitions
- Step 1: Name + email + role + ToS agreement → `authService.sendOtp()`
- Step 2: Centered numeric OTP input (monospace, letter-spacing) + 6-digit validation → `authService.verifyOtp()`
- Step 3: Password + confirm + min 8 chars → `authService.setPasswordAndName()` → `navigate('/dashboard')`
- Back navigation on OTP step resets to email step
- All errors surface via both inline banner AND `toast.error()`
- GitHub OAuth button stays on Step 1 for quick access

**Sign In**: Email + password → `authService.signInWithPassword()` → `navigate('/dashboard')`. No mock delay.

**Error handling**: Per spec — each `catch` shows error in banner + toast, resets `loading` state only on error (not on success before navigation).

---

### Agent Edge Function (`supabase/functions/agent-inference/index.ts`)

- CORS handled as first check via shared `_shared/cors.ts` headers
- JWT auth: extracts `Authorization` header, calls `supabase.auth.getUser(token)` to verify
- Validates `messages[]` is non-empty array
- Calls OnSpace AI at `ONSPACE_AI_BASE_URL/chat/completions` with `google/gemini-2.5-flash`
- `response_format: { type: 'json_object' }` — enforces structured JSON output
- Validates response schema: `final: string`, `actions?: []`, `steps?: {}`
- Logs `ai_request` event to `events` table via service role client (non-fatal)
- All errors return JSON with descriptive message + correct HTTP status

**Environment secrets required**:
- `ONSPACE_AI_API_KEY` ✓ (configured)
- `ONSPACE_AI_BASE_URL` ✓ (configured)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-injected by Supabase)

---

## Decisions Made

| Decision | Rationale |
|---|---|
| OTP + Password (not magic link only) | Spec mandates this hybrid. User gets email verification AND password for return logins. |
| `mapSupabaseUser` is synchronous | Per spec — no DB queries in auth mapping. Profile data fetched separately if needed. |
| Auth page uses `authService` directly | Cleaner separation — the service class handles all Supabase calls, hook provides lifecycle. |
| Edge Function returns full JSON (not SSE) | Avoids partial JSON parsing. Frontend shows shimmer skeleton while waiting. |
| Analytics log is non-fatal | A logging failure must never fail an AI request. |

---

## Known Gaps (Addressed in Later Phases)

- GitHub OAuth requires Supabase Dashboard config (enable GitHub provider + add Client ID/Secret)
- `profiles` table row is created by trigger, but `plan`/`ai_requests_*` fields default to starter — a Phase 16 Settings page can update them
- `useAuth` doesn't yet fetch the full profile from `profiles` table (only uses `user_metadata`) — Phase 13 Dashboard will add profile query

---

## Next Phase

**Phase 3: AppShell Polish + SplitLayout**
- Wire `useKeyboardShortcuts` into AppShell
- Build `SplitLayout.tsx` with drag divider, min/max constraints, ghost line
- Wire `CommandPalette` Cmd+K trigger
- Add WorkspacePage real layout scaffold (Explorer + Editor + Terminal + Chat panels)

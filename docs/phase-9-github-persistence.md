// ─────────────────────────────────────────────────────────
// Phase 9 — GitHub Integration & Conversation Persistence
//
// Status: ✅ Complete
// ─────────────────────────────────────────────────────────

# Phase 9 — GitHub Integration & Conversation Persistence

**Status:** ✅ Complete  
**Live URL:** https://yfitops2.pages.dev

---

## Goal

Move from a demo workspace to a production-ready tool by adding:
1. GitHub OAuth connect + repository clone into WebContainer
2. Conversation persistence (Supabase `ai_conversations` + `ai_messages`)
3. Token-expiry resilience via `withAuthRefresh`
4. Real Dashboard analytics (Supabase RPCs)
5. Settings page — profile update + avatar upload to Supabase Storage

---

## Changes Made

### 1. `withAuthRefresh` — `src/lib/supabase.ts`

Appended a generic retry wrapper to the existing client file:

```ts
export async function withAuthRefresh<T>(fn: () => Promise<T>): Promise<T>
```

- Catches 401 / JWT-expired errors
- Calls `supabase.auth.refreshSession()` once
- Retries `fn` with the fresh token
- Re-throws if the session can't be refreshed (user must log in again)

Used in: Dashboard (stats RPCs), Settings (profile fetch/save), GitHubRepoConnect, GitHubCallback, useConversationSync.

---

### 2. `useConversationSync` — `src/hooks/useConversationSync.ts`

New hook registered in `AppShell`. Runs once when `user` becomes available.

**What it does:**
1. Fetches up to 50 conversations from `ai_conversations` ordered by `updated_at DESC`
2. Maps DB rows → `ConversationMeta` and calls `setConversations()`
3. Sets `activeConversationId` to the most recent conversation if none is active
4. Fetches messages for the 5 most recent conversations from `ai_messages`
5. Merges messages into Zustand store — only if the local conversation is empty (avoids overwriting in-progress chats)

**RLS:** Users only receive their own data (enforced by row-level security policies).

---

### 3. `createNewConversation` Supabase persistence

`useAppStore.ts` → `createNewConversation` action now inserts a row into `ai_conversations`:

```ts
supabase.from('ai_conversations').insert({ user_id, title, category, created_at })
```

The Supabase-generated UUID is used as the conversation's canonical ID. Falls back to local UUID on network error so chat still works offline.

**`addMessage`** similarly inserts into `ai_messages`:
- `conversation_id`, `role`, `content`, `metadata`, `actions`
- `on_ai_message_inserted` trigger in Supabase auto-increments `message_count`

**`updateMessage`** patches the row in `ai_messages` when the assistant response arrives.

---

### 4. GitHub OAuth Connect — `src/components/features/GitHubRepoConnect.tsx`

Shows on the Dashboard inside a "GitHub" card.

**Flow:**
1. User clicks "Connect GitHub" → redirect to `github.com/login/oauth/authorize` with `repo,user:email,read:user` scopes
2. GitHub redirects to `/auth/github/callback?code=…&state=…`
3. `GitHubCallback` page exchanges code via the `github-oauth-token` edge function
4. Token stored in `profiles.github_access_token`
5. Dashboard refetches profile → shows "Connected" badge + clone form

**Clone flow:**
- User pastes a repo URL (e.g., `owner/repo` or full GitHub URL)
- `git clone https://<token>@github.com/owner/repo.git /repo` spawned via `wc.spawn()`
- After exit code 0: `buildFileTree` → `setFileTree` → file tree shows cloned repo
- Inserts/upserts a row in `connected_repos` table

---

### 5. `github-oauth-token` — `supabase/functions/github-oauth-token/index.ts`

New Supabase Edge Function. **Must be deployed manually** (see setup instructions below).

**Request:** `POST { code: string }`  
**Response:** `{ access_token: string }`

- Reads `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` from Supabase secrets
- Calls `github.com/login/oauth/access_token` server-side (client secret never exposed to browser)

---

### 6. `GitHubCallback` page — `src/pages/GitHubCallback.tsx`

Route: `/auth/github/callback`

Phases displayed to the user:
- `exchanging` → calling edge function
- `storing` → saving token to profiles
- `done` → redirecting to Dashboard
- `error` → shows error with back button

CSRF protection: validates `state` param against `sessionStorage.github_oauth_state`.

---

### 7. Dashboard — `src/pages/Dashboard.tsx`

**Real data via React Query:**
- `get_dashboard_stats()` RPC → Connected Repos, AI Tasks Total, Conversations, Terminal Sessions stat cards
- `get_ai_usage(30)` RPC → last 30 days of daily request counts → recharts `AreaChart`
- Profile query → `ai_requests_used`, `ai_requests_limit`, `plan`, `github_access_token`

All queries wrapped in `withAuthRefresh`. Stat cards show `<Loader2>` spinner while loading.

GitHub section appears below the AI usage chart — either "Connect GitHub" button or "Clone Repository" form.

---

### 8. Settings — `src/pages/Settings.tsx`

Replaced the `PlaceholderPage` with a real form.

**Profile section:**
- Avatar upload → Supabase Storage bucket `avatars` (path: `{user_id}/avatar.{ext}`)
- `getPublicUrl()` → cache-busted with `?t=<timestamp>` to force browser refresh
- Full name + GitHub username editable fields
- Email shown as read-only
- Save button → `profiles.update()`

**Deferred sections** (Security, Notifications, Appearance, Editor Preferences) shown as locked cards with descriptions — visible but not interactive.

---

## Setup Instructions for GitHub OAuth

### Step 1: Create a GitHub OAuth App

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
2. Set:
   - **Application name:** YFitOps
   - **Homepage URL:** `https://yfitops2.pages.dev`
   - **Authorization callback URL:** `https://yfitops2.pages.dev/auth/github/callback`
3. Note the **Client ID** and generate a **Client Secret**

### Step 2: Set environment variables

In your `.env` file (local dev):
```
VITE_GITHUB_CLIENT_ID=your_client_id_here
```

In Cloudflare Pages → Settings → Environment Variables:
```
VITE_GITHUB_CLIENT_ID=your_client_id_here
```

### Step 3: Deploy the Edge Function

```bash
supabase functions deploy github-oauth-token
```

Set the secrets:
```bash
supabase secrets set GITHUB_CLIENT_ID=your_client_id
supabase secrets set GITHUB_CLIENT_SECRET=your_client_secret
```

### Step 4: Create the Supabase Storage bucket

Run in SQL editor or via dashboard:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "authenticated_upload_own_avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "public_read_avatars"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/supabase.ts` | Added `withAuthRefresh<T>` |
| `src/hooks/useConversationSync.ts` | **New** — loads conversations + messages from Supabase on boot |
| `src/store/useAppStore.ts` | `createNewConversation` + `addMessage` + `updateMessage` write to Supabase in background |
| `src/components/features/GitHubRepoConnect.tsx` | **New** — GitHub connect + clone component |
| `src/pages/GitHubCallback.tsx` | **New** — OAuth callback handler |
| `src/pages/Dashboard.tsx` | Real RPC data, AI usage chart, GitHub card |
| `src/pages/Settings.tsx` | Profile editor + avatar upload |
| `src/components/layout/AppShell.tsx` | Added `useConversationSync()` call |
| `src/App.tsx` | Added `/auth/github/callback` route |
| `supabase/functions/github-oauth-token/index.ts` | **New** — token exchange edge function |
| `docs/phase-9-github-persistence.md` | **New** — this file |

---

## Known Limitations / Deferred

- **Conversation delete from DB** — deleting a conversation from the store does not yet remove it from Supabase. Add a `deleteConversation(id)` action that calls `supabase.from('ai_conversations').delete().eq('id', id)`.
- **Token encryption** — `github_access_token` is stored as plaintext. RLS prevents other users from reading it, but use Supabase Vault for production.
- **Private repos** — the clone URL includes the token as the Git credential. This works but the token appears in `git log --all` output. Consider using `git credential.helper` in WebContainer instead.
- **Directory-level clone destination** — currently clones to `/repo-name`. Multiple clones would conflict. Add a directory picker or namespace by repo.
- **Real-time conversation sync** — messages are written on creation but not subscribed via Realtime. Another device would need to reload to see new messages.
- **Offline resilience** — if Supabase is unreachable, conversations still work locally (Zustand in-memory). On reconnect, messages are not replayed to DB. Add a pending-queue mechanism.

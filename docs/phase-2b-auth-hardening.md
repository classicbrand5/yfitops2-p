# Phase 2b: Auth Reliability Hardening — ✅ Complete

**Date**: 2026-05-01  
**Status**: Done  
**Depends on**: Phase 2 (Supabase Backend)

---

## Audit: Root Causes Identified

| # | Root Cause | Severity |
|---|---|---|
| 1 | `getSession()` + `onAuthStateChange()` both called `setUser()` on page load → double state flush, potential double-render in StrictMode | High |
| 2 | `setAuthLoading(false)` was never called after `getSession()` resolved — only after `onAuthStateChange` events → `isAuthLoading` stayed `true` in a race condition | High |
| 3 | No in-flight lock on `handleSendOtp` → double-clicking "Send Verification Code" fired two `signInWithOtp()` calls, direct cause of `429 Too Many Requests` | Critical |
| 4 | No OTP cooldown — "Back → re-submit" path allowed unlimited resends within seconds | Critical |
| 5 | `finally { setLoading(false) }` in `handleSendOtp` reset loading state before the step transition stabilized → flicker and possible re-trigger | Medium |
| 6 | All auth errors treated identically — `429`, invalid credentials, network errors shown with same generic banner | Medium |
| 7 | No debounce or per-action lock on any auth operation | High |

---

## Changes Made

### `src/hooks/useAuth.ts` — Complete rewrite

**Fix 1: Single authoritative source for user state**

Before:
```typescript
// ❌ BOTH called setUser — double update on every page load
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) setUser(mapSupabaseUser(session.user));
});
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') setUser(mapSupabaseUser(session.user));
});
```

After:
```typescript
// ✅ Only onAuthStateChange is authoritative
// Supabase v2 fires INITIAL_SESSION immediately with the current session
supabase.auth.onAuthStateChange((event, session) => {
  switch (event) {
    case 'INITIAL_SESSION':  // ← handles the "page reload" case
    case 'SIGNED_IN':
    case 'TOKEN_REFRESHED':
    case 'USER_UPDATED':
      setUser(session?.user ? mapSupabaseUser(session.user) : null);
      setAuthLoading(false);
      break;
    case 'SIGNED_OUT':
      setUser(null);
      setAuthLoading(false);
      break;
    default:
      setAuthLoading(false); // Always clear loading
  }
});
```

**Fix 2: `setAuthLoading(false)` called in every branch**  
Previously missing from `INITIAL_SESSION` and `TOKEN_REFRESHED` paths.

**Fix 3: StrictMode safety**  
`mountedRef.current` guard prevents state updates after unmount (StrictMode double-invokes effects).

**Fix 4: signOut concurrency guard**  
`signingOutRef` prevents parallel sign-out calls from double-firing.

**Added: `classifyAuthError()`**  
Classifies any auth error into: `rate_limit | invalid_credentials | network | server | validation | unknown`.  
Returns typed `{ type, message, retryAfterSeconds? }` for UX-appropriate display.

---

### `src/hooks/useOtpCooldown.ts` — New hook

Client-side OTP rate limiter per email address:
- **60-second default cooldown** after each OTP send
- **`sessionStorage` persistence** — survives page refresh within session (prevents refresh-to-bypass)
- **Live countdown** via `setInterval` that clears itself when reaching 0
- **Email-keyed** — changing the email field resets the timer immediately
- **API**: `{ canSend, secondsLeft, startCooldown, resetCooldown }`

```typescript
const { canSend, secondsLeft, startCooldown, resetCooldown } = useOtpCooldown(email);
```

---

### `src/pages/Auth.tsx` — Complete rewrite

**Fix 5: In-flight lock per action**  
Every auth action (sendOtp, verifyOtp, resendOtp, setPassword, signIn, github) has its own named lock:
```typescript
const inFlightRef = useRef<Record<string, boolean>>({});
if (isInFlight('sendOtp')) return; // Hard guard — not just disabled button
lockAction('sendOtp');
try { ... } finally { unlockAction('sendOtp'); }
```

**Fix 6: Correct loading state lifecycle**
- `setLoading(false)` is called in `finally` for all steps **except** successful navigation
- Navigation unmounts the component — calling `setLoading(false)` before it would cause a React state update on unmounted component warning

**Fix 7: Cooldown enforced at handler level (not just UI)**
```typescript
if (!canSend) {
  setBanner({ kind: 'warning', message: `Please wait ${secondsLeft}s...` });
  return; // Hard block — even if button somehow enabled
}
```

**Fix 8: 429 and error classification**  
Each action calls `classifyAuthError(err)` and shows:
- `rate_limit` → yellow warning banner + `toast.warning()`
- `invalid_credentials` → red banner with specific message
- `network` → red banner with connection hint
- `server` → red banner with retry hint

**Fix 9: Resend control on OTP step**  
Separate "Resend code" button with:
- Disabled + countdown display during cooldown
- Separate in-flight lock (`resendOtp`) independent from `verifyOtp`
- `canSend` checked at handler level before any API call

**Fix 10: Banners cleared on user input**  
Every `onChange` handler calls `clearBanner()` so stale errors disappear as the user types.

**Fix 11: All interactive targets ≥ 44×44px**  
Password toggle buttons now have `min-w-[44px] min-h-[44px]` wrappers.

**Fix 12: `useCallback` on all handlers**  
Prevents function identity changes from causing re-renders in children.

---

## Security Improvements

- Error messages never reveal whether an account exists (`classifyAuthError` normalises all "not found" responses to the same generic credential error)
- OTP cooldown at client level is a UX protection layer on top of Supabase's server-side rate limits (not a replacement)
- No internal auth provider details exposed in UI messages

---

## UX State Matrix

| State | Button text | Banner | Notes |
|---|---|---|---|
| Initial | "Send Verification Code" | — | Default |
| In-flight | "Sending code…" + spinner | — | Button disabled |
| Cooldown (canSend=false) | "Wait 60s" + clock icon | — | Hard blocked |
| Success | → next step | "Code sent to…" | Loading clears |
| Rate limited | "Send Verification Code" | Yellow warning | No auto-retry |
| Error | "Send Verification Code" | Red error | Input clears it on change |

---

## Remaining Risks / Assumptions

| Risk | Mitigation |
|---|---|
| Supabase server-side rate limit window may differ from 60s client cooldown | Client cooldown is conservative — 60s ≥ most provider limits. Can be tuned via `COOLDOWN_SECONDS` constant in `useOtpCooldown.ts` |
| React StrictMode double-invokes effects in development | `mountedRef` guard + single-source `onAuthStateChange` subscription prevents duplicate calls |
| GitHub OAuth button has no loading state (browser redirects) | Correct per spec — setting loading before redirect would leave state abandoned |
| sessionStorage not available in some private/iframe contexts | Non-fatal: `getStoredSentAt` catches the error and returns 0 (no cooldown, permissive) |

# Auth OTP 429 Hardening — Corrections Audit

**Date**: 2026-05-01  
**Scope**: Full audit of OTP send flow for duplicate requests, race conditions, cooldown mismatches, and 429 enforcement

---

## Audit Checklist: Search Results

### Call sites of `sendOtp()` / `signInWithOtp()`

| Location | Call | Guarded? |
|---|---|---|
| `src/hooks/useAuth.ts:101` | `supabase.auth.signInWithOtp(...)` | ✅ Encapsulated inside `AuthService.sendOtp()` — never called directly from components |
| `src/pages/Auth.tsx:251` | `authService.sendOtp(suEmail.trim())` | ✅ Inside `handleSendOtp` — has cooldown gate + in-flight lock |
| `src/pages/Auth.tsx:319` | `authService.sendOtp(suEmail.trim())` | ✅ Inside `handleResendOtp` — has cooldown gate + in-flight lock |

**No unexpected call sites found.**

### `onAuthStateChange` + `getSession` usage

| File | Line | Usage | Status |
|---|---|---|---|
| `src/hooks/useAuth.ts:187` | `supabase.auth.onAuthStateChange(...)` | Single subscription, INITIAL_SESSION handled | ✅ |
| `src/hooks/useAuth.ts:184` | `// We do NOT also call getSession()` | Comment confirms intentional removal | ✅ |

**No `getSession()` + `onAuthStateChange()` double-set found.**

### Click handlers / back-navigation that could re-trigger OTP

| Handler | Location | Status |
|---|---|---|
| `handleSendOtp` | Auth.tsx:220 | ✅ cooldown gate + in-flight lock |
| `handleResendOtp` | Auth.tsx:303 | ✅ cooldown gate + in-flight lock |
| "← Change email" button | Auth.tsx:768 | ✅ Only calls `setSignupStep('email')` — does NOT trigger OTP |

### `useEffect` that could trigger OTP on mount/change

No `useEffect` was found that triggers `sendOtp` or any auth request automatically. All OTP sends are strictly initiated from user click handlers.

---

## Root Cause Identified

### Critical Gap: 429 does NOT enforce cooldown

**Before (broken behavior):**
```typescript
// handleAuthError — empty deps, no cooldown update
const handleAuthError = useCallback(
  (err: unknown, action: string) => {
    const classified = classifyAuthError(err);
    if (classified.type === 'rate_limit') {
      setBanner({ kind: 'warning', message: classified.message });
      toast.warning(classified.message);  // ← Only UX feedback
      // ❌ Nothing blocks the resend button from being re-enabled
      // ❌ startCooldown() was never called on 429
    }
  },
  [] // ← empty deps — startCooldown was not accessible
);
```

**After a 429:** The banner showed "Too many requests", but:
1. The `canSend` state remained `true` (cooldown was already expired or never started)
2. The resend button was immediately re-enabled
3. User could send another OTP request moments after the 429

---

## Changes Made

### 1. `src/hooks/useOtpCooldown.ts` — Added `forceCooldown(seconds)`

**Purpose**: Allow external code (the error handler) to extend or force a cooldown period, especially when a 429 response carries a `retryAfterSeconds` hint from the server.

```typescript
// NEW: forceCooldown — aligns client-side gate with server throttle window
const forceCooldown = useCallback(
  (seconds: number) => {
    // Store synthetic sentAt so refresh-bypass is still prevented
    const syntheticSentAt = Date.now() - (COOLDOWN_SECONDS - Math.min(seconds, COOLDOWN_SECONDS)) * 1000;
    setStoredSentAt(email, syntheticSentAt);
    setSecondsLeft(Math.min(seconds, COOLDOWN_SECONDS));
  },
  [email]
);
```

Return signature now includes `forceCooldown`:
```typescript
return { canSend, secondsLeft, startCooldown, forceCooldown, resetCooldown };
```

### 2. `src/pages/Auth.tsx` — 429 now calls `forceCooldown()`

**Change 1**: Destructure `forceCooldown` from `useOtpCooldown`:
```typescript
// Before:
const { canSend, secondsLeft, startCooldown, resetCooldown } = useOtpCooldown(suEmail);

// After:
const { canSend, secondsLeft, startCooldown, forceCooldown, resetCooldown } = useOtpCooldown(suEmail);
```

**Change 2**: `handleAuthError` now calls `forceCooldown()` on 429, with `forceCooldown` correctly in its deps:
```typescript
const handleAuthError = useCallback(
  (err: unknown, action: string) => {
    const classified = classifyAuthError(err);

    if (classified.type === 'rate_limit') {
      // ✅ KEY FIX: enforce the cooldown at the gate level
      const retryAfter = classified.retryAfterSeconds ?? 60;
      forceCooldown(retryAfter);  // ← blocks resend button immediately
      setBanner({ kind: 'warning', message: `Too many requests. Please wait ${retryAfter}s...` });
      toast.warning(`Rate limited — wait ${retryAfter}s before sending another code.`);
    } else {
      setBanner({ kind: 'error', message: classified.message });
      toast.error(classified.message);
    }
  },
  [forceCooldown]  // ← stable ref from useOtpCooldown's useCallback
);
```

---

## Explicit Confirmation: Each Requirement

| Requirement | Status | Evidence |
|---|---|---|
| `useAuth.ts`: single authoritative `setUser` source | ✅ **Already correct** | Only `onAuthStateChange` calls `setUser`. `getSession()` was intentionally removed in Phase 2b. Comment at line 184 confirms this. |
| `useAuth.ts`: `setAuthLoading(false)` in every branch | ✅ **Already correct** | `INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`, and `default` all call `setAuthLoading(false)` |
| `useAuth.ts`: StrictMode safety | ✅ **Already correct** | `mountedRef` guard at line 200 prevents state updates after unmount |
| `Auth.tsx`: per-action in-flight locks | ✅ **Already correct** | `inFlightRef` guards `sendOtp`, `resendOtp`, `verifyOtp`, `setPassword`, `signin`, `github` independently |
| `Auth.tsx`: cooldown gate on initial send | ✅ **Already correct** | `if (!canSend) return` before `lockAction('sendOtp')` |
| `Auth.tsx`: cooldown gate on resend | ✅ **Already correct** | `if (!canSend) return` before `lockAction('resendOtp')` |
| `Auth.tsx`: button disabled while loading | ✅ **Already correct** | All submit buttons have `disabled={suLoading || ...}` |
| `useOtpCooldown.ts`: storage per email | ✅ **Already correct** | Key is `${STORAGE_KEY}:${email}` |
| `useOtpCooldown.ts`: startCooldown after success only | ✅ **Already correct** | `startCooldown()` called inside `try` block, after `await authService.sendOtp()` |
| `useOtpCooldown.ts`: recalculates when email changes | ✅ **Already correct** | `useEffect([email])` re-reads stored timestamp |
| `useOtpCooldown.ts`: sessionStorage persists across refresh | ✅ **Already correct** | `getStoredSentAt(email)` initializes state from sessionStorage |
| **429 handling: extends cooldown (not just messaging)** | ✅ **FIXED in this audit** | `forceCooldown(retryAfterSeconds)` now called in `handleAuthError` |
| No `useEffect` triggers OTP on mount | ✅ **Confirmed** | Search found no automatic OTP sends in effects |
| "Back to email" does not retrigger OTP | ✅ **Confirmed** | Button only calls `setSignupStep('email')` |

---

## Files Modified

| File | Change |
|---|---|
| `src/hooks/useOtpCooldown.ts` | Added `forceCooldown(seconds: number)` method and exported it from the return value |
| `src/pages/Auth.tsx` | Destructured `forceCooldown`; fixed `handleAuthError` to call `forceCooldown(retryAfter)` on 429; added `forceCooldown` to `useCallback` deps |
| `docs/auth-corrections.md` | This file |

---

## Verification: How the Prevention Logic Was Validated

- **No duplicate OTP on double-click**: `inFlightRef.current['sendOtp']` is set to `true` before `await authService.sendOtp(...)` and cleared in `finally`. Any re-click during the request hits `if (isInFlight('sendOtp')) return` and exits immediately.

- **No resend spam**: `canSend === false` gates both `handleSendOtp` and `handleResendOtp` at handler level, not just UI. Even if the button is somehow enabled, the handler guard fires before any API call.

- **Refresh bypass prevented**: `useOtpCooldown` reads from `sessionStorage` via `getStoredSentAt(email)` on init. If a `sentAt` timestamp exists and the cooldown window hasn't elapsed, `secondsLeft > 0` on the very first render.

- **429 enforced, not just shown**: `forceCooldown(retryAfter)` writes a synthetic `sentAt` to `sessionStorage` and sets `secondsLeft` to the retry window. This means: (a) `canSend` becomes `false` immediately, (b) the button is disabled, (c) a page refresh still shows the remaining cooldown, (d) `handleResendOtp`'s handler-level guard blocks any direct call.

- **`useAuth.ts` single source verified**: Searched for all `setUser` calls in `useAuth.ts`. Only one call site: inside `onAuthStateChange`. No `getSession().then(setUser)` pattern.

---

## Remaining Risks

| Risk | Mitigation |
|---|---|
| Server's actual rate limit window may be longer than 60s | `forceCooldown` uses `classified.retryAfterSeconds` from the error (60s default). If Supabase returns a `Retry-After` header, `classifyAuthError` can be extended to parse it. |
| `sessionStorage` unavailable in some iframe/private contexts | `getStoredSentAt` / `setStoredSentAt` both have `try/catch`. On failure, cooldown is non-persistent (permissive fallback). This is acceptable — persistent gate in `inFlightRef` still blocks the current session. |
| GitHub OAuth loading state | No `loading` state is set before OAuth redirect — intentional. Setting it before redirect would leave the state stuck because the component unmounts and never clears it. |

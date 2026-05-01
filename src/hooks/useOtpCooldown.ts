// ─────────────────────────────────────────────────────────
// useOtpCooldown — Client-side OTP resend rate limiter
//
// Tracks the timestamp of the last OTP send per identity
// (email address) in sessionStorage so a page refresh does
// not immediately bypass the cooldown.
//
// Returns:
//   canSend        — true when sending is permitted
//   secondsLeft    — remaining cooldown seconds (0 when allowed)
//   startCooldown  — call after a successful OTP send
//   resetCooldown  — call to clear (e.g. after successful verify)
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';

const COOLDOWN_SECONDS = 60;         // 60 s between resends
const STORAGE_KEY = 'yfitops_otp_sent_at'; // sessionStorage key

function getStoredSentAt(email: string): number {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_KEY}:${email}`);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

function setStoredSentAt(email: string, ts: number): void {
  try {
    sessionStorage.setItem(`${STORAGE_KEY}:${email}`, String(ts));
  } catch {
    // sessionStorage write failed — non-fatal
  }
}

function clearStoredSentAt(email: string): void {
  try {
    sessionStorage.removeItem(`${STORAGE_KEY}:${email}`);
  } catch {
    // non-fatal
  }
}

function computeSecondsLeft(sentAt: number): number {
  if (!sentAt) return 0;
  const elapsed = Math.floor((Date.now() - sentAt) / 1000);
  return Math.max(0, COOLDOWN_SECONDS - elapsed);
}

export function useOtpCooldown(email: string) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    computeSecondsLeft(getStoredSentAt(email))
  );

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Recompute when email changes (e.g. user edits email field)
  useEffect(() => {
    const initial = computeSecondsLeft(getStoredSentAt(email));
    setSecondsLeft(initial);
  }, [email]);

  // Tick down every second while cooldown is active
  useEffect(() => {
    if (secondsLeft <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = Math.max(0, prev - 1);
        if (next === 0 && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [secondsLeft]);

  const startCooldown = useCallback(() => {
    const now = Date.now();
    setStoredSentAt(email, now);
    setSecondsLeft(COOLDOWN_SECONDS);
  }, [email]);

  /**
   * forceCooldown — called when the backend returns a 429 with a
   * retryAfterSeconds value. Overrides the default duration so the
   * client-side gate aligns with the server's actual throttle window.
   */
  const forceCooldown = useCallback(
    (seconds: number) => {
      // Store a synthetic sentAt so refresh-bypass is still prevented.
      // We subtract (COOLDOWN_SECONDS - seconds) from now so that when
      // computeSecondsLeft reads it, it computes exactly `seconds` left.
      const syntheticSentAt = Date.now() - (COOLDOWN_SECONDS - Math.min(seconds, COOLDOWN_SECONDS)) * 1000;
      setStoredSentAt(email, syntheticSentAt);
      setSecondsLeft(Math.min(seconds, COOLDOWN_SECONDS));
    },
    [email]
  );

  const resetCooldown = useCallback(() => {
    clearStoredSentAt(email);
    setSecondsLeft(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [email]);

  return {
    canSend: secondsLeft === 0,
    secondsLeft,
    startCooldown,
    forceCooldown,
    resetCooldown,
  };
}

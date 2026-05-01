
// ─────────────────────────────────────────────────────────
// useAuth — Hardened Supabase Auth Hook (OTP + Password)
//
// Fixes from audit:
//  1. Single authoritative source: onAuthStateChange is the
//     ONLY place that calls setUser — getSession() bootstraps
//     but immediately hands off to the listener's INITIAL_SESSION
//     event (Supabase v2 fires this on first mount).
//  2. setAuthLoading(false) is always called in every branch.
//  3. StrictMode safety: mounted guard prevents state updates
//     after unmount.
//  4. No deps in useEffect that could cause re-subscription.
// ─────────────────────────────────────────────────────────

import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import type { UserProfile } from '@/types/dev.types';

// ── Map Supabase user → internal UserProfile ──────────────
// MUST be synchronous — no async/await, no DB queries
export function mapSupabaseUser(user: User): UserProfile {
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    fullName:
      meta.full_name ||
      meta.name ||
      user.email?.split('@')[0] ||
      'Anonymous',
    email: user.email ?? '',
    role: (meta.role as UserProfile['role']) ?? 'developer',
    avatarUrl: meta.avatar_url ?? meta.picture,
    githubUsername: meta.user_name ?? meta.preferred_username,
    plan: 'starter',
    aiRequestsUsed: 0,
    aiRequestsLimit: 500,
    expertMode: false,
    agentAutonomy: 'ask',
    onboarded: false,
  };
}

// ── Classify auth errors for UX-appropriate messages ─────
export interface AuthError {
  type: 'rate_limit' | 'invalid_credentials' | 'network' | 'server' | 'validation' | 'unknown';
  message: string;
  retryAfterSeconds?: number;
}

export function classifyAuthError(err: unknown): AuthError {
  const raw = err as { message?: string; status?: number; code?: string };
  const message = raw?.message ?? 'An unexpected error occurred';
  const status = raw?.status;

  // 429 rate limit
  if (status === 429 || message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('too many')) {
    return {
      type: 'rate_limit',
      message: 'Too many requests. Please wait before trying again.',
      retryAfterSeconds: 60,
    };
  }

  // Invalid credentials
  if (
    message.toLowerCase().includes('invalid') ||
    message.toLowerCase().includes('wrong') ||
    message.toLowerCase().includes('incorrect') ||
    message.toLowerCase().includes('not found') ||
    message.toLowerCase().includes('no user')
  ) {
    return { type: 'invalid_credentials', message: 'Invalid email or password.' };
  }

  // OTP expired / invalid
  if (message.toLowerCase().includes('otp') || message.toLowerCase().includes('token')) {
    return { type: 'invalid_credentials', message: 'Invalid or expired verification code.' };
  }

  // Network
  if (message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network')) {
    return { type: 'network', message: 'Network error. Check your connection and try again.' };
  }

  // Server
  if (status && status >= 500) {
    return { type: 'server', message: 'Server error. Please try again in a moment.' };
  }

  return { type: 'unknown', message };
}

// ── Auth service class ────────────────────────────────────
class AuthService {
  /** Send OTP to the given email — never call more than once per cooldown */
  async sendOtp(email: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  }

  /** Verify OTP code — returns the Supabase user on success */
  async verifyOtp(email: string, token: string): Promise<User> {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) throw error;
    if (!data.user) throw new Error('OTP verification succeeded but no user returned');
    return data.user;
  }

  /** Set password + user metadata after OTP verification */
  async setPasswordAndName(
    password: string,
    fullName: string,
    role: string
  ): Promise<User> {
    const { data, error } = await supabase.auth.updateUser({
      password,
      data: { full_name: fullName, role },
    });
    if (error) throw error;
    if (!data.user) throw new Error('updateUser succeeded but no user returned');
    return data.user;
  }

  /** Sign in with email + password */
  async signInWithPassword(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  }

  /** GitHub OAuth redirect — do NOT await after this succeeds */
  async signInWithGitHub(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin,
        scopes: 'read:user user:email repo',
      },
    });
    if (error) throw error;
    // Browser will redirect — no further state management needed
  }

  /** Sign out */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  mapUser(user: User): UserProfile {
    return mapSupabaseUser(user);
  }
}

export const authService = new AuthService();

// ── Hook ──────────────────────────────────────────────────
export function useAuth() {
  const { user, setUser, setAuthLoading, isAuthLoading } = useAppStore();
  const navigate = useNavigate();

  // Guard against StrictMode double-mount and unmounted state updates
  const mountedRef = useRef(true);
  // Guard against concurrent signOut calls
  const signingOutRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    // Subscribe to auth state changes.
    // Supabase v2 fires INITIAL_SESSION immediately with the existing
    // session (or null) — this is the single authoritative source.
    // We do NOT also call getSession() to avoid a double setUser() call.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;

      console.log('[useAuth]', event, session?.user?.email ?? 'no user');

      switch (event) {
        case 'INITIAL_SESSION':
        case 'SIGNED_IN':
        case 'USER_UPDATED':
        case 'TOKEN_REFRESHED':
          if (session?.user) {
            setUser(mapSupabaseUser(session.user));
          } else {
            // INITIAL_SESSION with no session = logged out
            setUser(null);
          }
          setAuthLoading(false);
          break;

        case 'SIGNED_OUT':
          setUser(null);
          setAuthLoading(false);
          break;

        default:
          // Any other event — ensure loading is cleared
          setAuthLoading(false);
          break;
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
    // Empty deps: subscribe once, never re-subscribe.
    // setUser/setAuthLoading are stable Zustand actions.
  }, []); 

  const signOut = useCallback(async (): Promise<void> => {
    if (signingOutRef.current) return; // Prevent double sign-out
    signingOutRef.current = true;
    try {
      await authService.signOut();
      // onAuthStateChange SIGNED_OUT will call setUser(null)
    } catch (err) {
      console.error('[useAuth] signOut error:', err);
      // Force clear user even if Supabase signOut fails
      setUser(null);
    } finally {
      signingOutRef.current = false;
      navigate('/auth');
    }
  }, [setUser, navigate]);

  return {
    user,
    isAuthLoading,
    isAuthenticated: !!user,
    authService,
    signOut,
  };
}

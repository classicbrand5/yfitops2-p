// ─────────────────────────────────────────────────────────
// useAuth — Real Supabase Auth Hook (OTP + Password)
// Registration: sendOtp → verifyOtp → setPassword
// Login: signInWithPassword
// ─────────────────────────────────────────────────────────

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import type { UserProfile } from '@/types/dev.types';

// ── Map Supabase user → internal UserProfile ──────────────
// MUST be synchronous — no async/await, no DB queries
function mapSupabaseUser(user: User): UserProfile {
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

// ── Auth service class ────────────────────────────────────
class AuthService {
  /** Send OTP to the given email */
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

  /** Set password + username after OTP verification (registration) */
  async setPasswordAndName(
    password: string,
    fullName: string,
    role: string
  ): Promise<User> {
    const { data, error } = await supabase.auth.updateUser({
      password,
      data: {
        full_name: fullName,
        role,
      },
    });
    if (error) throw error;
    if (!data.user) throw new Error('updateUser succeeded but no user returned');
    return data.user;
  }

  /** Sign in with email + password */
  async signInWithPassword(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data.user;
  }

  /** GitHub OAuth redirect */
  async signInWithGitHub(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin,
        scopes: 'read:user user:email repo',
      },
    });
    if (error) throw error;
    // OAuth redirects the browser — no further action needed
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

  useEffect(() => {
    let mounted = true;

    // Safety #1: Restore from existing session on page reload
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
      } else {
        setUser(null);
      }
    });

    // Safety #2: Listen to all auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      console.log('[useAuth] event:', event, 'user:', session?.user?.email);

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(mapSupabaseUser(session.user));
        setAuthLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAuthLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(mapSupabaseUser(session.user));
      } else if (event === 'USER_UPDATED' && session?.user) {
        setUser(mapSupabaseUser(session.user));
        setAuthLoading(false);
      } else {
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUser, setAuthLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = useCallback(async (): Promise<void> => {
    await authService.signOut();
    setUser(null);
    navigate('/auth');
  }, [setUser, navigate]);

  return {
    user,
    isAuthLoading,
    isAuthenticated: !!user,
    authService,
    signOut,
  };
}

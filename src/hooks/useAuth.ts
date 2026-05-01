import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { UserProfile } from '@/types/dev.types';

/**
 * Temporary mock auth hook.
 * Phase 4 will replace with real Supabase auth.
 * Reads from localStorage for persistence across reloads.
 */
export function useAuth() {
  const { user, setUser, setAuthLoading, isAuthLoading } = useAppStore();

  useEffect(() => {
    // Check for mock user in localStorage
    const stored = localStorage.getItem('yfitops-mock-user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as UserProfile;
        setUser(parsed);
      } catch {
        localStorage.removeItem('yfitops-mock-user');
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [setUser]);

  const signIn = (email: string, _password: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser: UserProfile = {
          id: 'mock-user-1',
          fullName: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          email,
          role: 'developer',
          plan: 'pro',
          aiRequestsUsed: 247,
          aiRequestsLimit: 1000,
          expertMode: false,
          agentAutonomy: 'ask',
          onboarded: true,
        };
        localStorage.setItem('yfitops-mock-user', JSON.stringify(mockUser));
        setUser(mockUser);
        resolve();
      }, 800);
    });
  };

  const signUp = (email: string, fullName: string, _password: string): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser: UserProfile = {
          id: `user-${Date.now()}`,
          fullName,
          email,
          role: 'developer',
          plan: 'starter',
          aiRequestsUsed: 0,
          aiRequestsLimit: 500,
          expertMode: false,
          agentAutonomy: 'ask',
          onboarded: false,
        };
        localStorage.setItem('yfitops-mock-user', JSON.stringify(mockUser));
        setUser(mockUser);
        resolve();
      }, 1000);
    });
  };

  const signOut = (): void => {
    localStorage.removeItem('yfitops-mock-user');
    setUser(null);
  };

  const continueWithGitHub = (): Promise<void> => {
    return signIn('dev@github.com', 'github');
  };

  return {
    user,
    isAuthLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    continueWithGitHub,
  };
}

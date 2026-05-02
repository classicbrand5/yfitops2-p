// ─────────────────────────────────────────────────────────
// useRealtimeBuilds — Supabase Realtime (Section A4)
//
// Subscribes to INSERT + UPDATE events on the `builds`
// table. Updates React Query cache so BuildMonitor
// refreshes in real time without polling.
// ─────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface BuildRecord {
  id: string;
  repo_id: string;
  branch: string;
  commit_sha: string | null;
  commit_message: string | null;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  triggered_by: string;
  created_at: string;
}

export function useRealtimeBuilds(repoIds: string[] = []) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (repoIds.length === 0) return;

    console.log('[Realtime] Subscribing to builds for repos:', repoIds);

    const channel = supabase
      .channel('builds-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'builds',
        },
        (payload) => {
          const build = payload.new as BuildRecord;
          if (!repoIds.includes(build.repo_id)) return;

          console.log('[Realtime] New build:', build.id, build.status);

          queryClient.setQueryData<BuildRecord[]>(
            ['builds'],
            (old = []) => [build, ...old],
          );
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'builds',
        },
        (payload) => {
          const updated = payload.new as BuildRecord;
          if (!repoIds.includes(updated.repo_id)) return;

          console.log('[Realtime] Build updated:', updated.id, updated.status);

          queryClient.setQueryData<BuildRecord[]>(
            ['builds'],
            (old = []) =>
              old.map((b) => (b.id === updated.id ? updated : b)),
          );
        },
      )
      .subscribe((status) => {
        console.log('[Realtime] Builds channel status:', status);
      });

    return () => {
      console.log('[Realtime] Unsubscribing from builds');
      void supabase.removeChannel(channel);
    };
  }, [JSON.stringify(repoIds), queryClient]);
}

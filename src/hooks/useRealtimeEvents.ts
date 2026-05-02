// ─────────────────────────────────────────────────────────
// useRealtimeEvents — Supabase Realtime (Section A4)
//
// Subscribes to INSERT events on the `events` table
// filtered to the current user. Prepends new events to
// the React Query cache so the Dashboard activity feed
// updates in real time.
// ─────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface RealtimeEvent {
  id: number;
  user_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export function useRealtimeEvents(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    console.log('[Realtime] Subscribing to events for user:', userId);

    const channel = supabase
      .channel(`events-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newEvent = payload.new as RealtimeEvent;
          console.log('[Realtime] New event:', newEvent.event_type);

          // Prepend to react-query cache for activity feed
          queryClient.setQueryData<RealtimeEvent[]>(
            ['events-feed', userId],
            (old = []) => [newEvent, ...old].slice(0, 100),
          );

          // Invalidate dashboard stats to refresh counts
          void queryClient.invalidateQueries({
            queryKey: ['dashboard-stats', userId],
          });
        },
      )
      .subscribe((status) => {
        console.log('[Realtime] Events channel status:', status);
      });

    return () => {
      console.log('[Realtime] Unsubscribing from events');
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

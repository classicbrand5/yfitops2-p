// ─────────────────────────────────────────────────────────
// useConversationSync — Phase 9
//
// Loads the authenticated user's conversations and messages
// from Supabase (ai_conversations + ai_messages tables) and
// merges them into the Zustand store.
//
// Called once inside AppShell after auth is ready.
// ─────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { supabase, withAuthRefresh } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import type { ConversationMeta, AgentMessage } from '@/types/agent.types';

export function useConversationSync() {
  const { user, setConversations, setActiveConversation, activeConversationId } = useAppStore();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!user || syncedRef.current) return;
    syncedRef.current = true;

    void (async () => {
      try {
        // 1. Fetch conversations ordered by most recent
        const { data: convRows, error: convErr } = await withAuthRefresh(() =>
          supabase
            .from('ai_conversations')
            .select('id, title, category, repo_id, message_count, created_at, updated_at')
            .order('updated_at', { ascending: false })
            .limit(50)
        );

        if (convErr) {
          console.error('[ConversationSync] Failed to fetch conversations:', convErr.message);
          return;
        }

        if (!convRows || convRows.length === 0) return;

        // Map DB rows → ConversationMeta
        const conversations: ConversationMeta[] = convRows.map((r) => ({
          id: r.id as string,
          title: (r.title as string) ?? 'Untitled',
          category: (r.category as string) ?? 'general',
          repoId: r.repo_id as string | undefined,
          messageCount: (r.message_count as number) ?? 0,
          createdAt: new Date(r.created_at as string).getTime(),
          updatedAt: new Date(r.updated_at as string).getTime(),
        }));

        setConversations(conversations);

        // Restore last active conversation (prefer existing activeConversationId)
        if (!activeConversationId && conversations.length > 0) {
          setActiveConversation(conversations[0].id);
        }

        // 2. Fetch messages for the most recent 5 conversations
        const recentIds = conversations.slice(0, 5).map((c) => c.id);

        const { data: msgRows, error: msgErr } = await withAuthRefresh(() =>
          supabase
            .from('ai_messages')
            .select('id, conversation_id, role, content, metadata, actions, created_at')
            .in('conversation_id', recentIds)
            .order('created_at', { ascending: true })
        );

        if (msgErr) {
          console.error('[ConversationSync] Failed to fetch messages:', msgErr.message);
          return;
        }

        if (!msgRows || msgRows.length === 0) return;

        // Group messages by conversation ID and merge into store
        const grouped: Record<string, AgentMessage[]> = {};
        for (const row of msgRows) {
          const convId = row.conversation_id as string;
          if (!grouped[convId]) grouped[convId] = [];
          grouped[convId].push({
            id: row.id as string,
            role: row.role as AgentMessage['role'],
            content: row.content as string,
            timestamp: new Date(row.created_at as string).getTime(),
            actions: (row.actions as AgentMessage['actions']) ?? [],
          });
        }

        // Patch the store without overwriting messages that exist locally
        const store = useAppStore.getState();
        for (const [convId, msgs] of Object.entries(grouped)) {
          const existing = store.messages[convId];
          // Only sync if local is empty (avoid overwriting in-progress chats)
          if (!existing || existing.length === 0) {
            useAppStore.setState((state) => {
              state.messages[convId] = msgs;
            });
          }
        }

        console.log(`[ConversationSync] Synced ${conversations.length} conversations, ${msgRows.length} messages`);
      } catch (err) {
        console.error('[ConversationSync] Unexpected error:', err);
      }
    })();
  }, [user, setConversations, setActiveConversation, activeConversationId]);
}

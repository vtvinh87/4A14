import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClassroomRealtimeConfig, FriendsResponse, FriendSummary } from '../../shared/classroom-contracts';
import { getClassroomRealtimeConfig, getFriends, sendPresence } from '../auth/apiClient';
import { subscribeToClassroomRealtime, type ClassroomRealtimeSubscription } from './realtime';

const PRESENCE_INTERVAL_MS = 15_000;

export type ClassroomFriendsState = {
  friends: FriendSummary[];
  unreadCount: number;
  messageRevision: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markFriendRead: (friendId: string) => void;
  clear: () => void;
};

function isRealtimeConfig(value: unknown): value is ClassroomRealtimeConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as Record<string, unknown>;
  return typeof config.supabaseUrl === 'string' && config.supabaseUrl.length > 0
    && typeof config.publishableKey === 'string' && config.publishableKey.length > 0
    && typeof config.topic === 'string' && config.topic.length > 0;
}

export function useClassroomFriends(enabled: boolean, isOpen = true, accountId?: string): ClassroomFriendsState {
  const [roster, setRoster] = useState<FriendsResponse>({ friends: [], unreadCount: 0 });
  const [messageRevision, setMessageRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const requestSequence = useRef(0);

  const clear = useCallback(() => {
    generation.current += 1;
    requestSequence.current += 1;
    setRoster({ friends: [], unreadCount: 0 });
    setMessageRevision(0);
    setLoading(false);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled || !isOpen) return;
    const requestGeneration = generation.current;
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(null);
    const result = await getFriends();
    if (generation.current !== requestGeneration || requestSequence.current !== requestId) return;
    if (result.ok) setRoster({ friends: result.friends, unreadCount: result.unreadCount });
    setError(result.ok ? null : result.message);
    setLoading(false);
  }, [enabled, isOpen, accountId]);

  // Read receipts update the existing snapshot without re-fetching or reordering it.
  const markFriendRead = useCallback((friendId: string) => {
    setRoster((current) => {
      const unread = current.friends.find((friend) => friend.id === friendId)?.unreadCount ?? 0;
      if (!unread) return current;
      return {
        friends: current.friends.map((friend) => friend.id === friendId ? { ...friend, unreadCount: 0 } : friend),
        unreadCount: Math.max(0, current.unreadCount - unread),
      };
    });
  }, []);

  // Presence and chat notifications live with the session, independently of the list.
  useEffect(() => {
    clear();
    if (!enabled) return;
    let active = true;
    let presencePending = false;
    let realtimeRequested = false;
    let subscription: ClassroomRealtimeSubscription | undefined;
    const heartbeatWhenVisible = () => {
      if (!active || document.hidden || presencePending) return;
      presencePending = true;
      void sendPresence().finally(() => { presencePending = false; });
    };
    const connectRealtimeWhenVisible = () => {
      if (!active || document.hidden || realtimeRequested) return;
      realtimeRequested = true;
      void getClassroomRealtimeConfig().then((result) => {
        if (!active) return;
        if (!result.ok || !isRealtimeConfig(result)) {
          realtimeRequested = false;
          return;
        }
        try {
          subscription = subscribeToClassroomRealtime(result, () => {
            if (active) setMessageRevision((current) => current + 1);
          });
        } catch {
          realtimeRequested = false;
          // Conversation polling remains available if realtime is unavailable.
        }
      });
    };
    const resumeWhenVisible = () => {
      heartbeatWhenVisible();
      connectRealtimeWhenVisible();
    };
    const interval = window.setInterval(heartbeatWhenVisible, PRESENCE_INTERVAL_MS);
    document.addEventListener('visibilitychange', resumeWhenVisible);
    window.addEventListener('online', resumeWhenVisible);
    resumeWhenVisible();
    return () => {
      active = false;
      generation.current += 1;
      window.clearInterval(interval);
      subscription?.close();
      document.removeEventListener('visibilitychange', resumeWhenVisible);
      window.removeEventListener('online', resumeWhenVisible);
    };
  }, [clear, enabled, accountId]);

  useEffect(() => {
    if (enabled && isOpen) void refresh();
    else setLoading(false);
    return () => { requestSequence.current += 1; };
  }, [enabled, isOpen, refresh]);

  return { ...roster, messageRevision, loading, error, refresh, markFriendRead, clear };
}

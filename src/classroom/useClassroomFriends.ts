import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClassroomRealtimeConfig, FriendSummary } from '../../shared/classroom-contracts';
import { getClassroomRealtimeConfig, getFriends, sendPresence } from '../auth/apiClient';
import { subscribeToClassroomRealtime, type ClassroomRealtimeSubscription } from './realtime';

const POLL_INTERVAL_MS = 15_000;

export type ClassroomFriendsState = {
  friends: FriendSummary[];
  unreadCount: number;
  messageRevision: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clear: () => void;
};

export function useClassroomFriends(enabled: boolean): ClassroomFriendsState {
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageRevision, setMessageRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const requestSequence = useRef(0);

  const clear = useCallback(() => {
    generation.current += 1;
    requestSequence.current += 1;
    setFriends([]);
    setUnreadCount(0);
    setMessageRevision(0);
    setLoading(false);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled || document.hidden) return;
    const requestGeneration = generation.current;
    const requestId = ++requestSequence.current;
    setLoading(true);
    const presence = await sendPresence();
    const roster = await getFriends();
    if (generation.current !== requestGeneration || requestSequence.current !== requestId) return;

    if (roster.ok) {
      setFriends(roster.friends);
      setUnreadCount(roster.unreadCount);
    }
    setError(!presence.ok ? presence.message : !roster.ok ? roster.message : null);
    setLoading(false);
  }, [enabled]);

  const isRealtimeConfig = (value: unknown): value is ClassroomRealtimeConfig => {
    if (!value || typeof value !== 'object') return false;
    const config = value as Record<string, unknown>;
    return typeof config.supabaseUrl === 'string'
      && config.supabaseUrl.length > 0
      && typeof config.publishableKey === 'string'
      && config.publishableKey.length > 0
      && typeof config.topic === 'string'
      && config.topic.length > 0;
  };

  useEffect(() => {
    if (!enabled) {
      clear();
      return;
    }

    generation.current += 1;
    const refreshWhenVisible = () => {
      if (!document.hidden) void refresh();
    };
    let realtimeRequested = false;
    let subscription: ClassroomRealtimeSubscription | undefined;
    const connectRealtimeWhenVisible = () => {
      if (document.hidden || realtimeRequested) return;
      realtimeRequested = true;
      void getClassroomRealtimeConfig().then((result) => {
        if (!result.ok || !isRealtimeConfig(result)) return;
        try {
          subscription = subscribeToClassroomRealtime(result, () => {
            setMessageRevision((current) => current + 1);
            refreshWhenVisible();
          });
        } catch {
          // The existing roster/conversation polling remains the safe fallback.
        }
      });
    };
    const refreshAndConnectWhenVisible = () => {
      refreshWhenVisible();
      connectRealtimeWhenVisible();
    };
    const interval = window.setInterval(() => void refreshWhenVisible(), POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', refreshAndConnectWhenVisible);
    window.addEventListener('online', refreshAndConnectWhenVisible);
    refreshAndConnectWhenVisible();

    return () => {
      generation.current += 1;
      window.clearInterval(interval);
      subscription?.close();
      document.removeEventListener('visibilitychange', refreshAndConnectWhenVisible);
      window.removeEventListener('online', refreshAndConnectWhenVisible);
    };
  }, [clear, enabled, refresh]);

  return { friends, unreadCount, messageRevision, loading, error, refresh, clear };
}

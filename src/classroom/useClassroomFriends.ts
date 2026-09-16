import { useCallback, useEffect, useRef, useState } from 'react';
import type { FriendSummary } from '../../shared/classroom-contracts';
import { getFriends, sendPresence } from '../auth/apiClient';

const POLL_INTERVAL_MS = 15_000;

export type ClassroomFriendsState = {
  friends: FriendSummary[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clear: () => void;
};

export function useClassroomFriends(enabled: boolean): ClassroomFriendsState {
  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const requestSequence = useRef(0);

  const clear = useCallback(() => {
    generation.current += 1;
    requestSequence.current += 1;
    setFriends([]);
    setUnreadCount(0);
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

  useEffect(() => {
    if (!enabled) {
      clear();
      return;
    }

    generation.current += 1;
    const refreshWhenVisible = () => {
      if (!document.hidden) void refresh();
    };
    const interval = window.setInterval(() => void refreshWhenVisible(), POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('online', refreshWhenVisible);
    refreshWhenVisible();

    return () => {
      generation.current += 1;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('online', refreshWhenVisible);
    };
  }, [clear, enabled, refresh]);

  return { friends, unreadCount, loading, error, refresh, clear };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClassroomBootstrapResponse, ClassroomRealtimeConfig, FriendSummary } from '../../shared/classroom-contracts';
import { getClassroomBootstrap, getClassroomRealtimeConfig, getFriends, sendPresence } from '../auth/apiClient';
import { subscribeToClassroomRealtime, type ClassroomRealtimeSubscription } from './realtime';

const POLL_INTERVAL_MS = 15_000;

type RefreshOutcome = { source: 'bootstrap'; realtime: ClassroomRealtimeConfig | null } | { source: 'legacy' } | { source: 'failed' } | null;

function isRealtimeConfig(value: unknown): value is ClassroomRealtimeConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as Record<string, unknown>;
  return typeof config.supabaseUrl === 'string'
    && config.supabaseUrl.length > 0
    && typeof config.publishableKey === 'string'
    && config.publishableKey.length > 0
    && typeof config.topic === 'string'
    && config.topic.length > 0;
}

function isClassroomBootstrap(value: unknown): value is ClassroomBootstrapResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as Record<string, unknown>;
  return Array.isArray(response.friends)
    && typeof response.unreadCount === 'number'
    && typeof response.presenceUpdated === 'boolean'
    && (response.realtime === null || isRealtimeConfig(response.realtime));
}

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

  const refreshInternal = useCallback(async (): Promise<RefreshOutcome> => {
    if (!enabled || document.hidden) return null;
    const requestGeneration = generation.current;
    const requestId = ++requestSequence.current;
    setLoading(true);

    const bootstrap = await getClassroomBootstrap();
    if (bootstrap.ok && isClassroomBootstrap(bootstrap)) {
      if (generation.current !== requestGeneration || requestSequence.current !== requestId) return null;
      setFriends(bootstrap.friends);
      setUnreadCount(bootstrap.unreadCount);
      // A presence write is deliberately best-effort: a valid roster remains
      // usable while the next visible refresh retries the heartbeat.
      setError(null);
      setLoading(false);
      return { source: 'bootstrap', realtime: bootstrap.realtime };
    }
    // A 404/invalid response means the deployed API predates bootstrap. Keep
    // the old sequence as a compatibility path; transient 503/network errors
    // should not multiply requests while the service is already unavailable.
    if (!bootstrap.ok && bootstrap.code !== 'invalid') {
      if (generation.current !== requestGeneration || requestSequence.current !== requestId) return null;
      setError(bootstrap.message);
      setLoading(false);
      return { source: 'failed' };
    }

    const presence = await sendPresence();
    const roster = await getFriends();
    if (generation.current !== requestGeneration || requestSequence.current !== requestId) return null;

    if (roster.ok) {
      setFriends(roster.friends);
      setUnreadCount(roster.unreadCount);
    }
    setError(!presence.ok ? presence.message : !roster.ok ? roster.message : null);
    setLoading(false);
    return { source: 'legacy' };
  }, [enabled]);

  const refresh = useCallback(async () => {
    await refreshInternal();
  }, [refreshInternal]);

  useEffect(() => {
    if (!enabled) {
      clear();
      return;
    }

    generation.current += 1;
    const refreshWhenVisible = () => {
      if (!document.hidden) void refreshInternal();
    };
    let realtimeRequested = false;
    let disposed = false;
    let subscription: ClassroomRealtimeSubscription | undefined;
    const connectRealtime = (config: ClassroomRealtimeConfig | null) => {
      if (disposed || !config) return;
      try {
        subscription = subscribeToClassroomRealtime(config, () => {
          setMessageRevision((current) => current + 1);
          refreshWhenVisible();
        });
      } catch {
        // The existing roster/conversation polling remains the safe fallback.
      }
    };
    const connectLegacyRealtime = () => {
      realtimeRequested = true;
      void getClassroomRealtimeConfig().then((result) => {
        if (result.ok && isRealtimeConfig(result)) connectRealtime(result);
      });
    };
    const refreshAndConnectWhenVisible = () => {
      if (document.hidden) return;
      void refreshInternal().then((outcome) => {
        if (!outcome || realtimeRequested || disposed) return;
        realtimeRequested = true;
        if (outcome.source === 'bootstrap') connectRealtime(outcome.realtime);
        else if (outcome.source === 'legacy') connectLegacyRealtime();
      });
    };
    const interval = window.setInterval(() => void refreshWhenVisible(), POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', refreshAndConnectWhenVisible);
    window.addEventListener('online', refreshAndConnectWhenVisible);
    refreshAndConnectWhenVisible();

    return () => {
      disposed = true;
      generation.current += 1;
      window.clearInterval(interval);
      subscription?.close();
      document.removeEventListener('visibilitychange', refreshAndConnectWhenVisible);
      window.removeEventListener('online', refreshAndConnectWhenVisible);
    };
  }, [clear, enabled, refreshInternal]);

  return { friends, unreadCount, messageRevision, loading, error, refresh, clear };
}

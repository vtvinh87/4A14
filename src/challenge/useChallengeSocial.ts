import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChallengeReactionType, ChallengeReportRecord, ChallengeReportReason, ReportChallengeItemInput } from '../../shared/challenge-contracts';
import { addChallengeReaction as postChallengeReaction, reportChallengeItem as postChallengeReport } from '../auth/apiClient';
import { CHALLENGE_OFFLINE_MESSAGE } from './useChallenge';

export type ChallengeReportDraft = Omit<ReportChallengeItemInput, 'idempotencyKey'>;

type ChallengeReportIntent = ChallengeReportDraft & { idempotencyKey: string };

export type ChallengeSocialState = {
  reactions: Record<string, ChallengeReactionType[]>;
  reportedItemIds: string[];
  pendingReactionKey: string | null;
  pendingReportItemId: string | null;
  lastError: string;
  lastReport: ChallengeReportRecord | null;
  isOnline: boolean;
  addReaction: (itemId: string, reactionType: ChallengeReactionType) => Promise<boolean>;
  report: (itemId: string, input: ChallengeReportDraft) => Promise<boolean>;
  retryReport: (itemId: string) => Promise<boolean>;
  clear: () => void;
};

function createIdempotencyKey(prefix: string): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

function reactionRequestKey(itemId: string, reactionType: ChallengeReactionType): string {
  return `${itemId}:${reactionType}`;
}

function readOnlineStatus(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

export function useChallengeSocial(enabled = true): ChallengeSocialState {
  const [reactions, setReactions] = useState<Record<string, ChallengeReactionType[]>>({});
  const [reportedItemIds, setReportedItemIds] = useState<string[]>([]);
  const [pendingReactionKey, setPendingReactionKey] = useState<string | null>(null);
  const [pendingReportItemId, setPendingReportItemId] = useState<string | null>(null);
  const [lastError, setLastError] = useState('');
  const [lastReport, setLastReport] = useState<ChallengeReportRecord | null>(null);
  const [isOnline, setIsOnline] = useState(readOnlineStatus);
  const generation = useRef(0);
  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;
  const reactionKeys = useRef(new Map<string, string>());
  const reactionRequests = useRef(new Map<string, Promise<boolean>>());
  const reportIntents = useRef(new Map<string, ChallengeReportIntent>());
  const reportRequests = useRef(new Map<string, Promise<boolean>>());

  const clear = useCallback(() => {
    generation.current += 1;
    reactionKeys.current.clear();
    reactionRequests.current.clear();
    reportIntents.current.clear();
    reportRequests.current.clear();
    setReactions({});
    setReportedItemIds([]);
    setPendingReactionKey(null);
    setPendingReportItemId(null);
    setLastError('');
    setLastReport(null);
  }, []);

  useEffect(() => {
    if (!enabled) clear();
  }, [clear, enabled]);

  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      setIsOnline(true);
    };
    const handleOffline = () => {
      isOnlineRef.current = false;
      setIsOnline(false);
      setLastError(CHALLENGE_OFFLINE_MESSAGE);
      setPendingReactionKey(null);
      setPendingReportItemId(null);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addReaction = useCallback(async (itemId: string, reactionType: ChallengeReactionType): Promise<boolean> => {
    if (!enabled) return false;
    if (reactions[itemId]?.includes(reactionType)) return true;

    const key = reactionRequestKey(itemId, reactionType);
    const ongoing = reactionRequests.current.get(key);
    if (ongoing) return ongoing;

    const idempotencyKey = reactionKeys.current.get(key) ?? createIdempotencyKey('challenge-reaction');
    reactionKeys.current.set(key, idempotencyKey);
    if (!isOnlineRef.current) {
      setLastError(CHALLENGE_OFFLINE_MESSAGE);
      return false;
    }
    const requestGeneration = generation.current;
    setPendingReactionKey(key);

    let request: Promise<boolean>;
    request = postChallengeReaction(itemId, reactionType, idempotencyKey)
      .then((result) => {
        if (requestGeneration !== generation.current) return false;
        if (!result.ok) {
          setLastError(result.message);
          return false;
        }
        setReactions((current) => {
          if (current[itemId]?.includes(reactionType)) return current;
          return { ...current, [itemId]: [...(current[itemId] ?? []), reactionType] };
        });
        reactionKeys.current.delete(key);
        setPendingReactionKey(null);
        setLastError('');
        return true;
      })
      .catch(() => {
        if (requestGeneration === generation.current) setLastError('Chưa gửi được phản hồi. Hãy thử lại nhé.');
        return false;
      })
      .finally(() => {
        if (reactionRequests.current.get(key) === request) reactionRequests.current.delete(key);
        if (requestGeneration === generation.current) setPendingReactionKey(null);
      });
    reactionRequests.current.set(key, request);
    return request;
  }, [enabled, reactions]);

  const submitReport = useCallback(async (itemId: string, intent: ChallengeReportIntent): Promise<boolean> => {
    if (!enabled) return false;
    if (!isOnlineRef.current) {
      setLastError(CHALLENGE_OFFLINE_MESSAGE);
      return false;
    }
    if (reportedItemIds.includes(itemId)) return true;

    const ongoing = reportRequests.current.get(itemId);
    if (ongoing) return ongoing;

    reportIntents.current.set(itemId, intent);
    const requestGeneration = generation.current;
    setPendingReportItemId(itemId);

    let request: Promise<boolean>;
    request = postChallengeReport(itemId, { reason: intent.reason, ...(intent.details === undefined ? {} : { details: intent.details }) }, intent.idempotencyKey)
      .then((result) => {
        if (requestGeneration !== generation.current) return false;
        if (!result.ok) {
          setLastError(result.message);
          return false;
        }
        setReportedItemIds((current) => current.includes(itemId) ? current : [...current, itemId]);
        setLastReport(result);
        reportIntents.current.delete(itemId);
        setPendingReportItemId(null);
        setLastError('');
        return true;
      })
      .catch(() => {
        if (requestGeneration === generation.current) setLastError('Chưa gửi được báo cáo. Hãy thử lại nhé.');
        return false;
      })
      .finally(() => {
        if (reportRequests.current.get(itemId) === request) reportRequests.current.delete(itemId);
        if (requestGeneration === generation.current) setPendingReportItemId(null);
      });
    reportRequests.current.set(itemId, request);
    return request;
  }, [enabled, reportedItemIds]);

  const report = useCallback(async (itemId: string, input: ChallengeReportDraft): Promise<boolean> => {
    if (!enabled) return false;
    const existing = reportIntents.current.get(itemId);
    const intent = existing ?? { ...input, idempotencyKey: createIdempotencyKey('challenge-report') };
    reportIntents.current.set(itemId, intent);
    return submitReport(itemId, intent);
  }, [enabled, submitReport]);

  const retryReport = useCallback(async (itemId: string): Promise<boolean> => {
    const intent = reportIntents.current.get(itemId);
    if (!intent) return false;
    return submitReport(itemId, intent);
  }, [submitReport]);

  return { reactions, reportedItemIds, pendingReactionKey, pendingReportItemId, lastError, lastReport, isOnline, addReaction, report, retryReport, clear };
}

export type { ChallengeReportReason };

import { useCallback, useEffect, useRef, useState } from 'react';
import { CONTENT_VERSION } from '../../shared/learning-contracts';
import {
  PROGRESS_BOARD_RULE_VERSION,
  type ProgressBoardData,
} from '../../shared/progress-board-contracts';
import { getProgressBoard } from '../auth/apiClient';
import { isProgressBoardData, loadProgressBoardCache, saveProgressBoardCache, type ProgressBoardCacheIdentity } from './progressBoardCache';

export type ProgressBoardStatus = 'idle' | 'loading' | 'success' | 'stale' | 'empty' | 'unavailable' | 'logged-out';

export type ProgressBoardOptions = {
  enabled: boolean;
  accountId: string | null;
  generation: string | number | null;
  invalidationToken?: number;
};

export type ProgressBoardHookResult = {
  status: ProgressBoardStatus;
  data: ProgressBoardData | null;
  error: string;
  refresh: () => Promise<void>;
  invalidate: () => void;
};

const UNAVAILABLE_MESSAGE = 'Bảng tiến bộ tạm thời chưa sẵn sàng. Bạn thử lại nhé.';
const ROLLOUT_DISABLED_MESSAGE = 'Bảng tiến bộ đang được mở dần cho lớp.';

function hasActivity(data: ProgressBoardData): boolean {
  return data.summary.exploredLessonCount > 0
    || data.summary.completedLessonCount > 0
    || data.summary.independentObjectiveCount > 0;
}

function statusForData(data: ProgressBoardData): ProgressBoardStatus {
  return hasActivity(data) ? 'success' : 'empty';
}

function createIdentity(accountId: string, generation: string | number): ProgressBoardCacheIdentity {
  return { accountId, generation, contentVersion: CONTENT_VERSION, ruleVersion: PROGRESS_BOARD_RULE_VERSION };
}

export function useProgressBoard(options: ProgressBoardOptions): ProgressBoardHookResult {
  const { enabled, accountId, generation, invalidationToken = 0 } = options;
  const [status, setStatus] = useState<ProgressBoardStatus>(() => accountId ? 'idle' : 'logged-out');
  const [data, setData] = useState<ProgressBoardData | null>(null);
  const [error, setError] = useState('');
  const requestSequence = useRef(0);
  const identityRef = useRef('');
  const identityKey = accountId && generation !== null ? `${accountId}:${String(generation)}:${CONTENT_VERSION}:${PROGRESS_BOARD_RULE_VERSION}` : '';
  identityRef.current = identityKey;

  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled || !accountId || generation === null) return;
    const identity = createIdentity(accountId, generation);
    const requestIdentity = `${accountId}:${String(generation)}:${CONTENT_VERSION}:${PROGRESS_BOARD_RULE_VERSION}`;
    const requestId = ++requestSequence.current;
    const isCurrent = () => requestSequence.current === requestId && identityRef.current === requestIdentity;
    setStatus('loading');
    setData(null);
    setError('');

    const fallback = (message = UNAVAILABLE_MESSAGE) => {
      if (!isCurrent()) return;
      const cached = loadProgressBoardCache(identity);
      if (cached) {
        setStatus('stale');
        setData(cached);
        setError(message);
      } else {
        setStatus('unavailable');
        setData(null);
        setError(UNAVAILABLE_MESSAGE);
      }
    };

    const result = await getProgressBoard();
    if (!isCurrent()) return;
    if (!result.ok) {
      if ('reason' in result && result.reason === 'rollout_disabled') {
        setStatus('unavailable');
        setData(null);
        setError(ROLLOUT_DISABLED_MESSAGE);
      } else if (result.code === 'expired' || result.code === 'forbidden') {
        setStatus('unavailable');
        setData(null);
        setError(UNAVAILABLE_MESSAGE);
      } else {
        fallback();
      }
      return;
    }
    if (!isProgressBoardData(result.data, identity)) {
      fallback();
      return;
    }
    saveProgressBoardCache(identity, result.data);
    setData(result.data);
    setError('');
    setStatus(statusForData(result.data));
  }, [accountId, enabled, generation]);

  const invalidate = useCallback(() => {
    requestSequence.current += 1;
    setData(null);
    setError('');
    setStatus(accountId ? 'idle' : 'logged-out');
  }, [accountId]);

  useEffect(() => {
    requestSequence.current += 1;
    if (!accountId) {
      setData(null);
      setError('');
      setStatus('logged-out');
      return () => { requestSequence.current += 1; };
    }
    if (!enabled || generation === null) {
      setData(null);
      setError('');
      setStatus('idle');
      return () => { requestSequence.current += 1; };
    }
    void refresh();
    return () => { requestSequence.current += 1; };
  }, [accountId, enabled, generation, invalidationToken, refresh]);

  return { status, data, error, refresh, invalidate };
}

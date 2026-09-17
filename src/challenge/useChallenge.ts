import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChallengeAnswerResult, ChallengeTodayResponse, SubmitChallengeAttemptInput } from '../../shared/challenge-contracts';
import { getTodayChallenge, submitChallengeAttempt } from '../auth/apiClient';

export type ChallengeState = {
  today: ChallengeTodayResponse | null;
  loading: boolean;
  lastError: string;
  isSubmitting: boolean;
  lastResult: ChallengeAnswerResult | null;
  isOnline: boolean;
  refresh: () => Promise<void>;
  submit: (itemId: string, input: SubmitChallengeAttemptInput) => Promise<ChallengeAnswerResult | null>;
  clear: () => void;
};

const POLL_INTERVAL_MS = 60_000;
export const CHALLENGE_OFFLINE_MESSAGE = 'Con đang ở chế độ ngoại tuyến. Hãy kết nối mạng rồi thử lại nhé.';

function readOnlineStatus(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

export function useChallenge(enabled = true): ChallengeState {
  const [today, setToday] = useState<ChallengeTodayResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<ChallengeAnswerResult | null>(null);
  const [isOnline, setIsOnline] = useState(readOnlineStatus);
  const generation = useRef(0);
  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;

  const clear = useCallback(() => {
    generation.current += 1;
    setToday(null);
    setLoading(false);
    setLastError('');
    setIsSubmitting(false);
    setLastResult(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    if (!isOnlineRef.current) {
      setLastError(CHALLENGE_OFFLINE_MESSAGE);
      setLoading(false);
      return;
    }
    const currentGeneration = ++generation.current;
    setLoading(true);
    setLastError('');
    const result = await getTodayChallenge();
    if (currentGeneration !== generation.current) return;
    if (!result.ok) {
      setLastError(result.message);
      setLoading(false);
      return;
    }
    const { ok: _ok, ...payload } = result;
    setToday(payload);
    setLastResult(null);
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      setIsOnline(true);
    };
    const handleOffline = () => {
      isOnlineRef.current = false;
      setIsOnline(false);
      setLastError(CHALLENGE_OFFLINE_MESSAGE);
      setLoading(false);
      setIsSubmitting(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      clear();
      return undefined;
    }
    void refresh();
    const refreshWhenVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, POLL_INTERVAL_MS);
    return () => {
      generation.current += 1;
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.clearInterval(timer);
    };
  }, [clear, enabled, refresh]);

  const submit = useCallback(async (itemId: string, input: SubmitChallengeAttemptInput): Promise<ChallengeAnswerResult | null> => {
    if (!enabled) return null;
    if (!isOnlineRef.current) {
      setLastError(CHALLENGE_OFFLINE_MESSAGE);
      setIsSubmitting(false);
      return null;
    }
    const currentGeneration = generation.current;
    setIsSubmitting(true);
    setLastError('');
    const result = await submitChallengeAttempt(itemId, input);
    if (currentGeneration !== generation.current) return null;
    setIsSubmitting(false);
    if (!result.ok) {
      setLastError(result.message);
      return null;
    }
    const { ok: _ok, ...answer } = result;
    setLastResult(answer);
    setToday((current) => {
      if (!current) return current;
      const newlyAnswered = !answer.duplicate;
      return {
        ...current,
        questions: current.questions.map((question) => question.roundItemId === itemId
          ? { ...question, answeredByMe: true, practiceOnly: Boolean(answer.practiceOnly) || question.practiceOnly }
          : question),
        classProgress: {
          ...current.classProgress,
          current: current.classProgress.current + (newlyAnswered && answer.classContributionAdded ? 1 : 0),
          completed: current.classProgress.completed || (newlyAnswered && answer.classContributionAdded && current.classProgress.current + 1 >= current.classProgress.target),
        },
        myContribution: {
          ...current.myContribution,
          correctAnswers: current.myContribution.correctAnswers + (newlyAnswered && answer.correct && !answer.voided ? 1 : 0),
          questionsRevisited: current.myContribution.questionsRevisited + (newlyAnswered && answer.practiceOnly ? 1 : 0),
        },
      };
    });
    return answer;
  }, [enabled]);

  return { today, loading, lastError, isSubmitting, lastResult, isOnline, refresh, submit, clear };
}

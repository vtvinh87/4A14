import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChallengePreferences, ChallengePreferencesPatch, ChallengeQuestionParent, ReviewChallengeQuestionInput } from '../../shared/challenge-contracts';
import { getChallengeSettings, getPendingChallengeQuestions, reviewChallengeQuestion, updateChallengeSettings, withdrawChallengeQuestion } from '../auth/apiClient';

export type ParentChallengeReviewState = {
  questions: ChallengeQuestionParent[];
  settings: ChallengePreferences | null;
  loading: boolean;
  error: string;
  busyQuestionId: string | null;
  refresh: () => Promise<void>;
  approve: (questionId: string, revision: number) => Promise<boolean>;
  requestRevision: (questionId: string, revision: number, reason: string) => Promise<boolean>;
  withdraw: (questionId: string) => Promise<boolean>;
  updateSettings: (patch: ChallengePreferencesPatch) => Promise<boolean>;
  clear: () => void;
};

function failed(message: string): { ok: false; message: string } {
  return { ok: false, message };
}

export function useParentChallengeReview(enabled: boolean): ParentChallengeReviewState {
  const [questions, setQuestions] = useState<ChallengeQuestionParent[]>([]);
  const [settings, setSettings] = useState<ChallengePreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyQuestionId, setBusyQuestionId] = useState<string | null>(null);
  const generation = useRef(0);

  const clear = useCallback(() => {
    generation.current += 1;
    setQuestions([]);
    setSettings(null);
    setLoading(false);
    setError('');
    setBusyQuestionId(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const currentGeneration = ++generation.current;
    setLoading(true);
    setError('');
    const [pending, preferences] = await Promise.all([getPendingChallengeQuestions(), getChallengeSettings()]);
    if (currentGeneration !== generation.current) return;
    if (!pending.ok || !preferences.ok) {
      setError(!pending.ok ? pending.message : preferences.ok ? '' : preferences.message);
      setLoading(false);
      return;
    }
    setQuestions(pending.questions);
    setSettings(preferences.settings);
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      clear();
      return;
    }
    void refresh();
    return () => { generation.current += 1; };
  }, [clear, enabled, refresh]);

  const runQuestionAction = useCallback(async (questionId: string, action: () => Promise<{ ok: true } | { ok: false; message: string; }>): Promise<boolean> => {
    const currentGeneration = generation.current;
    setBusyQuestionId(questionId);
    setError('');
    const result = await action();
    if (currentGeneration !== generation.current) return false;
    setBusyQuestionId(null);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    setQuestions((current) => current.filter((question) => question.id !== questionId));
    return true;
  }, []);

  const approve = useCallback((questionId: string, revision: number) => runQuestionAction(questionId, async () => {
    const result = await reviewChallengeQuestion(questionId, { revision, decision: 'approve' });
    return result.ok ? { ok: true } : failed(result.message);
  }), [runQuestionAction]);

  const requestRevision = useCallback((questionId: string, revision: number, reason: string) => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Hãy viết một lý do ngắn gọn để con biết cách sửa.');
      return Promise.resolve(false);
    }
    return runQuestionAction(questionId, async () => {
      const input: ReviewChallengeQuestionInput & { revision: number } = { revision, decision: 'request_revision', reason: trimmed };
      const result = await reviewChallengeQuestion(questionId, input);
      return result.ok ? { ok: true } : failed(result.message);
    });
  }, [runQuestionAction]);

  const withdraw = useCallback((questionId: string) => runQuestionAction(questionId, async () => {
    const result = await withdrawChallengeQuestion(questionId);
    return result.ok ? { ok: true } : failed(result.message);
  }), [runQuestionAction]);

  const updateSettings = useCallback(async (patch: ChallengePreferencesPatch): Promise<boolean> => {
    setError('');
    const result = await updateChallengeSettings(patch);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    setSettings(result.settings);
    return true;
  }, []);

  return { questions, settings, loading, error, busyQuestionId, refresh, approve, requestRevision, withdraw, updateSettings, clear };
}

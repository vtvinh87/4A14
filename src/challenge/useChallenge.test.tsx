import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChallengeAnswerResult, ChallengeQuestionView, ChallengeTodayResponse } from '../../shared/challenge-contracts';
import { getTodayChallenge, submitChallengeAttempt } from '../auth/apiClient';
import { useChallenge, type ChallengeState } from './useChallenge';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../auth/apiClient', () => ({
  getTodayChallenge: vi.fn(),
  submitChallengeAttempt: vi.fn(),
}));

const mockedToday = vi.mocked(getTodayChallenge);
const mockedSubmit = vi.mocked(submitChallengeAttempt);

const question: ChallengeQuestionView = {
  id: 'question-1',
  roundItemId: 'item-1',
  lessonId: 'lesson-01',
  lessonTitle: 'Địa phương em',
  author: { id: 'student-a', displayName: 'Bạn An', avatarId: 'fox-leaf' },
  prompt: 'Theo con, bản đồ giúp chúng ta học điều gì?',
  options: [
    { id: 'correct', text: 'Bản đồ' },
    { id: 'wrong-1', text: 'Một bài hát.' },
    { id: 'wrong-2', text: 'Một loại bánh.' },
    { id: 'wrong-3', text: 'Một câu chuyện.' },
  ],
  sourceLabel: 'Địa phương em · Nguồn map',
  closesAt: '2026-09-17T16:59:59.999Z',
  answeredByMe: false,
  practiceOnly: false,
};

const today: ChallengeTodayResponse = {
  roundDate: '2026-09-17',
  roundStatus: 'open',
  questions: [question],
  classProgress: { current: 2, target: 10, completed: false },
  myContribution: { correctAnswers: 0, questionsCreated: 0, questionsRevisited: 0 },
};

const answer: ChallengeAnswerResult = {
  questionId: 'question-1',
  selectedOptionId: 'correct',
  correct: true,
  correctOptionId: 'correct',
  explanation: 'Bản đồ giúp thể hiện thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.',
  sourceLabel: question.sourceLabel,
  classContributionAdded: true,
  duplicate: false,
};

async function settle(): Promise<void> {
  await act(async () => {
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
  });
}

describe('useChallenge', () => {
  let root: Root;
  let mount: HTMLDivElement;
  let state: ChallengeState | null;

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
    state = null;
    mockedToday.mockResolvedValue({ ok: true, ...today });
    mockedSubmit.mockResolvedValue({ ok: true, ...answer });
  });

  afterEach(() => {
    vi.useRealTimers();
    act(() => root.unmount());
    mount.remove();
  });

  function Probe({ enabled = true }: { enabled?: boolean }) {
    const current = useChallenge(enabled);
    useEffect(() => { state = current; });
    return <span data-count>{current.today?.questions.length ?? 0}</span>;
  }

  it('loads the daily round and commits answer state only after the API acknowledgement', async () => {
    act(() => root.render(createElement(Probe)));
    await settle();
    expect(state?.today).toEqual(today);

    await act(async () => { await state?.submit('item-1', { selectedOptionId: 'correct', idempotencyKey: 'attempt-1' }); });
    expect(mockedSubmit).toHaveBeenCalledWith('item-1', { selectedOptionId: 'correct', idempotencyKey: 'attempt-1' });
    expect(state?.lastResult).toEqual(answer);
    expect(state?.today?.questions[0]).toEqual(expect.objectContaining({ answeredByMe: true }));
    expect(state?.today?.classProgress.current).toBe(3);
  });

  it('keeps the previous round and selected intent available when submit fails', async () => {
    act(() => root.render(createElement(Probe)));
    await settle();
    mockedSubmit.mockResolvedValueOnce({ ok: false, code: 'unavailable', message: 'Mạng đang chập chờn.' });
    const input = { selectedOptionId: 'correct', idempotencyKey: 'retry-me' };
    await act(async () => { await state?.submit('item-1', input); });
    expect(state?.today).toEqual(today);
    expect(state?.lastResult).toBeNull();
    expect(state?.lastError).toBe('Mạng đang chập chờn.');
    expect(mockedSubmit).toHaveBeenCalledWith('item-1', input);
  });

  it('keeps the last-known round visible offline, blocks attempts, then allows the same intent after reconnect', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    act(() => root.render(createElement(Probe)));
    await settle();
    expect(state?.today).toEqual(today);

    online.mockReturnValue(false);
    act(() => window.dispatchEvent(new Event('offline')));
    expect(state?.isOnline).toBe(false);
    const requestCountBeforeOfflineSubmit = mockedSubmit.mock.calls.length;
    await act(async () => { await state?.submit('item-1', { selectedOptionId: 'correct', idempotencyKey: 'offline-retry-1' }); });
    expect(mockedSubmit).toHaveBeenCalledTimes(requestCountBeforeOfflineSubmit);
    expect(state?.today).toEqual(today);
    expect(state?.lastError).toContain('ngoại tuyến');

    online.mockReturnValue(true);
    mockedSubmit.mockResolvedValueOnce({ ok: true, ...answer });
    act(() => window.dispatchEvent(new Event('online')));
    expect(state?.isOnline).toBe(true);
    await act(async () => { await state?.submit('item-1', { selectedOptionId: 'correct', idempotencyKey: 'offline-retry-1' }); });
    expect(mockedSubmit).toHaveBeenLastCalledWith('item-1', { selectedOptionId: 'correct', idempotencyKey: 'offline-retry-1' });
    online.mockRestore();
  });

  it('polls only while visible and stops all work on unmount or disable', async () => {
    vi.useFakeTimers();
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    act(() => root.render(createElement(Probe)));
    await settle();
    expect(mockedToday).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(60_000); await settle(); });
    expect(mockedToday).toHaveBeenCalledTimes(2);
    hidden.mockReturnValue(true);
    await act(async () => { vi.advanceTimersByTime(120_000); await settle(); });
    expect(mockedToday).toHaveBeenCalledTimes(2);
    hidden.mockReturnValue(false);
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); await settle(); });
    expect(mockedToday).toHaveBeenCalledTimes(3);
    act(() => root.render(createElement(Probe, { enabled: false })));
    expect(state?.today).toBeNull();
    act(() => root.unmount());
    await act(async () => { vi.advanceTimersByTime(120_000); await settle(); });
    expect(mockedToday).toHaveBeenCalledTimes(3);
    hidden.mockRestore();
  });
});

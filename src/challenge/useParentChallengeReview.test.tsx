import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChallengePreferences, ChallengeQuestionParent } from '../../shared/challenge-contracts';
import {
  getChallengeSettings,
  getPendingChallengeQuestions,
  reviewChallengeQuestion,
  updateChallengeSettings,
  withdrawChallengeQuestion,
} from '../auth/apiClient';
import { useParentChallengeReview, type ParentChallengeReviewState } from './useParentChallengeReview';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../auth/apiClient', () => ({
  getChallengeSettings: vi.fn(),
  getPendingChallengeQuestions: vi.fn(),
  reviewChallengeQuestion: vi.fn(),
  updateChallengeSettings: vi.fn(),
  withdrawChallengeQuestion: vi.fn(),
}));

const mockedPending = vi.mocked(getPendingChallengeQuestions);
const mockedSettings = vi.mocked(getChallengeSettings);
const mockedReview = vi.mocked(reviewChallengeQuestion);
const mockedUpdateSettings = vi.mocked(updateChallengeSettings);
const mockedWithdraw = vi.mocked(withdrawChallengeQuestion);

function question(): ChallengeQuestionParent {
  return {
    id: 'q-parent',
    authorId: 'student-a',
    sourceFactId: 'map',
    sourceVersion: 'challenge-facts-v1',
    lessonId: 'lesson-01',
    lessonTitle: 'Làm quen với phương tiện học tập môn Lịch sử và Địa lí',
    prompt: 'Theo con, bản đồ giúp chúng ta học điều gì?',
    options: [
      { id: 'correct', text: 'Bản đồ' },
      { id: 'wrong-1', text: 'Một bài hát về ngày hội.' },
      { id: 'wrong-2', text: 'Một loại bánh truyền thống.' },
      { id: 'wrong-3', text: 'Một câu chuyện kể về nhân vật.' },
    ],
    correctOptionId: 'correct',
    explanation: 'Bản đồ giúp thể hiện thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.',
    status: 'pending_parent_review',
    revision: 1,
    createdLocalDate: '2026-09-17',
    createdAt: '2026-09-17T08:00:00.000Z',
    updatedAt: '2026-09-17T08:00:00.000Z',
    submittedAt: '2026-09-17T08:00:00.000Z',
    reviewedAt: null,
    featuredAt: null,
    closedAt: null,
    reviewReason: null,
    withdrawnAt: null,
    voidedAt: null,
    quotaUsedOnCreatedDate: 1,
    preview: null,
    reviewHistory: [],
  };
}

const settings: ChallengePreferences = { studentId: 'student-a', canCreate: true, canParticipate: true, updatedAt: '2026-09-17T08:00:00.000Z' };

function Harness({ enabled }: { enabled: boolean }) {
  const state = useParentChallengeReview(enabled);
  return <div>
    <span data-state-count="true">{state.questions.length}</span>
    <span data-state-error="true">{state.error}</span>
    <button type="button" data-refresh="true" onClick={() => void state.refresh()}>refresh</button>
    <button type="button" data-approve="true" onClick={() => void state.approve('q-parent', 1)}>approve</button>
    <button type="button" data-revise="true" onClick={() => void state.requestRevision('q-parent', 1, 'Con hãy viết rõ hơn nhé.')}>revise</button>
    <button type="button" data-clear="true" onClick={state.clear}>clear</button>
  </div>;
}

describe('useParentChallengeReview', () => {
  let root: Root;
  let mount: HTMLDivElement;
  let state: ParentChallengeReviewState | null;

  beforeEach(() => {
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
    state = null;
    mockedPending.mockResolvedValue({ ok: true, questions: [question()] });
    mockedSettings.mockResolvedValue({ ok: true, settings });
    mockedReview.mockResolvedValue({ ok: true, question: { ...question(), status: 'approved' } });
    mockedUpdateSettings.mockResolvedValue({ ok: true, settings: { ...settings, canCreate: false } });
    mockedWithdraw.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
    act(() => root.unmount());
    mount.remove();
  });

  it('loads both queue and settings, keeps a failed review for retry, and removes only after ACK', async () => {
    function Capture({ enabled }: { enabled: boolean }) {
      const captured = useParentChallengeReview(enabled);
      useEffect(() => { state = captured; });
      return <span data-state-count>{captured.questions.length}</span>;
    }
    act(() => root.render(createElement(Capture, { enabled: true })));
    await act(async () => { await Promise.resolve(); });
    expect(state?.questions).toHaveLength(1);
    expect(state?.settings).toEqual(settings);

    mockedReview.mockResolvedValueOnce({ ok: false, code: 'unavailable', message: 'Mạng đang chập chờn.' });
    await act(async () => { await state?.approve('q-parent', 1); });
    expect(state?.questions).toHaveLength(1);
    expect(state?.error).toContain('Mạng đang chập chờn');

    mockedReview.mockResolvedValueOnce({ ok: true, question: { ...question(), status: 'approved' } });
    await act(async () => { await state?.approve('q-parent', 1); });
    expect(state?.questions).toHaveLength(0);
  });

  it('clears child data when the grant is locked and validates settings/revision actions through typed APIs', async () => {
    function Capture({ enabled }: { enabled: boolean }) {
      const captured = useParentChallengeReview(enabled);
      useEffect(() => { state = captured; });
      return <span data-state-count>{captured.questions.length}</span>;
    }
    act(() => root.render(createElement(Capture, { enabled: true })));
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await state?.requestRevision('q-parent', 1, 'Con hãy viết rõ hơn nhé.'); });
    expect(mockedReview).toHaveBeenCalledWith('q-parent', { revision: 1, decision: 'request_revision', reason: 'Con hãy viết rõ hơn nhé.' });

    await act(async () => { await state?.updateSettings({ canCreate: false }); });
    expect(mockedUpdateSettings).toHaveBeenCalledWith({ canCreate: false });
    expect(state?.settings?.canCreate).toBe(false);

    await act(async () => { root.render(createElement(Capture, { enabled: false })); await Promise.resolve(); });
    expect(state?.questions).toEqual([]);
    expect(state?.settings).toBeNull();
    expect(mockedWithdraw).not.toHaveBeenCalled();
  });
});

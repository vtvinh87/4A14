import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChallengeQuestionMine, ChallengeQuestionView, ChallengeTodayResponse, ChallengeWeeklyResponse } from '../../shared/challenge-contracts';
import { VERIFIED_CHALLENGE_FACTS } from '../../shared/challenge-source';
import { getMyChallengeQuestions, getWeeklyChallenge } from '../auth/apiClient';
import { useChallenge, type ChallengeState } from '../challenge/useChallenge';
import { useChallengeSocial, type ChallengeSocialState } from '../challenge/useChallengeSocial';
import { ChallengeDialog } from './ChallengeDialog';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../challenge/useChallenge', () => ({ useChallenge: vi.fn() }));
vi.mock('../challenge/useChallengeSocial', () => ({ useChallengeSocial: vi.fn() }));
vi.mock('../auth/apiClient', async () => {
  const actual = await vi.importActual<typeof import('../auth/apiClient')>('../auth/apiClient');
  return { ...actual, getMyChallengeQuestions: vi.fn(), getWeeklyChallenge: vi.fn() };
});

const mockedUseChallenge = vi.mocked(useChallenge);
const mockedUseChallengeSocial = vi.mocked(useChallengeSocial);
const mockedMine = vi.mocked(getMyChallengeQuestions);
const mockedWeekly = vi.mocked(getWeeklyChallenge);

const question: ChallengeQuestionView = {
  id: 'question-1', roundItemId: 'item-1', lessonId: 'lesson-01', lessonTitle: 'Địa phương em',
  author: { id: 'student-a', displayName: 'Bạn An', avatarId: 'fox-leaf' },
  prompt: 'Theo con, bản đồ giúp chúng ta học điều gì?',
  options: [{ id: 'correct', text: 'Bản đồ' }, { id: 'wrong-1', text: 'Một bài hát.' }, { id: 'wrong-2', text: 'Một loại bánh.' }, { id: 'wrong-3', text: 'Một câu chuyện.' }],
  sourceLabel: 'Địa phương em · Nguồn map', closesAt: '2026-09-17T16:59:59.999Z', answeredByMe: false, practiceOnly: false,
};

const today: ChallengeTodayResponse = {
  roundDate: '2026-09-17', roundStatus: 'open', questions: [question], classProgress: { current: 4, target: 10, completed: false },
  myContribution: { correctAnswers: 1, questionsCreated: 1, questionsRevisited: 0 },
};

const weekly: ChallengeWeeklyResponse = {
  weekStart: '2026-09-14', weekEnd: '2026-09-20',
  days: Array.from({ length: 7 }, (_, index) => ({ date: `2026-09-${String(14 + index).padStart(2, '0')}`, current: index < 2 ? 2 : 0, target: index < 2 ? 4 : 0, completed: index === 0, rewardGranted: index === 0, questionCount: index < 2 ? 2 : 0 })),
  classProgress: { current: 4, target: 12, completedDays: 1 },
  topics: [{ lessonId: 'lesson-01', title: 'Địa phương em', questionCount: 2 }],
  recognitions: [{ type: 'question_creator', recipientIds: ['student-a'] }],
  mySummary: { questionsCreated: 1, correctAnswers: 1, revisits: 0 },
};

const mine: ChallengeQuestionMine = {
  id: 'mine-1', authorId: 'student-a', sourceFactId: 'map', sourceVersion: 'challenge-facts-v1', lessonId: 'lesson-01', lessonTitle: 'Địa phương em',
  prompt: 'Theo con, bản đồ giúp chúng ta học điều gì?', options: [{ id: 'correct', text: 'Bản đồ' }, { id: 'wrong-1', text: 'Một bài hát.' }, { id: 'wrong-2', text: 'Một loại bánh.' }, { id: 'wrong-3', text: 'Một câu chuyện.' }], correctOptionId: 'correct', explanation: 'Bản đồ giúp thể hiện thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.', status: 'pending_parent_review', revision: 1,
  createdLocalDate: '2026-09-17', createdAt: '2026-09-17T08:00:00.000Z', updatedAt: '2026-09-17T08:00:00.000Z', submittedAt: '2026-09-17T08:00:00.000Z', reviewedAt: null, featuredAt: null, closedAt: null, reviewReason: null, withdrawnAt: null, voidedAt: null, quotaUsedOnCreatedDate: 1,
};

const defaultChallengeState: ChallengeState = {
  today, loading: false, lastError: '', isSubmitting: false, lastResult: null, isOnline: true,
  refresh: vi.fn(async () => undefined), submit: vi.fn(async () => null), clear: vi.fn(),
};

const defaultSocialState: ChallengeSocialState = {
  reactions: {}, reportedItemIds: [], pendingReactionKey: null, pendingReportItemId: null, lastError: '', lastReport: null, isOnline: true,
  addReaction: vi.fn(async () => true), report: vi.fn(async () => true), retryReport: vi.fn(async () => true), clear: vi.fn(),
};

describe('ChallengeDialog', () => {
  let root: Root;
  let mount: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
    mockedUseChallenge.mockReturnValue(defaultChallengeState);
    mockedUseChallengeSocial.mockReturnValue(defaultSocialState);
    mockedMine.mockResolvedValue({ ok: true, questions: [mine] });
    mockedWeekly.mockResolvedValue({ ok: true, ...weekly });
  });

  afterEach(() => {
    act(() => root.unmount());
    mount.remove();
  });

  it('opens a full-screen positive daily experience with common progress and no ranking surface', () => {
    act(() => root.render(createElement(ChallengeDialog, { sourceFacts: VERIFIED_CHALLENGE_FACTS, studentId: 'student-b', canCreate: true, onClose: vi.fn() })));
    expect(mount.querySelector('[data-challenge-dialog]')).not.toBeNull();
    expect(mount.textContent).toContain('Thách đố tiếp sức');
    expect(mount.textContent).toContain('Mỗi câu đúng giúp cả lớp tiến thêm một bước');
    expect(mount.textContent).toContain('4/10');
    expect(mount.textContent).toContain(question.prompt);
    expect(mount.querySelectorAll('[data-challenge-tab]')).toHaveLength(3);
    expect(mount.textContent).not.toMatch(/xếp hạng|điểm của bạn|nhanh nhất/i);
  });

  it('switches to typed mine/week boundaries and loads the composer only in the mine tab', async () => {
    act(() => root.render(createElement(ChallengeDialog, { sourceFacts: VERIFIED_CHALLENGE_FACTS, studentId: 'student-b', canCreate: true, onClose: vi.fn() })));
    act(() => mount.querySelector<HTMLButtonElement>('[data-challenge-tab="mine"]')?.click());
    await act(async () => { await Promise.resolve(); });
    expect(mount.querySelector('[data-challenge-composer]')).not.toBeNull();
    expect(mount.textContent).toContain('Chờ phụ huynh duyệt');
    act(() => mount.querySelector<HTMLButtonElement>('[data-challenge-tab="week"]')?.click());
    await act(async () => { await Promise.resolve(); });
    expect(mount.querySelector('[data-challenge-weekly-map]')).not.toBeNull();
    expect(mount.querySelectorAll('[data-challenge-week-day]')).toHaveLength(7);
    expect(mount.textContent).toContain('Địa phương em');
    expect(mount.textContent).not.toMatch(/rank|leaderboard|top five|xếp hạng/i);
  });

  it('adds positive reactions and a parent report action only to another student’s question', async () => {
    const social: ChallengeSocialState = {
      ...defaultSocialState,
      addReaction: vi.fn(async () => true),
      report: vi.fn(async () => true),
    };
    mockedUseChallengeSocial.mockReturnValue(social);
    const onClose = vi.fn();
    act(() => root.render(createElement(ChallengeDialog, { sourceFacts: VERIFIED_CHALLENGE_FACTS, studentId: 'student-b', onClose })));

    expect(mount.querySelector('[data-challenge-reaction-bar="item-1"]')).not.toBeNull();
    act(() => mount.querySelector<HTMLButtonElement>('[data-challenge-reaction="learned"]')?.click());
    expect(social.addReaction).toHaveBeenCalledWith('item-1', 'learned');

    act(() => mount.querySelector<HTMLButtonElement>('[data-challenge-open-report="item-1"]')?.click());
    expect(mount.querySelector('[data-challenge-report-dialog]')).not.toBeNull();
    act(() => mount.querySelector<HTMLInputElement>('[data-challenge-report-reason="unclear"]')?.click());
    act(() => mount.querySelector<HTMLButtonElement>('[data-challenge-report-submit]')?.click());
    await act(async () => { await Promise.resolve(); });
    expect(social.report).toHaveBeenCalledWith('item-1', { reason: 'unclear' });
    expect(mount.querySelector('[data-challenge-report-dialog]')).toBeNull();
  });

  it('does not show social actions for the author’s own question', () => {
    act(() => root.render(createElement(ChallengeDialog, { sourceFacts: VERIFIED_CHALLENGE_FACTS, studentId: 'student-a', onClose: vi.fn() })));
    expect(mount.querySelector('[data-challenge-reaction-bar]')).toBeNull();
    expect(mount.querySelector('[data-challenge-open-report]')).toBeNull();
    expect(mount.querySelector('[data-challenge-author-note]')).not.toBeNull();
  });

  it('restores focus and closes on Escape or backdrop without changing the navigation view', () => {
    const opener = document.createElement('button');
    document.body.insertBefore(opener, mount);
    opener.focus();
    const onClose = vi.fn();
    act(() => root.render(createElement(ChallengeDialog, { sourceFacts: VERIFIED_CHALLENGE_FACTS, studentId: 'student-b', onClose })));
    expect(document.activeElement).toBe(mount.querySelector('[aria-label="Đóng Thách đố"]'));
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onClose).toHaveBeenCalledOnce();
    act(() => mount.querySelector<HTMLElement>('.challenge-dialog-backdrop')?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(2);
    act(() => root.unmount());
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

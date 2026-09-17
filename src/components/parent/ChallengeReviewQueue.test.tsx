import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChallengePreferences, ChallengeQuestionParent } from '../../../shared/challenge-contracts';
import { ChallengeReviewQueue } from './ChallengeReviewQueue';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function question(id = 'q-queue'): ChallengeQuestionParent {
  return {
    id,
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
    revision: 2,
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
    quotaUsedOnCreatedDate: 2,
    preview: null,
    reviewHistory: [],
  };
}

const settings: ChallengePreferences = { studentId: 'student-a', canCreate: true, canParticipate: true, updatedAt: '2026-09-17T08:00:00.000Z' };

describe('ChallengeReviewQueue', () => {
  let root: Root;
  let mount: HTMLDivElement;

  beforeEach(() => {
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
  });

  afterEach(() => {
    act(() => root.unmount());
    mount.remove();
  });

  function render(overrides: Partial<Parameters<typeof ChallengeReviewQueue>[0]> = {}) {
    const props = {
      questions: [question()],
      settings,
      loading: false,
      error: '',
      busyQuestionId: null,
      onRetry: vi.fn(),
      onApprove: vi.fn(async () => true),
      onRequestRevision: vi.fn(async () => true),
      onWithdraw: vi.fn(async () => true),
      onSettingsChange: vi.fn(async () => true),
      ...overrides,
    };
    act(() => root.render(createElement(ChallengeReviewQueue, props)));
    return props;
  }

  it('renders the source/answer/revision context and asks for responsibility confirmation before approval', async () => {
    const props = render();
    expect(mount.querySelector('[data-challenge-review-queue]')).not.toBeNull();
    expect(mount.textContent).toContain('Bản đồ');
    expect(mount.textContent).toContain('Revision 2');
    expect(mount.textContent).toContain('challenge-facts-v1');
    expect(mount.querySelector('[data-challenge-review-source] details')).not.toBeNull();
    expect(mount.querySelector('[data-challenge-review-source] a')).toBeNull();
    expect(mount.querySelector<HTMLInputElement>('[aria-label="Cho phép tạo câu hỏi"]')?.checked).toBe(true);
    expect(mount.querySelector<HTMLInputElement>('[aria-label="Cho phép tham gia Thách đố"]')?.checked).toBe(true);

    await act(async () => { mount.querySelector<HTMLButtonElement>('[data-challenge-review-approve="q-queue"]')?.click(); await Promise.resolve(); });
    expect(props.onApprove).not.toHaveBeenCalled();
    expect(mount.querySelector('[data-challenge-approval-modal]')).not.toBeNull();
    expect(mount.textContent).toMatch(/phụ huynh chịu trách nhiệm/i);
    act(() => mount.querySelector<HTMLButtonElement>('[data-challenge-approval-review]')?.click());
    expect(mount.querySelector('[data-challenge-approval-modal]')).toBeNull();
    expect(props.onApprove).not.toHaveBeenCalled();
    await act(async () => { mount.querySelector<HTMLButtonElement>('[data-challenge-review-approve="q-queue"]')?.click(); await Promise.resolve(); });
    await act(async () => { mount.querySelector<HTMLButtonElement>('[data-challenge-approval-confirm]')?.click(); await Promise.resolve(); });
    expect(props.onApprove).toHaveBeenCalledWith('q-queue', 2);
  });

  it('requires a revision reason, then sends it and supports withdraw, retry, empty and error states', async () => {
    const props = render();
    const requestRevision = mount.querySelector<HTMLButtonElement>('[data-challenge-review-request="q-queue"]')!;
    expect(requestRevision.disabled).toBe(true);
    const reason = mount.querySelector<HTMLTextAreaElement>('[data-challenge-review-reason="q-queue"]')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(reason, 'Con hãy viết rõ hơn nhé.');
    act(() => reason.dispatchEvent(new Event('input', { bubbles: true })));
    expect(requestRevision.disabled).toBe(false);
    await act(async () => { requestRevision.click(); await Promise.resolve(); });
    expect(props.onRequestRevision).toHaveBeenCalledWith('q-queue', 2, 'Con hãy viết rõ hơn nhé.');
    act(() => mount.querySelector<HTMLButtonElement>('[data-challenge-review-withdraw="q-queue"]')?.click());
    expect(props.onWithdraw).toHaveBeenCalledWith('q-queue');

    const retry = vi.fn();
    act(() => root.render(createElement(ChallengeReviewQueue, { ...props, questions: [], onRetry: retry })));
    expect(mount.textContent).toContain('Chưa có câu hỏi');
    act(() => root.render(createElement(ChallengeReviewQueue, { ...props, error: 'Mạng đang chập chờn.', onRetry: retry })));
    act(() => mount.querySelector<HTMLButtonElement>('[data-challenge-review-retry]')?.click());
    expect(retry).toHaveBeenCalledOnce();
  });
});

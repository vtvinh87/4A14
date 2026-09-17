import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChallengeAnswerResult, ChallengeQuestionView } from '../../shared/challenge-contracts';
import { ChallengeQuestionCard } from './ChallengeQuestionCard';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const answer: ChallengeAnswerResult = {
  questionId: 'question-1', selectedOptionId: 'correct', correct: true, correctOptionId: 'correct',
  explanation: 'Bản đồ giúp thể hiện thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.',
  sourceLabel: question.sourceLabel, classContributionAdded: true, duplicate: false,
};

describe('ChallengeQuestionCard', () => {
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

  it('renders four accessible options, author context and no answer before submit', () => {
    act(() => root.render(createElement(ChallengeQuestionCard, { question, onSubmit: vi.fn() })));
    expect(mount.querySelector('[data-challenge-question-card="question-1"]')).not.toBeNull();
    expect(mount.textContent).toContain('Bạn An');
    expect(mount.textContent).toContain('Địa phương em');
    expect(mount.querySelectorAll<HTMLInputElement>('input[type="radio"]')).toHaveLength(4);
    expect(mount.querySelector('[data-challenge-feedback]')).toBeNull();
    expect(mount.textContent).not.toContain('Đáp án đúng:');
  });

  it('keeps the selected option and idempotency intent when submit is still pending or fails', async () => {
    const onSubmit = vi.fn(async () => null);
    act(() => root.render(createElement(ChallengeQuestionCard, { question, onSubmit })));
    const radio = mount.querySelector<HTMLInputElement>('input[value="wrong-1"]')!;
    act(() => { radio.click(); });
    await act(async () => { mount.querySelector<HTMLButtonElement>('[data-challenge-submit]')?.click(); await Promise.resolve(); });
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ selectedOptionId: 'wrong-1', idempotencyKey: expect.any(String) }));
    expect(radio.checked).toBe(true);
    expect(mount.textContent).toContain('Chưa nhận được xác nhận');
  });

  it('keeps the last-known question readable but disables answering while offline', () => {
    const onSubmit = vi.fn();
    act(() => root.render(createElement(ChallengeQuestionCard, { question, offline: true, onSubmit })));
    expect(mount.querySelector('[data-challenge-offline]')?.textContent).toContain('ngoại tuyến');
    expect(mount.querySelector('fieldset')?.hasAttribute('disabled')).toBe(true);
    expect(mount.querySelector<HTMLButtonElement>('[data-challenge-submit]')?.disabled).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows text feedback and a non-scoring practice action after acknowledgement', async () => {
    const onSubmit = vi.fn(async () => answer);
    act(() => root.render(createElement(ChallengeQuestionCard, { question, answer, onSubmit })));
    expect(mount.querySelector('[data-challenge-feedback]')).not.toBeNull();
    expect(mount.textContent).toContain('Cả lớp vừa tiến thêm một bước');
    expect(mount.textContent).toContain('Giải thích');
    expect(mount.textContent).toContain('Đáp án đúng');
    const practice = mount.querySelector<HTMLButtonElement>('[data-challenge-practice]');
    expect(practice).not.toBeNull();
    await act(async () => { practice?.click(); await Promise.resolve(); });
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ selectedOptionId: 'correct', isPractice: true, idempotencyKey: expect.any(String) }));
  });
});

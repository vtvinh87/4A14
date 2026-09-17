import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChallengeWeeklyResponse } from '../../shared/challenge-contracts';
import { ChallengeWeeklyMap } from './ChallengeWeeklyMap';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const weekly: ChallengeWeeklyResponse = {
  weekStart: '2026-09-14',
  weekEnd: '2026-09-20',
  days: Array.from({ length: 7 }, (_, index) => ({
    date: `2026-09-${String(14 + index).padStart(2, '0')}`,
    current: index < 3 ? index + 1 : 0,
    target: index < 3 ? 4 : 0,
    completed: index === 1,
    rewardGranted: index === 1,
    questionCount: index < 3 ? index + 1 : 0,
  })),
  classProgress: { current: 6, target: 12, completedDays: 1 },
  topics: [
    { lessonId: 'lesson-01', title: 'Địa phương em', questionCount: 3 },
    { lessonId: 'lesson-07', title: 'Đền Hùng và lễ Giỗ Tổ Hùng Vương', questionCount: 1 },
  ],
  recognitions: [
    { type: 'question_creator', recipientIds: ['student-a', 'student-b'] },
    { type: 'kind_helper', recipientIds: ['student-c'] },
  ],
  mySummary: { questionsCreated: 1, correctAnswers: 2, revisits: 1 },
};

describe('ChallengeWeeklyMap', () => {
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

  it('shows the seven-day class map, topics, and positive recognitions without a ranking', () => {
    act(() => root.render(createElement(ChallengeWeeklyMap, { weekly })));

    expect(mount.querySelector('[data-challenge-weekly-map]')).not.toBeNull();
    expect(mount.querySelectorAll('[data-challenge-week-day]')).toHaveLength(7);
    expect(mount.querySelector('[data-challenge-week-progress]')?.textContent).toContain('6/12');
    expect(mount.textContent).toContain('Địa phương em');
    expect(mount.textContent).toContain('Đền Hùng');
    expect(mount.textContent).toContain('Bạn tạo câu hỏi');
    expect(mount.textContent).toContain('Bạn lan tỏa điều hay');
    expect(mount.textContent).not.toMatch(/xếp hạng|leaderboard|top|điểm của bạn|nhanh nhất/i);
  });

  it('keeps a previous snapshot visible while marking it stale and offers retry', () => {
    const onRetry = vi.fn();
    act(() => root.render(createElement(ChallengeWeeklyMap, { weekly, stale: true, error: 'Mạng đang chập chờn.', onRetry })));

    expect(mount.querySelector('[data-challenge-week-stale]')).not.toBeNull();
    expect(mount.textContent).toContain('6/12');
    expect(mount.textContent).toContain('Mạng đang chập chờn.');
    act(() => mount.querySelector<HTMLButtonElement>('[data-challenge-week-retry]')?.click());
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('renders an actionable empty state when no weekly snapshot is available', () => {
    const onRetry = vi.fn();
    act(() => root.render(createElement(ChallengeWeeklyMap, { weekly: null, loading: false, error: 'Chưa tải được tổng kết.', onRetry })));

    expect(mount.querySelector('[data-challenge-weekly-map]')).not.toBeNull();
    expect(mount.textContent).toContain('Chưa tải được tổng kết.');
    expect(mount.querySelector('[data-challenge-week-retry]')).not.toBeNull();
  });
});

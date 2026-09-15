import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DashboardLessonStatus } from '../../../shared/dashboard-contracts';
import { LessonMap } from './LessonMap';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function syntheticLessons(): DashboardLessonStatus[] {
  return Array.from({ length: 29 }, (_, index) => ({
    lessonId: `lesson-${String(index + 1).padStart(2, '0')}` as DashboardLessonStatus['lessonId'],
    title: `Bài tổng hợp ${index + 1}`,
    topic: 'Chủ đề tổng hợp',
    status: 'open' as const,
    completedMissions: index,
    totalMissions: 5,
  }));
}

describe('LessonMap scroll region', () => {
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

  it('keeps all 29 lesson rows in one focusable labelled region while the heading and action stay outside', () => {
    act(() => root.render(createElement(LessonMap, { lessons: syntheticLessons(), onOpenLessons: vi.fn() })));

    const region = mount.querySelector('[data-parent-scroll-region="lessons"]');
    expect(region).not.toBeNull();
    expect(region?.getAttribute('role')).toBe('region');
    expect(region?.getAttribute('tabindex')).toBe('0');
    expect(region?.getAttribute('aria-label')).toBe('Danh sách trạng thái 29 bài');
    expect(region?.querySelectorAll('.parent-lesson-row')).toHaveLength(29);
    expect(region?.textContent).toContain('Bài tổng hợp 29');
    expect(region?.querySelector('#lesson-map-title')).toBeNull();
    expect(mount.querySelector('#lesson-map-title')?.closest('[data-parent-scroll-region]')).toBeNull();
    expect(mount.querySelector('button')?.closest('[data-parent-scroll-region]')).toBeNull();
  });
});

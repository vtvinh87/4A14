import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DashboardActivity } from '../../../shared/dashboard-contracts';
import { History } from './History';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function syntheticActivities(): DashboardActivity[] {
  return Array.from({ length: 15 }, (_, index) => ({
    key: `lesson-01:1:activity-${index + 1}`,
    activityId: `Hoạt động ${index + 1}`,
    lessonId: 'lesson-01',
    lessonVersion: 1,
    topic: 'Chủ đề tổng hợp',
    attempts: index + 1,
    firstAttemptCorrect: index % 2 === 0,
    firstAttemptHintUsed: false,
    hintUsed: false,
    eventIds: [`event-${index + 1}`],
    firstAttemptAt: `2026-09-14T00:${String(index).padStart(2, '0')}:00.000Z`,
    retryCount: index,
  }));
}

describe('History scroll region', () => {
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

  it('keeps every sorted activity and expanded details inside one focusable labelled region', () => {
    act(() => root.render(createElement(History, { activities: syntheticActivities() })));

    const region = mount.querySelector('[data-parent-scroll-region="history"]');
    expect(region).not.toBeNull();
    expect(region?.getAttribute('role')).toBe('region');
    expect(region?.getAttribute('tabindex')).toBe('0');
    expect(region?.getAttribute('aria-label')).toBe('Danh sách lịch sử hoạt động');
    expect(region?.querySelectorAll('.dashboard-history-item')).toHaveLength(15);
    expect(region?.textContent).toContain('Hoạt động 15');
    expect(region?.querySelector('.dashboard-history-item')?.textContent).toContain('Hoạt động 15');
    expect(region?.querySelectorAll('.dashboard-history-detail')).toHaveLength(15);
    expect(region?.querySelector('.dashboard-history-detail')?.closest('[data-parent-scroll-region="history"]')).toBe(region);
    expect(mount.querySelector('#history-title')?.closest('[data-parent-scroll-region]')).toBeNull();
  });
});

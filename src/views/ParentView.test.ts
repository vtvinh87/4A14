import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ParentView } from './ParentView';
import { createDefaultProgress } from '../progress/storage';
import type { ParentDashboardData } from '../../shared/dashboard-contracts';
import type { LearningEventRecord } from '../../shared/learning-contracts';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ParentView artwork', () => {
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

  it('uses themed local artwork in place of generic inline icons', () => {
    act(() => root.render(createElement(ParentView, {
      progress: createDefaultProgress(),
      settings: createDefaultProgress().settings,
      storageRecovery: false,
      storageWriteWarning: false,
      onOpenSettings: vi.fn(),
      onOpenLessons: vi.fn(),
      onChangeParentPin: vi.fn(),
      onLockParent: vi.fn(),
    })));

    expect(mount.querySelectorAll('[data-parent-art]')).not.toHaveLength(0);
    expect(mount.querySelectorAll('[data-device-feature-art]')).toHaveLength(2);
    expect(mount.querySelector('.parent-footer-note')).toBeNull();
    expect(mount.textContent).not.toContain('Chỉ công bố trạng thái đã lưu sau khi ghi thành công');
    expect(mount.textContent).not.toContain('Offline');
    expect(mount.textContent).not.toContain('Xuất sao lưu');
    expect(mount.textContent).not.toContain('Nhập sao lưu');
    expect(mount.textContent).toContain('0/145');
  });

  it('renders server dashboard evidence and forwards the selected range', () => {
    const progress = createDefaultProgress();
    const event: LearningEventRecord = {
      eventId: '44444444-4444-4444-8444-444444444444',
      runId: '55555555-5555-4555-8555-555555555555',
      sequence: 1,
      type: 'answer_submitted',
      lessonId: 'lesson-01',
      lessonVersion: 1,
      deviceId: 'test-device',
      activityId: 'a-1',
      response: { type: 'choice', optionId: 'correct' },
      generation: 0,
      studentId: '66666666-6666-4666-8666-666666666666',
      receivedAt: '2026-09-14T00:00:00.000Z',
      hintUsed: false,
      correct: true,
      visible: true,
      interactive: true,
    };
    const dashboard: ParentDashboardData = {
      schemaVersion: 1,
      ruleVersion: 'dashboard-rules-v1',
      studentId: event.studentId,
      range: '7d',
      generatedAt: event.receivedAt,
      lastSyncedAt: event.receivedAt,
      snapshot: { studentId: event.studentId, schemaVersion: 1, revision: 2, generation: 0, contentVersion: 'lesson-content-v1', progress, updatedAt: event.receivedAt },
      metrics: { range: '7d', activitySample: 1, totalAttempts: 1, retryAttempts: 0, firstAttemptCorrect: 1, firstAttemptAccuracy: 1, hintActivities: 0, hintRate: 0, activeDays: 1, estimatedMinutes: 1, completedLessons: 0, totalLessons: 29, completedMissions: 2, totalMissions: 145, stamps: 0, totalStamps: 29, lastActivityAt: event.receivedAt, dataQuality: 'limited' },
      activities: [{ key: 'lesson-01:1:a-1', activityId: 'a-1', lessonId: 'lesson-01', lessonVersion: 1, topic: 'Địa phương em', attempts: 1, firstAttemptCorrect: true, firstAttemptHintUsed: false, hintUsed: false, eventIds: [event.eventId], firstAttemptAt: event.receivedAt, retryCount: 0 }],
      lessons: [],
      suggestions: [{ id: 'insufficient-data', kind: 'insufficient', title: 'Thêm một chút dữ liệu', body: 'Hãy khám phá thêm.', action: 'Làm tiếp một hoạt động.', evidence: '1/5 hoạt động', provenance: { ruleVersion: 'dashboard-rules-v1', range: '7d', activityKeys: ['lesson-01:1:a-1'], eventIds: [event.eventId], generatedAt: event.receivedAt } }],
      events: [event],
    };
    const onRangeChange = vi.fn();

    act(() => root.render(createElement(ParentView, {
      progress,
      settings: progress.settings,
      dashboard,
      childName: 'Bé Test',
      onRangeChange,
      storageRecovery: false,
      storageWriteWarning: false,
      onOpenSettings: vi.fn(),
      onOpenLessons: vi.fn(),
      onChangeParentPin: vi.fn(),
      onLockParent: vi.fn(),
    })));

    expect(mount.textContent).toContain('Theo dõi Bé Test');
    expect(mount.textContent).toContain('2/145');
    expect(mount.textContent).toContain('Nguồn: dashboard-rules-v1 · 1 event');
    expect(mount.querySelectorAll('.dashboard-data-table')).toHaveLength(1);
    const rangeButton = Array.from(mount.querySelectorAll('button')).find((button) => button.textContent?.includes('30 ngày')) as HTMLButtonElement | undefined;
    act(() => rangeButton?.click());
    expect(onRangeChange).toHaveBeenCalledWith('30d');
  });

  it('removes the dashboard intro card while keeping the range filter available', () => {
    const progress = createDefaultProgress();
    act(() => root.render(createElement(ParentView, {
      progress,
      settings: progress.settings,
      childName: 'Bé Test',
      storageRecovery: false,
      storageWriteWarning: false,
      onOpenSettings: vi.fn(),
      onOpenLessons: vi.fn(),
      onChangeParentPin: vi.fn(),
      onLockParent: vi.fn(),
    })));

    expect(mount.querySelector('.parent-dashboard-heading')).toBeNull();
    expect(mount.querySelector('.parent-dashboard-subtitle')).toBeNull();
    expect(mount.querySelector('.parent-dashboard-toolbar')).not.toBeNull();
    expect(mount.querySelector('.parent-range-switch')).not.toBeNull();
  });

  it('preserves selected range metrics while keeping list headings and actions outside regions', () => {
    const progress = createDefaultProgress();
    const lessons = Array.from({ length: 29 }, (_, index) => ({
      lessonId: `lesson-${String(index + 1).padStart(2, '0')}` as ParentDashboardData['lessons'][number]['lessonId'],
      title: `Bài ${index + 1}`,
      topic: 'Tổng hợp',
      status: 'open' as const,
      completedMissions: 0,
      totalMissions: 5,
    }));
    const activities = Array.from({ length: 15 }, (_, index) => ({
      key: `lesson-01:1:activity-${index + 1}`,
      activityId: `Hoạt động ${index + 1}`,
      lessonId: 'lesson-01' as ParentDashboardData['activities'][number]['lessonId'],
      lessonVersion: 1,
      topic: 'Tổng hợp',
      attempts: 1,
      firstAttemptCorrect: true,
      firstAttemptHintUsed: false,
      hintUsed: false,
      eventIds: [`event-${index + 1}`],
      firstAttemptAt: `2026-09-14T00:${String(index).padStart(2, '0')}:00.000Z`,
      retryCount: 0,
    }));
    const dashboard = { range: '30d', lessons, activities, metrics: { range: '30d', activitySample: 15, totalAttempts: 15, retryAttempts: 0, firstAttemptCorrect: 15, firstAttemptAccuracy: 1, hintActivities: 0, hintRate: 0, activeDays: 1, estimatedMinutes: 10, completedLessons: 0, totalLessons: 29, completedMissions: 0, totalMissions: 145, stamps: 0, totalStamps: 29, lastActivityAt: null, dataQuality: 'ready' }, schemaVersion: 1, ruleVersion: 'dashboard-rules-v1', studentId: 'student-test', generatedAt: '2026-09-14T00:00:00.000Z', lastSyncedAt: '2026-09-14T00:00:00.000Z', snapshot: { studentId: 'student-test', schemaVersion: 1, revision: 1, generation: 0, contentVersion: 'lesson-content-v1', progress, updatedAt: '2026-09-14T00:00:00.000Z' }, suggestions: [], events: [] } satisfies ParentDashboardData;

    act(() => root.render(createElement(ParentView, { progress, settings: progress.settings, dashboard, storageRecovery: false, storageWriteWarning: false, onOpenSettings: vi.fn(), onOpenLessons: vi.fn(), onChangeParentPin: vi.fn(), onLockParent: vi.fn() })));

    expect(mount.querySelector('.parent-range-switch button.is-active')?.textContent).toContain('30 ngày');
    expect(mount.textContent).toContain('10 phút');
    expect(mount.querySelector('[data-parent-scroll-region="lessons"]')?.querySelectorAll('.parent-lesson-row')).toHaveLength(29);
    expect(mount.querySelector('[data-parent-scroll-region="history"]')?.querySelectorAll('.dashboard-history-item')).toHaveLength(15);
  });

  it('keeps the birthday preference parent-scoped and does not expose exact birth date or age in the view copy', () => {
    const progress = createDefaultProgress();
    const parentProfile = { accountId: 'student-a', username: 'bebao', displayName: 'Bé Bảo', avatarId: 'fox-scout' as const, birthDate: '2016-09-14', birthdayWishesEnabled: false };
    act(() => root.render(createElement(ParentView, { progress, settings: progress.settings, parentProfile, childName: parentProfile.displayName, storageRecovery: false, storageWriteWarning: false, onBirthdayWishesEnabledChange: vi.fn(), onOpenSettings: vi.fn(), onOpenLessons: vi.fn(), onChangeParentPin: vi.fn(), onLockParent: vi.fn() })));
    expect(mount.textContent).toContain('Bé Bảo');
    expect(mount.textContent).not.toContain('2016-09-14');
    expect(mount.textContent).not.toMatch(/\b\d{1,2}\s*tuổi\b/i);
    expect(mount.querySelector('[data-parent-scroll-region="lessons"]')).not.toBeNull();
  });
});

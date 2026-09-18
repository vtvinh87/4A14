import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProgressBoardData, ProgressBoardLesson } from '../../../shared/progress-board-contracts';
import { TOPICS } from '../../content/catalog';
import { ClassUnlockCard } from './ClassUnlockCard';
import { ProgressBoardDialog, type ProgressBoardDialogProps } from './ProgressBoardDialog';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const lesson: ProgressBoardLesson = {
  lessonId: 'lesson-01',
  title: 'Địa phương em',
  topic: TOPICS[0],
  completed: false,
  state: 'explored',
  completedMissionCount: 1,
  missionCount: 5,
  objectives: [{
    objectiveId: 'objective-01',
    label: 'Nhận biết địa phương',
    state: 'explored',
    practicedActivityCount: 1,
    independentActivityCount: 0,
    nextAction: 'practice',
  }],
  nextAction: 'practice',
};

const data: ProgressBoardData = {
  schemaVersion: 1,
  ruleVersion: 'progress-board-v1',
  contentVersion: 'lesson-content-v1',
  generation: '2',
  generatedAt: '2026-09-17T10:00:00.000Z',
  lastSyncedAt: '2026-09-17T09:00:00.000Z',
  stale: false,
  summary: { exploredLessonCount: 1, completedLessonCount: 0, independentObjectiveCount: 0, nextLessonId: lesson.lessonId },
  topics: [{ topic: lesson.topic, lessons: [lesson] }],
  nextLessonId: lesson.lessonId,
};

const baseProps: ProgressBoardDialogProps = {
  status: 'success',
  data,
  error: '',
  reducedMotion: false,
  onRefresh: vi.fn(async () => undefined),
  onClose: vi.fn(),
};

function Harness(props: Omit<ProgressBoardDialogProps, 'onClose'>) {
  const [open, setOpen] = useState(true);
  return open
    ? createElement(ProgressBoardDialog, { ...props, onClose: () => setOpen(false) })
    : createElement('p', { 'data-dialog-closed': true }, 'Đã đóng');
}

describe('ProgressBoardDialog', () => {
  let root: Root;
  let mount: HTMLDivElement;

  beforeEach(() => {
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
    document.body.style.overflow = '';
  });

  afterEach(() => {
    act(() => root.unmount());
    mount.remove();
    document.body.style.overflow = '';
  });

  it('manages focus, traps Tab, closes on Escape and restores the opener', () => {
    const opener = document.createElement('button');
    opener.textContent = 'Mở bản đồ';
    document.body.insertBefore(opener, mount);
    opener.focus();
    act(() => root.render(createElement(Harness, { ...baseProps })));

    const dialog = mount.querySelector<HTMLElement>('[data-progress-board-dialog]')!;
    const close = mount.querySelector<HTMLButtonElement>('[aria-label="Đóng Bảng tiến bộ"]')!;
    expect(document.activeElement).toBe(close);
    expect(document.body.style.overflow).toBe('hidden');

    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
    focusable[focusable.length - 1]?.focus();
    act(() => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(focusable[0]);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(mount.querySelector('[data-progress-board-dialog]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe('');

    opener.remove();
  });

  it('closes only when the backdrop itself is clicked', () => {
    const onClose = vi.fn();
    act(() => root.render(createElement(ProgressBoardDialog, { ...baseProps, onClose })));
    const backdrop = mount.querySelector<HTMLElement>('[data-progress-board-backdrop]')!;
    const dialog = mount.querySelector<HTMLElement>('[data-progress-board-dialog]')!;
    act(() => dialog.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
    expect(onClose).not.toHaveBeenCalled();
    act(() => backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders loading, empty, success, stale and unavailable states', () => {
    const render = (overrides: Partial<ProgressBoardDialogProps>) => act(() => root.render(createElement(ProgressBoardDialog, { ...baseProps, ...overrides })));
    render({ status: 'loading', data: null });
    expect(mount.textContent).toContain('Đang mở bản đồ tiến bộ');
    render({ status: 'empty', data: { ...data, summary: { ...data.summary, exploredLessonCount: 0 }, topics: [] } });
    expect(mount.textContent).toContain('Mình bắt đầu từ bài học đầu tiên');
    render({ status: 'success', data });
    expect(mount.textContent).toContain('Cậu muốn ghé miền nào?');
    expect(mount.querySelector('[data-progress-board-badge]')?.textContent).toBe('1/1 chặng');
    render({ status: 'stale', data: { ...data, stale: true }, error: 'Dữ liệu có thể chưa mới.' });
    expect(mount.textContent).toContain('có thể chưa mới');
    render({ status: 'unavailable', data: null, error: 'Bảng tiến bộ tạm thời chưa sẵn sàng. Bạn thử lại nhé.' });
    expect(mount.textContent).toContain('Bạn thử lại nhé');
  });

  it('exposes one retry action and hides invalid class aggregate', () => {
    const onRefresh = vi.fn(async () => undefined);
    act(() => root.render(createElement(ProgressBoardDialog, { ...baseProps, status: 'unavailable', data: null, error: 'Tạm thời chưa sẵn sàng.', onRefresh })));
    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-board-retry]')?.click());
    expect(onRefresh).toHaveBeenCalledOnce();

    const classMount = document.createElement('div');
    document.body.appendChild(classMount);
    const classRoot = createRoot(classMount);
    act(() => classRoot.render(createElement('div', null,
      createElement(ClassUnlockCard, { summary: { current: 2, target: 5, completedDays: 1 } }),
      createElement(ClassUnlockCard, { summary: { current: 5, target: 0, completedDays: 1 } }),
    )));
    expect(classMount.querySelectorAll('[data-class-unlock-card]')).toHaveLength(1);
    expect(classMount.textContent).not.toMatch(/dẫn đầu|xếp hạng|điểm số|hơn bạn|kém bạn/i);
    act(() => classRoot.unmount());
    classMount.remove();
  });

  it('uses a map-first presentation and keeps dense report panels out of the default view', () => {
    act(() => root.render(createElement(ProgressBoardDialog, { ...baseProps })));

    expect(mount.querySelector('[data-progress-map]')).not.toBeNull();
    expect(mount.querySelector('[data-progress-map-info-panel="welcome"]')).not.toBeNull();
    expect(mount.querySelector('[data-progress-map-drawer]')).toBeNull();
    expect(mount.querySelector('#progress-board-dialog-title')?.textContent).toBe('Chuyến đi của tớ');
    expect(mount.querySelector('[data-progress-summary]')).toBeNull();
    expect(mount.querySelector('[data-progress-topic-map]')).toBeNull();
  });

  it('clears the lesson strip and detail when the drawer is collapsed', () => {
    act(() => root.render(createElement(ProgressBoardDialog, { ...baseProps })));

    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-compass]')?.click());
    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-drawer-expand]')?.click());
    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-drawer-details]')?.click());
    expect(mount.querySelector('[data-progress-lesson-detail]')).not.toBeNull();

    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-drawer-expand]')?.click());
    expect(mount.querySelector('[data-progress-lesson-strip]')).toBeNull();
    expect(mount.querySelector('[data-progress-lesson-detail]')).toBeNull();
  });

  it('selects the local compass topic and keeps an empty region action disabled', () => {
    act(() => root.render(createElement(ProgressBoardDialog, { ...baseProps })));

    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-compass]')?.click());
    expect(mount.querySelector('[data-progress-map-info-panel="topic"]')).not.toBeNull();
    expect(mount.querySelector('[data-progress-map-drawer]')).not.toBeNull();
    expect(mount.querySelector('[data-progress-map-drawer-cta]')?.hasAttribute('disabled')).toBe(false);

    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-node="Tây Nguyên"]')?.click());
    expect(mount.querySelector('[data-progress-map-drawer]')?.textContent).toContain('Vùng này chưa có bài để mở.');
    expect(mount.querySelector<HTMLButtonElement>('[data-progress-map-drawer-cta]')?.disabled).toBe(true);
  });

  it('opens a shared landmark panel and Escape closes layers before the dialog', () => {
    const onClose = vi.fn();
    act(() => root.render(createElement(ProgressBoardDialog, { ...baseProps, onClose })));

    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-landmark="hue"]')?.click());
    expect(mount.querySelector('[data-progress-map-info-panel="landmark"]')).not.toBeNull();
    expect(mount.querySelector('[data-progress-map-landmark-title="hue"]')?.textContent).toBe('Cố đô Huế');

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(mount.querySelector('[data-progress-map-info-panel="welcome"]')).not.toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('opens landmark image details without changing selection and returns focus on Escape', () => {
    const onClose = vi.fn();
    act(() => root.render(createElement(ProgressBoardDialog, { ...baseProps, onClose })));

    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-landmark="kim-lien"]')?.click());
    const trigger = mount.querySelector<HTMLButtonElement>('[data-progress-map-landmark-image-trigger]')!;
    act(() => trigger.click());

    expect(mount.querySelector('[data-progress-map-landmark-modal]')).not.toBeNull();
    expect(mount.querySelector('[data-progress-map-info-panel="landmark"]')).not.toBeNull();
    expect(mount.querySelector('[data-progress-map-landmark-title="kim-lien"]')?.textContent).toBe('Làng Sen Kim Liên');
    expect(document.activeElement).toBe(mount.querySelector('[data-progress-map-landmark-modal-close]'));

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(mount.querySelector('[data-progress-map-landmark-modal]')).toBeNull();
    expect(mount.querySelector('[data-progress-map-info-panel="landmark"]')).not.toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(onClose).not.toHaveBeenCalled();

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(mount.querySelector('[data-progress-map-info-panel="welcome"]')).not.toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('traps Tab inside landmark details and keeps the board backdrop isolated', () => {
    const onClose = vi.fn();
    act(() => root.render(createElement(ProgressBoardDialog, { ...baseProps, onClose })));
    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-landmark="hue"]')?.click());
    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-landmark-image-trigger]')?.click());

    const modal = mount.querySelector<HTMLElement>('[data-progress-map-landmark-modal]')!;
    const close = mount.querySelector<HTMLButtonElement>('[data-progress-map-landmark-modal-close]')!;
    const source = modal.querySelector<HTMLAnchorElement>('a[href]')!;

    source.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(close);

    close.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(source);

    act(() => mount.querySelector<HTMLElement>('[data-progress-map-landmark-modal-backdrop]')?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
    expect(mount.querySelector('[data-progress-map-landmark-modal]')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the selected topic lesson as the CTA when refreshed data points elsewhere', () => {
    const centralLesson = { ...lesson, lessonId: 'lesson-18', topic: TOPICS[3] };
    const northLesson = { ...lesson, lessonId: 'lesson-04', topic: TOPICS[1] };
    const refreshedData: ProgressBoardData = {
      ...data,
      summary: { ...data.summary, nextLessonId: northLesson.lessonId },
      topics: [{ topic: TOPICS[1], lessons: [northLesson] }, { topic: TOPICS[3], lessons: [centralLesson] }],
      nextLessonId: northLesson.lessonId,
    };
    const onOpenLesson = vi.fn();
    const render = (nextData: ProgressBoardData) => act(() => root.render(createElement(ProgressBoardDialog, { ...baseProps, data: nextData, onOpenLesson })));

    render({ ...data, topics: [{ topic: TOPICS[3], lessons: [centralLesson] }], nextLessonId: centralLesson.lessonId, summary: { ...data.summary, nextLessonId: centralLesson.lessonId } });
    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-node="Duyên hải miền Trung"]')?.click());
    render(refreshedData);
    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-drawer-cta]')?.click());

    expect(onOpenLesson).toHaveBeenCalledWith(centralLesson.lessonId);
    expect(onOpenLesson).not.toHaveBeenCalledWith(northLesson.lessonId);
  });

  it('closes lesson detail, then drawer, then dialog with sequential Escape presses', () => {
    const onClose = vi.fn();
    act(() => root.render(createElement(ProgressBoardDialog, { ...baseProps, onClose })));
    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-compass]')?.click());
    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-drawer-expand]')?.click());
    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-drawer-details]')?.click());
    expect(mount.querySelector('[data-progress-lesson-detail]')).not.toBeNull();

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(mount.querySelector('[data-progress-lesson-detail]')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(mount.querySelector('[data-progress-lesson-strip]')).toBeNull();
    expect(mount.querySelector<HTMLButtonElement>('[data-progress-map-drawer-expand]')?.getAttribute('aria-expanded')).toBe('false');
    expect(onClose).not.toHaveBeenCalled();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

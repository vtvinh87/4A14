import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProgressBoardData, ProgressBoardLesson } from '../../../shared/progress-board-contracts';
import { TOPICS } from '../../content/catalog';
import { ProgressMapInfoPanel } from './ProgressMapInfoPanel';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const lesson: ProgressBoardLesson = {
  lessonId: 'lesson-18',
  title: 'Cố đô Huế',
  topic: TOPICS[3],
  completed: false,
  state: 'explored',
  completedMissionCount: 2,
  missionCount: 5,
  objectives: [],
  nextAction: 'practice',
};

const data: ProgressBoardData = {
  schemaVersion: 1,
  ruleVersion: 'progress-board-v1',
  contentVersion: 'lesson-content-v1',
  generation: 'fixture',
  generatedAt: '2026-09-18T00:00:00.000Z',
  lastSyncedAt: '2026-09-18T00:00:00.000Z',
  stale: false,
  summary: { exploredLessonCount: 1, completedLessonCount: 0, independentObjectiveCount: 0, nextLessonId: lesson.lessonId },
  topics: [{ topic: TOPICS[3], lessons: [lesson] }, { topic: TOPICS[4], lessons: [] }],
  nextLessonId: lesson.lessonId,
};

const baseProps = {
  data,
  selectedLessonId: lesson.lessonId,
  expanded: false,
  detailsOpen: false,
  reducedMotion: true,
  onToggleExpanded: vi.fn(),
  onToggleDetails: vi.fn(),
  onSelectLesson: vi.fn(),
  onOpenLesson: vi.fn(),
  onOpenLandmarkImage: vi.fn(),
  onBack: vi.fn(),
};

describe('ProgressMapInfoPanel', () => {
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

  it('renders the welcome branch with the accepted fox artwork and concise copy', () => {
    act(() => root.render(createElement(ProgressMapInfoPanel, { ...baseProps, selection: { kind: 'welcome' } })));

    expect(mount.querySelector('[data-progress-map-info-panel="welcome"]')).not.toBeNull();
    expect(mount.querySelector<HTMLImageElement>('[data-progress-map-welcome-art]')?.getAttribute('src')).toBe('/art/progress/support/fox-welcome.webp');
    expect(mount.textContent).toContain('Cậu muốn ghé miền nào?');
    expect(mount.textContent).not.toMatch(/6\/29|0\/5|3\/4/);
  });

  it('renders a landmark in the shared panel and sends the return-focus event', () => {
    const onBack = vi.fn();
    act(() => root.render(createElement(ProgressMapInfoPanel, { ...baseProps, onBack, selection: { kind: 'landmark', landmarkId: 'hue' } })));

    expect(mount.querySelector('[data-progress-map-info-panel="landmark"]')).not.toBeNull();
    expect(mount.querySelector('[data-progress-map-landmark-title="hue"]')?.textContent).toBe('Cố đô Huế');
    expect(mount.querySelector<HTMLImageElement>('[data-progress-map-landmark-art]')?.getAttribute('src')).toBe('/art/progress/support/landmark-hue.webp');
    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-info-back]')?.click());
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('makes a landmark image an accessible trigger for the detail modal', () => {
    const onOpenLandmarkImage = vi.fn();
    act(() => root.render(createElement(ProgressMapInfoPanel, {
      ...baseProps,
      onOpenLandmarkImage,
      selection: { kind: 'landmark', landmarkId: 'kim-lien' },
    })));

    const trigger = mount.querySelector<HTMLButtonElement>('[data-progress-map-landmark-image-trigger]');
    expect(trigger?.getAttribute('aria-label')).toBe('Xem ảnh lớn: Làng Sen Kim Liên');
    act(() => trigger?.click());

    expect(onOpenLandmarkImage).toHaveBeenCalledOnce();
    expect(onOpenLandmarkImage.mock.calls[0][0]).toBe('kim-lien');
    expect(onOpenLandmarkImage.mock.calls[0][1]).toBeInstanceOf(HTMLButtonElement);
  });

  it('keeps an empty topic informative and disables its action', () => {
    act(() => root.render(createElement(ProgressMapInfoPanel, { ...baseProps, selection: { kind: 'topic', topicName: TOPICS[4] }, selectedLessonId: null })));

    expect(mount.querySelector('[data-progress-map-info-panel="topic"]')).not.toBeNull();
    expect(mount.textContent).toContain('Vùng này chưa có bài để mở.');
    expect(mount.querySelector<HTMLButtonElement>('[data-progress-map-drawer-cta]')?.disabled).toBe(true);
  });
});

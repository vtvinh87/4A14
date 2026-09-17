import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProgressBoardLesson, ProgressBoardTopic } from '../../../shared/progress-board-contracts';
import { ProgressMapDrawer } from './ProgressMapDrawer';
import type { ProgressMapTopicSnapshot } from './progressMapSelectors';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const lessons: ProgressBoardLesson[] = [
  {
    lessonId: 'lesson-01',
    title: 'Cổng khởi hành',
    topic: 'Địa phương em',
    completed: false,
    state: 'explored',
    completedMissionCount: 1,
    missionCount: 5,
    objectives: [],
    nextAction: 'practice',
  },
  {
    lessonId: 'lesson-02',
    title: 'Màu sắc quê mình',
    topic: 'Địa phương em',
    completed: false,
    state: 'not_started',
    completedMissionCount: 0,
    missionCount: 5,
    objectives: [],
    nextAction: 'explore',
  },
];

const topic: ProgressBoardTopic = { topic: 'Địa phương em', lessons };
const snapshot: ProgressMapTopicSnapshot = {
  topic: topic.topic,
  state: 'explored',
  lessonCount: 2,
  exploredLessonCount: 1,
  completedLessonCount: 0,
  independentLessonCount: 0,
  nextLessonId: 'lesson-01',
};

function Harness({ onOpenLesson }: { onOpenLesson: (lessonId: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState('lesson-01');
  const selectedLesson = topic.lessons.find((lesson) => lesson.lessonId === selectedLessonId) ?? null;
  return createElement(ProgressMapDrawer, {
    topic,
    topicSnapshot: snapshot,
    selectedLesson,
    expanded,
    detailsOpen,
    reducedMotion: false,
    onToggleExpanded: () => setExpanded((value) => !value),
    onToggleDetails: () => setDetailsOpen((value) => !value),
    onSelectLesson: setSelectedLessonId,
    onOpenLesson,
  });
}

describe('ProgressMapDrawer', () => {
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

  it('keeps the collapsed drawer short and offers one next action', () => {
    const onOpenLesson = vi.fn();
    act(() => root.render(createElement(Harness, { onOpenLesson })));

    expect(mount.querySelector('[data-progress-map-drawer]')).not.toBeNull();
    expect(mount.querySelector('[data-progress-map-drawer-cta]')).not.toBeNull();
    expect(mount.querySelector('[data-progress-lesson-strip]')).toBeNull();
    expect(mount.querySelector('[data-progress-lesson-detail]')).toBeNull();
    expect(mount.textContent).not.toMatch(/nhiệm vụ đã hoàn thành|objective|hoạt động đã luyện/i);

    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-drawer-cta]')?.click());
    expect(onOpenLesson).toHaveBeenCalledWith('lesson-01');
  });

  it('expands to a lesson strip and opens detail only after a separate action', () => {
    act(() => root.render(createElement(Harness, { onOpenLesson: vi.fn() })));

    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-drawer-expand]')?.click());
    expect(mount.querySelector('[data-progress-lesson-strip]')).not.toBeNull();
    expect(mount.querySelectorAll('[data-progress-strip-lesson]')).toHaveLength(2);
    expect(mount.querySelector('[data-progress-lesson-detail]')).toBeNull();

    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-drawer-details]')?.click());
    expect(mount.querySelector('[data-progress-lesson-detail]')).not.toBeNull();
    expect(mount.querySelector('[data-progress-map-drawer-back]')).not.toBeNull();

    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-map-drawer-back]')?.click());
    expect(mount.querySelector('[data-progress-lesson-detail]')).toBeNull();
  });

  it('disables the action when a completed topic has no next lesson', () => {
    const onOpenLesson = vi.fn();
    const completedTopic: ProgressBoardTopic = {
      topic: 'Địa phương em',
      lessons: lessons.map((lesson) => ({ ...lesson, completed: true, state: 'independent', nextAction: 'celebrate' })),
    };
    const completedSnapshot: ProgressMapTopicSnapshot = { ...snapshot, state: 'independent', completedLessonCount: 2, independentLessonCount: 2, nextLessonId: null };
    act(() => root.render(createElement(ProgressMapDrawer, {
      topic: completedTopic,
      topicSnapshot: completedSnapshot,
      selectedLesson: null,
      expanded: false,
      detailsOpen: false,
      reducedMotion: false,
      onToggleExpanded: vi.fn(),
      onToggleDetails: vi.fn(),
      onSelectLesson: vi.fn(),
      onOpenLesson,
    })));

    const cta = mount.querySelector<HTMLButtonElement>('[data-progress-map-drawer-cta]')!;
    expect(cta.disabled).toBe(true);
    act(() => cta.click());
    expect(onOpenLesson).not.toHaveBeenCalled();
  });
});

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProgressBoardLesson, ProgressBoardObjective, ProgressBoardSummary, ProgressBoardTopic } from '../../../shared/progress-board-contracts';
import { ProgressLessonCard } from './ProgressLessonCard';
import { ProgressLessonDetail } from './ProgressLessonDetail';
import { ProgressSummaryCard } from './ProgressSummaryCard';
import { ProgressTopicMap } from './ProgressTopicMap';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const objective = (state: ProgressBoardObjective['state'], objectiveId = `objective-${state}`): ProgressBoardObjective => ({
  objectiveId,
  label: `Mục tiêu ${state}`,
  state,
  practicedActivityCount: state === 'not_started' ? 0 : 1,
  independentActivityCount: state === 'independent' ? 1 : 0,
  nextAction: state === 'not_started' ? 'explore' : state === 'independent' ? 'celebrate' : state === 'practicing' ? 'review' : 'practice',
});

const lesson: ProgressBoardLesson = {
  lessonId: 'lesson-01',
  title: 'Địa phương em',
  topic: 'Mái nhà Việt Nam',
  completed: false,
  state: 'practicing',
  completedMissionCount: 2,
  missionCount: 5,
  objectives: [objective('not_started', 'objective-1'), objective('explored', 'objective-2'), objective('practicing', 'objective-3'), objective('independent', 'objective-4')],
  nextAction: 'practice',
};

const topics: ProgressBoardTopic[] = [{ topic: lesson.topic, lessons: [lesson] }];
const summary: ProgressBoardSummary = { exploredLessonCount: 1, completedLessonCount: 0, independentObjectiveCount: 1, nextLessonId: lesson.lessonId };
const stateLessons: ProgressBoardLesson[] = (['not_started', 'explored', 'practicing', 'independent'] as ProgressBoardLesson['state'][]).map((state, index) => ({
  ...lesson,
  lessonId: 'lesson-state-' + index,
  title: 'Chặng ' + state,
  state,
  objectives: [objective(state, 'objective-state-' + index)],
  nextAction: state === 'not_started' ? 'explore' : state === 'independent' ? 'celebrate' : state === 'practicing' ? 'review' : 'practice',
}));

describe('progress board presentational components', () => {
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

  it('renders personal summary, all progress states and an empty topic message without comparison copy', () => {
    act(() => root.render(createElement('div', null,
      createElement(ProgressSummaryCard, { summary, nextLesson: lesson, onOpenNext: vi.fn() }),
      createElement(ProgressTopicMap, { topics: [{ topic: lesson.topic, lessons: stateLessons }], selectedLessonId: lesson.lessonId, onSelectLesson: vi.fn(), reducedMotion: false }),
      createElement(ProgressTopicMap, { topics: [], selectedLessonId: null, onSelectLesson: vi.fn(), reducedMotion: true }),
    )));

    expect(mount.textContent).toContain('Mỗi bước nhỏ đều đáng tự hào');
    expect(mount.textContent).toContain('Chưa khám phá');
    expect(mount.textContent).toContain('Đã khám phá');
    expect(mount.textContent).toContain('Đang luyện tập');
    expect(mount.textContent).toContain('Tự làm được');
    expect(mount.textContent).toContain('Chưa có chặng nào để hiển thị');
    expect(mount.querySelector('[data-progress-topic-map][data-reduced-motion="true"]')).not.toBeNull();
    expect(mount.textContent).not.toMatch(/xếp hạng|điểm số|đứng đầu|hơn bạn|kém bạn|phần trăm/i);
  });

  it('passes the selected lesson and objective through action callbacks', () => {
    const onSelectLesson = vi.fn();
    const onAction = vi.fn();
    act(() => root.render(createElement('div', null,
      createElement(ProgressLessonCard, { lesson, selected: false, onSelect: onSelectLesson, reducedMotion: false }),
      createElement(ProgressLessonDetail, { lesson, onAction }),
    )));

    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-lesson="lesson-01"]')?.click());
    expect(onSelectLesson).toHaveBeenCalledWith(lesson.lessonId);

    act(() => mount.querySelector<HTMLButtonElement>('[data-progress-objective-action="objective-3"]')?.click());
    expect(onAction).toHaveBeenCalledWith(lesson, lesson.objectives[2]);
  });

  it('keeps reduced motion presentational and exposes accessible headings and names', () => {
    const onOpenNext = vi.fn();
    act(() => root.render(createElement(ProgressSummaryCard, { summary: { ...summary, nextLessonId: null }, nextLesson: null, onOpenNext })));

    expect(mount.querySelector('h2')).not.toBeNull();
    expect(mount.querySelector('[data-progress-summary]')).not.toBeNull();
    expect(mount.querySelector('[data-progress-summary-next]')).toBeNull();
    expect(mount.querySelector('button')).toBeNull();
  });
});

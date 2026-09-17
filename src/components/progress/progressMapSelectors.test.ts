import { describe, expect, it } from 'vitest';
import type { ProgressBoardLesson, ProgressBoardTopic } from '../../../shared/progress-board-contracts';
import { TOPICS } from '../../content/catalog';
import { getProgressMapTopicMeta } from './progressMapMeta';
import { summarizeProgressMapTopic } from './progressMapSelectors';

const lesson = (overrides: Partial<ProgressBoardLesson> = {}): ProgressBoardLesson => ({
  lessonId: 'lesson-01',
  title: 'Một chặng nhỏ',
  topic: 'Địa phương em',
  completed: false,
  state: 'not_started',
  completedMissionCount: 0,
  missionCount: 5,
  objectives: [],
  nextAction: 'explore',
  ...overrides,
});

describe('progress map topic presentation selectors', () => {
  it('provides metadata for all catalog topics and keeps the local topic unlocated', () => {
    expect(TOPICS).toHaveLength(6);
    expect(TOPICS.every((topic) => getProgressMapTopicMeta(topic))).toBe(true);
    expect(getProgressMapTopicMeta('Địa phương em')?.anchor).toBeNull();
    expect(getProgressMapTopicMeta('not-a-topic')).toBeNull();
  });

  it('summarizes a topic without changing lesson data', () => {
    const topic: ProgressBoardTopic = {
      topic: 'Địa phương em',
      lessons: [
        lesson({ lessonId: 'lesson-01', state: 'explored', completedMissionCount: 1 }),
        lesson({ lessonId: 'lesson-02', state: 'practicing', nextAction: 'practice' }),
        lesson({ lessonId: 'lesson-03', state: 'independent', completed: true, nextAction: 'celebrate' }),
      ],
    };

    expect(summarizeProgressMapTopic(topic, 'lesson-02')).toEqual({
      topic: 'Địa phương em',
      state: 'independent',
      lessonCount: 3,
      exploredLessonCount: 3,
      completedLessonCount: 1,
      independentLessonCount: 1,
      nextLessonId: 'lesson-02',
    });
  });

  it('returns a stable empty snapshot and uses an actionable lesson fallback', () => {
    expect(summarizeProgressMapTopic({ topic: 'Nam Bộ', lessons: [] }, 'missing')).toEqual({
      topic: 'Nam Bộ',
      state: 'not_started',
      lessonCount: 0,
      exploredLessonCount: 0,
      completedLessonCount: 0,
      independentLessonCount: 0,
      nextLessonId: null,
    });

    const topic: ProgressBoardTopic = {
      topic: 'Nam Bộ',
      lessons: [
        lesson({ lessonId: 'lesson-09', topic: 'Nam Bộ', state: 'independent', completed: true, nextAction: 'celebrate' }),
        lesson({ lessonId: 'lesson-10', topic: 'Nam Bộ', state: 'explored', nextAction: 'practice' }),
      ],
    };
    expect(summarizeProgressMapTopic(topic, 'other-topic-lesson').nextLessonId).toBe('lesson-10');
  });
});

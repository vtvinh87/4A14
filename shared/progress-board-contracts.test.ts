import { describe, expect, it } from 'vitest';
import {
  PROGRESS_BOARD_RULE_VERSION,
  PROGRESS_BOARD_SCHEMA_VERSION,
  type ProgressBoardContentIndex,
  type ProgressBoardData,
  type ProgressState,
} from './progress-board-contracts';
import { PROGRESS_BOARD_CONTENT_INDEX, validateProgressBoardContentIndex } from '../server/analytics/progressBoardContent';

describe('progress board contracts', () => {
  it('pins the personal-progress schema and state vocabulary', () => {
    const states: ProgressState[] = ['not_started', 'explored', 'practicing', 'independent'];
    expect(PROGRESS_BOARD_SCHEMA_VERSION).toBe(1);
    expect(PROGRESS_BOARD_RULE_VERSION).toBe('progress-board-v1');
    expect(states).toHaveLength(4);
  });

  it('validates the catalog-backed content index without competitive fields', () => {
    expect(validateProgressBoardContentIndex(PROGRESS_BOARD_CONTENT_INDEX)).toEqual({ ok: true });
    expect(PROGRESS_BOARD_CONTENT_INDEX.lessons).toHaveLength(29);
    expect(new Set(PROGRESS_BOARD_CONTENT_INDEX.lessons.map((lesson) => lesson.topic))).toHaveLength(6);
    const serialized = JSON.stringify(PROGRESS_BOARD_CONTENT_INDEX);
    expect(serialized).not.toContain('studentId');
    expect(serialized).not.toContain('score');
  });

  it('rejects duplicate and orphaned content references', () => {
    const invalid: ProgressBoardContentIndex = {
      ...PROGRESS_BOARD_CONTENT_INDEX,
      lessons: [
        ...PROGRESS_BOARD_CONTENT_INDEX.lessons,
        { ...PROGRESS_BOARD_CONTENT_INDEX.lessons[0]!, lessonId: 'lesson-duplicate' },
      ],
      objectives: [
        ...PROGRESS_BOARD_CONTENT_INDEX.objectives,
        { ...PROGRESS_BOARD_CONTENT_INDEX.objectives[0]!, objectiveId: 'orphan', lessonId: 'missing-lesson', activityIds: ['missing-activity'] },
      ],
    };
    expect(validateProgressBoardContentIndex(invalid).ok).toBe(false);
  });

  it('keeps the board DTO scoped to state and lesson data', () => {
    const data: ProgressBoardData = {
      schemaVersion: PROGRESS_BOARD_SCHEMA_VERSION,
      ruleVersion: PROGRESS_BOARD_RULE_VERSION,
      contentVersion: 'lesson-content-v1',
      generation: '3',
      generatedAt: '2026-09-17T00:00:00.000Z',
      lastSyncedAt: '2026-09-17T00:00:00.000Z',
      stale: false,
      summary: {
        exploredLessonCount: 1,
        completedLessonCount: 0,
        independentObjectiveCount: 0,
        nextLessonId: 'lesson-01',
      },
      topics: [],
      nextLessonId: 'lesson-01',
    };
    expect(data.generation).toBe('3');
    expect(Object.keys(data)).not.toContain('studentId');
  });
});

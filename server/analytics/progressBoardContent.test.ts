import { describe, expect, it } from 'vitest';
import { TOPICS } from '../../src/content/catalog';
import { PROGRESS_BOARD_CONTENT_INDEX, validateProgressBoardContentIndex } from './progressBoardContent';

describe('progress board content index', () => {
  it('covers the published lesson catalog and all six topics', () => {
    expect(PROGRESS_BOARD_CONTENT_INDEX.lessons).toHaveLength(29);
    expect([...new Set(PROGRESS_BOARD_CONTENT_INDEX.lessons.map((lesson) => lesson.topic))]).toEqual([...TOPICS]);
    expect(PROGRESS_BOARD_CONTENT_INDEX.lessons.every((lesson) => lesson.published)).toBe(true);
    expect(PROGRESS_BOARD_CONTENT_INDEX.objectives.length).toBeGreaterThan(0);
    expect(PROGRESS_BOARD_CONTENT_INDEX.objectives.every((objective) => objective.published && objective.activityIds.length > 0)).toBe(true);
  });

  it('keeps every lesson, objective and activity reference internally consistent', () => {
    expect(validateProgressBoardContentIndex(PROGRESS_BOARD_CONTENT_INDEX)).toEqual({ ok: true });
    const lessonIds = new Set(PROGRESS_BOARD_CONTENT_INDEX.lessons.map((lesson) => lesson.lessonId));
    for (const objective of PROGRESS_BOARD_CONTENT_INDEX.objectives) {
      expect(lessonIds.has(objective.lessonId)).toBe(true);
      expect(objective.minIndependentActivities).toBeGreaterThanOrEqual(1);
      expect(objective.minIndependentActivities).toBeLessThanOrEqual(objective.activityIds.length);
    }
  });

  it('rejects a manifest with a duplicate activity owner or invalid threshold', () => {
    const objective = PROGRESS_BOARD_CONTENT_INDEX.objectives[0]!;
    const invalid = {
      ...PROGRESS_BOARD_CONTENT_INDEX,
      objectives: [
        { ...objective, minIndependentActivities: objective.activityIds.length + 1 },
        { ...PROGRESS_BOARD_CONTENT_INDEX.objectives[1]!, activityIds: [objective.activityIds[0]!] },
      ],
    };
    const result = validateProgressBoardContentIndex(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toContain('minIndependentActivities');
  });
});

import { describe, it, expect } from 'vitest';
import { MVP_LESSON_PACKAGES } from '../content/packages';
import { isLessonUnlocked } from './lessonAccess';

describe('sequential lesson access', () => {
  it('opens only lesson one for a new learner', () => {
    expect(MVP_LESSON_PACKAGES.filter(l => isLessonUnlocked(l.id, []))).toEqual([MVP_LESSON_PACKAGES[0]]);
  });
  it('requires all five missions of the immediately preceding lesson', () => {
    for (let i = 1; i < MVP_LESSON_PACKAGES.length; i++) {
      const completed = MVP_LESSON_PACKAGES[i - 1].missions.map(m => m.id);
      expect(isLessonUnlocked(MVP_LESSON_PACKAGES[i].id, completed.slice(0, 4))).toBe(false);
      expect(isLessonUnlocked(MVP_LESSON_PACKAGES[i].id, completed)).toBe(true);
    }
  });
});

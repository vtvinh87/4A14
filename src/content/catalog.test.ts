import { describe, expect, it } from 'vitest';
import { MVP_LESSONS } from './catalog';

describe('lesson catalogue mission metadata', () => {
  it('advertises five missions for every playable lesson', () => {
    expect(MVP_LESSONS).toHaveLength(29);
    expect(MVP_LESSONS.every((lesson) => lesson.missions === 5)).toBe(true);
    expect(MVP_LESSONS.every((lesson) => lesson.sourceLabel === 'SGK Lịch sử và Địa lí 4')).toBe(true);
    expect(MVP_LESSONS.find((lesson) => lesson.id === 'lesson-01')?.missions).toBe(5);
    expect(MVP_LESSONS.find((lesson) => lesson.id === 'lesson-07')?.missions).toBe(5);
  });
});

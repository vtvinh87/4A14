import { describe, expect, it } from 'vitest';
import { MVP_LESSON_PACKAGES } from './packages';
import { evaluate } from '../game/evaluate';

describe('reviewed lesson packages', () => {
  it('maps the complete 29-lesson catalog into playable lesson ids', () => {
    expect(MVP_LESSON_PACKAGES).toHaveLength(29);
    expect(MVP_LESSON_PACKAGES.map((lesson) => lesson.id)).toEqual(
      Array.from({ length: 29 }, (_, index) => `lesson-${String(index + 1).padStart(2, '0')}`),
    );
    expect(MVP_LESSON_PACKAGES.every((lesson) => lesson.missions.length === 5)).toBe(true);
    expect(MVP_LESSON_PACKAGES.flatMap((lesson) => lesson.missions.flatMap((mission) => mission.activities))).toHaveLength(29 * 5 * 2);
  });

  it('keeps every discovery and activity source-linked and verified', () => {
    for (const lesson of MVP_LESSON_PACKAGES) {
      for (const mission of lesson.missions) {
        expect(mission.discovery.length).toBeGreaterThan(0);
        for (const discovery of mission.discovery) expect(['sgk-lsdl4-sample', 'vbt-lsdl4-2026']).toContain(discovery.source.sourceId);
        for (const activity of mission.activities) {
          expect(activity.reviewStatus).toBe('verified');
          expect(['sgk-lsdl4-sample', 'vbt-lsdl4-2026']).toContain(activity.source.sourceId);
          expect(activity.sourceRefs?.length).toBeGreaterThan(0);
          expect(activity.hint).toBeTruthy();
          expect(activity.explanation).toBeTruthy();
        }
      }
    }
  });

  it('keeps the two previously reviewed lesson contracts intact', () => {
    const lessonOne = MVP_LESSON_PACKAGES.find((lesson) => lesson.id === 'lesson-01')!;
    expect(lessonOne.missions[2].discovery[0].text).not.toContain('Luôn hiển thị');
    const firstChoice = lessonOne.missions[0].activities[0];
    expect(firstChoice.type).toBe('choice');
    if (firstChoice.type === 'choice') expect(firstChoice.options.map((option) => option.text)).not.toContain('Lược đồ');

    const lessonSeven = MVP_LESSON_PACKAGES.find((lesson) => lesson.id === 'lesson-07')!;
    expect(lessonOne.missions).toHaveLength(5);
    expect(lessonSeven.missions).toHaveLength(5);
    const legendDiscovery = lessonSeven.missions[2].discovery.map((item) => item.text).join(' ');
    expect(legendDiscovery.match(/Theo truyền thuyết/g)?.length).toBe(2);
  });

  it('has a correct, evaluable response for every activity in every lesson', () => {
    for (const lesson of MVP_LESSON_PACKAGES) {
      for (const mission of lesson.missions) {
        for (const activity of mission.activities) {
          const response = activity.type === 'choice'
            ? { type: 'choice' as const, optionId: activity.correctId }
            : activity.type === 'match'
              ? { type: 'match' as const, pairs: activity.pairs.map((pair) => [pair.leftId, pair.rightId] as [string, string]) }
              : activity.type === 'order'
                ? { type: 'order' as const, ids: activity.correctOrder }
                : { type: 'select' as const, optionIds: activity.correctIds };
          expect(evaluate(activity, response).correct, `${lesson.id}/${activity.id}`).toBe(true);
        }
      }
    }
  });

  it('includes a multi-select clue hunt in every generated lesson', () => {
    for (const lesson of MVP_LESSON_PACKAGES) {
      const selectActivities = lesson.missions.flatMap((mission) => mission.activities).filter((activity) => activity.type === 'select');
      expect(selectActivities.length, `${lesson.id} should include a select puzzle`).toBeGreaterThan(0);
      expect(JSON.stringify(selectActivities)).not.toContain('Manh mối của chặng khác');
      expect(lesson.missions.flatMap((mission) => mission.discovery).map((item) => item.text).join(' ')).not.toContain('Luôn hiển thị');
    }
  });
});

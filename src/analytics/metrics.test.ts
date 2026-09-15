import { describe, expect, it } from 'vitest';
import { createDefaultProgress } from '../progress/storage';
import { getDashboardMetrics, getSupportSuggestions } from './metrics';
import type { Progress } from '../content/types';

function fixtureProgress(): Progress {
  const base = createDefaultProgress();
  return {
    ...base,
    session: {
      id: 'run-1',
      lessonId: 'lesson-01',
      lessonVersion: 1,
      missionIndex: 0,
      activityIndex: 1,
      stage: 'answer',
      hintUsed: false,
      lastEvaluation: null,
      attempts: [
        { id: 'a-1', activityId: 'lesson-01-m1-a1', response: { type: 'choice', optionId: 'map' }, hintUsed: false, correct: true, time: '2026-09-13T01:00:00.000Z' },
        { id: 'a-2', activityId: 'lesson-01-m1-a2', response: { type: 'match', pairs: [['map', 'map-detail'], ['timeline', 'timeline-detail']] }, hintUsed: true, correct: false, time: '2026-09-13T01:01:00.000Z' },
        { id: 'a-3', activityId: 'lesson-01-m1-a2', response: { type: 'match', pairs: [['map', 'map-detail'], ['timeline', 'timeline-detail']] }, hintUsed: false, correct: true, time: '2026-09-13T01:02:00.000Z' },
      ],
    },
    updatedAt: '2026-09-13T01:02:00.000Z',
  };
}

describe('dashboard metrics', () => {
  it('counts unique activities for first attempt metrics and keeps retries separate', () => {
    const metrics = getDashboardMetrics(fixtureProgress(), 'all');
    expect(metrics.activitySample).toBe(2);
    expect(metrics.firstAttemptCorrect).toBe(1);
    expect(metrics.firstAttemptAccuracy).toBe(0.5);
    expect(metrics.hintActivities).toBe(1);
    expect(metrics.totalAttempts).toBe(3);
    expect(metrics.retryAttempts).toBe(1);
  });

  it('returns not-enough-data before making a learning judgement', () => {
    const suggestions = getSupportSuggestions(fixtureProgress(), 'all');
    expect(suggestions.some((item) => item.kind === 'insufficient')).toBe(true);
    expect(suggestions.some((item) => item.kind === 'strength')).toBe(false);
  });

  it('does not count hidden or idle gaps as active minutes', () => {
    const progress = fixtureProgress();
    progress.session = {
      ...progress.session!,
      attempts: progress.session!.attempts.map((attempt, index) => ({
        ...attempt,
        time: index === 0 ? '2026-09-13T01:00:00.000Z' : index === 1 ? '2026-09-13T01:01:00.000Z' : '2026-09-13T03:00:00.000Z',
      })),
    };
    expect(getDashboardMetrics(progress, 'all').estimatedMinutes).toBe(1);
  });
});

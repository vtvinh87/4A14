import { describe, expect, it } from 'vitest';
import { challengeTarget, challengeWeekBounds, classContribution, localChallengeDate, selectDailyQuestions, type RoundCandidate } from './roundRules';

describe('challenge date and target rules', () => {
  it('uses the Vietnam date boundary at midnight', () => {
    expect(localChallengeDate(new Date('2026-09-17T16:59:59.999Z'))).toBe('2026-09-17');
    expect(localChallengeDate(new Date('2026-09-17T17:00:00.000Z'))).toBe('2026-09-18');
  });

  it('returns the Monday through Sunday bounds for the local week', () => {
    expect(challengeWeekBounds(new Date('2026-09-20T16:59:59.999Z'))).toEqual({ start: '2026-09-14', end: '2026-09-20' });
    expect(challengeWeekBounds(new Date('2026-09-20T17:00:00.000Z'))).toEqual({ start: '2026-09-21', end: '2026-09-27' });
  });

  it('clamps the shared daily target between ten and sixty', () => {
    expect(challengeTarget(-4)).toBe(10);
    expect(challengeTarget(0)).toBe(10);
    expect(challengeTarget(1)).toBe(10);
    expect(challengeTarget(8)).toBe(16);
    expect(challengeTarget(100)).toBe(60);
  });

  it('counts only a correct scored attempt as class contribution', () => {
    expect(classContribution({ isCorrect: true, isPractice: false, isVoided: false })).toBe(1);
    expect(classContribution({ isCorrect: false, isPractice: false, isVoided: false })).toBe(0);
    expect(classContribution({ isCorrect: true, isPractice: true, isVoided: false })).toBe(0);
    expect(classContribution({ isCorrect: true, isPractice: false, isVoided: true })).toBe(0);
  });
});

describe('daily question selection', () => {
  const candidates: RoundCandidate[] = [
    { questionId: 'q-old', authorId: 'student-a', approvedAt: '2026-09-01T00:00:00.000Z', lastFeaturedAt: '2026-09-10T00:00:00.000Z', recentRoundDates: [] },
    { questionId: 'q-new', authorId: 'student-a', approvedAt: '2026-09-15T00:00:00.000Z', lastFeaturedAt: null, recentRoundDates: [] },
    { questionId: 'q-b', authorId: 'student-b', approvedAt: '2026-09-02T00:00:00.000Z', lastFeaturedAt: null, recentRoundDates: [] },
    { questionId: 'q-c', authorId: 'student-c', approvedAt: '2026-09-03T00:00:00.000Z', lastFeaturedAt: '2026-09-11T00:00:00.000Z', recentRoundDates: ['2026-09-15'] },
    { questionId: 'q-d', authorId: 'student-d', approvedAt: '2026-09-04T00:00:00.000Z', lastFeaturedAt: '2026-09-12T00:00:00.000Z', recentRoundDates: [] },
    { questionId: 'q-e', authorId: 'student-e', approvedAt: '2026-09-05T00:00:00.000Z', lastFeaturedAt: '2026-09-13T00:00:00.000Z', recentRoundDates: [] },
    { questionId: 'q-f', authorId: 'student-f', approvedAt: '2026-09-06T00:00:00.000Z', lastFeaturedAt: '2026-09-14T00:00:00.000Z', recentRoundDates: [] },
  ];

  it('is deterministic for the same day and caps at five unique authors', () => {
    const first = selectDailyQuestions(candidates, '2026-09-18');
    const second = selectDailyQuestions(candidates, '2026-09-18');
    expect(first).toEqual(second);
    expect(first).toHaveLength(5);
    expect(new Set(first.map((item) => item.authorId)).size).toBe(first.length);
    expect(first.map((item) => item.questionId)).not.toContain('q-c');
  });

  it('uses the same deterministic fallback when recent alternatives are insufficient', () => {
    const recentOnly = candidates.slice(1, 3).map((candidate) => ({ ...candidate, recentRoundDates: ['2026-09-17'] }));
    const selected = selectDailyQuestions(recentOnly, '2026-09-18', 5);
    expect(selected.map((item) => item.questionId)).toEqual(selectDailyQuestions(recentOnly, '2026-09-18', 5).map((item) => item.questionId));
    expect(selected).toHaveLength(2);
  });

  it('honors an explicit lower limit and never mutates candidates', () => {
    const snapshot = structuredClone(candidates);
    expect(selectDailyQuestions(candidates, '2026-09-18', 2)).toHaveLength(2);
    expect(candidates).toEqual(snapshot);
  });
});

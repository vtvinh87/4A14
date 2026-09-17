import { calendarDateInTimeZone } from '../../shared/account-contracts.ts';
import { CHALLENGE_ROUND_QUESTION_LIMIT } from '../../shared/challenge-contracts.ts';

export const CHALLENGE_TIME_ZONE = 'Asia/Ho_Chi_Minh' as const;
export type RoundCandidate = {
  questionId: string;
  authorId: string;
  approvedAt: string;
  lastFeaturedAt: string | null;
  recentRoundDates: readonly string[];
};

function dateAtUtc(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: string, amount: number): string {
  const value = dateAtUtc(date);
  value.setUTCDate(value.getUTCDate() + amount);
  return dateString(value);
}

export function localChallengeDate(now: Date): string {
  return calendarDateInTimeZone(now, CHALLENGE_TIME_ZONE);
}

export function challengeWeekBounds(now: Date): { start: string; end: string } {
  const localDate = localChallengeDate(now);
  const day = dateAtUtc(localDate).getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const start = addDays(localDate, -daysSinceMonday);
  return { start, end: addDays(start, 6) };
}

export function challengeTarget(activeStudentCount: number): number {
  const count = Number.isFinite(activeStudentCount) ? Math.max(0, Math.floor(activeStudentCount)) : 0;
  return Math.min(60, Math.max(10, count * 2));
}

export function classContribution(attempt: { isCorrect: boolean; isPractice: boolean; isVoided: boolean }): 0 | 1 {
  return attempt.isCorrect && !attempt.isPractice && !attempt.isVoided ? 1 : 0;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function featuredTime(candidate: RoundCandidate): number {
  return candidate.lastFeaturedAt ? Date.parse(candidate.lastFeaturedAt) : Number.NEGATIVE_INFINITY;
}

function hasRecentFeature(candidate: RoundCandidate, roundDate: string): boolean {
  return candidate.recentRoundDates.some((date) => date >= addDays(roundDate, -7) && date <= roundDate);
}

export function selectDailyQuestions(
  candidates: readonly RoundCandidate[],
  roundDate: string,
  limit: number = CHALLENGE_ROUND_QUESTION_LIMIT,
): readonly RoundCandidate[] {
  const safeLimit = Math.max(0, Math.min(CHALLENGE_ROUND_QUESTION_LIMIT, Number.isFinite(limit) ? Math.floor(limit) : CHALLENGE_ROUND_QUESTION_LIMIT));
  const ordered = [...candidates].sort((left, right) => {
    const recentDifference = Number(hasRecentFeature(left, roundDate)) - Number(hasRecentFeature(right, roundDate));
    if (recentDifference !== 0) return recentDifference;
    const featuredDifference = Number(Boolean(left.lastFeaturedAt)) - Number(Boolean(right.lastFeaturedAt));
    if (featuredDifference !== 0) return featuredDifference;
    const lastFeaturedDifference = featuredTime(left) - featuredTime(right);
    if (lastFeaturedDifference !== 0) return lastFeaturedDifference;
    const approvedDifference = Date.parse(left.approvedAt) - Date.parse(right.approvedAt);
    if (approvedDifference !== 0) return approvedDifference;
    const seededDifference = stableHash(`${roundDate}:${left.questionId}`) - stableHash(`${roundDate}:${right.questionId}`);
    return seededDifference || left.questionId.localeCompare(right.questionId);
  });
  const selected: RoundCandidate[] = [];
  const authors = new Set<string>();
  for (const candidate of ordered) {
    if (authors.has(candidate.authorId)) continue;
    selected.push(candidate);
    authors.add(candidate.authorId);
    if (selected.length >= safeLimit) break;
  }
  return selected;
}

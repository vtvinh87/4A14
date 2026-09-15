import { getLessonSummary, MVP_LESSONS } from '../../src/content/catalog.ts';
import { getLessonPackage } from '../../src/content/packages.ts';
import { isLessonUnlocked } from '../../src/game/lessonAccess.ts';
import { getLessonRewardState } from '../../src/game/rewards.ts';
import type { DashboardActivity, DashboardDataQuality, DashboardLessonStatus, DashboardMetrics, DashboardRange, ParentDashboardData } from '../../shared/dashboard-contracts.ts';
import { DASHBOARD_RULE_VERSION } from '../../shared/dashboard-contracts.ts';
import { estimateInteractiveSeconds } from '../../src/analytics/activityTime.ts';
import type { LearningEventRecord, LearningSnapshotRecord } from '../learning/types.ts';
import { buildRecommendations } from './recommendations.ts';

const TOTAL_MISSIONS = MVP_LESSONS.length * 5;

function timeValue(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function inRange(time: string, anchor: number, range: DashboardRange): boolean {
  const timestamp = timeValue(time);
  if (timestamp === null || timestamp > anchor) return false;
  if (range === 'all') return true;
  const days = range === '7d' ? 7 : 30;
  return timestamp >= anchor - days * 24 * 60 * 60 * 1000;
}

function dateKeyInVietnam(time: string): string | null {
  if (timeValue(time) === null) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(time));
}

function keyOf(event: LearningEventRecord): string | null {
  return event.activityId ? `${event.lessonId}:${event.lessonVersion}:${event.activityId}` : null;
}

function collectActivities(events: LearningEventRecord[]): DashboardActivity[] {
  const sorted = [...events].filter((event) => event.type === 'answer_submitted' && event.activityId && typeof event.correct === 'boolean').sort((a, b) => (timeValue(a.receivedAt) ?? 0) - (timeValue(b.receivedAt) ?? 0));
  const byKey = new Map<string, DashboardActivity>();
  for (const event of sorted) {
    const key = keyOf(event);
    if (!key) continue;
    const current = byKey.get(key);
    const topic = getLessonSummary(event.lessonId as Parameters<typeof getLessonSummary>[0]).topic;
    if (!current) {
      byKey.set(key, { key, activityId: event.activityId!, lessonId: event.lessonId as Parameters<typeof getLessonSummary>[0], lessonVersion: event.lessonVersion, topic, attempts: 1, firstAttemptCorrect: event.correct!, firstAttemptHintUsed: event.hintUsed, hintUsed: event.hintUsed, eventIds: [event.eventId], firstAttemptAt: event.receivedAt, retryCount: 0 });
    } else {
      current.attempts += 1;
      current.retryCount = current.attempts - 1;
      current.hintUsed = current.hintUsed || event.hintUsed;
      current.eventIds.push(event.eventId);
    }
  }
  return [...byKey.values()];
}

function lessonStatuses(snapshot: LearningSnapshotRecord, events: LearningEventRecord[]): DashboardLessonStatus[] {
  const completed = new Set(snapshot.progress.completedMissions);
  return MVP_LESSONS.map((summary) => {
    const lesson = getLessonPackage(summary.id);
    const state = getLessonRewardState(snapshot.progress, summary.id);
    const touched = events.some((event) => event.lessonId === summary.id && event.type !== 'heartbeat');
    const status: DashboardLessonStatus['status'] = state.stamped || state.completed === state.total ? 'complete' : touched || snapshot.progress.session?.lessonId === summary.id ? 'in-progress' : isLessonUnlocked(summary.id, [...completed]) ? 'open' : 'locked';
    return { lessonId: summary.id, title: summary.title, topic: summary.topic, status, completedMissions: state.completed, totalMissions: lesson.missions.length };
  });
}

export function buildDashboardData(snapshot: LearningSnapshotRecord, allEvents: LearningEventRecord[], range: DashboardRange, generatedAt: string): ParentDashboardData {
  const anchor = timeValue(generatedAt) ?? Date.now();
  const generationEvents = allEvents.filter((event) => event.studentId === snapshot.studentId && event.generation === snapshot.generation);
  const rangedEvents = generationEvents.filter((event) => inRange(event.receivedAt, anchor, range));
  const activities = collectActivities(rangedEvents);
  const answers = rangedEvents.filter((event) => event.type === 'answer_submitted' && typeof event.correct === 'boolean');
  const firstAttemptCorrect = activities.filter((activity) => activity.firstAttemptCorrect).length;
  const hintActivities = activities.filter((activity) => activity.hintUsed).length;
  const learningEvents = rangedEvents.filter((event) => event.type === 'discovery_done' || event.type === 'hint_used' || event.type === 'answer_submitted' || event.type === 'next');
  const activeDays = new Set(learningEvents.map((event) => dateKeyInVietnam(event.receivedAt)).filter((value): value is string => Boolean(value))).size;
  const heartbeats = rangedEvents.filter((event) => event.type === 'heartbeat');
  const interactiveSeconds = estimateInteractiveSeconds(heartbeats);
  const dataQuality: DashboardDataQuality = activities.length === 0 ? 'none' : activities.length < 5 ? 'limited' : 'ready';
  const lastActivityAt = [...learningEvents].sort((a, b) => (timeValue(b.receivedAt) ?? 0) - (timeValue(a.receivedAt) ?? 0))[0]?.receivedAt ?? null;
  const metrics: DashboardMetrics = {
    range,
    activitySample: activities.length,
    totalAttempts: answers.length,
    retryAttempts: Math.max(0, answers.length - activities.length),
    firstAttemptCorrect,
    firstAttemptAccuracy: activities.length ? firstAttemptCorrect / activities.length : null,
    hintActivities,
    hintRate: activities.length ? hintActivities / activities.length : null,
    activeDays,
    estimatedMinutes: interactiveSeconds > 0 ? Math.max(1, Math.ceil(interactiveSeconds / 60)) : 0,
    completedLessons: MVP_LESSONS.filter((lesson) => getLessonRewardState(snapshot.progress, lesson.id).stamped).length,
    totalLessons: MVP_LESSONS.length,
    completedMissions: new Set(snapshot.progress.completedMissions).size,
    totalMissions: TOTAL_MISSIONS,
    stamps: new Set(snapshot.progress.stamps).size,
    totalStamps: MVP_LESSONS.length,
    lastActivityAt,
    dataQuality,
  };
  return { schemaVersion: 1, ruleVersion: DASHBOARD_RULE_VERSION, studentId: snapshot.studentId, range, generatedAt, lastSyncedAt: snapshot.updatedAt, snapshot, metrics, activities, lessons: lessonStatuses(snapshot, generationEvents), suggestions: buildRecommendations(activities, range, generatedAt), events: rangedEvents };
}

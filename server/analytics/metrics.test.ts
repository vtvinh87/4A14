import { describe, expect, it } from 'vitest';
import { getLessonPackage } from '../../src/content/packages';
import { createEmptySnapshot } from '../learning/engine';
import type { LearningEventRecord } from '../learning/types';
import { buildDashboardData } from './metrics';

const studentId = '11111111-1111-4111-8111-111111111111';
const lesson = getLessonPackage('lesson-01');
const activities = lesson.missions.flatMap((mission) => mission.activities);

function uuid(seed: number): string {
  return `${seed.toString(16).padStart(8, '0')}-1111-4111-8111-${seed.toString(16).padStart(12, '0')}`;
}

function answer(index: number, correct: boolean, extra: Partial<LearningEventRecord> = {}): LearningEventRecord {
  const activity = activities[index % activities.length];
  const time = new Date(Date.UTC(2026, 8, 13, 1, index, 0)).toISOString();
  return {
    eventId: uuid(index + 1), runId: uuid(index + 101), studentId, sequence: index + 1, type: 'answer_submitted', lessonId: 'lesson-01', lessonVersion: 1, deviceId: 'tablet-a', activityId: activity.id, generation: 0, receivedAt: time, hintUsed: false, correct, visible: false, interactive: false, ...extra,
  };
}

describe('server dashboard metrics', () => {
  it('counts ten activities with retries separately and emits a sourced strength rule', () => {
    const snapshot = createEmptySnapshot(studentId, '2026-09-13T02:00:00.000Z');
    const events = Array.from({ length: 10 }, (_, index) => answer(index, index < 8));
    events.push(answer(0, true, { eventId: uuid(999), sequence: 99, receivedAt: '2026-09-13T01:20:00.000Z' }));
    const dashboard = buildDashboardData(snapshot, events, 'all', '2026-09-13T02:00:00.000Z');
    expect(dashboard.metrics).toMatchObject({ activitySample: 10, totalAttempts: 11, retryAttempts: 1, firstAttemptCorrect: 8, firstAttemptAccuracy: 0.8, hintActivities: 0, dataQuality: 'ready' });
    expect(dashboard.suggestions.some((suggestion) => suggestion.kind === 'strength' && suggestion.provenance.ruleVersion === 'dashboard-rules-v1')).toBe(true);
  });

  it('keeps four activities in the limited-data state and ignores old generations and idle time', () => {
    const snapshot = { ...createEmptySnapshot(studentId, '2026-09-13T03:00:00.000Z'), generation: 1 };
    const events = Array.from({ length: 4 }, (_, index) => answer(index, true));
    events.push({ ...answer(8, true, { eventId: uuid(800), generation: 0 }), type: 'heartbeat', activityId: undefined, visible: true, interactive: true, receivedAt: '2026-09-13T01:00:00.000Z' });
    events.push({ ...answer(8, true, { eventId: uuid(801), generation: 1 }), type: 'heartbeat', activityId: undefined, visible: true, interactive: true, receivedAt: '2026-09-13T03:00:00.000Z' });
    events.push({ ...answer(8, true, { eventId: uuid(802), generation: 1 }), type: 'heartbeat', activityId: undefined, visible: true, interactive: true, receivedAt: '2026-09-13T03:00:15.000Z' });
    events.push({ ...answer(8, true, { eventId: uuid(803), generation: 1 }), type: 'heartbeat', activityId: undefined, visible: false, interactive: true, receivedAt: '2026-09-13T03:00:30.000Z' });
    const dashboard = buildDashboardData(snapshot, events, 'all', '2026-09-13T04:00:00.000Z');
    expect(dashboard.metrics).toMatchObject({ activitySample: 0, totalAttempts: 0, estimatedMinutes: 1, dataQuality: 'none' });
    expect(dashboard.suggestions[0]?.kind).toBe('insufficient');
  });

  it('does not make a topic judgement when only that topic has fewer than five activities', () => {
    const snapshot = createEmptySnapshot(studentId, '2026-09-13T02:00:00.000Z');
    const otherLesson = getLessonPackage('lesson-04');
    const events = Array.from({ length: 4 }, (_, index) => answer(index, true));
    events.push(answer(4, true, { lessonId: 'lesson-04', activityId: otherLesson.missions[0]!.activities[0]!.id, eventId: uuid(1200), sequence: 1200 }));
    const dashboard = buildDashboardData(snapshot, events, 'all', '2026-09-13T02:00:00.000Z');
    expect(dashboard.metrics.activitySample).toBe(5);
    expect(dashboard.suggestions.some((suggestion) => suggestion.kind === 'insufficient' && suggestion.evidence.includes('4/5'))).toBe(true);
    expect(dashboard.suggestions.some((suggestion) => suggestion.kind === 'strength')).toBe(false);
  });
});

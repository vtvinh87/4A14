import { describe, expect, it } from 'vitest';
import { CONTENT_VERSION } from '../../shared/learning-contracts';
import type { ProgressBoardContentIndex } from '../../shared/progress-board-contracts';
import { createEmptySnapshot } from '../learning/engine';
import type { LearningEventRecord } from '../learning/types';
import { buildProgressBoardData } from './progressBoard';

const studentId = '11111111-1111-4111-8111-111111111111';
const generatedAt = '2026-09-17T10:00:00.000Z';

const contentIndex: ProgressBoardContentIndex = {
  schemaVersion: 1,
  ruleVersion: 'progress-board-v1',
  contentVersion: CONTENT_VERSION,
  generatedAt,
  lessons: [
    { lessonId: 'lesson-01', lessonVersion: 1, title: 'Bài một', topic: 'Địa phương em', missionIds: ['lesson-01-m1'], objectiveIds: ['objective-1', 'objective-2'], published: true },
    { lessonId: 'lesson-02', lessonVersion: 1, title: 'Bài hai', topic: 'Địa phương em', missionIds: ['lesson-02-m1'], objectiveIds: ['objective-3'], published: true },
  ],
  objectives: [
    { objectiveId: 'objective-1', lessonId: 'lesson-01', label: 'Mục tiêu một', activityIds: ['activity-1'], minIndependentActivities: 1, published: true },
    { objectiveId: 'objective-2', lessonId: 'lesson-01', label: 'Mục tiêu hai', activityIds: ['activity-2', 'activity-3'], minIndependentActivities: 2, published: true },
    { objectiveId: 'objective-3', lessonId: 'lesson-02', label: 'Mục tiêu ba', activityIds: ['activity-4'], minIndependentActivities: 1, published: true },
  ],
};

function uuid(number: number): string {
  return number.toString(16).padStart(8, '0') + '-1111-4111-8111-111111111111';
}

function snapshot(overrides: Partial<ReturnType<typeof createEmptySnapshot>> = {}) {
  return { ...createEmptySnapshot(studentId, '2026-09-17T09:00:00.000Z'), ...overrides };
}

function event(number: number, type: LearningEventRecord['type'], overrides: Partial<LearningEventRecord> = {}): LearningEventRecord {
  return {
    eventId: uuid(number),
    runId: uuid(100),
    sequence: number,
    type,
    lessonId: 'lesson-01',
    lessonVersion: 1,
    deviceId: 'tablet-a',
    generation: 0,
    studentId,
    receivedAt: '2026-09-17T09:' + String(number).padStart(2, '0') + ':00.000Z',
    hintUsed: false,
    correct: null,
    visible: true,
    interactive: true,
    ...overrides,
  };
}

function board(events: LearningEventRecord[] = [], currentSnapshot = snapshot()) {
  return buildProgressBoardData(currentSnapshot, events, contentIndex, generatedAt);
}

function lesson(data: ReturnType<typeof board>, lessonId: string) {
  return data.topics.flatMap((topic) => topic.lessons).find((candidate) => candidate.lessonId === lessonId)!;
}

function objective(data: ReturnType<typeof board>, lessonId: string, objectiveId: string) {
  return lesson(data, lessonId).objectives.find((candidate) => candidate.objectiveId === objectiveId)!;
}

describe('progress board calculator', () => {
  it('starts every published lesson and objective without progress', () => {
    const data = board();
    expect(data).toMatchObject({
      schemaVersion: 1,
      ruleVersion: 'progress-board-v1',
      contentVersion: CONTENT_VERSION,
      generation: '0',
      generatedAt,
      lastSyncedAt: '2026-09-17T09:00:00.000Z',
      stale: false,
      summary: { exploredLessonCount: 0, completedLessonCount: 0, independentObjectiveCount: 0, nextLessonId: 'lesson-01' },
    });
    expect(lesson(data, 'lesson-01').state).toBe('not_started');
    expect(objective(data, 'lesson-01', 'objective-1').nextAction).toBe('explore');
  });

  it('turns discovery into explored state and suggests practice', () => {
    const data = board([event(1, 'discovery_done')]);
    expect(lesson(data, 'lesson-01').state).toBe('explored');
    expect(objective(data, 'lesson-01', 'objective-1')).toMatchObject({ state: 'explored', practicedActivityCount: 0, independentActivityCount: 0, nextAction: 'practice' });
    expect(data.summary.exploredLessonCount).toBe(1);
  });

  it('counts a wrong answer as practice without independent evidence', () => {
    const data = board([event(1, 'answer_submitted', { activityId: 'activity-2', correct: false })]);
    expect(objective(data, 'lesson-01', 'objective-2')).toMatchObject({ state: 'practicing', practicedActivityCount: 1, independentActivityCount: 0, nextAction: 'practice' });
    expect(lesson(data, 'lesson-01').state).toBe('practicing');
  });

  it('requires a correct answer without a hint before one-activity independence', () => {
    const hinted = board([
      event(1, 'hint_used'),
      event(2, 'answer_submitted', { activityId: 'activity-1', correct: true, hintUsed: true }),
    ]);
    expect(objective(hinted, 'lesson-01', 'objective-1')).toMatchObject({ state: 'practicing', practicedActivityCount: 1, independentActivityCount: 0 });

    const independent = board([event(1, 'answer_submitted', { activityId: 'activity-1', correct: true })]);
    expect(objective(independent, 'lesson-01', 'objective-1')).toMatchObject({ state: 'independent', practicedActivityCount: 1, independentActivityCount: 1, nextAction: 'celebrate' });
  });

  it('uses hint evidence on the answer event without leaking it to later answers in the run', () => {
    const data = board([
      event(1, 'hint_used'),
      event(2, 'answer_submitted', { activityId: 'activity-1', correct: true, hintUsed: true }),
      event(3, 'answer_submitted', { activityId: 'activity-2', correct: true, hintUsed: false }),
    ]);
    expect(objective(data, 'lesson-01', 'objective-1')).toMatchObject({ practicedActivityCount: 1, independentActivityCount: 0, state: 'practicing' });
    expect(objective(data, 'lesson-01', 'objective-2')).toMatchObject({ practicedActivityCount: 1, independentActivityCount: 1, state: 'practicing' });
  });

  it('requires two distinct correct activities for a multi-activity objective', () => {
    const first = board([event(1, 'answer_submitted', { activityId: 'activity-2', correct: true })]);
    expect(objective(first, 'lesson-01', 'objective-2')).toMatchObject({ state: 'practicing', practicedActivityCount: 1, independentActivityCount: 1 });

    const complete = board([
      event(1, 'answer_submitted', { activityId: 'activity-2', correct: true }),
      event(2, 'answer_submitted', { activityId: 'activity-3', correct: true }),
    ]);
    expect(objective(complete, 'lesson-01', 'objective-2')).toMatchObject({ state: 'independent', practicedActivityCount: 2, independentActivityCount: 2, nextAction: 'celebrate' });
  });

  it('deduplicates retried activity evidence and keeps lesson completion separate', () => {
    const completedSnapshot = snapshot({ progress: { ...snapshot().progress, completedMissions: ['lesson-01-m1'] } });
    const data = board([
      event(1, 'discovery_done'),
      event(2, 'answer_submitted', { activityId: 'activity-1', correct: true }),
      event(3, 'answer_submitted', { activityId: 'activity-1', correct: true }),
      event(4, 'answer_submitted', { activityId: 'activity-2', correct: true }),
      event(5, 'answer_submitted', { activityId: 'activity-3', correct: true }),
    ], completedSnapshot);
    expect(lesson(data, 'lesson-01')).toMatchObject({ completed: true, state: 'independent', completedMissionCount: 1, missionCount: 1, nextAction: 'celebrate' });
    expect(data.summary).toMatchObject({ completedLessonCount: 1, independentObjectiveCount: 2, nextLessonId: 'lesson-02' });
    expect(objective(data, 'lesson-01', 'objective-1').practicedActivityCount).toBe(1);
  });

  it('ignores old generations, old lesson versions, unknown activities and non-progress events', () => {
    const data = board([
      event(1, 'run_started'),
      event(2, 'heartbeat', { activityId: 'activity-1' }),
      event(3, 'answer_submitted', { activityId: 'activity-1', correct: true, generation: 1 }),
      event(4, 'answer_submitted', { activityId: 'activity-1', correct: true, lessonVersion: 2 }),
      event(5, 'answer_submitted', { activityId: 'missing', correct: true }),
      event(6, 'answer_submitted', { activityId: 'activity-1', correct: true, studentId: '22222222-2222-4222-8222-222222222222' }),
    ]);
    expect(data.summary.independentObjectiveCount).toBe(0);
    expect(lesson(data, 'lesson-01').state).toBe('not_started');
  });

  it('uses the same result when event input order changes', () => {
    const events = [
      event(1, 'answer_submitted', { activityId: 'activity-3', correct: true, receivedAt: '2026-09-17T09:02:00.000Z' }),
      event(2, 'discovery_done', { receivedAt: '2026-09-17T09:01:00.000Z' }),
      event(3, 'answer_submitted', { activityId: 'activity-2', correct: true, receivedAt: '2026-09-17T09:03:00.000Z' }),
    ];
    expect(board(events)).toEqual(board([...events].reverse()));
  });

  it('does not include raw events or private identity in the DTO', () => {
    const data = board([event(1, 'answer_submitted', { activityId: 'activity-1', correct: true, response: { type: 'choice', optionId: 'private-answer' } })]);
    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain(studentId);
    expect(serialized).not.toContain('private-answer');
    expect(serialized).not.toContain('eventId');
  });
});

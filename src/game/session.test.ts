import { describe, expect, it } from 'vitest';
import { createSession, getCurrentActivity, transition } from './session';
import type { Lesson, Select, SourceRef } from '../content/types';

const source: SourceRef = {
  sourceId: 'sgk-lsdl4-sample',
  pdfPage: 1,
  printedPage: 1,
  locator: 'Test fixture',
};

const lesson: Lesson = {
  id: 'lesson-01',
  version: 1,
  title: 'Bài kiểm thử',
  objectives: [{ id: 'objective-1', text: 'Mục tiêu kiểm thử' }],
  missions: [
    {
      id: 'mission-1',
      title: 'Nhiệm vụ một',
      discovery: [{ text: 'Đọc trước khi làm.', source }],
      activities: [
        {
          id: 'activity-1', objectiveId: 'objective-1', type: 'choice', prompt: 'Chọn A', hint: 'Hãy nghĩ lại.', explanation: 'A là đáp án.', source, reviewStatus: 'verified',
          options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correctId: 'a',
        },
        {
          id: 'activity-2', objectiveId: 'objective-1', type: 'order', prompt: 'Xếp', hint: 'Bắt đầu từ một.', explanation: 'Đúng thứ tự.', source, reviewStatus: 'verified',
          items: [{ id: 'one', text: 'Một' }, { id: 'two', text: 'Hai' }], correctOrder: ['one', 'two'],
        },
      ],
    },
    {
      id: 'mission-2',
      title: 'Nhiệm vụ hai',
      discovery: [{ text: 'Đọc tiếp.', source }],
      activities: [
        {
          id: 'activity-3', objectiveId: 'objective-1', type: 'choice', prompt: 'Chọn B', hint: 'Đọc kỹ.', explanation: 'B là đáp án.', source, reviewStatus: 'verified',
          options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correctId: 'b',
        },
      ],
    },
  ],
};

describe('lesson session transitions', () => {
  it('requires discovery before the first answer', () => {
    const started = transition(null, { type: 'START', sessionId: 'session-test' }, lesson);
    expect(started).toMatchObject({ id: 'session-test', stage: 'discover', missionIndex: 0, activityIndex: 0 });
    expect(transition(started, { type: 'ANSWER', response: { type: 'choice', optionId: 'a' } }, lesson)).toBe(started);
    expect(transition(started, { type: 'DISCOVERY_DONE' }, lesson).stage).toBe('answer');
  });

  it('tracks hint, wrong feedback and retry on the same activity', () => {
    let session = transition(null, { type: 'START', sessionId: 'session-test' }, lesson);
    session = transition(session, { type: 'DISCOVERY_DONE' }, lesson);
    session = transition(session, { type: 'HINT' }, lesson);
    expect(session.hintUsed).toBe(true);
    session = transition(session, { type: 'ANSWER', response: { type: 'choice', optionId: 'b' } }, lesson);
    expect(session.stage).toBe('feedback');
    expect(session.lastEvaluation).toMatchObject({ correct: false, invalid: false });
    expect(session.attempts).toHaveLength(1);
    expect(session.attempts[0].hintUsed).toBe(true);
    session = transition(session, { type: 'NEXT' }, lesson);
    expect(session).toMatchObject({ stage: 'answer', missionIndex: 0, activityIndex: 0, hintUsed: false });
  });

  it('advances after a correct answer and ignores a double answer', () => {
    let session = transition(null, { type: 'START', sessionId: 'session-test' }, lesson);
    session = transition(session, { type: 'DISCOVERY_DONE' }, lesson);
    session = transition(session, { type: 'ANSWER', response: { type: 'choice', optionId: 'a' } }, lesson);
    expect(session.stage).toBe('feedback');
    const feedback = transition(session, { type: 'ANSWER', response: { type: 'choice', optionId: 'a' } }, lesson);
    expect(feedback.attempts).toHaveLength(1);
    session = transition(feedback, { type: 'NEXT' }, lesson);
    expect(session).toMatchObject({ stage: 'answer', activityIndex: 1 });
  });

  it('resumes a valid snapshot and restarts a mismatched lesson safely', () => {
    const started = transition(null, { type: 'START', sessionId: 'session-test' }, lesson);
    const resumed = transition(started, { type: 'RESUME' }, lesson);
    expect(resumed).toEqual(started);
    const mismatched = { ...started, lessonId: 'lesson-07' as const };
    expect(transition(mismatched, { type: 'RESUME' }, lesson)).toMatchObject({ lessonId: 'lesson-01', stage: 'discover', missionIndex: 0, activityIndex: 0 });
  });

  it('moves through mission and lesson completion without skipping an answer', () => {
    let session = transition(null, { type: 'START', sessionId: 'session-test' }, lesson);
    session = transition(session, { type: 'DISCOVERY_DONE' }, lesson);
    session = transition(session, { type: 'ANSWER', response: { type: 'choice', optionId: 'a' } }, lesson);
    session = transition(session, { type: 'NEXT' }, lesson);
    session = transition(session, { type: 'ANSWER', response: { type: 'order', ids: ['one', 'two'] } }, lesson);
    session = transition(session, { type: 'NEXT' }, lesson);
    expect(session.stage).toBe('missionComplete');
    session = transition(session, { type: 'NEXT' }, lesson);
    expect(session).toMatchObject({ stage: 'discover', missionIndex: 1, activityIndex: 0 });
  });

  it('returns the current activity only for a valid answer stage', () => {
    const started = createSession(lesson, 'session-test');
    const answering = transition(started, { type: 'DISCOVERY_DONE' }, lesson);
    expect(getCurrentActivity(answering, lesson)).toBe(lesson.missions[0].activities[0]);
    expect(getCurrentActivity({ ...started, stage: 'discover' }, lesson)).toBeNull();
  });

  it('persists a multi-select answer through feedback and advances normally', () => {
    const selectActivity: Select = {
      id: 'activity-select', objectiveId: 'objective-1', type: 'select', prompt: 'Chọn manh mối', hint: 'Chọn hai thẻ.', explanation: 'Đã chọn đúng hai manh mối.', source, reviewStatus: 'verified',
      options: [{ id: 'map', text: 'Bản đồ' }, { id: 'legend', text: 'Chú giải' }, { id: 'drum', text: 'Trống' }], correctIds: ['map', 'legend'],
    };
    const selectLesson = {
      ...lesson,
      missions: [{ ...lesson.missions[0], activities: [selectActivity] }],
    };
    let session = transition(null, { type: 'START', sessionId: 'select-session' }, selectLesson);
    session = transition(session, { type: 'DISCOVERY_DONE' }, selectLesson);
    session = transition(session, { type: 'ANSWER', response: { type: 'select', optionIds: ['legend', 'map'] } }, selectLesson);
    expect(session.stage).toBe('feedback');
    expect(session.lastEvaluation).toMatchObject({ correct: true, invalid: false });
    expect(session.attempts[0].response).toEqual({ type: 'select', optionIds: ['legend', 'map'] });
    expect(transition(session, { type: 'NEXT' }, selectLesson).stage).toBe('missionComplete');
  });
});

import type { Activity, Lesson, Mission, Session, Response } from '../content/types';
import { evaluate } from './evaluate';

export type SessionEvent =
  | { type: 'START'; sessionId?: string }
  | { type: 'DISCOVERY_DONE' }
  | { type: 'ANSWER'; response: Response }
  | { type: 'HINT' }
  | { type: 'NEXT' }
  | { type: 'RESUME' };

const STAGES: Session['stage'][] = ['discover', 'answer', 'feedback', 'missionComplete', 'lessonComplete'];

export function createSession(lesson: Lesson, id = 'session-new'): Session {
  return {
    id,
    lessonId: lesson.id,
    lessonVersion: lesson.version,
    missionIndex: 0,
    activityIndex: 0,
    stage: 'discover',
    attempts: [],
    hintUsed: false,
    lastEvaluation: null,
  };
}

export function getCurrentMission(session: Session, lesson: Lesson): Mission | null {
  if (session.lessonId !== lesson.id || session.lessonVersion !== lesson.version) return null;
  return lesson.missions[session.missionIndex] ?? null;
}

export function getCurrentActivity(session: Session, lesson: Lesson): Activity | null {
  if (session.stage !== 'answer' && session.stage !== 'feedback') return null;
  const mission = getCurrentMission(session, lesson);
  return mission?.activities[session.activityIndex] ?? null;
}

function isValidSession(session: Session, lesson: Lesson): boolean {
  if (session.lessonId !== lesson.id || session.lessonVersion !== lesson.version) return false;
  if (!session.id || !Number.isInteger(session.missionIndex) || session.missionIndex < 0 || session.missionIndex >= lesson.missions.length) {
    return false;
  }
  if (!STAGES.includes(session.stage)) return false;
  if (session.stage !== 'lessonComplete') {
    const mission = lesson.missions[session.missionIndex];
    if (!mission || !Number.isInteger(session.activityIndex) || session.activityIndex < 0 || session.activityIndex >= mission.activities.length) return false;
  }
  return Array.isArray(session.attempts) && typeof session.hintUsed === 'boolean';
}

function resetForLesson(session: Session | null, lesson: Lesson): Session {
  return createSession(lesson, session?.id || 'session-new');
}

/** Deterministic state machine for discovery, answers, feedback and completion. */
export function transition(session: Session | null, event: SessionEvent, lesson: Lesson): Session {
  if (event.type === 'START') return createSession(lesson, event.sessionId || session?.id || 'session-new');
  if (!session || !isValidSession(session, lesson)) return resetForLesson(session, lesson);

  switch (event.type) {
    case 'RESUME':
      return session;
    case 'DISCOVERY_DONE':
      return session.stage === 'discover' ? { ...session, stage: 'answer', hintUsed: false, lastEvaluation: null } : session;
    case 'HINT':
      return session.stage === 'answer' ? { ...session, hintUsed: true } : session;
    case 'ANSWER': {
      if (session.stage !== 'answer') return session;
      const activity = getCurrentActivity(session, lesson);
      if (!activity) return session;
      const evaluation = evaluate(activity, event.response);
      const attempt = {
        id: `attempt-${session.attempts.length + 1}`,
        activityId: activity.id,
        response: event.response,
        hintUsed: session.hintUsed,
        correct: evaluation.correct && !evaluation.invalid,
        time: new Date().toISOString(),
      };
      return { ...session, stage: 'feedback', attempts: [...session.attempts, attempt], lastEvaluation: evaluation };
    }
    case 'NEXT': {
      if (session.stage === 'feedback') {
        if (!session.lastEvaluation?.correct || session.lastEvaluation.invalid) {
          return { ...session, stage: 'answer', hintUsed: false, lastEvaluation: null };
        }
        const mission = getCurrentMission(session, lesson);
        if (!mission) return session;
        if (session.activityIndex < mission.activities.length - 1) {
          return { ...session, stage: 'answer', activityIndex: session.activityIndex + 1, hintUsed: false, lastEvaluation: null };
        }
        return { ...session, stage: 'missionComplete', hintUsed: false, lastEvaluation: null };
      }
      if (session.stage === 'missionComplete') {
        if (session.missionIndex < lesson.missions.length - 1) {
          return { ...session, stage: 'discover', missionIndex: session.missionIndex + 1, activityIndex: 0, hintUsed: false, lastEvaluation: null };
        }
        return { ...session, stage: 'lessonComplete', hintUsed: false, lastEvaluation: null };
      }
      return session;
    }
    default:
      return session;
  }
}

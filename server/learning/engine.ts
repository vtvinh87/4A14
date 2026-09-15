import type { LearningEventInput } from '../../shared/learning-contracts.ts';
import { CONTENT_VERSION } from '../../shared/learning-contracts.ts';
import { getLessonPackage, MVP_LESSON_PACKAGES } from '../../src/content/packages.ts';
import type { Activity, Progress, Response, Session } from '../../src/content/types.ts';
import { isLessonUnlocked } from '../../src/game/lessonAccess.ts';
import { grantReward } from '../../src/game/rewards.ts';
import { evaluate } from '../../src/game/evaluate.ts';
import { createSession, getCurrentActivity, transition, type SessionEvent } from '../../src/game/session.ts';
import type { LearningEventProcessorResult, LearningRunRecord, LearningSnapshotRecord, LearningStore } from './types.ts';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isResponse(value: unknown): value is Response {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.type === 'choice') return typeof candidate.optionId === 'string';
  if (candidate.type === 'order') return Array.isArray(candidate.ids) && candidate.ids.every((id) => typeof id === 'string');
  if (candidate.type === 'match') return Array.isArray(candidate.pairs) && candidate.pairs.every((pair) => Array.isArray(pair) && pair.length === 2 && pair.every((id) => typeof id === 'string'));
  if (candidate.type === 'select') return Array.isArray(candidate.optionIds) && candidate.optionIds.every((id) => typeof id === 'string');
  return false;
}

function lessonFor(event: LearningEventInput) {
  if (!MVP_LESSON_PACKAGES.some((lesson) => lesson.id === event.lessonId)) return null;
  return getLessonPackage(event.lessonId as Parameters<typeof getLessonPackage>[0]);
}

function emptyProgress(now: string): Progress {
  return { schemaVersion: 1, completedMissions: [], stamps: [], settings: { sound: true, reducedMotion: false }, session: null, updatedAt: now };
}

export function createEmptySnapshot(studentId: string, now: string): LearningSnapshotRecord {
  return { studentId, schemaVersion: 1, revision: 0, generation: 0, contentVersion: CONTENT_VERSION, progress: emptyProgress(now), updatedAt: now };
}

function eventToSessionEvent(event: LearningEventInput): SessionEvent | null {
  if (event.type === 'discovery_done') return { type: 'DISCOVERY_DONE' };
  if (event.type === 'hint_used') return { type: 'HINT' };
  if (event.type === 'next') return { type: 'NEXT' };
  if (event.type === 'answer_submitted' && event.response) return { type: 'ANSWER', response: event.response };
  return null;
}

function activeActivity(session: Session, lesson: ReturnType<typeof getLessonPackage>): Activity | null {
  return getCurrentActivity(session, lesson);
}

function newRun(studentId: string, event: LearningEventInput, now: string, lesson: ReturnType<typeof getLessonPackage>, generation: number): LearningRunRecord {
  const state = createSession(lesson, event.runId);
  return { runId: event.runId, studentId, lessonId: lesson.id, lessonVersion: lesson.version, deviceId: event.deviceId, status: 'active', state, generation, lastSequence: event.sequence, startedAt: now, endedAt: null, updatedAt: now };
}

function withRevision(snapshot: LearningSnapshotRecord, progress: Progress, now: string): LearningSnapshotRecord {
  return { ...snapshot, revision: snapshot.revision + 1, progress: { ...progress, updatedAt: now }, updatedAt: now };
}

/** Server-owned replay/validation for one event. It never trusts client correct/reward fields. */
export function processLearningEvent(studentId: string, store: LearningStore, event: LearningEventInput, now: string): LearningEventProcessorResult {
  if (event.eventId === event.runId || !isUuid(event.eventId) || !isUuid(event.runId)) return { ok: false, code: 'invalid', message: 'eventId và runId phải là UUID khác nhau.' };
  if (!Number.isInteger(event.sequence) || event.sequence < 1 || event.sequence > 100000) return { ok: false, code: 'invalid', message: 'sequence không hợp lệ.' };
  if (!Number.isInteger(event.lessonVersion) || event.lessonVersion < 1 || typeof event.deviceId !== 'string' || event.deviceId.length < 1 || event.deviceId.length > 128) return { ok: false, code: 'invalid', message: 'Thông tin phiên học không hợp lệ.' };
  if (!Number.isInteger(event.generation) || event.generation < 0 || (event.visible !== undefined && typeof event.visible !== 'boolean') || (event.interactive !== undefined && typeof event.interactive !== 'boolean')) return { ok: false, code: 'invalid', message: 'generation hoặc trạng thái tương tác không hợp lệ.' };
  if (event.generation !== store.snapshot.generation) return { ok: false, code: 'stale', message: 'Phiên học đã cũ sau khi tiến độ được thay đổi; hãy tải lại tiến độ.' };
  const lesson = lessonFor(event);
  if (!lesson || event.lessonVersion !== lesson.version) return { ok: false, code: 'invalid', message: 'Phiên học không khớp phiên bản nội dung.' };

  if (event.type === 'run_started') {
    if (store.run) return { ok: false, code: 'conflict', message: 'runId này đã tồn tại hoặc đang được dùng ở thiết bị khác.' };
    if (event.sequence !== 1) return { ok: false, code: 'conflict', message: 'Phiên mới phải bắt đầu ở sequence 1.' };
    if (!isLessonUnlocked(lesson.id, store.snapshot.progress.completedMissions)) return { ok: false, code: 'forbidden', message: 'Bài học này chưa được mở.' };
    const run = newRun(studentId, event, now, lesson, store.snapshot.generation);
    const snapshot = withRevision(store.snapshot, { ...store.snapshot.progress, session: run.state }, now);
    return { ok: true, snapshot, run, event: { ...event, studentId, receivedAt: now, hintUsed: false, correct: null, visible: Boolean(event.visible), interactive: Boolean(event.interactive) } };
  }

  const run = store.run;
  if (!run) return { ok: false, code: 'conflict', message: 'Chưa có run tương ứng; hãy mở phiên học mới.' };
  if (run.studentId !== studentId || run.lessonId !== event.lessonId || run.lessonVersion !== event.lessonVersion) return { ok: false, code: 'forbidden', message: 'Phiên học không thuộc tài khoản hiện tại.' };
  if (run.generation !== store.snapshot.generation) return { ok: false, code: 'stale', message: 'run này đã cũ sau khi tiến độ được reset.' };
  if (run.deviceId !== event.deviceId) return { ok: false, code: 'conflict', message: 'run này đang thuộc một thiết bị khác; hãy mở phiên mới.' };
  if (event.sequence !== run.lastSequence + 1) return { ok: false, code: 'conflict', message: `sequence phải tiếp nối ${run.lastSequence}.` };

  const currentSession = run.state;
  let nextSession = currentSession;
  let correct: boolean | null = null;
  const sessionEvent = eventToSessionEvent(event);
  if (event.type === 'heartbeat') {
    nextSession = currentSession;
  } else {
    if (!sessionEvent) return { ok: false, code: 'invalid', message: 'Event thiếu dữ liệu cần thiết.' };
    if (event.type === 'answer_submitted') {
      const activity = activeActivity(currentSession, lesson);
      if (!activity || currentSession.stage !== 'answer' || event.activityId !== activity.id || !event.response || !isResponse(event.response)) return { ok: false, code: 'invalid', message: 'Câu trả lời không khớp hoạt động hiện tại.' };
      const evaluation = evaluate(activity, event.response);
      if (evaluation.invalid) return { ok: false, code: 'invalid', message: 'Câu trả lời chứa thẻ hoặc lựa chọn không hợp lệ.' };
      correct = evaluation.correct;
    }
    nextSession = transition(currentSession, sessionEvent, lesson);
    if (nextSession === currentSession) return { ok: false, code: 'conflict', message: 'Event không đúng bước hiện tại của phiên học.' };
  }

  let nextProgress: Progress = { ...store.snapshot.progress, session: nextSession };
  if (event.type === 'next' && currentSession.stage === 'feedback' && nextSession.stage === 'missionComplete') {
    const mission = lesson.missions[currentSession.missionIndex];
    if (mission) nextProgress = grantReward(nextProgress, mission.id);
  }
  const nextRun: LearningRunRecord = {
    ...run,
    state: nextSession,
    lastSequence: event.sequence,
    status: nextSession.stage === 'lessonComplete' ? 'completed' : 'active',
    endedAt: nextSession.stage === 'lessonComplete' ? now : null,
    updatedAt: now,
  };
  const snapshot = withRevision(store.snapshot, nextProgress, now);
  return { ok: true, snapshot, run: nextRun, event: { ...event, studentId, receivedAt: now, hintUsed: event.type === 'answer_submitted' ? currentSession.hintUsed : event.type === 'hint_used', correct, visible: Boolean(event.visible), interactive: Boolean(event.interactive) } };
}

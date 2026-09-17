import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, type AppRequest, type AppResponse } from '../../server/app';
import { MemoryAuthRepository } from '../../server/auth/memoryRepository';
import { createAuthService } from '../../server/auth/service';
import { MemoryLearningRepository } from '../../server/learning/memoryRepository';
import { createLearningService } from '../../server/learning/service';
import { PROGRESS_BOARD_ROLLOUT_ENV } from '../../server/progress/rollout';
import { getLessonPackage } from '../../src/content/packages';
import type { Activity, Response } from '../../src/content/types';
import type { ProgressBoardData } from '../../shared/progress-board-contracts';
import type { LearningEventInput } from '../../shared/learning-contracts';

function cookieValue(response: AppResponse): string {
  return (response.headers['Set-Cookie'] ?? '').split(';', 1)[0] ?? '';
}

async function request(
  app: ReturnType<typeof createApp>,
  input: Omit<AppRequest, 'headers'> & { cookie?: string; parentGrant?: string },
): Promise<AppResponse> {
  const headers: Record<string, string> = { host: 'localhost:8888' };
  if (input.cookie) headers.cookie = input.cookie;
  if (input.parentGrant) headers['x-parent-grant'] = input.parentGrant;
  return app.handle({ ...input, headers });
}

function responseFor(activity: Activity, correct: boolean): Response {
  if (activity.type === 'choice') {
    const optionId = correct
      ? activity.correctId
      : activity.options.find((option) => option.id !== activity.correctId)?.id;
    if (!optionId) throw new Error('Choice fixture needs a distractor.');
    return { type: 'choice', optionId };
  }
  if (activity.type === 'match') {
    const pairs = activity.pairs.map((pair) => [pair.leftId, pair.rightId] as [string, string]);
    if (correct) return { type: 'match', pairs };
    if (pairs.length < 2) throw new Error('Match fixture needs at least two pairs for a wrong answer.');
    const first = pairs[0]![1];
    pairs[0]![1] = pairs[1]![1];
    pairs[1]![1] = first;
    return { type: 'match', pairs };
  }
  if (activity.type === 'order') {
    const ids = correct ? [...activity.correctOrder] : [...activity.correctOrder].reverse();
    if (!correct && ids.every((id, index) => id === activity.correctOrder[index])) {
      [ids[0], ids[1]] = [ids[1]!, ids[0]!];
    }
    return { type: 'order', ids };
  }
  if (correct) return { type: 'select', optionIds: [...activity.correctIds] };
  const distractor = activity.options.find((option) => !activity.correctIds.includes(option.id))?.id;
  if (!distractor || !activity.correctIds.length) throw new Error('Select fixture needs a distractor.');
  return { type: 'select', optionIds: [distractor, ...activity.correctIds.slice(1)] };
}

function event(
  runId: string,
  sequence: number,
  type: LearningEventInput['type'],
  extra: Partial<LearningEventInput> = {},
): LearningEventInput {
  return {
    eventId: randomUUID(),
    runId,
    sequence,
    type,
    lessonId: 'lesson-01',
    lessonVersion: 1,
    deviceId: 'synthetic-device',
    generation: 0,
    ...extra,
  };
}

function boardData(response: AppResponse): ProgressBoardData {
  expect(response.statusCode).toBe(200);
  expect(response.body.ok).toBe(true);
  return response.body.data as ProgressBoardData;
}

function findObjective(data: ProgressBoardData, objectiveId: string) {
  return data.topics.flatMap((topic) => topic.lessons).flatMap((lesson) => lesson.objectives).find((objective) => objective.objectiveId === objectiveId);
}

function stableBoard(data: ProgressBoardData): ProgressBoardData {
  return { ...data, generatedAt: '', lastSyncedAt: '' };
}

async function provisionStudent(
  app: ReturnType<typeof createApp>,
  adminCookie: string,
  username: string,
  displayName: string,
): Promise<{ id: string; cookie: string }> {
  const created = await request(app, { method: 'POST', path: '/api/admin/students', cookie: adminCookie, body: { username, displayName } });
  expect(created.statusCode).toBe(200);
  const id = String((created.body.account as { id: string }).id);
  const login = await request(app, { method: 'POST', path: '/api/auth/student/login', body: { username, pin: '123456' } });
  expect(login.statusCode).toBe(200);
  const changed = await request(app, { method: 'POST', path: '/api/auth/student/change-pin', cookie: cookieValue(login), body: { currentPin: '123456', newPin: '246810' } });
  expect(changed.statusCode).toBe(200);
  return { id, cookie: cookieValue(changed) };
}

describe('progress board synthetic E2E contract', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps rollout, student identity, evidence, generation and privacy boundaries intact', async () => {
    vi.stubEnv(PROGRESS_BOARD_ROLLOUT_ENV, 'false');
    const authRepository = new MemoryAuthRepository();
    const learningRepository = new MemoryLearningRepository();
    const auth = createAuthService(authRepository);
    const learning = createLearningService(learningRepository);
    const app = createApp({ auth, learning });
    const adminLogin = await request(app, { method: 'POST', path: '/api/auth/admin/login', body: { username: 'admin', password: '123456@' } });
    expect(adminLogin.statusCode).toBe(200);
    const adminCookie = cookieValue(adminLogin);
    const suffix = Date.now().toString(36);
    const studentA = await provisionStudent(app, adminCookie, `pba${suffix}`, 'Bạn A tổng hợp');
    const studentB = await provisionStudent(app, adminCookie, `pbb${suffix}`, 'Bạn B tổng hợp');
    const lesson = getLessonPackage('lesson-01');
    const firstActivity = lesson.missions[0]!.activities[0]!;
    const secondActivity = lesson.missions[0]!.activities[1]!;
    const objectiveA = firstActivity.objectiveId;
    const objectiveB = secondActivity.objectiveId;
    const runA = randomUUID();
    const runB = randomUUID();
    const eventsA = [
      event(runA, 1, 'run_started'),
      event(runA, 2, 'discovery_done'),
      event(runA, 3, 'hint_used', { activityId: firstActivity.id }),
      event(runA, 4, 'answer_submitted', { activityId: firstActivity.id, response: responseFor(firstActivity, true) }),
    ];
    const eventsB = [
      event(runB, 1, 'run_started'),
      event(runB, 2, 'discovery_done'),
      event(runB, 3, 'answer_submitted', { activityId: firstActivity.id, response: responseFor(firstActivity, true) }),
      event(runB, 4, 'next'),
      event(runB, 5, 'answer_submitted', { activityId: secondActivity.id, response: responseFor(secondActivity, false) }),
    ];

    const disabledConfig = await request(app, { method: 'GET', path: '/api/me/progress-board/config', cookie: studentA.cookie });
    expect(disabledConfig.statusCode).toBe(200);
    expect(disabledConfig.body).toMatchObject({ ok: true, config: { enabled: false } });
    const getBoard = vi.spyOn(learning, 'getProgressBoard');
    const disabledBoard = await request(app, { method: 'GET', path: '/api/me/progress-board', cookie: studentA.cookie });
    expect(disabledBoard.statusCode).toBe(503);
    expect(getBoard).not.toHaveBeenCalled();

    vi.stubEnv(PROGRESS_BOARD_ROLLOUT_ENV, 'true');
    const acceptedA = await request(app, {
      method: 'POST',
      path: '/api/me/events',
      cookie: studentA.cookie,
      body: { events: eventsA },
    });
    expect(acceptedA.statusCode).toBe(200);
    const duplicateA = await request(app, { method: 'POST', path: '/api/me/events', cookie: studentA.cookie, body: { events: eventsA } });
    expect(duplicateA.statusCode).toBe(200);
    expect((duplicateA.body.acknowledgements as Array<{ status: string }>).every((ack) => ack.status === 'duplicate')).toBe(true);

    const acceptedB = await request(app, {
      method: 'POST',
      path: '/api/me/events',
      cookie: studentB.cookie,
      body: { events: eventsB },
    });
    expect(acceptedB.statusCode).toBe(200);

    const responseA = await request(app, { method: 'GET', path: '/api/me/progress-board', cookie: studentA.cookie });
    const dataA = boardData(responseA);
    expect(responseA.headers['Cache-Control']).toBe('no-store');
    expect(dataA.topics.flatMap((topic) => topic.lessons)).toHaveLength(29);
    expect(findObjective(dataA, objectiveA)).toMatchObject({ state: 'practicing', practicedActivityCount: 1, independentActivityCount: 0 });
    expect(findObjective(dataA, objectiveB)?.practicedActivityCount).toBe(1);
    expect(dataA.generation).toBe('0');
    expect(JSON.stringify(responseA.body)).not.toMatch(/studentId|email|eventId|response|score|speed|rank/i);

    const responseB = await request(app, { method: 'GET', path: '/api/me/progress-board', cookie: studentB.cookie });
    const dataB = boardData(responseB);
    expect(findObjective(dataB, objectiveA)).toMatchObject({ state: 'practicing', practicedActivityCount: 2, independentActivityCount: 1 });
    expect(findObjective(dataB, objectiveB)).toMatchObject({ state: 'practicing', practicedActivityCount: 2, independentActivityCount: 1 });
    expect(dataB).not.toEqual(dataA);

    const queryCannotSwitchIdentity = await request(app, { method: 'GET', path: `/api/me/progress-board?studentId=${encodeURIComponent(studentB.id)}`, cookie: studentA.cookie });
    expect(stableBoard(boardData(queryCannotSwitchIdentity))).toEqual(stableBoard(dataA));
    expect((await request(app, { method: 'GET', path: '/api/me/progress-board', cookie: studentA.cookie, parentGrant: 'not-a-parent-grant' })).statusCode).toBe(403);

    const reset = await learning.resetProgress(studentA.id);
    expect(reset.snapshot.generation).toBe(1);
    const afterReset = boardData(await request(app, { method: 'GET', path: '/api/me/progress-board', cookie: studentA.cookie }));
    expect(afterReset.generation).toBe('1');
    expect(afterReset.summary.exploredLessonCount).toBe(0);
    expect(afterReset.summary.independentObjectiveCount).toBe(0);

    const afterResetRetry = boardData(await request(app, { method: 'GET', path: '/api/me/progress-board', cookie: studentA.cookie }));
    expect(stableBoard(afterResetRetry)).toEqual(stableBoard(afterReset));
    expect(getBoard).toHaveBeenCalledTimes(5);
  });
});

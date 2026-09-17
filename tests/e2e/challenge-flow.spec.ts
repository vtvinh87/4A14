import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, type AppRequest, type AppResponse } from '../../server/app';
import { MemoryAuthRepository } from '../../server/auth/memoryRepository';
import { createAuthService } from '../../server/auth/service';
import { MemoryAuthoringRepository } from '../../server/challenge/memoryAuthoringRepository';
import { createChallengeAuthoringService } from '../../server/challenge/authoringService';
import { createChallengePlayService } from '../../server/challenge/playService';
import { createChallengeReviewService } from '../../server/challenge/reviewService';
import { createChallengeSocialService } from '../../server/challenge/socialService';
import { MemoryPlayRepository } from '../../server/challenge/memoryPlayRepository';
import { createChallengeWeeklyService } from '../../server/challenge/weeklyService';
import type { CreateChallengeQuestionInput } from '../../shared/challenge-contracts';
import { VERIFIED_CHALLENGE_FACTS } from '../../shared/challenge-source';

const INITIAL_PIN = '123456';
const STUDENT_PIN = '246810';
const PARENT_PIN = '864208';
const NOW = new Date('2026-09-17T08:00:00.000Z');

function cookieValue(response: AppResponse): string {
  return (response.headers['Set-Cookie'] ?? '').split(';', 1)[0] ?? '';
}

async function request(app: ReturnType<typeof createApp>, input: Omit<AppRequest, 'headers'> & { cookie?: string; parentGrant?: string }): Promise<AppResponse> {
  return app.handle({
    ...input,
    headers: {
      host: 'localhost:8888',
      ...(input.cookie ? { cookie: input.cookie } : {}),
      ...(input.parentGrant ? { 'x-parent-grant': input.parentGrant } : {}),
    },
  });
}

function challengeInput(sourceFactId: string, marker: string): CreateChallengeQuestionInput {
  return {
    sourceFactId,
    prompt: `Theo con, ${marker} giúp cả lớp khám phá điều gì trong bài học?`,
    correctAnswer: `${marker} là đáp án con tự tìm hiểu và giải thích cho lớp.`,
    distractors: ['Một bài hát vui trong giờ ra chơi.', 'Một món ăn không liên quan đến bài học.', 'Một câu chuyện tưởng tượng không có trong nguồn học.'],
    explanation: `Câu hỏi này dựa trên mảnh kiến thức ${marker} đã được kiểm duyệt trong nguồn học của lớp.`,
  };
}

async function createStudent(app: ReturnType<typeof createApp>, adminCookie: string, username: string, displayName: string): Promise<string> {
  const response = await request(app, { method: 'POST', path: '/api/admin/students', cookie: adminCookie, body: { username, displayName } });
  expect(response.statusCode).toBe(200);
  return String((response.body.account as { id: string }).id);
}

async function readyStudent(app: ReturnType<typeof createApp>, username: string): Promise<string> {
  const login = await request(app, { method: 'POST', path: '/api/auth/student/login', body: { username, pin: INITIAL_PIN } });
  expect(login.statusCode).toBe(200);
  const changed = await request(app, { method: 'POST', path: '/api/auth/student/change-pin', cookie: cookieValue(login), body: { currentPin: INITIAL_PIN, newPin: STUDENT_PIN } });
  expect(changed.statusCode).toBe(200);
  return cookieValue(changed);
}

async function reLoginStudent(app: ReturnType<typeof createApp>, username: string): Promise<string> {
  const login = await request(app, { method: 'POST', path: '/api/auth/student/login', body: { username, pin: STUDENT_PIN } });
  expect(login.statusCode).toBe(200);
  return cookieValue(login);
}

async function openParentGrant(app: ReturnType<typeof createApp>, studentCookie: string): Promise<{ cookie: string; grant: string }> {
  const firstUnlock = await request(app, { method: 'POST', path: '/api/parent/unlock', cookie: studentCookie, body: { pin: INITIAL_PIN } });
  expect(firstUnlock.statusCode).toBe(200);
  expect(firstUnlock.body.mustChange).toBe(true);
  const changed = await request(app, { method: 'POST', path: '/api/parent/change-pin', cookie: cookieValue(firstUnlock), body: { currentPin: INITIAL_PIN, newPin: PARENT_PIN } });
  expect(changed.statusCode).toBe(200);
  const unlocked = await request(app, { method: 'POST', path: '/api/parent/unlock', cookie: cookieValue(changed), body: { pin: PARENT_PIN } });
  expect(unlocked.statusCode).toBe(200);
  return { cookie: cookieValue(unlocked), grant: String(unlocked.body.parentGrantToken ?? '') };
}

describe('Thách đố tiếp sức synthetic API/E2E contract', () => {
  beforeEach(() => vi.stubEnv('HOC_VUI_CHALLENGE_MODE', 'pilot'));
  afterEach(() => vi.unstubAllEnvs());

  it('keeps the complete positive class flow bounded by quota, scope, ACK and privacy rules', async () => {
    const suffix = randomUUID().slice(0, 8);
    const authRepository = new MemoryAuthRepository();
    const auth = createAuthService(authRepository, () => NOW);
    const setup = createApp({ auth });
    const adminLogin = await request(setup, { method: 'POST', path: '/api/auth/admin/login', body: { username: 'admin', password: '123456@' } });
    expect(adminLogin.statusCode).toBe(200);
    const adminCookie = cookieValue(adminLogin);
    const usernames = ['studenta', 'studentb', 'studentc', 'studentd', 'studente', 'studentf'].map((name) => `${name}${suffix}`);
    const ids = new Map<string, string>();
    for (const [index, username] of usernames.entries()) ids.set(username, await createStudent(setup, adminCookie, username, `Synthetic ${index + 1}`));

    const authoringRepository = new MemoryAuthoringRepository({ now: () => NOW });
    let nextId = 0;
    const studentNames = async () => [...(await authRepository.listStudents())].map((student) => student.displayName);
    const challengeAuthoring = createChallengeAuthoringService({
      repository: authoringRepository,
      sourceCatalog: VERIFIED_CHALLENGE_FACTS,
      activeStudentDisplayNames: studentNames,
      clock: () => NOW,
      idFactory: () => `synthetic-question-${++nextId}`,
    });
    const playRepository = new MemoryPlayRepository({ now: () => NOW, idFactory: () => `synthetic-play-${++nextId}` });
    const challengePlay = createChallengePlayService({ authoring: authoringRepository, play: playRepository, clock: () => NOW, activeStudentCount: async () => 6, idFactory: () => `synthetic-event-${++nextId}` });
    const challengeSocial = createChallengeSocialService({ authoring: authoringRepository, play: playRepository, clock: () => NOW });
    const challengeReview = createChallengeReviewService({ repository: authoringRepository, clock: () => NOW });
    const challengeWeekly = createChallengeWeeklyService({
      authoring: authoringRepository,
      play: playRepository,
      now: () => NOW,
      activeStudentIds: async () => [...ids.values()],
    });
    const app = createApp({ auth, challengeAuthoring, challengeReview, challengePlay, challengeSocial, challengeWeekly });

    const cookieA = await readyStudent(app, usernames[0]!);
    const cookieB = await readyStudent(app, usernames[1]!);
    const cookieC = await readyStudent(app, usernames[2]!);
    const cookieD = await readyStudent(app, usernames[3]!);
    const cookieE = await readyStudent(app, usernames[4]!);
    const cookieF = await readyStudent(app, usernames[5]!);

    const createdA: AppResponse[] = [];
    for (const marker of ['bản đồ lần một', 'bản đồ lần hai', 'bản đồ lần ba']) {
      const created = await request(app, { method: 'POST', path: '/api/me/challenge/questions', cookie: cookieA, body: challengeInput('map', marker) });
      expect(created.statusCode).toBe(200);
      createdA.push(created);
    }
    const fourth = await request(app, { method: 'POST', path: '/api/me/challenge/questions', cookie: cookieA, body: challengeInput('map', 'bản đồ lần bốn') });
    expect(fourth.statusCode).toBe(429);
    expect(fourth.body).toMatchObject({ ok: false, reason: 'quota_exceeded' });

    const createdB = await request(app, { method: 'POST', path: '/api/me/challenge/questions', cookie: cookieB, body: challengeInput('location', 'địa danh trong bài học') });
    expect(createdB.statusCode).toBe(200);
    const questionAId = String((createdA[0]!.body.question as { id: string }).id);
    const questionA2Id = String((createdA[1]!.body.question as { id: string }).id);
    const questionBId = String((createdB.body.question as { id: string }).id);

    const parentA = await openParentGrant(app, cookieA);
    const parentAPending = await request(app, { method: 'GET', path: '/api/parent/challenge/questions/pending', cookie: parentA.cookie, parentGrant: parentA.grant });
    expect(parentAPending.statusCode).toBe(200);
    expect((parentAPending.body.questions as Array<{ id: string }>).map((question) => question.id)).not.toContain(questionBId);
    const approvedA = await request(app, { method: 'POST', path: `/api/parent/challenge/questions/${questionAId}/review`, cookie: parentA.cookie, parentGrant: parentA.grant, body: { decision: 'approve', revision: 1 } });
    expect(approvedA.statusCode).toBe(200);
    const requestedRevisionA = await request(app, { method: 'POST', path: `/api/parent/challenge/questions/${questionA2Id}/review`, cookie: parentA.cookie, parentGrant: parentA.grant, body: { decision: 'request_revision', revision: 1, reason: 'Con hãy viết rõ hơn một chút nhé.' } });
    expect(requestedRevisionA.statusCode).toBe(200);

    const foreignReview = await request(app, { method: 'POST', path: `/api/parent/challenge/questions/${questionBId}/review`, cookie: parentA.cookie, parentGrant: parentA.grant, body: { decision: 'approve', revision: 1 } });
    expect(foreignReview.statusCode).toBe(404);

    const parentB = await openParentGrant(app, cookieB);
    const requestedRevisionB = await request(app, { method: 'POST', path: `/api/parent/challenge/questions/${questionBId}/review`, cookie: parentB.cookie, parentGrant: parentB.grant, body: { decision: 'request_revision', revision: 1, reason: 'Con hãy làm rõ mảnh kiến thức chính nhé.' } });
    expect(requestedRevisionB.statusCode).toBe(200);
    const cookieBAfterParent = await reLoginStudent(app, usernames[1]!);
    const revisedB = await request(app, { method: 'PATCH', path: `/api/me/challenge/questions/${questionBId}`, cookie: cookieBAfterParent, body: { ...challengeInput('location', 'địa danh sau khi chỉnh sửa'), revision: 1 } });
    expect(revisedB.statusCode).toBe(200);
    expect((revisedB.body.question as { revision: number }).revision).toBe(2);
    const approvedB = await request(app, { method: 'POST', path: `/api/parent/challenge/questions/${questionBId}/review`, cookie: parentB.cookie, parentGrant: parentB.grant, body: { decision: 'approve', revision: 2 } });
    expect(approvedB.statusCode).toBe(200);

    const directAuthors = [usernames[2]!, usernames[3]!, usernames[4]!];
    const directFacts = ['sketch', 'festival', 'dragon'];
    for (let index = 0; index < directAuthors.length; index += 1) {
      const authorId = ids.get(directAuthors[index]!)!;
      const created = await challengeAuthoring.createQuestion(authorId, challengeInput(directFacts[index]!, `mảnh kiến thức bổ sung ${index + 1}`));
      expect(created.ok).toBe(true);
      if (!created.ok) continue;
      const approved = await authoringRepository.reviewQuestion(authorId, created.id, created.revision, { decision: 'approve' });
      expect(approved && typeof approved !== 'string').toBe(true);
    }

    const today = await request(app, { method: 'GET', path: '/api/me/challenge/today', cookie: cookieBAfterParent });
    expect(today.statusCode).toBe(200);
    const questions = today.body.questions as Array<{ id: string; roundItemId: string; author: { id: string }; options: Array<{ id: string }> }>;
    expect(questions).toHaveLength(5);
    expect(JSON.stringify(today.body)).not.toMatch(/correctOptionId|explanation|sourceText|token|parentGrant/i);
    const byAuthor = new Map(questions.map((question) => [question.author.id, question]));
    const studentByUsername = new Map([
      [usernames[0]!, { id: ids.get(usernames[0]!)!, cookie: await reLoginStudent(app, usernames[0]!) }],
      [usernames[1]!, { id: ids.get(usernames[1]!)!, cookie: cookieBAfterParent }],
      [usernames[2]!, { id: ids.get(usernames[2]!)!, cookie: cookieC }],
      [usernames[3]!, { id: ids.get(usernames[3]!)!, cookie: cookieD }],
      [usernames[4]!, { id: ids.get(usernames[4]!)!, cookie: cookieE }],
      [usernames[5]!, { id: ids.get(usernames[5]!)!, cookie: cookieF }],
    ]);

    const firstAnswers = new Map<string, { studentId: string; cookie: string; key: string }>();
    for (const [username, student] of studentByUsername) {
      for (const question of questions) {
        if (question.author.id === student.id) continue;
        const idempotencyKey = `attempt-${username}-${question.roundItemId}`;
        const answer = await request(app, { method: 'POST', path: `/api/me/challenge/items/${question.roundItemId}/attempt`, cookie: student.cookie, body: { selectedOptionId: 'correct', idempotencyKey } });
        expect(answer.statusCode).toBe(200);
        expect(answer.body.correct).toBe(true);
        if (username === usernames[1] && !firstAnswers.has(question.roundItemId)) firstAnswers.set(question.roundItemId, { studentId: student.id, cookie: student.cookie, key: idempotencyKey });
      }
    }
    const questionOwnedByB = byAuthor.get(ids.get(usernames[1]!)!);
    expect(questionOwnedByB).toBeDefined();
    const selfAnswer = await request(app, { method: 'POST', path: `/api/me/challenge/items/${questionOwnedByB!.roundItemId}/attempt`, cookie: cookieBAfterParent, body: { selectedOptionId: 'correct', idempotencyKey: 'self-answer-blocked' } });
    expect(selfAnswer.statusCode).toBe(403);

    const duplicateAttempt = firstAnswers.values().next().value as { cookie: string; key: string };
    const duplicateAttemptResponse = await request(app, { method: 'POST', path: `/api/me/challenge/items/${[...firstAnswers.keys()][0]}/attempt`, cookie: duplicateAttempt.cookie, body: { selectedOptionId: 'correct', idempotencyKey: duplicateAttempt.key } });
    expect(duplicateAttemptResponse.statusCode).toBe(200);
    expect(duplicateAttemptResponse.body.duplicate).toBe(true);

    const reactionItemId = questions[0]!.roundItemId;
    const reaction = await request(app, { method: 'POST', path: `/api/me/challenge/items/${reactionItemId}/reactions`, cookie: cookieBAfterParent, body: { reactionType: 'learned', idempotencyKey: 'reaction-same-1' } });
    const reactionRetry = await request(app, { method: 'POST', path: `/api/me/challenge/items/${reactionItemId}/reactions`, cookie: cookieBAfterParent, body: { reactionType: 'learned', idempotencyKey: 'reaction-same-1' } });
    expect(reaction.statusCode).toBe(200);
    expect(reactionRetry.body).toEqual(reaction.body);
    const report = await request(app, { method: 'POST', path: `/api/me/challenge/items/${reactionItemId}/report`, cookie: cookieBAfterParent, body: { reason: 'unclear', details: '<b>Con chưa rõ</b>', idempotencyKey: 'report-same-1' } });
    const reportRetry = await request(app, { method: 'POST', path: `/api/me/challenge/items/${reactionItemId}/report`, cookie: cookieBAfterParent, body: { reason: 'inappropriate', idempotencyKey: 'report-same-1' } });
    expect(report.statusCode).toBe(200);
    expect(reportRetry.body).toEqual(report.body);
    expect(JSON.stringify(report.body)).not.toMatch(/reporter|details|admin|token/i);

    const roundBeforeVoid = await playRepository.getRound('2026-09-17');
    expect(roundBeforeVoid?.rewardGranted).toBe(true);
    expect(roundBeforeVoid?.currentContributions).toBeGreaterThanOrEqual(roundBeforeVoid?.targetContributions ?? 99);
    const voidQuestion = questions[0]!;
    const voided = await request(app, { method: 'POST', path: `/api/admin/challenge/questions/${voidQuestion.id}/void`, cookie: adminCookie, body: { reason: 'Đã kiểm tra theo nguồn học đã duyệt.' } });
    expect(voided.statusCode).toBe(200);
    const roundAfterVoid = await playRepository.getRound('2026-09-17');
    expect(roundAfterVoid?.currentContributions).toBeLessThan(roundBeforeVoid!.currentContributions);
    expect(roundAfterVoid?.rewardGranted).toBe(true);

    const weekly = await request(app, { method: 'GET', path: '/api/me/challenge/week', cookie: cookieC });
    expect(weekly.statusCode).toBe(200);
    expect(weekly.body.days).toHaveLength(7);
    expect(weekly.body.classProgress).toEqual(expect.objectContaining({ target: 12 }));
    expect(weekly.body.recognitions).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'question_creator' })]));
    expect(JSON.stringify(weekly.body)).not.toMatch(/rank|leaderboard|scoreByStudent|fastest|position/i);

    const parentAAfter = await request(app, { method: 'GET', path: '/api/parent/challenge/questions/pending', cookie: parentA.cookie, parentGrant: parentA.grant });
    expect(parentAAfter.statusCode).toBe(200);
    expect((parentAAfter.body.questions as Array<{ id: string }>).map((question) => question.id)).not.toContain(questionBId);
    expect((await request(app, { method: 'GET', path: '/api/parent/challenge/questions/pending', cookie: parentA.cookie })).statusCode).toBe(403);
  });
});

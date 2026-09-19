import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createDbClient, type DatabaseClient } from '../db/client';
import { PostgresAuthRepository } from '../auth/postgresRepository';
import { PostgresAuthoringRepository } from './postgresAuthoringRepository';
import { PostgresPlayRepository } from './postgresPlayRepository';
import { PostgresChallengeReadRepository } from './readRepository';
import { createChallengePlayService } from './playService';
import { createChallengeWeeklyService } from './weeklyService';

const databaseUrl = process.env.HOC_VUI_TEST_DATABASE_URL;
const isLocalTarget = (() => {
  if (!databaseUrl) return false;
  try {
    const hostname = new URL(databaseUrl).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
})();
const describeLocalDatabase = databaseUrl && isLocalTarget ? describe : describe.skip;

describeLocalDatabase('PostgreSQL challenge batch read boundary', () => {
  it('round-trips question options as a JSON array on the real driver', async () => {
    const db = createDbClient(databaseUrl!);
    const authorId = randomUUID();
    try {
      await db`insert into hoc_vui_private.accounts (id, username, display_name, role) values (${authorId}, ${`qa${authorId.replaceAll('-', '').slice(0, 10)}`}, 'Synthetic QA', 'student')`;
      const repository = new PostgresAuthoringRepository(db);
      const question = await repository.insertPendingQuestion({ id: randomUUID(), authorId,
        sourceFactId: 'map', sourceVersion: 'challenge-facts-v1', lessonId: 'lesson-01', lessonTitle: 'Synthetic QA',
        prompt: 'Synthetic QA: Bản đồ biểu diễn điều gì?',
        options: [{ id: 'a', text: 'Khu vực thu nhỏ' }, { id: 'b', text: 'Bài hát' }, { id: 'c', text: 'Món ăn' }, { id: 'd', text: 'Trò chơi' }],
        correctOptionId: 'a', explanation: 'Đây là dữ liệu giả lập để kiểm tra PostgreSQL.', createdLocalDate: '2026-09-19' });
      expect(question).toMatchObject({ options: expect.any(Array), correctOptionId: 'a' });
      if (question === 'quota_exceeded') throw new Error('fixture quota');
      await repository.reviewQuestion(authorId, question.id, 1, { decision: 'request_revision', reason: 'Synthetic QA revision' });
      const revised = await repository.updateDraftRevision(authorId, question.id, 1, {
        revision: 1, sourceFactId: 'map', prompt: 'Synthetic QA: Bản đồ biểu diễn điều gì mới?',
        correctAnswer: 'Khu vực thu nhỏ', distractors: ['Bài hát', 'Món ăn', 'Trò chơi'], explanation: 'Đây là dữ liệu giả lập kiểm tra sửa câu hỏi.' });
      expect(revised).toMatchObject({ revision: 2, options: expect.any(Array) });
      const play = new PostgresPlayRepository(db);
      const eventId = randomUUID();
      await play.appendEvent({ eventId, studentId: authorId, eventType: 'challenge.question_created', payload: { questionId: question.id },
        occurredAt: '2026-09-19T00:00:00Z', localDate: '2026-09-19', source: 'synthetic-qa', sourceVersion: 'v1' });
      const event = await db`select payload from hoc_vui_private.challenge_events where event_id = ${eventId}::uuid`;
      expect(event[0].payload).toEqual({ questionId: question.id });
    } finally {
      await db`delete from hoc_vui_private.challenge_events where student_id = ${authorId}`;
      await db`delete from hoc_vui_private.accounts where id = ${authorId}`;
      await db.end({ timeout: 5 });
    }
  });

  it('uses one question statement and one active-author statement for a fixed item set', async () => {
    const db = createDbClient(databaseUrl!);
    const statements: string[] = [];
    const execute = db as unknown as (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;
    const counted = ((strings: TemplateStringsArray, ...values: unknown[]) => {
      statements.push(Array.from(strings).join(' '));
      return execute(strings, ...values);
    }) as unknown as DatabaseClient;
    Object.assign(counted, {
      array: db.array.bind(db),
      unsafe: (value: string) => db.unsafe(value),
    });
    try {
      const repository = new PostgresAuthoringRepository(counted);
      const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
      await expect(repository.findQuestionsByIds(ids)).resolves.toEqual([]);
      await expect(repository.getAuthorViewsByIds(ids)).resolves.toEqual([]);
      expect(statements).toHaveLength(2);
      expect(statements[0]).toContain('challenge_questions');
      expect(statements[1]).toContain('accounts');
      expect(statements[1]).toContain("role = 'student'");
      expect(statements[1]).toContain('active = true');
    } finally {
      await db.end({ timeout: 5 });
    }
  });

  it('keeps the weekly read budget bounded on the explicit local test target', async () => {
    const db = createDbClient(databaseUrl!);
    const statements: string[] = [];
    const execute = db as unknown as (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;
    const counted = ((strings: TemplateStringsArray, ...values: unknown[]) => {
      statements.push(Array.from(strings).join(' '));
      return execute(strings, ...values);
    }) as unknown as DatabaseClient;
    Object.assign(counted, {
      array: db.array.bind(db),
      unsafe: (value: string) => db.unsafe(value),
    });
    try {
      const auth = new PostgresAuthRepository(counted);
      const authoring = new PostgresAuthoringRepository(counted);
      const play = new PostgresPlayRepository(counted);
      const read = new PostgresChallengeReadRepository(counted);
      const service = createChallengeWeeklyService({
        play,
        authoring,
        now: () => new Date('2026-09-17T08:00:00.000Z'),
        activeStudentIds: () => auth.listActiveStudentIds(),
        read,
      });
      await expect(service.getWeekly(randomUUID())).resolves.toMatchObject({ ok: true });
      expect(statements.length).toBe(1);
      expect(statements.join(' ').toLowerCase()).not.toContain('credentials');
    } finally {
      await db.end({ timeout: 5 });
    }
  });

  it('keeps optimized today and week response parity with the legacy read path', async () => {
    const db = createDbClient(databaseUrl!);
    try {
      const identity = await db<{ id: string }[]>`
        select accounts.id
        from hoc_vui_private.accounts as accounts
        join hoc_vui_private.challenge_preferences as preferences on preferences.student_id = accounts.id
        where accounts.role = 'student' and accounts.active = true
        order by accounts.id
        limit 1
      `;
      const studentId = identity[0]?.id;
      if (!studentId) throw new Error('local_synthetic_identity_missing');
      const now = () => new Date('2026-09-19T08:00:00.000Z');
      const makeToday = (read?: PostgresChallengeReadRepository) => {
        const authoring = new PostgresAuthoringRepository(db);
        const play = new PostgresPlayRepository(db);
        return createChallengePlayService({ authoring, play, clock: now, activeStudentCount: async () => 0, idFactory: randomUUID, ...(read ? { read } : {}) });
      };
      const optimizedToday = await makeToday(new PostgresChallengeReadRepository(db)).getToday(studentId);
      const legacyToday = await makeToday().getToday(studentId);
      expect(optimizedToday).toEqual(legacyToday);

      const makeWeek = (read?: PostgresChallengeReadRepository) => {
        const authoring = new PostgresAuthoringRepository(db);
        const play = new PostgresPlayRepository(db);
        const auth = new PostgresAuthRepository(db);
        return createChallengeWeeklyService({ authoring, play, now, activeStudentIds: () => auth.listActiveStudentIds(), ...(read ? { read } : {}) });
      };
      const optimizedWeek = await makeWeek(new PostgresChallengeReadRepository(db)).getWeekly(studentId);
      const legacyWeek = await makeWeek().getWeekly(studentId);
      expect(optimizedWeek).toEqual(legacyWeek);
    } finally {
      await db.end({ timeout: 5 });
    }
  });
});

import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createDbClient, type DatabaseClient } from '../db/client';
import { PostgresAuthRepository } from '../auth/postgresRepository';
import { PostgresAuthoringRepository } from './postgresAuthoringRepository';
import { PostgresPlayRepository } from './postgresPlayRepository';
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
  it('uses one question statement and one active-author statement for a fixed item set', async () => {
    const db = createDbClient(databaseUrl!);
    const statements: string[] = [];
    const execute = db as unknown as (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;
    const counted = ((strings: TemplateStringsArray, ...values: unknown[]) => {
      statements.push(Array.from(strings).join(' '));
      return execute(strings, ...values);
    }) as unknown as DatabaseClient;
    Object.assign(counted, {
      array: (values: readonly string[]) => db.array([...values]),
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
      array: (values: readonly string[]) => db.array([...values]),
      unsafe: (value: string) => db.unsafe(value),
    });
    try {
      const auth = new PostgresAuthRepository(counted);
      const authoring = new PostgresAuthoringRepository(counted);
      const play = new PostgresPlayRepository(counted);
      const service = createChallengeWeeklyService({
        play,
        authoring,
        now: () => new Date('2026-09-17T08:00:00.000Z'),
        activeStudentIds: () => auth.listActiveStudentIds(),
      });
      await expect(service.getWeekly(randomUUID())).resolves.toMatchObject({ ok: true });
      expect(statements.length).toBeLessThanOrEqual(10);
      expect(statements.join(' ').toLowerCase()).not.toContain('credentials');
    } finally {
      await db.end({ timeout: 5 });
    }
  });
});

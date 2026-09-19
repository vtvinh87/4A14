import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createDbClient } from '../db/client';
import { PostgresClassroomRepository } from './postgresRepository';

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

describeLocalDatabase('PostgreSQL classroom roster read boundary', () => {
  it('executes the roster read as one SQL statement on the explicit local test target', async () => {
    const db = createDbClient(databaseUrl!);
    let statementCount = 0;
    const execute = db as unknown as (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;
    const countedDb = ((strings: TemplateStringsArray, ...values: unknown[]) => {
      statementCount += 1;
      return execute(strings, ...values);
    }) as unknown as typeof db;
    try {
      const repository = new PostgresClassroomRepository(countedDb);
      const actorId = randomUUID();
      const expected = await db`select id from hoc_vui_private.accounts where role = 'student' and active = true and id <> ${actorId}::uuid`;
      const roster = await repository.listRoster(actorId);
      expect(roster.map(peer => peer.id).sort()).toEqual(expected.map(peer => String(peer.id)).sort());
      expect(statementCount).toBe(1);
    } finally {
      await db.end({ timeout: 5 });
    }
  });
});

import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { createDbClient, type DatabaseClient } from '../db/client';
import { PostgresAuthRepository } from '../auth/postgresRepository';
import { PostgresAuthoringRepository } from '../challenge/postgresAuthoringRepository';
import { PostgresPlayRepository } from '../challenge/postgresPlayRepository';
import { createChallengePlayService } from '../challenge/playService';
import { createChallengeWeeklyService } from '../challenge/weeklyService';

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

type QueryTiming = { durationMs: number; shape: string };

function timedDatabase(base: DatabaseClient, timings: QueryTiming[]): DatabaseClient {
  const execute = base as unknown as (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;
  const timed = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    const started = performance.now();
    const shape = Array.from(strings).join(' ').replace(/\s+/g, ' ').trim().slice(0, 160);
    return execute(strings, ...values).finally(() => {
      timings.push({ durationMs: Number((performance.now() - started).toFixed(3)), shape });
    });
  }) as unknown as DatabaseClient;
  Object.assign(timed, {
    array: base.array.bind(base),
    json: base.json.bind(base),
    unsafe: base.unsafe.bind(base),
  });
  return timed;
}

function snapshot(timings: QueryTiming[]) {
  return {
    totalMs: Number(timings.reduce((sum, query) => sum + query.durationMs, 0).toFixed(3)),
    queryCount: timings.length,
    queryDurationsMs: timings.map((query) => query.durationMs),
    queryShapes: timings.map((query) => query.shape),
  };
}

describeLocalDatabase('local protected read timing', () => {
  it('records auth, today and week SQL round-trip timings on the explicit local target', async () => {
    const base = createDbClient(databaseUrl!);
    try {
      const identity = await base<{ id: string; token_hash: string }[]>`
        select accounts.id, sessions.token_hash
        from hoc_vui_private.accounts as accounts
        join hoc_vui_private.challenge_preferences as preferences on preferences.student_id = accounts.id
        join hoc_vui_private.auth_sessions as sessions on sessions.account_id = accounts.id
        where accounts.role = 'student' and accounts.active = true
          and sessions.mode = 'full' and sessions.revoked_at is null and sessions.expires_at > now()
        order by accounts.id
        limit 1
      `;
      const selected = identity[0];
      if (!selected) throw new Error('local_synthetic_identity_missing');

      const authTimings: QueryTiming[] = [];
      const authDb = timedDatabase(base, authTimings);
      const authRepository = new PostgresAuthRepository(authDb);
      await authRepository.findSessionContext(selected.token_hash);

      const todayTimings: QueryTiming[] = [];
      const todayDb = timedDatabase(base, todayTimings);
      const todayAuthoring = new PostgresAuthoringRepository(todayDb);
      const todayPlay = new PostgresPlayRepository(todayDb);
      const today = createChallengePlayService({
        authoring: todayAuthoring,
        play: todayPlay,
        clock: () => new Date('2026-09-19T08:00:00.000Z'),
        activeStudentCount: async () => 0,
        idFactory: () => 'local-timing-id',
      });
      const todayResult = await today.getToday(selected.id);
      expect(todayResult.ok).toBe(true);

      const weekTimings: QueryTiming[] = [];
      const weekDb = timedDatabase(base, weekTimings);
      const weekAuthoring = new PostgresAuthoringRepository(weekDb);
      const weekPlay = new PostgresPlayRepository(weekDb);
      const week = createChallengeWeeklyService({
        play: weekPlay,
        authoring: weekAuthoring,
        now: () => new Date('2026-09-19T08:00:00.000Z'),
        activeStudentIds: () => new PostgresAuthRepository(weekDb).listActiveStudentIds(),
      });
      const weekResult = await week.getWeekly(selected.id);
      expect(weekResult.ok).toBe(true);

      console.log(JSON.stringify({
        target: 'isolated local PostgreSQL 17.11; pool max from HOC_VUI_DB_POOL_MAX',
        auth: snapshot(authTimings),
        today: snapshot(todayTimings),
        week: snapshot(weekTimings),
      }));
    } finally {
      await base.end({ timeout: 5 });
    }
  });
});

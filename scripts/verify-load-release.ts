// Local-only release fixture and HTTP/SQL verification. Never accepts a cloud database.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { getDefaultApp } from '../server/app';
import { createEdgeHandler } from '../supabase/functions/api/index';
import { PostgresAuthoringRepository } from '../server/challenge/postgresAuthoringRepository';
import { PostgresPlayRepository } from '../server/challenge/postgresPlayRepository';
import { localChallengeDate, challengeWeekBounds } from '../server/challenge/roundRules';
import { percentile } from './measure-load-performance.mjs';

const target = new URL(process.env.HOC_VUI_DATABASE_URL ?? '');
assert.equal(target.hostname, '127.0.0.1');
assert.equal(target.port, '55432');
assert.equal(target.pathname, '/hoc_vui_load_test');
const { app, db } = await getDefaultApp();
const identity = await db`select current_database() as name, inet_server_addr()::text as host`;
assert.equal(identity[0].name, 'hoc_vui_load_test');
assert.equal(identity[0].host, '127.0.0.1/32');
const handler = createEdgeHandler(async () => ({ app }));
let statements = 0;
db.options.debug = () => { statements += 1; };
const server = createServer(async (incoming, outgoing) => {
  const chunks: Buffer[] = [];
  for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
  const request = new Request(`http://127.0.0.1:55480${incoming.url}`, {
    method: incoming.method, headers: incoming.headers as Record<string, string>,
    ...(chunks.length ? { body: Buffer.concat(chunks) } : {}),
  });
  statements = 0;
  const response = await handler(request);
  outgoing.writeHead(response.status, { ...Object.fromEntries(response.headers), 'X-Local-SQL-Count': String(statements) });
  outgoing.end(await response.text());
});
await new Promise<void>((resolve) => server.listen(55480, '127.0.0.1', resolve));
async function send(path: string, token = '', body?: unknown) {
  const response = await fetch(`http://127.0.0.1:55480/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  assert.equal(response.status, 200, `${path}: ${result.code}`);
  return result;
}
const admin = await send('/auth/admin/login', '', { username: 'admin', password: '123456@' });
const suffix = Date.now().toString(36);
const ids: string[] = [];
const tokens: string[] = [];
const pin = '246810';
for (let index = 0; index < 31; index += 1) {
  const username = `qa${suffix}${index}`;
  const created = await send('/admin/students', admin.accessToken, { username, displayName: `Synthetic QA ${index}` });
  ids.push(created.account.id);
  const login = await send('/auth/student/login', '', { username, pin: '123456' });
  const ready = await send('/auth/student/change-pin', login.accessToken, { currentPin: '123456', newPin: pin });
  tokens.push(ready.accessToken);
}
const now = new Date();
const today = localChallengeDate(now);
const { start } = challengeWeekBounds(now);
const authoring = new PostgresAuthoringRepository(db);
const play = new PostgresPlayRepository(db);
for (let day = 0; day < 7; day += 1) {
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + day);
  const roundDate = date.toISOString().slice(0, 10);
  await play.insertRoundIfAbsent({ roundDate, timezone: 'Asia/Ho_Chi_Minh', targetContributions: 30,
    closesAt: new Date(`${roundDate}T23:59:59+07:00`).toISOString() });
  for (let index = 0; index < 5; index += 1) {
    const id = randomUUID();
    const authorId = ids[index + 1];
    const question = await authoring.insertPendingQuestion({ id, authorId,
      sourceFactId: 'map', sourceVersion: 'challenge-facts-v1', lessonId: 'lesson-01', lessonTitle: 'Synthetic local QA',
      prompt: 'Synthetic QA: Bản đồ biểu diễn điều gì?',
      options: [{ id: 'a', text: 'Một khu vực thu nhỏ' }, { id: 'b', text: 'Một bài hát' }, { id: 'c', text: 'Một món ăn' }, { id: 'd', text: 'Một trò chơi' }],
      correctOptionId: 'a', explanation: 'Synthetic QA fixture for release verification.', createdLocalDate: roundDate,
      createdAt: now.toISOString(), updatedAt: now.toISOString() });
    assert.notEqual(question, 'quota_exceeded');
    await authoring.reviewQuestion(authorId, id, 1, { decision: 'approve' });
    await play.insertRoundItem({ roundDate, questionId: id, authorId, position: index + 1,
      featuredAt: now.toISOString(), selectionSeedVersion: 'challenge-round-v1' });
    await authoring.markQuestionFeatured(id, now.toISOString());
    if (roundDate < today) await authoring.markQuestionClosed(id, now.toISOString());
  }
  if (roundDate < today) await play.closeRound(roundDate, now.toISOString());
}
const event = { eventId: randomUUID(), runId: randomUUID(), sequence: 1, type: 'run_started',
  lessonId: 'lesson-01', lessonVersion: 1, deviceId: 'synthetic-release', generation: 0 };
await send('/me/events', tokens[0], { events: [event] });
const reports = [];
for (const route of ['/me/friends', '/me/progress-board', '/me/challenge/today', '/me/challenge/week']) {
  const samples = [];
  for (let iteration = 0; iteration < 31; iteration += 1) {
    const began = performance.now();
    const response = await fetch(`http://127.0.0.1:55480/api${route}`, { headers: { Authorization: `Bearer ${tokens[0]}` } });
    const body = await response.json();
    const totalMs = performance.now() - began;
    assert.equal(response.status, 200, `${route}: ${body.code}`);
    if (route.endsWith('/today')) assert.ok(!JSON.stringify(body).includes('correctOptionId'));
    samples.push({ iteration, totalMs, sql: Number(response.headers.get('X-Local-SQL-Count')), status: response.status });
  }
  reports.push({ route, firstOpen: samples[0], warmSamples: 30,
    warmP95Ms: percentile(samples.slice(1).map(s => s.totalMs), .95), samples });
}
await mkdir('data/local/load-release', { recursive: true });
await writeFile('data/local/load-release/browser-session.json', JSON.stringify({ token: tokens[0], secondToken: tokens[1], studentId: ids[0] }), { mode: 0o600 });
await writeFile('docs/executor/load-performance/local-http-sql.json', JSON.stringify({ environment: 'PostgreSQL 17 localhost / Node HTTP real Edge handler',
  database: 'hoc_vui_load_test', fixture: { studentsCreated: 31, questions: 35, rounds: 7 }, measuredAt: new Date().toISOString(), reports }, null, 2));
console.log(JSON.stringify({ ready: true, reports: reports.map(({ samples, ...rest }) => rest) }));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, async () => { server.close(); await db.end(); process.exit(0); });

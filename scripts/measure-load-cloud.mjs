// Explicitly approved Học Vui release target; synthetic session only, no payloads retained.
import { readFile, writeFile } from 'node:fs/promises';
import { percentile, parseServerTiming } from './measure-load-performance.mjs';
const session = JSON.parse(await readFile('data/local/load-release/cloud-session.json', 'utf8'));
if (session.base !== 'https://tvlpabqkternfvsxqovi.supabase.co/functions/v1/api' || !session.username.startsWith('qa')) throw new Error('Unapproved target/session');
const count = Number(process.argv[2] ?? 31);
if (!Number.isInteger(count) || count < 1 || count > 31) throw new Error('Invalid sample budget');
const output = process.argv[3];
if (!output?.startsWith('docs/executor/load-performance/')) throw new Error('Invalid report path');
const reports = [];
for (const route of ['/me/friends', '/me/progress-board', '/me/challenge/today', '/me/challenge/week']) {
  const samples = [];
  for (let iteration = 0; iteration < count; iteration++) {
    const start = performance.now();
    try {
      const response = await fetch(session.base + route, { signal: AbortSignal.timeout(20000),
        headers: { Authorization: `Bearer ${session.token}`, Origin: 'https://4a14.web.app' } });
      const body = await response.json();
      const totalMs = performance.now() - start;
      const sample = { iteration, totalMs, status: response.status, serverTiming: parseServerTiming(response.headers.get('Server-Timing')),
        noStore: response.headers.get('Cache-Control') === 'no-store',
        ...(response.ok ? {} : { code: body.code, reason: body.reason }) };
      if (route.endsWith('/today') && response.ok && JSON.stringify(body).includes('correctOptionId')) throw new Error('answer_leak');
      if (route.endsWith('/progress-board') && response.ok && body.data?.studentId && body.data.studentId !== session.studentId) throw new Error('account_isolation');
      samples.push(sample);
    } catch (error) {
      if (['answer_leak', 'account_isolation'].includes(error.message)) throw error;
      samples.push({ iteration, totalMs: performance.now() - start, status: null, error: error.name });
    }
  }
  const warm = samples.slice(1);
  reports.push({ route, firstOpen: samples[0], warmSamples: warm.length,
    warmP95Ms: warm.length ? percentile(warm.map(s => s.totalMs), .95) : null,
    errors: samples.filter(s => s.status !== 200).length, samples });
  await writeFile(output, JSON.stringify({ environment: 'host to Supabase Edge production, synthetic account, sequential HTTP body-complete timing',
    measuredAt: new Date().toISOString(), coldEdge: 'NOT_ESTABLISHED', reports }, null, 2));
  console.log(JSON.stringify(reports.at(-1), (key, value) => key === 'samples' ? undefined : value));
}

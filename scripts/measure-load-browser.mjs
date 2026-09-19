// Uses an isolated Chromium context and a synthetic session supplied in an ignored file.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { percentile } from './measure-load-performance.mjs';
const { chromium } = await import(pathToFileURL(process.env.HOC_VUI_PLAYWRIGHT_MODULE).href);
const session = JSON.parse(await readFile(process.env.HOC_VUI_QA_SESSION_FILE, 'utf8'));
const target = process.env.HOC_VUI_QA_BROWSER_URL;
if (!['http://127.0.0.1:55481', 'https://4a14.web.app'].includes(target)) throw new Error('Unapproved browser target');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
await page.addInitScript(token => {
  sessionStorage.setItem('hoc_vui_session_token', token);
  document.addEventListener('click', () => { window.__qaClickAt = performance.now(); }, true);
}, session.token);
const samples = [];
const errors = [];
page.on('pageerror', error => errors.push(error.name));
try {
  await page.goto(target, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Bạn bè', exact: true }).waitFor({ timeout: 30000 });
  const flows = [
    { name: 'friends', open: 'Bạn bè', route: '/me/friends', ready: '[data-friend-row]', close: 'Đóng danh sách bạn bè' },
    { name: 'board', open: 'Bảng tiến bộ', route: '/me/progress-board', ready: '[data-progress-map]', close: 'Đóng Bảng tiến bộ' },
    { name: 'today', open: 'Thách đố', route: '/me/challenge/today', ready: '[data-challenge-dialog]', close: 'Đóng Thách đố' },
  ];
  for (const flow of flows) {
    if (!await page.getByRole('button', { name: flow.open, exact: true }).count()) {
      samples.push({ flow: flow.name, status: 'ROLLOUT_DISABLED' });
      continue;
    }
    for (let iteration = 0; iteration < 31; iteration++) {
      const responsePromise = page.waitForResponse(r => r.url().endsWith(flow.route) && r.request().method() === 'GET', { timeout: 30000 });
      await page.getByRole('button', { name: flow.open, exact: true }).click();
      const response = await responsePromise;
      await response.finished();
      if (response.status() !== 200) throw new Error(`${flow.name} HTTP ${response.status()}`);
      await page.locator(flow.ready).first().waitFor();
      if (flow.name === 'board') await page.locator('[data-progress-board-state="loading"]').waitFor({ state: 'detached' });
      if (flow.name === 'today') await page.getByText('Đang mở vòng Thách đố cho lớp…', { exact: true }).waitFor({ state: 'detached' });
      const elapsedMs = await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - window.__qaClickAt)))));
      samples.push({ flow: flow.name, iteration, phase: iteration === 0 ? 'first-open' : 'warm', status: response.status(), elapsedMs });
      if (flow.name === 'today') {
        const weeklyPromise = page.waitForResponse(r => r.url().endsWith('/me/challenge/week') && r.request().method() === 'GET');
        await page.getByRole('tab', { name: 'Tuần này' }).click();
        const weekly = await weeklyPromise;
        await weekly.finished();
        if (weekly.status() !== 200) throw new Error(`week HTTP ${weekly.status()}`);
        await page.locator('[data-challenge-weekly-map]').waitFor();
        const weekMs = await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now() - window.__qaClickAt)))));
        samples.push({ flow: 'week', iteration, phase: iteration === 0 ? 'first-open' : 'warm', status: weekly.status(), elapsedMs: weekMs });
      }
      await page.getByRole('button', { name: flow.close, exact: true }).click();
    }
  }
  const summary = [...new Set(samples.map(s => s.flow))].map(flow => {
    const warm = samples.filter(s => s.flow === flow && s.phase === 'warm');
    return { flow, warmSamples: warm.length, warmP95Ms: warm.length ? percentile(warm.map(s => s.elapsedMs), .95) : null,
      firstOpenMs: samples.find(s => s.flow === flow && s.phase === 'first-open')?.elapsedMs ?? null };
  });
  const report = { target, measuredAt: new Date().toISOString(), browser: await browser.version(),
    method: 'captured click event to successful fresh response body completion, ready DOM, and two animation frames; isolated headless Chrome desktop; cold Edge not established',
    summary, errors, samples };
  await writeFile(process.env.HOC_VUI_QA_OUTPUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ summary, errors }));
} finally { await browser.close(); }

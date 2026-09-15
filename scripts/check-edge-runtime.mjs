#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entrypoint = path.join(projectRoot, 'supabase/functions/api/index.ts');
const importMap = path.join(projectRoot, 'supabase/functions/api/deno.json');
const allowedOrigin = 'https://hoc-vui.web.app';
const startupTimeoutMs = 15_000;
const cleanupTimeoutMs = 3_000;

const childEnv = {
  HOME: process.env.HOME,
  PATH: process.env.PATH,
  TMPDIR: process.env.TMPDIR,
  DENO_DIR: process.env.DENO_DIR,
  NO_COLOR: '1',
  HOC_VUI_ALLOWED_ORIGINS: allowedOrigin,
};

for (const key of Object.keys(childEnv)) {
  if (childEnv[key] === undefined) delete childEnv[key];
}

const child = spawn('deno', [
  'serve',
  '--unstable-sloppy-imports',
  '--import-map', importMap,
  '--allow-env=HOC_VUI_ALLOWED_ORIGINS',
  '--allow-net=127.0.0.1',
  '--host', '127.0.0.1',
  '--port', '0',
  entrypoint,
], {
  cwd: projectRoot,
  env: childEnv,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let settled = false;
let cleanupFailed = false;
let startupBuffer = '';

const exitPromise = new Promise((resolve) => {
  child.once('exit', (code, signal) => resolve({ code, signal }));
});

function waitForListeningUrl() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Deno did not report a listening port before the startup timeout.')), startupTimeoutMs);
    const inspect = (chunk) => {
      startupBuffer = `${startupBuffer}${chunk}`.slice(-8_192);
      const match = startupBuffer.match(/https?:\/\/127\.0\.0\.1:(\d+)\/?/);
      if (!match) return;
      clearTimeout(timer);
      child.stdout.off('data', inspect);
      child.stderr.off('data', inspect);
      resolve(`http://127.0.0.1:${match[1]}`);
    };
    child.stdout.on('data', inspect);
    child.stderr.on('data', inspect);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(new Error(`Unable to start Deno: ${error.message}`));
    });
    exitPromise.then(({ code, signal }) => {
      clearTimeout(timer);
      reject(new Error(`Deno exited before listening (code ${String(code)}, signal ${String(signal)}).`));
    });
  });
}

async function terminateChild() {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (!child.kill('SIGTERM')) {
    cleanupFailed = true;
    return;
  }

  const exited = await Promise.race([
    exitPromise.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), cleanupTimeoutMs)),
  ]);
  if (exited) return;

  cleanupFailed = true;
  child.kill('SIGKILL');
  await Promise.race([
    exitPromise,
    new Promise((resolve) => setTimeout(resolve, cleanupTimeoutMs)),
  ]);
}

try {
  const baseUrl = await waitForListeningUrl();
  const response = await fetch(`${baseUrl}/api/auth/me`, {
    method: 'OPTIONS',
    headers: {
      Origin: allowedOrigin,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Authorization,Content-Type,X-Parent-Grant',
    },
    signal: AbortSignal.timeout(5_000),
  });

  const expectedHeaders = {
    'access-control-allow-origin': allowedOrigin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'Authorization,Content-Type,X-Parent-Grant',
    vary: 'Origin',
  };

  if (response.status !== 204) throw new Error(`Expected HTTP 204, received ${response.status}.`);
  for (const [name, expected] of Object.entries(expectedHeaders)) {
    const actual = response.headers.get(name);
    if (actual !== expected) throw new Error(`Unexpected ${name} header.`);
  }

  settled = true;
} catch (error) {
  process.exitCode = 1;
  console.error(`Edge runtime smoke failed: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  await terminateChild();
  if (cleanupFailed || child.exitCode === null && child.signalCode === null) {
    process.exitCode = 1;
    console.error('Edge runtime smoke failed: Deno child cleanup did not complete safely.');
  }
}

if (settled && process.exitCode !== 1) {
  console.log('Edge runtime smoke passed: Deno served the real entrypoint and returned exact allowlisted CORS preflight headers.');
}

#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(projectRoot, 'firebase.json');

function fail(message) {
  throw new Error(`Firebase Hosting validation failed: ${message}`);
}

function headerValue(entry, key) {
  const header = entry.headers?.find((item) => item.key?.toLowerCase() === key.toLowerCase());
  return header?.value ?? '';
}

function requireHeader(entries, source, predicate, description) {
  const entry = entries.find((item) => item.source === source);
  if (!entry) fail(`${description} header is missing for ${source}`);
  const value = headerValue(entry, 'Cache-Control');
  if (!predicate(value)) fail(`${description} Cache-Control is invalid: ${value || '(missing)'}`);
  return value;
}

try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const hosting = config.hosting;
  if (!hosting || typeof hosting !== 'object' || Array.isArray(hosting)) fail('hosting configuration is missing');
  if (hosting.public !== 'dist') fail('hosting.public must be "dist"');

  const ignores = new Set(hosting.ignore ?? []);
  for (const requiredIgnore of ['firebase.json', '**/.*', '**/node_modules/**']) {
    if (!ignores.has(requiredIgnore)) fail(`hosting.ignore must include ${requiredIgnore}`);
  }

  const spaRewrite = hosting.rewrites?.find(
    (rewrite) => rewrite.source === '**' && rewrite.destination === '/index.html',
  );
  if (!spaRewrite) fail('SPA rewrite ** -> /index.html is missing');
  if (hosting.rewrites.some((rewrite) => rewrite.function || rewrite.run || rewrite.source === '/api/**')) {
    fail('Firebase Functions or API rewrites are not allowed');
  }

  const headers = hosting.headers ?? [];
  const serviceWorkerCacheControl = requireHeader(
    headers,
    '/sw.js',
    (value) => value.toLowerCase().includes('no-cache'),
    'Service Worker no-cache',
  );
  const immutableCacheControl = 'public, max-age=31536000, immutable';
  for (const extension of ['js', 'css']) {
    const source = `**/*-*.${extension}`;
    requireHeader(
      headers,
      source,
      (value) => value.toLowerCase().replace(/\s+/g, ' ').trim() === immutableCacheControl,
      `hashed ${extension.toUpperCase()} asset immutable`,
    );
  }

  console.log(JSON.stringify({
    config: path.relative(projectRoot, configPath),
    public: hosting.public,
    spaRewrite: '/index.html',
    serviceWorkerCacheControl,
    hashedAssetCacheControl: immutableCacheControl,
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

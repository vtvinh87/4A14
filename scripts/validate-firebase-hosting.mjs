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
  const immutableCacheControl = 'public, max-age=31536000, immutable';
  const hosting = Array.isArray(config.hosting) ? config.hosting : config.hosting ? [config.hosting] : [];
  if (hosting.length === 0) fail('hosting configuration is missing');

  const validatedSites = hosting.map((site) => {
    const label = site && typeof site === 'object' ? site.target ?? site.site ?? 'default' : 'invalid';
    if (!site || typeof site !== 'object') fail(`hosting configuration is invalid for ${label}`);
    if (site.public !== 'dist') fail(`hosting.public must be "dist" for ${label}`);

    const ignores = new Set(site.ignore ?? []);
    for (const requiredIgnore of ['firebase.json', '**/.*', '**/node_modules/**']) {
      if (!ignores.has(requiredIgnore)) fail(`hosting.ignore must include ${requiredIgnore} for ${label}`);
    }

    const spaRewrite = site.rewrites?.find(
      (rewrite) => rewrite.source === '**' && rewrite.destination === '/index.html',
    );
    if (!spaRewrite) fail(`SPA rewrite ** -> /index.html is missing for ${label}`);
    if (site.rewrites.some((rewrite) => rewrite.function || rewrite.run || rewrite.source === '/api/**')) {
      fail(`Firebase Functions or API rewrites are not allowed for ${label}`);
    }

    const headers = site.headers ?? [];
    const serviceWorkerCacheControl = requireHeader(
      headers,
      '/sw.js',
      (value) => value.toLowerCase().includes('no-cache'),
      `Service Worker no-cache for ${label}`,
    );
    for (const extension of ['js', 'css']) {
      const source = `**/*-*.${extension}`;
      requireHeader(
        headers,
        source,
        (value) => value.toLowerCase().replace(/\s+/g, ' ').trim() === immutableCacheControl,
        `hashed ${extension.toUpperCase()} asset immutable for ${label}`,
      );
    }
    return { label, serviceWorkerCacheControl };
  });

  console.log(JSON.stringify({
    config: path.relative(projectRoot, configPath),
    sites: validatedSites.map(({ label }) => label),
    public: 'dist',
    spaRewrite: '/index.html',
    serviceWorkerCacheControl: validatedSites[0].serviceWorkerCacheControl,
    hashedAssetCacheControl: immutableCacheControl,
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

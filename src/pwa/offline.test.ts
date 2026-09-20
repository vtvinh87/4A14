import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createServiceWorkerSource, getInitialOfflineStatus, offlineStatusCopy } from './offline';
import viteConfigSource from '../../vite.config.ts?raw';

describe('offline readiness', () => {
  it('includes the full local sourced-v2 pilot pack without changing production acceptance', () => {
    const legacyPilotAssets = [
      '/audio/v1/sfx/ui-tap__v01.mp3',
      '/audio/v1/sfx/answer-correct__v01.mp3',
      '/audio/v1/sfx/answer-retry__v01.mp3',
      '/audio/v1/sfx/stamp-press__v01.mp3',
      '/audio/v1/sfx/pet-fox__v01.mp3',
      '/audio/v1/music/music-home__v01.mp3',
    ];

    const pilotManifestSource = readFileSync(resolve(process.cwd(), 'design/audio/qa/sourced-v1-runtime-pilot.json'), 'utf8');
    const fullPilotManifest = JSON.parse(readFileSync(resolve(process.cwd(), 'design/audio/qa/sourced-v2-runtime-pilot.json'), 'utf8')) as { assets: Array<{ relativeUrl: string; runtimeMode: string }> };
    expect(viteConfigSource).toContain('sourced-v1-runtime-pilot.json');
    expect(viteConfigSource).toContain('sourced-v2-runtime-pilot.json');
    expect(viteConfigSource).toContain('PILOT_AUDIO_ENTRIES');
    for (const asset of legacyPilotAssets) expect(pilotManifestSource).toContain(asset);
    expect(fullPilotManifest.assets).toHaveLength(67);
    expect(fullPilotManifest.assets.filter((asset) => asset.relativeUrl.startsWith('/audio/v2/'))).toHaveLength(61);
    expect(fullPilotManifest.assets.every((asset) => asset.runtimeMode === 'pilot')).toBe(true);
  });

  it('precaches all 29 lesson artworks with SHA-256 version entries', () => {
    const artAllowlist = viteConfigSource.match(/const LOCAL_ART_URLS = \[(.*?)\];/s)?.[1] ?? '';
    const artVersions = viteConfigSource.match(/const LOCAL_ART_VERSIONS = \[(.*?)\];/s)?.[1] ?? '';
    const urls = Array.from({ length: 29 }, (_, index) => `/art/lessons/lesson-${String(index + 1).padStart(2, '0')}.png`);
    for (const url of urls) {
      expect(artAllowlist).toContain(`'${url}'`);
      expect(artVersions).toMatch(new RegExp(`${url.replace(/\./g, '\\.')}:[a-f0-9]{64}`));
    }
    const worker = createServiceWorkerSource('lesson-artwork-test', urls);
    for (const url of urls) expect(worker).toContain(url);
    expect(worker).not.toContain('/art/fox-pet.glb');
  });
  it('keeps local development distinct from a production offline check', () => {
    expect(getInitialOfflineStatus(false)).toBe('development');
    expect(getInitialOfflineStatus(true)).toBe('unsupported');
    expect(offlineStatusCopy('development').label).toBe('Bản local');
  });

  it('describes the cached pet resource as artwork instead of a GLB dependency', () => {
    expect(offlineStatusCopy('checking').detail).toContain('artwork pet');
    expect(offlineStatusCopy('ready').detail).toContain('artwork pet');
    expect(offlineStatusCopy('checking').detail).not.toContain('pet GLB');
    expect(offlineStatusCopy('ready').detail).not.toContain('pet GLB');
  });

  it('generates a versioned worker that only announces readiness after precache', () => {
    const source = createServiceWorkerSource('hoc-vui-offline-test', ['/', '/assets/app.js']);

    expect(source).toContain('hoc-vui-offline-test');
    expect(source).toContain('cache.addAll(PRECACHE_URLS)');
    expect(source).toContain('OFFLINE_READY');
    expect(source).toContain("missing.length ? 'OFFLINE_ERROR' : 'OFFLINE_READY'");
    expect(source).toContain('self.clients.claim()');
    expect(source).toContain('PRECACHE_URLS.includes(new URL(request.url).pathname)');
    expect(source).toContain('cache.match(url)');
    expect(source).not.toContain('self.skipWaiting');
    expect(source).not.toContain('location.reload');
  });

  it('keeps the legacy GLB out of the active production art allowlist', () => {
    const artAllowlist = viteConfigSource.match(/const LOCAL_ART_URLS = \[(.*?)\];/s)?.[1] ?? '';
    const artVersions = viteConfigSource.match(/const LOCAL_ART_VERSIONS = \[(.*?)\];/s)?.[1] ?? '';

    expect(artAllowlist).toContain("'/art/fox-pet-alpha.png'");
    expect(artAllowlist).not.toContain("'/art/fox-pet.glb'");
    expect(artVersions).not.toContain("'/art/fox-pet.glb:");
    expect(createServiceWorkerSource('hoc-vui-offline-art-test', artAllowlist.match(/'[^']+'/g)?.map((entry) => entry.slice(1, -1)) ?? [])).not.toContain('/art/fox-pet.glb');
  });

  it('precaches the reward artwork pack used by the passport view', () => {
    const artAllowlist = viteConfigSource.match(/const LOCAL_ART_URLS = \[(.*?)\];/s)?.[1] ?? '';
    const artVersions = viteConfigSource.match(/const LOCAL_ART_VERSIONS = \[(.*?)\];/s)?.[1] ?? '';
    const rewardAssets = ['passport-cover-lettered', 'start-journey'];

    expect(artAllowlist).toContain("['passport-cover-lettered', 'start-journey']");
    expect(artAllowlist).toContain('`/art/reward/${id}.png`');
    for (const asset of rewardAssets) {
      expect(artVersions).toContain(`/art/reward/${asset}.png:`);
    }
  });

  it('precaches all 29 artifact stamps and the three unlockable pet artworks', () => {
    const artAllowlist = viteConfigSource.match(/const LOCAL_ART_URLS = \[(.*?)\];/s)?.[1] ?? '';
    const artVersions = viteConfigSource.match(/const LOCAL_ART_VERSIONS = \[(.*?)\];/s)?.[1] ?? '';
    expect(artAllowlist).toContain('Array.from({ length: 29 }, (_, index) => `/art/stamps/stamp-');
    for (let index = 1; index <= 29; index += 1) {
      const id = String(index).padStart(2, '0');
      expect(artVersions).toMatch(new RegExp(`/art/stamps/stamp-${id}\\.png:[a-f0-9]{64}`));
    }
    expect(artAllowlist).toContain("['voi-nui-xanh', 'cu-tim-tham-hiem', 'rong-ngoc']");
    for (const asset of ['voi-nui-xanh', 'cu-tim-tham-hiem', 'rong-ngoc']) {
      expect(artVersions).toMatch(new RegExp(`/art/pets/${asset}\\.png:[a-f0-9]{64}`));
    }
  });
  it('precaches the upcoming Journey feature artwork with version hashes', () => {
    const artAllowlist = viteConfigSource.match(/const LOCAL_ART_URLS = \[(.*?)\];/s)?.[1] ?? '';
    const artVersions = viteConfigSource.match(/const LOCAL_ART_VERSIONS = \[(.*?)\];/s)?.[1] ?? '';

    expect(artAllowlist).toContain("['sound', 'settings', 'parent', 'leaderboard', 'challenge', 'friends', 'profile', 'logout']");
    for (const asset of ['leaderboard', 'challenge']) {
      expect(artVersions).toMatch(new RegExp(`/art/hud/${asset}\\.png:[a-f0-9]{64}`));
    }
  });

  it('precaches the single illustrated progress map with a matching version hash', () => {
    const artAllowlist = viteConfigSource.match(/const LOCAL_ART_URLS = \[(.*?)\];/s)?.[1] ?? '';
    const artVersions = viteConfigSource.match(/const LOCAL_ART_VERSIONS = \[(.*?)\];/s)?.[1] ?? '';
    const url = '/art/progress/vietnam-progress-map-illustrated.png';
    const expectedHash = artVersions.match(new RegExp(url.replace(/\./g, '\\.') + ':([a-f0-9]{64})'))?.[1];

    expect(artAllowlist).toContain(`'${url}'`);
    expect(expectedHash).toMatch(/^[a-f0-9]{64}$/);
    const bytes = readFileSync(resolve(process.cwd(), 'public', url.slice(1)));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(expectedHash);
    expect(artAllowlist).not.toContain("'/art/progress/vietnam-progress-map.svg'");
    expect(artAllowlist).not.toContain("'/art/progress/adventure-paper-texture.png'");
  });

  it('precaches the complete supporting-art pack with matching runtime hashes', () => {
    const artAllowlist = viteConfigSource.match(/const LOCAL_ART_URLS = \[(.*?)\];/s)?.[1] ?? '';
    const artVersions = viteConfigSource.match(/const LOCAL_ART_VERSIONS = \[(.*?)\];/s)?.[1] ?? '';
    const supportAssets = ['fox-welcome', 'fox-guide', 'region-local', 'region-north', 'region-delta', 'region-central', 'region-highlands', 'region-south', 'landmark-lung-cu', 'landmark-khue-van-cac', 'landmark-hoa-lu', 'landmark-kim-lien', 'landmark-hue', 'landmark-hoi-an', 'landmark-tay-nguyen-rong-house', 'landmark-mekong-floating-market', 'panel-foliage', 'compass-start', 'book-progress'];

    expect(artAllowlist).toContain("['fox-welcome', 'fox-guide', 'region-local', 'region-north', 'region-delta', 'region-central', 'region-highlands', 'region-south', 'landmark-lung-cu', 'landmark-khue-van-cac', 'landmark-hoa-lu', 'landmark-kim-lien', 'landmark-hue', 'landmark-hoi-an', 'landmark-tay-nguyen-rong-house', 'landmark-mekong-floating-market', 'panel-foliage', 'compass-start', 'book-progress']");
    for (const asset of supportAssets) {
      const url = `/art/progress/support/${asset}.webp`;
      const expectedHash = artVersions.match(new RegExp(url.replace(/\./g, '\\.') + ':([a-f0-9]{64})'))?.[1];
      const bytes = readFileSync(resolve(process.cwd(), 'public', url.slice(1)));
      expect(expectedHash).toMatch(/^[a-f0-9]{64}$/);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(expectedHash);
      expect(artAllowlist).toContain('`/art/progress/support/${id}.webp`');
    }
    expect(artAllowlist).not.toContain('contact-sheet');
    expect(artAllowlist).not.toContain('/design/');
  });

  it('keeps the upcoming Journey PNG bytes aligned with their offline version hashes', () => {
    const artVersions = viteConfigSource.match(/const LOCAL_ART_VERSIONS = \[(.*?)\];/s)?.[1] ?? '';
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    for (const asset of ['leaderboard', 'challenge']) {
      const bytes = readFileSync(resolve(process.cwd(), 'public', 'art', 'hud', `${asset}.png`));
      const expectedHash = artVersions.match(new RegExp(`/art/hud/${asset}\\.png:([a-f0-9]{64})`))?.[1];

      expect(bytes.subarray(0, 8)).toEqual(pngSignature);
      expect(bytes[25]).toBe(6);
      expect(expectedHash).toBe(createHash('sha256').update(bytes).digest('hex'));
    }
  });

  it('precaches the friends and account-menu PNGs with matching RGBA bytes and version hashes', () => {
    const artAllowlist = viteConfigSource.match(/const LOCAL_ART_URLS = \[(.*?)\];/s)?.[1] ?? '';
    const artVersions = viteConfigSource.match(/const LOCAL_ART_VERSIONS = \[(.*?)\];/s)?.[1] ?? '';
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    expect(artAllowlist).toContain("['sound', 'settings', 'parent', 'leaderboard', 'challenge', 'friends', 'profile', 'logout']");
    for (const asset of ['friends', 'profile', 'logout']) {
      const bytes = readFileSync(resolve(process.cwd(), 'public', 'art', 'hud', `${asset}.png`));
      const expectedHash = artVersions.match(new RegExp(`/art/hud/${asset}\\.png:([a-f0-9]{64})`))?.[1];

      expect(bytes.subarray(0, 8)).toEqual(pngSignature);
      expect(bytes[25]).toBe(6);
      expect(expectedHash).toBe(createHash('sha256').update(bytes).digest('hex'));
    }
  });

  it('precaches the manifest and launcher assets without adding API routes', () => {
    const pwaAllowlist = viteConfigSource.match(/const LOCAL_PWA_URLS = \[(.*?)\];/s)?.[1] ?? '';
    const pwaUrls = ['/manifest.webmanifest', '/icons/favicon-32.png', '/icons/icon-180.png', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-512-maskable.png'];
    for (const url of pwaUrls) expect(pwaAllowlist).toContain(`'${url}'`);
    const worker = createServiceWorkerSource('hoc-vui-pwa-test', pwaUrls);
    for (const url of pwaUrls) expect(worker).toContain(url);
    expect(worker).not.toContain('/api/');
  });
});

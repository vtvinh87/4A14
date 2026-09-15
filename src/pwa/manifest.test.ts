import { describe, expect, it } from 'vitest';
import indexHtmlSource from '../../index.html?raw';
import manifestSource from '../../public/manifest.webmanifest?raw';
import viteConfigSource from '../../vite.config.ts?raw';

const manifest = JSON.parse(manifestSource) as {
  id?: string;
  name?: string;
  short_name?: string;
  lang?: string;
  start_url?: string;
  scope?: string;
  display?: string;
  orientation?: string;
  icons?: Array<{ src?: string; sizes?: string; type?: string; purpose?: string }>;
};

describe('PWA install contract', () => {
  it('declares a Vietnamese standalone app with regular and maskable launcher icons', () => {
    expect(manifest.id).toBe('/');
    expect(manifest.name).toBe('4A14 - Lịch sử & Địa Lý 4');
    expect(manifest.short_name).toBe('4A14');
    expect(manifest.lang).toBe('vi');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('any');
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192', type: 'image/png' }),
      expect.objectContaining({ sizes: '512x512', type: 'image/png' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
    ]));
  });

  it('links the browser, Apple and mobile install metadata to local assets', () => {
    expect(indexHtmlSource).toMatch(/<link rel="manifest" href="\/manifest\.webmanifest"\s*\/?\>/);
    expect(indexHtmlSource).toMatch(/<link rel="icon" type="image\/png" sizes="32x32" href="\/icons\/favicon-32\.png"\s*\/?\>/);
    expect(indexHtmlSource).toMatch(/<link rel="apple-touch-icon" sizes="180x180" href="\/icons\/icon-180\.png"\s*\/?\>/);
    expect(indexHtmlSource).toContain('name="theme-color"');
    expect(indexHtmlSource).toContain('name="mobile-web-app-capable"');
    expect(indexHtmlSource).toContain('name="apple-mobile-web-app-capable"');
    expect(indexHtmlSource).toContain('name="apple-mobile-web-app-title" content="4A14"');
    expect(indexHtmlSource).toContain('<title>4A14 - Lịch sử &amp; Địa Lý 4</title>');
  });

  it('registers every served install asset with a content digest', () => {
    const urls = ['/manifest.webmanifest', '/icons/favicon-32.png', '/icons/icon-180.png', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-512-maskable.png'];
    for (const url of urls) {
      expect(viteConfigSource).toContain(`'${url}'`);
      expect(viteConfigSource).toMatch(new RegExp(`${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:[a-f0-9]{64}`));
    }
  });
});

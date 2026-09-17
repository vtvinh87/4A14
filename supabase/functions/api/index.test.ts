import { beforeEach, describe, expect, it, vi } from 'vitest';
import defaultHandler, { createEdgeHandler, handler, toAppPath } from './index';
import type { AppRequest, AppResponse } from '../../../server/app';

function response(body: Record<string, unknown>, statusCode = 200): AppResponse {
  return {
    statusCode,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': 'hoc_vui_session=opaque-token; Path=/; HttpOnly',
    },
    body,
  };
}

describe('Supabase Edge API adapter', () => {
  beforeEach(() => {
    vi.stubEnv('HOC_VUI_ALLOWED_ORIGINS', 'https://hoc-vui.web.app, http://localhost:8888');
  });

  it('exports the Edge runtime fetch contract', () => {
    expect(defaultHandler).toMatchObject({ fetch: handler });
  });

  it('normalizes the deployed function URL while preserving API routes and query strings', () => {
    expect(toAppPath(new URL('https://project.supabase.co/functions/v1/api/auth/me?range=all'))).toBe('/api/auth/me?range=all');
    expect(toAppPath(new URL('https://project.supabase.co/functions/v1/api/api/auth/me'))).toBe('/api/auth/me');
    expect(toAppPath(new URL('https://project.supabase.co/api/auth/me'))).toBe('/api/auth/me');
  });

  it('translates a JSON request and preserves response headers and body', async () => {
    let received: AppRequest | undefined;
    const app = { handle: vi.fn(async (request: AppRequest) => { received = request; return response({ ok: true, accessToken: 'opaque-token' }); }) };
    const handler = createEdgeHandler(async () => ({ app }));
    const result = await handler(new Request('https://project.supabase.co/functions/v1/api/auth/admin/login?next=1', {
      method: 'POST',
      headers: {
        Origin: 'https://hoc-vui.web.app',
        Authorization: 'Bearer opaque-token',
        'Content-Type': 'application/json',
        'X-Parent-Grant': 'grant-only-in-memory',
      },
      body: JSON.stringify({ username: 'admin', password: 'redacted' }),
    }));

    expect(result.status).toBe(200);
    expect(result.headers.get('Cache-Control')).toBe('no-store');
    expect(result.headers.get('Set-Cookie')).toBe('hoc_vui_session=opaque-token; Path=/; HttpOnly');
    expect(await result.json()).toEqual({ ok: true, accessToken: 'opaque-token' });
    expect(received).toMatchObject({
      method: 'POST',
      path: '/api/auth/admin/login?next=1',
      body: { username: 'admin', password: 'redacted' },
      headers: {
        origin: 'https://hoc-vui.web.app',
        authorization: 'Bearer opaque-token',
        'x-parent-grant': 'grant-only-in-memory',
      },
    });
  });

  it('returns exact-origin CORS preflight headers without dispatching the app', async () => {
    const app = { handle: vi.fn(async () => response({ ok: true })) };
    const handler = createEdgeHandler(async () => ({ app }));
    const result = await handler(new Request('https://project.supabase.co/functions/v1/api/auth/me', {
      method: 'OPTIONS',
      headers: { Origin: 'https://hoc-vui.web.app', 'Access-Control-Request-Method': 'GET' },
    }));

    expect(result.status).toBe(204);
    expect(result.headers.get('Access-Control-Allow-Origin')).toBe('https://hoc-vui.web.app');
    expect(result.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    expect(result.headers.get('Access-Control-Allow-Methods')).toBe('GET,POST,PATCH,PUT,DELETE,OPTIONS');
    expect(result.headers.get('Access-Control-Allow-Headers')).toBe('Authorization,Content-Type,X-Parent-Grant');
    expect(result.headers.get('Access-Control-Max-Age')).toBe('300');
    expect(result.headers.get('Access-Control-Expose-Headers')).toBe('X-Request-Id,Server-Timing');
    expect(result.headers.get('Vary')).toBe('Origin');
    expect(app.handle).not.toHaveBeenCalled();
  });

  it('returns safe request timing diagnostics for an allowed response', async () => {
    const app = { handle: vi.fn(async () => response({ ok: true })) };
    const handler = createEdgeHandler(async () => ({ app }));
    const result = await handler(new Request('https://project.supabase.co/functions/v1/api/auth/me', {
      headers: { Origin: 'https://hoc-vui.web.app' },
    }));

    expect(result.headers.get('X-Request-Id')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(result.headers.get('Server-Timing')).toMatch(/app-load;dur=\d+(\.\d+)?, handler;dur=\d+(\.\d+)?/);
    expect(result.headers.get('Access-Control-Expose-Headers')).toBe('X-Request-Id,Server-Timing');
  });

  it('rejects an unlisted origin before route dispatch', async () => {
    const app = { handle: vi.fn(async () => response({ ok: true })) };
    const handler = createEdgeHandler(async () => ({ app }));
    const result = await handler(new Request('https://project.supabase.co/functions/v1/api/auth/me', {
      method: 'POST',
      headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
      body: '{}',
    }));

    expect(result.status).toBe(403);
    expect(await result.json()).toMatchObject({ ok: false, code: 'forbidden' });
    expect(app.handle).not.toHaveBeenCalled();
  });

  it('rejects a malformed origin before route dispatch', async () => {
    const app = { handle: vi.fn(async () => response({ ok: true })) };
    const handler = createEdgeHandler(async () => ({ app }));
    const result = await handler(new Request('https://project.supabase.co/functions/v1/api/auth/me', {
      method: 'POST',
      headers: { Origin: 'not a valid origin', 'Content-Type': 'application/json' },
      body: '{}',
    }));

    expect(result.status).toBe(403);
    expect(await result.json()).toMatchObject({ ok: false, code: 'forbidden' });
    expect(app.handle).not.toHaveBeenCalled();
  });

  it('supports a non-disposable loader without requiring a dispose callback', async () => {
    const end = vi.fn(async () => undefined);
    const handler = createEdgeHandler(async () => ({ app: { handle: async () => response({ ok: true }) }, db: { end } }));

    const result = await handler(new Request('https://project.supabase.co/functions/v1/api/auth/me'));

    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ ok: true });
    expect(end).not.toHaveBeenCalled();
  });

  it('disposes an owned dependency after the request without replacing the API response on disposal failure', async () => {
    const lifecycle: string[] = [];
    const handler = createEdgeHandler(async () => ({
      app: {
        handle: async () => {
          lifecycle.push('handle');
          return response({ ok: true, result: 'preserved' }, 202);
        },
      },
      dispose: async () => {
        lifecycle.push('dispose');
        throw new Error('dispose failed');
      },
    }));

    const result = await handler(new Request('https://project.supabase.co/functions/v1/api/auth/me'));

    expect(lifecycle).toEqual(['handle', 'dispose']);
    expect(result.status).toBe(202);
    expect(await result.json()).toEqual({ ok: true, result: 'preserved' });
  });

  it('sanitizes dependency errors before returning an unavailable response', async () => {
    const handler = createEdgeHandler(async () => ({ app: { handle: vi.fn(async () => { throw new Error('DATABASE_URL=postgresql://secret'); }) } }));
    const result = await handler(new Request('https://project.supabase.co/functions/v1/api/auth/me'));

    expect(result.status).toBe(503);
    const body = await result.text();
    expect(body).not.toContain('postgresql://secret');
    expect(body).toContain('API');
  });
});

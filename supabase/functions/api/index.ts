import { getDefaultApp, type AppRequest, type AppResponse } from '../../../server/app.ts';
import { getEnv } from '../../../server/runtime/env.ts';

const ALLOWED_METHODS = 'GET,POST,PATCH,PUT,DELETE,OPTIONS';
const ALLOWED_HEADERS = 'Authorization,Content-Type,X-Parent-Grant';

type EdgeApp = { handle: (request: AppRequest) => Promise<AppResponse> };
export type LoadedEdgeApp = {
  app: EdgeApp;
  dispose?: () => void | Promise<void>;
};
type AppLoader = () => Promise<LoadedEdgeApp>;

function configuredOrigins(): string[] {
  return (getEnv('HOC_VUI_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap((value) => {
      try { return [new URL(value).origin]; } catch { return []; }
    });
}

function normalizedOrigin(value: string | null): string | null {
  if (!value) return null;
  try { return new URL(value).origin; } catch { return null; }
}

function isAllowedOrigin(origin: string | null, origins = configuredOrigins()): boolean {
  if (!origin) return true;
  const normalized = normalizedOrigin(origin);
  return normalized !== null && origins.includes(normalized);
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = { Vary: 'Origin' };
  const normalized = normalizedOrigin(origin);
  if (normalized && isAllowedOrigin(normalized)) {
    headers['Access-Control-Allow-Origin'] = normalized;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

function jsonResponse(body: Record<string, unknown>, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(origin),
    },
  });
}

/** Convert both Supabase gateway paths and direct local paths to AppRequest paths. */
export function toAppPath(url: URL): string {
  let pathname = url.pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  const gatewayMatch = pathname.match(/^\/functions\/v1\/[^/]+(\/.*)?$/);
  if (gatewayMatch) pathname = gatewayMatch[1] || '/';
  if (pathname !== '/api' && !pathname.startsWith('/api/')) pathname = `/api${pathname === '/' ? '' : pathname}`;
  return `${pathname}${url.search}`;
}

async function requestBody(request: Request): Promise<unknown> {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') return undefined;
  const text = await request.text();
  if (!text) return undefined;
  try { return JSON.parse(text); } catch { return text; }
}

function appRequestFromWebRequest(request: Request, body: unknown): AppRequest {
  const url = new URL(request.url);
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => { headers[key.toLowerCase()] = value; });
  return { method: request.method, path: toAppPath(url), headers, body };
}

function appResponseToWebResponse(appResponse: AppResponse, origin: string | null): Response {
  const headers = new Headers(appResponse.headers);
  for (const [key, value] of Object.entries(corsHeaders(origin))) headers.set(key, value);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(appResponse.body), { status: appResponse.statusCode, headers });
}

export function createEdgeHandler(loadApp: AppLoader = getDefaultApp): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('Origin');
    if (!isAllowedOrigin(origin)) return jsonResponse({ ok: false, code: 'forbidden', message: 'Yêu cầu không cùng nguồn.' }, 403, origin);
    if (request.method.toUpperCase() === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders(origin),
          'Access-Control-Allow-Methods': ALLOWED_METHODS,
          'Access-Control-Allow-Headers': ALLOWED_HEADERS,
        },
      });
    }

    let dispose: LoadedEdgeApp['dispose'];
    try {
      const loaded = await loadApp();
      dispose = loaded.dispose;
      const { app } = loaded;
      const result = await app.handle(appRequestFromWebRequest(request, await requestBody(request)));
      return appResponseToWebResponse(result, origin);
    } catch {
      return jsonResponse({ ok: false, code: 'unavailable', message: 'API tạm thời chưa sẵn sàng; hãy kiểm tra kết nối rồi thử lại.' }, 503, origin);
    } finally {
      if (dispose) {
        try { await dispose(); } catch { /* Disposal must not replace the API response. */ }
      }
    }
  };
}

export const handler = createEdgeHandler();
export default handler;

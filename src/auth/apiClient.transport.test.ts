import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

describe('cross-origin API transport', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE_URL', 'https://tvlpabqkternfvsxqovi.supabase.co/functions/v1/api');
    sessionStorage.clear();
    fetchMock = vi.fn(async () => jsonResponse({ ok: true, session: { mode: 'full' } }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('joins the Edge function base URL without duplicating the API prefix', async () => {
    const api = await import('./apiClient');
    await api.loginAdmin('admin', 'password');

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://tvlpabqkternfvsxqovi.supabase.co/functions/v1/api/auth/admin/login');
  });

  it('keeps production pointed at the Edge API when the build variable is missing', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubEnv('PROD', true);
    const api = await import('./apiClient');
    await api.loginAdmin('admin', 'password');

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://tvlpabqkternfvsxqovi.supabase.co/functions/v1/api/auth/admin/login');
  });

  it('stores the opaque access token and sends it as a bearer credential on later requests', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ok: true, accessToken: 'token-a', session: { mode: 'full' } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, profile: { accountId: 'student-a' } }));
    const api = await import('./apiClient');
    await api.loginAdmin('admin', 'password');
    await api.getStudentProfile();

    const request = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(new Headers(request.headers).get('Authorization')).toBe('Bearer token-a');
    expect(request.credentials).toBe('include');
    expect(sessionStorage.getItem('hoc_vui_session_token')).toBe('token-a');
  });

  it('rotates the bearer token after a credential change and preserves it across module reload', async () => {
    sessionStorage.setItem('hoc_vui_session_token', 'token-before');
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ok: true, accessToken: 'token-after', session: { mode: 'full' } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, profile: { accountId: 'student-a' } }));
    const api = await import('./apiClient');
    await api.changeStudentPin('123456', '654321');
    vi.resetModules();
    const reloadedApi = await import('./apiClient');
    await reloadedApi.getStudentProfile();

    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe('Bearer token-before');
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('Authorization')).toBe('Bearer token-after');
    expect(sessionStorage.getItem('hoc_vui_session_token')).toBe('token-after');
  });

  it('keeps the parent grant in memory and clears the session token on logout or expiry', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ok: true, accessToken: 'token-parent', parentGrantToken: 'grant-a', session: { mode: 'full' } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, profile: { accountId: 'student-a' } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse({ ok: false, code: 'expired', message: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ ok: true, profile: { accountId: 'student-a' } }));
    const api = await import('./apiClient');
    await api.unlockParent('864208');
    await api.getParentProfile();
    const parentRequest = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(new Headers(parentRequest.headers).get('Authorization')).toBe('Bearer token-parent');
    expect(new Headers(parentRequest.headers).get('X-Parent-Grant')).toBe('grant-a');

    vi.resetModules();
    const reloadedApi = await import('./apiClient');
    await reloadedApi.getParentProfile();
    const reloadedParentRequest = fetchMock.mock.calls[2]?.[1] as RequestInit;
    expect(new Headers(reloadedParentRequest.headers).get('Authorization')).toBe('Bearer token-parent');
    expect(new Headers(reloadedParentRequest.headers).has('X-Parent-Grant')).toBe(false);

    await reloadedApi.logout();
    expect(sessionStorage.getItem('hoc_vui_session_token')).toBe(null);

    sessionStorage.setItem('hoc_vui_session_token', 'token-expiring');
    vi.resetModules();
    const expiringApi = await import('./apiClient');
    await expiringApi.getCurrentAuthSession();
    const expiredRequest = fetchMock.mock.calls[4]?.[1] as RequestInit;
    expect(new Headers(expiredRequest.headers).get('Authorization')).toBe('Bearer token-expiring');
    expect(sessionStorage.getItem('hoc_vui_session_token')).toBe(null);

    vi.resetModules();
    const finalApi = await import('./apiClient');
    await finalApi.getStudentProfile();
    const clearedRequest = fetchMock.mock.calls[5]?.[1] as RequestInit;
    expect(new Headers(clearedRequest.headers).has('Authorization')).toBe(false);
  });
});

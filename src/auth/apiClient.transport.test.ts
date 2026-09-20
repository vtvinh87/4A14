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
    localStorage.clear();
    fetchMock = vi.fn(async () => jsonResponse({ ok: true, session: { mode: 'full' } }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('joins the Edge function base URL without duplicating the API prefix', async () => {
    const api = await import('./apiClient');
    await api.loginAdmin('admin', 'password');

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://tvlpabqkternfvsxqovi.supabase.co/functions/v1/api/auth/admin/login');
  });

  it('remembers only full student tokens, carries the PIN choice, and validates after reopening', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ok: true, accessToken: 'provisional', session: { mode: 'change-only', account: { role: 'student' } } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, accessToken: 'full', session: { mode: 'full', account: { role: 'student' } } }));
    const api = await import('./apiClient');
    await api.loginStudent('bao04', '123456', true);
    expect(localStorage.getItem('hoc_vui_remembered_session_token')).toBeNull();
    await api.changeStudentPin('123456', '246810');
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string).rememberDevice).toBe(true);
    expect(localStorage.getItem('hoc_vui_remembered_session_token')).toBe('full');
    sessionStorage.clear();
    vi.resetModules();
    const reopened = await import('./apiClient');
    await reopened.getCurrentAuthSession();
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain('/auth/me');
    expect(new Headers(fetchMock.mock.calls[2]?.[1]?.headers).get('Authorization')).toBe('Bearer full');
    await reopened.logout();
    expect(localStorage.getItem('hoc_vui_remembered_session_token')).toBeNull();
    expect(sessionStorage.getItem('hoc_vui_session_token')).toBeNull();
  });

  it.each([true, false])('roundtrips remembered intent through mandatory parent PIN change (%s)', async (remember) => {
    const student = { mode: 'full', account: { role: 'student' } };
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ok: true, accessToken: 'student-full', session: student }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, accessToken: 'parent-provisional', session: { ...student, mode: 'change-only', changeKind: 'parent' }, mustChange: true }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, accessToken: 'full-after-parent', session: student }));
    const api = await import('./apiClient');
    await api.loginStudent('bao04', '246810', remember);
    await api.unlockParent('123456');
    expect(localStorage.getItem('hoc_vui_remembered_session_token')).toBeNull();
    expect(sessionStorage.getItem('hoc_vui_session_token')).toBe('parent-provisional');
    await api.changeParentPin('123456', '864208');
    expect(JSON.parse(fetchMock.mock.calls[2]?.[1]?.body as string).rememberDevice).toBe(remember);
    expect(localStorage.getItem('hoc_vui_remembered_session_token')).toBe(remember ? 'full-after-parent' : null);
    vi.resetModules();
    const reopened = await import('./apiClient');
    await reopened.getCurrentAuthSession();
    expect(String(fetchMock.mock.calls[3]?.[0])).toContain('/auth/me');
    expect(new Headers(fetchMock.mock.calls[3]?.[1]?.headers).get('Authorization')).toBe('Bearer full-after-parent');
    expect(new Headers(fetchMock.mock.calls[3]?.[1]?.headers).has('X-Parent-Grant')).toBe(false);
  });

  it.each([false, undefined])('keeps old callers and explicit opt-out session-only (%s)', async (remember) => {
    localStorage.setItem('hoc_vui_remembered_session_token', 'old-account');
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, accessToken: 'new-account', session: { mode: 'full', account: { role: 'student' } } }));
    const api = await import('./apiClient');
    await api.loginStudent('bao04', '246810', remember);
    expect(localStorage.getItem('hoc_vui_remembered_session_token')).toBeNull();
    expect(sessionStorage.getItem('hoc_vui_session_token')).toBe('new-account');
  });

  it.each(['expired', 'forbidden'])('clears both candidates on startup %s', async (code) => {
    sessionStorage.setItem('hoc_vui_session_token', 'tab');
    localStorage.setItem('hoc_vui_remembered_session_token', 'old');
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: false, code, message: code }, 401));
    const api = await import('./apiClient');
    expect(await api.getCurrentAuthSession()).toEqual({ ok: true, session: null });
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe('Bearer tab');
    expect(sessionStorage.getItem('hoc_vui_session_token')).toBeNull();
    expect(localStorage.getItem('hoc_vui_remembered_session_token')).toBeNull();
  });

  it('survives a blocked localStorage getter and still signs in using session storage', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError'); });
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, accessToken: 'fallback', session: { mode: 'full', account: { role: 'student' } } }));
    const api = await import('./apiClient');
    expect((await api.loginStudent('bao04', '246810', true)).ok).toBe(true);
    expect(sessionStorage.getItem('hoc_vui_session_token')).toBe('fallback');
  });

  it('never persists admin tokens and clears a previous remembered account', async () => {
    localStorage.setItem('hoc_vui_remembered_session_token', 'student-old');
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, accessToken: 'admin-token', session: { mode: 'full', account: { role: 'admin' } } }));
    const api = await import('./apiClient');
    await api.loginAdmin('admin', 'password');
    expect(localStorage.getItem('hoc_vui_remembered_session_token')).toBeNull();
    expect(sessionStorage.getItem('hoc_vui_session_token')).toBe('admin-token');
  });

  it('keeps a remembered student after parent lock but never persists the parent grant', async () => {
    localStorage.setItem('hoc_vui_remembered_session_token', 'student');
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, accessToken: 'rotated', parentGrantToken: 'private-grant', session: { mode: 'full', account: { role: 'student' } } }));
    const api = await import('./apiClient');
    await api.unlockParent('864208');
    await api.getParentProfile();
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('X-Parent-Grant')).toBe('private-grant');
    expect(Object.values(localStorage)).not.toContain('private-grant');
    expect(Object.values(sessionStorage)).not.toContain('private-grant');
    await api.lockParent();
    expect(localStorage.getItem('hoc_vui_remembered_session_token')).toBe('rotated');
    vi.resetModules();
    const reopened = await import('./apiClient');
    await reopened.getParentProfile();
    expect(new Headers(fetchMock.mock.calls[3]?.[1]?.headers).has('X-Parent-Grant')).toBe(false);
  });

  it('falls back to memory when all storage writes fail and clears memory on offline logout', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError'); });
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, accessToken: 'memory-only', session: { mode: 'full', account: { role: 'student' } } }));
    const api = await import('./apiClient');
    expect((await api.loginStudent('bao04', '246810', true)).ok).toBe(true);
    await api.getStudentProfile();
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('Authorization')).toBe('Bearer memory-only');
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await api.logout();
    await api.getStudentProfile();
    expect(new Headers(fetchMock.mock.calls[3]?.[1]?.headers).has('Authorization')).toBe(false);
  });

  it('does not let a failed remembered login promote the previous session', async () => {
    sessionStorage.setItem('hoc_vui_session_token', 'previous');
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: false, code: 'invalid', message: 'bad PIN' }, 400));
    const api = await import('./apiClient');
    await api.loginStudent('other', '246810', true);
    await api.changeStudentPin('246810', '864208');
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string).rememberDevice).toBe(false);
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

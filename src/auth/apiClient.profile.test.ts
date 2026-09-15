import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('profile API client wrappers', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/api/parent/unlock') {
        return { ok: true, status: 200, json: async () => ({ ok: true, session: { mode: 'full' }, parentGrantToken: 'grant-a' }) } as Response;
      }
      return { ok: true, status: 200, json: async () => ({ ok: true, profile: { accountId: 'student-a', username: 'a01', displayName: 'A', avatarId: 'fox-scout', birthDate: null, birthdayWishesEnabled: false } }) } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps self calls free of the parent grant and sends it only for parent calls', async () => {
    const api = await import('./apiClient');
    await api.unlockParent('864208');
    await api.getStudentProfile();
    await api.updateStudentProfile({ displayName: 'A mới', avatarId: 'fox-sunny', birthDate: '2000-02-29' });
    await api.getParentProfile();
    await api.updateParentProfilePreferences(true);

    const selfRequest = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const selfUpdateRequest = fetchMock.mock.calls[2]?.[1] as RequestInit;
    const parentRequest = fetchMock.mock.calls[3]?.[1] as RequestInit;
    const parentUpdateRequest = fetchMock.mock.calls[4]?.[1] as RequestInit;
    expect(selfRequest.credentials).toBe('include');
    expect(new Headers(selfRequest.headers).has('X-Parent-Grant')).toBe(false);
    expect(selfUpdateRequest.method).toBe('PATCH');
    expect(JSON.parse(String(selfUpdateRequest.body))).toEqual({ displayName: 'A mới', avatarId: 'fox-sunny', birthDate: '2000-02-29' });
    expect(new Headers(parentRequest.headers).get('X-Parent-Grant')).toBe('grant-a');
    expect(new Headers(parentUpdateRequest.headers).get('X-Parent-Grant')).toBe('grant-a');
    expect(JSON.parse(String(parentUpdateRequest.body))).toEqual({ birthdayWishesEnabled: true });
  });
});

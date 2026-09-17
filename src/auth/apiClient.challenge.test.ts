import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

describe('challenge client wrappers', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE_URL', '');
    fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('keeps rollout config, weekly reads and social writes on the student challenge routes', async () => {
    const api = await import('./apiClient');

    await api.getChallengeRolloutConfig();
    await api.getWeeklyChallenge();
    await api.addChallengeReaction('item-1', 'learned', 'reaction-key-1');
    await api.reportChallengeItem('item-1', { reason: 'unclear', details: 'Con chưa hiểu phần này.' }, 'report-key-1');

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/me/challenge/config');
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe('/api/me/challenge/week');
    expect(String(fetchMock.mock.calls[2]?.[0])).toBe('/api/me/challenge/items/item-1/reactions');
    expect(String(fetchMock.mock.calls[3]?.[0])).toBe('/api/me/challenge/items/item-1/report');

    const reactionRequest = fetchMock.mock.calls[2]?.[1] as RequestInit;
    expect(reactionRequest.method).toBe('POST');
    expect(JSON.parse(String(reactionRequest.body))).toEqual({ reactionType: 'learned', idempotencyKey: 'reaction-key-1' });

    const reportRequest = fetchMock.mock.calls[3]?.[1] as RequestInit;
    expect(reportRequest.method).toBe('POST');
    expect(JSON.parse(String(reportRequest.body))).toEqual({ reason: 'unclear', details: 'Con chưa hiểu phần này.', idempotencyKey: 'report-key-1' });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProgressBoardData } from '../../shared/progress-board-contracts';

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const data: ProgressBoardData = {
  schemaVersion: 1,
  ruleVersion: 'progress-board-v1',
  contentVersion: 'lesson-content-v1',
  generation: '2',
  generatedAt: '2026-09-17T10:00:00.000Z',
  lastSyncedAt: '2026-09-17T09:00:00.000Z',
  stale: false,
  summary: { exploredLessonCount: 0, completedLessonCount: 0, independentObjectiveCount: 0, nextLessonId: 'lesson-01' },
  topics: [],
  nextLessonId: 'lesson-01',
};

describe('progress board API client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubEnv('PROD', false);
    fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ ok: true, config: { enabled: true } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, data }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('reads rollout config and board data through session-scoped endpoints', async () => {
    const api = await import('./apiClient');
    await expect(api.getProgressBoardRolloutConfig()).resolves.toEqual({ ok: true, config: { enabled: true } });
    await expect(api.getProgressBoard()).resolves.toEqual({ ok: true, data });

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/me/progress-board/config');
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe('/api/me/progress-board');
    expect(String(fetchMock.mock.calls[1]?.[0])).not.toContain('studentId');
  });

  it('maps a temporary board dependency failure to the existing unavailable contract', async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse({ ok: false, code: 'unavailable', message: 'Tạm thời chưa sẵn sàng.' }, 503));
    const api = await import('./apiClient');
    await expect(api.getProgressBoard()).resolves.toEqual({ ok: false, code: 'unavailable', message: 'Tạm thời chưa sẵn sàng.' });
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getProgressBoardRolloutConfig,
  isProgressBoardRolloutEnabled,
  parseProgressBoardEnabled,
  progressBoardRolloutFailure,
} from './rollout';
import { createApp, type AppRequest, type AppResponse } from '../app';
import { MemoryAuthRepository } from '../auth/memoryRepository';
import { createAuthService } from '../auth/service';
import { createEmptySnapshot } from '../learning/engine';
import { PROGRESS_BOARD_CONTENT_INDEX } from '../analytics/progressBoardContent';
import { buildProgressBoardData } from '../analytics/progressBoard';

function cookieValue(response: AppResponse): string {
  return (response.headers['Set-Cookie'] ?? '').split(';', 1)[0] ?? '';
}

async function request(app: ReturnType<typeof createApp>, input: Omit<AppRequest, 'headers'> & { cookie?: string; parentGrant?: string }): Promise<AppResponse> {
  return app.handle({
    ...input,
    headers: {
      host: 'localhost:8888',
      ...(input.cookie ? { cookie: input.cookie } : {}),
      ...(input.parentGrant ? { 'x-parent-grant': input.parentGrant } : {}),
    },
  });
}

async function provisionStudent() {
  const authRepository = new MemoryAuthRepository();
  const auth = createAuthService(authRepository);
  const setup = createApp({ auth });
  const admin = await request(setup, { method: 'POST', path: '/api/auth/admin/login', body: { username: 'admin', password: '123456@' } });
  const created = await request(setup, { method: 'POST', path: '/api/admin/students', cookie: cookieValue(admin), body: { username: 'pboard01', displayName: 'Bạn Tiến Bộ' } });
  const studentId = String((created.body.account as { id: string }).id);
  const login = await request(setup, { method: 'POST', path: '/api/auth/student/login', body: { username: 'pboard01', pin: '123456' } });
  const changed = await request(setup, { method: 'POST', path: '/api/auth/student/change-pin', cookie: cookieValue(login), body: { currentPin: '123456', newPin: '246810' } });
  return { auth, studentId, studentCookie: cookieValue(changed) };
}

describe('progress board rollout gate', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('defaults missing, blank and unknown values to disabled', () => {
    expect(parseProgressBoardEnabled(undefined)).toBe(false);
    expect(parseProgressBoardEnabled('')).toBe(false);
    expect(parseProgressBoardEnabled('preview')).toBe(false);
    expect(getProgressBoardRolloutConfig(' OFF ')).toEqual({ enabled: false });
    expect(isProgressBoardRolloutEnabled(getProgressBoardRolloutConfig())).toBe(false);
  });

  it.each(['true', '1', 'on', ' TRUE '])('enables only the explicit true forms: %s', (value) => {
    expect(parseProgressBoardEnabled(value)).toBe(true);
    expect(getProgressBoardRolloutConfig(value)).toEqual({ enabled: true });
  });

  it('returns a safe disabled failure without implementation details', () => {
    expect(progressBoardRolloutFailure()).toEqual({
      ok: false,
      code: 'unavailable',
      reason: 'rollout_disabled',
      message: 'Bảng tiến bộ đang được mở dần cho lớp.',
    });
    expect(JSON.stringify(progressBoardRolloutFailure())).not.toMatch(/studentId|database|token|stack/i);
  });

  it('gates the student routes by flag and session scope', async () => {
    const ready = await provisionStudent();
    const board = buildProgressBoardData(
      createEmptySnapshot(ready.studentId, '2026-09-17T08:00:00.000Z'),
      [],
      PROGRESS_BOARD_CONTENT_INDEX,
      '2026-09-17T08:00:00.000Z',
    );
    const getProgressBoard = vi.fn(async () => board);
    const learning = { getProgressBoard } as never;
    const app = createApp({ auth: ready.auth, learning });

    vi.stubEnv('HOC_VUI_PROGRESS_BOARD_ENABLED', 'false');
    const disabledConfig = await request(app, { method: 'GET', path: '/api/me/progress-board/config', cookie: ready.studentCookie });
    const disabledBoard = await request(app, { method: 'GET', path: '/api/me/progress-board', cookie: ready.studentCookie });
    expect(disabledConfig.statusCode).toBe(200);
    expect(disabledConfig.body).toEqual({ ok: true, config: { enabled: false } });
    expect(disabledBoard.statusCode).toBe(503);
    expect(disabledBoard.body).toMatchObject({ ok: false, code: 'unavailable', reason: 'rollout_disabled' });
    expect(getProgressBoard).not.toHaveBeenCalled();

    vi.stubEnv('HOC_VUI_PROGRESS_BOARD_ENABLED', 'true');
    const enabledBoard = await request(app, { method: 'GET', path: '/api/me/progress-board?studentId=other-student', cookie: ready.studentCookie });
    expect(enabledBoard.statusCode).toBe(200);
    expect(enabledBoard.headers['Cache-Control']).toBe('no-store');
    expect(enabledBoard.body).toEqual({ ok: true, data: board });
    expect(getProgressBoard).toHaveBeenCalledOnce();
    expect(getProgressBoard).toHaveBeenCalledWith(ready.studentId);

    const parentGrant = await request(app, { method: 'GET', path: '/api/me/progress-board', cookie: ready.studentCookie, parentGrant: 'parent-grant' });
    expect(parentGrant.statusCode).toBe(403);
    expect(getProgressBoard).toHaveBeenCalledOnce();
  });
});

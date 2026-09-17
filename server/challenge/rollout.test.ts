import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChallengeTodayResponse } from '../../shared/challenge-contracts';
import { createApp, type AppRequest, type AppResponse } from '../app';
import { MemoryAuthRepository } from '../auth/memoryRepository';
import { createAuthService } from '../auth/service';
import { challengeRolloutFailure, getChallengeRolloutConfig, isChallengeRolloutEnabled, parseChallengeRolloutMode } from './rollout';

function cookieValue(response: AppResponse): string {
  return (response.headers['Set-Cookie'] ?? '').split(';', 1)[0] ?? '';
}

async function request(app: ReturnType<typeof createApp>, input: Omit<AppRequest, 'headers'> & { cookie?: string }): Promise<AppResponse> {
  return app.handle({
    ...input,
    headers: {
      host: 'localhost:8888',
      ...(input.cookie ? { cookie: input.cookie } : {}),
    },
  });
}

async function provisionStudent() {
  const authRepository = new MemoryAuthRepository();
  const auth = createAuthService(authRepository);
  const app = createApp({ auth });
  const admin = await request(app, { method: 'POST', path: '/api/auth/admin/login', body: { username: 'admin', password: '123456@' } });
  const created = await request(app, { method: 'POST', path: '/api/admin/students', cookie: cookieValue(admin), body: { username: 'rollout01', displayName: 'Bạn Pilot' } });
  const studentId = String((created.body.account as { id: string }).id);
  const login = await request(app, { method: 'POST', path: '/api/auth/student/login', body: { username: 'rollout01', pin: '123456' } });
  const changed = await request(app, { method: 'POST', path: '/api/auth/student/change-pin', cookie: cookieValue(login), body: { currentPin: '123456', newPin: '246810' } });
  return { app, auth, studentId, adminCookie: cookieValue(admin), studentCookie: cookieValue(changed) };
}

describe('challenge rollout gate', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults missing, blank and unknown modes to the safe off state', () => {
    expect(parseChallengeRolloutMode(undefined)).toBe('off');
    expect(parseChallengeRolloutMode('')).toBe('off');
    expect(parseChallengeRolloutMode('preview')).toBe('off');
    expect(getChallengeRolloutConfig(' OFF ')).toEqual({ enabled: false, mode: 'off', scope: 'single-class' });
    expect(isChallengeRolloutEnabled(getChallengeRolloutConfig())).toBe(false);
  });

  it.each(['pilot', 'on'] as const)('enables every active single-class session in %s mode without an allowlist', (mode) => {
    expect(getChallengeRolloutConfig(mode)).toEqual({ enabled: true, mode, scope: 'single-class' });
    expect(isChallengeRolloutEnabled(getChallengeRolloutConfig(mode))).toBe(true);
  });

  it('returns an existing safe failure contract while keeping config minimal', () => {
    const config = getChallengeRolloutConfig('off');
    expect(challengeRolloutFailure(config)).toEqual({
      ok: false,
      code: 'unavailable',
      reason: 'rollout_disabled',
      message: 'Tính năng Thách đố đang tạm đóng để chuẩn bị cho lớp.',
    });
    expect(Object.keys(config)).toEqual(['enabled', 'mode', 'scope']);
  });

  it('returns config only to an active full student and gates every other challenge route when off', async () => {
    vi.stubEnv('HOC_VUI_CHALLENGE_MODE', 'off');
    const ready = await provisionStudent();
    const getToday = vi.fn(async (): Promise<ChallengeTodayResponse> => ({
      roundDate: '2026-09-17',
      roundStatus: 'open',
      questions: [],
      classProgress: { current: 0, target: 10, completed: false },
      myContribution: { correctAnswers: 0, questionsCreated: 0, questionsRevisited: 0 },
    }));
    const gatedApp = createApp({ auth: ready.auth, challengePlay: { getToday } as never });

    const config = await request(gatedApp, { method: 'GET', path: '/api/me/challenge/config', cookie: ready.studentCookie });
    expect(config.statusCode).toBe(200);
    expect(config.body).toEqual({ ok: true, config: { enabled: false, mode: 'off', scope: 'single-class' } });
    expect(JSON.stringify(config.body)).not.toMatch(/token|secret|database|student/i);

    const routes: AppRequest[] = [
      { method: 'GET', path: '/api/me/challenge/today', headers: {} },
      { method: 'GET', path: '/api/me/challenge/questions/mine', headers: {} },
      { method: 'POST', path: '/api/me/challenge/questions', headers: {}, body: {} },
      { method: 'PATCH', path: '/api/me/challenge/questions/question-1', headers: {}, body: {} },
      { method: 'POST', path: '/api/me/challenge/items/item-1/attempt', headers: {}, body: {} },
      { method: 'POST', path: '/api/me/challenge/items/item-1/reactions', headers: {}, body: {} },
      { method: 'POST', path: '/api/me/challenge/items/item-1/report', headers: {}, body: {} },
      { method: 'GET', path: '/api/me/challenge/week', headers: {} },
      { method: 'GET', path: '/api/parent/challenge/questions/pending', headers: {} },
      { method: 'POST', path: '/api/admin/challenge/questions/question-1/void', headers: {}, body: {} },
    ];
    for (const route of routes) {
      const response = await gatedApp.handle({ ...route, headers: { host: 'localhost:8888', cookie: ready.studentCookie } });
      expect(response.statusCode, route.path).toBe(503);
      expect(response.body).toMatchObject({ ok: false, code: 'unavailable', reason: 'rollout_disabled' });
    }
    expect(getToday).not.toHaveBeenCalled();
  });

  it.each(['pilot', 'on'] as const)('allows an active full student through the server route gate in %s mode', async (mode) => {
    vi.stubEnv('HOC_VUI_CHALLENGE_MODE', mode);
    const ready = await provisionStudent();
    const today: ChallengeTodayResponse = {
      roundDate: '2026-09-17',
      roundStatus: 'open',
      questions: [],
      classProgress: { current: 0, target: 10, completed: false },
      myContribution: { correctAnswers: 0, questionsCreated: 0, questionsRevisited: 0 },
    };
    const getToday = vi.fn(async () => ({ ok: true, ...today }));
    const app = createApp({ auth: ready.auth, challengePlay: { getToday } as never });
    const config = await request(app, { method: 'GET', path: '/api/me/challenge/config', cookie: ready.studentCookie });
    const result = await request(app, { method: 'GET', path: '/api/me/challenge/today', cookie: ready.studentCookie });
    expect(config.body).toEqual({ ok: true, config: { enabled: true, mode, scope: 'single-class' } });
    expect(result.statusCode).toBe(200);
    expect(getToday).toHaveBeenCalledWith(expect.any(String));
  });

  it('does not treat an inactive student as part of the pilot roster', async () => {
    vi.stubEnv('HOC_VUI_CHALLENGE_MODE', 'pilot');
    const ready = await provisionStudent();
    const disabled = await request(ready.app, { method: 'PATCH', path: `/api/admin/students/${encodeURIComponent(ready.studentId)}`, cookie: ready.adminCookie, body: { active: false } });
    expect(disabled.statusCode).toBe(200);
    const config = await request(ready.app, { method: 'GET', path: '/api/me/challenge/config', cookie: ready.studentCookie });
    expect(config.statusCode).toBe(401);
    expect(config.body).toMatchObject({ ok: false, code: 'expired' });
    const login = await request(ready.app, { method: 'POST', path: '/api/auth/student/login', body: { username: 'rollout01', pin: '123456' } });
    expect(login.statusCode).toBe(400);
    expect(login.body).toMatchObject({ ok: false, code: 'inactive' });
  });
});

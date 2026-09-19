import { randomUUID } from 'node:crypto';
import { createDbClient, type DatabaseClient } from './db/client.ts';
import { PostgresAuthRepository } from './auth/postgresRepository.ts';
import { createAuthService } from './auth/service.ts';
import type { AuthFailure, AuthSessionView } from './auth/types.ts';
import { PostgresLearningRepository } from './learning/postgresRepository.ts';
import { createLearningService } from './learning/service.ts';
import type { LearningEventInput, LearningFailure } from '../shared/learning-contracts.ts';
import type { StudentProfilePatch } from '../shared/account-contracts.ts';
import { PostgresClassroomRepository } from './classroom/postgresRepository.ts';
import { createSupabaseClassroomRealtimeBridge } from './classroom/realtime.ts';
import { createClassroomService, type ClassroomFailure, type ClassroomService } from './classroom/service.ts';
import { PostgresAuthoringRepository } from './challenge/postgresAuthoringRepository.ts';
import { createChallengeAuthoringService } from './challenge/authoringService.ts';
import { createChallengeReviewService, type ChallengeReviewRequest } from './challenge/reviewService.ts';
import { PostgresPlayRepository } from './challenge/postgresPlayRepository.ts';
import { PostgresChallengeReadRepository } from './challenge/readRepository.ts';
import { createChallengePlayService } from './challenge/playService.ts';
import { createChallengeSocialService } from './challenge/socialService.ts';
import { createChallengeWeeklyService } from './challenge/weeklyService.ts';
import { CHALLENGE_SOURCE_FACTS } from '../shared/challenge-source.ts';
import type { AddChallengeReactionInput, ChallengeFailure, ChallengePreferencesPatch, CreateChallengeQuestionInput, ReportChallengeItemInput, ResolveChallengeReportInput, ReviseChallengeQuestionInput, SubmitChallengeAttemptInput } from '../shared/challenge-contracts.ts';
import { getEnv } from './runtime/env.ts';
import { challengeRolloutFailure, getChallengeRolloutConfig, isChallengeRolloutEnabled } from './challenge/rollout.ts';
import { getProgressBoardRolloutConfig, isProgressBoardRolloutEnabled, progressBoardRolloutFailure } from './progress/rollout.ts';
import type { RequestTiming } from './performance/timing.ts';

const SESSION_COOKIE = 'hoc_vui_session';
const LOCAL_SESSION_MAX_AGE = 7 * 24 * 60 * 60;
const ADMIN_SESSION_MAX_AGE = 8 * 60 * 60;

export type AppRequest = {
  method: string;
  path: string;
  headers?: Record<string, string | undefined>;
  body?: unknown;
  timing?: RequestTiming;
};

export type AppResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: Record<string, unknown>;
};

type AuthService = ReturnType<typeof createAuthService>;
type LearningService = ReturnType<typeof createLearningService>;
type ChallengeAuthoringService = ReturnType<typeof createChallengeAuthoringService>;
type ChallengeReviewService = ReturnType<typeof createChallengeReviewService>;
type ChallengePlayService = ReturnType<typeof createChallengePlayService>;
type ChallengeSocialService = ReturnType<typeof createChallengeSocialService>;
type ChallengeWeeklyService = ReturnType<typeof createChallengeWeeklyService>;

export type AppDependencies = {
  auth: AuthService;
  learning?: LearningService;
  classroom?: ClassroomService;
  challengeAuthoring?: ChallengeAuthoringService;
  challengeReview?: ChallengeReviewService;
  challengePlay?: ChallengePlayService;
  challengeSocial?: ChallengeSocialService;
  challengeWeekly?: ChallengeWeeklyService;
  close?: () => Promise<void>;
};

type ParentAuthorization = { ok: true; token: string; studentId: string } | { ok: false; response: AppResponse };
type StudentAuthorization = { ok: true; token: string; studentId: string } | { ok: false; response: AppResponse };

function header(request: AppRequest, name: string): string | undefined {
  const entries = request.headers ?? {};
  const key = Object.keys(entries).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? entries[key] : undefined;
}

function parseCookies(value: string | undefined): Record<string, string> {
  if (!value) return {};
  return Object.fromEntries(value.split(';').map((part) => part.trim().split('=' as const, 2)).filter(([key, item]) => Boolean(key && item)).map(([key, item]) => [key, decodeURIComponent(item)]));
}

function sessionToken(request: AppRequest): string | null {
  const bearer = header(request, 'authorization');
  if (bearer?.startsWith('Bearer ')) return bearer.slice('Bearer '.length).trim() || null;
  return parseCookies(header(request, 'cookie'))[SESSION_COOKIE] ?? null;
}

function parentGrantToken(request: AppRequest): string | undefined {
  return header(request, 'x-parent-grant')?.trim() || undefined;
}

function bodyObject(request: AppRequest): Record<string, unknown> {
  if (!request.body) return {};
  if (typeof request.body === 'string') {
    try { return JSON.parse(request.body) as Record<string, unknown>; } catch { return {}; }
  }
  if (typeof request.body === 'object' && request.body !== null && !Array.isArray(request.body)) return request.body as Record<string, unknown>;
  return {};
}

function profilePatchFromBody(body: Record<string, unknown>): StudentProfilePatch | AuthFailure {
  const supportedFields = new Set(['displayName', 'avatarId', 'birthDate']);
  if (Object.keys(body).some((field) => !supportedFields.has(field))) return { ok: false, code: 'invalid', message: 'Hồ sơ chỉ cho phép tên hiển thị, avatar và ngày sinh.' };
  const patch: Record<string, unknown> = {};
  for (const field of supportedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) patch[field] = body[field];
  }
  return patch as StudentProfilePatch;
}

function publicSession(session: AuthSessionView): Omit<AuthSessionView, 'token'> {
  const { token: _token, ...safe } = session;
  return safe;
}

function success(body: Record<string, unknown>, extraHeaders: Record<string, string> = {}): AppResponse {
  return { statusCode: 200, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders }, body: { ok: true, ...body } };
}

function failure(failure: AuthFailure | LearningFailure | ClassroomFailure | ChallengeFailure, statusCode = statusForFailure(failure)): AppResponse {
  return { statusCode, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }, body: failure };
}

function statusForFailure(failure: AuthFailure | LearningFailure | ClassroomFailure | ChallengeFailure): number {
  if (failure.code === 'forbidden') return 403;
  if (failure.code === 'conflict') return 409;
  if (failure.code === 'locked') return 423;
  if (failure.code === 'expired') return 401;
  if (failure.code === 'stale') return 409;
  if (failure.code === 'unavailable') return 503;
  if (failure.code === 'not-found') return 404;
  if (failure.code === 'rate-limited') return 429;
  return 400;
}

function cookieFlags(): string {
  const secure = getEnv('NODE_ENV') === 'production' || getEnv('HOC_VUI_COOKIE_SECURE') === 'true';
  return `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

function setSessionCookie(token: string, expiresAt: string, role: 'student' | 'admin'): string {
  const maxAge = role === 'admin' ? ADMIN_SESSION_MAX_AGE : LOCAL_SESSION_MAX_AGE;
  const remaining = Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000));
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${Math.min(maxAge, remaining)}; ${cookieFlags()}`;
}

function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Max-Age=0; ${cookieFlags()}`;
}

function withCookie(response: AppResponse, cookie: string): AppResponse {
  return { ...response, headers: { ...response.headers, 'Set-Cookie': cookie } };
}

function sameOrigin(request: AppRequest): boolean {
  const origin = header(request, 'origin');
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const host = header(request, 'host');
    if (host && originUrl.host === host) return true;
    const configuredOrigins = (getEnv('HOC_VUI_ALLOWED_ORIGINS') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .flatMap((value) => {
        try { return [new URL(value).origin]; } catch { return []; }
      });
    return configuredOrigins.includes(originUrl.origin);
  } catch {
    return false;
  }
}

function routeParts(request: AppRequest): { pathname: string; query: URLSearchParams } {
  const parsed = new URL(request.path, 'http://hoc-vui.local');
  return { pathname: parsed.pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/', query: parsed.searchParams };
}

function requireToken(request: AppRequest): string | AuthFailure {
  return sessionToken(request) ?? { ok: false, code: 'expired', message: 'Phiên đăng nhập đã hết; hãy đăng nhập lại.' };
}

function decodeClassroomPeerId(value: string): string | ClassroomFailure {
  try {
    return decodeURIComponent(value);
  } catch {
    return { ok: false, code: 'invalid', message: 'Đường dẫn bạn học không hợp lệ.' };
  }
}

function decodeChallengeQuestionId(value: string): string | ChallengeFailure {
  try {
    return decodeURIComponent(value);
  } catch {
    return { ok: false, code: 'invalid', message: 'Mã câu hỏi không hợp lệ.' };
  }
}

function challengeAttemptInputFromBody(body: Record<string, unknown>): SubmitChallengeAttemptInput {
  const input: SubmitChallengeAttemptInput = {
    selectedOptionId: typeof body.selectedOptionId === 'string' ? body.selectedOptionId : '',
  };
  if (typeof body.attemptId === 'string') input.attemptId = body.attemptId;
  if (typeof body.idempotencyKey === 'string') input.idempotencyKey = body.idempotencyKey;
  if (typeof body.isPractice === 'boolean') input.isPractice = body.isPractice;
  return input;
}

function challengeReactionInputFromBody(body: Record<string, unknown>, request: AppRequest): AddChallengeReactionInput {
  return {
    reactionType: body.reactionType as AddChallengeReactionInput['reactionType'],
    idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : header(request, 'idempotency-key') ?? '',
  };
}

function challengeReportInputFromBody(body: Record<string, unknown>, request: AppRequest): ReportChallengeItemInput {
  return {
    reason: body.reason as ReportChallengeItemInput['reason'],
    ...(Object.prototype.hasOwnProperty.call(body, 'details') ? { details: body.details as string } : {}),
    idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : header(request, 'idempotency-key') ?? '',
  };
}

function challengeObjectHasOnly(body: Record<string, unknown>, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(body).every((key) => allowed.has(key));
}

function isLearningEvent(value: unknown): value is LearningEventInput {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.eventId === 'string'
    && typeof candidate.runId === 'string'
    && Number.isInteger(candidate.sequence)
    && typeof candidate.type === 'string'
    && typeof candidate.lessonId === 'string'
    && Number.isInteger(candidate.lessonVersion)
    && typeof candidate.deviceId === 'string'
    && Number.isInteger(candidate.generation);
}

function isChallengePath(pathname: string): boolean {
  return pathname.startsWith('/api/me/challenge/')
    || pathname.startsWith('/api/parent/challenge/')
    || pathname.startsWith('/api/admin/challenge/');
}

export function createApp(dependencies: AppDependencies) {
  const { auth } = dependencies;

  async function authorizeParent(request: AppRequest, requestedStudentId?: string): Promise<ParentAuthorization> {
    const token = requireToken(request);
    if (typeof token !== 'string') return { ok: false, response: failure(token, 401) };
    const result = await auth.getParentDashboard(token, parentGrantToken(request), requestedStudentId);
    return result.ok ? { ok: true, token, studentId: result.studentId } : { ok: false, response: failure(result) };
  }

  async function authorizeStudent(request: AppRequest): Promise<StudentAuthorization> {
    const work = async (): Promise<StudentAuthorization> => {
      const token = requireToken(request);
      if (typeof token !== 'string') return { ok: false, response: failure(token, 401) };
      if (parentGrantToken(request)) {
        return { ok: false, response: failure({ ok: false, code: 'forbidden', message: 'Parent grant chỉ được dùng cho vùng phụ huynh.' }) };
      }
      const session = await auth.getSession(token);
      if ('ok' in session) return { ok: false, response: failure(session, 401) };
      if (session.account.role !== 'student' || session.mode !== 'full') {
        return { ok: false, response: failure({ ok: false, code: 'forbidden', message: 'Hãy hoàn tất đăng nhập tài khoản học sinh trước.' }) };
      }
      return { ok: true, token, studentId: session.account.id };
    };
    return request.timing ? request.timing.measure('auth', work) : work();
  }

  async function measureData<T>(request: AppRequest, work: () => Promise<T>): Promise<T> {
    return request.timing ? request.timing.measure('data', work) : work();
  }

  async function authorizeAdmin(request: AppRequest): Promise<{ ok: true; token: string; adminId: string } | { ok: false; response: AppResponse }> {
    const token = requireToken(request);
    if (typeof token !== 'string') return { ok: false, response: failure(token, 401) };
    const session = await auth.getSession(token);
    if ('ok' in session) return { ok: false, response: failure(session, 401) };
    if (session.account.role !== 'admin' || session.mode !== 'full') {
      return { ok: false, response: failure({ ok: false, code: 'forbidden', message: 'Chỉ Admin mới xử lý được báo cáo Thách đố.' }) };
    }
    return { ok: true, token, adminId: session.account.id };
  }

  async function dispatch(request: AppRequest): Promise<AppResponse> {
    const { pathname, query } = routeParts(request);
    const method = request.method.toUpperCase();
    const isWrite = method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE';
    if (isWrite && !sameOrigin(request)) return failure({ ok: false, code: 'forbidden', message: 'Yêu cầu không cùng nguồn.' }, 403);

    if (method === 'GET' && pathname === '/api/me/challenge/config') {
      const student = await authorizeStudent(request);
      if (!student.ok) return student.response;
      return success({ config: getChallengeRolloutConfig() });
    }
    if (isChallengePath(pathname) && !isChallengeRolloutEnabled()) return failure(challengeRolloutFailure(), 503);

    if (method === 'POST' && pathname === '/api/auth/student/login') {
      const body = bodyObject(request);
      const result = await auth.loginStudent(String(body.username ?? ''), String(body.pin ?? ''));
      if (!result.ok) return failure(result);
      return withCookie(success({ accessToken: result.token, session: publicSession(result.session), ...(result.mustChange ? { mustChange: true } : {}) }), setSessionCookie(result.token, result.session.expiresAt, 'student'));
    }
    if (method === 'POST' && pathname === '/api/auth/admin/login') {
      const body = bodyObject(request);
      const result = await auth.loginAdmin(String(body.username ?? ''), String(body.password ?? ''));
      if (!result.ok) return failure(result);
      return withCookie(success({ accessToken: result.token, session: publicSession(result.session) }), setSessionCookie(result.token, result.session.expiresAt, 'admin'));
    }
    if (method === 'GET' && pathname === '/api/auth/me') {
      const token = sessionToken(request);
      if (!token) return failure({ ok: false, code: 'expired', message: 'Chưa có phiên đăng nhập.' }, 401);
      // A parent grant is intentionally page-scoped: a fresh /me check on a
      // reload clears it before returning the ordinary child session.
      await auth.clearParentGrant(token);
      const result = await auth.getSession(token);
      if ('ok' in result) return failure(result, 401);
      return success({ session: publicSession(result) });
    }
    if (method === 'POST' && pathname === '/api/auth/logout') {
      const token = sessionToken(request);
      if (token) await auth.logout(token);
      return withCookie(success({}), clearSessionCookie());
    }
    if (method === 'POST' && pathname === '/api/auth/student/change-pin') {
      const token = requireToken(request);
      if (typeof token !== 'string') return failure(token, 401);
      const body = bodyObject(request);
      const result = await auth.changePin(token, String(body.currentPin ?? ''), String(body.newPin ?? ''), 'student');
      if (!result.ok) return failure(result);
      return withCookie(success({ accessToken: result.token, session: publicSession(result.session) }), setSessionCookie(result.token, result.session.expiresAt, 'student'));
    }
    if (method === 'POST' && pathname === '/api/auth/admin/change-password') {
      const token = requireToken(request);
      if (typeof token !== 'string') return failure(token, 401);
      const body = bodyObject(request);
      const result = await auth.changeAdminPassword(token, String(body.currentPassword ?? ''), String(body.newPassword ?? ''));
      if (!result.ok) return failure(result);
      return withCookie(success({ accessToken: result.token, session: publicSession(result.session) }), setSessionCookie(result.token, result.session.expiresAt, 'admin'));
    }
    if (method === 'GET' && pathname === '/api/me/friends') {
      const student = await authorizeStudent(request);
      if (!student.ok) return student.response;
      return measureData(request, async () => {
        if (!dependencies.classroom) return failure({ ok: false, code: 'unavailable', message: 'Classroom chưa sẵn sàng trên máy chủ.' }, 503);
        return success(await dependencies.classroom.listFriends(student.studentId));
      });
    }
    if (method === 'GET' && pathname === '/api/me/realtime') {
      const student = await authorizeStudent(request);
      if (!student.ok) return student.response;
      if (!dependencies.classroom) return failure({ ok: false, code: 'unavailable', message: 'Classroom chưa sẵn sàng trên máy chủ.' }, 503);
      const config = await dependencies.classroom.realtimeConfig(student.studentId);
      if (!config) return failure({ ok: false, code: 'unavailable', message: 'Realtime classroom chưa sẵn sàng trên máy chủ.' }, 503);
      return success(config);
    }
    if (method === 'POST' && pathname === '/api/me/presence') {
      const student = await authorizeStudent(request);
      if (!student.ok) return student.response;
      if (!dependencies.classroom) return failure({ ok: false, code: 'unavailable', message: 'Classroom chưa sẵn sàng trên máy chủ.' }, 503);
      await dependencies.classroom.heartbeat(student.studentId);
      return success({});
    }
    if (method === 'POST' && pathname === '/api/me/challenge/questions') {
      const student = await authorizeStudent(request);
      if (!student.ok) return student.response;
      if (!dependencies.challengeAuthoring) return failure({ ok: false, code: 'unavailable', message: 'Thách đố chưa sẵn sàng trên máy chủ.' }, 503);
      const result = await dependencies.challengeAuthoring.createQuestion(student.studentId, bodyObject(request) as CreateChallengeQuestionInput);
      if (!result.ok) return failure(result);
      const { ok: _ok, ...question } = result;
      return success({ question });
    }
    const challengeReactionMatch = pathname.match(/^\/api\/me\/challenge\/items\/([^/]+)\/reactions$/);
    if (challengeReactionMatch && method === 'POST') {
      const student = await authorizeStudent(request);
      if (!student.ok) return student.response;
      if (!dependencies.challengeSocial) return failure({ ok: false, code: 'unavailable', message: 'Phản hồi Thách đố chưa sẵn sàng trên máy chủ.' }, 503);
      const itemId = decodeChallengeQuestionId(challengeReactionMatch[1]);
      if (typeof itemId !== 'string') return failure(itemId);
      const body = bodyObject(request);
      if (!challengeObjectHasOnly(body, ['reactionType', 'idempotencyKey'])) return failure({ ok: false, code: 'invalid', message: 'Phản hồi chỉ cho phép loại phản hồi và mã thử lại.' });
      const result = await dependencies.challengeSocial.addReaction(student.studentId, itemId, challengeReactionInputFromBody(body, request));
      if (!result.ok) return failure(result);
      const { ok: _ok, ...reaction } = result;
      return success(reaction);
    }
    const challengeReportMatch = pathname.match(/^\/api\/me\/challenge\/items\/([^/]+)\/report$/);
    if (challengeReportMatch && method === 'POST') {
      const student = await authorizeStudent(request);
      if (!student.ok) return student.response;
      if (!dependencies.challengeSocial) return failure({ ok: false, code: 'unavailable', message: 'Báo cáo Thách đố chưa sẵn sàng trên máy chủ.' }, 503);
      const itemId = decodeChallengeQuestionId(challengeReportMatch[1]);
      if (typeof itemId !== 'string') return failure(itemId);
      const body = bodyObject(request);
      if (!challengeObjectHasOnly(body, ['reason', 'details', 'idempotencyKey'])) return failure({ ok: false, code: 'invalid', message: 'Báo cáo chỉ cho phép lý do, mô tả và mã thử lại.' });
      const result = await dependencies.challengeSocial.reportItem(student.studentId, itemId, challengeReportInputFromBody(body, request));
      if (!result.ok) return failure(result);
      const { ok: _ok, ...report } = result;
      return success(report);
    }
    if (method === 'GET' && pathname === '/api/me/challenge/questions/mine') {
      const student = await authorizeStudent(request);
      if (!student.ok) return student.response;
      if (!dependencies.challengeAuthoring) return failure({ ok: false, code: 'unavailable', message: 'Thách đố chưa sẵn sàng trên máy chủ.' }, 503);
      const result = await dependencies.challengeAuthoring.listMine(student.studentId);
      if (!result.ok) return failure(result);
      return success({ questions: result.items });
    }
    if (method === 'GET' && pathname === '/api/me/challenge/today') {
      const student = await authorizeStudent(request);
      if (!student.ok) return student.response;
      return measureData(request, async () => {
        if (!dependencies.challengePlay) return failure({ ok: false, code: 'unavailable', message: 'Vòng Thách đố chưa sẵn sàng trên máy chủ.' }, 503);
        const result = request.timing
          ? await dependencies.challengePlay.getToday(student.studentId, request.timing)
          : await dependencies.challengePlay.getToday(student.studentId);
        if (!result.ok) return failure(result);
        const { ok: _ok, ...today } = result;
        return success(today);
      });
    }
    const challengeAttemptMatch = pathname.match(/^\/api\/me\/challenge\/items\/([^/]+)\/attempt$/);
    if (challengeAttemptMatch && method === 'POST') {
      const student = await authorizeStudent(request);
      if (!student.ok) return student.response;
      if (!dependencies.challengePlay) return failure({ ok: false, code: 'unavailable', message: 'Vòng Thách đố chưa sẵn sàng trên máy chủ.' }, 503);
      const itemId = decodeChallengeQuestionId(challengeAttemptMatch[1]);
      if (typeof itemId !== 'string') return failure(itemId);
      const result = await dependencies.challengePlay.submitAttempt(student.studentId, itemId, challengeAttemptInputFromBody(bodyObject(request)));
      if (!result.ok) return failure(result);
      const { ok: _ok, ...answer } = result;
      return success(answer);
    }
    if (method === 'GET' && pathname === '/api/me/challenge/week') {
      const student = await authorizeStudent(request);
      if (!student.ok) return student.response;
      return measureData(request, async () => {
        if (!dependencies.challengeWeekly) return failure({ ok: false, code: 'unavailable', message: 'Bản đồ tuần Thách đố chưa sẵn sàng trên máy chủ.' }, 503);
        const result = request.timing
          ? await dependencies.challengeWeekly.getWeekly(student.studentId, undefined, request.timing)
          : await dependencies.challengeWeekly.getWeekly(student.studentId);
        if (!result.ok) return failure(result);
        const { ok: _ok, ...weekly } = result;
        return success(weekly);
      });
    }
    const challengeQuestionMatch = pathname.match(/^\/api\/me\/challenge\/questions\/([^/]+)$/);
    if (challengeQuestionMatch && method === 'PATCH') {
      const student = await authorizeStudent(request);
      if (!student.ok) return student.response;
      if (!dependencies.challengeAuthoring) return failure({ ok: false, code: 'unavailable', message: 'Thách đố chưa sẵn sàng trên máy chủ.' }, 503);
      let questionId: string;
      try { questionId = decodeURIComponent(challengeQuestionMatch[1]); } catch { return failure({ ok: false, code: 'invalid', message: 'Mã câu hỏi không hợp lệ.' }); }
      const result = await dependencies.challengeAuthoring.reviseQuestion(student.studentId, questionId, bodyObject(request) as ReviseChallengeQuestionInput);
      if (!result.ok) return failure(result);
      const { ok: _ok, ...question } = result;
      return success({ question });
    }
    const classroomMessagesMatch = pathname.match(/^\/api\/me\/friends\/([^/]+)\/messages$/);
    if (classroomMessagesMatch && (method === 'GET' || method === 'POST')) {
      const student = await authorizeStudent(request);
      if (!student.ok) return student.response;
      if (!dependencies.classroom) return failure({ ok: false, code: 'unavailable', message: 'Classroom chưa sẵn sàng trên máy chủ.' }, 503);
      const peerId = decodeClassroomPeerId(classroomMessagesMatch[1]);
      if (typeof peerId !== 'string') return failure(peerId);
      if (method === 'GET') {
        const requestedLimit = Number(query.get('limit') ?? 50);
        const limit = Math.min(50, Math.max(1, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 50));
        const result = await dependencies.classroom.listMessages(student.studentId, peerId, limit);
        return 'ok' in result ? failure(result) : success(result);
      }
      const body = bodyObject(request);
      if (Object.keys(body).some((key) => key !== 'body') || typeof body.body !== 'string') return failure({ ok: false, code: 'invalid', message: 'Tin nhắn chỉ cho phép nội dung.' });
      const result = await dependencies.classroom.sendMessage(student.studentId, peerId, body.body);
      return 'ok' in result ? failure(result) : success(result);
    }
    const classroomReadMatch = pathname.match(/^\/api\/me\/friends\/([^/]+)\/read$/);
    if (classroomReadMatch && method === 'POST') {
      const student = await authorizeStudent(request);
      if (!student.ok) return student.response;
      if (!dependencies.classroom) return failure({ ok: false, code: 'unavailable', message: 'Classroom chưa sẵn sàng trên máy chủ.' }, 503);
      const peerId = decodeClassroomPeerId(classroomReadMatch[1]);
      if (typeof peerId !== 'string') return failure(peerId);
      const result = await dependencies.classroom.markRead(student.studentId, peerId);
      return 'ok' in result ? failure(result) : success(result);
    }
    if (method === 'GET' && pathname === '/api/me/profile') {
      const token = requireToken(request);
      if (typeof token !== 'string') return failure(token, 401);
      const result = await auth.getStudentProfile(token);
      if (!result.ok) return failure(result);
      return success({ profile: result.profile });
    }
    if (method === 'PATCH' && pathname === '/api/me/profile') {
      const token = requireToken(request);
      if (typeof token !== 'string') return failure(token, 401);
      const patch = profilePatchFromBody(bodyObject(request));
      if ('ok' in patch) return failure(patch);
      const result = await auth.updateStudentProfile(token, patch);
      if (!result.ok) return failure(result);
      return success({ profile: result.profile });
    }
    if (method === 'POST' && pathname === '/api/parent/unlock') {
      const token = requireToken(request);
      if (typeof token !== 'string') return failure(token, 401);
      const body = bodyObject(request);
      const result = await auth.unlockParent(token, String(body.pin ?? ''));
      if (!result.ok) return failure(result);
      return withCookie(success({ accessToken: result.token, session: publicSession(result.session), ...(result.mustChange ? { mustChange: true } : {}), ...(result.parentGrantUntil ? { parentGrantUntil: result.parentGrantUntil } : {}), ...(result.parentGrantToken ? { parentGrantToken: result.parentGrantToken } : {}) }), setSessionCookie(result.token, result.session.expiresAt, 'student'));
    }
    if (method === 'POST' && pathname === '/api/parent/change-pin') {
      const token = requireToken(request);
      if (typeof token !== 'string') return failure(token, 401);
      const body = bodyObject(request);
      const session = await auth.getSession(token);
      if ('ok' in session) return failure(session, 401);
      if (session.mode === 'full') {
        const parent = await auth.getParentDashboard(token, parentGrantToken(request));
        if (!parent.ok) return failure(parent);
      }
      const result = await auth.changePin(token, String(body.currentPin ?? ''), String(body.newPin ?? ''), 'parent');
      if (!result.ok) return failure(result);
      return withCookie(success({ accessToken: result.token, session: publicSession(result.session) }), setSessionCookie(result.token, result.session.expiresAt, 'student'));
    }
    if (method === 'POST' && pathname === '/api/parent/lock') {
      const token = sessionToken(request);
      if (token) await auth.clearParentGrant(token);
      return success({});
    }
    if (method === 'GET' && pathname === '/api/parent/challenge/questions/pending') {
      const parent = await authorizeParent(request);
      if (!parent.ok) return parent.response;
      if (!dependencies.challengeReview) return failure({ ok: false, code: 'unavailable', message: 'Hàng đợi duyệt Thách đố chưa sẵn sàng trên máy chủ.' }, 503);
      const result = await dependencies.challengeReview.listPending(parent.studentId);
      if (!result.ok) return failure(result);
      return success({ questions: result.items });
    }
    const parentReviewMatch = pathname.match(/^\/api\/parent\/challenge\/questions\/([^/]+)\/review$/);
    if (parentReviewMatch && method === 'POST') {
      const parent = await authorizeParent(request);
      if (!parent.ok) return parent.response;
      if (!dependencies.challengeReview) return failure({ ok: false, code: 'unavailable', message: 'Hàng đợi duyệt Thách đố chưa sẵn sàng trên máy chủ.' }, 503);
      const questionId = decodeChallengeQuestionId(parentReviewMatch[1]);
      if (typeof questionId !== 'string') return failure(questionId);
      const body = bodyObject(request);
      const revision = typeof body.revision === 'number' ? body.revision : undefined;
      const reviewInput: ChallengeReviewRequest = body.decision === 'request_revision'
        ? { decision: 'request_revision', reason: typeof body.reason === 'string' ? body.reason : '', revision }
        : body.decision === 'approve'
          ? { decision: 'approve', revision }
          : { decision: body.decision, revision } as unknown as ChallengeReviewRequest;
      const result = await dependencies.challengeReview.review(parent.studentId, questionId, reviewInput);
      if (!result.ok) return failure(result);
      const { ok: _ok, ...question } = result;
      return success({ question });
    }
    const parentWithdrawMatch = pathname.match(/^\/api\/parent\/challenge\/questions\/([^/]+)\/withdraw$/);
    if (parentWithdrawMatch && method === 'POST') {
      const parent = await authorizeParent(request);
      if (!parent.ok) return parent.response;
      if (!dependencies.challengeReview) return failure({ ok: false, code: 'unavailable', message: 'Hàng đợi duyệt Thách đố chưa sẵn sàng trên máy chủ.' }, 503);
      const questionId = decodeChallengeQuestionId(parentWithdrawMatch[1]);
      if (typeof questionId !== 'string') return failure(questionId);
      const result = await dependencies.challengeReview.withdraw(parent.studentId, questionId);
      if (!result.ok) return failure(result);
      return success({});
    }
    if (method === 'GET' && pathname === '/api/parent/challenge/settings') {
      const parent = await authorizeParent(request);
      if (!parent.ok) return parent.response;
      if (!dependencies.challengeReview) return failure({ ok: false, code: 'unavailable', message: 'Cài đặt Thách đố chưa sẵn sàng trên máy chủ.' }, 503);
      const result = await dependencies.challengeReview.getSettings(parent.studentId);
      if (!result.ok) return failure(result);
      const { ok: _ok, ...settings } = result;
      return success({ settings });
    }
    if (method === 'PATCH' && pathname === '/api/parent/challenge/settings') {
      const parent = await authorizeParent(request);
      if (!parent.ok) return parent.response;
      if (!dependencies.challengeReview) return failure({ ok: false, code: 'unavailable', message: 'Cài đặt Thách đố chưa sẵn sàng trên máy chủ.' }, 503);
      const body = bodyObject(request);
      const patch: ChallengePreferencesPatch = {};
      if (Object.prototype.hasOwnProperty.call(body, 'canCreate')) patch.canCreate = body.canCreate as boolean;
      if (Object.prototype.hasOwnProperty.call(body, 'canParticipate')) patch.canParticipate = body.canParticipate as boolean;
      const result = await dependencies.challengeReview.updateSettings(parent.studentId, patch);
      if (!result.ok) return failure(result);
      const { ok: _ok, ...settings } = result;
      return success({ settings });
    }
    const challengeResolveReportMatch = pathname.match(/^\/api\/admin\/challenge\/reports\/([^/]+)\/resolve$/);
    if (challengeResolveReportMatch && method === 'POST') {
      const admin = await authorizeAdmin(request);
      if (!admin.ok) return admin.response;
      if (!dependencies.challengeSocial) return failure({ ok: false, code: 'unavailable', message: 'Kiểm duyệt Thách đố chưa sẵn sàng trên máy chủ.' }, 503);
      const reportId = decodeChallengeQuestionId(challengeResolveReportMatch[1]);
      if (typeof reportId !== 'string') return failure(reportId);
      const body = bodyObject(request);
      if (!challengeObjectHasOnly(body, ['decision', 'reason'])) return failure({ ok: false, code: 'invalid', message: 'Xử lý báo cáo chỉ cho phép quyết định và lý do.' });
      const input: ResolveChallengeReportInput = { decision: body.decision as ResolveChallengeReportInput['decision'], reason: typeof body.reason === 'string' ? body.reason : '' };
      const result = await dependencies.challengeSocial.resolveReport(admin.adminId, reportId, input);
      if (!result.ok) return failure(result);
      return success({});
    }
    const challengeVoidQuestionMatch = pathname.match(/^\/api\/admin\/challenge\/questions\/([^/]+)\/void$/);
    if (challengeVoidQuestionMatch && method === 'POST') {
      const admin = await authorizeAdmin(request);
      if (!admin.ok) return admin.response;
      if (!dependencies.challengeSocial) return failure({ ok: false, code: 'unavailable', message: 'Kiểm duyệt Thách đố chưa sẵn sàng trên máy chủ.' }, 503);
      const questionId = decodeChallengeQuestionId(challengeVoidQuestionMatch[1]);
      if (typeof questionId !== 'string') return failure(questionId);
      const body = bodyObject(request);
      if (!challengeObjectHasOnly(body, ['reason'])) return failure({ ok: false, code: 'invalid', message: 'Tạm dừng câu hỏi cần một lý do.' });
      const result = await dependencies.challengeSocial.voidQuestion(admin.adminId, questionId, typeof body.reason === 'string' ? body.reason : '');
      if (!result.ok) return failure(result);
      return success({});
    }
    if (method === 'GET' && pathname === '/api/parent/profile') {
      const token = requireToken(request);
      if (typeof token !== 'string') return failure(token, 401);
      const result = await auth.getParentProfile(token, parentGrantToken(request));
      if (!result.ok) return failure(result);
      return success({ profile: result.profile });
    }
    if (method === 'PATCH' && pathname === '/api/parent/profile-preferences') {
      const token = requireToken(request);
      if (typeof token !== 'string') return failure(token, 401);
      const body = bodyObject(request);
      const enabled = Object.prototype.hasOwnProperty.call(body, 'birthdayWishesEnabled') ? body.birthdayWishesEnabled : undefined;
      const result = await auth.updateParentProfilePreferences(token, parentGrantToken(request), enabled as boolean);
      if (!result.ok) return failure(result);
      return success({ profile: result.profile });
    }
    if (method === 'GET' && pathname === '/api/parent/dashboard') {
      const parent = await authorizeParent(request, query.get('studentId') ?? undefined);
      if (!parent.ok) return parent.response;
      const session = await auth.getSession(parent.token);
      if ('ok' in session) return failure(session, 401);
      if (!dependencies.learning) return success({ studentId: parent.studentId, session: publicSession(session) });
      const requestedRange = query.get('range') ?? 'all';
      if (requestedRange !== '7d' && requestedRange !== '30d' && requestedRange !== 'all') return failure({ ok: false, code: 'invalid', message: 'Khoảng thời gian Dashboard không hợp lệ.' });
      const dashboard = await dependencies.learning.getDashboard(parent.studentId, requestedRange);
      return success({ studentId: parent.studentId, session: publicSession(session), snapshot: dashboard.snapshot, dashboard, events: dashboard.events });
    }
    if (method === 'GET' && pathname === '/api/parent/export') {
      const parent = await authorizeParent(request);
      if (!parent.ok) return parent.response;
      if (!dependencies.learning) return failure({ ok: false, code: 'unavailable', message: 'Kho tiến độ local chưa sẵn sàng.' }, 503);
      const exported = await dependencies.learning.exportBackup(parent.studentId);
      return success({ studentId: parent.studentId, backup: exported.backup, revision: exported.snapshot.revision, generation: exported.snapshot.generation });
    }
    if (method === 'POST' && pathname === '/api/parent/import/preview') {
      const parent = await authorizeParent(request);
      if (!parent.ok) return parent.response;
      if (!dependencies.learning) return failure({ ok: false, code: 'unavailable', message: 'Kho tiến độ local chưa sẵn sàng.' }, 503);
      const body = bodyObject(request);
      const result = await dependencies.learning.previewImport(parent.studentId, typeof body.backup === 'string' ? body.backup : '');
      if (!result.ok) return failure(result);
      return success({ preview: result.preview });
    }
    if (method === 'POST' && pathname === '/api/parent/import') {
      const parent = await authorizeParent(request);
      if (!parent.ok) return parent.response;
      if (!dependencies.learning) return failure({ ok: false, code: 'unavailable', message: 'Kho tiến độ local chưa sẵn sàng.' }, 503);
      const body = bodyObject(request);
      const result = await dependencies.learning.importProgress(parent.studentId, typeof body.backup === 'string' ? body.backup : '', String(body.fingerprint ?? ''), Number(body.expectedRevision));
      if (!result.ok) return failure(result);
      return success({ snapshot: result.snapshot, duplicate: result.duplicate });
    }
    if (method === 'POST' && pathname === '/api/parent/reset') {
      const parent = await authorizeParent(request);
      if (!parent.ok) return parent.response;
      if (!dependencies.learning) return failure({ ok: false, code: 'unavailable', message: 'Kho tiến độ local chưa sẵn sàng.' }, 503);
      const result = await dependencies.learning.resetProgress(parent.studentId);
      return success({ snapshot: result.snapshot });
    }
    if (method === 'GET' && pathname === '/api/me/progress') {
      const token = requireToken(request);
      if (typeof token !== 'string') return failure(token, 401);
      const session = await auth.getSession(token);
      if ('ok' in session) return failure(session, 401);
      if (session.account.role !== 'student' || session.mode !== 'full') return failure({ ok: false, code: 'forbidden', message: 'Hãy hoàn tất bước đổi PIN trước khi mở tiến độ.' }, 403);
      if (!dependencies.learning) return failure({ ok: false, code: 'unavailable', message: 'Kho tiến độ local chưa sẵn sàng.' }, 503);
      const progress = await dependencies.learning.getProgress(session.account.id);
      return success({ snapshot: progress.snapshot, ...(progress.currentRun ? { currentRun: progress.currentRun } : {}) });
    }
    if (method === 'GET' && pathname === '/api/me/progress-board/config') {
      const student = await authorizeStudent(request);
      if (!student.ok) return student.response;
      return success({ config: getProgressBoardRolloutConfig() });
    }
    if (method === 'GET' && pathname === '/api/me/progress-board') {
      const student = await authorizeStudent(request);
      if (!student.ok) return student.response;
      return measureData(request, async () => {
        if (!isProgressBoardRolloutEnabled()) return failure(progressBoardRolloutFailure(), 503);
        if (!dependencies.learning) return failure({ ok: false, code: 'unavailable', message: 'Kho tiến bộ local chưa sẵn sàng.' }, 503);
        const data = await dependencies.learning.getProgressBoard(student.studentId);
        return success({ data });
      });
    }
    if (method === 'POST' && pathname === '/api/me/events') {
      const token = requireToken(request);
      if (typeof token !== 'string') return failure(token, 401);
      const session = await auth.getSession(token);
      if ('ok' in session) return failure(session, 401);
      if (session.account.role !== 'student' || session.mode !== 'full') return failure({ ok: false, code: 'forbidden', message: 'Hãy hoàn tất bước đổi PIN trước khi ghi tiến độ.' }, 403);
      if (!dependencies.learning) return failure({ ok: false, code: 'unavailable', message: 'Kho tiến độ local chưa sẵn sàng.' }, 503);
      const body = bodyObject(request);
      if (!Array.isArray(body.events) || !body.events.every(isLearningEvent)) return failure({ ok: false, code: 'invalid', message: 'Danh sách event không hợp lệ.' }, 400);
      const result = await dependencies.learning.appendEvents(session.account.id, body.events);
      if (!result.ok) return failure(result);
      return success({ snapshot: result.snapshot, acknowledgements: result.acknowledgements });
    }
    if (method === 'GET' && pathname === '/api/admin/students') {
      const token = requireToken(request);
      if (typeof token !== 'string') return failure(token, 401);
      const result = await auth.listStudents(token);
      if (!result.ok) return failure(result);
      return success({ accounts: result.accounts });
    }
    if (method === 'POST' && pathname === '/api/admin/students') {
      const token = requireToken(request);
      if (typeof token !== 'string') return failure(token, 401);
      const body = bodyObject(request);
      const result = await auth.createStudent(token, String(body.username ?? ''), String(body.displayName ?? ''));
      if (!result.ok) return failure(result);
      return success({ account: result.account });
    }
    const studentMatch = pathname.match(/^\/api\/admin\/students\/([^/]+)$/);
    if (studentMatch && method === 'PATCH') {
      const token = requireToken(request);
      if (typeof token !== 'string') return failure(token, 401);
      const body = bodyObject(request);
      const patch: { displayName?: string; active?: boolean } = {};
      if (typeof body.displayName === 'string') patch.displayName = body.displayName;
      if (typeof body.active === 'boolean') patch.active = body.active;
      const result = await auth.updateStudent(token, decodeURIComponent(studentMatch[1]), patch);
      if (!result.ok) return failure(result);
      return success({ account: result.account });
    }
    const resetMatch = pathname.match(/^\/api\/admin\/students\/([^/]+)\/reset-pin$/);
    if (resetMatch && method === 'POST') {
      const token = requireToken(request);
      if (typeof token !== 'string') return failure(token, 401);
      const body = bodyObject(request);
      const kind = body.kind === 'parent' ? 'parent' : 'student';
      const result = await auth.resetPin(token, decodeURIComponent(resetMatch[1]), kind);
      if (!result.ok) return failure(result);
      return success({});
    }
    return { statusCode: 404, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }, body: { ok: false, code: 'invalid', message: 'Không tìm thấy API.' } };
  }

  async function handle(request: AppRequest): Promise<AppResponse> {
    try {
      const response = await dispatch(request);
      if (!request.timing) return response;
      request.timing.finish();
      return { ...response, headers: { ...response.headers, 'Server-Timing': request.timing.header() } };
    } catch (error) {
      request.timing?.finish();
      throw error;
    }
  }

  return { handle };
}

let defaultAppPromise: Promise<{ app: ReturnType<typeof createApp>; db: DatabaseClient }> | null = null;

export async function getDefaultApp(): Promise<{ app: ReturnType<typeof createApp>; db: DatabaseClient }> {
  if (!defaultAppPromise) {
    defaultAppPromise = Promise.resolve().then(() => {
      const db = createDbClient();
      const authRepository = new PostgresAuthRepository(db);
      const auth = createAuthService(authRepository);
      const learning = createLearningService(new PostgresLearningRepository(db));
      const classroom = createClassroomService(new PostgresClassroomRepository(db), () => new Date(), createSupabaseClassroomRealtimeBridge());
      const challengeAuthoringRepository = new PostgresAuthoringRepository(db);
      const challengeAuthoring = createChallengeAuthoringService({
        repository: challengeAuthoringRepository,
        sourceCatalog: CHALLENGE_SOURCE_FACTS,
        activeStudentDisplayNames: async () => (await authRepository.listStudents()).filter((account) => account.role === 'student' && account.active).map((account) => account.displayName),
        clock: () => new Date(),
        idFactory: randomUUID,
      });
      const challengeReview = createChallengeReviewService({ repository: challengeAuthoringRepository, clock: () => new Date() });
      const challengePlayRepository = new PostgresPlayRepository(db);
      const challengeReadRepository = new PostgresChallengeReadRepository(db);
      const challengePlay = createChallengePlayService({
        authoring: challengeAuthoringRepository,
        play: challengePlayRepository,
        read: challengeReadRepository,
        clock: () => new Date(),
        activeStudentCount: () => authRepository.countActiveStudents(),
        idFactory: randomUUID,
      });
      const challengeSocial = createChallengeSocialService({ authoring: challengeAuthoringRepository, play: challengePlayRepository, clock: () => new Date() });
      const challengeWeekly = createChallengeWeeklyService({
        authoring: challengeAuthoringRepository,
        play: challengePlayRepository,
        now: () => new Date(),
        activeStudentIds: () => authRepository.listActiveStudentIds(),
        read: challengeReadRepository,
      });
      return { app: createApp({ auth, learning, classroom, challengeAuthoring, challengeReview, challengePlay, challengeSocial, challengeWeekly }), db };
    }).catch((error) => {
      defaultAppPromise = null;
      throw error;
    });
  }
  return defaultAppPromise;
}

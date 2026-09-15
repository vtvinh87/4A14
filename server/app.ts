import { createDbClient, type DatabaseClient } from './db/client';
import { PostgresAuthRepository } from './auth/postgresRepository';
import { createAuthService } from './auth/service';
import type { AuthFailure, AuthSessionView } from './auth/types';
import { PostgresLearningRepository } from './learning/postgresRepository';
import { createLearningService } from './learning/service';
import type { LearningEventInput, LearningFailure } from '../shared/learning-contracts';
import type { StudentProfilePatch } from '../shared/account-contracts';

const SESSION_COOKIE = 'hoc_vui_session';
const LOCAL_SESSION_MAX_AGE = 7 * 24 * 60 * 60;
const ADMIN_SESSION_MAX_AGE = 8 * 60 * 60;

export type AppRequest = {
  method: string;
  path: string;
  headers?: Record<string, string | undefined>;
  body?: unknown;
};

export type AppResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: Record<string, unknown>;
};

type AuthService = ReturnType<typeof createAuthService>;
type LearningService = ReturnType<typeof createLearningService>;

export type AppDependencies = {
  auth: AuthService;
  learning?: LearningService;
  close?: () => Promise<void>;
};

type ParentAuthorization = { ok: true; token: string; studentId: string } | { ok: false; response: AppResponse };

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

function failure(failure: AuthFailure | LearningFailure, statusCode = statusForFailure(failure)): AppResponse {
  return { statusCode, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }, body: failure };
}

function statusForFailure(failure: AuthFailure | LearningFailure): number {
  if (failure.code === 'forbidden') return 403;
  if (failure.code === 'conflict') return 409;
  if (failure.code === 'locked') return 423;
  if (failure.code === 'expired') return 401;
  if (failure.code === 'stale') return 409;
  if (failure.code === 'unavailable') return 503;
  return 400;
}

function cookieFlags(): string {
  const secure = process.env.NODE_ENV === 'production' || process.env.HOC_VUI_COOKIE_SECURE === 'true';
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
    return !host || originUrl.host === host;
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

export function createApp(dependencies: AppDependencies) {
  const { auth } = dependencies;

  async function authorizeParent(request: AppRequest, requestedStudentId?: string): Promise<ParentAuthorization> {
    const token = requireToken(request);
    if (typeof token !== 'string') return { ok: false, response: failure(token, 401) };
    const result = await auth.getParentDashboard(token, parentGrantToken(request), requestedStudentId);
    return result.ok ? { ok: true, token, studentId: result.studentId } : { ok: false, response: failure(result) };
  }

  async function handle(request: AppRequest): Promise<AppResponse> {
    const { pathname, query } = routeParts(request);
    const method = request.method.toUpperCase();
    const isWrite = method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE';
    if (isWrite && !sameOrigin(request)) return failure({ ok: false, code: 'forbidden', message: 'Yêu cầu không cùng nguồn.' }, 403);

    if (method === 'POST' && pathname === '/api/auth/student/login') {
      const body = bodyObject(request);
      const result = await auth.loginStudent(String(body.username ?? ''), String(body.pin ?? ''));
      if (!result.ok) return failure(result);
      return withCookie(success({ session: publicSession(result.session), ...(result.mustChange ? { mustChange: true } : {}) }), setSessionCookie(result.token, result.session.expiresAt, 'student'));
    }
    if (method === 'POST' && pathname === '/api/auth/admin/login') {
      const body = bodyObject(request);
      const result = await auth.loginAdmin(String(body.username ?? ''), String(body.password ?? ''));
      if (!result.ok) return failure(result);
      return withCookie(success({ session: publicSession(result.session) }), setSessionCookie(result.token, result.session.expiresAt, 'admin'));
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
      return withCookie(success({ session: publicSession(result.session) }), setSessionCookie(result.token, result.session.expiresAt, 'student'));
    }
    if (method === 'POST' && pathname === '/api/auth/admin/change-password') {
      const token = requireToken(request);
      if (typeof token !== 'string') return failure(token, 401);
      const body = bodyObject(request);
      const result = await auth.changeAdminPassword(token, String(body.currentPassword ?? ''), String(body.newPassword ?? ''));
      if (!result.ok) return failure(result);
      return withCookie(success({ session: publicSession(result.session) }), setSessionCookie(result.token, result.session.expiresAt, 'admin'));
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
      return withCookie(success({ session: publicSession(result.session), ...(result.mustChange ? { mustChange: true } : {}), ...(result.parentGrantUntil ? { parentGrantUntil: result.parentGrantUntil } : {}), ...(result.parentGrantToken ? { parentGrantToken: result.parentGrantToken } : {}) }), setSessionCookie(result.token, result.session.expiresAt, 'student'));
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
      return withCookie(success({ session: publicSession(result.session) }), setSessionCookie(result.token, result.session.expiresAt, 'student'));
    }
    if (method === 'POST' && pathname === '/api/parent/lock') {
      const token = sessionToken(request);
      if (token) await auth.clearParentGrant(token);
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

  return { handle };
}

let defaultAppPromise: Promise<{ app: ReturnType<typeof createApp>; db: DatabaseClient }> | null = null;

export async function getDefaultApp(): Promise<{ app: ReturnType<typeof createApp>; db: DatabaseClient }> {
  if (!defaultAppPromise) {
    defaultAppPromise = Promise.resolve().then(() => {
      const db = createDbClient();
      const auth = createAuthService(new PostgresAuthRepository(db));
      const learning = createLearningService(new PostgresLearningRepository(db));
      return { app: createApp({ auth, learning }), db };
    }).catch((error) => {
      defaultAppPromise = null;
      throw error;
    });
  }
  return defaultAppPromise;
}

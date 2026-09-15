import type { AccountApiFailure, AccountApiFailureCode, AccountView, ClientAuthSession, StudentProfilePatch, StudentProfileView } from '../../shared/account-contracts';
import type { AccountProgressSnapshot, CurrentLearningRun, LearningEventAcknowledgement, LearningEventInput, LearningEventRecord, MigrationPreview } from '../../shared/learning-contracts';
import type { DashboardRange, ParentDashboardData } from '../../shared/dashboard-contracts';

export type ClientSession = ClientAuthSession & { mustChange: boolean };
export type ClientAccount = AccountView;
export type StudentProfileResponse = { profile: StudentProfileView };
export type ParentDashboardResponse = { studentId: string; snapshot: AccountProgressSnapshot; dashboard: ParentDashboardData; events: LearningEventRecord[] };
export type ApiFailure = AccountApiFailure | { ok: false; code: AccountApiFailureCode | 'unavailable'; message: string };
export type ApiResult<T> = { ok: true } & T | ApiFailure;

const SESSION_TOKEN_KEY = 'hoc_vui_session_token';

function readSessionToken(): string | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeSessionToken(token: string | null): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (token) sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    else sessionStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // Private browsing and restricted embedded contexts can deny storage access.
  }
}

let sessionToken: string | null = readSessionToken();

// The parent grant is deliberately page-memory only. It is never written to
// localStorage/sessionStorage and therefore disappears on a reload.
let parentGrantToken: string | null = null;

function failureFromNetwork(): ApiFailure {
  return { ok: false, code: 'unavailable', message: 'Chưa kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.' };
}

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');
}

function requestUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = apiBaseUrl();
  if (!base) return normalizedPath;
  // The configured production base points at the `api` Edge function itself;
  // its application routes already begin with `/api`, so append only the
  // route suffix and avoid `/functions/v1/api/api/...`.
  if (/\/functions\/v1\/[^/]+$/.test(base) && normalizedPath.startsWith('/api/')) return `${base}${normalizedPath.slice('/api'.length)}`;
  return `${base}${normalizedPath}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

async function request<T extends Record<string, unknown>>(path: string, init: RequestInit = {}, includeParentGrant = false): Promise<ApiResult<T>> {
  try {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (sessionToken) headers.set('Authorization', `Bearer ${sessionToken}`);
    if (includeParentGrant && parentGrantToken) headers.set('X-Parent-Grant', parentGrantToken);
    const response = await fetch(requestUrl(path), { ...init, headers, credentials: 'include' });
    let payload: unknown = null;
    try { payload = await response.json(); } catch { /* keep a stable localized error below */ }
    if (!response.ok || !payload || typeof payload !== 'object') {
      if (payload && typeof payload === 'object' && 'message' in payload) return payload as ApiFailure;
      return { ok: false, code: response.status === 503 ? 'unavailable' : 'invalid', message: 'Máy chủ chưa thể xử lý yêu cầu.' };
    }
    if (isRecord(payload) && typeof payload.accessToken === 'string' && payload.accessToken) {
      sessionToken = payload.accessToken;
      writeSessionToken(sessionToken);
    }
    return payload as ApiResult<T>;
  } catch {
    return failureFromNetwork();
  }
}

function jsonBody(value: Record<string, unknown>): RequestInit {
  return { method: 'POST', body: JSON.stringify(value) };
}

export async function getCurrentAuthSession(): Promise<ApiResult<{ session: ClientSession } | { session: null }>> {
  parentGrantToken = null;
  const result = await request<{ session: ClientSession }>('/api/auth/me');
  if (!result.ok && (result.code === 'expired' || result.code === 'forbidden')) {
    sessionToken = null;
    writeSessionToken(null);
    return { ok: true, session: null };
  }
  return result.ok ? { ...result, session: { ...result.session, mustChange: result.session.mode === 'change-only' } } : result;
}

export async function loginStudent(username: string, pin: string): Promise<ApiResult<{ session: ClientSession; mustChange?: boolean; accessToken?: string }>> {
  const result = await request<{ session: ClientSession; mustChange?: boolean; accessToken?: string }>('/api/auth/student/login', jsonBody({ username, pin }));
  if (!result.ok) return result;
  return { ...result, session: { ...result.session, mustChange: Boolean(result.mustChange ?? result.session.mode === 'change-only') } };
}

export async function loginAdmin(username: string, password: string): Promise<ApiResult<{ session: ClientSession; accessToken?: string }>> {
  const result = await request<{ session: ClientSession; accessToken?: string }>('/api/auth/admin/login', jsonBody({ username, password }));
  if (!result.ok) return result;
  return { ...result, session: { ...result.session, mustChange: false } };
}

export async function getStudentProfile(): Promise<ApiResult<StudentProfileResponse>> {
  return request('/api/me/profile');
}

export async function updateStudentProfile(patch: StudentProfilePatch): Promise<ApiResult<StudentProfileResponse>> {
  return request('/api/me/profile', { method: 'PATCH', body: JSON.stringify(patch) });
}

export async function getParentProfile(): Promise<ApiResult<StudentProfileResponse>> {
  return request('/api/parent/profile', {}, true);
}

export async function updateParentProfilePreferences(enabled: boolean): Promise<ApiResult<StudentProfileResponse>> {
  return request('/api/parent/profile-preferences', { method: 'PATCH', body: JSON.stringify({ birthdayWishesEnabled: enabled }) }, true);
}

export async function changeStudentPin(currentPin: string, newPin: string): Promise<ApiResult<{ session: ClientSession; accessToken?: string }>> {
  parentGrantToken = null;
  const result = await request<{ session: ClientSession; accessToken?: string }>('/api/auth/student/change-pin', jsonBody({ currentPin, newPin }));
  return result.ok ? { ...result, session: { ...result.session, mustChange: false } } : result;
}

export async function changeParentPin(currentPin: string, newPin: string): Promise<ApiResult<{ session: ClientSession; accessToken?: string }>> {
  const result = await request<{ session: ClientSession; accessToken?: string }>('/api/parent/change-pin', jsonBody({ currentPin, newPin }), true);
  parentGrantToken = null;
  return result.ok ? { ...result, session: { ...result.session, mustChange: false } } : result;
}

export async function unlockParent(pin: string): Promise<ApiResult<{ session: ClientSession; mustChange?: boolean; parentGrantUntil?: string; parentGrantToken?: string; accessToken?: string }>> {
  const result = await request<{ session: ClientSession; mustChange?: boolean; parentGrantUntil?: string; parentGrantToken?: string; accessToken?: string }>('/api/parent/unlock', jsonBody({ pin }));
  if (!result.ok) return result;
  parentGrantToken = result.parentGrantToken ?? null;
  return { ...result, session: { ...result.session, mustChange: Boolean(result.mustChange ?? result.session.mode === 'change-only') } };
}

export async function lockParent(): Promise<ApiResult<Record<string, never>>> {
  const result = await request<Record<string, never>>('/api/parent/lock', jsonBody({}), true);
  parentGrantToken = null;
  return result;
}

export async function logout(): Promise<ApiResult<Record<string, never>>> {
  const result = await request<Record<string, never>>('/api/auth/logout', jsonBody({}));
  parentGrantToken = null;
  sessionToken = null;
  writeSessionToken(null);
  return result;
}

export async function listStudentAccounts(): Promise<ApiResult<{ accounts: ClientAccount[] }>> {
  return request('/api/admin/students');
}

export async function createStudentAccount(username: string, displayName: string): Promise<ApiResult<{ account: ClientAccount }>> {
  return request('/api/admin/students', jsonBody({ username, displayName }));
}

export async function updateStudentAccount(studentId: string, patch: { displayName?: string; active?: boolean }): Promise<ApiResult<{ account: ClientAccount }>> {
  return request(`/api/admin/students/${encodeURIComponent(studentId)}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export async function resetStudentPin(studentId: string, kind: 'student' | 'parent' = 'student'): Promise<ApiResult<Record<string, never>>> {
  return request(`/api/admin/students/${encodeURIComponent(studentId)}/reset-pin`, jsonBody({ kind }));
}

export async function getParentDashboard(range: DashboardRange = 'all'): Promise<ApiResult<ParentDashboardResponse>> {
  return request(`/api/parent/dashboard?range=${range}`, {}, true);
}

export async function getParentExport(): Promise<ApiResult<{ studentId: string; backup: string; revision: number; generation: number }>> {
  return request('/api/parent/export', {}, true);
}

export async function previewParentImport(backup: string): Promise<ApiResult<{ preview: MigrationPreview }>> {
  return request('/api/parent/import/preview', jsonBody({ backup }), true);
}

export async function importParentProgress(backup: string, fingerprint: string, expectedRevision: number): Promise<ApiResult<{ snapshot: AccountProgressSnapshot; duplicate: boolean }>> {
  return request('/api/parent/import', jsonBody({ backup, fingerprint, expectedRevision }), true);
}

export async function resetParentProgress(): Promise<ApiResult<{ snapshot: AccountProgressSnapshot }>> {
  return request('/api/parent/reset', jsonBody({}), true);
}

export async function getAccountProgress(): Promise<ApiResult<{ snapshot: AccountProgressSnapshot; currentRun?: CurrentLearningRun }>> {
  return request('/api/me/progress');
}

export async function sendLearningEvents(events: LearningEventInput[]): Promise<ApiResult<{ snapshot: AccountProgressSnapshot; acknowledgements: LearningEventAcknowledgement[] }>> {
  return request('/api/me/events', jsonBody({ events }));
}

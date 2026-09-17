# API Latency and Persistent Student Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giảm round-trip và truy vấn dư thừa ở các luồng đồng bộ chính, đồng thời duy trì phiên học sinh trên iOS/Safari tối đa 30 ngày với checkbox mặc định bật và không làm mất parent-scope security.

**Architecture:** Giữ Firebase static frontend, Supabase Edge Function và opaque application sessions. Thêm persistence policy ở client bằng session storage/local storage tách biệt, TTL 30 ngày chỉ cho full student session được chọn ghi nhớ; thêm classroom bootstrap API additive có fallback, sau đó tối ưu từng repository query mà không mở private schema cho browser.

**Tech Stack:** React/Vite, TypeScript, Vitest, Supabase Edge/Deno adapter, `postgres` transaction pooler, existing Memory repositories.

> **Execution status (2026-09-17):** Tasks 1–10 have been implemented in the isolated branch `codex/performance-persistent-session` and verified with the full test suite plus typecheck, production build, Deno/Edge runtime checks, and Firebase hosting validation. The student remember-device option is on by default and is capped at 30 days. Commits `547c306`, `b051cc9`, and `dd32d83` are pushed; Supabase Edge `api` version 13 and both Firebase Hosting sites are deployed. Version 13 fixes challenge JSONB binding for question creation and downstream play/event writes; live CORS and protected-route boundary smoke checks pass. No PR was created.

## Global Constraints

- Student remembered session mặc định bật trong UI nhưng người dùng có thể tắt; không lưu PIN/password.
- Remembered full student session TTL là 30 ngày; normal student session là 7 ngày; provisional `change-only` session vẫn là 7 ngày.
- Parent grant chỉ page-memory; Admin login không persistent.
- Không dùng `anon key` cho private data, không tăng `HOC_VUI_DB_POOL_MAX`, không đổi region/runtime và không tạo schema migration trong release này.
- Không nhận `studentId`/`actorId` từ client để quyết định data scope; giữ revoked, expiry, active, credential version, role và mode checks.
- API cũ phải tiếp tục hoạt động để PWA/frontend cũ có thể rollback.
- Không commit, push, tạo PR hoặc deploy production trong plan này nếu chưa có user authorization riêng; mọi claim hoàn tất phải có fresh verification.

---

### Task 1: Persistent token storage policy

**Files:**
- Modify: `src/auth/apiClient.ts:19-105,108-166`
- Test: `src/auth/apiClient.transport.test.ts`

**Interfaces:**
- Produces `loginStudent(username: string, pin: string, rememberDevice = true)`.
- Produces storage behavior: session token always lives in `sessionStorage`; when `rememberedStudentSession` is true, the same rotated token also lives in a separate `localStorage` key.
- Produces `clearSessionTokens()` behavior through logout and expired/forbidden `/api/auth/me` responses.

- [ ] **Step 1: Write failing transport tests**

  Add tests that clear both storages before each case and assert:

  ```ts
  it('remembers student login by default and rotates the persistent token', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ok: true, accessToken: 'student-token', session: { mode: 'full' } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, accessToken: 'rotated-token', session: { mode: 'full' } }));
    const api = await import('./apiClient');

    await api.loginStudent('bao04', '246810');
    expect(localStorage.getItem('hoc_vui_remembered_session_token')).toBe('student-token');
    await api.changeStudentPin('246810', '864208');
    expect(localStorage.getItem('hoc_vui_remembered_session_token')).toBe('rotated-token');
  });

  it('clears persistent storage when the student turns remembering off', async () => {
    localStorage.setItem('hoc_vui_remembered_session_token', 'old-token');
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, accessToken: 'session-only', session: { mode: 'full' } }));
    const api = await import('./apiClient');

    await api.loginStudent('bao04', '246810', false);
    expect(localStorage.getItem('hoc_vui_remembered_session_token')).toBeNull();
    expect(sessionStorage.getItem('hoc_vui_session_token')).toBe('session-only');
  });
  ```

  Also add coverage for module reload reading local storage, logout clearing both keys, expiry clearing both keys, and parent grant remaining absent from both storages.

- [ ] **Step 2: Run the focused tests and verify the expected RED state**

  Run:

  ```bash
  npm test -- --run src/auth/apiClient.transport.test.ts
  ```

  Expected: FAIL because the client currently has only session storage and `loginStudent` accepts two arguments.

- [ ] **Step 3: Implement the smallest storage policy**

  In `apiClient.ts`:

  - Add `REMEMBERED_SESSION_TOKEN_KEY = 'hoc_vui_remembered_session_token'`.
  - Read `sessionStorage` first, then `localStorage` when session storage has no token.
  - Track `rememberedStudentSession` in module memory, initialized from the persistent token.
  - Make `loginStudent` default `rememberDevice` to `true`; set the policy before sending the request and include `rememberDevice` in the login body.
  - Make `loginAdmin` disable and clear the persistent student token before the request.
  - Make access-token rotation write session storage and, when the policy is enabled, persistent storage.
  - Include the current student persistence policy in `changeStudentPin` request body without persisting parent grant data.
  - Clear both keys on logout and expired/forbidden current-session results.
  - Catch storage errors independently so blocked local storage falls back to session storage.

- [ ] **Step 4: Run focused tests and then the existing auth transport suite**

  Run:

  ```bash
  npm test -- --run src/auth/apiClient.transport.test.ts src/auth/apiClient.profile.test.ts
  ```

  Expected: all tests pass with no credential or parent-grant values written to local storage.

### Task 2: Server-side 30-day student session policy

**Files:**
- Modify: `server/auth/service.ts:12-25,130-166,180-220`
- Modify: `server/app.ts:291-325`
- Test: `server/auth/service.test.ts`
- Test: `server/app.test.ts`

**Interfaces:**
- `auth.loginStudent(username, pin, rememberDevice?: boolean)`.
- `auth.changePin(token, currentSecret, nextPin, kind, rememberDevice?: boolean)`.
- `POST /api/auth/student/login` and `POST /api/auth/student/change-pin` accept an optional boolean `rememberDevice`; omitted/invalid values behave as `false` for backward compatibility.

- [ ] **Step 1: Write failing TTL and scope tests**

  Add a fixed-clock service test that creates one student and asserts:

  - normal full student session expires exactly 7 days after creation;
  - remembered full student session expires exactly 30 days after creation;
  - remembered default-PIN login returns `change-only` with the normal 7-day TTL;
  - completing student PIN change with `rememberDevice: true` returns a full 30-day session;
  - parent unlock/change from a remembered full student session preserves the 30-day session policy;
  - Admin remains on the existing 8-hour TTL.

  Add API tests proving forged `rememberDevice` values do not change role/scope and parent grant remains required after rotation.

- [ ] **Step 2: Run the focused tests and verify RED**

  Run:

  ```bash
  npm test -- --run server/auth/service.test.ts server/app.test.ts
  ```

  Expected: FAIL because the service methods do not accept the remember flag and all student sessions currently use the 7-day constant.

- [ ] **Step 3: Implement bounded server TTLs**

  - Add `REMEMBERED_STUDENT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000`.
  - Pass the flag only through student login and student change-PIN paths.
  - Make `createSession` select 30 days only for a full student session with the flag; keep provisional change-only sessions at 7 days.
  - Preserve remembered policy when rotating a full student session for parent unlock, parent PIN change or a normal student PIN change by deriving it from the current server session expiry window, without adding a database column.
  - Keep all existing account/session validation and revocation behavior unchanged.
  - Parse the route body with `body.rememberDevice === true`; do not accept arbitrary truthy values.

- [ ] **Step 4: Run focused tests and auth regressions**

  Run:

  ```bash
  npm test -- --run server/auth/service.test.ts server/app.test.ts server/auth/profile.test.ts
  ```

  Expected: all targeted tests pass and JSON responses still contain no credential material.

### Task 3: Student login UI and App wiring

**Files:**
- Modify: `src/views/AuthView.tsx:5-43`
- Modify: `src/App.tsx:537-571,946-951`
- Test: `src/views/AuthView.test.tsx`
- Test: `src/App.test.ts`

**Interfaces:**
- `LoginView.onStudentLogin(username, pin, rememberDevice)`.
- Admin callback remains `(username, password)`.
- UI checkbox label is `Ghi nhớ thiết bị này (tối đa 30 ngày)` and is checked by default only in student mode.

- [ ] **Step 1: Write failing UI tests**

  Update the student submit test to assert `onStudentLogin` receives `('bao04', '012345', true)`. Add a test that unchecks the labeled checkbox and asserts the third argument is `false`; assert that admin submission still calls only the admin callback.

- [ ] **Step 2: Run the focused UI tests and verify RED**

  Run:

  ```bash
  npm test -- --run src/views/AuthView.test.tsx
  ```

  Expected: FAIL because the login view has no remember-device state or checkbox.

- [ ] **Step 3: Implement the UI and App callback**

  - Add `rememberDevice` state initialized to `true`.
  - Render a semantic checkbox only when `mode === 'student'`, with the 30-day label and a short warning that shared devices should turn it off.
  - Pass the selected value to `onStudentLogin`.
  - Update `handleStudentLogin` in `App.tsx` to pass the value to `loginStudent`.
  - Do not add a remember option to Admin or parent PIN forms.

- [ ] **Step 4: Run UI and App tests**

  Run:

  ```bash
  npm test -- --run src/views/AuthView.test.tsx src/App.test.ts
  ```

  Expected: all tests pass and parent PIN UI remains unchanged.

### Task 4: Edge timing headers and CORS preflight cache

**Files:**
- Modify: `supabase/functions/api/index.ts:35-51,86-119`
- Test: `supabase/functions/api/index.test.ts`

**Interfaces:**
- Allowed responses expose `X-Request-Id` and `Server-Timing`.
- Preflight includes a finite `Access-Control-Max-Age` of 300 seconds.

- [ ] **Step 1: Add failing adapter tests**

  Extend the preflight test to require `Access-Control-Max-Age: 300` and `Access-Control-Expose-Headers: X-Request-Id,Server-Timing`. Add a handler test that requires a non-empty UUID-shaped request id and `Server-Timing` containing `app-load` and `handler` durations.

- [ ] **Step 2: Run the adapter tests and verify RED**

  Run:

  ```bash
  npm test -- --run supabase/functions/api/index.test.ts
  ```

  Expected: FAIL because current CORS headers have no max-age/expose headers and the adapter does not measure phases.

- [ ] **Step 3: Implement timing without logging sensitive data**

  - Keep exact-origin allowlisting and `Vary: Origin`.
  - Add finite preflight max-age and exposed diagnostic headers.
  - Generate or propagate a request id without echoing bearer tokens or user data.
  - Measure `loadApp()` and `app.handle()` with `performance.now()` and attach rounded durations to the response; include the same safe headers on controlled 503 responses.

- [ ] **Step 4: Run adapter tests and edge type checks**

  Run:

  ```bash
  npm test -- --run supabase/functions/api/index.test.ts
  deno check --config supabase/functions/api/deno.json supabase/functions/api/index.ts
  ```

### Task 5: Additive classroom bootstrap contract and backend route

**Files:**
- Modify: `shared/classroom-contracts.ts`
- Modify: `server/classroom/types.ts,server/classroom/service.ts,server/classroom/memoryRepository.ts`
- Modify: `server/app.ts:334-354`
- Test: `server/classroom/service.test.ts`
- Test: `server/app.test.ts`

**Interfaces:**
- Add `ClassroomBootstrapResponse = FriendsResponse & { realtime: ClassroomRealtimeConfig | null; presenceUpdated: boolean }`.
- Add `ClassroomService.bootstrap(studentId): Promise<ClassroomBootstrapResponse>`.
- Add `POST /api/me/classroom/bootstrap` with empty-object input and session-derived student scope.

- [ ] **Step 1: Write failing service and route tests**

  Add service cases for successful bootstrap, realtime unavailable, and presence failure that still returns roster with `presenceUpdated: false`. Add app cases for missing token, Admin token, change-only student token, parent-grant header, forged body student id and successful full student response.

- [ ] **Step 2: Run classroom/app tests and verify RED**

  Run:

  ```bash
  npm test -- --run server/classroom/service.test.ts server/app.test.ts
  ```

  Expected: FAIL because the bootstrap contract/method/route do not exist.

- [ ] **Step 3: Implement additive backend behavior**

  - Add the shared response type.
  - Implement `bootstrap` as best-effort presence update, existing roster computation, and nullable realtime configuration.
  - Ensure presence failure cannot discard a successful roster; do not include client-supplied ids in any repository call.
  - Add the route beside the existing friends/presence/realtime routes; keep all old routes untouched.

- [ ] **Step 4: Run focused service and app tests**

  Run:

  ```bash
  npm test -- --run server/classroom/service.test.ts server/app.test.ts
  ```

### Task 6: Use bootstrap on the frontend with compatibility fallback

**Files:**
- Modify: `src/auth/apiClient.ts:230-275`
- Modify: `src/classroom/useClassroomFriends.ts:37-100`
- Test: `src/auth/apiClient.transport.test.ts`
- Test: `src/classroom/useClassroomFriends.test.ts`

**Interfaces:**
- Add `getClassroomBootstrap(): ApiResult<ClassroomBootstrapResponse>`.
- `useClassroomFriends.refresh()` first calls bootstrap; it falls back to the old presence/friends sequence only for a missing/invalid new endpoint.

- [ ] **Step 1: Write failing client/hook tests**

  Assert the wrapper sends `POST /api/me/classroom/bootstrap` with `{}` and no parent grant. Update hook tests to expect one bootstrap request for the initial roster and add a 404 fallback case that preserves the old two-request behavior and stale-response generation guard.

- [ ] **Step 2: Run focused client/hook tests and verify RED**

  Run:

  ```bash
  npm test -- --run src/auth/apiClient.transport.test.ts src/classroom/useClassroomFriends.test.ts
  ```

  Expected: FAIL because the wrapper and hook still call three separate routes.

- [ ] **Step 3: Implement the frontend path**

  - Add the typed API wrapper.
  - In the hook, commit friends/unread from bootstrap, use `presenceUpdated` only for non-fatal diagnostics, and initialize Realtime from the returned nullable config.
  - Keep 15-second polling and visibility/online handlers.
  - Fall back without sending a duplicate bootstrap write; preserve current generation/request-sequence protection.

- [ ] **Step 4: Run focused tests and verify the fallback path**

  Run:

  ```bash
  npm test -- --run src/auth/apiClient.transport.test.ts src/classroom/useClassroomFriends.test.ts
  ```

### Task 7: Non-blocking Admin account refresh

**Files:**
- Modify: `src/views/AdminView.tsx:16-55`
- Test: `src/views/AdminView.test.tsx` (create if the current view has no focused test file)

**Interfaces:**
- `run()` reports success and applies server-returned account state before starting background revalidation.

- [ ] **Step 1: Add a failing component test**

  Render AdminView with mocked API calls, resolve create with a new account while leaving the follow-up list request pending, and assert the success message and new account row appear before the list request resolves. Add an assertion that the account is merged by id rather than duplicated.

- [ ] **Step 2: Run the component test and verify RED**

  Run:

  ```bash
  npm test -- --run src/views/AdminView.test.tsx
  ```

  Expected: FAIL because `run()` awaits `refresh()` before the new row can be canonicalized.

- [ ] **Step 3: Implement server-ACK-first UI state**

  - Add a small merge-by-id helper in the component or a focused local helper.
  - Apply returned account immediately for create/update/toggle.
  - Keep `void refresh()` as background revalidation after success; refresh errors remain visible without undoing the acknowledged server result.
  - Do not retry create POSTs.

- [ ] **Step 4: Run component tests and the Admin/account E2E contract**

  Run:

  ```bash
  npm test -- --run src/views/AdminView.test.tsx tests/e2e/accounts-parent.spec.ts
  ```

### Task 8: Remove credential N+1 queries from student summaries

**Files:**
- Modify: `server/auth/types.ts`
- Modify: `server/auth/memoryRepository.ts`
- Modify: `server/auth/postgresRepository.ts:151-168`
- Modify: `server/auth/service.ts:270-275`
- Modify: `server/app.ts:735-757`
- Test: `server/auth/postgresRepository.test.ts` (create if missing)
- Test: `server/auth/service.test.ts`

**Interfaces:**
- Add `AuthRepository.listStudentSummaries(): Promise<AccountView[]>`.
- Admin list and challenge roster/count callbacks consume summaries; credential-bearing `listStudents()` remains available only for flows that explicitly need it.

- [ ] **Step 1: Add failing repository query-count and service tests**

  Assert summary listing returns only public account fields, performs one accounts query in the mocked Postgres repository, and does not load credential rows once per student. Assert Admin response remains unchanged and challenge active-student callbacks still filter active students.

- [ ] **Step 2: Run focused tests and verify RED**

  Run:

  ```bash
  npm test -- --run server/auth/postgresRepository.test.ts server/auth/service.test.ts server/app.test.ts
  ```

  Expected: FAIL because the summary method does not exist and current list code loads credentials per row.

- [ ] **Step 3: Implement summary query**

  - Add the interface and Memory repository implementation using public account data only.
  - Add one Postgres `accounts where role = 'student' order by lower(display_name), username` query with no credentials join.
  - Use summaries for Admin list and `activeStudentDisplayNames`, `activeStudentCount`, and `activeStudentIds` callbacks.
  - Keep response mapping free of credential material.

- [ ] **Step 4: Run repository/service/app tests**

  Run:

  ```bash
  npm test -- --run server/auth/postgresRepository.test.ts server/auth/service.test.ts server/app.test.ts
  ```

### Task 9: Single-query session/account authorization

**Files:**
- Modify: `server/auth/types.ts`
- Modify: `server/auth/memoryRepository.ts`
- Modify: `server/auth/postgresRepository.ts:93-97,151-158,212-222`
- Modify: `server/auth/service.ts:93-103`
- Test: `server/auth/postgresRepository.test.ts`
- Test: `server/auth/service.test.ts`

**Interfaces:**
- Add `AuthRepository.findSessionWithAccount(tokenHash): Promise<{ account: ServerAccountRecord; session: ServerSessionRecord } | null>`.
- `currentSession()` uses the combined lookup while preserving full credentials for operations that verify PIN/password.

- [ ] **Step 1: Add failing joined-query and security tests**

  Verify the Postgres mock sees one joined session/account/credentials query, and service tests continue rejecting expired, revoked, inactive, credential-version-mismatch, student/admin boundary and wrong parent-grant sessions.

- [ ] **Step 2: Run focused tests and verify RED**

  Run:

  ```bash
  npm test -- --run server/auth/postgresRepository.test.ts server/auth/service.test.ts
  ```

  Expected: FAIL because the combined repository method does not exist.

- [ ] **Step 3: Implement the joined lookup**

  - Add a parameterized query joining `auth_sessions`, `accounts` and credentials by account id.
  - Map one session row plus all credential rows into the existing `ServerSessionRecord` and `ServerAccountRecord` without changing hash/salt handling.
  - Make `currentSession` call the new method, then retain the existing expiry, revoked, active and credential-version checks.
  - Leave login-by-username and mutation-specific repository operations unchanged.

- [ ] **Step 4: Run all authentication boundary tests**

  Run:

  ```bash
  npm test -- --run server/auth/postgresRepository.test.ts server/auth/service.test.ts server/auth/profile.test.ts server/app.test.ts
  ```

### Task 10: Single-query classroom roster

**Files:**
- Modify: `server/classroom/types.ts`
- Modify: `server/classroom/memoryRepository.ts`
- Modify: `server/classroom/postgresRepository.ts:20-70`
- Modify: `server/classroom/service.ts:42-62`
- Test: `server/classroom/repository.test.ts`
- Test: `server/classroom/service.test.ts`

**Interfaces:**
- Add `ClassroomRepository.listFriendSummaries(actorId: string, now: string): Promise<FriendSummary[]>` or an equivalent repository-owned summary type with the same fields.
- `ClassroomService.listFriends` keeps returning the existing `FriendsResponse` contract.

- [ ] **Step 1: Add failing query and behavior tests**

  Assert the Postgres repository produces one parameterized roster/presence/unread aggregate query. Keep service assertions for active filtering, actor exclusion, online boundary at 120 seconds, unread recipient scope and sort order.

- [ ] **Step 2: Run classroom tests and verify RED**

  Run:

  ```bash
  npm test -- --run server/classroom/repository.test.ts server/classroom/service.test.ts
  ```

  Expected: FAIL because the summary method does not exist and the current implementation issues three queries.

- [ ] **Step 3: Implement the parameterized aggregate query**

  - Use a left join from active student accounts to presence.
  - Use a grouped unread subquery scoped to the authenticated recipient.
  - Compute online using the supplied server time and existing 120-second window.
  - Preserve exact fields and sorting; never interpolate ids or SQL fragments.
  - Implement the Memory repository equivalent from its existing deterministic records.

- [ ] **Step 4: Run classroom and API regression tests**

  Run:

  ```bash
  npm test -- --run server/classroom/repository.test.ts server/classroom/service.test.ts server/app.test.ts src/classroom/useClassroomFriends.test.ts
  ```

### Task 11: Full verification and release packet

**Files:**
- Modify: `docs/deployment/firebase-supabase-edge.md` only if the new endpoint/30-day student policy needs operational documentation.
- Review: all changed source/test files and both specs/plan.

- [ ] **Step 1: Run the full test suite**

  ```bash
  npm test -- --run
  ```

  Expected: zero failed tests; report skipped integration tests separately.

- [ ] **Step 2: Run static/build gates**

  ```bash
  npm run typecheck
  npm run typecheck:server
  npm run build
  deno check --config supabase/functions/api/deno.json supabase/functions/api/index.ts
  npm run check:edge-runtime
  npm run validate:firebase
  ```

- [ ] **Step 3: Inspect the final diff and security invariants**

  ```bash
  git diff --check
  git status --short
  rg -n "studentId|parentGrant|remembered_session|rememberDevice|credential|postgresql://|service.role" src server supabase/functions shared
  ```

  Confirm no token/PIN/database credential is logged or bundled and no unrelated worktree files were changed.

- [ ] **Step 4: Run synthetic browser/API smoke locally**

  Verify student login default-on, explicit opt-out, 30-day response expiry, change-only transition, logout, parent re-unlock, friends bootstrap/fallback, Admin create immediate display and old API compatibility.

- [ ] **Step 5: Stop before external lifecycle actions**

  Report changed files, test/build evidence, remaining cloud smoke requirements and the exact commit/deploy commands that would be run only after separate user authorization.

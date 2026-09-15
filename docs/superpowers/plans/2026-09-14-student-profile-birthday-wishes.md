# Hồ sơ học sinh, sinh nhật và lời chúc — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bổ sung hồ sơ học sinh với avatar preset và ngày sinh, đưa Hồ sơ/Phụ huynh/Đăng xuất vào menu người dùng trên HUD, tạo chúc mừng sinh nhật trong app, làm hai danh sách ParentView cuộn độc lập, và chốt contract an toàn cho bảng lời chúc cùng lớp mà chưa provision cloud.

**Architecture:** Đây là phần mở rộng nối tiếp nền tảng tài khoản/PIN/progress/ParentView hiện có. Profile local được lưu cùng account server qua API self-scoped và parent-grant-scoped; UI không nhận `studentId` làm nguồn quyền. Birthday engine chỉ dùng ngày lịch theo `Asia/Ho_Chi_Minh`, marker best-effort theo `accountId + year`, và giao cho App render celebration. Bảng lời chúc giai đoạn online chỉ có shared contract và policy service thuần/in-memory để kiểm chứng membership, consent, idempotency và privacy; chưa tạo endpoint, SQL cloud hay UI gửi lời chúc hoạt động.

**Tech Stack:** React 18, TypeScript, CSS hiện hữu, Vitest + jsdom, Netlify Dev/server app TypeScript, Postgres.js/Supabase local migration đã có, dữ liệu tổng hợp và CUA/browser smoke cho responsive QA.

## Global Constraints

- Đọc và tuân thủ `docs/superpowers/specs/2026-09-14-student-profile-birthday-wishes-design.md` trước mỗi packet; spec đã được người dùng phê duyệt.
- Đối chiếu `docs/executor/ACCOUNTS-DASHBOARD-EXECUTION.md` trước khi sửa. Các phần P0–P8 nền tảng đang ở `P8-READY_FOR_REVIEW`; không triển khai lại auth, credential, progress event, parent grant, metrics, legacy migration, PIN six-cell, PWA hoặc icon đã có.
- Thứ tự packet bắt buộc của phần mở rộng là **P0-F → P1-F → P2-F → P3-F → P5-F → P4-F → P6-F → P7-F → P8-F**. `P4-F` chỉ là hardening cuộn danh sách Dashboard; không thay thế hay lặp `P4` migration/restore của kế hoạch gốc.
- Mỗi packet dùng RED → GREEN: viết test hành vi trước, chạy focused test để ghi nhận lỗi dự kiến, triển khai thay đổi nhỏ nhất, chạy lại focused test rồi mới chuyển packet.
- Chỉ dùng account/progress/classroom giả lập. Không nhập dữ liệu trẻ thật, không gửi notification permission, không dùng browser push, không provision Supabase cloud, không deploy Netlify, không push GitHub, không commit và không làm Git lifecycle.
- PIN vẫn là một semantic `input type=password` cho mỗi trường, hiển thị sáu ô vuông tách rời, chỉ lọc ASCII `0–9`, giữ số 0 đầu, `inputMode="numeric"`, `pattern="[0-9]*"`, `maxLength={6}` và không tự submit khi đủ sáu số.
- `username` chỉ đọc trong hồ sơ. `displayName` dùng validator hiện có; `avatarId` phải thuộc allowlist; `birthDate` là `YYYY-MM-DD` không có timezone, cho phép `null` để xóa nhưng từ chối chuỗi rỗng, ngày không tồn tại và ngày tương lai.
- Self profile lấy account từ phiên student đầy đủ. Parent profile và preference lấy child từ parent grant hiện hành; không chấp nhận `studentId` tùy ý để quyết định quyền.
- Không đưa PIN hash, salt, raw session token, ngày sinh hoặc tuổi vào peer-facing birthday response. API profile dùng `Cache-Control: no-store` theo boundary API hiện có.
- Không thêm dependency UI hoặc PWA plugin. Avatar preset dùng artwork local đã có (`/art/fox-pet-alpha.png`) và class màu được allowlist; không mở photo upload/arbitrary URL trong packet này.
- Mọi lỗi lưu profile phải giữ draft trên UI. Logout phải xóa state phiên, parent grant, dashboard, profile và modal ngay cả khi request mạng thất bại.

---

## Scope and relationship to the earlier plan

The following artifacts are already present and are inputs, not work to repeat:

- `docs/superpowers/plans/2026-09-14-pin-pwa-icons.md` đã hoàn tất: `PinField`, numeric mobile input, manifest, service-worker precache và icon PWA/favicon.
- `docs/executor/ACCOUNTS-DASHBOARD-EXECUTION.md` ghi nhận auth server, Postgres repository, account-scoped progress, parent PIN grant, metrics và ParentView foundation. P8 nền tảng còn là checkpoint review, nhưng các artifact hiện có phải được tái sử dụng.
- `src/components/PinField.tsx`, `src/auth/apiClient.ts`, `server/auth/*`, `server/learning/*`, `src/components/parent/*` là source of truth hiện tại. Không tạo một auth/profile store song song trong localStorage.

The new ledger created during execution will be `docs/executor/STUDENT-PROFILE-BIRTHDAY-EXECUTION.md`. It records each `-F` packet, exact write-set, focused test output, database migration state, UI evidence and unresolved limitation without changing the old ledger's completed packet claims.

## Ordered packet map

| Order | Packet | New responsibility | Explicit non-goal |
|---|---|---|---|
| 1 | P0-F | Baseline and duplicate-work guard for this feature | Không reset database, không sửa app behavior |
| 2 | P1-F | Profile contract, persistence, self/parent API | Không sửa lại login/PIN/parent grant |
| 3 | P2-F | HUD user menu and profile modal | Chưa birthday effect, chưa peer board |
| 4 | P3-F | Local birthday date engine and celebration | Không push/native notification |
| 5 | P5-F | Parent-scoped child profile and birthday preference | Không cho parent vượt grant |
| 6 | P4-F | Independent scroll for 29 lessons and all history | Không lặp legacy migration P4 |
| 7 | P6-F | Online birthday-wish policy contract and tests | Không SQL/endpoint/cloud/UI gửi lời chúc |
| 8 | P7-F | Cross-feature integration, copy, focus and responsive polish | Không production acceptance |
| 9 | P8-F | Full verification, audit and handoff | Không deploy/P9 |

---

## Task 1 — P0-F — Baseline and duplicate-work guard

**Depends on:** approved spec and existing P8-ready local foundation.

**Files:**

- Create: `docs/executor/STUDENT-PROFILE-BIRTHDAY-EXECUTION.md`
- Read-only inputs: `docs/executor/ACCOUNTS-DASHBOARD-EXECUTION.md`, `docs/executor/PIN-PWA-ICONS-AUDIT.md`, `src/components/PinField.tsx`, `src/components/TopHud.tsx`, `src/views/ParentView.tsx`, `src/components/parent/LessonMap.tsx`, `src/components/parent/History.tsx`, `server/auth/service.ts`, `supabase/migrations/20260913225000_accounts_parent_dashboard.sql`

- [ ] **Step 1: Record the feature baseline and ownership map.**

  Create the new ledger with status `P0-F-IN_PROGRESS`, workspace `/Volumes/Pictures/Projects/Hoc_Vui`, current date, non-Git status, synthetic-data boundary, existing runtime URLs if still alive, and a table mapping each requested behavior to its current source file. Record that the current `TopHud` still has a direct `Phụ huynh` button, `SettingsDialog` owns the discoverable logout, `PinField` already exists, and `History` currently contains `ordered.slice(0, 12)`.

- [ ] **Step 2: Run the focused baseline before any feature edit.**

  Run:

  ```bash
  npm test -- --run src/views/AuthView.test.tsx src/views/ParentView.test.tsx src/components/TopHud.test.ts server/auth/service.test.ts server/app.test.ts --reporter=dot
  npm run typecheck
  npm run typecheck:server
  npm run build
  ```

  Record each exit code and any pre-existing warning in the ledger. If the local database is available, record its connection identity without printing credentials; do not reset or migrate it in P0-F.

- [ ] **Step 3: Close the baseline checkpoint.**

  Mark `P0-F-READY_FOR_REVIEW` only when the ledger shows the duplicate-work guard, baseline commands and exact next write-set. Do not modify source behavior in this packet.

**Acceptance:** The next executor can start P1-F without guessing whether PIN/PWA/auth/parent foundation is missing, and no real learner data or cloud state is touched.

---

## Task 2 — P1-F — Shared profile contract, storage and scoped API

**Depends on:** P0-F.

**Files:**

- Modify: `shared/account-contracts.ts`, `server/auth/types.ts`, `server/auth/service.ts`, `server/auth/memoryRepository.ts`, `server/auth/postgresRepository.ts`, `server/app.ts`, `src/auth/apiClient.ts`
- Create: `src/profile/avatarCatalog.ts`, `src/profile/avatarCatalog.test.ts`, `src/auth/apiClient.profile.test.ts`, `server/auth/profile.test.ts`, `supabase/migrations/20260914120000_student_profiles.sql`
- Extend: `server/app.test.ts`, `server/auth/service.test.ts`, `server/auth/postgresRepository.integration.test.ts`

**Interfaces and invariants:**

- Add `AvatarId` as a literal union backed by a single allowlist, with a default such as `fox-scout`; `src/profile/avatarCatalog.ts` maps every allowed ID to the existing local fox asset and a fixed visual variant class. No caller can pass a URL.
- Add `StudentProfile` with `{ avatarId: AvatarId; birthDate: string | null; birthdayWishesEnabled: boolean }` and `StudentProfileView` with `{ accountId, username, displayName, avatarId, birthDate, birthdayWishesEnabled }`. The view contains no credential field.
- Add `StudentProfilePatch` with only optional `displayName`, `avatarId` and `birthDate`; a separate parent preference input contains only `birthdayWishesEnabled: boolean`.
- Add shared validators `isAvatarId`, `validateAvatarId`, `validateBirthDate` and a calendar-date helper that compares against a supplied `Asia/Ho_Chi_Minh` date. `validateBirthDate(null)` succeeds; `validateBirthDate('')`, impossible dates and future dates fail.
- Extend `ServerAccountRecord` with `avatarId`, `birthDate` and `birthdayWishesEnabled`. New students and the bootstrap Admin get the default avatar, `null` birth date and `false` preference. `AccountView` remains free of profile fields unless an existing caller explicitly needs the separate safe profile view.
- Add service methods with server-derived scope:

  ```ts
  getStudentProfile(token: string): Promise<{ ok: true; profile: StudentProfileView } | AuthFailure>;
  updateStudentProfile(token: string, patch: StudentProfilePatch): Promise<{ ok: true; profile: StudentProfileView } | AuthFailure>;
  getParentProfile(token: string, parentGrantToken: string | undefined): Promise<{ ok: true; profile: StudentProfileView } | AuthFailure>;
  updateParentProfilePreferences(token: string, parentGrantToken: string | undefined, enabled: boolean): Promise<{ ok: true; profile: StudentProfileView } | AuthFailure>;
  ```

  `getStudentProfile` and `updateStudentProfile` require a full student session. Parent methods first validate the existing hashed 15-minute grant and derive the account ID from that session; they do not accept a student ID argument.
- Add routes `GET /api/me/profile`, `PATCH /api/me/profile`, `GET /api/parent/profile` and `PATCH /api/parent/profile-preferences`. The app adapter passes only the supported patch fields to the service; the service validates again and rejects unknown/invalid values.
- Add client functions `getStudentProfile`, `updateStudentProfile`, `getParentProfile` and `updateParentProfilePreferences` in `src/auth/apiClient.ts`. They use `credentials: 'include'`; parent calls opt into the existing in-memory `X-Parent-Grant` header.
- Add migration `20260914120000_student_profiles.sql` that adds `avatar_id text`, nullable `birth_date date` and `birthday_wishes_enabled boolean` to `hoc_vui_private.accounts`, backfills existing rows with the defaults, and adds a check for the avatar allowlist. PostgreSQL's `date` type rejects impossible calendar dates; the service rejects future dates before persistence. The migration must be safe on the already-applied account migration and must not create future classroom tables.

- [ ] **Step 1: Write RED contract and service tests.**

  Add tests for avatar allowlist/defaults, valid leap-day profile date (`2000-02-29`), invalid/future/empty dates, self update preserving other fields, and new-student defaults. Add service tests proving a change-only session cannot read/update profile, a full student can update only their own profile, parent profile is blocked without a valid grant, and parent preference updates the currently granted child only. Add client wrapper tests proving self calls omit the parent grant while parent calls send the in-memory `X-Parent-Grant` header.

- [ ] **Step 2: Run the focused RED suite.**

  Run:

  ```bash
  npx vitest run src/profile/avatarCatalog.test.ts src/auth/apiClient.profile.test.ts server/auth/profile.test.ts server/auth/service.test.ts server/app.test.ts --reporter=dot
  ```

  The new tests must fail because the profile contract/service/routes do not exist yet. Preserve the failure output in the ledger; do not weaken assertions to match the old account shape.

- [ ] **Step 3: Implement shared types, validators and allowlisted avatar catalog.**

  Add the literal types and validators in `shared/account-contracts.ts`, keep date parsing timezone-free for stored values, and expose a catalog lookup that returns only local asset metadata. Add tests for every allowlist entry and for an arbitrary URL/unknown ID being rejected.

- [ ] **Step 4: Implement memory-service profile operations and API adapter.**

  Initialize defaults in `createStudent` and bootstrap, add a safe `profileView` helper in `server/auth/service.ts`, enforce full-session/parent-grant scope, update only allowed fields, and return localized `invalid`/`forbidden` failures. Add the four `server/app.ts` routes with same-origin protection for writes. Set API responses to `no-store` through the existing response helper if it is not already global.

- [ ] **Step 5: Persist the profile fields in the local Postgres repository.**

  Update `AccountRow` selects, `mapAccount`, insert and update statements, then write the additive migration. Run the repository integration test against the dedicated local database only when its existing test environment is available; verify a profile survives a repository reload and migration re-run does not change it.

- [ ] **Step 6: Add the browser API client and finish the GREEN check.**

  Implement typed client wrappers, keep parent grant memory-only, and run:

  ```bash
  npx vitest run src/profile/avatarCatalog.test.ts src/auth/apiClient.profile.test.ts server/auth/profile.test.ts server/app.test.ts --reporter=dot
  npm run typecheck:server
  ```

  Mark P1-F ready only when API payloads contain safe profile fields and no hash, salt or raw token, and update the ledger with the migration status.

**Acceptance:** Synthetic student A can read/update A's display name/avatar/date, student B cannot read A, parent can update only A's preference after the existing gate, and no profile route bypasses session or parent-grant rules.

---

## Task 3 — P2-F — HUD user menu and profile modal

**Depends on:** P1-F.

**Files:**

- Create: `src/components/UserMenu.tsx`, `src/components/UserMenu.test.tsx`, `src/components/ProfileDialog.tsx`, `src/components/ProfileDialog.test.tsx`
- Modify: `src/components/TopHud.tsx`, `src/components/TopHud.test.ts`, `src/App.tsx`, `src/styles.css`
- Reuse without modifying behavior: `src/components/PinField.tsx`, `src/views/AuthView.tsx`, `src/auth/apiClient.ts`

**Interfaces and behavior:**

- `UserMenu` receives `{ displayName, avatarId, onOpenProfile, onOpenParent, onLogout }`. It renders one avatar button with `aria-label="Mở menu tài khoản"`, `aria-haspopup="menu"`, `aria-expanded`, a labelled menu and exactly the items `Hồ sơ`, `Phụ huynh`, `Đăng xuất`.
- The menu opens by click/Enter/Space, closes on Escape/outside pointer/selecting an item, returns focus to the trigger after close, and never opens the parent Dashboard without calling the existing `handleParentOpen` gate.
- `ProfileDialog` receives a `StudentProfileView`, async `onSave(patch)`, async `onChangePin(currentPin, nextPin)`, `onClose` and `onLogout`. It shows avatar preset choices, editable display name, read-only username, `input type="date"` birth date, profile save error/status, PIN panel toggle and logout.
- The PIN panel uses three existing `PinField` instances with `current-password` for current PIN and `new-password` for new/confirmation. It validates current/new/confirmation locally, does not use the default PIN as a full-session bypass, and clears only PIN draft after a successful change.
- App owns server calls and profile state. A failed profile fetch uses a safe no-date/default-avatar presentation without blocking gameplay; a failed save leaves the dialog draft visible. A successful display-name update also updates `authSession.account.displayName` so HUD and parent copy stay consistent. A successful student PIN change replaces the session with the returned session and clears any parent grant/dashboard state.

- [ ] **Step 1: Write RED component tests.**

  Test menu open state and ARIA attributes, all three menu actions, Escape/outside close and focus return. Test profile modal read-only username, four allowlisted avatar choices, date input, display-name validation, preservation of draft after rejected save, and the three six-cell PIN fields calling `onChangePin` only after matching valid values. Assert no photo-file input and no arbitrary avatar URL field.

- [ ] **Step 2: Run the focused RED suite.**

  Run:

  ```bash
  npx vitest run src/components/UserMenu.test.tsx src/components/ProfileDialog.test.tsx src/components/TopHud.test.ts src/views/AuthView.test.tsx --reporter=dot
  ```

  Capture the expected missing-component/behavior failures in the ledger.

- [ ] **Step 3: Implement UserMenu and profile modal with accessible focus behavior.**

  Keep menu and modal state local to their components where possible, use semantic `menu`/`menuitem` and `dialog` roles, stop pointer propagation inside the modal, and reuse the existing focus-trap pattern from `SettingsDialog.tsx`. Render avatar visuals through the allowlisted catalog, never through user-supplied markup.

- [ ] **Step 4: Replace the HUD parent button and wire App profile actions.**

  Replace the direct `Phụ huynh` HUD button with `UserMenu`, add profile loading keyed by the current student account ID, pass the existing parent opener and logout handler, and add `profileDialogOpen`. Do not show the user menu for the unauthenticated screen or Admin view. Fetching profile must ignore late responses after logout/account change.

- [ ] **Step 5: Add CSS and run the focused GREEN check.**

  Add avatar button/menu, preset grid, profile form, modal sections, error/status and mobile layout styles near the existing dialog/auth rules. Keep touch targets at least 44px, allow the modal to scroll on a short mobile viewport, and preserve the existing six-cell PIN focus ring.

  Run:

  ```bash
  npx vitest run src/components/UserMenu.test.tsx src/components/ProfileDialog.test.tsx src/components/TopHud.test.ts src/views/AuthView.test.tsx --reporter=dot
  npm run typecheck
  ```

**Acceptance:** From the student HUD, one keyboard-accessible avatar menu reaches Hồ sơ, the existing parent PIN gate and logout. Profile can edit only allowed fields, keeps the username read-only, exposes numeric six-cell PIN controls, and remains usable at 390px without horizontal overflow.

---

## Task 4 — P3-F — Local birthday engine and celebration

**Depends on:** P1-F profile API and P2-F App/profile state.

**Files:**

- Create: `src/profile/birthday.ts`, `src/profile/birthday.test.ts`, `src/components/BirthdayCelebration.tsx`, `src/components/BirthdayCelebration.test.tsx`
- Modify: `src/App.tsx`, `src/styles.css`

**Interfaces and rules:**

- Export `BIRTHDAY_TIME_ZONE = 'Asia/Ho_Chi_Minh'`, `getCalendarDateInTimeZone(now)`, `isBirthdayToday(birthDate, now)`, `birthdayCelebrationKey(accountId, year)`, `hasCelebratedBirthday(accountId, year, storage?)`, and `markBirthdayCelebrated(accountId, year, storage?)`.
- The date engine parses only the validated `YYYY-MM-DD` value and compares month/day in Vietnam time. It returns false for null, malformed, impossible or future dates. A 29 February birthday maps to 28 February in a non-leap celebration year.
- `BirthdayCelebration` receives `{ displayName, avatarId, reducedMotion, soundEnabled, onClose }`, renders a modal/banner addressed to the child, uses the local fox asset and confetti only when motion is allowed, and never displays age or exact birth date. Audio is requested through the existing App/audio setting, not by creating a new notification channel.
- App checks only after a full student profile is available. It marks `accountId + current Vietnam calendar year` before presenting the celebration so close/reopen and refresh do not duplicate it. Storage read/write failures are swallowed as best-effort UI state and never block login/learning.

- [ ] **Step 1: Write RED pure-date and marker tests.**

  Cover UTC instants on both sides of Vietnam midnight, a normal birthday, 29 February in leap and non-leap years, future/invalid/null dates, account/year key isolation, marker suppression after the first celebration and a storage throwing on read/write.

- [ ] **Step 2: Run the focused RED suite.**

  Run:

  ```bash
  npx vitest run src/profile/birthday.test.ts src/components/BirthdayCelebration.test.tsx --reporter=dot
  ```

- [ ] **Step 3: Implement the date engine and safe marker.**

  Use `Intl.DateTimeFormat(..., { timeZone: BIRTHDAY_TIME_ZONE })` for “today” and avoid `new Date('YYYY-MM-DD')` for birthday comparison. Namespace storage keys by account ID/year, validate the key inputs, and make storage failure non-fatal.

- [ ] **Step 4: Implement the celebration component and App effect.**

  Add dialog semantics, close button, static reduced-motion variant, CSS confetti, and optional sound. In App, clear celebration state on logout/account switch, ignore late profile responses, and do not request OS notification permission.

- [ ] **Step 5: Run GREEN and the birthday integration assertions.**

  Run:

  ```bash
  npx vitest run src/profile/birthday.test.ts src/components/BirthdayCelebration.test.tsx src/App.test.ts --reporter=dot
  npm run typecheck
  ```

  Add an App assertion if the existing test harness can mount the authenticated shell: a matching profile renders the birthday surface once, while a future/null profile renders none.

**Acceptance:** A synthetic child with a valid DOB sees one in-app celebration in Vietnam time, Feb 29 follows the approved fallback, reduced motion removes confetti, sound follows settings, no age is shown, and no push permission is requested.

---

## Task 5 — P5-F — Parent-scoped profile and birthday preference

**Depends on:** P1-F and the existing parent PIN grant implementation; runs before P4-F as required.

**Files:**

- Create: `src/components/parent/StudentProfileCard.tsx`, `src/components/parent/StudentProfileCard.test.tsx`
- Modify: `src/App.tsx`, `src/views/ParentView.tsx`, `src/styles.css`, `server/app.test.ts`, `server/auth/service.test.ts`
- Reuse: `getParentProfile`, `updateParentProfilePreferences`, existing `ParentPinDialog`, `getParentDashboard`, `lockParent`

**Interfaces and behavior:**

- `StudentProfileCard` receives a safe `StudentProfileView`, `busy`, and `onBirthdayWishesEnabledChange(enabled)`. It displays the child avatar/name and exact DOB only inside the parent-granted surface, plus a parent-controlled opt-in toggle whose default is false.
- App fetches parent profile only after `handleParentUnlock` has a valid grant and clears it on parent lock, logout, refresh/session reset and failed grant. Parent dashboard may still render its existing data if profile fetch fails, but the preference control must show a localized unavailable/disabled state rather than guessing.
- The preference callback sends only the boolean through the current parent grant header. On success it replaces the profile state; on failure it leaves the previous switch state and shows a toast/error.
- No parent callback receives an arbitrary child ID. The existing dashboard query may continue to carry its compatibility parameter, but profile authorization derives the child from the grant and must be tested independently.

- [ ] **Step 1: Write RED parent profile UI and scope tests.**

  Render the card with a synthetic profile and assert avatar, name, formatted birth date, default-off preference and disabled/error behavior. Extend server tests for no grant, expired/wrong grant, student-session misuse, successful current-child read/update, and response redaction of credentials.

- [ ] **Step 2: Run the focused RED suite.**

  Run:

  ```bash
  npx vitest run src/components/parent/StudentProfileCard.test.tsx server/auth/service.test.ts server/app.test.ts --reporter=dot
  ```

- [ ] **Step 3: Implement the parent card and App/ParentView data flow.**

  Place the card in the parent dashboard near the child heading/summary, keep the toggle action separate from lesson/history metrics, and load/update it only through the scoped API functions. Keep exact DOB out of any future peer component.

- [ ] **Step 4: Run GREEN and grant regression checks.**

  Run:

  ```bash
  npx vitest run src/components/parent/StudentProfileCard.test.tsx src/views/ParentView.test.tsx server/auth/service.test.ts server/app.test.ts --reporter=dot
  npm run typecheck
  npm run typecheck:server
  ```

**Acceptance:** A parent sees the currently granted child's profile and can explicitly enable/disable birthday wishes; a student or a parent without the active grant cannot read or update it, and leaving/locking Dashboard removes the profile from App state.

---

## Task 6 — P4-F — Independent ParentView scrolling

**Depends on:** P5-F so the parent surface is already the final scoped composition. This packet is a new UI addendum and does not repeat the old P4 migration/backup/reset work.

**Files:**

- Modify: `src/components/parent/LessonMap.tsx`, `src/components/parent/History.tsx`, `src/views/ParentView.tsx`, `src/styles.css`
- Extend: `src/views/ParentView.test.tsx`
- Create: `src/components/parent/LessonMap.test.tsx`, `src/components/parent/History.test.tsx`

- [ ] **Step 1: Write RED scroll-region tests.**

  Render 29 synthetic lesson statuses and assert all 29 rows are inside one focusable labelled region with a stable test hook such as `data-parent-scroll-region="lessons"`. Render at least 15 synthetic activities and assert every activity is present inside a second focusable labelled region; assert the selected range/metrics text is unchanged and no `slice(0, 12)` behavior remains. Test that expanded `<details>` content remains a descendant of the history region.

- [ ] **Step 2: Run the focused RED suite.**

  Run:

  ```bash
  npx vitest run src/components/parent/LessonMap.test.tsx src/components/parent/History.test.tsx src/views/ParentView.test.tsx --reporter=dot
  ```

- [ ] **Step 3: Add labelled, keyboard/touch-scrollable regions.**

  Keep each card heading and action outside the region. Wrap all lesson rows in a `role="region"`, `tabIndex={0}`, `aria-label="Danh sách trạng thái 29 bài"` container. Wrap all ordered history items in a similar `aria-label="Danh sách lịch sử hoạt động"` container and remove the truncating slice while preserving the existing sort and item markup.

- [ ] **Step 4: Add bounded responsive CSS.**

  Add `.parent-scroll-region` with `overflow-y: auto`, `overscroll-behavior: contain`, `scrollbar-gutter: stable`, focus-visible outline and `max-height: 430px` on desktop. At the mobile breakpoint use `max-height: min(360px, 52svh)` with a small right padding; keep the outer parent page scrollable and do not set `overflow: hidden` on the whole dashboard.

- [ ] **Step 5: Run GREEN and a visual DOM check.**

  Run:

  ```bash
  npx vitest run src/components/parent/LessonMap.test.tsx src/components/parent/History.test.tsx src/views/ParentView.test.tsx --reporter=dot
  npm run typecheck
  ```

  Verify the DOM has 29 lesson rows and all selected-range activities, with heading/actions outside the scroll containers.

**Acceptance:** The 29-row card and untruncated activity history each scroll independently on mobile/desktop, expanding history details stays within its own region, metrics/order/range remain unchanged, and the page itself can still scroll.

---

## Task 7 — P6-F — Online classroom birthday-wish policy contract

**Depends on:** P5-F preference semantics and the approved phase-2 privacy design.

**Files:**

- Create: `shared/birthday-wish-contracts.ts`, `shared/birthday-wish-contracts.test.ts`, `server/classroom/birthdayWishPolicy.ts`, `server/classroom/birthdayWishPolicy.test.ts`
- Do not modify: `supabase/migrations/`, `server/app.ts`, Netlify config or cloud resources in this packet

**Contract:**

- Define allowlisted `BirthdayWishTemplateId`, `BirthdayEmojiId`, `BirthdayStickerId`, `BirthdayWishInput` and an opaque server-issued `birthdayCardId`. Input contains the card ID and approved IDs only; it has no free-text field.
- Define peer-safe `PeerBirthdayCard` with `birthdayCardId`, sanitized `displayName`, `avatarId` and a generic birthday label. It must not contain `birthDate`, age, classroom directory data or arbitrary account metadata.
- Define a policy context containing server-resolved sender/recipient IDs, active same-class membership, recipient opt-in, current birthday year, existing wish keys and rate outcome. The service resolves the opaque card to this context before accepting a wish.
- Export `validateBirthdayWishInput`, `birthdayWishKey(senderId, recipientId, year)` and `submitBirthdayWish(context, input, repository)`. Submission rejects inactive/cross-class/non-consented recipients, invalid templates, free-text attempts and rate-limit failures; a repeated sender/recipient/year returns the existing idempotent result without inserting a second wish.
- Keep this as a pure/in-memory contract test surface. Do not create `classrooms`, `class_memberships`, `birthday_preferences`, `birthday_wishes` or `in_app_notifications` SQL yet, and do not expose a user-facing peer board until a separate online implementation approval.

- [ ] **Step 1: Write RED policy tests.**

  Cover same-class opt-in success, parent opt-in false, cross-class rejection, inactive sender/recipient, invalid template/emoji/sticker, free-text rejection, duplicate sender/recipient/year idempotency, distinct-year acceptance, and a peer-safe response assertion proving no `birthDate` or `age` key exists.

- [ ] **Step 2: Run the focused RED suite.**

  Run:

  ```bash
  npx vitest run shared/birthday-wish-contracts.test.ts server/classroom/birthdayWishPolicy.test.ts --reporter=dot
  ```

- [ ] **Step 3: Implement the allowlisted contract and in-memory policy.**

  Use explicit literal tables for templates/emoji/stickers, derive year from server context, and make the repository insert path idempotent on `birthdayWishKey`. Ensure the returned record contains only safe display/message fields needed by the board contract.

- [ ] **Step 4: Run GREEN and confirm no cloud surface changed.**

  Run:

  ```bash
  npx vitest run shared/birthday-wish-contracts.test.ts server/classroom/birthdayWishPolicy.test.ts --reporter=dot
  if /usr/bin/grep -R -n -E "classrooms|class_memberships|birthday_preferences|birthday_wishes|in_app_notifications" supabase/migrations server/app.ts netlify 2>/dev/null; then exit 1; else exit 0; fi
  ```

  The grep is an audit only: no new cloud entity or route may have been added by P6-F.

**Acceptance:** The future board's safety boundary is executable in tests: membership, parent opt-in, allowlisted content, one-wish-per-year and peer redaction are server-policy properties, while deployment and real-child acceptance remain blocked by design.

---

## Task 8 — P7-F — Cross-feature integration and responsive polish

**Depends on:** P1-F, P2-F, P3-F, P5-F, P4-F and P6-F.

**Files:**

- Modify: `src/App.tsx`, `src/components/TopHud.tsx`, `src/views/ParentView.tsx`, `src/styles.css`, `tests/e2e/accounts-parent.spec.ts`
- Extend: `src/App.test.ts`, `src/views/ParentView.test.tsx`, `src/components/TopHud.test.ts`
- Create: `src/profile/featureFixtures.ts`, `src/profile/featureFixtures.test.ts`

- [ ] **Step 1: Add cross-feature integration assertions.**

  Exercise the synthetic flow Student login → user menu → profile save → birthday check → user menu → parent gate → parent profile preference → independent dashboard scroll → lock/logout. Assert a failed network logout still returns the app to login and does not leave a stale avatar, DOB, dashboard or celebration in the DOM.

- [ ] **Step 2: Run the integration RED check against the current shell.**

  Run:

  ```bash
  npx vitest run src/App.test.ts src/views/ParentView.test.tsx src/components/TopHud.test.ts tests/e2e/accounts-parent.spec.ts --reporter=dot
  ```

  Record any integration mismatch as a concrete failing assertion; do not skip it by testing isolated components only.

- [ ] **Step 3: Reconcile state transitions and copy.**

  Ensure profile fetches are keyed by authenticated account ID, late responses are ignored, profile changes do not alter progress snapshots, parent lock clears child profile/opt-in state, and the child-facing birthday copy never reveals age. Keep the future birthday-wish policy unmounted from the local app; a disabled/absent online feature must not imply that wishes were sent.

- [ ] **Step 4: Run responsive browser smoke at the existing local origins.**

  With synthetic account data only, inspect `http://localhost:8888` through Netlify Dev and `http://127.0.0.1:4174/` through the existing preview as applicable. At 390×844 and 1440×900 verify the six separated PIN cells, menu/modal focus, profile form, birthday overlay, parent card scroll containers and `scrollWidth === clientWidth`. At the mobile size also verify modal content can scroll without scrolling the page behind it.

- [ ] **Step 5: Run GREEN integration checks.**

  Run:

  ```bash
  npx vitest run src/App.test.ts src/views/ParentView.test.tsx src/components/TopHud.test.ts tests/e2e/accounts-parent.spec.ts --reporter=dot
  npm run typecheck
  npm run typecheck:server
  ```

**Acceptance:** The user-visible flow is coherent end to end, transitions do not leak account data, responsive layout has no horizontal overflow, and the local app does not pretend the phase-2 online board is available.

---

## Task 9 — P8-F — Full verification and audit handoff

**Depends on:** all ordered packets through P7-F.

**Files:**

- Create: `docs/executor/STUDENT-PROFILE-BIRTHDAY-AUDIT.md`
- Modify: `docs/executor/STUDENT-PROFILE-BIRTHDAY-EXECUTION.md`
- Do not modify deployment credentials, cloud resources or production data.

- [ ] **Step 1: Run the full automated gates.**

  Run and record exact output/exit codes:

  ```bash
  npm test -- --reporter=dot
  npm run typecheck
  npm run typecheck:server
  npm run build
  npm run test:db -- --reporter=dot
  ```

  If `test:db` is skipped because its existing database environment is unavailable, record the skip and do not call it a pass; keep the memory/API evidence separate from Postgres evidence.

- [ ] **Step 2: Execute the feature audit matrix with synthetic accounts.**

  Record PASS/FAIL and evidence for: `PF-01` menu actions and focus return; `PF-02` display-name/avatar/date save and draft preservation; `PF-03` username read-only and safe API payload; `PIN-01` six separated numeric cells and leading zero; `BD-01` Vietnam timezone; `BD-02` Feb 29 fallback; `BD-03` once-per-account/year marker; `BD-04` reduced motion/sound/no age; `PR-01` parent grant scope/default-off preference; `SC-01` 29 lesson rows in an independent region; `SC-02` full history in a second region; `BW-01` policy-only wish safety; `ISO-01` A/B/logout/late-response isolation.

- [ ] **Step 3: Re-run browser smoke after the production build.**

  Serve the already-built local artifact using the existing preview path, inspect 390×844 and 1440×900, and verify no `/api/` URL entered the static/offline precache list because of this feature. Check keyboard Escape/outside click, mobile date input, modal scroll, parent list scroll and logout return to login.

- [ ] **Step 4: Write the audit and handoff.**

  Include changed files grouped by packet, test commands and exit codes, database migration state, browser dimensions, screenshots only when they materially prove UI behavior, known limits, and the next safe action. Mark the ledger `P8-F-READY_FOR_REVIEW` only after all required evidence is present. Do not mark the feature production-ready, cloud-deployed or accepted with real children.

**Acceptance:** Full local verification is evidence-backed; feature behavior, privacy boundaries and responsive scroll behavior are documented; any skipped environment gate is explicit; no deployment or real-data claim is made.

---

## Final review checklist

- [ ] The plan references the approved spec and the existing execution ledger.
- [ ] The requested order is preserved exactly: P0-F → P1-F → P2-F → P3-F → P5-F → P4-F → P6-F → P7-F → P8-F.
- [ ] Existing PIN/PWA/icon/auth/parent/dashboard work is reused rather than recreated.
- [ ] The six PIN cells remain separate visual cells backed by one numeric semantic input on every PIN surface, including the new profile PIN panel.
- [ ] Profile fields are allowlisted and account-scoped; username is immutable; no credential material is returned.
- [ ] Birthday behavior is date-only, Vietnam-timezone-aware, once/year, reduced-motion-aware and in-app-only.
- [ ] Parent profile/preference is grant-scoped and default-off; peer contract excludes exact DOB and age.
- [ ] Lesson and history lists are both complete and independently scrollable without changing metrics or ordering.
- [ ] Online wishes remain contract/policy-only, with no cloud migration, route, deployment or real-child data.
- [ ] Each implementation packet has exact RED/GREEN commands and fresh verification gates.

No Git commit, push, PR, deployment or cloud provisioning is part of this plan.

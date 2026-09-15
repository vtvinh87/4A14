# Student profile, birthday and classroom wishes execution ledger

Status: `P8-F-READY_FOR_REVIEW`
Plan: `docs/superpowers/plans/2026-09-14-student-profile-birthday-wishes.md`
Workspace: `/Volumes/Pictures/Projects/Hoc_Vui`
Scope: local synthetic data only; no cloud provisioning, deployment, Git lifecycle or real learner data.

## P0-F baseline checkpoint

- Baseline date/time: `2026-09-14 11:20 +07:00` (`Asia/Ho_Chi_Minh`).
- Checkout status: non-Git. `git rev-parse --show-toplevel` and `git status --short` both returned exit `128` with `fatal: not a git repository`; no Git repository was initialized.
- Duplicate-work guard: this ledger already existed as `P0-F-IN_PROGRESS` before this packet was resumed, and the matching plan-scoped snapshot existed at `.superpowers/sdd/2026-09-14-student-profile-birthday-wishes/snapshots/task-1-base-STUDENT-PROFILE-BIRTHDAY-EXECUTION.md`. The two pre-existing files had the same SHA-256 `c02cae26cf0bc855a299fb7d5d36e23d3aa7bb33dc9c64bb117264867af0d09f`. The existing ledger was continued in place; no duplicate ledger was created.
- Data boundary: synthetic accounts/progress only. No real learner data, cloud state, migration, reset, deploy, credential, or Git lifecycle action was used in P0-F.

### Runtime and database availability

- Học Vui Vite dev runtime is alive at `http://127.0.0.1:5001/` (HTTP `200`). The dev fallback also returned HTTP `200` for `/offline-manifest.json` with `text/html`; this is not treated as production manifest evidence.
- `http://127.0.0.1:3000/` (HTTP `200`) belongs to the unrelated Invoice Toolkit process, not Học Vui. Netlify Dev `http://localhost:8888/` was unavailable.
- Local database was unavailable at baseline: no Docker containers were running, `psql`/`pg_isready` were not installed, and no `PG*`/`DATABASE*`/`SUPABASE*`/`POSTGRES*` environment variables were present. The placeholder URL in `.env.example` was not used as a live identity; no credentials were printed. No database reset or migration was attempted.

### Requested behavior → current owner map

| Requested behavior | Current source of truth and observed baseline | Next packet owner |
|---|---|---|
| Student profile fields and self-scoped update | Current account surfaces expose display name only through the existing account/session foundation; `server/auth/service.ts` owns account views and `supabase/migrations/20260913225000_accounts_parent_dashboard.sql` currently stores `accounts.display_name` but no avatar, birth date, or birthday preference. | P1-F: shared profile contract, persistence and self/parent-scoped API |
| HUD account menu with `Hồ sơ`, existing parent gate and logout | `src/components/TopHud.tsx:36-39` still renders a direct `Phụ huynh` button. `src/components/SettingsDialog.tsx:103` owns the discoverable `Đăng xuất tài khoản` action. No profile menu is present yet. | P2-F: `UserMenu` and `ProfileDialog` |
| Six-cell PIN input/change reuse | `src/components/PinField.tsx:3-47` already provides one semantic `input type="password"`, ASCII digit sanitization, six visual cells, numeric mobile input, pattern and max length. | Preserve in P1-F/P2-F; no P0-F source change |
| Parent-scoped profile/preference and current-child authorization | `server/auth/service.ts:144-160` owns the existing 15-minute parent grant and rejects a mismatched client student ID; the migration stores `auth_sessions.parent_grant_until`/`parent_grant_hash`. `src/views/ParentView.tsx:86-160` owns the current parent surface. | P1-F profile API, then P5-F parent card/preference |
| Local birthday date matching and in-app celebration | No birthday engine or celebration is present in the inspected current source. The approved future owner is a local date module plus App integration; no push/native notification is part of this baseline. | P3-F |
| Independent lesson/history scrolling | `src/views/ParentView.tsx:152-156` composes the two lists. `src/components/parent/LessonMap.tsx:3-4` renders lesson rows; `src/components/parent/History.tsx:3-4` sorts activities and currently contains `ordered.slice(0, 12)`. | P4-F: separate bounded scroll regions |
| PWA install, manifest, launcher icons and offline precache | `docs/executor/PIN-PWA-ICONS-AUDIT.md` records the local-only PWA baseline. Current owners are `src/components/PwaInstallCard.tsx`, `src/pwa/install.ts`, `src/pwa/offline.ts`, `public/manifest.webmanifest`, `public/icons/*`, `index.html` and `vite.config.ts`; `src/pwa/manifest.test.ts` and `src/pwa/offline.test.ts` assert the manifest/icon/precache contract. Device install remains unverified. | Preserve the existing foundation in P1-F/P2-F; no P0-F PWA/icon change |
| Online classroom birthday wishes | No classroom, membership, wish or notification tables/routes exist in the current migration or inspected source. This remains a policy-only future contract, not cloud/UI behavior in P0-F. | P6-F |

### Focused baseline commands

| Command | Exit | Fresh result | Warning/qualification |
|---|---:|---|---|
| `npm test -- --run src/views/AuthView.test.tsx src/views/ParentView.test.tsx src/components/TopHud.test.ts server/auth/service.test.ts server/app.test.ts --reporter=dot` | `0` | `4` test files, `12` tests passed | No test warning emitted |
| `npm run typecheck` | `0` | TypeScript client build completed | No warning emitted |
| `npm run typecheck:server` | `0` | Server TypeScript build completed | No warning emitted |
| `npm run build` | `0` | Vite transformed `98` modules and built production output | Existing Vite warning: chunks larger than `500 kB`; `three.module` is `746.94 kB` minified |

### Exact next write-set: P1-F

The next executor may write only the P1-F paths below, subject to the P1-F brief and its own verification. None of these paths was modified by P0-F.

- Modify: `shared/account-contracts.ts`, `server/auth/types.ts`, `server/auth/service.ts`, `server/auth/memoryRepository.ts`, `server/auth/postgresRepository.ts`, `server/app.ts`, `src/auth/apiClient.ts`.
- Create: `src/profile/avatarCatalog.ts`, `src/profile/avatarCatalog.test.ts`, `src/auth/apiClient.profile.test.ts`, `server/auth/profile.test.ts`, `supabase/migrations/20260914120000_student_profiles.sql`.
- Extend: `server/app.test.ts`, `server/auth/service.test.ts`, `server/auth/postgresRepository.integration.test.ts`.
- P1-F must not reimplement or bypass the existing login/PIN/parent-grant foundation, trust a client-supplied student ID for profile authorization, provision cloud state, or import real learner data.

## Recovery and review boundary

- The earlier account/Dashboard ledger remains the source of truth for the completed foundation: `docs/executor/ACCOUNTS-DASHBOARD-EXECUTION.md`.
- The earlier PIN/PWA/icon audit remains the source of truth for the six-cell PIN component, mobile numeric input, manifest, service worker and generated icons: `docs/executor/PIN-PWA-ICONS-AUDIT.md`.
- This ledger tracks only the additive feature packets `P0-F` through `P8-F` in the approved order.
- The checkout is not a Git repository. Each task uses a plan-scoped filesystem snapshot and review package under `.superpowers/sdd/2026-09-14-student-profile-birthday-wishes/`; no commit or branch identifier is fabricated.

## Packet status

| Packet | Status | Scope | Evidence |
|---|---|---|---|
| P0-F | `READY_FOR_REVIEW` | baseline and duplicate-work guard | fresh baseline, ownership map, duplicate-work guard and exact P1-F write-set recorded; re-review PASS |
| P1-F | `DONE_WITH_CONCERNS` | profile contract, persistence and scoped API | focused 5 files/13 tests, typechecks pass, re-review PASS_WITH_CONCERNS; DB/build gates remain open |
| P2-F | `DONE_WITH_CONCERNS` | HUD user menu and profile modal | focused 4 files/18 tests, full 54 files/210 tests, re-review PASS_WITH_CONCERNS; device/build gates remain open |
| P3-F | `DONE_WITH_CONCERNS` | local birthday engine and celebration | focused P3 2 files/11 tests, client typecheck and full 56 files/221 tests pass; reviewer PASS_WITH_CONCERNS, no open code finding; App/browser/device/build evidence remains open |
| P5-F | `DONE_WITH_CONCERNS` | parent-scoped profile and preference | focused P5 3 files/13 tests plus actual ParentView 2 tests; client/server typechecks pass; fix re-review PASS_WITH_CONCERNS, no open code finding |
| P4-F | `DONE_WITH_CONCERNS` | independent lesson/history scroll | focused 3 files/5 tests, typecheck/static DOM pass; reviewer PASS spec, PASS_WITH_MINOR_FOLLOW_UP |
| P6-F | `DONE_WITH_CONCERNS` | policy-only online wishes contract | focused server 14/14 and config-neutral shared+server 17/17; typechecks pass; final re-review PASS_WITH_CONCERNS, no blocker |
| P7-F | `DONE_WITH_CONCERNS` | integration and responsive polish | focused 8 files/21 tests, brief-path 3 files/5 tests, client/server typechecks pass; browser shell 595x814; re-review PASS_WITH_CONCERNS, no blocker |
| P8-F | `READY_FOR_REVIEW` | full verification and audit | full suite 62 passed/4 skipped; client/server typechecks PASS; production build PASS with chunk warning; DB suite 3 skipped; production preview smoke 1280x720; audit handoff written |

## P3-F closeout

- Implemented `src/profile/birthday.ts` and `BirthdayCelebration`, including Vietnam timezone date comparison, Feb 29 fallback, best-effort account/year marker, reduced-motion confetti suppression, optional existing AudioManager sound and App session/account guards.
- Fix round 1 addressed the reviewer’s focus-trap finding in `BirthdayCelebration` and its regression test. Focused P3 passed `2 files / 11 tests`; `npm run typecheck` passed; full suite passed `56 files / 221 tests` with `4` existing database skips.
- Reviewer `01a09eda-19fd-7190-9237-5c2c7b2be7fe`: `PASS_WITH_CONCERNS`; no blocking code or write-set finding. Remaining concerns are test/integration evidence only: no App mount harness, browser/device smoke or production build, plus narrow test gaps for Escape unmount and a fresh sound-disabled instance.

## P5-F startup

- Brief: `.superpowers/sdd/2026-09-14-student-profile-birthday-wishes/briefs/task-5-brief.md`
- Snapshot: `.superpowers/sdd/2026-09-14-student-profile-birthday-wishes/snapshots/task-5-base/`
- Next write-set: `src/components/parent/StudentProfileCard.tsx`, its test, `src/App.tsx`, `src/views/ParentView.tsx`, `src/styles.css`, `server/app.test.ts`, `server/auth/service.test.ts`.
- Scope guard: reuse the existing parent-grant API; derive the child only from the active grant; no arbitrary child ID in profile authorization; no cloud migration, endpoint or deployment change.

## P5-F closeout

- Added `StudentProfileCard` and parent-scoped App/ParentView data flow using the existing memory-only parent grant header. The card shows the currently granted child's local allowlisted avatar, display name and exact DOB only within the parent surface; the birthday-wishes switch is server-controlled/default-off and disabled when profile data is unavailable or busy.
- Fix round 1 addressed stale profile exposure after dashboard range refresh failure with account/epoch guarding, profile cleanup and existing grant lock for `forbidden`/`expired`. Fix round 2 replaced the helper-only test with a real App DOM-boundary regression covering unlock/profile load, pending preference response, transient range failure, DOB/switch cleanup and stale-response suppression.
- Verification: focused P5 command exit 0 (`3` discovered files, `13` tests), actual `src/views/ParentView.test.ts` exit 0 (`2` tests), `npm run typecheck` exit 0 and `npm run typecheck:server` exit 0. Re-review `01a09f22-1626-7eb1-a540-f6105aca7139`: spec/code PASS, overall `PASS_WITH_CONCERNS`, no open code finding.
- Remaining concerns: repository test filename is `.ts` instead of the plan's `.tsx`; browser/device smoke and production build remain deferred to P7/P8. No cloud/deploy/real-data action occurred.

## P4-F startup

- Brief: `.superpowers/sdd/2026-09-14-student-profile-birthday-wishes/briefs/task-6-brief.md`
- Snapshot: `.superpowers/sdd/2026-09-14-student-profile-birthday-wishes/snapshots/task-6-base/`
- Next write-set: `src/components/parent/LessonMap.tsx`, `src/components/parent/History.tsx`, `src/views/ParentView.tsx`, `src/styles.css`, `src/views/ParentView.test.ts` (actual checkout filename), `src/components/parent/LessonMap.test.tsx`, `src/components/parent/History.test.tsx`.

## P4-F closeout

- Added independent scroll regions for the full 29-lesson status list and untruncated activity history. Regions are labelled/focusable, retain details content and keep headings/actions outside; CSS bounds desktop and mobile height without blocking outer page scroll.
- Verification: RED exit 1 for the missing-region contract; GREEN exit 0 (`3` files / `5` tests); client typecheck and DOM/static checks exit 0. Reviewer `01a09f2a-799f-7d43-943b-82a0069d4b9e` returned spec PASS and code-quality PASS with one minor deferred test assertion gap. No open blocking code finding.
- Minor deferred: History test could assert the count badge is outside and the region count is exactly one; source structure already satisfies this. Browser/device/real-scroll/build evidence remains for P7/P8.

## P6-F startup

- Brief: `.superpowers/sdd/2026-09-14-student-profile-birthday-wishes/briefs/task-7-brief.md`
- Snapshot: `.superpowers/sdd/2026-09-14-student-profile-birthday-wishes/snapshots/task-7-base/`
- Next write-set: `shared/birthday-wish-contracts.ts`, `shared/birthday-wish-contracts.test.ts`, `server/classroom/birthdayWishPolicy.ts`, `server/classroom/birthdayWishPolicy.test.ts` only. No `supabase/migrations`, `server/app.ts`, Netlify or cloud resources.

## P6-F closeout

- Implemented the policy-only birthday-wish contract with literal template/emoji/sticker allowlists, opaque server-resolved card identity, active-account/same-class/recipient-consent/rate-limit checks and `birthdayWishKey(senderId, recipientId, year)`.
- Replaced the stale check-then-insert path with the repository `insertIfAbsent` atomic boundary; synthetic tests cover sequential duplicates, stale snapshots and two concurrent requests with one physical insert. Repository output is rebuilt from a peer-safe allowlist and removes birth date, age, credentials, username, classroom and arbitrary metadata.
- Fix round 2 validates repository `createdAt` as a canonical UTC `Date.toISOString()` value and rejects invalid strings/non-string values. No policy UI, route, SQL/classroom table, cloud resource or deployment was added.
- Verification recorded in `reports/task-7-report.md`: exact server-focused suite `14/14`, config-neutral shared+server suite `17/17`, client/server typechecks exit `0`. The no-cloud grep exit `1` is a documented pre-existing false positive from `supabase/migrations/20260914120000_student_profiles.sql` containing `birthday_wishes_enabled`.
- Final scoped re-review `01a09f40-9bf2-73d1-843d-691eba5ba0d3`: spec compliance PASS, code quality PASS_WITH_CONCERNS, overall PASS_WITH_CONCERNS; no blocking finding. Remaining concern: shared sanitizer relies on typed `AvatarId`, while the server policy validates the runtime avatar before peer exposure; future resolver boundary remains outside this packet.

## P7-F closeout

- Added the cross-feature synthetic App harness and fixture contracts for student login → birthday celebration → profile → parent profile/preference → logout isolation. Profile and parent transitions retain account/epoch guards; failed logout clears the local session and related UI state.
- Added modal body-scroll locking/restoration, zero-width responsive safeguards, independent scroll-region sizing and mobile modal overscroll behavior. The existing six-cell numeric PIN contract remains unchanged; the dead compact passport-width rule was removed because the passport is already hidden below 480px.
- Fresh verification: the resumed integration command passed `8` files / `21` tests; the exact brief command passed `3` discovered files / `5` tests because the absent `.tsx` path is silently ignored by Vitest; `npm run typecheck` and `npm run typecheck:server` both exited `0`. The real local browser shell at `http://127.0.0.1:5001/` measured `595x814`, equal body/document widths, six PIN cells and numeric/max-length attributes; no credentials or learner data were entered.
- Reviewer `01a09f5a-aa7c-7283-8d82-630237f3f2a8`: spec PASS, code PASS, overall `PASS_WITH_CONCERNS`; no blocker. Remaining concern is limited authenticated browser evidence at the requested 390x844 and 1440x900 viewports. Full suite, build and DB gate remain for P8-F.

### P8-F startup

- Task 9 will run the full automated gates, complete the feature audit matrix and record the browser/build/database limitations in `docs/executor/STUDENT-PROFILE-BIRTHDAY-AUDIT.md`.
- Scope remains local synthetic data only. No deployment credential, cloud resource, production data, Git lifecycle or online birthday-wish UI may be changed.

## P8-F closeout

- Full audit handoff is recorded at `docs/executor/STUDENT-PROFILE-BIRTHDAY-AUDIT.md`, including the ordered packet map, feature matrix, changed-file groups, browser evidence, privacy boundary and next safe action.
- Fresh gates: `npm test -- --reporter=dot` exit `0` with `62` passed / `4` skipped files and `252` passed / `4` skipped tests; `npm run typecheck` exit `0`; `npm run typecheck:server` exit `0`; `npm run build` exit `0` with only the existing large-chunk warning; `npm run test:db -- --reporter=dot` exit `0` but all `3` DB tests skipped because no dedicated DB environment was configured.
- Production preview smoke at `http://127.0.0.1:4174/` measured the available `1280x720` viewport, equal document/body widths, the six-cell numeric PIN contract, manifest/icon/SW HTTP `200`, and `129` offline URLs with no `/api/`. The requested authenticated `390x844`/`1440x900` walkthrough and physical PWA installation remain unverified.
- Final read-only review `01a09f6d-66a1-73c3-8d64-214ea0015cf2` returned `PASS_WITH_CONCERNS`, no blocker; it confirmed only the documented DB skips and missing authenticated `390x844`/`1440x900` QA. P8 remains `READY_FOR_REVIEW`, not production-ready. No cloud/deploy/credential/real-data/Git lifecycle action occurred.

## P0-F closeout

- P0-F is ready for review because the pre-existing ledger was guarded and continued, the four required baseline commands have fresh exit/output evidence, and the exact P1-F write-set is recorded.
- No source behavior was changed. The only intentional packet outputs are this updated ledger and the required implementer report at `.superpowers/sdd/2026-09-14-student-profile-birthday-wishes/reports/task-1-report.md`.

## P1-F closeout

- Implemented the shared avatar/date profile contract, safe profile views, full-student self scope, hashed 15-minute parent-grant scope, memory defaults, Postgres mapping, additive account migration, scoped API routes and browser wrappers.
- Unknown profile PATCH fields are rejected at both the HTTP adapter and service boundary; the existing Dashboard parent-grant message remains unchanged.
- Fresh focused evidence: `5` test files / `13` tests passed; `npm run typecheck` and `npm run typecheck:server` exited `0`. Review verdict: `PASS_WITH_CONCERNS`, with no open code findings.
- No P2–P8/UI/PIN/PWA files were changed. Migration static audit found only account columns/defaults/checks and no classroom tables.

### P1-F open gates (not claimed as pass)

- `npm run test:db` exited `0` with `3` skipped tests because no dedicated database URL was configured; migration application, rerun/idempotency and repository reload were not exercised.
- `npm run build` reached Vite but exited `1` while copying the existing `public/art/collection/._collection-emblem.png` AppleDouble/NFS artifact (`Unknown system error -70` / stale NFS file handle). No asset deletion or Vite workaround was attempted in P1-F.

## P2-F closeout

- Added the accessible HUD avatar menu with exactly Hồ sơ, Phụ huynh and Đăng xuất; added profile modal with allowlisted avatar presets, editable display name, read-only username, birth date and three six-cell PIN fields; wired logout/parent/profile actions through App.
- Fix round 1 prevents fallback profile data loss and same-account stale profile responses; fix round 2 keeps the implementation inside the eight-file P2 write-set.
- Fresh focused evidence: `4` files / `18` tests passed; full suite `54` files passed, `4` skipped; `210` tests passed, `4` skipped; client typecheck exited `0`. Re-review: `PASS_WITH_CONCERNS`, no open code/write-set findings.
- No P1/P3–P8, PIN/PWA, Vite or asset source was changed.

### P2-F open gates (not claimed as pass)

- 390px browser/device smoke and horizontal-overflow walkthrough remain unverified; only static CSS/DOM evidence is recorded.
- Production build remains unverified in this packet because the known AppleDouble/NFS asset copy failure affects the existing public tree.

## Open limitations

- The local database was not available for a connection identity check; P1-F must re-check its own approved local test environment and must not infer availability from `.env.example`.
- Standard Git-based SDD scripts cannot resolve a repository in this checkout; the controller uses the documented filesystem fallback and preserves all review artifacts locally.

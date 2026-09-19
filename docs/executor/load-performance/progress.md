# Load performance — execution ledger

Status: `READY_FOR_REVIEW` — local code verified; DB/performance validation pending; commit pushed; production not deployed
Plan: `/Volumes/Pictures/Projects/Hoc_Vui/docs/superpowers/plans/2026-09-18-load-performance-luna.md`
Actual checkout: `/Volumes/Pictures/Projects/Hoc_Vui`
HEAD at start: `00ac8fb0e5681fbc9c4a177b4425484c4ce95bfc`
Plan reference HEAD: `98690ab3b5b527862821658cd8afcfa8287ebcbe` (not checked out)
Pre-existing dirty file: `deno.lock` (`776554a46c7706ff0e6e7175b79d205ecdb0b11daadf6730bad2e7575e4869e3`), preserved
Accepted roster baseline: seven manifest hashes matched before L0; six lifecycle files remain byte-identical. `src/App.test.ts` changed only in L1 to update the planned progress-board config-call assertion; accepted manifest JSON itself is unchanged.
Old worktree: `/Users/macbook/.codex/worktrees/4fc1/Hoc_Vui` — not read or integrated.
External actions: commit/push completed for the user-authorized code shipment; no PR, merge, deploy, migration, cloud mutation, or Brain_Vault write.

| Gói | Trạng thái | Evidence |
|---|---|---|
| Roster lifecycle cũ | ACCEPTED_LOCAL | Existing ledger; not reimplemented |
| L0 baseline/measurement | LOCAL_VERIFIED + DB_VALIDATION_PENDING | `baseline.md`; runner/unit boundary added; DB target not identified |
| L1 board HTTP waterfall | LOCAL_VERIFIED + DB_VALIDATION_PENDING | Direct board fetch; rollout/permission cache isolation; focused 24/24 |
| L2 session projection | LOCAL_VERIFIED + DB_VALIDATION_PENDING | Public session projection; auth matrix; 30/30 focused |
| L3 roster query | LOCAL_VERIFIED + DB_VALIDATION_PENDING | `listRoster` single-read boundary; focused 50/50; integration skipped |
| L4 progress source | LOCAL_VERIFIED + DB_VALIDATION_PENDING | Single-statement source; parity 27/27; DB integration skipped |
| L5A challenge today | LOCAL_VERIFIED + DB_VALIDATION_PENDING | batch tests/integration boundary; DB skip |
| L5B challenge week | LOCAL_VERIFIED + DB_VALIDATION_PENDING | range/aggregate/projection tests; DB skip |
| L6 timing/CORS | LOCAL_VERIFIED + DB_VALIDATION_PENDING | timing/Edge/Firebase checks; protected HTTP not run |
| L7 verification/handoff | READY_FOR_REVIEW | `verification.md`, `latency-results.json`, `handoff.md` |

## L0 checkpoint

Status: `LOCAL_VERIFIED` / `DB_VALIDATION_PENDING`

Baseline commands and exit codes:

- `env -u HOC_VUI_TEST_DATABASE_URL -u DATABASE_URL -u DB_URL -u HOC_VUI_DATABASE_URL -u SUPABASE_DB_URL npm test` -> exit 0; 126 files, 556 passed, 4 skipped; 4 DB suites skipped because no DB env was supplied.
- `npm run typecheck` -> exit 0.
- `npm run typecheck:server` -> exit 0.
- `npm run build` -> exit 0; existing chunk-size warning.
- `npx vitest run server/performance/read-budget.test.ts` RED -> exit 1 because the runner module did not exist; GREEN -> exit 0, 6 passed.
- External benchmark URL guard -> exit 1 as required; no request was made.
- `git diff --check` -> exit 0 at baseline.

Changed files in L0:

- `.env.example` — one non-secret benchmark comment.
- `scripts/measure-load-performance.mjs` — localhost-only sequential HTTP runner and safe measurement helpers.
- `server/performance/read-budget.test.ts` — helper, synthetic fixture, and count-boundary tests.
- `docs/executor/load-performance/baseline.md` — baseline evidence.
- `docs/executor/load-performance/progress.md` — this checkpoint.

Metrics: SQL count not executed against PostgreSQL; HTTP protected-data benchmark `NOT_RUN`; click-to-fresh-data `NOT_RUN`. Historical anonymous 401 timings are not reused as fresh-data evidence. DB target: `DB_VALIDATION_PENDING` (no host/db name verified).

Next concrete step: L1 RED tests for direct progress-board fetch and rollout/expiry/forbidden cache isolation, then minimal hook/API implementation and focused GREEN verification.

## L1 checkpoint

Status: `LOCAL_VERIFIED` / `DB_VALIDATION_PENDING`

RED/GREEN evidence:

- RED: `npx vitest run src/progress/useProgressBoard.test.tsx src/progress/progressBoardCache.test.ts src/auth/apiClient.progress-board.test.ts src/App.test.ts` -> exit 1; 4 expected failures showed the hook still called rollout config and exposed stale private cache.
- GREEN: same command -> exit 0; 4 test files, 24 passed, 0 failed.
- `npm run typecheck` -> exit 0.
- `git diff --check` -> exit 0.

Changed files in L1:

- `src/progress/useProgressBoard.ts` — one authenticated board request per refresh; server rollout/expired/forbidden branches clear data without private-cache fallback; identity/request guards preserved.
- `src/auth/apiClient.ts` — narrow `rollout_disabled` reason type for unavailable board responses.
- `src/progress/useProgressBoard.test.tsx` — direct-fetch, rollout-disabled, expiry/forbidden and account-switch regression coverage.
- `src/App.test.ts` — preserves the App-level rollout gate expectation while the hook no longer performs a second config request.

Metrics: service/API request-boundary test shows one `getProgressBoard` call per open and zero hook config calls. No real HTTP or SQL count was run; `DB_VALIDATION_PENDING`, click-to-fresh-data `NOT_RUN`, warm/first-open/cold latency `NOT_RUN`. Cache is never used as proof of fresh data.

Review: App rollout gate, generation/content/rule validation, request sequence, account isolation, offline fallback, and session cache namespace remain in scope; no UI, auth, parent grant, or roster lifecycle file changed.

Next concrete step: L2 RED session projection tests and repository/service implementation, while leaving credential-bearing mutation paths on `currentSession()` unchanged.

## L2 checkpoint

Status: `LOCAL_VERIFIED` / `DB_VALIDATION_PENDING`

RED/GREEN evidence:

- RED: `npx vitest run server/auth/sessionProjection.test.ts server/auth/service.test.ts server/app.test.ts` -> exit 1; projection boundary was absent and `PostgresAuthRepository.findSessionContext` did not exist.
- GREEN: same command -> exit 0; 3 test files, 30 passed, 0 failed.

Changed files in L2:

- `server/auth/types.ts` — `SessionAccountView`, `SessionContext`, and required repository contract.
- `server/auth/memoryRepository.ts` — credential-free in-memory projection implementation.
- `server/auth/postgresRepository.ts` — one session/account `LEFT JOIN` projection with distinct session/account credential-version aliases.
- `server/auth/service.ts` — `getSession()` uses the projection; `currentSession()` remains the full credential path for mutations and parent/admin flows.
- `server/auth/sessionProjection.test.ts` — projection call boundary, SQL shape/count, privacy and authorization matrix coverage.

Security review: revoked, `expiresAt == now`, inactive, missing-account, credential-version mismatch, change-only, admin/full, student/full and active parent-grant cases are covered. No session/account cache, PIN/hash/credential payload, parent-grant clear, or mutation path was removed.

Metrics: protected auth SQL count is asserted as one repository projection statement at the Postgres boundary, but no live PostgreSQL target was run; `DB_VALIDATION_PENDING`. HTTP count/latency and click-to-fresh-data remain `NOT_RUN`.

Next concrete step: L3 RED roster parity and single-query repository/service implementation; preserve the accepted roster lifecycle files and frontend behavior.

## L3 checkpoint

Status: `LOCAL_VERIFIED` / `DB_VALIDATION_PENDING`

RED/GREEN evidence:

- RED: `npx vitest run server/classroom/repository.test.ts server/classroom/service.test.ts` -> exit 1; `listRoster` was absent and the service still used the legacy three-read path.
- GREEN: `npx vitest run server/classroom/repository.test.ts server/classroom/service.test.ts src/classroom/useClassroomFriends.test.ts src/components/FriendListDialog.test.tsx src/App.test.ts` -> exit 0; 5 files, 50 passed, 0 failed.
- `npx vitest run server/classroom/roster.integration.test.ts` -> exit 0; 1 test skipped because the explicit local `HOC_VUI_TEST_DATABASE_URL` target is absent.
- `npm run typecheck:server` -> exit 0.
- `git diff --check` -> exit 0.

Changed files in L3:

- `server/classroom/types.ts` — `ClassroomRosterRecord` and `listRoster` contract.
- `server/classroom/memoryRepository.ts` — parity roster projection from active peers, presence and unread state.
- `server/classroom/postgresRepository.ts` — one scoped `SELECT` with presence `LEFT JOIN` and unread aggregate; no message body.
- `server/classroom/service.ts` — one roster read, existing clock/window/sort and public response preserved.
- `server/classroom/repository.test.ts`, `server/classroom/service.test.ts` — parity, SQL shape/count and legacy-path regression tests.
- `server/classroom/roster.integration.test.ts` — explicit local-only PostgreSQL syntax/count test; no mutation.
- `scripts/measure-load-performance.d.mts` — declaration boundary for the L0 runner import.

Security/behavior review: role/active/self filters are server-side; unread counts are recipient-scoped and only exposed for returned peers; presence-missing means offline; chat message body is not selected. The accepted `src/App.tsx`, `src/classroom/useClassroomFriends.ts`, and `FriendListDialog` roster lifecycle files remain byte-identical to the manifest.

Metrics: repository mock count is 1 roster SQL statement; live SQL count is pending because no verified local DB target exists. Combined auth+roster target is structurally 2 statements (L2 projection + L3 roster) but not a live DB trace. HTTP/click-to-fresh-data/latency remain `NOT_RUN`.

Next concrete step: L4 RED progress-source parity and generation-filtered single-statement implementation; keep analytics formula and schema unchanged.

## L4 checkpoint

Status: `LOCAL_VERIFIED` / `DB_VALIDATION_PENDING`

RED/GREEN evidence:

- RED: `npx vitest run server/learning/progressBoardSource.test.ts server/learning/service.test.ts server/analytics/progressBoard.test.ts src/progress/useProgressBoard.test.tsx` -> exit 1; old repository opened a transaction and required two reads, while the new boundary expected one unsafe statement.
- GREEN: same command -> exit 0; 4 files, 27 passed, 0 failed.
- `npm run typecheck:server` -> exit 0.
- `npx vitest run server/learning/postgresRepository.integration.test.ts` -> exit 0; 1 test skipped because no explicit local test DB target was provided.
- `git diff --check` -> exit 0.

Changed files in L4:

- `server/learning/postgresRepository.ts` — one actor-anchored SQL statement returning current snapshot and generation-scoped event JSON; deterministic `received_at/sequence/event_id` ordering and `[]` for empty aggregate.
- `server/learning/progressBoardSource.test.ts` — no-snapshot, parity/mapping, generation predicate, ordering and no-transaction tests.

Semantic review: generation filtering is in SQL; event type, lesson version and evidence are intentionally not filtered in SQL; there is no `LIMIT`; `buildProgressBoardData` and its formulas are unchanged. Empty generation is derived from `createEmptySnapshot` rather than a standalone literal. No cache, auth, reset, transaction write, schema or migration behavior changed.

Metrics: source repository boundary is 1 SQL statement in the mock contract; live SQL count/duration and reset-concurrency behavior remain `DB_VALIDATION_PENDING`. HTTP, click-to-fresh-data, warm/first-open/cold latency remain `NOT_RUN`.

Next concrete step: L5A RED challenge-today batch question/author tests, preserving answer secrecy, moderation, quota, idempotency and write transaction ordering.

## L5A checkpoint

Status: `LOCAL_VERIFIED` / `DB_VALIDATION_PENDING`

RED/GREEN evidence:

- RED: `npx vitest run server/challenge/authoringRepository.test.ts server/challenge/playService.test.ts` -> exit 1; three expected failures showed the two batch methods were absent.
- GREEN focused: same command -> exit 0; 2 files, 14 passed, 0 failed.
- GREEN challenge suite: `npx vitest run server/challenge` -> exit 0; 11 files passed, 58 passed, 1 integration test skipped.
- Integration boundary: `npx vitest run server/challenge/readPerformance.integration.test.ts` -> exit 0; 1 test skipped because `HOC_VUI_TEST_DATABASE_URL` was not supplied as an explicit local target.
- `npm run typecheck:server` -> exit 0.
- `git diff --check` -> exit 0.

Changed files in L5A:

- `server/challenge/authoringTypes.ts` — batch question/author repository contract.
- `server/challenge/memoryAuthoringRepository.ts` — unique-ID in-memory batch parity.
- `server/challenge/postgresAuthoringRepository.ts` — one `ANY(uuid[])` question query and one active student author query; empty input does not query.
- `server/challenge/playService.ts` — fixed batch reads, item-order mapping, author/question identity check, withdrawn/voided filtering, and public answer secrecy preserved.
- `server/challenge/authoringRepository.test.ts`, `server/challenge/playService.test.ts` — batch count, dedupe, order, missing/unsafe row and answer-secrecy regression coverage.
- `server/challenge/readPerformance.integration.test.ts` — explicit local-only, read-only two-statement integration boundary.

Security/behavior review: author rows retain the existing `role = 'student' and active = true` filter; a question is accepted only when its author matches the round item; `correctOptionId` and `explanation` remain internal to answer processing and absent from `todayResponse`; existing attempt/practice, moderation, quota, idempotency and write ordering paths were not parallelized or removed. Cold round creation remains separate from warm read evidence.

Metrics: mock repository query boundary is 1 question SQL + 1 author SQL for today batch reads, independent of 1/5 items; live SQL counts, HTTP latency, click-to-fresh-data and warm/first-open/cold p95 remain `DB_VALIDATION_PENDING` / `NOT_RUN`. No cache or anonymous 401 was used as fresh-data evidence.

Next concrete step: L5B RED week-range item/contribution and active-student projection tests, including preference-lock read semantics.

## L5B checkpoint

Status: `LOCAL_VERIFIED` / `DB_VALIDATION_PENDING`

RED/GREEN evidence:

- RED: `npx vitest run server/challenge/playRepository.test.ts server/challenge/weeklyService.test.ts server/auth/sessionProjection.test.ts server/challenge/authoringRepository.test.ts` -> exit 1; five expected failures showed missing range/aggregate/projection APIs and old preference ordering.
- GREEN focused: same command -> exit 0; 4 files, 32 passed, 0 failed.
- GREEN challenge/auth/app: `npx vitest run server/challenge server/auth/sessionProjection.test.ts server/app.test.ts` -> exit 0; 13 files passed, 88 passed, 1 integration test skipped.
- Integration boundary: `npx vitest run server/challenge/readPerformance.integration.test.ts` -> exit 0; 2 tests skipped because `HOC_VUI_TEST_DATABASE_URL` was not supplied as an explicit local target.
- `npm run typecheck:server` -> exit 0.
- `git diff --check` -> exit 0.

Changed files in L5B:

- `server/challenge/playTypes.ts`, `server/challenge/memoryPlayRepository.ts`, `server/challenge/postgresPlayRepository.ts` — range item read and grouped contribution projection preserving the existing contribution predicate.
- `server/challenge/weeklyService.ts` — one item-range read, one contribution aggregate and one batch question read; topic mapping covers questions featured this week even when created earlier.
- `server/auth/postgresRepository.ts` — active student IDs/count projections without credential reads; existing `listStudents()` admin/auth workflow unchanged.
- `server/challenge/postgresAuthoringRepository.ts` — existing preference `SELECT` first; missing rows use insert-on-conflict then authoritative re-read.
- `server/app.ts` — default challenge callbacks use the new active student projections.
- `server/challenge/playRepository.test.ts`, `server/challenge/weeklyService.test.ts`, `server/auth/sessionProjection.test.ts`, `server/challenge/authoringRepository.test.ts` — range, seven-day/35-item, exact predicate, projection privacy, and preference-lock regression coverage.
- `server/challenge/readPerformance.integration.test.ts` — explicit local-only read budget checks for daily batch and weekly service.

Security/behavior review: weekly output and recognition fallback remain unchanged; no admin list or credential workflow was replaced; active IDs are role/active filtered server-side; preference lock state is read authoritatively on the next request; no writes, migrations, cloud target or real child data were used.

Metrics: local mock/unit budget is fixed at 1 item range + 1 contribution aggregate + 1 batch question read, plus the existing fixed weekly reads; the read-only integration asserts weekly `<=10` SQL only when an explicit local target is supplied. Live SQL count, HTTP latency, click-to-fresh-data, warm/first-open/cold p95 remain `DB_VALIDATION_PENDING` / `NOT_RUN`.

Next concrete step: L6 RED request-local timing and CORS preflight tests, preserving private `no-store`, exact allowlist, credentials and error headers.

## L6 checkpoint

Status: `LOCAL_VERIFIED` / `DB_VALIDATION_PENDING`

RED/GREEN evidence:

- RED: `npx vitest run server/performance/timing.test.ts server/app.test.ts supabase/functions/api/index.test.ts` -> exit 1; timing module was absent and Edge lacked `Access-Control-Max-Age`, exposed timing, and timed error-path output.
- GREEN: `npx vitest run server/performance server/app.test.ts supabase/functions/api/index.test.ts` -> exit 0; 4 files, 33 passed, 0 failed.
- `npm run check:edge-runtime` -> exit 0; Deno check passed and Edge smoke returned exact allowlisted CORS preflight headers.
- `npm run typecheck:server` -> exit 0.
- `git diff --check` -> exit 0.

Changed files in L6:

- `server/performance/timing.ts` — request-local auth/data/total accumulator with injected clock, finite non-negative header and route selector.
- `server/performance/timing.test.ts` — deterministic duration, request isolation and error rethrow coverage.
- `server/app.ts` — optional request timing, auth measurement, data measurement on friends/progress-board/challenge-today, and timing on returned/error responses.
- `server/app.test.ts` — protected success/error timing and private no-store regression coverage.
- `supabase/functions/api/index.ts` — only allowlisted CORS responses expose `Server-Timing`; valid OPTIONS adds `Access-Control-Max-Age: 600`; timed loader errors remain sanitized.
- `supabase/functions/api/index.test.ts` — preflight, expose-header and timed error-path assertions.

Security/behavior review: no global student/token timing map; timing descriptions contain only fixed metric names and durations; private responses remain `Cache-Control: no-store`; exact origin, credentials, methods, headers, denied-origin 403 and error sanitization remain covered. No SQL duration is claimed because SQL instrumentation was not added.

Metrics: unit timing is deterministic/mock-only; no protected HTTP benchmark was run, no click-to-fresh-data sample exists, and warm/first-open/cold p95 remain `NOT_RUN`. SQL live count/duration remains `DB_VALIDATION_PENDING`; historical anonymous 401 samples are not reused.

Next concrete step: L7 full verification, artifact hashes, roster-baseline recheck, and handoff with deploy/rollback proposal; stop before external actions.

## L7 checkpoint

Status: `READY_FOR_REVIEW`

Fresh full verification from `/Volumes/Pictures/Projects/Hoc_Vui`:

- `env -u HOC_VUI_TEST_DATABASE_URL -u DATABASE_URL -u DB_URL -u HOC_VUI_DATABASE_URL -u SUPABASE_DB_URL npm test` -> exit 0; 130 files passed, 6 skipped; 596 passed, 7 skipped. Skipped: `server/app.integration.test.ts`, `server/auth/postgresRepository.integration.test.ts`, `server/db/database.integration.test.ts`, `server/learning/postgresRepository.integration.test.ts`, `server/classroom/roster.integration.test.ts`, `server/challenge/readPerformance.integration.test.ts` (2 tests). All skips are DB-target dependent.
- `npm run typecheck` -> exit 0.
- `npm run typecheck:server` -> exit 0.
- `npm run build` -> exit 0; existing Vite chunk-size warning only.
- `npm run check:edge-runtime` -> exit 0; Deno check and real-entrypoint smoke passed.
- `npm run validate:firebase` -> exit 0; static config validation printed Firebase sites `legacy`/`app`, `dist` public directory and cache rules.
- `git diff --check` -> exit 0.
- `git diff --exit-code -- docs/executor/load-performance/accepted-source-baseline.json` -> exit 0.
- Final accepted roster hash check: six lifecycle files `MATCH`; `src/App.test.ts` intentionally differs only by the L1 config-call expectation, as documented above. `src/App.tsx`, classroom hook/dialog/conversation files remain unchanged.
- Pre-existing `deno.lock` dirty hash remains `776554a46c7706ff0e6e7175b79d205ecdb0b11daadf6730bad2e7575e4869e3`; it was not reset or edited by this packet.

Evidence levels:

- `LOCAL_CODE_VERIFIED`: L0–L6 code, unit/contract tests, full suite, typechecks, build, Edge and Firebase static validation passed.
- `DB_VALIDATION_PENDING`: no explicit verified local PostgreSQL target was supplied; all DB integration tests were skipped, so live SQL syntax/count/transaction behavior is unconfirmed.
- `STAGING_PERF_VERIFIED`: `NOT_RUN` — no approved synthetic authenticated server/session and no staging target.
- `PRODUCTION_NOT_DEPLOYED`: confirmed; no deploy, migration, cloud mutation, account creation, PR or merge performed at the verification checkpoint. The later user-authorized commit/push is recorded below.

Required artifacts: `baseline.md`, this ledger, `verification.md`, `latency-results.json`, and `handoff.md`. No production performance acceptance claim is made; warm p95, first-open/cold p95, HTTP latency, click-to-fresh-data and browser walkthrough remain unverified.

## Post-L7 audit correction

Status: `LOCAL_CODE_VERIFIED` / `DB_VALIDATION_PENDING` / `STAGING_PERF_NOT_RUN`

The final review found and corrected one L4 behavior-preservation edge case before shipping: the new single-statement progress source returned an empty event list when a student had generation-0 events but no progress snapshot. The previous transaction path preserved those events. The fix returns the query's generation-scoped events with the contract empty snapshot; auth, generation isolation and analytics formulas remain unchanged.

TDD and verification evidence:

- RED: `npx vitest run server/learning/progressBoardSource.test.ts` -> exit 1; the new no-snapshot/legacy-event regression received `[]` instead of the event.
- GREEN: the same command -> exit 0; 3 passed.
- Related GREEN: `npx vitest run server/learning/progressBoardSource.test.ts server/learning/service.test.ts server/analytics/progressBoard.test.ts src/progress/useProgressBoard.test.tsx` -> exit 0; 4 files, 28 passed.
- `npm run typecheck:server` -> exit 0.
- Fresh full suite with all database variables explicitly unset -> exit 0; 130 files passed, 6 skipped; 597 passed, 7 skipped. DB-dependent skips remain `DB_VALIDATION_PENDING`.
- Fresh `npm run typecheck`, `npm run typecheck:server`, `npm run build`, `npm run check:edge-runtime`, `npm run validate:firebase`, and `git diff --check` -> exit 0. Build retains the existing chunk-size warning.

Changed files in this correction: `server/learning/postgresRepository.ts`, `server/learning/progressBoardSource.test.ts`, and this ledger. Source hashes after correction: `server/learning/postgresRepository.ts` `38d2244f61b758d03a8109a0c11fbf386c2c921e4373e9afd07b89c57f85af4e`; `server/learning/progressBoardSource.test.ts` `eea58b00908ab88232985dba5dfd737b2449bb6502a5ffaffe48e9b3207daec7`.

No live SQL count/duration, protected HTTP latency, click-to-fresh-data, warm p95, first-open/cold p95, authenticated browser walkthrough, or approved deployment target was established. These remain release-validation gaps; anonymous 401, skeleton time and unit/mock timing are not substitutes.

## User-authorized ship checkpoint

- Scoped commit created: `9eff971` (`perf: optimize authenticated read loading`), 46 files, 2,238 insertions and 122 deletions; `git commit` -> exit 0.
- `git push origin codex/bang-tien-bo` -> exit 0; remote advanced `00ac8fb..9eff971`.
- `deno.lock` remains pre-existing and unstaged; the accepted roster manifest remains unchanged.
- Deploy: `NOT_RUN`. At this checkpoint the plan's separate release gate was not satisfied: no explicitly verified local PostgreSQL target, no protected HTTP samples, no approved synthetic authenticated account/dataset, no click-to-fresh-data/browser walkthrough, and no current project/hosting target confirmation. The later read-only target confirmation is recorded below; it does not by itself satisfy the remaining release gates.

Next concrete step: after reviewer approval, verify the exact Firebase/Supabase targets and approved synthetic environment, run DB/HTTP/browser release evidence, then deploy backend/frontend with the documented rollback artifact; otherwise remain `READY_FOR_REVIEW`.

## Release preflight — read-only target verification

Status: `TARGETS_VERIFIED_READ_ONLY` / `DB_VALIDATION_PENDING` / `SYNTHETIC_AUTH_PENDING` / `DEPLOY_NOT_RUN`

Commands and evidence from `/Volumes/Pictures/Projects/Hoc_Vui`:

- `npx --yes firebase-tools@latest projects:list --json` -> exit 0; only accessible project is `a14-82a69` (`4A14`), active.
- `npx --yes firebase-tools@latest hosting:sites:list --project a14-82a69 --json` -> exit 0; sites `a14-82a69` (`https://a14-82a69.web.app`) and `4a14` (`https://4a14.web.app`) are present.
- `npx --yes supabase@2.117.0 projects list --output json` -> exit 0; project `tvlpabqkternfvsxqovi` (`4A14`), `ACTIVE_HEALTHY`, region `ap-south-1`. The CLI printed a non-fatal local-link warning; no link/config mutation was performed.
- `npx --yes supabase@2.117.0 functions list --project-ref tvlpabqkternfvsxqovi --output json` -> exit 0; function `api` is `ACTIVE`, version `16`, `verify_jwt=false`.
- `npx --yes firebase-tools@latest hosting:channel:list --site 4a14 --project a14-82a69 --json` -> exit 0; live rollback version `projects/a14-82a69/sites/4a14/versions/d2fe8f7477a005ba`.
- `npx --yes firebase-tools@latest hosting:channel:list --site a14-82a69 --project a14-82a69 --json` -> exit 0; live rollback version `projects/a14-82a69/sites/a14-82a69/versions/a481d578c95bf39a`.
- Read-only live smoke: both Firebase roots returned HTTP 200; allowlisted Edge OPTIONS returned 204 with exact origin/credentials/method/header/max-age behavior; denied origin returned 403; anonymous `/auth/me` returned 401 `expired`. These are target/security smoke checks only, not authenticated fresh-data or latency evidence.
- Local database preflight: `HOC_VUI_TEST_DATABASE_URL`, `DATABASE_URL`, `DB_URL`, `HOC_VUI_DATABASE_URL`, and `SUPABASE_DB_URL` are unset; no PostgreSQL listener was found; Docker daemon is unavailable. No cloud database was used.

Release blockers remain: no explicitly approved local PostgreSQL target, no approved synthetic authenticated account/dataset, no protected HTTP benchmark token, and no browser click-to-fresh walkthrough. Rollback references are now identified above. No deployment, migration, secret mutation, account creation, or real-child data access was performed.

Changed files in this preflight: this ledger only. Next step requires the user-approved synthetic/local test environment to be made available; then run DB integration, protected HTTP samples and authenticated browser smoke before backend/frontend deployment.

## Continuation rule

### Approved release continuation — 2026-09-19

User explicitly approved isolated local DB/schema/fixtures and a synthetic cloud account for verification/deployment. Resume after quota from files, not a new execution packet.

- Installed PostgreSQL 17.11 with Homebrew; dedicated cluster `/tmp/hoc-vui-load-db.wdmwtV/data`, localhost `127.0.0.1:55432`, database `hoc_vui_load_test`. Six existing migrations applied ONLY there, exit 0. Test runtime role is non-superuser `hoc_vui_runtime`; no cloud migration/secret/region/pool changes.
- First real integration run: exit 1, 6/7 passed; caught UUID-array encoding failure on a fresh `postgres` connection with `prepare:false`. Driver reproduction confirmed `db.array(ids)` failed while parameterized `ids::uuid[]` succeeded. Fixed three affected authoring read paths.
- Real fixture insertion also exposed double JSON encoding in challenge question/options/metadata/event writes. Added real PostgreSQL regression (RED constraint violation, then GREEN) and used driver `json()` parameters. Existing transaction order retained. Test cleanup fixed to remove only its own synthetic event before its account.
- Six integration suites: exit 0, 8/8 tests; full suite with explicit local runtime DB: exit 0, 136 files, 605 tests, NO skips. `npm run typecheck`, `typecheck:server`, `check:edge-runtime`, `build`, `validate:firebase`, `git diff --check`: exit 0. Existing chunk warning remains.
- `local-http-sql.json`: actual Node HTTP through Edge handler plus PostgreSQL; 30 warm + 1 first-open samples per flow. Warm SQL auth-inclusive friends=2, board=2, today=12, week=10. Today first-open=14 due to missing preference insertion. No live before SQL trace exists.
- `local-browser.json`: isolated Chrome headless desktop, click -> fresh response/body -> ready DOM -> two animation frames; 30 warm samples per flow. p95 friends 48.2 ms, board 54.9 ms, today 143.9 ms, week 47.6 ms; first-open separately recorded. Local dev-server results do not establish production/cold performance.
- Synthetic cloud account `qamu7n18no` created once via existing Admin API and PIN changed. Its secrets/session are only in ignored `data/local/load-release/cloud-session.json`; do not recreate after interruption. No learner body/payload is retained in performance reports.
- CLI function download refused its deployed multi-directory bundle (`UnsafeFunctionDownloadPathError`); did not bypass that extraction guard. A source rollback archive of accepted pre-optimization commit `00ac8fb` is prepared under `/tmp/hoc-vui-edge-rollback.bgwbyX`; this is not claimed byte-identical to deployed v16. Existing Firebase rollback versions remain as recorded above.
- Added reproducible local/cloud/browser measurement scripts. Cloud pre-deploy report is in progress (`cloud-before.json`, 5 samples/route); keep that limited sample baseline distinct from 30-sample release results. Production deployment still pending at this checkpoint.

Next: finish cloud baseline, preserve approved scope, commit verified source, deploy Edge, synthetic smoke, deploy Firebase, collect release HTTP/browser samples, disable QA account, record remaining latency gaps.

After an interruption, inspect this ledger, `git status --short`, scoped diff, and actual artifacts before retrying. Do not reset/stash, rerun a completed package without source/test changes, or use the old worktree as a baseline.

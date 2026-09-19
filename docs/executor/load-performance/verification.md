# Load performance — verification report

## Current release result — 2026-09-19 (supersedes historical snapshot below)

`READY_FOR_REVIEW_WITH_BLOCKER`; goal `<3 s` NOT achieved. Checkout `/Volumes/Pictures/Projects/Hoc_Vui`, branch `codex/bang-tien-bo`, verified implementation commit `6f5927f95450f244b35d9132ef7cb149a779ddd0` pushed.

- L0–L6 code and local DB verification completed; L7 release acceptance blocked by production weekly timeout. Frontend L1 is deployed; optimized backend L2–L6 was rolled back.
- Fresh full test command with explicit `HOC_VUI_TEST_DATABASE_URL=postgresql://hoc_vui_runtime@127.0.0.1:55432/hoc_vui_load_test npm test -- --testTimeout=30000 --reporter=dot`: exit 0, **136 files / 605 tests, zero skipped**. Dedicated localhost PostgreSQL 17.11, six existing migrations, synthetic data only; non-superuser runtime role. Six integration suites / 8 tests passed.
- `npm run typecheck`, `npm run typecheck:server`, `npm run check:edge-runtime`, `npm run build`, `npm run validate:firebase`, `git diff --check`: exit 0. Build retains existing large-chunk warning. No new app dependency. Homebrew PostgreSQL is a local verification prerequisite, not an app dependency.
- Real DB testing caught UUID-array encoding on fresh connections and double-encoded JSON writes. RED/GREEN details and corrections are in `progress.md`; transaction order and author/answer isolation retained.
- Actual warm SQL statements, auth inclusive, from `local-http-sql.json`: friends **2**, board **2**, today **12**, week **10**. Today first-open **14** includes preference insertion. No real before-SQL trace or production SQL count: do not compare these as measured before/after.
- Local Node/PostgreSQL HTTP p95, 30 warm each: 4.20/4.12/6.07/7.53 ms (friends/board/today/week). Local Chrome click-to-fresh p95, 30 warm each: 48.2/54.9/143.9/47.6 ms. Local results are not production SLA. Fixtures include 31 users created by the successful harness plus remnants of an earlier failed fixture attempt; not an exact 30-peer capacity benchmark.
- Production baseline: 5 requests each, no errors, `cloud-before.json`. Optimized v17: 1 smoke + 3 diagnostic samples per route, weekly 4/4 timeouts at 20 s; separate weekly 60 s timeout. Other diagnostic warm maxima (only 2 warm) friends 2405.4, board 2407.9, today 4801.4 ms. No 30-warm release benchmark; no cold p95.
- Edge rolled back to **v18 ACTIVE**, bundle SHA `e57d786f1d09ba2bf5b1b6912bd47a097812ea998597d0d370abfbbf8f583f1d`, matching the recorded predeploy v16 bundle hash. Rollback did not change cloud schema/secrets/region/pool or learner data.
- Both Firebase sites run the new frontend: 4a14 version `5a4345d7c6742f03`; a14-82a69 version `4acefa21863e4043`. Both index assets match `index-DiBNMkhK.js`; SW no-store. Hosting was started before weekly smoke completed: a release-gate deviation, documented explicitly in progress.
- Rollback HTTP smoke 4/4 200/no-store. Production Chrome smoke after rollback 4/4 200, no page errors: click-to-fresh friends **3695.9**, board **3613.9**, today **5744.7**, week **17111.8 ms**, **one sample each**, not p95 (`cloud-rollback-browser.json`). These prove compatible functioning only, not performance acceptance.
- v17 CORS max-age/exposure passed; after backend rollback those optimizations are no longer claimed active. Auth negative checks and synthetic-account revocation are separate security evidence, never latency evidence.
- Missing: root cause of cloud-only weekly regression, production-like pooler reproduction, 30-warm production click-to-fresh measurements, cold samples, complete tab/offline/reset/account-switch browser matrix, multiple dataset sizes and independent review. Unit security coverage does not replace this runtime matrix.

Next: do not redeploy unchanged optimized backend. Diagnose the bounded weekly read path using non-sensitive stage/statement timings and a local transaction-pooler reproduction, then RED/GREEN and a new release gate. Changing cloud region/pool/secrets or migrations remains outside authorization.

## Historical L7 local-only snapshot

Captured: `2026-09-19T00:45:11+07:00`

## Scope and checkout

- Actual checkout: `/Volumes/Pictures/Projects/Hoc_Vui`
- HEAD: `00ac8fb0e5681fbc9c4a177b4425484c4ce95bfc`
- Worktree: direct source checkout; no new worktree, old worktree not read or integrated.
- External actions: none. No commit, push, PR, merge, deploy, migration, cloud mutation, account creation or real-child data.
- Pre-existing dirty file preserved: `deno.lock`, SHA-256 `776554a46c7706ff0e6e7175b79d205ecdb0b11daadf6730bad2e7575e4869e3`.
- `accepted-source-baseline.json` is unchanged (`git diff --exit-code` exit 0).

## Package status

| Package | Result | Evidence boundary |
|---|---|---|
| Roster lifecycle packet | `ACCEPTED_LOCAL` | Not reimplemented. `src/App.tsx`, classroom hook/dialog/conversation lifecycle files remain manifest-identical. |
| L0 | `LOCAL_CODE_VERIFIED` + `DB_VALIDATION_PENDING` | Runner contract and fixture tests pass; no approved local HTTP session. |
| L1 | `LOCAL_CODE_VERIFIED` + `DB_VALIDATION_PENDING` | Direct board fetch/cache isolation tests pass; live DB/HTTP absent. |
| L2 | `LOCAL_CODE_VERIFIED` + `DB_VALIDATION_PENDING` | Credential-free session projection and authorization matrix pass; live DB absent. |
| L3 | `LOCAL_CODE_VERIFIED` + `DB_VALIDATION_PENDING` | Single roster read contract passes; integration skipped without explicit local DB. |
| L4 | `LOCAL_CODE_VERIFIED` + `DB_VALIDATION_PENDING` | Single source statement/generation parity tests pass; integration skipped. |
| L5A | `LOCAL_CODE_VERIFIED` + `DB_VALIDATION_PENDING` | Batch today reads and answer secrecy pass; integration skipped. |
| L5B | `LOCAL_CODE_VERIFIED` + `DB_VALIDATION_PENDING` | Weekly range/aggregate/projection/preference tests pass; integration skipped. |
| L6 | `LOCAL_CODE_VERIFIED` + `DB_VALIDATION_PENDING` | Timing, CORS, Deno and Edge smoke pass; protected HTTP timing absent. |
| L7 | `READY_FOR_REVIEW` | This report, `progress.md`, `latency-results.json`, `handoff.md`. |

## Fresh verification commands

| Command | Exit | Result |
|---|---:|---|
| `env -u HOC_VUI_TEST_DATABASE_URL -u DATABASE_URL -u DB_URL -u HOC_VUI_DATABASE_URL -u SUPABASE_DB_URL npm test` | 0 | 130 files passed, 6 skipped; 596 passed, 7 skipped. |
| `npm run typecheck` | 0 | Client TypeScript. |
| `npm run typecheck:server` | 0 | Server TypeScript. |
| `npm run build` | 0 | Vite production build; existing chunk-size warning only. |
| `npm run check:edge-runtime` | 0 | Deno check and real entrypoint smoke passed. |
| `npm run validate:firebase` | 0 | Firebase static hosting config validated. |
| `git diff --check` | 0 | No whitespace errors. |
| `git diff --exit-code -- docs/executor/load-performance/accepted-source-baseline.json` | 0 | Accepted manifest preserved. |

Skipped integration tests were `server/app.integration.test.ts`, `server/auth/postgresRepository.integration.test.ts`, `server/db/database.integration.test.ts`, `server/learning/postgresRepository.integration.test.ts`, `server/classroom/roster.integration.test.ts`, and `server/challenge/readPerformance.integration.test.ts` (two tests). The command environment explicitly unset all supported DB variables; no target was inferred.

## L6 and security review

- Auth timing measures `authorizeStudent`; data timing measures only the service for `/api/me/friends`, `/api/me/progress-board`, and `/api/me/challenge/today`; total is inclusive and request-local.
- Timing labels contain fixed names and durations only; no student ID, token, SQL text or body is emitted.
- Private responses remain `Cache-Control: no-store`. Allowlisted CORS exposes `Server-Timing`; denied origins remain denied. Valid preflight has `Access-Control-Max-Age: 600`, exact methods/headers and `Vary: Origin`.
- Revocation, expiry, `credentialVersion`, parent grant, account/generation isolation, rollout gates, moderation, quota, idempotency and transaction ordering remain covered by tests. Credential-bearing mutation paths remain on `currentSession()`.
- No cache of authorization or stale private data was used as fresh-data evidence. Anonymous 401 and skeleton time are excluded from performance claims.
- No dependency was added.
- Self-review only; no independent reviewer or subagent was used, per user instruction.

## Measurement limits

- Live SQL statement count/duration: `DB_VALIDATION_PENDING`.
- Protected HTTP latency, `Server-Timing` from a real server, click-to-fresh-data, first-open, warm and cold p95: `NOT_RUN`.
- Browser walkthrough (open/click/reopen five times, tab return, offline retry, reset/account switch/logout): `NOT_RUN`; no approved local synthetic authenticated server/session was available.
- Staging and production: `NOT_RUN` / not deployed.
- Unit/mock query budgets are reported separately in `progress.md` and `handoff.md`; they are not SQL or HTTP performance measurements.

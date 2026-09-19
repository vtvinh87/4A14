# Load performance — verification report

## Current bounded result — Edge v27, 2026-09-19T04:29Z

`READY_FOR_REVIEW_WITH_GAPS`; all four warm protected HTTP and click-to-fresh browser p95 gates are below 3 seconds. First-open/cold and production SQL remain separate evidence gaps. Actual checkout `/Volumes/Pictures/Projects/Hoc_Vui`, branch `codex/bang-tien-bo`, source `07de92623c43e08e79bc6e94b1e1cdfd2ae5bd61` pushed.

- Source packet: `d2440c3` coalesced challenge preferences into the Today snapshot; `07de926` added `hasOpenRoundsBefore` to the same snapshot and skips only the redundant previous-round probe when it is false. The RED test failed with one unexpected `listOpenRoundsBefore` call; focused GREEN was **19/19**. The true/unknown path keeps the existing close behavior.
- Local PostgreSQL 17.11 integration: exit 0, **2 files / 5 tests**. Latest service-only trace on `127.0.0.1:55432/hoc_vui_load_test`: auth **1 SQL / 1.266 ms**, Today **1 SQL / 7.502 ms**, Week **1 SQL / 3.743 ms**. Production SQL count/duration is **NOT_MEASURED**; earlier auth-inclusive HTTP counts remain non-comparable.
- Full local suite: exit 0, **138 files / 620 tests / zero skipped**. Client/server typecheck, Edge runtime check, build, Firebase validation, whitespace check and accepted-manifest diff check all exit 0. Existing Vite large-chunk warning only; no app dependency added. Local PostgreSQL was stopped after verification.
- Edge `api` version **27 ACTIVE**, bundle SHA `9506e5f25ee55c2e912beddf0fa2e749ab66edd2ce7e96639df6fe1c024ffffd`; no migration, secret, region, pool or frontend deployment change.
- v27 smoke artifact `cloud-snapshot-v27-smoke.json` (SHA-256 `5f0fc0c77922867758103b4703f5d14d3fca7a2feefc8df2215a5f786687e13a`): fresh login 200; all four protected routes 200/no-store; no answer leak. Today sample body-complete 2646.842 ms; Server-Timing auth/data/total 1908.490/537.040/2450.860 ms, snapshot 269.440 ms, prepare 266.650 ms; the redundant close stage is absent.
- v27 HTTP artifact `cloud-snapshot-v27-http.json` (SHA-256 `c6a117fbf27c60e4f996eb1918a27ad69127a05a8a907a8f49182b33147c86f4`): 31 sequential samples/route, 30 warm, 0 errors. Warm p95 ms friends/board/today/week **2661.521 / 2602.984 / 2864.555 / 2544.836**; first-open **2550.249 / 2348.960 / 2607.873 / 2476.003**. This is host-to-Edge response-body-complete latency.
- v27 browser artifact `cloud-snapshot-v27-browser.json` (SHA-256 `d58cb3223dc19141a6cc2bc7c8e31978f0d30825ef1c692f4a099f0921df1629`): isolated headless Chrome, 124 samples, 30 warm/flow, 0 errors/page errors. Click-to-fresh warm p95 ms **2579.000 / 2677.700 / 2797.500 / 2512.800**; first-open **2552.400 / 2694.700 / 3011.800 / 2629.000**. This includes click, successful fresh response, ready DOM and two animation frames; cold Edge is not established.
- QA cleanup artifact `cloud-snapshot-v27-qa-cleanup.json` (SHA-256 `74142bd265c3519d91f2440c4e53578650d3af2abaf043eee8be9f321538ca1d`): account disabled 200/active false, old token 401, admin logout 200. No real-child data used.
- Acceptance: **warm target passed** for all four flows in both HTTP and browser evidence. The report remains `READY_FOR_REVIEW_WITH_GAPS`, not an unconditional performance acceptance, because cold/first-open are separate (Today browser first-open 3.012 s) and production SQL is not measured.

## Current bounded snapshot result — 2026-09-19T02:13Z

`READY_FOR_REVIEW_WITH_GAPS`; Edge v25 is active and protected verification is clean, but Today still misses the warm `<3 s` target. Actual checkout `/Volumes/Pictures/Projects/Hoc_Vui`, branch `codex/bang-tien-bo`, source `49117e6896c6a64a0de097bab45a088cc3e07634` pushed.

- Edge `api` version 25 is ACTIVE, bundle SHA `08239101969dc70cb1d6d7326b5022a5684579d19c6a34046d4b4e16ce7557b4`; no migration, secret, region or pool mutation.
- Final local PostgreSQL 17.11 gates: exit 0, **138 files / 617 tests / zero skipped**. Local trace: auth 1 SQL query / 4.003 ms, Today 3 service SQL queries / 13.400 ms, Week 1 service SQL query / 10.477 ms. These are local service/SQL timings; production SQL count is **NOT_MEASURED**.
- v25 protected smoke: all four routes 200, `no-store`, login 200, no answer leak/account mismatch. Artifact: `cloud-snapshot-v25-smoke.json` (SHA-256 `260e3781ce38f3f364937609db4d6b4801e8325bf20fdb2fade1cb39b291dacd`).
- v25 HTTP: 31 sequential samples/route, 30 warm, 0 errors. Warm p95 ms (friends/board/today/week): **2662.116 / 2661.983 / 3308.316 / 2560.538**. First-open: **1829.606 / 2514.355 / 3244.931 / 2448.420**. Artifact SHA-256 `ab670c6860494a0ecfbd12d3028dbc174ebea5c95a38beaa2d78acad8849951f`.
- v25 browser click-to-fresh: 30 warm/flow, 0 errors/page errors. Warm p95 ms: **2613.900 / 2596.900 / 3312.900 / 2528.900**. First-open: **2641.800 / 2646.400 / 3628.600 / 2662.800**. Artifact SHA-256 `f6039f440f193d23e20126918ecbd71358cf783c4dd08cb5bce74ca299355241`. Cold Edge was not established.
- QA cleanup: disable 200/active false, old token 401, admin logout 200; artifact SHA-256 `ffb6cef2565b714b8081a7e3cd193002e469deef06eed7e042dd3adf9c14aa39`. No real-child data was used.
- Interpretation: Friends, Board and Week meet the warm target; Today does not in both independent HTTP and browser measurements. This is a real remaining gap, not an anonymous 401, skeleton, cache or Server-Timing-as-SQL claim. The release is reviewable but not performance-accepted.

## Current fixed-release result — 2026-09-19T01:05Z

`READY_FOR_REVIEW_WITH_GAPS`; L0–L7 implementation/release gates are documented, but the global warm `<3 s` goal is **not achieved**. Actual checkout `/Volumes/Pictures/Projects/Hoc_Vui`, branch `codex/bang-tien-bo`, source commit `2f2ac390ab29ad02d9b0b01cd5fdf8b5ed5f9b49` pushed.

- Fixed Edge `api` version 21 is ACTIVE, bundle SHA `8f1f542ce0cdbb7822bdf2c0f0db25d5d8abb00647482cfbbacb5d469345735f`; no cloud schema, secret, region or pool mutation.
- Fresh local DB full suite: exit 0, **136 files / 607 tests / zero skipped**. Local DB is PostgreSQL 17.11 at `127.0.0.1:55432/hoc_vui_load_test`, six existing migrations, synthetic-only data, non-superuser runtime role. Typecheck, server typecheck, Edge check, build, Firebase validation and diff check all exit 0; existing large-chunk warning only.
- TDD regression: weekly pool-bound probe RED at `maxConcurrentReads=5`, then GREEN at 1 after serializing only the bounded weekly reads. Local real service was `ok:true`: 70.16 ms pool max 1, 28.51 ms pool max 10. This explains and guards the concurrency risk, but is not proof of the exact cloud database cause.
- Fixed production HTTP: `cloud-fixed-http.json`, 1 first-open + 30 warm per route, 0 errors. Warm p95 ms in route order friends/board/today/week: **2632.7 / 2566.1 / 4913.2 / 4455.1**. First-open total ms: **2488.3 / 2363.1 / 4809.3 / 4397.2**.
- Fixed production Chrome: `cloud-fixed-browser.json`, 1 first-open + 30 warm per flow, 0 page errors. Click-to-fresh warm p95 ms: **2511.8 / 2510.7 / 4912.5 / 4579.2**. First-open ms: **2583.8 / 2193.7 / 5094.3 / 4594.0**. Cold Edge was not established, so first-open is reported separately and is not cold p95.
- `Server-Timing` is present for all four protected read routes. Warm sample auth/data/total ms: friends **1898.8/264.8/2168.6**, board **1875.9/262.2/2143.7**, today **1880.2/2617.8/4503.6**, week **1902.4/2242.7/4150.3**. These are server spans, not SQL durations; production SQL count was not captured.
- Frontend remains the deployed Hosting build: 4a14 version `5a4345d7c6742f03`, a14-82a69 version `4acefa21863e4043`, asset `index-DiBNMkhK.js`. No frontend redeploy was necessary for this backend-only fix.
- QA cleanup passed: account disabled 200, old token 401, admin logout 200 (`cloud-fixed-qa-cleanup.json`). No real-child data was used or modified.
- Acceptance: Friends/Board meet the warm target at browser p95; Today/Week do not. Remaining work is a new bounded optimization packet for auth and Today/Week data; index/region/pool changes require separate evidence/review. No further external action is implied by this report.

## Previous fixed-release v21 snapshot — superseded by v25

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

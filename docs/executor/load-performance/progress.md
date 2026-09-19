# Load performance — execution ledger

Status: `READY_FOR_REVIEW_WITH_GAPS` — Edge v27 is active and verified; all four warm HTTP/browser p95 gates pass, but first-open/cold and production SQL remain separate gaps
Plan: `/Volumes/Pictures/Projects/Hoc_Vui/docs/superpowers/plans/2026-09-18-load-performance-luna.md`
Actual checkout: `/Volumes/Pictures/Projects/Hoc_Vui`
HEAD at start: `00ac8fb0e5681fbc9c4a177b4425484c4ce95bfc`
Plan reference HEAD: `98690ab3b5b527862821658cd8afcfa8287ebcbe` (not checked out)
Pre-existing dirty file: `deno.lock` (`776554a46c7706ff0e6e7175b79d205ecdb0b11daadf6730bad2e7575e4869e3`), preserved
Accepted roster baseline: seven manifest hashes matched before L0; six lifecycle files remain byte-identical. `src/App.test.ts` changed only in L1 to update the planned progress-board config-call assertion; accepted manifest JSON itself is unchanged.
Old worktree: `/Users/macbook/.codex/worktrees/4fc1/Hoc_Vui` — not read or integrated.
External actions: user-authorized commit/push, Edge deploy/rollback, Hosting deploy and synthetic QA account enable/disable for verification. No cloud migration, secret/region/pool change, PR, merge, or Brain_Vault write. Local migrations applied only to the verified isolated database.

Current package status (supersedes the historical table below): L0–L6 implementation and local PostgreSQL verification completed; the bounded challenge snapshot packets are active as Edge v27; frontend remains deployed. L7 warm performance gates pass, but first-open/cold and production SQL evidence remain explicitly separate. Do not redeploy the failed `6f5927f` backend unchanged.

## Bounded previous-round probe packet — 2026-09-19T04:29Z

- Actual checkout `/Volumes/Pictures/Projects/Hoc_Vui`, branch `codex/bang-tien-bo`; source `07de92623c43e08e79bc6e94b1e1cdfd2ae5bd61` is pushed (`git push origin codex/bang-tien-bo` -> exit 0). No new task, subagent or worktree was created. Pre-existing `deno.lock` remains untouched at SHA-256 `776554a46c7706ff0e6e7175b79d205ecdb0b11daadf6730bad2e7575e4869e3`; accepted roster lifecycle and `accepted-source-baseline.json` remain preserved.
- TDD: RED `npx vitest run server/challenge/playService.test.ts --reporter=dot` -> exit 1, 12 tests with the new redundant-probe assertion failing because `listOpenRoundsBefore` was called once. Minimal GREEN focused run `npx vitest run server/challenge/playService.test.ts server/challenge/readRepository.test.ts server/performance/timing.test.ts --reporter=dot` -> exit 0, **19/19**. The snapshot now returns `hasOpenRoundsBefore`; the old close path remains active when the flag is true or the snapshot is unavailable.
- Changed files: `server/challenge/playService.ts`, `server/challenge/playService.test.ts`, `server/challenge/readRepository.ts`, `server/challenge/readRepository.test.ts`. Commit message: `perf: skip redundant previous-round probe`. No auth, parent grant, credentialVersion, account/generation isolation, roster lifecycle, moderation, quota, transaction or frontend behavior was removed.
- Local integration `HOC_VUI_TEST_DATABASE_URL=postgresql://hoc_vui_runtime@127.0.0.1:55432/hoc_vui_load_test npx vitest run server/challenge/readPerformance.integration.test.ts server/performance/localReadTiming.integration.test.ts --testTimeout=30000 --reporter=dot` -> exit 0, **2 files / 5 tests**. Latest service-only trace: auth **1 SQL / 1.266 ms**, Today **1 SQL / 7.502 ms**, Week **1 SQL / 3.743 ms**. The prior post-snapshot trace was Today **2 SQL**; this reduction is local SQL/service evidence, not production SQL.
- Full local gate `HOC_VUI_TEST_DATABASE_URL=postgresql://hoc_vui_runtime@127.0.0.1:55432/hoc_vui_load_test npm test -- --testTimeout=30000 --reporter=dot` -> exit 0; **138 files / 620 tests / zero skipped**. `npm run typecheck`, `npm run typecheck:server`, `npm run check:edge-runtime`, `npm run build`, `npm run validate:firebase`, `git diff --check`, and accepted-manifest diff check -> exit 0. Build retains only the existing large-chunk warning. PostgreSQL stopped cleanly with `pg_ctl ... stop -m fast` -> exit 0.
- Source sequence: `d2440c3` coalesced preferences into Today snapshot, then `07de926` removed the redundant previous-round probe only when the snapshot proves none are open. Both are pushed; `deno.lock` and old untracked diagnostics remain outside the write-set.
- Edge deploy/list -> exit 0: `api` version **27 ACTIVE**, bundle SHA `9506e5f25ee55c2e912beddf0fa2e749ab66edd2ce7e96639df6fe1c024ffffd`, project ref `tvlpabqkternfvsxqovi`. No migration, secret, region, pool or frontend deploy changed.
- v27 protected smoke `cloud-snapshot-v27-smoke.json` -> exit 0: fresh login 200; all four routes 200; `Cache-Control: no-store`; no answer leak. Body-complete ms friends/board/today/week: **2360.726 / 2440.435 / 2646.842 / 2470.313**. Today Server-Timing auth/data/total **1908.490/537.040/2450.860 ms**, stages snapshot **269.440** and prepare **266.650**; `challenge_close_previous` is absent. Production SQL count/duration remains **NOT_MEASURED**.
- v27 protected HTTP `cloud-snapshot-v27-http.json` -> exit 0; 31 sequential samples/route, 30 warm, 0 errors. Warm p95 ms friends/board/Today/Week: **2661.521 / 2602.984 / 2864.555 / 2544.836**. First-open ms: **2550.249 / 2348.960 / 2607.873 / 2476.003**. This is host-to-Edge response-body-complete HTTP latency, not click-to-paint or cold Edge.
- v27 protected browser `cloud-snapshot-v27-browser.json` -> exit 0; isolated headless Chrome, **124 samples**, 30 warm per flow, 0 errors/page errors. Click-to-fresh warm p95 ms friends/board/Today/Week: **2579.000 / 2677.700 / 2797.500 / 2512.800**. First-open ms: **2552.400 / 2694.700 / 3011.800 / 2629.000**. Cold Edge remains `NOT_ESTABLISHED`; first-open is reported separately and Today first-open is just above 3 s.
- QA cleanup `cloud-snapshot-v27-qa-cleanup.json` -> exit 0: synthetic account disable 200/active false, old student token 401, admin logout 200. No real-child data was used. Frontend remains Firebase 4a14 `5a4345d7c6742f03` and a14-82a69 `4acefa21863e4043`; no frontend redeploy was needed.
- Evidence SHA-256: smoke `5f0fc0c77922867758103b4703f5d14d3fca7a2feefc8df2215a5f786687e13a`; HTTP `c6a117fbf27c60e4f996eb1918a27ad69127a05a8a907a8f49182b33147c86f4`; browser `d58cb3223dc19141a6cc2bc7c8e31978f0d30825ef1c692f4a099f0921df1629`; QA cleanup `74142bd265c3519d91f2440c4e53578650d3af2abaf043eee8be9f321538ca1d`.
- Acceptance: **warm target passed** independently in protected HTTP and click-to-fresh browser measurements for all four flows. Global status remains `READY_FOR_REVIEW_WITH_GAPS` because cold Edge is not established, first-open is reported separately (Today browser 3.012 s), and production SQL count/duration is not measured. These gaps are not replaced by anonymous 401, skeleton, cache, unit/mock or Server-Timing timing.
- Next step: commit/push this evidence-only ledger update, then stop before further external action. For full acceptance, obtain an approved way to measure cold/first-open and production SQL separately; rollback v27 only for security, correctness, availability or fresh-data regression. Warm performance does not authorize weakening auth or introducing a private-data cache.

## Bounded challenge snapshot release validation checkpoint — 2026-09-19T02:13Z

- Actual checkout: `/Volumes/Pictures/Projects/Hoc_Vui`; branch `codex/bang-tien-bo`; source `49117e6896c6a64a0de097bab45a088cc3e07634` is pushed (`git push origin codex/bang-tien-bo` -> exit 0). No new task, subagent or worktree was created. Pre-existing `deno.lock` remains untouched at SHA-256 `776554a46c7706ff0e6e7175b79d205ecdb0b11daadf6730bad2e7575e4869e3`; accepted roster lifecycle and `accepted-source-baseline.json` remain preserved.
- Package status: **L0, L1, L2, L3, L4, L5A, L5B and L6 = LOCAL_VERIFIED with the explicit isolated PostgreSQL target passed; L7 = READY_FOR_REVIEW_WITH_GAPS**. The remaining gap is the production Today warm p95, not a skipped local gate.
- Source sequence for this bounded packet: `90896a0` (non-sensitive stage timing), `0e22b30` (single JSON snapshot repository), `1a5fcb9` (reuse partial snapshot), `49117e6` (avoid redundant snapshot refresh). The latest source changes are limited to the challenge read repository/service/tests, weekly read wiring/tests, request timing and local timing integration tests; no auth mutation, parent grant, credentialVersion, moderation, quota, transaction, roster lifecycle or frontend behavior was changed.
- Edge deploy command `npx --yes supabase@2.117.0 functions deploy api --project-ref tvlpabqkternfvsxqovi --use-api` -> exit 0. `functions list` -> exit 0: `api` version **25 ACTIVE**, bundle SHA `08239101969dc70cb1d6d7326b5022a5684579d19c6a34046d4b4e16ce7557b4`. No migration, secret, region or pool setting changed; no cloud database schema was touched.
- Final local verification on this source: `HOC_VUI_TEST_DATABASE_URL=postgresql://hoc_vui_runtime@127.0.0.1:55432/hoc_vui_load_test npm test -- --testTimeout=30000 --reporter=dot` -> exit 0; **138 files / 617 tests / zero skipped**. `npm run typecheck`, `npm run typecheck:server`, `npm run check:edge-runtime`, `npm run build`, `npm run validate:firebase`, `git diff --check` and `git diff --exit-code -- docs/executor/load-performance/accepted-source-baseline.json` -> exit 0. Build retains only the existing large-chunk warning.
- Local SQL/timing evidence is explicitly separate from cloud latency: final `localReadTiming.integration.test.ts` trace on isolated PostgreSQL 17.11 recorded auth **1 query / 4.003 ms**, Today **3 service queries / 13.400 ms**, Week **1 service query / 10.477 ms**. Earlier local HTTP route counts before the snapshot packet were auth-inclusive **2 / 2 / 12 / 10** for friends/board/today/week in `local-http-sql.json`; those boundaries are not falsely treated as directly comparable to the service-only trace. Friends/Board were not re-traced after the challenge snapshot change. Production SQL count/duration: **NOT_MEASURED**.
- Protected v25 smoke (`cloud-snapshot-v25-smoke.json`) -> exit 0: login 200; all four routes 200 with `Cache-Control: no-store`; no answer leak or account mismatch. One body-complete HTTP sample (ms, route order friends/board/today/week): **2372.314 / 2404.235 / 3166.616 / 2355.021**. Server-Timing is request-local telemetry, not SQL timing: auth/data/total = **1894.740/265.210/2165.460**, **1918.490/266.180/2192.430**, **1841.940/1026.320/2873.410**, **1854.290/262.160/2121.830**. Today stages included preferences 255.480, snapshot 257.180 and prepare 256.350 ms; Week snapshot was 260.860 ms.
- Protected v25 HTTP benchmark (`cloud-snapshot-v25-http.json`) -> exit 0; 31 sequential samples/route, 30 warm, 0 errors. Warm p95 ms: friends **2662.116**, board **2661.983**, Today **3308.316**, Week **2560.538**. First-open ms: **1829.606 / 2514.355 / 3244.931 / 2448.420**. This is host-to-Edge response-body-complete HTTP latency, not click-to-paint and not cold Edge.
- Protected v25 browser benchmark (`cloud-snapshot-v25-browser.json`) -> rerun with per-sample checkpoint, exit 0; 124 samples total, 30 warm per flow, 0 errors/page errors. Click-to-fresh warm p95 ms: friends **2613.900**, board **2596.900**, Today **3312.900**, Week **2528.900**. First-open ms: **2641.800 / 2646.400 / 3628.600 / 2662.800**. This includes click, successful fresh response, ready DOM and two animation frames; cold Edge was not established.
- QA cleanup (`cloud-snapshot-v25-qa-cleanup.json`) -> exit 0: synthetic account disable 200/active false, old student token 401, admin logout 200. No real-child data was used. Local PostgreSQL was stopped with the exact `pg_ctl ... stop -m fast` command -> exit 0; cluster retained.
- Evidence SHA-256: smoke `260e3781ce38f3f364937609db4d6b4801e8325bf20fdb2fade1cb39b291dacd`; HTTP `ab670c6860494a0ecfbd12d3028dbc174ebea5c95a38beaa2d78acad8849951f`; browser `f6039f440f193d23e20126918ecbd71358cf783c4dd08cb5bce74ca299355241`; QA cleanup `ffb6cef2565b714b8081a7e3cd193002e469deef06eed7e042dd3adf9c14aa39`.
- Acceptance: Friends and Board pass the warm `<3 s` HTTP/browser target; Week now passes after the bounded snapshot change; **Today remains above target at 3.308 s HTTP and 3.313 s click-to-fresh browser p95**. First-open is reported separately and is not cold p95; cold Edge remains `NOT_ESTABLISHED`. Status is therefore **READY_FOR_REVIEW_WITH_GAPS**, not performance-accepted.
- One initial browser harness was interrupted at exit 130 after no checkpoint artifact was produced; a one-sample diagnostic and five-sample harness passed, then the checkpointed 31-sample rerun above completed cleanly. This was a measurement-harness interruption, not a product failure.
- Next step: stop before further external mutation. Review the current v25 evidence, then prepare a bounded auth/Today packet if the global `<3 s` goal is mandatory; isolate the remaining ~1.9 s auth span and Today preparation/data path with fresh RED tests and local/HTTP/browser evidence. Do not weaken auth, reuse stale private cache, change region/pool/secrets, apply migrations, or claim completion from anonymous/skeleton timing.

## L5B regression diagnosis checkpoint — 2026-09-19

- Hypothesis: concurrent weekly repository reads can contend on a constrained/shared production database even though local small-fixture `Promise.all` is fast. This remains a bounded hypothesis, not a claimed cloud root cause; the cloud request timed out before returning timing headers.
- TDD RED: `npx vitest run server/challenge/weeklyService.test.ts` -> exit 1; the pool-bound repository probe observed `maxConcurrentReads=5`, expected 1. The first probe implementation was corrected for spy recursion before accepting this RED result.
- Minimal change: `server/challenge/weeklyService.ts` now performs the same bounded L5B reads serially (rounds, item range, contribution aggregate, questions, attempts, reactions, active IDs, batch questions, own questions). No predicates, output fields, authorization, moderation, quota, idempotency or transaction writes changed.
- GREEN: `npx vitest run server/challenge/weeklyService.test.ts server/performance/timing.test.ts` -> exit 0; 7/7 passed. Real local integration: `HOC_VUI_TEST_DATABASE_URL=postgresql://hoc_vui_runtime@127.0.0.1:55432/hoc_vui_load_test npx vitest run server/challenge/readPerformance.integration.test.ts server/challenge/weeklyService.test.ts server/auth/sessionProjection.test.ts server/app.test.ts --testTimeout=30000 --reporter=dot` -> exit 0; 4 files / 35 tests.
- Fresh full suite: same local DB URL with `npm test -- --testTimeout=30000 --reporter=dot` -> exit 0; 136 files / 607 tests / zero skipped. Typecheck, server typecheck, Edge check, build, Firebase validation and `git diff --check` -> exit 0. Existing large-chunk warning remains.
- Direct real service measurement on the retained isolated PostgreSQL 17.11 database: pool max 1 -> 70.16 ms; pool max 10 -> 28.51 ms; both `ok:true`. This is local service timing, not cloud HTTP or click-to-fresh-data.
- L6 timing coverage now includes `/api/me/challenge/week` with the same fixed `auth/data/total` labels. It is observability only and must not be used as SQL timing.
- Next: commit/push this bounded fix, deploy Edge only, run one protected cloud weekly smoke plus all four routes, inspect status/body/header/errors, then collect 30 warm HTTP/browser samples only if all smoke is clean. Roll back on timeout or data/security regression; frontend bundle is unchanged.

## Fixed release validation checkpoint — 2026-09-19T01:05Z

- Source commit `2f2ac390ab29ad02d9b0b01cd5fdf8b5ed5f9b49` pushed to `origin/codex/bang-tien-bo`. Edge deploy -> exit 0; `api` version **21 ACTIVE**, bundle SHA `8f1f542ce0cdbb7822bdf2c0f0db25d5d8abb00647482cfbbacb5d469345735f`. No migration, secret, region or pool setting changed.
- Fixed-release source/test changes are limited to `server/challenge/weeklyService.ts`, `server/challenge/weeklyService.test.ts`, `server/performance/timing.ts`, `server/performance/timing.test.ts`, `server/app.ts`; release evidence is in `cloud-fixed-smoke.json`, `cloud-fixed-http.json`, `cloud-fixed-browser.json` and `cloud-fixed-qa-cleanup.json`.
- Evidence SHA-256: smoke `c12b1ae6fe98eec814841c1089598a4740234c1a0b86cb6690c3e3172f0195ce`; HTTP `6163b2ce26241965915d80ceacdaa079dcb905eb79dd5b76c5c0ed490449bf85`; browser `af1dc8d2037bf395390fe6b539bceca6ab270ab6a1aa0fd9d730d4da33dcc9de`; QA cleanup `628b36e5c40a97db98c011dafdf3d883b67eed40c9a64270bf1b89453806ee64`.
- Protected cloud fixed smoke: `node scripts/measure-load-cloud.mjs 1 .../cloud-fixed-smoke.json` -> exit 0; every route 200, `no-store`, no answer leak/account mismatch; weekly returned `Server-Timing` instead of timing out. The report was inspected route-by-route.
- Protected cloud HTTP: `node scripts/measure-load-cloud.mjs 31 .../cloud-fixed-http.json` -> exit 0; 1 first-open + 30 warm per route, 0 errors. HTTP warm p95 (ms): friends **2632.7**, board **2566.1**, today **4913.2**, week **4455.1**. First-open total (ms): **2488.3 / 2363.1 / 4809.3 / 4397.2**. These are production HTTP body-complete timings; they include network and auth, not click-to-paint.
- Fixed cloud `Server-Timing` warm sample auth/data/total (ms): friends **1898.8 / 264.8 / 2168.6**, board **1875.9 / 262.2 / 2143.7**, today **1880.2 / 2617.8 / 4503.6**, week **1902.4 / 2242.7 / 4150.3**. This is server timing, not SQL timing; no production SQL count was captured.
- Protected Chrome production: `scripts/measure-load-browser.mjs` -> exit 0; isolated Chrome, 1 first-open + 30 warm per flow, 0 page errors. Click-to-fresh warm p95 (ms): friends **2511.8**, board **2510.7**, today **4912.5**, week **4579.2**. First-open (ms): **2583.8 / 2193.7 / 5094.3 / 4594.0**. Cold Edge was not established; these first-open samples are not cold p95.
- Frontend remained the already-deployed build: Firebase 4a14 `5a4345d7c6742f03`, a14-82a69 `4acefa21863e4043`, index asset `index-DiBNMkhK.js`; no frontend redeploy was needed for this backend-only fix.
- QA cleanup: `cloud-fixed-qa-cleanup.json` -> disable 200/active false, old student token 401, admin logout 200. Account/audit history retained; no learner account touched. Local PostgreSQL stopped cleanly after verification; cluster retained.
- Goal status: **NOT PERFORMANCE_ACCEPTED**. Friends/board HTTP and browser warm p95 are below 3 seconds; Today and Week exceed it. Auth alone is approximately 1.9 seconds server-side, Today data approximately 2.6 seconds, Week data approximately 2.2 seconds. Do not claim the global `<3s` target.
- Remaining gap: optimize/measure auth and Challenge today/week data separately with a new bounded packet; region/pool/index changes require evidence/change review and remain outside this packet. No additional cloud mutation is authorized by this checkpoint.
- Next step: start the next bounded packet from this checkpoint, first separating auth overhead from Today/Week data with fresh non-sensitive stage/SQL timing evidence, then add RED tests and a minimal fix only for the confirmed bottleneck. Keep v21 active until a new protected smoke and 30-warm HTTP/browser gate passes; stop before any further external action if the `<3s` target is still unmet.

## Release recovery checkpoint — 2026-09-19 00:30 UTC

- Actual source commit: `6f5927f95450f244b35d9132ef7cb149a779ddd0`, branch `codex/bang-tien-bo`, pushed. Only pre-existing `deno.lock` dirty before release reports.
- Baseline `cloud-before.json`: 5 requests/route (1 first + 4 warm), all 200. Warm nearest-rank p95 at this small N is the maximum: friends 3498.6 ms, board 3503.5 ms, today 5618.7 ms, week 16985.6 ms. First-open is NOT proven cold.
- `supabase functions deploy api --project-ref tvlpabqkternfvsxqovi --use-api` -> exit 0, version 17 ACTIVE, bundle `1fe2fb33b20fb3c4dfdab122713e7a3a5d58f22d751a7907db50cef2ddf7a41f`.
- `node scripts/measure-load-cloud.mjs 1 .../cloud-smoke.json` -> process exit 0 BUT report has one weekly TimeoutError at 20 s. The script exit code is not a successful smoke gate; inspect `errors` and every status.
- `node scripts/measure-load-cloud.mjs 3 .../cloud-diagnostic.json` -> process exit 0 BUT all 3 weekly requests timed out at 20 s. Friends/board/today returned 200 with no-store; diagnostic 2-warm maxima 2405.4/2407.9/4801.4 ms, insufficient for release p95.
- Separate weekly 60 s diagnostic -> exit 1, TimeoutError at 60009.5 ms. No response body or timing received. Do not treat timeout thresholds as completed request latency.
- Deno local real PostgreSQL invocation of the same weekly service -> exit 0, `ok:true`, 82.8 ms. This rules out a universal Node-only success but does NOT reproduce production connection/pool/data behavior.
- Allowed OPTIONS 204, origin exact, max-age 600, exposed Server-Timing; denied origin 403; anonymous auth/me 401, no-store. Correction: prior preflight wording incorrectly implied max-age was verified on v16; it was verified on v17 only.
- `firebase deploy --only hosting --project a14-82a69` -> exit 0. Sites 4a14 version `5a4345d7c6742f03`, a14-82a69 version `4acefa21863e4043`. **Process deviation:** Hosting was started before the final weekly smoke result arrived. This did not satisfy the planned all-green backend gate; no performance acceptance follows from deployment.
- Rolled backend back using verified accepted source archive `00ac8fb` under `/tmp/hoc-vui-edge-rollback.bgwbyX`, not an old implementation worktree. `supabase functions deploy api --project-ref tvlpabqkternfvsxqovi --use-api --workdir /tmp/hoc-vui-edge-rollback.bgwbyX` -> exit 0. Archive is source rollback, not byte-identical v16.
- `cloud-rollback-smoke.json`: all 4 requests 200/no-store; friends 5308.3 ms, board 3324.7 ms, today 5440.4 ms, week 16773.2 ms. Weekly recovered to baseline behavior. No 30-warm production benchmark was run after the failed release gate.

Next mandatory step: isolate the L5B regression with non-sensitive stage/SQL-duration telemetry and a production-like local transaction-pooler fixture; determine whether the new range/aggregate/batch statement or driver concurrency stalls. No root cause is proven yet. Add a reproducing RED test, fix only the confirmed cause, rerun local + cloud smoke, then 30-warm click-to-fresh-data samples. Keep cloud migrations/secrets/region/pool unchanged. Re-evaluate auth connection cost (~1.9 s observed v17) and today SQL cost only after weekly correctness is restored. Do not reuse expired/revoked QA tokens or recreate accounts blindly.

Final release checkpoint:

- Edge v18 ACTIVE, bundle SHA `e57d786f1d09ba2bf5b1b6912bd47a097812ea998597d0d370abfbbf8f583f1d` matches predeploy v16 hash (subsequently verified by CLI).
- Isolated production Chrome smoke -> exit 0, no page errors, 4 routes 200; one click-to-fresh sample each recorded in `cloud-rollback-browser.json`. Not p95.
- Own synthetic QA account `qamu7n18no` disabled via scoped PATCH -> 200, prior token -> 401, own admin session logout -> 200 (`cloud-qa-cleanup.json`). Account/audit history retained and can be re-enabled; no learner account disabled.
- Dedicated localhost PostgreSQL stopped cleanly via exact `pg_ctl -D /tmp/hoc-vui-load-db.wdmwtV/data stop -m fast` -> exit 0. Cluster retained for resume; local Node/Vite processes had already ended during interruption. PostgreSQL installation remains.
- Changed release-evidence files: `progress.md`, `verification.md`, `handoff.md`, `latency-results.json`, `cloud-before.json`, `cloud-smoke.json`, `cloud-diagnostic.json`, `cloud-rollback-smoke.json`, `cloud-rollback-browser.json`, `cloud-qa-cleanup.json` in this directory. Full implementation paths are in Git diff `00ac8fb..6f5927f`; historical handoff list additionally gains the three release scripts and two local measurement artifacts.
- Source SHA-256: authoring repository `bee8d1fd16bd82791d316fe6b1bb7f1d22f0725abdafc53d0277851c2ba14c94`; play repository `b36304a47625aa94a847d64db2a8e85ac54c70e31266436b54c6eeec277887e0`; DB regression test `baacf17ffd5487019a865b0d31811b8e6ed2dea3a7904abf25cb7e768a2b271f`.
- Evidence SHA-256: cloud-before `c563f33581c929eb56c2d28b0a758ce0c05a45d38a6ea819dbd6c5c13726d076`; cloud-diagnostic `e731734a2e29ee0a8f921d3811ecc171c4fe2ddae3207a5a01d1d6e8cfe12ca3`; rollback-browser `b64bf78bed32b7ebc793ac602de676280595b09b29acf6115089663b7663dc79`.
- Accepted six lifecycle hashes rechecked MATCH; planned `src/App.test.ts` assertion change only. `deno.lock` SHA unchanged. `git diff --check` -> exit 0.

## Historical package checkpoints (superseded by current status above)

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

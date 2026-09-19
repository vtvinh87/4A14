# Load performance — handoff

Status: `READY_FOR_REVIEW_WITH_GAPS` — fixed backend is active and verified; performance target is not globally achieved.

## Current handoff — fixed release, 2026-09-19T01:05Z

- Actual checkout `/Volumes/Pictures/Projects/Hoc_Vui`, branch `codex/bang-tien-bo`; source commit `2f2ac390ab29ad02d9b0b01cd5fdf8b5ed5f9b49` pushed. No new task/subagent/worktree. `deno.lock` remains pre-existing and unstaged; accepted roster lifecycle remains preserved.
- L0–L6 code and local DB gates: 136 files / 607 tests / zero skipped; typechecks, build, Edge check, Firebase validation and diff check exit 0. L7 release evidence is complete, but global performance acceptance remains open.
- Backend fixed release: Edge `api` v21 ACTIVE, bundle SHA `8f1f542ce0cdbb7822bdf2c0f0db25d5d8abb00647482cfbbacb5d469345735f`. Fixed weekly smoke 200 and no timeout; the TDD RED/GREEN serialization fix is in `server/challenge/weeklyService.ts` and its test.
- Production HTTP warm p95 (friends/board/today/week): 2.633 / 2.566 / 4.913 / 4.455 seconds, 30 warm samples each, 0 errors. Production Chrome click-to-fresh warm p95: 2.512 / 2.511 / 4.913 / 4.579 seconds, 30 warm samples each, 0 page errors. First-open is separate; cold Edge is not measured.
- Hosting frontend remains 4a14 `5a4345d7c6742f03` and a14-82a69 `4acefa21863e4043`; no frontend redeploy needed. QA account was disabled and token revocation verified.
- Evidence links: [verification.md](verification.md), [latency-results.json](latency-results.json), [progress.md](progress.md), [baseline.md](baseline.md). Artifacts: `cloud-fixed-smoke.json`, `cloud-fixed-http.json`, `cloud-fixed-browser.json`, `cloud-fixed-qa-cleanup.json`.
- Next required packet: reduce/measure auth (~1.9 s) and Today/Week data (~2.6/~2.2 s) without stale private cache or authorization weakening; provide SQL/HTTP/click evidence before any further deployment. Do not alter cloud region/pool/secrets or apply migrations under this packet.

## Previous handoff — failed optimized release, superseded

- Actual checkout `/Volumes/Pictures/Projects/Hoc_Vui`, branch `codex/bang-tien-bo`; code commit `6f5927f` pushed. No new worktree/task/subagent. `deno.lock` and accepted lifecycle source preserved.
- L0–L6 code/local database gates achieved (605 tests, zero skips; typechecks/build/Edge/Firebase validation exit 0). L7 performance/release acceptance remains blocked.
- Firebase frontend deployed to both sites (4a14 `5a4345d7c6742f03`, a14-82a69 `4acefa21863e4043`). Optimized Edge v17 regressed weekly reads to repeated 20 s and one 60 s timeout. Backend rollback v18 is ACTIVE; bundle hash matches predeploy v16. Do not redeploy `6f5927f` backend unchanged.
- Current production browser smoke works, but one sample per flow is 3.70/3.61/5.74/17.11 seconds (friends/board/today/week). This is not p95 and fails the target even for these samples. No cold measurements.
- Full evidence, sample sizes, local SQL counts and missing checks: [verification.md](verification.md), [latency-results.json](latency-results.json), [progress.md](progress.md). Original baseline remains [baseline.md](baseline.md).
- Next required work: instrument only non-sensitive weekly stage/SQL durations, reproduce against a local transaction pooler, identify the cloud-only regression, add RED test and minimal fix. Re-run all protected cloud smoke before further Hosting deployment, then 30 warm browser samples and separate first-open/cold measurements. No cloud migrations/secrets/region/pool changes are approved.
- If frontend rollback is needed, retained predeploy Firebase versions are 4a14 `d2fe8f7477a005ba` and a14-82a69 `a481d578c95bf39a`. Backend rollback already executed. Do not roll back data or revoke unrelated sessions.

The remaining sections are the **historical pre-shipment handoff**, preserved for audit; their pending/unshipped statements are superseded above.

## Delivered

The direct checkout at `/Volumes/Pictures/Projects/Hoc_Vui` contains the L0–L6 implementation and tests. HEAD remains `00ac8fb0e5681fbc9c4a177b4425484c4ce95bfc`; no commit was created.

Key implementation areas:

- L0: localhost-only benchmark runner, safe timing parser/redaction, synthetic read-budget fixture and baseline report.
- L1: direct progress-board fetch in the hook; rollout/expiry/forbidden responses do not fall back to private stale cache.
- L2: one session/account public projection for read authorization; credential-bearing mutation paths remain unchanged.
- L3: one server-side classroom roster read with presence/unread projection; accepted roster lifecycle source files preserved.
- L4: one generation-scoped progress snapshot/events source statement without changing analytics formulas.
- L5A: batch question and active-author reads for today; original item order, author identity, moderation and answer secrecy preserved.
- L5B: week item/contribution range projections, batch topic question reads, active student ID/count projections and authoritative preference re-read.
- L6: request-local `Server-Timing`, allowlisted CORS exposure, preflight max-age 600 and private no-store preservation.

## Changed files

Implementation and tests changed or added by this packet:

```text
.env.example
scripts/measure-load-performance.d.mts
scripts/measure-load-performance.mjs
docs/executor/load-performance/baseline.md
docs/executor/load-performance/progress.md
docs/executor/load-performance/verification.md
docs/executor/load-performance/latency-results.json
docs/executor/load-performance/handoff.md
server/app.ts
server/app.test.ts
server/auth/memoryRepository.ts
server/auth/postgresRepository.ts
server/auth/service.ts
server/auth/sessionProjection.test.ts
server/auth/types.ts
server/challenge/authoringRepository.test.ts
server/challenge/authoringTypes.ts
server/challenge/memoryAuthoringRepository.ts
server/challenge/memoryPlayRepository.ts
server/challenge/playRepository.test.ts
server/challenge/playService.test.ts
server/challenge/playService.ts
server/challenge/playTypes.ts
server/challenge/postgresAuthoringRepository.ts
server/challenge/postgresPlayRepository.ts
server/challenge/readPerformance.integration.test.ts
server/challenge/weeklyService.test.ts
server/challenge/weeklyService.ts
server/classroom/memoryRepository.ts
server/classroom/postgresRepository.ts
server/classroom/repository.test.ts
server/classroom/roster.integration.test.ts
server/classroom/service.test.ts
server/classroom/service.ts
server/classroom/types.ts
server/learning/postgresRepository.ts
server/learning/progressBoardSource.test.ts
server/performance/read-budget.test.ts
server/performance/timing.test.ts
server/performance/timing.ts
src/App.test.ts
src/auth/apiClient.ts
src/progress/useProgressBoard.test.tsx
src/progress/useProgressBoard.ts
supabase/functions/api/index.test.ts
supabase/functions/api/index.ts
```

`deno.lock` was already dirty before L0 and retains its original SHA-256 `776554a46c7706ff0e6e7175b79d205ecdb0b11daadf6730bad2e7575e4869e3`; it is not delivered as an implementation change. `accepted-source-baseline.json` is unchanged. Six accepted lifecycle files are byte-identical; `src/App.test.ts` has the planned L1 assertion update from two rollout-config calls to one and is the only manifest mismatch.

## Query budget evidence

| Flow | Before/reference | After local evidence | Live status |
|---|---|---|---|
| Auth read projection | Audit/code reference: session + account + credentials path | One session/account `LEFT JOIN` projection mock; no credentials | `DB_VALIDATION_PENDING` |
| Friends roster | Audit/code reference: three reads after auth | One roster SQL boundary mock; auth + roster structurally 2 statements | `DB_VALIDATION_PENDING` |
| Progress board source | Audit/code reference: transaction with two reads | One actor/generation source statement mock | `DB_VALIDATION_PENDING` |
| Challenge today | Audit reference: about 23 warm SQL statements including auth, from code not a trace | Question and author reads are fixed at one each; full warm/cold path remains behavior-dependent | `DB_VALIDATION_PENDING` |
| Challenge week | Per-day item/contribution reads plus per-item question reads | One item range + one contribution aggregate + one batch question read; local contract asserts weekly `<=10` when DB target exists | `DB_VALIDATION_PENDING` |

The before values above are reference/code counts from the audit, not live SQL measurements. Unit/mock counts, SQL counts, HTTP latency and click-to-fresh-data are intentionally kept separate.

## Known gaps / review decisions

- No verified local database target was supplied, so SQL syntax against the real schema, RLS/grants, transaction behavior, and live query counts remain pending. Integration tests skip rather than claim pass.
- No protected HTTP benchmark was run. `latency-results.json` contains zero collected samples, not simulated values. Warm p95 target `<3s`, first-open and cold behavior remain unverified.
- No browser walkthrough or staging/production measurement was performed. `PRODUCTION_NOT_DEPLOYED` is intentional.
- No schema migration, dependency addition, pool/region change, cache of authorization, or external write is included.
- Self-review only; independent review is still a review gate.

## Proposed deployment and rollback — after approval only

1. Verify the exact diff and provide an explicit approved local/staging PostgreSQL target plus synthetic account/dataset. Run all DB integration tests and record host/database label without secrets.
2. Deploy the backward-compatible backend/Edge change, then run synthetic auth, roster, progress-board, challenge today/week and CORS smoke checks. Confirm `Server-Timing`, `no-store`, 401/403/503 behavior, revoke/expiry and account isolation.
3. Deploy the frontend only after backend smoke is clean. Measure click-to-fresh-data with at least 30 samples per flow, separating first-open, warm and cold, and publish median/p95/error-rate.
4. Accept performance only if the approved environment has real measurements meeting the warm p95 target and cold/first-open results are explicitly reported.

Rollback: use the verified hosting/Edge release artifact or version from the deployment system; revert code release without `git reset --hard`, branch deletion or data rollback. Stop and roll back immediately for auth leakage, wrong account data, rollout bypass, answer leakage, moderation/quota/idempotency regression or elevated 401/403/503. Do not revoke all sessions or mutate learning data as a performance rollback.

No deployment or rollback action has been executed in this task.

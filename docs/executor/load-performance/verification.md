# Load performance — verification report

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

# Load performance — L0 baseline

Captured: `2026-09-19T00:07:17+07:00`

## Checkout and scope

- Actual checkout: `/Volumes/Pictures/Projects/Hoc_Vui`
- `HEAD`: `00ac8fb0e5681fbc9c4a177b4425484c4ce95bfc`
- Plan reference HEAD: `98690ab3b5b527862821658cd8afcfa8287ebcbe` (different history; not reset)
- Pre-existing dirty file preserved: `deno.lock` (`776554a46c7706ff0e6e7175b79d205ecdb0b11daadf6730bad2e7575e4869e3`)
- Accepted roster baseline: all 7 hashes in `accepted-source-baseline.json` matched before L0 edits.
- Old worktree `/Users/macbook/.codex/worktrees/4fc1/Hoc_Vui` was not read or integrated.

## Baseline verification

| Command | Exit | Result |
|---|---:|---|
| `env -u HOC_VUI_TEST_DATABASE_URL -u DATABASE_URL -u DB_URL -u HOC_VUI_DATABASE_URL -u SUPABASE_DB_URL npm test` | 0 | 126 files passed, 4 skipped; 556 passed, 4 skipped |
| `npm run typecheck` | 0 | client TypeScript check |
| `npm run typecheck:server` | 0 | server TypeScript check |
| `npm run build` | 0 | Vite production build; existing chunk-size warning only |
| `git diff --check` | 0 | clean before L0 edits |

The four skipped tests are the existing database integration tests. All database environment variables were explicitly removed for the baseline run. No database target was inferred from `DATABASE_URL`, no cloud target was contacted, and no migration or mutation was run. Status: `DB_VALIDATION_PENDING`.

## Deterministic local test fixture

The L0 boundary fixture contains 30 active synthetic student peers, five featured questions from five distinct synthetic authors, one open round, and seven weekly days with five item identifiers per day. It contains no child data, answer keys, credentials, or cloud identifiers. The test boundary keeps repository-call count, SQL statement count, and statements executed inside transactions as separate metrics.

## Measurement runner

Added `scripts/measure-load-performance.mjs` with nearest-rank percentile, Server-Timing parsing, token/body redaction, localhost-only URL validation, sequential GET sampling, and JSON output. The token is read only from `HOC_VUI_BENCH_TOKEN`; it is never printed or written to output.

Unit contract: `npx vitest run server/performance/read-budget.test.ts` -> exit 0; 6 tests passed.

Benchmark status: `NOT_RUN`. No approved synthetic authenticated local session/server was available at L0. The safety check `node scripts/measure-load-performance.mjs --base-url https://example.invalid --route /api/me/friends --samples 1 --output /tmp/hoc-vui-benchmark-should-not-exist.json` correctly exited 1 with `Benchmark base URL must target localhost`.

HTTP measurements in this document are therefore none; the historical anonymous 401 samples in the audit remain historical and are not treated as protected-data latency or p95 evidence.

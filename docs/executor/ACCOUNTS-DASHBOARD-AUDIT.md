# Accounts & Dashboard local audit

Date: 2026-09-14
Scope: localhost only, synthetic accounts/data only. P9, cloud deployment, GitHub push and production acceptance are excluded.

## Verification summary

| Gate | Result | Evidence |
|---|---|---|
| Client/server typecheck | PASS | `npm run typecheck`; `npm run typecheck:server` |
| Unit + memory integration | PASS | `npm test -- --reporter=dot`: 50 files, 188 tests |
| PostgreSQL local integration | PASS | Same suite with the dedicated local PostgreSQL test environment: 50 files, 188 tests |
| Production build | PASS | `npm run build`; existing Three.js chunk-size warning only |
| Browser localhost smoke | PASS | Netlify Dev at `http://localhost:8888`: first-use gate, Admin screen and parent Dashboard loaded |
| Responsive Dashboard | PASS | 390×844, 820×1180, 1180×820, 1440×900; `scrollWidth === clientWidth` at each size |
| Bundle secret boundary | PASS | `dist` scan found no credential/default-password text, database URL or server hash algorithm |
| Offline boundary | PASS | `dist/offline-manifest.json` and `dist/sw.js` contain no `/api/` URL |
| Private schema/RLS | PASS | 8 `hoc_vui_private` tables have RLS enabled; `anon` and `authenticated` have no schema usage/table select privilege |
| Recovery snapshot | PASS | `gzip -t` and SHA-256 match the P0 ledger value |

The browser smoke showed 29 lesson rows, `0/145` mission progress for the empty synthetic snapshot, a server-owned rule version on the suggestion, the activity chart's equivalent table, range switching and no horizontal overflow. The first-use PIN screen was inspected without submitting a replacement PIN.

## Audit matrix

| ID | Result | Evidence |
|---|---|---|
| A01 | PASS | `tests/e2e/accounts-parent.spec.ts`; first-use screen smoke |
| A02 | PASS | change-only API rejects progress/Admin/parent access; refresh is cleared by `/api/auth/me` |
| A03 | PASS | API E2E asserts Admin is full mode without forced change; Admin UI smoke |
| A04 | PASS | username normalization/duplicate tests; uppercase login and leading-zero replacement PIN coverage |
| A05 | PASS | auth service reset/disable test; credential reset revokes sessions while the other credential remains independent |
| D01 | PASS | owner-scoped queue test, API logout test, and account-scoped progress cache |
| D02 | PASS | A/B queue isolation test; sync uses the active owner only |
| D03 | PASS | duplicate, out-of-order, device conflict and atomic-batch tests |
| D04 | PASS | independent run/device replay test retains prior events and avoids mixed state |
| D05 | PASS | legacy/account backup preview, owner mismatch and receipt tests; PostgreSQL import path |
| D06 | PASS | reset increments generation; old-generation event is rejected |
| P01 | PASS | first-use parent change-only API and parent-gated Dashboard tests |
| P02 | PASS | lock, logout, `/api/auth/me` refresh invalidation and page-memory grant tests |
| P03 | PASS | parent endpoints reject a student session or missing `X-Parent-Grant` |
| M01 | PASS | empty/limited/legacy/hidden-idle fixtures show no fabricated percentage or duration |
| M02 | PASS | 10-activity fixture gives 8/10 first-attempt accuracy; sourced suggestion includes evidence and rule version |
| G01 | PASS | existing 29-package, lesson access, reward and gameplay tests remain green |
| U01 | PASS | first-use/auth smoke plus Dashboard responsive matrix; PIN inputs use numeric input mode and modal buttons |
| O01 | PASS (local only) | export/import/reset and bootstrap idempotency tested on local PostgreSQL; no production deploy/restore was attempted |

## P7 surface delivered

- Parent Dashboard reads the server response: summary, range filter, last activity/sync timestamps, 29-lesson state map, activity chart with accessible table, activity drill-down, limited-data copy and sourced rule-based suggestions.
- Data tools keep backup/import/reset below the reading surface, preview legacy data, preserve the old raw key, and show offline/storage state. Parent PIN change asks for the current parent PIN and invalidates the grant/session after success.
- Student settings now has an explicit account logout action. Admin has total/active/locked account summary without exposing credentials.
- The six new parent components are under `src/components/parent/`; their new `._*` AppleDouble sidecars were moved to `/tmp/hoc-vui-appledouble-recovery/`. Pre-existing AppleDouble files elsewhere remain ignored by the existing `.gitignore` and were not broadly deleted.

## Timing and limitations

- The 30-student synthetic pilot completed 30 independent account-scoped start-event batches under the in-memory test harness in under 3 seconds; each owner retained exactly one event and the event owner set remained 30 distinct IDs.
- Netlify Dev logs measured Dashboard API requests in the tens-of-milliseconds range during the browser smoke. The PostgreSQL full-flow integration test completed in under 2 seconds in this run. These are local observations, not production SLO evidence.
- No cloud project, production database, real learner data, deployment, signing or production restore was touched. User acceptance of this local P8 packet remains the next gate; P9 requires separate approval.

## Addendum 2026-09-15 — separately authorized Supabase smoke

The original report above remains a localhost P8 audit. In a separate authorized action, the same source was connected to the supplied Supabase project using a dedicated `hoc_vui_runtime` role and the versioned migrations. The cloud database was empty before migration and contains only the synthetic Admin bootstrap after verification. Cloud integration passed 3/3 tests with a 60-second cloud timeout appropriate for the pooler/scrypt path; generated student test records were removed by exact UUID. This is not a production deployment or production-restore claim.

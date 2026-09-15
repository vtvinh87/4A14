# Accounts & Dashboard execution ledger

Status: `P9-CLOUD-PARTIAL`

Scope: P0–P8 implementation plus the separately authorized Supabase cloud connection in this task. GitHub push is pending because the supplied remote is not visible to the authenticated GitHub account; Netlify deploy, production restore and real learner data remain out of scope.

## Coordinator baseline

- Workspace: `/Volumes/Pictures/Projects/Hoc_Vui`
- Baseline captured: 2026-09-13
- Git repository: not initialized at baseline; no commit or push performed.
- Existing app: React 18 + Vite + TypeScript + Vitest, browser-local progress schema 1.
- Existing verification: fresh baseline `npm test -- --reporter=dot` → 37 files / 162 tests passed; `npm run typecheck` → exit 0; `npm run build` → exit 0 with the existing Three.js chunk-size warning.
- Host check: Docker CLI exists; the unrelated `colima-sagen-planning` profile remains untouched. Dedicated `colima-hoc-vui` is running on a separate Docker context; Supabase CLI 2.117.0 and Netlify CLI 27.5.2 resolve through `npx`. No cloud credentials requested or stored.
- Recovery snapshot: `docs/executor/recovery-2026-09-13/accounts-dashboard-prework.tgz`; `gzip -t` passed; SHA-256 `acd4125b789d8604465e996506526f3a65b9d1d5e4f2ae7d31f04994438e192d`.

## Packets

| Packet | Scope | Status | Evidence |
|---|---|---|---|
| P0.1 | local runtime/config guardrails | `DONE` | dedicated `colima-hoc-vui`; Supabase local services healthy; Netlify CLI available; no cloud fallback |
| P0.2 | source/data baseline | `DONE` | recovery archive, gzip verification and hash above; synthetic-only DB |
| P0.3 | account domain contracts and tests | `DONE` | `src/auth/account.test.ts`, server auth tests, `shared/account-contracts.ts` |
| P0.4 | fresh baseline | `DONE` | commands and results above |
| P1 | local auth/database layer | `DONE` | schema, transactions, lockout, credential reset/audit, same-origin API and real PostgreSQL tests pass; secret scan and rollback evidence remain in audit packet |
| P2 | login/Admin UI | `DONE` | API-backed login/Admin UI, first-use student gate, Admin overview and responsive checks pass; synthetic localhost smoke completed |
| P3 | account-scoped progress/events | `DONE` | server replay/validation, UUID event queue, PostgreSQL persistence, App sync, duplicate/atomic/device/isolation tests pass |
| P5 | parent PIN gate | `DONE` | page-memory grant token + server hash, forced parent first-change, API header protection, lock/refresh/logout tests pass in memory and PostgreSQL |
| P4 | legacy migration/backup | `DONE` | owner-bound/legacy preview, receipt idempotency, backup-before-import/reset, generation stale guard and offline boundary pass |
| P6 | metrics/recommendations | `DONE` | server metrics, Asia/Ho_Chi_Minh activity days, heartbeat estimate, per-topic thresholds, evidence/ruleVersion tests pass |
| P7 | parent/Admin dashboards | `DONE` | remote dashboard components, range filter, activity table/drill-down, lesson states, data tools, parent PIN change and Admin overview pass |
| P8 | cross-phase audit | `READY_FOR_REVIEW` | full 50-file/188-test local run, real PostgreSQL integration, browser responsive matrix, API/session E2E and synthetic 30-student pilot recorded in audit report |
| P9-cloud | Supabase schema/runtime connection | `DONE` | 3 migrations pushed with Supabase CLI; private schema/RLS and least-privilege runtime role verified; localhost:8888 API smoke and cloud PostgreSQL integration pass |
| P9-github | GitHub commit/push | `BLOCKED` | `git ls-remote` and `gh repo view` report repository not found for `vtvinh87/4A14`; no force-push or alternate repository used |

## Guardrails

- Use synthetic accounts and progress only; never import the child’s real data without an explicit, scoped action.
- Do not start or delete another project’s Docker/Colima profile. A dedicated local runtime must be proven before using it.
- Do not put Supabase service keys, database passwords, PINs or raw learner data in the frontend bundle, logs, Git history or chat.
- Stop a packet when its required runtime is unavailable; record the blocker and keep the source changes testable without silently switching to cloud.
- Every behavior change follows a failing test → minimal implementation → full verification cycle.

## Checkpoint 2026-09-13

- P1 schema `supabase/migrations/20260913225000_accounts_parent_dashboard.sql` is applied to the dedicated local database. The CLI's implicit local reset used an inconsistent Docker connection during the first attempt; the migration was applied directly to the dedicated container and migration history was repaired with an explicit `--db-url`. Direct table inspection confirms the eight application tables in `hoc_vui_private`.
- P1 real database evidence: `npm test -- --run server/db/database.integration.test.ts server/auth/postgresRepository.integration.test.ts server/app.integration.test.ts --reporter=dot` → 3 files / 3 tests passed. Auth service tests → 4 tests passed. The API integration checks no credential/hash exposure, idempotent Admin bootstrap, student/Admin boundary, audit row, and parent gate.
- P1 source now includes `server/app.ts`, `netlify/functions/api.ts`, `netlify.toml`, `server/db/client.ts`, `server/auth/postgresRepository.ts`, `shared/account-contracts.ts`; frontend login/Admin calls the API client, with local storage retained only as a temporary gameplay cache until P3 event sync.
- P5 evidence: memory `server/app.test.ts` (2 tests), `server/auth/service.test.ts` (4 tests), and PostgreSQL auth/API integration pass with `X-Parent-Grant`; dashboard without the header is rejected, and lock clears both grant expiry/hash. `netlify/functions/._api.ts` was moved to `/tmp/hoc-vui-appledouble-recovery/` after Netlify correctly rejected the AppleDouble binary as an invalid function.
- P2/P7 smoke evidence: Netlify Dev at `http://localhost:8888` loaded the API-backed Admin view, first-use student PIN screen, and the remote parent dashboard for synthetic accounts. Parent dashboard checks at 390×844, 820×1180, 1180×820 and 1440×900 all reported `scrollWidth === clientWidth`; 29 lesson rows and a table equivalent to the activity chart were present.
- P3/P4/P6 evidence: server replay, migration, metrics and activity-time fixtures pass; PostgreSQL repository/API tests cover duplicate events, stale generation, import receipt, reset and parent-gated export/import/reset. Offline manifest tests confirm no `/api/` URL is precached.
- P7 evidence: `src/components/parent/` now renders server-owned summary, activity chart/table, lesson map, sourced suggestions, activity drill-down and data tools. Parent PIN change requires the current PIN; the student settings dialog exposes account logout. Admin shows total/active/locked account summary.
- P8 evidence: `tests/e2e/accounts-parent.spec.ts` covers Admin/A/B/change-only/parent sessions, same-origin rejection, grant refresh invalidation, logout, cross-owner isolation, duplicate/reset stale event and a 30-student synthetic concurrent pilot. The final local run is 50 test files / 188 tests. `docs/executor/ACCOUNTS-DASHBOARD-AUDIT.md` records the matrix and limitations.

## Next action

Provide a reachable/authorized GitHub repository URL (or create/authorize `vtvinh87/4A14`) before the parent performs Git initialization, commit and push. Cloud Supabase is connected for the local 8888 runtime; no Netlify deploy, production restore or real learner data has been performed.

## Cloud addendum — 2026-09-15

- Supabase project identity was verified through the supplied pooler credentials; the target was an empty PostgreSQL 17.6 database before migration.
- `npx --yes supabase@2.117.0 db push --db-url <server-only-url> --include-all --skip-vault --yes` applied `20260913225000_accounts_parent_dashboard.sql`, `20260914120000_student_profiles.sql` and `20260915100000_runtime_role_and_ownership.sql`. A subsequent dry-run reported `Remote database is up to date`.
- The `hoc_vui_private` schema has eight application tables, RLS enabled on all eight, and no schema usage for `anon`/`authenticated`. `hoc_vui_runtime` is non-superuser, cannot create databases/roles or schemas, and has only the required table DML plus RLS policies.
- Local `localhost:8888` was reloaded to use the runtime role and returned HTTP 401 before auth, then HTTP 200 for synthetic Admin login and `/api/auth/me`.
- Cloud integration command `npm run test:db:cloud -- --reporter=dot` passed 3/3 files and 3/3 tests with a 60-second cloud timeout. The first default 5-second run and an initial 30-second run timed out on the pooler/scrypt path; request-level diagnosis completed the full flow in about 25 seconds without assertion failures. Synthetic students created by those tests were deleted by their exact UUIDs; only Admin bootstrap remains.
- The runtime password is stored in the macOS Keychain item `hoc-vui-supabase-runtime-password`; no database password or runtime secret is in the repository, frontend bundle, plist, Git history or logs.

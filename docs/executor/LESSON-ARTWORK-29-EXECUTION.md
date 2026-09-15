# LESSON-ARTWORK-29 execution ledger

Updated: 2026-09-12  
Coordinator: `01a09477-f3d4-7313-b90f-b841586daba9` (recovered from Main)  
Executor: Luna Max task `01a09311-fbcc-7400-af25-8fe90fa8fbd3` on host `local`  
Project: `/Volumes/Pictures/Projects/Hoc_Vui`  
Execution mode: sequential packets; no Git lifecycle

## Approved inputs

- Design spec: `docs/superpowers/specs/2026-09-12-lesson-artwork-29-design.md`
- Implementation plan: `docs/superpowers/plans/2026-09-12-lesson-artwork-29.md`
- Source PDF: `source/lich-su-va-dia-li-4.pdf`
- Reviewed content boundary: `source/mvp-content-reviewed.json`

## Packet ledger

| Packet | Owner | Write-set | Status | Evidence | Next action |
|---|---|---|---|---|---|
| R0 | Luna Max | none, read-only | complete | PDF TOC pages 5–6 visually verified; 29 ids/titles catalogued; PDF hash matches reviewed JSON source hash | coordinator integrated catalog into approved spec |
| D1 | Luna Max | `src/content/lessonArtwork.ts`, `src/content/lessonArtwork.test.ts` | accepted | 29 typed records present; focused Vitest 4/4 PASS; `npm run typecheck` PASS; no files outside the D1 write-set were changed by the packet | coordinator starts A1: reference ledger, prompt set, then artwork generation |
| A1 | Coordinator/ImageGen + Luna Max | `design/lesson-artwork/*`, `public/art/lessons/*` | complete | 29 PNGs individually viewed, decoded, CRC/hash/dimensions verified; source provenance updated | ready for user visual review |
| UI1 | Coordinator | `src/views/LessonsView.tsx`, `src/views/LessonsView.test.ts`, lesson-card CSS | complete | error fallback/navigation test; browser QA at 390/820/1180/1440 | none |
| OFF1 | Coordinator | `vite.config.ts`, `src/pwa/offline.test.ts` | complete | 29 URLs and exact file hashes; dist assets byte-identical; only 2 playable packages | none |
| QA1 | Coordinator | `docs/executor/LESSON-ARTWORK-29-READY_FOR_REVIEW.md` | complete | typecheck/build exit 0, 19 test files/76 tests passed, 29 HTTP PNG responses | user visual review |

## Coordination rules

- Luna may modify only the current packet write-set and must stop at `READY_FOR_REVIEW`.
- Coordinator does not edit Luna’s write-set while D1 is active.
- No second Luna task is created; the same executor task is reused for D1 and later data-only corrections if needed.
- A Luna completion message is not acceptance; coordinator inspects actual files, diff, tests and artifact paths.
- If a correction is needed, send one bounded correction to the same Luna task and reverify before proceeding.
- 27 unplayable lessons may have artwork records and images, but no lesson package/progress/navigation unlock is added in this workstream.

## Baseline notes

- Workspace is not a Git repository; no branch/commit/merge operations are available or authorized.
- Existing app server remains `localhost:5001` when available.
- Existing offline contract uses `LOCAL_ART_URLS` and `LOCAL_ART_VERSIONS` in `vite.config.ts`.
- Existing lesson card still uses CSS sun/mountain/water shapes; these remain the runtime fallback until UI1 is accepted.

## Recovery checkpoint — 2026-09-12

- Read Main's user requests and executor completion records. User approved both approach and spec and requested continuation after Main repeatedly failed with `Bad Request` and was interrupted. Root cause of that service error is unconfirmed; do not label it merely a stale UI card.
- A1c completed in executor: files 12–15 exist. Total recovered asset files: 10. Earlier A1c-dispatched ledger lagged actual artifacts.
- A1d dispatched to the SAME executor, only lesson-18/19/20/24 PNGs. No concurrent edits to its write-set.
- UI1 implemented in coordinator: local image layer, accessible alt, lazy/async loading, existing fallback, error navigation regression. Test file uses `.test.ts` because current Vitest include excludes `.test.tsx`.
- UI1 RED: missing image URLs, exit 1. GREEN: 2 files/5 tests, exit 0; typecheck exit 0. Browser shows both MVP images loaded. Final full verification remains pending.
- Baseline copies for coordinator changes: `docs/executor/recovery-2026-09-12/baseline/`.

- A1d accepted: 18/19/20/24 individually inspected by coordinator, 768×1024 each. A1e dispatched: only 25/27/29; executor idle/completed verified before dispatch.

Final: A1e accepted after direct view of 25/27/29; executor idle. Coordinator generated remaining 12 files in a disjoint write-set. Technical work complete; no deployment or Git actions.

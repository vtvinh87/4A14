# Progress Map execution ledger

- Checkout: `/Volumes/Pictures/Projects/Hoc_Vui`
- Branch: `codex/bang-tien-bo`
- Role: root Codex task; no executor descendants spawned
- Started: 2026-09-18 Asia/Ho_Chi_Minh
- Data boundary: local synthetic fixtures only; no cloud, deploy, credentials, or real learner data
- Baseline map SHA256: `93bb877ea95e3cf02d8070f1b978f4772b471e430de3b1fb64a3e6e95eb785ba`
- User-provided untracked inputs at start: `design/progress-map/layout-review.html`, `design/progress-map/references/`, `docs/design/progress-map-supporting-art-brief.md`, `docs/superpowers/plans/2026-09-18-progress-map-luna-implementation.md`

## Phase status

| Phase | Status | Evidence / next action |
|---|---|---|
| P0 baseline and checkpoint | DONE_WITH_LIMITATION | Plan, brief, demo, concepts, fox reference and map opened; authenticated whole-App baseline was not available without touching account/cloud state; component fixture baseline will be recorded with QA evidence |
| P1 supporting art | DONE | 19/19 IDs generated with built-in ImageGen, opened and accepted; manifest/log/contact sheet recorded; runtime pack 2,036,768 bytes, all RGBA alpha |
| P2 selection and behavior | DONE | Controlled selection/panel integration; 53 related tests pass; local browser smoke selected all 5 map topics, compass topic, 8 landmarks, expanded lesson strip and lesson detail |
| P3 responsive UI and art integration | DONE_WITH_LIMITATION | Scoped cream shell, 1840/1940 map canvas, 44px landmarks, responsive panel/modal and all 19 runtime assets integrated; Tây Nguyên and Mekong marker separation plus six-viewport geometry were checked in the real fixture |
| P4 offline/performance | DONE_WITH_LIMITATION | 19-asset build/hash verification passes; browser offline-cache inspection remains unavailable |
| P5 visual review and handoff | IN_PROGRESS_WITH_EVIDENCE_LIMITATION | Modal screenshots were inspected inline at all six required CSS viewports and no overflow was observed, but screenshot files cannot be persisted by CUA, so 95 scoring/READY_FOR_REVIEW remain NOT VERIFIED |

## Commands and checkpoints

| Timestamp | Command / action | Exit | Result |
|---|---|---:|---|
| 2026-09-18 | `git status --short --branch` | 0 | Branch clean except user-provided untracked inputs |
| 2026-09-18 | `git log -3 --oneline` | 0 | `06e7dc1`, `eaf3c5b`, `039558d` |
| 2026-09-18 | `shasum -a 256 public/art/progress/vietnam-progress-map-illustrated.png` | 0 | Baseline hash matches plan |
| 2026-09-18 | Open demo through local HTTP and view two concepts | 0 | Visual inputs inspected before edits |
| 2026-09-18 | ImageGen + `view_image` review + `sharp` metadata | 0 | 14 accepted assets; three dedicated landmark assets added for Hoa Lư, Kim Liên and Hội An; no rejected or placeholder asset; runtime budget under 2MiB |
| 2026-09-18 | `npm run typecheck` | 0 | TypeScript passes after controlled selection/panel refactor and dev-only fixture |
| 2026-09-18 | `npx vitest run src/components/progress src/pwa/offline.test.ts --reporter=dot` | 0 | 15 files / 55 tests pass after dedicated-art and collision regressions |
| 2026-09-18 | `npm run typecheck:server` | 0 | Server TypeScript passes |
| 2026-09-18 | `npm test -- --run --reporter=dot` | 0 | 124 files; 535 passed, 4 existing DB integration tests skipped |
| 2026-09-18 | `npm run build` | 0 | Production Vite build passes; offline manifest emits 14 support WebP URLs |
| 2026-09-18 | `npm run validate:progress-map` | 0 | Valid reference SVG and illustrated PNG |
| 2026-09-18 | dist inspection + `git diff --check` | 0 | All 14 runtime support hashes match manifest/config; no whitespace errors |
| 2026-09-18 | final artifact hygiene check | 0 | No AppleDouble files under support-art/runtime support folders; map hash and manifest remain aligned (14 accepted, 1,502,972 bytes) |
| 2026-09-18 | Local browser fixture smoke | 0 | Actual Vite app rendered welcome, all 5 map topics, compass `Địa phương em`, all 8 landmarks, shared panel, expanded strip and lesson detail; no auth/cloud state touched |
| 2026-09-18 | Local browser screenshot inspection | 0 | Actual app screenshot inspected at browser CSS viewport 1280x720; P5 matrix files for 390x844, 430x932, 768x1024, 1440x900, 1180x700 and 844x390 are not yet evidenced |
| 2026-09-18 | TDD regression for reported findings | 0 | Presentation tests first failed for shared landmark assets and 3% Tây Nguyên separation, then passed after dedicated mappings and marker repositioning |
| 2026-09-18 | Local browser correction smoke | 0 | Hoa Lư → `landmark-hoa-lu.webp`, Kim Liên → `landmark-kim-lien.webp`, Hội An → `landmark-hoi-an.webp`; both Tây Nguyên controls remain independently clickable |
| 2026-09-18 | Required viewport geometry sweep | 0 | Real CUA fixture checks at 390x844, 430x932, 768x1024, 1440x900, 1180x700 and 844x390: no Tây Nguyên landmark/topic hit-area intersection and no document horizontal overflow |
| 2026-09-18 | Inline landmark-modal smoke | 0 | All 8 dedicated modal URLs, titles, facts and Escape/focus-return paths passed; Chợ nổi marker was additionally moved clear of Nam Bộ after natural mobile click exposed the overlap |
| 2026-09-18 | Fresh post-adjustment verification | 0 | `npm test`: 126 files, 551 passed, 4 skipped; client/server typecheck, build, offline hash test, map validation and diff-check pass |
| 2026-09-18 | TDD + real-app corner clipping correction | 0 | RED/GREEN style contract added; `.progress-map-canvas` and `.progress-map-base` now inherit the scene radius and clip the illustrated map; CUA computed styles match at 390x843 and the inspected app screenshot shows rounded map corners |
| 2026-09-18 | Required modal screenshot matrix | 0 | Inline CUA captures inspected at all six exact CSS viewports; no horizontal overflow; 844x390 copy scroll verified; PNG persistence remains unavailable |

## Recovery rule

On interruption, read this ledger, `git status`, `git diff`, and real asset hashes first. Resume the first incomplete phase; do not regenerate accepted assets or create duplicate tasks.

## Next action

Keep the implementation checkpoint intact; run fresh full verification after the correction and obtain the six required app viewport/state screenshot sets as saved files before any 95/100 or READY_FOR_REVIEW claim. Current exact blocker is recorded in `design/progress-map/qa/visual-review.md`.

## Feature extension checkpoint — landmark detail modal

- Requested scope: all 8 small landmarks; modal phụ mở từ ảnh minh họa, ảnh lớn hơn, nội dung lịch sử thân thiện và có nguồn.
- Design status: `APPROVED_BY_USER` on 2026-09-18.
- Design spec: `docs/superpowers/specs/2026-09-18-progress-map-landmark-detail-modal-design.md`.
- Execution mode: inline execution in the root task; no executor descendants spawned.
- Implementation status: `IMPLEMENTED_LOCALLY`; corner clipping correction is locally verified; commit, push and Firebase Hosting deploy are authorized in the current follow-up and remain pending fresh release gates.
- Task 1 — supporting art: `DONE`; five new ImageGen masters/runtime WebP files accepted and visually inspected; 19 accepted support assets, RGBA verified, runtime total `2,036,768` bytes (<2 MiB), manifest/contact sheet/generation log updated.
- Task 2 — typed detail/mapping: `DONE`; eight source-backed entries, all dedicated `landmark-*` mappings, Kim Liên wording explicitly separates Hoàng Trù and Làng Sen `1901–1906`.
- Task 3–5 — modal/trigger/board lifecycle: `DONE`; modal role/ARIA, parent-owned Escape ordering, modal-only Tab cycle, backdrop isolation and focus return covered by tests and fixture smoke.
- Task 6 — responsive styling: `DONE`; trigger/modal CSS covers portrait, tablet, desktop and short landscape; the 844×390 capture found and fixed copy clipping by making the copy pane independently scrollable; the follow-up corner correction now makes the map clipping radius inherit the responsive scene radius.
- Task 7 — offline/build: `DONE`; five measured URL/hash entries added to Vite/offline allowlist; full support pack and map hash verified.
- Task 8 — real-app QA: `IN_PROGRESS_WITH_EVIDENCE_LIMITATION`; all 8 modal mappings and Escape/focus behavior passed in the local fixture; inline screenshots were inspected at exact CSS viewports `390×844`, `430×932`, `768×1024`, `1440×900`, `1180×700`, `844×390`; no 95/100 score or `READY_FOR_REVIEW` claim is made because the CUA surface cannot persist PNG evidence.
- Automated evidence: focused modal/presentation/offline/style tests pass; fresh full suite is `551 passed, 4 skipped`; client/server typecheck, production build, `validate:progress-map` and `git diff --check` pass.
- Source verification: official Kim Liên, Văn Miếu, Cục Di sản văn hóa and UNESCO pages were checked against the copy; no runtime network fetch was added.
- Recovery: if interrupted, verify this section, `git status`, `git diff`, manifest hashes and map hash first; resume Task 8 evidence only; do not regenerate accepted assets.

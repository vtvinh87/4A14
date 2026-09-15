# LESSON-ARTWORK-29 — READY_FOR_REVIEW

Date: 2026-09-12
Coordinator: 01a09477-f3d4-7313-b90f-b841586daba9
Executor: 01a09311-fbcc-7400-af25-8fe90fa8fbd3 (same Luna Max task, now idle)
Delivery checkout: /Volumes/Pictures/Projects/Hoc_Vui

## Delivered

- Preserved and reviewed 10 recovered PNGs; created 19 more to complete 29 original 768×1024 RGB illustrations.
- `src/views/LessonsView.tsx`: image layer with descriptive alt, lazy/async loading and fixed intrinsic size; state-based error fallback preserves existing CSS scenery and opening a lesson.
- `src/styles.css`: only image layer/stacking context/badge layering changed.
- `src/views/LessonsView.test.ts`: two-card boundary, image attributes and navigation after image failure. Uses `.test.ts` to match existing Vitest configuration.
- `vite.config.ts`: 29 local artwork URLs and exact SHA-256 values.
- `src/pwa/offline.test.ts`: 29-entry precache/version coverage, plus existing offline tests.
- `design/lesson-artwork/`: source review, prompts, full hash inventory and `gallery.html` for browsing all images outside the app navigation.

Only lesson-01 and lesson-07 are playable. No lesson packages, progress/reward/session/backup schema, HUD, pet, passport or navigation contract changed. No Git lifecycle or deployment action performed. Baseline copies are under `docs/executor/recovery-2026-09-12/baseline/`.

## Fresh verification

| Check | Result |
|---|---|
| UI regression RED | exit 1, missing image URLs before implementation |
| UI focused GREEN | 2 files, 5 tests, exit 0 |
| Offline regression RED | exit 1, missing artwork allowlist before registration |
| Final `npm run typecheck` | exit 0 |
| Final `npm test` | exit 0, 19 files / 76 tests |
| Final `npm run build` | exit 0; existing Three.js chunk >500 kB warning |
| PNG integrity | 29/29 signature, 768×1024, RGB8, chunk CRC and decompression verified |
| Asset hashes | 29/29 match registered SHA-256 and byte-identical files in dist |
| Built offline contract | 29 unique artwork URLs in offline-manifest.json and sw.js |
| Playable package boundary | only lesson-01.json and lesson-07.json emitted |
| HTTP smoke at localhost:5001 | 29/29 HTTP 200 with PNG signatures |
| Browser QA | 390×844, 820×1180, 1180×820, 1440×1000; both artwork images loaded, card actions retained, no horizontal overflow |
| Browser console | no error entries during inspected session |

Fallback was exercised through the mounted React test by dispatching an image error and clicking the existing open action. Browser QA checked normal image loading. Offline verification inspected generated precache contracts and bytes; an actual airplane-mode service-worker lifecycle was not separately exercised. Temporary viewport override was reset.

## Provenance and limits

- The supplied textbook is image-based: pdftotext output is mostly watermark text. Relevant source pages were rendered and directly inspected; see reference-ledger.md.
- The 27 unreviewed package certainty flags remain unchanged. Illustrations use the approved neutral motifs; architecture and cultural scenes are stylized references, not exact reconstructions or new learning facts.
- Images are generated using built-in ImageGen, originals preserved in Codex generated_images and selected outputs copied/resampled to project paths. No third-party web image embedded in the runtime.
- Asset pack is 41,830,249 bytes (about 41.8 MB); this adds to initial offline download/storage.
- Technical verification is complete; user aesthetic/content acceptance remains separate.

## Recovery finding

Main contains repeated failed turns with `{"detail":"Bad Request"}` plus user-interrupted turns. The executor completed earlier image batches despite Main failing. This demonstrates a coordinator conversation interruption; it does not establish the underlying service/network cause. Earlier claims that the error was merely a stale UI card were not sufficiently supported. Work resumed through this coordinator and the existing executor without resetting user data.

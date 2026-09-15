# Học Vui — Lesson Artwork 29 Implementation Plan

> **For agentic workers:** This plan is executed through the approved Astra/Luna Max workflow. Luna receives only the packet assigned to it, stops at `READY_FOR_REVIEW`, and must not create descendants or run Git lifecycle actions. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Register and display one coherent original illustration for each of the 29 Lịch sử và Địa lí 4 lessons while keeping only the two reviewed MVP packages playable.

**Architecture:** A standalone typed `LESSON_ARTWORKS` manifest owns all 29 visual records and stable local URLs. `LessonsView` looks up artwork by the currently displayed MVP lesson id and renders it as a decorative image with a CSS fallback. The Vite offline build precaches and fingerprints all 29 local files; artwork provenance and prompts stay in design documentation, not runtime content packages.

**Tech Stack:** React 18, TypeScript, Vite 5, Vitest 2, CSS, built-in ImageGen transparent/bitmap workflow, local PNG assets.

## Global Constraints

- Use the exact 29 lesson titles verified from the supplied PDF pages 5–6; do not infer additional lesson facts.
- Only `lesson-01` and `lesson-07` remain playable; do not expand `MvpLessonId`, `Lesson['id']`, progress, rewards, session, or package schemas to 29 ids.
- Keep `src/content/lessonArtwork.ts` separate from `src/content/packages.ts`; artwork registration never makes a lesson playable.
- Each artwork is an original 768×1024 raster illustration with no text, numbers, logo, watermark, readable sign, pet mascot, or copied web image.
- Runtime asset paths are local `/art/lessons/lesson-XX.png`; no CDN or external image URL is allowed.
- The 29 artwork records are based on the approved spec; records marked `needs-content-review` are visual-only and must not become lesson explanations or activities.
- Preserve current fallback CSS art and current card interactions when an image fails to load.
- Keep accessibility: decorative image `alt` is concise and non-redundant, `loading="lazy"`, `decoding="async"`, and the lesson number remains HTML.
- Do not change existing pet, HUD, passport, reward, navigation, progress, or backup behavior.
- Do not commit, push, merge, create branches, or deploy; verify directly in `/Volumes/Pictures/Projects/Hoc_Vui`.
- Run focused tests after each behavior change, then fresh typecheck, complete tests, build, manifest inspection, and browser QA on port 5001.

## File map and ownership

| Responsibility | Files | Owner |
|---|---|---|
| Artwork manifest and data contract | `src/content/lessonArtwork.ts`, `src/content/lessonArtwork.test.ts` | Luna D1 |
| Artwork provenance and final prompts | `design/lesson-artwork/reference-ledger.md`, `design/lesson-artwork/prompt-set.md` | Coordinator |
| 29 generated images | `public/art/lessons/lesson-01.png` … `lesson-29.png` | Coordinator/ImageGen |
| Card rendering and fallback | `src/views/LessonsView.tsx`, `src/views/LessonsView.test.tsx`, relevant `src/styles.css` rules | Coordinator |
| Offline cache contract | `vite.config.ts`, `src/pwa/offline.test.ts` | Coordinator |
| Final evidence | `docs/executor/LESSON-ARTWORK-29-READY_FOR_REVIEW.md` | Coordinator |

No concurrent packet may edit another packet’s write-set. The coordinator waits for each Luna packet before touching files owned by Luna.

## Phase sequence

### Task 1 / Packet D1: Register the 29-artwork data layer

**Files:**

- Create: `src/content/lessonArtwork.ts`
- Create: `src/content/lessonArtwork.test.ts`
- Do not modify: `src/content/catalog.ts`, `src/content/types.ts`, `src/content/packages.ts`, React views, CSS, Vite config, public assets

**Interfaces:**

```ts
export type LessonArtworkId =
  | 'lesson-01' | 'lesson-02' | 'lesson-03' | 'lesson-04' | 'lesson-05'
  | 'lesson-06' | 'lesson-07' | 'lesson-08' | 'lesson-09' | 'lesson-10'
  | 'lesson-11' | 'lesson-12' | 'lesson-13' | 'lesson-14' | 'lesson-15'
  | 'lesson-16' | 'lesson-17' | 'lesson-18' | 'lesson-19' | 'lesson-20'
  | 'lesson-21' | 'lesson-22' | 'lesson-23' | 'lesson-24' | 'lesson-25'
  | 'lesson-26' | 'lesson-27' | 'lesson-28' | 'lesson-29';

export type LessonArtwork = {
  lessonId: LessonArtworkId;
  src: string;
  alt: string;
  theme: 'local' | 'north-mountains' | 'red-river' | 'central-coast' | 'highlands' | 'south';
  visualAnchor: string;
  referenceStatus: 'confirmed-from-textbook' | 'visual-reference-only' | 'needs-content-review';
  objectPosition?: string;
};

export const LESSON_ARTWORKS: readonly LessonArtwork[] = [...];
export function getLessonArtwork(id: LessonArtworkId): LessonArtwork;
```

- [ ] **Step 1: Write the failing manifest contract test**

The test must assert exactly these ids in order:

```ts
const expectedIds = Array.from({ length: 29 }, (_, index) => `lesson-${String(index + 1).padStart(2, '0')}`);
expect(LESSON_ARTWORKS.map((item) => item.lessonId)).toEqual(expectedIds);
expect(new Set(LESSON_ARTWORKS.map((item) => item.lessonId)).size).toBe(29);
```

It must also assert every record has a local `/art/lessons/lesson-XX.png` URL, non-empty `alt` and `visualAnchor`, one of the six allowed themes, and one of the three allowed certainty statuses. Assert `getLessonArtwork('lesson-01').src` and `getLessonArtwork('lesson-07').src` point to their numbered files. Import the not-yet-created module so the test fails because the production contract is missing.

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
npm test -- --run src/content/lessonArtwork.test.ts
```

Expected: a module/import failure for `src/content/lessonArtwork.ts`, not a passing or unrelated TypeScript failure.

- [ ] **Step 3: Implement the minimal manifest**

Create the module with all 29 records from the approved design spec. Use the exact PDF-verified titles only in `visualAnchor`/metadata when needed; do not copy unreviewed historical facts into runtime learning content. Set the status for `lesson-28` to `needs-content-review`, and keep `lesson-01`/`lesson-07` as the only `confirmed-from-textbook` entries. `getLessonArtwork` must return the matching record and throw `Unknown lesson artwork: <id>` only for an impossible runtime id.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run the same command and require zero failures. Then run `npm run typecheck` from the coordinator after inspecting the actual changed files.

- [ ] **Step 5: Return the packet at READY_FOR_REVIEW**

Report actual files, test command/exit code, exact record count, and any unresolved data ambiguity. Do not touch any other write-set.

### Task 2 / Coordinator: Create and validate the 29 artwork assets

**Files:**

- Create: `design/lesson-artwork/reference-ledger.md`
- Create: `design/lesson-artwork/prompt-set.md`
- Create: `public/art/lessons/lesson-01.png` through `public/art/lessons/lesson-29.png`

**Interfaces:**

- Every generated filename exactly matches the manifest URL.
- Every image is PNG, 768×1024, has a genuine alpha channel where the composition calls for transparency, and contains no text or watermark.
- Prompts use the approved 2.5D educational-game art direction and the exact visual anchors from the spec.

- [ ] **Step 1: Write the reference ledger and prompt set before generation**

Record for each lesson: `lessonId`, PDF title, theme, visual anchor, certainty, reference URLs used only for visual study, and final prompt. Mark external references as visual reference only; do not download or embed them. Explicitly separate `confirmed-from-textbook`, `visual-reference-only`, and `needs-content-review`.

- [ ] **Step 2: Generate the six theme anchor assets first**

Use the built-in ImageGen tool, one asset per call, for `lesson-01`, `lesson-04`, `lesson-08`, `lesson-15`, `lesson-20`, and `lesson-24`. Inspect each output before continuing; reject outputs with fake checkerboard backgrounds, text, mascot duplication, wrong aspect, or cropped landmark.

- [ ] **Step 3: Generate the remaining 23 assets in theme batches**

Use the six approved themes as visual consistency groups. Keep the same camera, lighting, material vocabulary, and child-friendly 2.5D depth in each group. For `needs-content-review` lessons, use only neutral visual motifs already specified; do not turn uncertain details into precise claims.

- [ ] **Step 4: Copy selected outputs into the workspace and validate every file**

Run:

```bash
for file in public/art/lessons/lesson-*.png; do
  sips -g pixelWidth -g pixelHeight -g hasAlpha "$file";
done
```

Require exactly 29 files, 768×1024 dimensions, readable alpha metadata, no obvious generated text/watermark, and matching filenames. Record SHA-256 hashes in the ledger after final selection.

### Task 3 / Coordinator: Replace CSS fallback art in the lesson cards

**Files:**

- Create: `src/views/LessonsView.test.tsx`
- Modify: `src/views/LessonsView.tsx`
- Modify: relevant `.lesson-card-art` rules in `src/styles.css`

**Interfaces:**

- `LessonsView` props and navigation callbacks remain unchanged.
- `MVP_LESSONS` remains two entries; each displayed entry resolves its image through `getLessonArtwork(lesson.id)`.
- The previous CSS shapes remain as an image-load fallback, not the primary artwork.

- [ ] **Step 1: Write a failing static-render test**

Use `renderToStaticMarkup` from `react-dom/server` and a minimal valid `Progress` fixture. Render `LessonsView` with no-op callbacks. Assert the output contains both `/art/lessons/lesson-01.png` and `/art/lessons/lesson-07.png`, `loading="lazy"`, `decoding="async"`, non-empty alt attributes, and the visible lesson titles. The test must fail before JSX changes because current cards contain only CSS shapes.

- [ ] **Step 2: Run the focused test and confirm RED**

```bash
npm test -- --run src/views/LessonsView.test.tsx
```

- [ ] **Step 3: Add the image layer and deterministic fallback**

Import `getLessonArtwork`, add an image inside `.lesson-card-art` before the existing fallback layers, and set `style={{ objectPosition: lessonArtwork.objectPosition ?? '50% 50%' }}`. Add an `onError` handler that marks the image as failed and leaves the existing CSS fallback visible; do not throw or remove the card action. Keep the badge as HTML above the image and `aria-hidden="true"` only for decorative wrapper layers.

- [ ] **Step 4: Update CSS for crop, layering, and touch-safe layout**

Make `.lesson-card-art` a stable stacking context, set the artwork image to fill the panel with `object-fit: cover`, keep the fallback shapes behind it, and keep the number badge above it. Preserve existing card min-height and responsive grid rules. Add a subtle image gradient only if needed for badge contrast; do not add text inside the bitmap.

- [ ] **Step 5: Run focused tests and typecheck**

```bash
npm test -- --run src/views/LessonsView.test.tsx src/content/lessonArtwork.test.ts
npm run typecheck
```

### Task 4 / Coordinator: Register all lesson images for offline delivery

**Files:**

- Modify: `vite.config.ts`
- Modify: `src/pwa/offline.test.ts`

**Interfaces:**

- `LOCAL_ART_URLS` contains `/art/lessons/lesson-01.png` through `/art/lessons/lesson-29.png`.
- `LOCAL_ART_VERSIONS` contains the exact SHA-256 hash for every file.
- No GLB or external URL is introduced.

- [ ] **Step 1: Add a source-level offline regression test**

Extend `src/pwa/offline.test.ts` with an expected 29-entry list and assert every URL appears in both the allowlist and version list. Assert `createServiceWorkerSource` includes all lesson URLs and still excludes `/art/fox-pet.glb`.

- [ ] **Step 2: Run the offline test and confirm RED**

```bash
npm test -- --run src/pwa/offline.test.ts
```

The new assertions must fail until Vite arrays are updated.

- [ ] **Step 3: Add URLs and hashes**

Use `shasum -a 256 public/art/lessons/lesson-*.png`, add all 29 exact path/hash pairs to `LOCAL_ART_URLS` and `LOCAL_ART_VERSIONS`, and preserve the existing asset ordering and hashes.

- [ ] **Step 4: Run focused offline verification**

```bash
npm test -- --run src/pwa/offline.test.ts
npm run build
```

Inspect `dist/offline-manifest.json` and `dist/sw.js`; each of the 29 lesson URLs must be present, and each file must exist at `dist/art/lessons/lesson-XX.png`.

### Task 5 / Coordinator: Full verification and handoff report

**Files:**

- Create: `docs/executor/LESSON-ARTWORK-29-READY_FOR_REVIEW.md`

- [ ] **Step 1: Run fresh automated verification**

```bash
npm run typecheck
npm test -- --run
npm run build
```

Record exit codes and the exact Vitest file/test totals. Treat the known Three.js chunk-size warning as a warning unless a new build error appears.

- [ ] **Step 2: Inspect generated offline artifacts**

Verify the manifest contains 29 lesson artwork URLs and that all 29 files are present under `dist/art/lessons/`.

- [ ] **Step 3: Run browser QA on localhost:5001**

Check the “Bài học” view at 390px, 820px portrait, tablet landscape, and 1440px. Verify Bài 1 and Bài 7 show distinct artwork, the number badge and action remain visible, fallback behavior does not break layout, and there are no new console errors or broken image requests. Confirm the 27 unplayable records are not exposed as playable cards by this phase.

- [ ] **Step 4: Write evidence report**

Record changed files, asset dimensions/hashes, test/build commands and exit codes, offline manifest counts, browser observations, known warnings, and remaining product-owner review items. State clearly that technical verification is not product-owner acceptance.

## Plan self-review

- Spec coverage: 29-entry manifest, six-theme art direction, no-text original assets, local offline delivery, lazy loading, CSS fallback, accessibility, responsive QA, and 27 non-playable lessons are covered by Tasks 1–5.
- Write-set check: Luna owns only Task 1; coordinator owns artwork, UI, offline config, and report after Task 1 review. No task edits the same files concurrently.
- Type check: `LessonArtworkId` is independent from `MvpLessonId`; `getLessonArtwork` consumes only the manifest id and does not alter `Lesson` or progress schemas.
- Self-review: every implementation step has concrete files, interfaces, commands, expected outcomes, and no unresolved implementation marker remains.

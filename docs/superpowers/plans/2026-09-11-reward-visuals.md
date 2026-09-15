# Reward Visuals and Title Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the “Nhận dấu” page’s placeholder reward graphics with a cohesive Học Vui artwork pack and reduce oversized view titles across the content views without changing learning data or reward rules.

**Architecture:** Keep exact Vietnamese copy and reward state in React/HTML, and use transparent raster artwork only for the passport cover, three stamp variants, and the start-journey cue. A small presentational asset map will select artwork by lesson id/state; CSS will control sizing, earned/future treatment, responsive layout, and title scale. The existing Vite-generated service worker will precache and fingerprint the new local assets.

**Tech Stack:** React 18, TypeScript, Vite 5, Vitest 2, CSS, built-in ImageGen transparent PNG assets.

## Global Constraints

- Preserve `MVP_LESSONS`, `Progress`, `getLessonRewardState`, stamp ids, and all learning/source content.
- Keep exact visible copy in HTML so Vietnamese diacritics remain accessible and crisp; generated artwork must contain no text.
- Keep the current teal/navy/gold/cream visual language and use the existing fixed header/bottom dock unchanged.
- Store final artwork under `public/art/reward/` and include every file in `vite.config.ts` offline allowlist/version fingerprint.
- Do not overwrite existing artwork; use new stable filenames.
- Do not commit, push, merge, or change branches; verify the working tree directly.
- Run the focused tests after each behavior change, then run typecheck, full test, build, manifest inspection, and browser QA before completion.

---

### Task 1: Add the reward artwork pack

**Files:**
- Create: `public/art/reward/passport-cover.png`
- Create: `public/art/reward/stamp-journey.png`
- Create: `public/art/reward/stamp-heritage.png`
- Create: `public/art/reward/stamp-future.png`
- Create: `public/art/reward/start-journey.png`

**Interfaces:**
- Produces five transparent PNG URLs consumed by `RewardView` and its CSS.
- Each asset is decorative and contains no baked Vietnamese words, numbers, watermark, or UI frame.

- [ ] **Step 1: Generate the passport cover artwork**

Use the built-in image generator with a transparent background: a polished 3D children’s field-notebook/passport cover, deep teal/navy leather or enamel body, warm gold rim and compass/fox-emblem detail, vertical composition with a clean center area for HTML copy, playful Học Vui expedition style, no words, no letters, no numbers, no watermark.

- [ ] **Step 2: Generate the three stamp artworks**

Generate three separate transparent circular badge illustrations with the same material and palette: a gold/teal compass for the journey stamp, a gold/teal heritage temple-and-mountain motif for the heritage stamp, and a muted cream/gold constellation-and-sparkle motif for the locked future stamp. Keep each centered, readable at 72–96px, with no text or numbers.

- [ ] **Step 3: Generate the start-journey cue**

Generate a transparent small gold compass/map-marker with two soft sparkles, matching the stamp set and reading clearly at 44–52px. No text.

- [ ] **Step 4: Inspect and validate outputs**

Use `view_image` for each selected output and `sips -g pixelWidth -g pixelHeight -g hasAlpha` to confirm alpha transparency and usable dimensions. Copy only the final selected files into `public/art/reward/` without replacing unrelated assets.

### Task 2: Add test coverage for reward artwork markup

**Files:**
- Create: `src/views/RewardView.test.ts`
- Modify: `src/views/RewardView.tsx` only after the RED test is observed.

**Interfaces:**
- `RewardView` continues to accept `{ progress, reducedMotion, onPetTap, onOpenLessons }`.
- The rendered reward board exposes image URLs through `img[src]` and keeps text labels in DOM text.

- [ ] **Step 1: Write a failing render test**

Render `RewardView` with an empty progress object and mocked `FloatingPet`; assert that the page contains `/art/reward/passport-cover.png`, `/art/reward/stamp-journey.png`, `/art/reward/stamp-heritage.png`, `/art/reward/stamp-future.png`, and `/art/reward/start-journey.png`, plus the exact DOM labels `HỘ CHIẾU`, `CÁO NHỎ`, `Chặng khởi hành`, `Chặng di sản`, and `Bắt đầu từ một chặng đang mở`. Assert decorative images have empty `alt` text.

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
npm test -- --run src/views/RewardView.test.ts
```

Expected result: the new test fails because the current view has no reward artwork image URLs.

- [ ] **Step 3: Implement the minimum JSX asset structure**

Replace the CSS-only passport emblem/stamp icon placeholders with `<img>` elements using the five stable asset URLs while leaving all exact copy and reward-state expressions intact. Use `aria-hidden="true"` and `alt=""` for decorative artwork.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run the same command and require zero failures before CSS refactoring.

### Task 3: Integrate title scale and reward artwork styling

**Files:**
- Modify: `src/styles.css:411-448` for the shared title scale.
- Modify: `src/styles.css:1632-1786` for passport/stamp/guidance artwork presentation.
- Modify: `src/styles.css:2910-3000` for tablet/mobile sizing.

**Interfaces:**
- The shared `.view-heading h1` remains the title selector for Lessons, Reward, Pet, Collection, and Parent views.
- `RewardView` keeps the existing two-column desktop board and one-column mobile board.

- [ ] **Step 1: Set a smaller responsive title scale**

Change the desktop rule from `clamp(2rem, 4vw, 3.45rem)` to a bounded scale around `clamp(1.9rem, 3vw, 2.75rem)`, retain the existing line-height/letter spacing, reduce heading-card padding only enough to remove excess vertical footprint, and set tablet/mobile overrides near `2.2rem` and `1.85rem` respectively.

- [ ] **Step 2: Style the passport cover artwork**

Add an absolutely positioned or contained `.passport-cover-art` image layer with `object-fit: contain`, keep HTML copy above it, and preserve a readable dark-teal cover background if the transparent asset has edge transparency. Keep the cover minimum height near 300px desktop and 220px mobile.

- [ ] **Step 3: Style earned, available, and future stamp artwork states**

Add `.stamp-art` sizing and drop shadows. Earned stamps use full color and a soft teal glow; available stamps remain full-color but slightly subdued; the future stamp uses opacity/grayscale without collapsing contrast. Keep text labels readable and keep each slot touch-friendly.

- [ ] **Step 4: Replace the plain guidance square**

Use `.empty-action-icon img` for the generated start-journey cue, remove the old spark icon’s visual dependency from that slot, and keep the existing button/copy/DOM order.

- [ ] **Step 5: Run the focused test and inspect responsive CSS**

Run:

```bash
npm test -- --run src/views/RewardView.test.ts
```

Then inspect the generated CSS selectors with `rg -n 'view-heading h1|passport-cover-art|stamp-art|empty-action-icon img' src/styles.css` and verify no old selector accidentally hides the new images.

### Task 4: Register artwork for offline delivery

**Files:**
- Modify: `vite.config.ts:7-18`.
- Modify: `src/pwa/offline.test.ts` only if the existing allowlist assertions need an explicit reward-art check.

**Interfaces:**
- `LOCAL_ART_URLS` contains all five `/art/reward/*.png` paths.
- `LOCAL_ART_VERSIONS` contains a stable SHA-256 entry for each file.

- [ ] **Step 1: Add the five reward URLs and hashes**

Use `shasum -a 256 public/art/reward/*.png` and add exact paths/hashes to the existing arrays. Do not add the legacy GLB.

- [ ] **Step 2: Extend the offline test if needed**

Assert the source includes `/art/reward/passport-cover.png`, `/art/reward/stamp-journey.png`, `/art/reward/stamp-heritage.png`, `/art/reward/stamp-future.png`, and `/art/reward/start-journey.png` in both the allowlist and version list.

- [ ] **Step 3: Run the offline focused test**

```bash
npm test -- --run src/pwa/offline.test.ts
```

Require zero failures.

### Task 5: Verify the complete deliverable

**Files:**
- Create: `docs/executor/REWARD-VISUALS-TITLE-SCALE-01-READY_FOR_REVIEW.md`

**Interfaces:**
- The report records actual commands, test counts, asset paths, and browser observations; it does not claim product-owner acceptance.

- [ ] **Step 1: Run fresh automated verification**

```bash
npm run typecheck
npm test -- --run
npm run build
```

Record exit codes and test counts. Treat the known Three.js chunk-size warning as a warning unless a new error appears.

- [ ] **Step 2: Inspect offline build artifacts**

Confirm `dist/offline-manifest.json` and `dist/sw.js` contain all five reward asset URLs and that each file exists under `dist/art/reward/`.

- [ ] **Step 3: Run browser QA on `http://localhost:5001/`**

Check the “Nhận dấu” page at landscape desktop, tablet portrait, and mobile widths. Verify title footprint is reduced, the passport/stamps/guidance artwork renders without broken images, earned/future states remain legible, touch targets remain usable, and the browser console has no new errors.

- [ ] **Step 4: Write the evidence report**

Document changed files, exact asset paths, test/build evidence, viewport checks, known warnings, and remaining product-owner review items. Leave the local server running on port 5001.


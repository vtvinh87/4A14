# Reward Visuals + Title Scale 01 — READY_FOR_REVIEW

Date: 2026-09-11
Scope: Học Vui reward/passport visuals and shared content-view title scale
Status: READY_FOR_REVIEW

## Delivered

- Reduced shared `.view-heading h1` from a maximum of `3.45rem` to `2.75rem`, with `1.85rem` mobile override.
- Replaced CSS-only reward placeholders in `RewardView` with five transparent artwork assets:
  - `public/art/reward/passport-cover.png`
  - `public/art/reward/stamp-journey.png`
  - `public/art/reward/stamp-heritage.png`
  - `public/art/reward/stamp-future.png`
  - `public/art/reward/start-journey.png`
- Kept all Vietnamese copy in HTML and all reward/progress state logic unchanged.
- Added artwork markup regression coverage in `src/views/RewardView.test.ts`.
- Added offline allowlist/version coverage in `src/pwa/offline.test.ts` and registered the assets in `vite.config.ts`.
- Added implementation plan at `docs/superpowers/plans/2026-09-11-reward-visuals.md`.

## Artwork production

Assets were generated with the built-in ImageGen tool, then resized for UI/offline use while preserving alpha transparency:

- Passport: 512×768 PNG
- Three stamps: 512×512 PNG each
- Start-journey cue: 384×369 PNG

The generated artwork contains no baked Vietnamese text, so exact copy remains selectable, accessible HTML.

## Verification evidence

Commands run:

```text
npm test -- --run src/views/RewardView.test.ts src/pwa/offline.test.ts
  2 files passed, 6 tests passed

npm run typecheck
  PASS

npm test -- --run
  17 files passed, 70 tests passed

npm run build
  PASS
```

Build artifact checks:

- `dist/art/reward/` contains all five final PNGs.
- `dist/offline-manifest.json` and `dist/sw.js` contain all five `/art/reward/*.png` URLs.
- Vite emitted the existing Three.js chunk-size warning; no build error occurred.

## Browser QA

Checked on `http://localhost:5001/?reward-visuals=20260911`:

- Default browser viewport: reward page renders passport, two active stamp slots, future stamp, guidance artwork, and reduced heading.
- Tablet portrait `768×1024`: board stacks correctly, stamps remain legible, guidance artwork and text remain visible.
- Tablet landscape `1024×768`: two-column board remains legible and the reduced heading fits comfortably.
- Lessons, Pet, Collection, and Reward pages all use the reduced shared title scale.
- Viewport override was reset after QA; preview was left on the Reward page.

## Review note

This is technical/UI readiness evidence only. Product-owner visual acceptance remains with the user.


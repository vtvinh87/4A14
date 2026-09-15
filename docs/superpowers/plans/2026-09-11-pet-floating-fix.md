# PET-FLOAT-01 — approved interaction and execution ledger

User approved removing animated depth after A/B diagnosis and finger-drag floating compact Pet on Lesson and Reward pages. Preserve detailed artwork and in-plane animation. No autonomous roaming.

Coordinator: 01a08ad3-c1cc-74d3-b6ae-bae774397297. Executor: 01a08b45-8019-7a33-8761-b6d05450f6af, local, gpt-5.6-luna/max. Checkout: /Volumes/Pictures/Projects/Hoc_Vui (non-Git). Status: VERIFIED — bounded PET-FLOAT-01 scope, executor idle.

1. Remove mood-driven z offsets; regression simulation verifies constant depth across moods/transitions while in-plane motion remains.
2. Add floating compact Pet wrapper using portal outside transformed content-view. Pointer capture, touch drag threshold, suppress tap after drag, cancellation cleanup, viewport clamp on resize and bubble size changes. Keep position in memory only. Touch instructions and keyboard movement support. Layer above dock/content and below settings dialog. Initial position above dock near viewport edge. Whole transparent overlay must not block page scrolling/clicks.
3. Apply to LessonView and RewardView; preserve mood feedback and existing tap callbacks. Full-sized Pet unchanged. Remove old inline spacing.
4. Verify meaningful interaction tests (drag versus tap, cancel, bounds/resize, portal/layer), motion regression, typecheck and production build. Coordinator reviews implementation and browser smoke.

Allowed executor files: src/pet2d5d/motion.ts, src/pet2d5d/motion.test.ts, src/components/FloatingPet.tsx, src/components/FloatingPet.test.tsx, src/components/floatingPetPosition.ts, src/components/floatingPetPosition.test.ts, src/views/LessonView.tsx, src/views/RewardView.tsx, src/styles.css, docs/executor/PET-FLOAT-01-READY_FOR_REVIEW.md. Build artifacts allowed. No dependencies, assets, storage/content contracts, Git lifecycle, external writes or Brain_Vault writes.

Baseline: existing moodTarget has z offsets (0.014 arm, 0.007 head, negative tail) introduced by PET-2D5D-03. Compact Pet is inline inside lesson-panel/reward view. content-view animation retains transform; dock z=20, settings backdrop z=35 in app-shell. Portal target/layer must account for world-overlay z=1 and app-shell isolation.

## Coordinator verification — 2026-09-11

- Accepted test filename adaptation to `src/components/FloatingPet.test.ts` for existing Vitest discovery; no configuration/dependency changes.
- Independent full test run: 14 files / 58 tests passed. Production build including TypeScript check exit 0; script `index-CBTvkLeN.js` confirmed loaded from 4174.
- Browser QA: fast drag at 820x1180 moves widget from (539,978) to (89,398); scrollY=194.5 leaves widget fixed at its new viewport position. Earlier delayed capture regression was reproduced and corrected to capture the original button immediately.
- Reward: drag bounds, keyboard movement, Pet hit-testing over dock and settings backdrop above Pet verified. Short viewport 390x320 keeps whole widget inside viewport. These are desktop browser viewport checks, not physical iPad testing.
- Production PetView greet inspected visually with detailed face/tail intact; constant-depth simulation regression passes. No console error/warning on production QA tab.
- PNG hash preserved: 0141b479768c575217bd3da5acde7aab7785356071cf6129ddd10713ac3bd8e3. Pet.tsx unchanged. Existing Three.js chunk-size warning remains.
- Handoff: docs/executor/PET-FLOAT-01-READY_FOR_REVIEW.md. No broader MVP acceptance or next phase implied.

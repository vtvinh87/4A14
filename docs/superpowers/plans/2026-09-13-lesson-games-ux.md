# Học Vui lesson games and adventure cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 29-lesson catalogue denser on landscape screens, give every lesson five playable missions, point book guidance at SGK, and make the activity experience richer and more game-like.

**Architecture:** Keep the existing deterministic lesson state machine and local offline assets. Extend the typed activity union with one additional lightweight puzzle mechanic, keep evaluation pure, and layer visual feedback through semantic state classes and CSS animations. Keep curriculum facts in the existing seed/package boundary and preserve source references for auditability.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, CSS, local PNG artwork.

## Global Constraints

- Preserve Vietnamese copy and offline-first local asset contracts.
- Do not copy or edit the supplied PDFs; use them only as source evidence.
- Keep reduced-motion behavior accessible and avoid relying on animation for correctness.
- Every new behavior gets a failing test before production code.

### Task 1: Five-mission lesson catalogue and landscape grid

**Files:**
- Modify: `src/content/courseSeeds.ts`
- Modify: `src/content/packages.ts`
- Modify: `src/content/catalog.ts`
- Modify: `src/views/LessonsView.tsx`
- Test: `src/views/LessonsView.test.ts`

- [x] Add tests for five missions per playable lesson and a three-column landscape grid hook.
- [x] Run the targeted tests and observe the expected failures.
- [x] Add two source-backed mission beats per lesson using the current seed facts and make reviewed packages follow the same count.
- [x] Update catalogue copy/counts and the responsive grid contract.
- [x] Run targeted tests and then the full suite.

### Task 2: New puzzle type and interaction feedback

**Files:**
- Modify: `src/content/types.ts`
- Modify: `src/game/evaluate.ts`
- Modify: `src/game/session.ts`
- Modify: `src/progress/storage.ts`
- Modify: `src/views/LessonView.tsx`
- Modify: `src/styles.css`
- Test: corresponding `src/game/*`, `src/progress/storage.test.ts`, and `src/views/LessonView.test.ts`

- [x] Add failing tests for the new puzzle response, source guidance, and match connector hooks.
- [x] Run them RED.
- [x] Implement the new typed puzzle, persistence validation, UI, and feedback classes with reduced-motion fallbacks.
- [x] Run targeted GREEN tests and inspect the lesson view at compact and landscape sizes.

### Task 3: Source and integration verification

**Files:**
- Modify only where integration exposes a defect.
- Test: full existing suite, typecheck, build, offline manifest checks.

- [x] Verify all “Xem trong sách” rendered guidance says SGK while source metadata remains available for audit.
- [x] Verify every lesson exposes five missions and every new activity can be evaluated and resumed.
- [x] Run `npm test -- --run`, `npm run typecheck`, `npm run build`, and the existing asset validation.
- [x] Perform browser smoke checks for landscape catalogue, a match activity, the new puzzle, and reduced-motion classes.

## Verification record

- `npm test -- --run`: 27 files, 107 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; all 29 lesson JSON packages emitted.
- `npm run validate:fox`: passed.
- Browser smoke at 1280×720: 29 cards rendered in three columns; lesson 01 displayed five mission steps; match rope changed to `linked`; select puzzle rendered and accepted two correct clues; refresh retained the open lesson and mission.

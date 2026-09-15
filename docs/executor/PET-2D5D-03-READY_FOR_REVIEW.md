# PET-2D5D-03 — Polish + production offline contract

Status: `READY_FOR_REVIEW`

Date: 2026-09-11

Checkout: `/Volumes/Pictures/Projects/Hoc_Vui`

## Scope completed

Exact packet write-set:

- `src/pet2d5d/motion.ts`
  - Added explicit safe-motion constants and tightened the controller y clamp to `±0.06`.
  - Added very small z-depth targets for head, arms, and tail during greet, think, and celebrate; all remain inside the existing `±0.03` depth clamp.
  - Kept the existing spring integrator, mood durations, reduced-motion behavior, visibility pause, and target amplitudes within the approved profile.
- `src/pet2d5d/motion.test.ts`
  - Added ten-second idle bounds simulation.
  - Added two greet runs and two celebrate runs with finite-pose, rotation, scale, and root-y assertions.
  - Added a ten-second reduced-motion freeze simulation.
- `src/styles.css`
  - Added a restrained 2D5D-specific shadow and stage containment/isolation/GPU compositing hints.
  - Kept 2D5D canvas self-driven; no CSS whole-image animation was added.
- `vite.config.ts`
  - Removed `/art/fox-pet.glb` from `LOCAL_ART_URLS` and its hash from `LOCAL_ART_VERSIONS`.
  - Kept the PNG, world background, fonts, lesson packages, and runtime chunks in the active offline contract.
- `src/pwa/offline.test.ts`
  - Added a production allowlist regression assertion using `vite.config.ts?raw`, avoiding new Node typings/dependencies.
- `docs/executor/PET-2D5D-03-READY_FOR_REVIEW.md`
  - This handoff report.

No file outside this exact write-set was intentionally changed. Preserved without modification: `public/art/fox-pet-alpha.png`, `public/art/fox-pet.glb`, `src/components/FoxPet3D.tsx`, `src/components/FoxPet2D5D.tsx`, `src/pet2d5d/types.ts`, `src/pet2d5d/rig.ts`, `src/pwa/offline.ts`, `Pet.tsx`, package/lock files, `App.tsx`, `source/`, `docs/superpowers/`, and `docs/tien-do-va-phe-duyet.md`. No overlay, texture, or additional artwork was created.

## Motion/depth contract

The regression suite simulates:

- 600 frames / 10 seconds of idle;
- two 2-second runs each for greet and celebrate;
- 600 frames / 10 seconds with reduced motion enabled.

Every sampled pose must remain finite, with:

- `abs(rotation) <= 0.18`;
- `abs(scale - 1) <= 0.03`;
- `abs(root.y) <= 0.06`.

Reduced motion remains an identity pose over time and reports `isAnimating() === false`. The new depth targets are intentionally small: arm/head forward offsets and tail backward offsets remain within the controller's `±0.03` z bound. No artwork or mesh topology changed.

## Production offline contract

The active Vite allowlist now contains the PNG but not the legacy GLB. The production output after `npm run build` contains:

- `dist/offline-manifest.json`: 22 unique URLs, `manifestHasGlb=false`, `manifestHasPng=true`;
- `dist/sw.js`: `swHasGlb=false`;
- 3 current shell/runtime assets, 12 font URLs, and both MVP lesson packages;
- all manifest URLs returned HTTP 200 from the production preview on `127.0.0.1:4174`.

The GLB was not deleted. `public/art/fox-pet.glb` remains on disk at 163172 bytes, validates successfully, and responds directly with HTTP `200 model/gltf-binary` for rollback/reference. It is intentionally not precached after this packet.

## Verification evidence

| Check | Result |
| --- | --- |
| Motion bounds test: `npx vitest run src/pet2d5d/motion.test.ts` | Exit 0; 9 tests passed, including all new simulations |
| Offline target: `npx vitest run src/pwa/offline.test.ts` | Exit 0; 4 tests passed |
| Full: `npm test -- --run` | Exit 0; 12 files, 49 tests passed |
| `npm run typecheck` | Exit 0 |
| `npm run build` | Exit 0; Vite 5.4.21, 63 modules transformed |
| `npm run validate:fox` | Exit 0; legacy GLB validated: 2,148 vertices, 3,140 triangles, 37 primitives, 17 bones, clips `idle/greet/think/celebrate/rest` |
| Manifest HTTP smoke | Exit 0; 22 manifest URLs, 0 failures, all 12 fonts HTTP 200, PNG HTTP 200 |
| Direct rollback asset smoke | Exit 0; PNG HTTP 200 `image/png`, GLB HTTP 200 `model/gltf-binary` |

TDD evidence for the offline contract: the new allowlist assertion failed before the Vite config change because `/art/fox-pet.glb` was still present, then passed after removal. The motion bounds assertions passed with the existing profile, so no bounds were relaxed and no corrective amplitude increase was needed.

The build retains the advisory warning for the shared `three.module` chunk (approximately 746.94 kB minified, above Vite's 500 kB threshold). No dependency or lockfile changes were made.

## Preservation evidence

SHA-256 hashes after the packet:

```text
0141b479768c575217bd3da5acde7aab7785356071cf6129ddd10713ac3bd8e3  public/art/fox-pet-alpha.png
73ba975c459fa46c18b341ecc179c54d0fcf5f464e49e7fa1da2ac2190a9bd40  public/art/fox-pet.glb
```

- `public/art/fox-pet-hifi.glb` remains absent.
- The active manifest no longer contains the GLB, while the source GLB remains intact for rollback.
- No commit, push, merge, deploy, branch/worktree operation, or Git lifecycle action was performed.
- Task 7 parent-only final visual/runtime QA was not run by this executor, and no later packet was started.

## Parent review boundary

This packet is ready for parent review. The parent must independently run the final CUA review across Journey full, Lesson compact, Reward compact, PetView full, desktop/tablet/mobile, all moods, reduced motion, hidden-tab behavior, console, and offline runtime. This report does not claim MVP or pet completion.

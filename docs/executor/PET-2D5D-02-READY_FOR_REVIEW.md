# PET-2D5D-02 — Runtime integration

Status: `READY_FOR_REVIEW`

Date: 2026-09-11

Checkout: `/Volumes/Pictures/Projects/Hoc_Vui`

## Scope completed

- `src/components/Pet.tsx`
  - `FoxPet2D5D` is now the default and only active renderer path for `Pet`.
  - Removed the development-only preview query gate and the active `FoxPet3D` import.
  - Keeps the PNG visible while 2D5D is loading; a renderer error removes the stage and keeps the PNG fallback.
  - Preserved the existing mood, reduced-motion, tap behavior, message copy, size variants, and accessible PNG alt text.
- `src/styles.css`
  - Excluded the legacy whole-avatar bounce/think selectors from `.pet-avatar-2d5d`, so CSS animation does not compete with the 2D5D motion controller.
  - Preserved legacy GLB styles and the existing 2D5D stage/canvas styles.
- `src/pwa/offline.ts`
  - Updated checking/ready copy from `pet GLB` to `artwork pet`.
- `src/pwa/offline.test.ts`
  - Added a regression assertion for the offline copy and the removed GLB wording.
- `docs/executor/PET-2D5D-02-READY_FOR_REVIEW.md`
  - This handoff report.

No files outside the packet write-set were intentionally changed. `FoxPet3D.tsx`, `src/pet2d5d/*`, `vite.config.ts`, `App.tsx`, source materials, package files, and both art assets remain preserved. No `2D5D-03` work was run.

## Renderer and fallback behavior

The production `Pet` component now mounts `FoxPet2D5D` without a query parameter. `FoxPet3D` and `public/art/fox-pet.glb` remain available for rollback/reference only and are not instantiated by the active `Pet` path. The build therefore emits the shared Three runtime but no `GLTFLoader` chunk.

The 2D5D renderer reports ready through `onReady`. Until then, the original PNG remains visible. On `onError`, `Pet` switches to the original PNG-only path. The fallback keeps the existing accessible label:

`Cáo Nhỏ mặc khăn xanh teal, đeo ba lô và cầm la bàn`

## Browser evidence

- Dev default: `http://127.0.0.1:4173/?cachebust=2d5d02`
  - DOM probe: `pet-avatar pet-avatar-2d5d pet-avatar-2d5d-ready`, `twoDCanvasCount=1`, `threeCanvasCount=0`, `imageCount=0`.
  - CUA screenshot reviewed on Journey/Pet views; the expected orange/cream fox artwork with teal scarf, backpack, and compass is visible.
  - Browser warning/error log probe returned no entries.
- Forced fallback: `http://127.0.0.1:4173/?pet-2d5d-error=1`
  - The URL no longer needs the old preview flag.
  - CUA accessibility state exposed the fallback image with the exact alt text above; the screenshot showed the original PNG artwork in Pet view.
- Production preview: `http://127.0.0.1:4174/?cachebust=2d5d02`
  - Current HTML served `/assets/index-BGLckPK8.js` and `/assets/index-CbPKcKgN.css`.
  - DOM probe: `has2d=true`, `has3d=false`, `twoDCanvasCount=1`, `threeCanvasCount=0`.
  - The cache-busting query is intentional: the browser's plain 4174 tab had an older cached bundle during the check, while HTTP and the cache-busted URL served the current build.
- Compact lesson companion was previously checked with the same 2D5D stage: one companion, `pet-size-compact`, ready class, and a 62px avatar width. Whole-branch responsive and mood review remains the parent acceptance gate.
- Reduced motion: CUA toggled `Giảm chuyển động` to `Value: 1`; the Pet copy changed to `Mình đứng yên để bạn tập trung nhé.`; the setting was restored to `Value: 0`. Unit coverage also remains green.

## Verification evidence

| Check | Result |
| --- | --- |
| TDD RED: `npx vitest run src/pwa/offline.test.ts` before copy fix | Exit 1; 1 new assertion failed against the old `pet GLB` copy, 2 passed |
| Target: `npx vitest run src/pwa/offline.test.ts` | Exit 0; 3 tests passed |
| Full: `npm test -- --run` | Exit 0; 12 files, 45 tests passed |
| `npm run typecheck` | Exit 0 |
| `npm run build` | Exit 0; Vite 5.4.21, 63 modules transformed |
| `npm run validate:fox` | Exit 0; preserved GLB validated: 2,148 vertices, 3,140 triangles, 37 primitives, 17 bones, clips `idle/greet/think/celebrate/rest` |
| Production HTTP HEAD smoke from `dist/offline-manifest.json` | Exit 0; 23 unique URLs, 0 failures, all 12 fonts HTTP 200, PNG HTTP 200, GLB HTTP 200 |

Build warning is unchanged in nature: the shared `three.module` chunk is approximately 746.94 kB and exceeds Vite's 500 kB advisory threshold. No dependency or lockfile changes were made.

## Preservation checks

SHA-256 hashes after the packet:

```text
0141b479768c575217bd3da5acde7aab7785356071cf6129ddd10713ac3bd8e3  public/art/fox-pet-alpha.png
73ba975c459fa46c18b341ecc179c54d0fcf5f464e49e7fa1da2ac2190a9bd40  public/art/fox-pet.glb
```

- `public/art/fox-pet-hifi.glb` remains absent.
- `dist/offline-manifest.json` still contains both `/art/fox-pet-alpha.png` and `/art/fox-pet.glb`; removing the GLB from the offline contract is intentionally deferred to `2D5D-03`.
- No Git lifecycle action, deployment, merge, commit, or branch/worktree operation was performed.

## Parent review boundary

This packet is ready for parent review. Parent acceptance should still independently cover all required Journey, Lesson/Reward, PetView, mobile, tablet, mood, focus, and responsive states. The 2D5D full-image weighted mesh remains subject to the parent visual fidelity/seam review. This report does not claim whole-branch product acceptance.

# PET-FLOAT-01 — floating compact Pet

Status: `READY_FOR_REVIEW`

Date: 2026-09-11

Checkout: `/Volumes/Pictures/Projects/Hoc_Vui`

## Scope completed

Exact implementation scope:

- `src/pet2d5d/motion.ts`
  - Removed all mood-driven animated z targets.
  - Retained approved x/y/rotation/scale motion and the existing safe clamps; depth stays at the identity value while moods transition.
- `src/pet2d5d/motion.test.ts`
  - Added regression coverage proving constant `z === 0` across idle, greet, think, celebrate, and rest while in-plane motion still occurs.
- `src/components/floatingPetPosition.ts`
  - Added pure viewport/position helpers for edge clamping, initial placement above the dock, drag threshold, keyboard movement, and resize clamping.
- `src/components/floatingPetPosition.test.ts`
  - Added helper tests for complete-widget bounds, initial dock gap, tap-vs-drag threshold, drag clamp, and short-viewport resize.
- `src/components/FloatingPet.tsx`
  - Added a portal-based compact Pet wrapper.
  - Portals into `.world-overlay`, outside transformed `.content-view`, so the fixed position is viewport-relative.
  - Keeps the full transparent layer `pointer-events: none`; only the widget is interactive.
  - Uses pointer capture on the original drag-start target (`closest('button')` for the Pet button), so fast finger drags remain tracked after leaving the widget while a no-drag native button click remains intact.
  - Applies a 6px drag threshold, suppresses the click generated after a drag, and cleans pointer up/cancel/lost-capture state.
  - Clamps the complete widget on viewport and measured widget-size changes, listens to window and `visualViewport` resize, and keeps position in React memory only.
  - Adds hidden touch/mouse instructions, arrow-key movement, focus styling, and Enter/Space stale-suppression cleanup.
- `src/components/FloatingPet.test.ts`
  - Runner-compatible React interaction tests for portal target, tap versus drag, fast drag with button capture, cancellation, lost capture, keyboard movement, and short-viewport bounds.
  - The repository's Vitest include is `src/**/*.test.ts`, so this test intentionally uses `createElement` in `.test.ts` rather than an undiscoverable `.test.tsx` file; no runner config or dependency was changed.
- `src/views/LessonView.tsx`
  - Replaced inline compact Pet spacing with `FloatingPet`.
- `src/views/RewardView.tsx`
  - Replaced inline compact Pet spacing with `FloatingPet`.
- `src/styles.css`
  - Added the floating layer/widget stacking and interaction styles: above dock/content at z-index 25, below settings at z-index 35, focus ring, grab cursor, and touch handling.
  - Removed old inline Lesson/Reward Pet spacing rules.
- `docs/executor/PET-FLOAT-01-READY_FOR_REVIEW.md`
  - This handoff report.

No dependency, asset, storage, content, or Brain_Vault change was made. No Git lifecycle action, external message, task creation, model change, deployment, or later packet was performed.

## Interaction contract

- Initial placement uses the measured complete widget size, a 12px viewport edge gap, and a 124px bottom gap to clear the dock; it is near the lower viewport edge without being inline in the lesson/reward panel.
- Drag position is clamped against both viewport edges using the entire avatar-plus-bubble widget, not only the avatar.
- A pointer is captured immediately by the original button/HTMLElement target. The wrapper receives bubbled captured events, so a fast drag remains movable after leaving the widget. The 6px threshold controls whether the eventual click is suppressed.
- A pointerdown on the Pet button with no movement still produces the existing `Pet` tap callback. A drag does not produce a tap callback.
- Pointer cancel and lost pointer capture clear the drag state. A new pointerdown or keyboard activation clears stale click suppression.
- Arrow keys move the focused widget by 24px and remain clamped. The widget has a visible focus ring and screen-reader instructions.
- The transparent portal layer cannot intercept page clicks or scrolling outside the widget. The interactive widget itself uses `touch-action: none` for intentional finger dragging.
- `FloatingPet` is used only for Lesson and Reward compact pets. Journey and PetView full-size pets remain unchanged.

## Motion regression contract

The motion tests now cover:

- 600 frames / 10 seconds of idle;
- two 2-second greet runs and two 2-second celebrate runs;
- 600 frames / 10 seconds with reduced motion enabled;
- constant zero depth through all mood transitions while x/y/rotation/scale still produce in-plane motion.

Sampled poses remain finite with `abs(rotation) <= 0.18`, `abs(scale - 1) <= 0.03`, and `abs(root.y) <= 0.06`. No dynamic z target remains in `motion.ts`; the A/B-mandated fix retains artwork and in-plane motion while removing the transparency-patch trigger.

## Verification evidence

| Check | Result |
| --- | --- |
| `npx vitest run src/components/floatingPetPosition.test.ts` | Exit 0; 4 tests passed |
| `npx vitest run src/components/FloatingPet.test.ts` | Exit 0; 4 tests passed |
| `npx vitest run src/pet2d5d/motion.test.ts` | Exit 0; 10 tests passed |
| `npm test -- --run` | Exit 0; 14 files, 58 tests passed |
| `npm run typecheck` | Exit 0 |
| `npm run build` | Exit 0; Vite 5.4.21, 65 modules transformed |
| `npm run validate:fox` | Exit 0; legacy GLB validated: 2,148 vertices, 3,140 triangles, 37 primitives, 17 bones, clips `idle/greet/think/celebrate/rest` |
| Production HTTP smoke from `dist/offline-manifest.json` | Exit 0; 22 URLs, 0 failures, 12 font URLs HTTP 200, PNG HTTP 200; manifest and `sw.js` contain no `/art/fox-pet.glb` |
| Direct rollback asset smoke | Exit 0; PNG HTTP 200 `image/png`, GLB HTTP 200 `model/gltf-binary` |

Production build output contained the current shell/runtime assets and the GLB remained on disk for rollback. The only build warning is the existing advisory for the shared `three.module` chunk at approximately 746.94 kB minified.

## Preservation evidence

SHA-256 hashes after this packet:

```text
0141b479768c575217bd3da5acde7aab7785356071cf6129ddd10713ac3bd8e3  public/art/fox-pet-alpha.png
73ba975c459fa46c18b341ecc179c54d0fcf5f464e49e7fa1da2ac2190a9bd40  public/art/fox-pet.glb
```

- `public/art/fox-pet.glb` remains present at 163172 bytes and is not in the active offline allowlist.
- `public/art/fox-pet-hifi.glb` remains absent.
- `Pet.tsx`, `FoxPet2D5D.tsx`, `FoxPet3D.tsx`, `src/pet2d5d/types.ts`, `src/pet2d5d/rig.ts`, `src/pwa/offline.ts`, package/lock files, `App.tsx`, `source/`, and approved docs were preserved.

## Parent review boundary

This packet is ready for parent review. The coordinator subsequently reported final CUA QA `PASS` on the current production preview: `index-CBTvkLeN.js` loaded at 4174 with no console errors; the 820x1180 fast drag moved the widget from approximately `(539,978)` to `(89,398)`; scrolling to `scrollY=194.5` kept the widget at the same viewport coordinates; Reward z-order was above the dock and below settings; keyboard movement and the 390x320 clamp passed. This executor did not run parent-only Task 7 and does not claim MVP or Pet completion.

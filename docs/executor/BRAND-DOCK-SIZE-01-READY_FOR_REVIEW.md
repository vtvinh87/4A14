# BRAND-DOCK-SIZE-01 — READY_FOR_REVIEW

## Outcome

The top-left Học Vui brand plaque now uses a generated transparent 3D wooden signboard with tactile planks, bevels, fasteners, and a soft shadow. The Vietnamese title remains live HTML over the artwork so `HỌC VUI` and `Lịch sử & Địa lí 4` keep exact accents, accessibility text, and responsive scaling.

The bottom navigation dock is reduced to approximately 83% of its previous desktop width and height. The five concept artwork icons remain readable, the active tile keeps the soft cyan halo, and tablet touch targets remain at least 48px in the narrow layout rules.

## Changed files

- `src/components/TopHud.tsx`
- `src/styles.css`
- `vite.config.ts`
- `public/art/brand-plaque.png`
- `public/art/hud/README.md`

## Verification evidence

```text
npm run typecheck
passed

npm test -- --run
16 files passed, 68 tests passed

npm run build
passed
```

Production tablet preview:

`http://127.0.0.1:4174/?brand=dock-compact-final`

Verified:

1. The wooden Học Vui plaque is visible at the upper-left and does not collide with the top-right HUD.
2. Vietnamese title text remains readable and is exposed in the accessibility tree.
3. The dock occupies less space while preserving five clear navigation targets.
4. The new plaque is included in the generated offline precache manifest.
5. Browser accessibility/runtime inspection returned no new warning or error entries.

The build retains the existing Three.js chunk-size warning.

# PET-HUD-ART-01 — READY_FOR_REVIEW

## Outcome

The top-right HUD now uses concept-aligned 3D artwork:

- the passport badge uses the same detailed fox head artwork as the navigation dock;
- sound uses an ivory-and-gold speaker with a cyan accent;
- settings uses an ivory-and-gold gear with a teal-blue gem;
- parent uses a warm ivory support figure with a teal shirt and gold star.

The bottom dock active state keeps its raised blue tile while the cyan halo is softer: lower opacity, wider diffusion, and a smaller highlight ring. Hover, press, reduced-motion, and existing accessible button behavior remain supported.

All generated images preserve transparent alpha and are included in the production service-worker precache.

## Changed files

- `src/components/TopHud.tsx`
- `src/styles.css`
- `vite.config.ts`
- `public/art/hud/sound.png`
- `public/art/hud/settings.png`
- `public/art/hud/parent.png`
- `public/art/dock/pet.png` (already used by the dock and reused for the passport badge)
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

`http://127.0.0.1:4174/?hud=soft-glow-final`

Verified:

1. Passport, sound, settings, and parent artwork render in the top-right HUD.
2. The bottom dock active halo is visibly softer while retaining clear focus.
3. Navigation changes the active tile correctly.
4. The preview accessibility tree retains the existing Vietnamese button labels.
5. The browser warning/error log query returned no entries.

The build retains the existing Three.js chunk-size warning; no new warning was introduced by this HUD change.

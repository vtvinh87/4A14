# Vietnam progress map — AI source brief

## Provenance

- Use case: `illustration-story`
- Asset type: source illustration for the child-facing Học Vui progress map
- Generation mode: built-in ImageGen
- Reference image: `/tmp/hoc-vui-progress-map-reference.png` — supporting geography/layout reference only; not a runtime asset
- Runtime output: `/public/art/progress/vietnam-progress-map-illustrated.png`
- Generated text policy: the source must contain no text; Hoàng Sa/Trường Sa labels are composited deterministically after generation.

## Prompt

Create one complete north-up 2D illustrated map artwork of Vietnam for a warm,
playful elementary-school history and geography game. Show the full
recognizable S-shaped mainland from north to south, coastal islands, Hoang Sa
and Truong Sa as two separate island groups in their geographically correct
relative positions. Integrate friendly storybook scenes at their approximate
real locations: Lung Cu flag tower, Khue Van Cac in Hanoi, Hoa Lu ancient
capital, Kim Lien lotus village, Hue imperial architecture, Hoi An old town,
a Central Highlands rong house with gongs, and a Mekong floating market.

Use the Hoc Vui A1 adventure-paper language: teal sea, fresh greens, rice
fields, soft mountains, forests, rivers, warm sunlight, hand-painted
children's atlas. Make it one integrated illustration, not a collage of
floating icons. Keep the mainland silhouette legible and leave calm space
around both island groups for deterministic labels. Do not render any text;
labels are added in post-processing.

## Negative prompt

No invented coastline, no missing mainland, no missing Hoang Sa, no missing
Truong Sa, no merged island groups, no fantasy islands, no political border
lines, no maritime claim lines, no yellow route/path connecting locations,
no province labels, no dashboard, no infographic, no logo, no gibberish text,
no fake Vietnamese lettering, no 3D perspective that distorts geography,
no cropped north or south, no watermarks.

## Candidate acceptance checklist

- [x] North-up composition; the full Bắc–Trung–Nam S-shape is recognizable.
- [x] The candidate has no text, fake lettering, route line or watermark.
- [x] Hoàng Sa and Trường Sa are separate and remain in the open sea to the east/southeast.
- [x] Landmark scenes are recognizable but integrated into the landscape, not eight floating stickers.
- [x] The palette and paper-painted finish fit the existing A1 Học Vui game.
- [x] The candidate is retained only as source material; geography is enforced by the validated reference SVG mask in the deterministic build.

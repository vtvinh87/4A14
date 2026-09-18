# Supporting art generation log

- Date: 2026-09-18 (Asia/Ho_Chi_Minh)
- Tool/mode: built-in `image_gen`, one generation call per asset, then local `sharp` resize to runtime WebP.
- Review: every candidate was opened with `view_image`; the contact sheet was reviewed on `#fffbed`. Runtime metadata was checked with `sharp`: all 19 assets are RGBA with real alpha and the runtime pack is 2,036,768 bytes (under the 2MiB target).
- Identity gate: `public/art/fox-pet-alpha.png` was opened first. `fox-welcome` was accepted before generating `fox-guide`; `fox-guide` used the accepted welcome asset as its primary identity reference.
- Style gate: `region-central` was generated and accepted before the other five region vignettes.
- Rejected candidates: none. No placeholder, emoji, checkerboard, text-baked or child-character candidate was accepted.

## Shared prompt

The following shared prompt was prepended to each region/decorative illustration request where applicable:

```text
Use case: illustration-story
Asset type: isolated transparent supporting UI artwork for the Vietnamese elementary-school adventure game Hoc Vui.
Warm hand-painted storybook illustration, fresh leaf greens, turquoise,
warm amber accents, soft readable silhouettes, rich but uncluttered detail.
Real transparent alpha background, no painted checkerboard, no white box.
Complete subject with 8 percent transparent safe padding on every side.
Lighting from upper left; subtle grounded shading, no heavy floating shadow.
No lettering, numbers, logos, watermarks, UI, buttons, borders or map outlines.
No extra character, no human child, no changed mascot identity.
Keep fine details readable at the intended small UI size.
```

## fox-welcome

References: `public/art/fox-pet-alpha.png` (strict mascot identity), `design/progress-map/references/desktop-concept.png` (composition/style), `public/art/progress/vietnam-progress-map-illustrated.png` (palette/material).

```text
Create the fox-welcome supporting asset. Use the exact existing orange fox mascot identity from the identity reference, including cream muzzle and chest, friendly curious eyes, small explorer hat and backpack matching its existing character. Waist-up, holding a small compass, looking left toward the map. Three-quarter pose, inviting expression. No speech bubble. Square 1024x1024 master. Preserve the mascot face, proportions, colors, hat and backpack. No extra character, human child, scenery, lettering, numbers, logos, watermark, UI, buttons, borders or map outlines. Output a genuinely transparent alpha background with ears, compass, backpack and paws fully inside bounds.
```

## fox-guide

References: `design/progress-map/supporting-art/masters/fox-welcome.png` (accepted identity/style), `public/art/fox-pet-alpha.png` (original identity), `design/progress-map/references/desktop-concept.png` (composition).

```text
Create the fox-guide supporting asset using the same accepted fox identity and outfit as fox-welcome. Waist-up, one paw gesturing toward the left, warm small smile. Do not add scenery or text. Square 1024x1024 master, ears and gesturing paw fully inside bounds. Preserve face, cream muzzle/chest, explorer hat, teal scarf and backpack. Genuinely transparent alpha; no extra character, human child, scenery, lettering, numbers, logos, watermark, UI, buttons, borders or map outlines.
```

## region-central

References: `public/art/progress/vietnam-progress-map-illustrated.png` (palette and Huế landmark), `design/progress-map/references/desktop-concept.png` (composition).

```text
Create region-central as the accepted material/style sample. Show a recognizable Ngọ Môn gate of Huế imperial city as the dominant subject, characteristic tiered roofs, warm ochre and red colors, trees and a quiet suggestion of water. Use the Huế landmark in the map as visual reference. One coherent place, no invented hybrid temple. Compact landscape 3:2 vignette, no fox. Transparent edges, readable around 232x150px, no rectangular background, checkerboard pixels, white box, human child, lettering, numbers, logos, watermark, UI, buttons, borders or map outlines.
```

## region-local

References: `design/progress-map/supporting-art/masters/region-central.png` (accepted style), `public/art/progress/vietnam-progress-map-illustrated.png` (palette/material), `design/progress-map/references/desktop-concept.png` (composition).

```text
Create region-local: a welcoming small Vietnamese primary-school courtyard, shade tree, garden and short path. No readable signs, no children or real school branding. Compact storybook vignette, landscape 3:2, no fox. Match the accepted region-central material; keep all subject matter complete inside transparent safe padding and do not add text or logos.
```

## region-north

References: `design/progress-map/supporting-art/masters/region-central.png`, `public/art/progress/vietnam-progress-map-illustrated.png`, `design/progress-map/references/desktop-concept.png`.

```text
Create region-north: a recognizable Lung Cu flag tower on a northern Vietnamese mountain, green terraced slopes. If a flag is visible, use a small Vietnamese red flag with one yellow five-point star; no lettering. Preserve reference architecture, compact 3:2 vignette, no fox and no invented landmark.
```

## region-delta

References: `design/progress-map/supporting-art/masters/region-central.png`, `public/art/progress/vietnam-progress-map-illustrated.png`, `design/progress-map/references/desktop-concept.png`.

```text
Create region-delta: a recognizable Khue Van Cac pavilion at Van Mieu, warm red timber upper floor on pale supports, leafy northern Vietnamese garden and lotus water. Preserve recognizable architecture from the map reference. Compact 3:2 vignette, no fox, no text or logo.
```

## region-highlands

References: `design/progress-map/supporting-art/masters/region-central.png`, `public/art/progress/vietnam-progress-map-illustrated.png`, `design/progress-map/references/desktop-concept.png`.

```text
Create region-highlands: a Central Highlands Vietnamese communal rong house with its distinctive tall steep thatched roof, small gongs and lush plants. Respect the reference building silhouette. Compact 3:2 vignette, no fox and no caricature people.
```

## region-south

References: `design/progress-map/supporting-art/masters/region-central.png`, `public/art/progress/vietnam-progress-map-illustrated.png`, `design/progress-map/references/desktop-concept.png`.

```text
Create region-south: Mekong Delta floating market with two wooden boats carrying colorful fruit, coconut palms and gentle turquoise water. Friendly storybook atmosphere, no text and no people. Compact 3:2 vignette, no fox.
```

## landmark-hoa-lu

Generated with built-in `image_gen` after the UI review found that the shared regional vignette was not specific enough for this landmark. References: `public/art/progress/vietnam-progress-map-illustrated.png` (palette/material), `design/progress-map/references/desktop-concept.png` (composition).

```text
Create a distinct, recognizable Cố đô Hoa Lư landmark vignette for a child-friendly illustrated atlas. Show an ancient Hoa Lư citadel gate and low historic stone-brick architecture nestled among dramatic pale limestone mountains, leafy trees and a small lotus-water accent. Warm hand-painted gouache and watercolor children's-book atlas style, compact landscape 3:2, genuinely transparent background with soft irregular painted edges. No fox, people, political symbols, map outlines, labels, lettering, numbers, logos, watermark, UI, border, Khuê Văn Các, Huế/Ngọ Môn or Hội An street.
```

## landmark-kim-lien

Generated with built-in `image_gen` after the UI review found that the shared regional vignette was not specific enough for this landmark. References: `public/art/progress/vietnam-progress-map-illustrated.png` (palette/material), `design/progress-map/references/desktop-concept.png` (composition).

```text
Create a distinct, recognizable Làng Sen Kim Liên landmark vignette for a child-friendly illustrated atlas. Show a simple traditional village house with warm tiled roof, bamboo grove, blooming pink lotus flowers and broad lotus leaves in a small pond, with a gentle countryside garden. Warm hand-painted gouache and watercolor children's-book atlas style, compact landscape 3:2, genuinely transparent background with soft irregular painted edges. No fox, people, political symbols, map outlines, labels, lettering, numbers, logos, watermark, UI, border, Khuê Văn Các, Huế/Ngọ Môn, Hội An lantern street or Hoa Lư gate.
```

## landmark-hoi-an

Generated with built-in `image_gen` after the UI review found that the shared regional vignette was not specific enough for this landmark. References: `public/art/progress/vietnam-progress-map-illustrated.png` (palette/material), `design/progress-map/references/desktop-concept.png` (composition).

```text
Create a distinct, recognizable Phố cổ Hội An landmark vignette for a child-friendly illustrated atlas. Show a compact row of ochre-yellow historic shophouses with dark wooden shutters, tiled roofs, a small covered bridge silhouette and colorful silk lanterns beside a calm river with a little boat accent. Warm hand-painted gouache and watercolor children's-book atlas style, compact landscape 3:2, genuinely transparent background with soft irregular painted edges. No fox, people, political symbols, map outlines, labels, lettering, numbers, logos, watermark, UI, border, Huế/Ngọ Môn, Khuê Văn Các, Hoa Lư gate or modern city.
```

## landmark-lung-cu

Generated with built-in `image_gen` on 2026-09-18. Runtime optimized with `sharp` at 720×480 WebP quality 72 to keep the full support pack under 2MiB. References: `public/art/progress/vietnam-progress-map-illustrated.png` (palette/material), `design/progress-map/references/desktop-concept.png` (composition/style).

```text
Use case: illustration-story
Asset type: transparent supporting artwork for the Học Vui Vietnamese elementary-school adventure map.
Primary request: Create a distinct, recognizable Cột cờ Lũng Cú landmark vignette.
Scene/backdrop: A northern Vietnamese mountain landscape with compact dramatic green slopes and soft irregular transparent painted edges.
Subject: The Lũng Cú flag tower standing on Núi Rồng, with its recognizable tall tower silhouette, restrained Vietnamese red flag with one yellow five-point star, and a small blue-green suggestion of Hồ Lô Lô below.
Style/medium: warm hand-painted gouache and watercolor children's-book atlas illustration, matching the existing Học Vui progress-map supporting-art style.
Composition/framing: compact landscape 3:2 vignette, complete subject inside an 8 percent transparent safe padding, readable at small UI size and when enlarged.
Lighting/mood: warm upper-left light, calm welcoming sense of discovery.
Constraints: genuinely transparent alpha background, no white box, checkerboard pixels, clipped edges, extra characters, human child, generic pagoda, unrelated tower, map outlines, lettering, numbers, logos, watermark, UI, buttons, border or emoji.
Avoid: Huế/Ngọ Môn, Khuê Văn Các, Hoa Lư gate, Hội An lantern street and invented hybrid architecture.
```

## landmark-khue-van-cac

Generated with built-in `image_gen` on 2026-09-18. Runtime optimized with `sharp` at 720×480 WebP quality 72. References: `public/art/progress/vietnam-progress-map-illustrated.png` (palette/material), `design/progress-map/references/desktop-concept.png` (composition/style).

```text
Use case: illustration-story
Asset type: transparent supporting artwork for the Học Vui Vietnamese elementary-school adventure map.
Primary request: Create a distinct, recognizable Khuê Văn Các landmark vignette at Văn Miếu–Quốc Tử Giám.
Scene/backdrop: A quiet northern Vietnamese heritage garden with soft irregular transparent painted edges, a small lotus-water accent and leafy trees.
Subject: Khuê Văn Các, the red timber pavilion with pale lower supports, two-tier tiled roof, and four round window openings with radiating wooden bars suggesting the star Khuê.
Style/medium: warm hand-painted gouache and watercolor children's-book atlas illustration, matching the existing Học Vui progress-map supporting-art style.
Composition/framing: compact landscape 3:2 vignette, complete pavilion inside an 8 percent transparent safe padding, readable at small UI size and when enlarged.
Lighting/mood: gentle upper-left light, calm welcoming sense of learning and discovery.
Constraints: genuinely transparent alpha background, no white box, checkerboard pixels, clipped edges, extra characters, human child, pagoda, Huế/Ngọ Môn gate, Hoa Lư citadel, map outlines, lettering, numbers, logos, watermark, UI, buttons, border or emoji.
Avoid: generic red temple, Hội An lantern street and invented hybrid architecture.
```

## landmark-hue

Generated with built-in `image_gen` on 2026-09-18. Runtime optimized with `sharp` at 720×480 WebP quality 72. References: `public/art/progress/vietnam-progress-map-illustrated.png` (palette/material), `design/progress-map/references/desktop-concept.png` (composition/style).

```text
Use case: illustration-story
Asset type: transparent supporting artwork for the Học Vui Vietnamese elementary-school adventure map.
Primary request: Create a distinct, recognizable Cố đô Huế landmark vignette.
Scene/backdrop: A calm central-Vietnam heritage setting with soft irregular transparent painted edges, leafy trees and a small quiet water accent.
Subject: Ngọ Môn gate of the Huế Imperial City, with its characteristic broad ochre base, red imperial gate pavilion, layered tiled roofs and balanced central arch.
Style/medium: warm hand-painted gouache and watercolor children's-book atlas illustration, matching the existing Học Vui progress-map supporting-art style.
Composition/framing: compact landscape 3:2 vignette, complete gate inside an 8 percent transparent safe padding, readable at small UI size and when enlarged.
Lighting/mood: warm upper-left light, serene and welcoming sense of history.
Constraints: genuinely transparent alpha background, no white box, checkerboard pixels, clipped edges, extra characters, human child, generic pagoda, Khuê Văn Các, Hoa Lư gate, Hội An shophouses, map outlines, lettering, numbers, logos, watermark, UI, buttons, border or emoji.
Avoid: invented hybrid palace, modern city skyline and Lũng Cú tower.
```

## landmark-tay-nguyen-rong-house

Generated with built-in `image_gen` on 2026-09-18. Runtime optimized with `sharp` at 720×480 WebP quality 72. References: `public/art/progress/vietnam-progress-map-illustrated.png` (palette/material), `design/progress-map/references/desktop-concept.png` (composition/style).

```text
Use case: illustration-story
Asset type: transparent supporting artwork for the Học Vui Vietnamese elementary-school adventure map.
Primary request: Create a distinct, recognizable Nhà rông Tây Nguyên landmark vignette.
Scene/backdrop: A Central Highlands Vietnamese village setting with a small clearing, tropical greenery and soft irregular transparent painted edges.
Subject: A traditional communal nhà rông with a tall steep thatched roof, raised wooden floor, strong timber posts, warm woven details and a couple of small gong accents near the entrance; the building is the clear subject.
Style/medium: warm hand-painted gouache and watercolor children's-book atlas illustration, matching the existing Học Vui progress-map supporting-art style.
Composition/framing: compact landscape 3:2 vignette, complete building inside an 8 percent transparent safe padding, readable at small UI size and when enlarged.
Lighting/mood: warm upper-left light, welcoming community feeling, no people required.
Constraints: genuinely transparent alpha background, no white box, checkerboard pixels, clipped edges, extra characters, human child, caricature people, generic modern stilt house, political symbols, map outlines, lettering, numbers, logos, watermark, UI, buttons, border or emoji.
Avoid: Hội An houses, Huế gate, Hoa Lư architecture, invented hybrid roof and modern concrete building.
```

## landmark-mekong-floating-market

Generated with built-in `image_gen` on 2026-09-18. Runtime optimized with `sharp` at 720×480 WebP quality 72. References: `public/art/progress/vietnam-progress-map-illustrated.png` (palette/material), `design/progress-map/references/desktop-concept.png` (composition/style).

```text
Use case: illustration-story
Asset type: transparent supporting artwork for the Học Vui Vietnamese elementary-school adventure map.
Primary request: Create a distinct, recognizable Chợ nổi Cái Răng / Mekong floating-market landmark vignette.
Scene/backdrop: Calm turquoise river in the Mekong Delta with soft irregular transparent painted edges, coconut palms and a warm dawn atmosphere.
Subject: Two or three wooden boats floating close together, visibly carrying colorful tropical fruit; include upright poles with produce displayed on them to evoke the local cây bẹo way of showing what a boat sells.
Style/medium: warm hand-painted gouache and watercolor children's-book atlas illustration, matching the existing Học Vui progress-map supporting-art style.
Composition/framing: compact landscape 3:2 vignette, complete boats and fruit inside an 8 percent transparent safe padding, readable at small UI size and when enlarged.
Lighting/mood: soft upper-left golden morning light, lively but peaceful discovery.
Constraints: genuinely transparent alpha background, no white box, checkerboard pixels, clipped edges, extra characters, human child, busy land market, modern city skyline, map outlines, lettering, numbers, logos, watermark, UI, buttons, border or emoji.
Avoid: generic beach scene, Hội An river street, Huế gate and invented hybrid boats.
```

## panel-foliage

References: `design/progress-map/references/desktop-concept.png` (composition), `public/art/progress/vietnam-progress-map-illustrated.png` (palette/material), `public/art/fox-pet-alpha.png` (style only).

```text
Create panel-foliage: a low horizontal decorative footer only, with small tropical leaves clustered at the lower corners and subtle water ripples along the bottom. Keep the center 60 percent mostly transparent. Wide 3:1 composition. No signposts, words, buildings, characters, fox, islands, logos, borders, UI or map outlines. Genuinely transparent alpha.
```

## compass-start

References: `design/progress-map/references/desktop-concept.png`, `public/art/progress/vietnam-progress-map-illustrated.png`, `public/art/fox-pet-alpha.png` (compass identity reference).

```text
Create compass-start: a single compact adventure compass with a warm brass rim and cream face, dark teal simple direction needle. Thick clean silhouette readable at 32px. Square 1024x1024 master, centered transparent cutout. No letters, numerals, logos, watermark, UI, buttons, border, map, character, white box or checkerboard pixels.
```

## book-progress

References: `design/progress-map/references/desktop-concept.png`, `public/art/progress/vietnam-progress-map-illustrated.png`, `public/art/fox-pet-alpha.png` (style reference).

```text
Create book-progress: a single friendly open book, teal cover and warm cream blank pages, slight storybook depth, crisp simple silhouette readable at 24px. Square 1024x1024 master, centered transparent cutout. No glyphs, text or numerals; no logos, watermark, UI, buttons, border, map, character, white box or checkerboard pixels.
```

## Runtime optimization

Masters remain PNG under `design/progress-map/supporting-art/masters/`. Runtime files are WebP alpha under `public/art/progress/support/`, resized with `sharp` to the dimensions in `manifest.json`. No source map, concept PNG or contact sheet is in the runtime allowlist.

# Học Vui — Lesson artwork prompt set

## Phase A1a scope

Bộ prompt này dùng cho asset raster local của lesson card Học Vui. A1a chỉ tạo `lesson-01` và `lesson-07` để kiểm tra pipeline. Hai prompt dùng cùng một vocabulary hình ảnh; các bài còn lại chưa được tạo.

## Prompt chung

```text
Use case: stylized-concept
Asset type: vertical educational game lesson-card artwork, original raster illustration
Scene/backdrop: a real Vietnamese place, landscape, object, or practice represented as a friendly visual study anchor; no invented geography or unsupported historical claim
Style/medium: soft 2.5D diorama illustration, slightly elevated viewpoint, clear foreground/midground/background layers, rounded shapes, gentle outlines, tactile materials, polished game art for children around age 9, not hard photorealism
Composition/framing: portrait 768x1024 canvas, subject kept inside an 8% safe margin on all sides, readable at a narrow left panel in a two-column lesson card, balanced focal point, no important detail at the lower-right badge area
Lighting/mood: bright, calm, curious, welcoming daylight with soft shadows and gentle depth
Color palette: Học Vui teal-blue, discovery yellow, warm cream, plus the lesson theme palette; moderate saturation and harmonious contrast
Materials/textures: paper-like educational props, softly painted wood, fabric, stone, water, foliage, and regional materials only when visually neutral and supported by the anchor
Text (verbatim): ""
Constraints: original artwork; no text, letters, numbers, captions, readable signs, logo, watermark, fake writing, or UI elements; no Học Vui fox pet or mascot; no portrait of a named historical person; preserve a clean silhouette and generous safe margins
Avoid: photorealistic stiffness, violence, weapons, political symbols, copied web imagery, culturally specific clothing or ritual details not confirmed by reviewed content, unsupported dates/borders/statistics, landmark mashups, duplicate pet characters, checkerboard-looking background
```

## Avoid list áp dụng cho mọi asset

- Không chữ giả, chữ Latin/Vietnamese, số bài, nhãn bản đồ, biển hiệu, watermark hoặc logo.
- Không vẽ Cáo Nhỏ/pet, mascot hoặc nhân vật giống pet.
- Không dựng chân dung Vua Hùng, nhân vật lịch sử cụ thể, cảnh bạo lực hoặc vũ khí.
- Không biến truyền thuyết, mô-típ visual-only hoặc `needs-content-review` thành fact lịch sử/địa lí.
- Không gán trang phục, nghi lễ, hoa văn hoặc cộng đồng cụ thể khi chưa có content review.
- Không ghép sai địa danh; không dùng landmark không liên quan để làm một cảnh “Việt Nam chung chung”.
- Không dùng ảnh web, phong cách sao chép nguyên ảnh, fake transparency/checkerboard, crop mất chủ thể hoặc bố cục quá sát mép.

## Prompt đầy đủ — lesson-01

```text
Use case: stylized-concept
Asset type: vertical educational game lesson-card artwork for Học Vui
Primary request: create an original portrait illustration of an explorer's learning desk for “Làm quen với phương tiện học tập môn Lịch sử và Địa lí”. The visual anchor is a real classroom-style study setup using the reviewed learning tools only.
Scene/backdrop: a warm, tidy discovery desk seen from a slightly elevated angle, with a softly abstract teal-and-cream learning-space backdrop
Subject: one central open map, a simple map legend panel without readable marks, a timeline strip with abstract non-text ticks, a small bar-chart-like data graphic without numbers, and a handheld magnifying glass; arrange them as study tools rather than decorative clutter
Style/medium: soft 2.5D diorama illustration, rounded shapes, gentle outlines, tactile paper and wood, polished educational game art for children around age 9, moderate saturation, not photorealistic
Composition/framing: portrait 768x1024, clear foreground desk edge and layered midground tools, central focal cluster, all important objects inside an 8% safe margin, leave the lower-right area visually calm for an HTML lesson-number badge, no text anywhere
Lighting/mood: bright morning daylight, soft shadows, curious and welcoming
Color palette: Học Vui teal-blue, discovery yellow, warm cream, muted leaf green and paper coral accents
Materials/textures: matte paper map, softly painted wooden desk, small glass lens, cloth notebook cover; no readable markings
Text (verbatim): ""
Constraints: original artwork; no letters, words, numbers, captions, readable map labels, logo, watermark, fake writing, UI controls, or pet mascot; keep the map and study tools generic enough to avoid unsupported geography; this is a visual learning-tools anchor, not a playable lesson screen
Avoid: photorealistic stiffness, dense infographic text, invented place names, precise statistics, historical portraits, copied textbook page, checkerboard background, cropped tools, cluttered composition
```

## Prompt đầy đủ — lesson-07

```text
Use case: stylized-concept
Asset type: vertical educational game lesson-card artwork for Học Vui
Primary request: create an original portrait illustration of the reviewed visual anchor for “Đền Hùng và lễ Giỗ Tổ Hùng Vương”: a hilltop temple setting, incense smoke, a respectful palanquin procession moving toward the upper temple, and simple ceremonial offerings. Do not depict a named ruler or add unreviewed historical details.
Scene/backdrop: a calm green hill with a modest Vietnamese temple complex suggested in layered silhouettes, a clear path rising toward the upper temple, soft distant hills, no identifiable extra landmark
Subject: a small procession carrying a palanquin along the path toward the upper temple, a restrained incense-offering moment near the destination, and simple ceremonial offerings; figures are seen from behind or at small scale, with no identifiable historical face
Style/medium: soft 2.5D diorama illustration, slightly elevated viewpoint, rounded forms, gentle outlines, tactile stone/wood/foliage, polished educational game art for children around age 9, respectful and calm, not photorealistic
Composition/framing: portrait 768x1024, foreground path and foliage, midground procession, upper-temple focal point in the upper middle, layered depth, all key forms inside an 8% safe margin, leave the lower-right area visually calm for an HTML lesson-number badge, no text anywhere
Lighting/mood: warm early daylight with soft volumetric incense haze, reverent but child-friendly, peaceful rather than dramatic
Color palette: Học Vui teal-blue and warm cream with heritage coral, muted jade, terracotta roof accents, and discovery yellow highlights
Materials/textures: softly painted hill grass, stone steps, wood and tile suggested without exact architectural claims, fabric and incense smoke kept simple and non-specific
Text (verbatim): ""
Constraints: original artwork; no letters, words, numbers, captions, signboards, logo, watermark, fake writing, pet mascot, portrait of Vua Hùng, battle imagery, weapons, political symbols, or unsupported temple details; keep the visual boundary to the reviewed location/festival anchor
Avoid: fantasy palace, modern festival branding, exaggerated crowds, invented costumes, exact unreviewed ritual choreography, copied photograph, checkerboard background, cropped temple or procession
```

## Quy ước cho 27 bài còn lại

Các bài dưới đây chỉ có record trong manifest và chưa tạo PNG trong phase A1a. Khi tạo batch tiếp theo, dùng Prompt chung rồi thay `Primary request`, `Scene/backdrop`, `Subject` bằng đúng `visualAnchor` trong manifest; giữ nguyên `theme` và `referenceStatus`, không nâng certainty:

| ID | Theme | Reference status | Trạng thái A1a |
|---|---|---|---|
| `lesson-02` | `local` | `needs-content-review` | chưa tạo |
| `lesson-03` | `local` | `needs-content-review` | chưa tạo |
| `lesson-04` | `north-mountains` | `visual-reference-only` | chưa tạo |
| `lesson-05` | `north-mountains` | `visual-reference-only` | chưa tạo |
| `lesson-06` | `north-mountains` | `needs-content-review` | chưa tạo |
| `lesson-08` | `red-river` | `visual-reference-only` | chưa tạo |
| `lesson-09` | `red-river` | `visual-reference-only` | chưa tạo |
| `lesson-10` | `red-river` | `needs-content-review` | chưa tạo |
| `lesson-11` | `red-river` | `needs-content-review` | chưa tạo |
| `lesson-12` | `red-river` | `visual-reference-only` | chưa tạo |
| `lesson-13` | `red-river` | `visual-reference-only` | chưa tạo |
| `lesson-14` | `red-river` | `visual-reference-only` | chưa tạo |
| `lesson-15` | `central-coast` | `visual-reference-only` | chưa tạo |
| `lesson-16` | `central-coast` | `needs-content-review` | chưa tạo |
| `lesson-17` | `central-coast` | `needs-content-review` | chưa tạo |
| `lesson-18` | `central-coast` | `visual-reference-only` | chưa tạo |
| `lesson-19` | `central-coast` | `visual-reference-only` | chưa tạo |
| `lesson-20` | `highlands` | `visual-reference-only` | chưa tạo |
| `lesson-21` | `highlands` | `needs-content-review` | chưa tạo |
| `lesson-22` | `highlands` | `needs-content-review` | chưa tạo |
| `lesson-23` | `highlands` | `needs-content-review` | chưa tạo |
| `lesson-24` | `south` | `visual-reference-only` | chưa tạo |
| `lesson-25` | `south` | `visual-reference-only` | chưa tạo |
| `lesson-26` | `south` | `needs-content-review` | chưa tạo |
| `lesson-27` | `south` | `visual-reference-only` | chưa tạo |
| `lesson-28` | `south` | `needs-content-review` | chưa tạo |
| `lesson-29` | `south` | `visual-reference-only` | chưa tạo |

The remaining records are registration/provenance only until their image prompt is separately reviewed and their PNG passes the same size, alpha, text, watermark, subject-drift, and visual QA checks.


## Final generation provenance

Exact ImageGen calls, including candidate iterations, are archived in `generation-prompts.md`. Final selected files and hashes are in `reference-ledger.md`. Coordinator generated 02/03/06/10/11/16/17/21/22/23/26/28 using the bounded PDF visual review; executor generated the remaining files. Runtime referenceStatus remains unchanged.

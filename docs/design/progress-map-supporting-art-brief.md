# Supporting art brief — Bản đồ tiến bộ

Đọc cùng `docs/superpowers/plans/2026-09-18-progress-map-luna-implementation.md`. Các ảnh này làm phong phú panel; không vẽ lại bản đồ, không phủ thêm cảnh quan lên lãnh thổ. Dùng ImageGen built-in sau khi đọc skill imagegen trong session. CLI fallback chỉ khi user cho phép; không yêu cầu user gửi key qua chat.

## Reference bắt buộc

- `design/progress-map/references/mobile-concept.png`: chất liệu và bố cục panel mobile, bỏ nhân vật bé gái.
- `design/progress-map/references/desktop-concept.png`: Cáo Nhỏ, vignette vùng, cây lá chân panel.
- `public/art/fox-pet-alpha.png`: identity mascot ưu tiên cao nhất; mở ảnh trước khi gọi tool.
- `public/art/progress/vietnam-progress-map-illustrated.png`: palette, chất liệu và các công trình đã có.

Mở và xem mọi reference đưa vào generation. Không gửi dữ liệu/tài khoản trẻ. Source concept chỉ là reference, không được crop nguyên UI rồi dùng làm asset.

## Danh mục phải hoàn tất

Master lưu `design/progress-map/supporting-art/masters/`, candidate ở `candidates/`; runtime PNG alpha hoặc WebP alpha trong `public/art/progress/support/`. Registry dùng tên basename dưới đây, extension thống nhất sau optimize và ghi manifest.

| ID/basename | Master gợi ý | Vai trò và bố cục | Runtime tối đa |
|---|---|---|---|
| fox-welcome | 1024×1024 alpha | Cáo cầm la bàn, nhìn sang trái về map, nửa thân | 640×640, 200KiB |
| fox-guide | 1024×1024 alpha | Cùng cáo, gesture giới thiệu, góc nhìn tương tự welcome | 480×480, 160KiB |
| region-local | 1536×1024 alpha | Sân trường Việt Nam nhỏ, cây và đường đi, không logo/biển chữ | 720×480, 220KiB |
| region-north | 1536×1024 alpha | Cột cờ Lũng Cú, núi, ruộng bậc thang; không công trình bịa | 720×480, 220KiB |
| region-delta | 1536×1024 alpha | Khuê Văn Các, hồ sen và cây; hình dáng nhận ra được | 720×480, 220KiB |
| region-central | 1536×1024 alpha | Ngọ Môn Huế chủ đạo, gợi bờ nước; không ghép thành di tích giả | 720×480, 220KiB |
| region-highlands | 1536×1024 alpha | Nhà rông và cồng chiêng, cây xanh, không chữ | 720×480, 220KiB |
| region-south | 1536×1024 alpha | Chợ nổi, thuyền trái cây, cây dừa, sông nước | 720×480, 220KiB |
| panel-foliage | 1536×512 alpha | Cây lá hai góc và gợn nước, khoảng giữa thoáng | 900×300, 140KiB |
| compass-start | 1024×1024 alpha | Một la bàn game đơn giản, không chữ, đọc rõ ở 32px | 192×192, 60KiB |
| book-progress | 1024×1024 alpha | Sách mở màu teal, không chữ, đọc rõ ở 24px | 192×192, 60KiB |

Tổng runtime mục tiêu ≤2MiB cho toàn bộ support art. Không tăng file quá lớn để giữ noise vô nghĩa. Nếu optimize làm xấu mặt cáo/di tích, chỉnh size/chất lượng có bằng chứng và báo trade-off, không lặng lẽ phá budget.

11 asset trên là đủ cho màn hình welcome, topic (6 chủ đề), icon header và footer. Landmark panel dùng vignette vùng tương ứng: Lũng Cú→north; Khuê Văn Các/Hoa Lư→delta; Kim Liên/Huế/Hội An→central; nhà rông→highlands; chợ nổi→south. Vignette là ảnh vùng, không gắn alt nhận nhầm là ảnh chính xác địa danh đang chọn. Nếu cần close-up chính xác, dùng artwork gốc làm reference và tạo thêm asset riêng, không gắn hình Huế dưới tên Hội An như minh họa định danh.

## Prompt chung — nối với prompt riêng từng ID

```text
Use case: illustration-story, isolated supporting UI artwork for the
Vietnamese elementary-school adventure game Hoc Vui.
Input roles: existing fox image = strict mascot identity reference;
existing Vietnam map = palette and painterly material reference;
desktop concept = supporting illustration composition reference only.
Warm hand-painted storybook illustration, fresh leaf greens, turquoise,
warm amber accents, soft readable silhouettes, rich but uncluttered detail.
Real transparent alpha background, no painted checkerboard, no white box.
Complete subject with 8 percent transparent safe padding on every side.
Lighting from upper left; subtle grounded shading, no heavy floating shadow.
No lettering, numbers, logos, watermarks, UI, buttons, borders or map outlines.
No extra character, no human child, no changed mascot identity.
Keep fine details readable at the intended small UI size.
```

Prompt riêng (mỗi ID một call, không yêu cầu spritesheet 11 hình):

| ID | Nối nguyên đoạn này với prompt chung |
|---|---|
| fox-welcome | The exact orange fox mascot from the identity reference, cream muzzle and chest, friendly curious eyes, small explorer hat and backpack matching its existing character. Waist-up, holding a small compass, looking left toward the map. Three-quarter pose, inviting expression. No speech bubble. Square composition. |
| fox-guide | The same fox identity and outfit as the accepted fox-welcome image. Waist-up, one paw gesturing toward the left, warm small smile. Do not add scenery or text. Square composition, ears and paws fully inside bounds. |
| region-local | A welcoming small Vietnamese primary-school courtyard, shade tree, garden and short path. No readable signs, no children or real school branding. Compact storybook vignette with softly painted transparent edges. Landscape 3:2. |
| region-north | Recognizable Lung Cu flag tower on a northern Vietnamese mountain, green terraced slopes. Small Vietnamese red flag with one yellow five-point star if flag is visible; no lettering. Preserve reference architecture, compact 3:2 vignette, no fox. |
| region-delta | Recognizable Khue Van Cac pavilion at Van Mieu, warm red timber upper floor on pale supports, leafy northern Vietnamese garden and lotus water. Preserve recognizable architecture from map reference. Compact 3:2 vignette, no fox. |
| region-central | Recognizable Ngo Mon gate of Hue imperial city with its characteristic tiered roofs, warm ochre and red colors, trees and a quiet suggestion of water. Use the Hue landmark in the map as visual reference. One coherent place, no invented hybrid temple. Compact 3:2 vignette, no fox. |
| region-highlands | A Central Highlands Vietnamese communal rong house with its distinctive tall steep thatched roof, small gongs and lush plants. Respect reference building silhouette. Compact 3:2 vignette, no fox and no caricature people. |
| region-south | Mekong Delta floating market with two wooden boats carrying colorful fruit, coconut palms and gentle turquoise water. Friendly storybook atmosphere, no text or people. Compact 3:2 vignette, no fox. |
| panel-foliage | Low horizontal decorative footer only: small tropical leaves clustered at lower corners and subtle water ripples along bottom. Center 60 percent mostly transparent. No signposts, words, buildings, characters or islands. Wide 3:1 composition. |
| compass-start | A single compact adventure compass with a warm brass rim and cream face, dark teal simple direction needle. Thick clean silhouette readable at 32px. No letters or numerals. Square centered transparent cutout. |
| book-progress | A single friendly open book, teal cover and warm cream blank pages, slight storybook depth, crisp simple silhouette readable at 24px. No glyphs, text or numerals. Square transparent cutout. |

## Quy trình tạo và kiểm tra

1. Tạo fox-welcome trước, đối chiếu identity với fox gốc. Khi accept, dùng nó làm reference cho fox-guide. Không dùng ảnh bé gái mobile để dẫn identity.
2. Tạo region-central làm mẫu chất liệu, review cạnh map gốc; dùng style mẫu đã accept cho năm vùng còn lại. Không biến tất cả vùng thành cảnh Huế.
3. Tạo foliage và icons; icon phải kiểm tra ở 24/32px, không chỉ nhìn master 1024px.
4. Mỗi kết quả phải mở bằng view_image; kiểm tra subject complete, alpha thật trên cả nền sáng/tối, không fringe trắng, không chữ giả. Nếu không đạt, edit bằng imagegen và nhắc lại invariants. Không dùng CSS để che lỗi asset.
5. Resize/encode bằng sharp hoặc công cụ ảnh sẵn có; đây là tối ưu kỹ thuật, không tự redraw ảnh. Không sửa file map gốc. Không upscale ảnh nhỏ để giả master.
6. Tạo contact sheet riêng ngoài public, ghi rõ IDs. So sánh cùng scale và cùng nền cream. Ghi accepted/rejected cho từng candidate.
7. Manifest `design/progress-map/supporting-art/manifest.json`: mỗi item có id, sourcePath, runtimePath, width, height, bytes, sha256, alphaVerified, promptPath, references, status. Giá trị lấy từ file thật.
8. Prompt log `generation-log.md`: tool/mode, ngày, prompt đầy đủ, input refs, output paths, review/fix. Không lưu base64 vào Markdown.

## Tích hợp cụ thể

- Welcome desktop: fox-welcome ở trên câu mời, foliage sát đáy panel, không áp min-height tạo khoảng trống giả.
- Welcome mobile: fox-welcome 80–96px bên cạnh một câu mời; không hình bé gái và không đoạn 3 dòng dài như concept AI.
- Selected desktop: vignette vùng ở đầu panel; fox-guide nhỏ 64–80px ở cạnh vignette nếu không che di tích. Nếu bố cục chật, ẩn fox-guide ở landscape thấp; không thay đổi map.
- Selected mobile: thumbnail vùng 56–64px cạnh tên/count; CTA dưới. Footer foliage ẩn.
- Compass/book thay emoji demo. Close, chevron, progress check và marker là CSS/SVG code-native theo hệ icon hiện tại; không cần ImageGen cho ký hiệu chức năng đơn giản.
- Không bake chữ vào ảnh. Ảnh trang trí alt rỗng; tên vùng/địa danh vẫn text HTML. Không thêm animation liên tục để che việc ảnh chưa hòa hợp.

## Return contract cho art worker

Trả ART_READY_FOR_REVIEW với đủ 11 IDs, contact sheet, manifest, log và ảnh đã tối ưu. Báo chính xác asset nào chưa đạt; không gọi toàn bộ pack hoàn tất khi thiếu một ảnh bắt buộc. Parent phải tự xem file và xác nhận trước khi đăng ký offline/cache.

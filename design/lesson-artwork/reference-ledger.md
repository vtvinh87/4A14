# Học Vui — Lesson artwork reference ledger

## Phase A1a

- Ngày: 2026-09-12
- Phạm vi: tạo mẫu pipeline cho `lesson-01` và `lesson-07`.
- Nguồn quyết định: `docs/superpowers/specs/2026-09-12-lesson-artwork-29-design.md`, `docs/superpowers/plans/2026-09-12-lesson-artwork-29.md`, `src/content/lessonArtwork.ts`.
- Nguồn nội dung đã rà soát: `source/mvp-content-reviewed.json`, đối chiếu với `source/lich-su-va-dia-li-4.pdf`.
- Tham chiếu bên ngoài: chưa dùng URL bên ngoài và không tải/nhúng ảnh web trong phase này.
- Quy ước: `referenceStatus` là ranh giới độ chắc chắn của visual anchor, không phải trạng thái playable của lesson.

## Asset state

- `pending-generation`: đã có prompt được duyệt trong phase, chưa có PNG trong workspace.
- `generated-candidate`: PNG đã được ImageGen tạo và đã qua kiểm tra file cơ bản; vẫn chờ visual QA/coordinator review.
- `not-created-in-A1a`: cố ý chưa tạo trong phase mẫu này.

| ID | Theme | Reference status | Visual anchor theo manifest | Nguồn / độ chắc chắn | Asset state |
|---|---|---|---|---|---|
| `lesson-01` | `local` | `confirmed-from-textbook` | Bàn khám phá có bản đồ, trục thời gian, biểu đồ và kính lúp | JSON facts `map`, `sketch`, `data`, `artifact`, `picture`; PDF trang 7–12, trang in 6–11. Chỉ xác nhận nhóm công cụ học tập đã review. | `generated-candidate` |
| `lesson-02` | `local` | `needs-content-review` | Cảnh quan địa phương tổng quát với ghim bản đồ và nhóm cộng đồng nhỏ | PDF mục lục và spec; chưa có content review cho địa phương cụ thể. | `not-created-in-A1a` |
| `lesson-03` | `local` | `needs-content-review` | Cổng di sản/nhà sinh hoạt cộng đồng và một chi tiết thủ công địa phương trung tính | PDF mục lục và spec; chưa có content review cho di sản hoặc thủ công cụ thể. | `not-created-in-A1a` |
| `lesson-04` | `north-mountains` | `visual-reference-only` | Dãy núi xanh, ruộng bậc thang, thung lũng và dòng suối | PDF mục lục và spec; mô-típ vùng chỉ dùng cho hình ảnh, không phải fact bài học. | `not-created-in-A1a` |
| `lesson-05` | `north-mountains` | `visual-reference-only` | Đồi chè, ruộng bậc thang, đường núi và chợ vùng cao tổng quát | PDF mục lục và spec; mô-típ sản xuất tổng quát, chưa dùng làm fact. | `not-created-in-A1a` |
| `lesson-06` | `north-mountains` | `needs-content-review` | Nhà sàn, hoa văn dệt và không gian sinh hoạt cộng đồng; không gán trang phục cho dân tộc cụ thể | PDF mục lục và spec; cần review văn hoá trước khi tạo chi tiết nhận diện. | `not-created-in-A1a` |
| `lesson-07` | `north-mountains` | `confirmed-from-textbook` | Đền trên đồi, khói hương, đoàn rước và lễ vật; không vẽ chân dung Vua Hùng | JSON facts `location`, `festival`; PDF trang 33–36, trang in 32–35. Chỉ xác nhận anchor di tích/nghi lễ ở ranh giới đã review. | `generated-candidate` |
| `lesson-08` | `red-river` | `visual-reference-only` | Sông, đê, ruộng lúa, làng quê và đường chân trời thấp | PDF mục lục và spec; mô-típ vùng, không tự bổ sung địa danh hoặc fact. | `not-created-in-A1a` |
| `lesson-09` | `red-river` | `visual-reference-only` | Ruộng lúa, bến sông, làng nghề và hoạt động sản xuất tổng quát | PDF mục lục và spec; mô-típ thị giác tổng quát. | `not-created-in-A1a` |
| `lesson-10` | `red-river` | `needs-content-review` | Đình làng, cổng làng và chi tiết lễ hội dân gian trung tính | PDF mục lục và spec; chưa xác minh lễ hội/kiến trúc cụ thể. | `not-created-in-A1a` |
| `lesson-11` | `red-river` | `needs-content-review` | Dải sông uốn lượn, bãi bồi, đê và lớp phù sa; không tự thêm hiện vật lịch sử | PDF mục lục và spec; nội dung văn minh/lịch sử chưa review. | `not-created-in-A1a` |
| `lesson-12` | `red-river` | `visual-reference-only` | Cổng thành/công trình lịch sử, mặt hồ và thành phố hiện đại ở hậu cảnh | PDF mục lục và spec; không xác nhận một công trình cụ thể trong phase này. | `not-created-in-A1a` |
| `lesson-13` | `red-river` | `visual-reference-only` | Khuê Văn Các, sân bia và hàng cây; không chèn chữ lên bia | PDF mục lục và spec; dùng làm reference hình dạng, không tự thêm nội dung trên bia. | `not-created-in-A1a` |
| `lesson-14` | `red-river` | `visual-reference-only` | Bản đồ hành trình với thẻ ghi nhớ, la bàn và các huy hiệu vùng | PDF mục lục và spec; minh hoạ ôn tập, không tạo fact mới. | `not-created-in-A1a` |
| `lesson-15` | `central-coast` | `visual-reference-only` | Bờ biển dài, đầm phá, cồn cát và dãy núi sát biển | PDF mục lục và spec; mô-típ địa hình vùng, không khẳng định địa danh. | `not-created-in-A1a` |
| `lesson-16` | `central-coast` | `needs-content-review` | Thuyền đánh cá, ruộng muối, bến cảng và chợ biển tổng quát | PDF mục lục và spec; hoạt động sản xuất cụ thể cần review. | `not-created-in-A1a` |
| `lesson-17` | `central-coast` | `needs-content-review` | Nhà phố ven sông, đèn lồng và đồ thủ công; không gán một lễ hội cụ thể | PDF mục lục và spec; không gán địa danh/lễ hội khi chưa review. | `not-created-in-A1a` |
| `lesson-18` | `central-coast` | `visual-reference-only` | Cổng thành cổ, mái cung điện, sông và cây xanh; không sao chép nguyên ảnh | PDF mục lục và spec; mô-típ hình ảnh, không thay thế fact kiến trúc. | `not-created-in-A1a` |
| `lesson-19` | `central-coast` | `visual-reference-only` | Nhà màu vàng, mái ngói, thuyền gỗ và đèn lồng ven sông | PDF mục lục và spec; reference thị giác, không tự khẳng định chi tiết phố cổ. | `not-created-in-A1a` |
| `lesson-20` | `highlands` | `visual-reference-only` | Cao nguyên đất đỏ, rừng, thác và đường chân trời rộng | PDF mục lục và spec; mô-típ cảnh quan tổng quát. | `not-created-in-A1a` |
| `lesson-21` | `highlands` | `needs-content-review` | Nương rẫy/cánh đồng, đường cao nguyên và khu dân cư tổng quát | PDF mục lục và spec; hoạt động/cộng đồng cụ thể cần review. | `not-created-in-A1a` |
| `lesson-22` | `highlands` | `needs-content-review` | Nhà sinh hoạt cộng đồng, hoa văn dệt và lối mòn lịch sử; không tự gán nhân vật/sự kiện | PDF mục lục và spec; không gán nhân vật hoặc sự kiện lịch sử. | `not-created-in-A1a` |
| `lesson-23` | `highlands` | `needs-content-review` | Bộ cồng chiêng quanh không gian cộng đồng, ánh lửa và bóng người cách điệu | PDF mục lục và spec; cần review ngữ cảnh lễ hội trước khi tạo bản production. | `not-created-in-A1a` |
| `lesson-24` | `south` | `visual-reference-only` | Sông ngòi chằng chịt, kênh rạch, vườn cây và vùng ngập nước | PDF mục lục và spec; mô-típ địa hình vùng, không gắn địa danh. | `not-created-in-A1a` |
| `lesson-25` | `south` | `visual-reference-only` | Ghe thuyền, vườn cây, ruộng và chợ nổi tổng quát | PDF mục lục và spec; mô-típ sản xuất/thương mại tổng quát. | `not-created-in-A1a` |
| `lesson-26` | `south` | `needs-content-review` | Nhà ven sông, chi tiết văn hoá Nam Bộ và biểu tượng ký ức lịch sử trung tính | PDF mục lục và spec; chưa review chi tiết văn hoá hoặc lịch sử. | `not-created-in-A1a` |
| `lesson-27` | `south` | `visual-reference-only` | Đô thị ven sông, cầu, cây xanh và skyline hiện đại; không phụ thuộc vào một logo/biển hiệu | PDF mục lục và spec; không dùng logo/biển hiệu làm claim. | `not-created-in-A1a` |
| `lesson-28` | `south` | `needs-content-review` | Lối vào hầm trong rừng và mặt cắt giáo dục không có cảnh bạo lực | PDF mục lục và spec; trạng thái bắt buộc `needs-content-review`, chưa tạo trong A1a. | `not-created-in-A1a` |
| `lesson-29` | `south` | `visual-reference-only` | Bản đồ tổng hợp sáu vùng, hộ chiếu, la bàn và các mảnh ghép ghi nhớ | PDF mục lục và spec; minh hoạ ôn tập, không tạo fact mới. | `not-created-in-A1a` |

## A1a verification notes

Hai PNG mẫu được tạo bằng built-in ImageGen, mỗi asset một call riêng. Candidate đầu tiên của `lesson-01` bị loại vì chất liệu quá photorealistic; candidate thứ hai được chọn. Candidate đầu tiên của `lesson-07` bị loại vì thêm cờ/phục trang nghi lễ cụ thể; candidate thứ hai được chọn với nhân vật trung tính và kiến trúc tối giản hơn.

| Asset | Workspace path | Output sau resize | Alpha | SHA-256 | Kiểm tra |
|---|---|---:|---|---|---|
| `lesson-01` | `public/art/lessons/lesson-01.png` | 768×1024 RGB | `hasAlpha: no` — ảnh nền kín, không yêu cầu transparency | `c5ead47740d3b3089b94ea5c122bdd121ecd6a6be3f7b8077434182c60ba1160` | file PNG hợp lệ, nhiều màu, không blank; visual QA sơ bộ đạt |
| `lesson-07` | `public/art/lessons/lesson-07.png` | 768×1024 RGB | `hasAlpha: no` — ảnh nền kín, không yêu cầu transparency | `400bd5911e5b85078957c94266487a45cb2d5d2309f2d230e0541f129807f7b0` | file PNG hợp lệ, nhiều màu, không blank; visual QA sơ bộ đạt |

ImageGen trả output gốc 1086×1448 cùng tỉ lệ 3:4; output được resample bằng `sips` về 768×1024 trước khi lưu vào workspace. Kiểm tra pixel read-only cho thấy mỗi ảnh có extrema đầy đủ và hơn 1.000 màu trong mẫu 32×32, không phải ảnh trắng/blank. Hai mẫu vẫn ở trạng thái `generated-candidate`, chờ coordinator visual QA cuối và không làm 27 bài còn lại playable.

## Recovery visual-source review — 2026-09-12

This is a bounded illustration review, not approval of new playable lesson content. Runtime certainty flags remain unchanged. Original PDF text extraction contains mostly watermark text; the following pages were rendered and inspected visually.

| Lessons | PDF pages (1-based) | Observation and production boundary |
|---|---|---|
| 02, 03 | 13, 17 | Local study tasks require locality-specific material. Keep generic landscape/community and heritage motifs; do not name a province or invent a local figure. |
| 06 | 29 | Regional cultural gathering photo. Keep neutral community setting; no invented ethnic dress or named ritual. |
| 10 | 47 | Village, gate, tree and rice-field illustration. Generic village gate and community space are suitable. |
| 11 | 51 | River, alluvial banks and bridge photo. River landscape only; no invented historical artifacts. |
| 16 | 71 | Marine economic activities named in learning objectives. Boat/harbour/salt-field motif is suitable without ethnic attribution. |
| 17 | 74 | Heritage coverage includes Hoi An. Generic riverside architecture/craft motif only, no invented festival. |
| 21 | 90 | Farming and hydropower imagery. General cultivated plateau and rural track; no unreviewed economic claim. |
| 22 | 94 | Community house photo, raised wooden structure with tall thatched roof. Architecture only; no historical person or event. |
| 23 | 98–99 | Communal gong performance photos. Emphasize handheld bronze gongs and simplified community scene; avoid exact ethnic costume/ritual reconstruction. |
| 26 | 109 | Riverside/floating houses. Neutral riverside homes and boats; no invented revolutionary scene. |
| 28 | 119–120 | Tunnel spaces and underground kitchen photos. Simplified entrance/cutaway, not a scale diagram; no weapons, combat or fabricated engineering dimensions. |

The approved implementation plan permits neutral motifs for `needs-content-review`; these page checks support that bounded treatment. They do not promote any of the 27 unreviewed lesson packages.

External reference pages opened through web search (agent-reach routing, native web backend):
- https://vietnam.travel/node/99 — official Vietnam Tourism Hoi An page; riverside shophouses, boats and lantern context. Header image link inspected through web tool; no external image copied to runtime.
- https://vietnam.travel/node/101 — official Vietnam Tourism Hue page; imperial architecture context. Header image link inspected through web tool; no external image copied to runtime.
- https://ich.unesco.org/en/RL/space-of-gong-culture-00120 — discovered but direct retrieval hit anti-bot challenge. Not used as full-page verification; use PDF pages 98–99 for the actual visual review.

## Final asset inventory — 2026-09-12

All 29 PNGs individually viewed by coordinator (existing sample pair also viewed in live cards). No visible text/watermark/pet; 768×1024, RGB opaque. Images are illustrative, not exact architectural/ethnographic reconstructions.

| ID | Bytes | SHA-256 |
|---|---:|---|
| lesson-01 | 1179797 | `c5ead47740d3b3089b94ea5c122bdd121ecd6a6be3f7b8077434182c60ba1160` |
| lesson-02 | 1478358 | `07c7a9e0ec41f4172f6d2b16cb7c5edd74e702f082c766908c97cd3e45013a9e` |
| lesson-03 | 1575294 | `1d1714c4d96194282b2da9dede7f6a8ea0fce20897b849fe59e22b6d5338222c` |
| lesson-04 | 1496121 | `a24aaecddbe69a388c0906f13f91af3e4346bdc338cc7b4e4c98bddf9fecfadf` |
| lesson-05 | 1589482 | `df21a744b043e85af19d1225ef5859100a250c2078767e5f4dfe98a26eef3075` |
| lesson-06 | 1574713 | `4dfd4ef8bd3ed37e2fc2aee541683ced9b78ec7707e754b0e8752c8fb5aa20a0` |
| lesson-07 | 1420357 | `400bd5911e5b85078957c94266487a45cb2d5d2309f2d230e0541f129807f7b0` |
| lesson-08 | 1404996 | `f894d258b0e20d7523214d3ed472bb5423b620e6bd827ea6752992b238a0fe79` |
| lesson-09 | 1413186 | `24bd8f72b9b95b6a0a390c0416e23ab0d2f4ebe73e41fd02e2b1af74b6fde823` |
| lesson-10 | 1594174 | `34e4291b77df917074b726c57b112ae7615071ec3d70620330357bce90d64d4f` |
| lesson-11 | 1362081 | `e34357e51223b621d906ca389a31580f0e86be1912d3b30eb63b501372b53787` |
| lesson-12 | 1328592 | `d81688901e8fdeb84278840f221ad54feb173e399659fdfe83efb65ac0416b35` |
| lesson-13 | 1485469 | `c8b4d74b7c05d64aa39e269037616a5ad6562cdc47caf42cf7cab66b35090cf5` |
| lesson-14 | 1174971 | `b59fab377ec7feee157913fd8c54da8a4dd08fb3e307f6a173de33d7e64d6c3a` |
| lesson-15 | 1187265 | `1cad4d4dea5cf4525f8e5276758349ba1e9293226fa357ccc29f91de026488cf` |
| lesson-16 | 1467256 | `f3b0c61baa50a1f661c5d51f4285fab795431339f7c85948cc9fc5ee55a268ae` |
| lesson-17 | 1452956 | `0293c4e1b27d549fd8d98fe4c491ac684876b0aaf2918cf4bc8ebc69cfe3d858` |
| lesson-18 | 1425396 | `16c10e58007b4dc8377920a08f64e9b6cfc9609ff4b738a87b49b85308e067ee` |
| lesson-19 | 1392032 | `0f05100b051857c5be737d1f38f6557dbac1f62aa2939bb630fbdb158a406e75` |
| lesson-20 | 1642680 | `1ee3c45c39d40c1dc22cbc10b6abf647cf85c63ce0a04539abb7aa596c6ecd0a` |
| lesson-21 | 1583655 | `5711033e3ac656ac67c6cc13033e87d5afc4f2cedd14575676a247452f32a839` |
| lesson-22 | 1614079 | `97136fd6f2e2ca310395598c7837c3411ca8807425eae8afd5f2a1eca8ed174c` |
| lesson-23 | 1304829 | `d878ceb53258229c7ea55f708267ff30c28e7d22d69b39675cd73e160f44319e` |
| lesson-24 | 1570442 | `82d7021ea8d18d92260bcfe7406000aa999baa0fb1b63d12e1dcbfb9474b57d9` |
| lesson-25 | 1423382 | `fe67750393ae491c41b1431ce16a3c6d47399fce415393e0af53d265a7f82f78` |
| lesson-26 | 1615882 | `139a48da7eec70e226f6dd33e6db9896fb669231292c0b13c487c6bb87e5f98b` |
| lesson-27 | 1316868 | `56736451c8105c133b1691aded7767db2b22518c9fc107787d2a08dd5fc0dc06` |
| lesson-28 | 1466426 | `0d25ae63b7163321e836aa42090b2752f439f73d8133efd41ff04cd3e324f13d` |
| lesson-29 | 1289510 | `0215ee3458200c5bcbf8d9040ebd4632f850d21be29895dc4bcbd58cbbaed76f` |

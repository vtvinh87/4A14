# P3 — READY_FOR_REVIEW

Ngày: 2026-09-11  
Checkout: `/Volumes/Pictures/Projects/Hoc_Vui`  
Phạm vi packet: font local/offline + kiểm tra khả năng author Rive skeletal pet + các sửa CSS tablet đã được giao.

## Kết quả

`READY_FOR_REVIEW` cho packet hẹp này. Font đã được bundle local; Service Worker production precache đủ các font và cache version băm cả nội dung build cùng SHA-256 của art/font. Không thêm runtime Rive giả, không biến PNG thành “skeletal”, và không thay fox đã duyệt bằng asset khác.

## Typography và offline

- Dùng Be Vietnam Pro local WOFF2 ở các weight thực `400`, `700`, `800`, `900`.
- Mỗi weight có đủ ba subset `Vietnamese`, `Latin-ext`, `Latin`, khai báo `unicode-range` trong `src/styles.css`; không cần request font từ CDN khi chạy app.
- `font-weight` ngoài dải thực đã được chuẩn hoá: `750 → 700`, `850 → 800`, `1000 → 900`.
- Heading/card title dùng line-height rộng hơn (`1.1`/`1.14`) để tránh cắt dấu; `.view-heading` và `.lesson-topline` có nền sáng, border và shadow cục bộ trên nền cảnh. Ở breakpoint tablet `701–930px`, lesson catalog xếp một cột.
- `vite.config.ts` đưa đủ 12 URL font vào manifest và đưa hash SHA-256 của từng file vào `hoc-vui-offline-<fingerprint>`. Worker chỉ cache explicit allowlist, không có `skipWaiting` hay `location.reload`.

## Nguồn font và giấy phép

Nguồn upstream là [Be Vietnam Pro trên Google Fonts](https://fonts.google.com/specimen/Be+Vietnam+Pro), với mã nguồn font tại [google/fonts/ofl/bevietnampro](https://github.com/google/fonts/tree/main/ofl/bevietnampro). File license được bundle tại [`public/fonts/OFL.txt`](../../public/fonts/OFL.txt) và là SIL Open Font License 1.1; bản upstream dùng trong kiểm tra là [OFL.txt](https://raw.githubusercontent.com/google/fonts/main/ofl/bevietnampro/OFL.txt).

Các URL WOFF2 chính xác đã tải từ Google Fonts CSS API:

| Weight | Vietnamese | Latin-ext | Latin |
| --- | --- | --- | --- |
| 400 | `https://fonts.gstatic.com/s/bevietnampro/v12/QdVPSTAyLFyeg_IDWvOJmVES_Hw4BXoKZA.woff2` | `https://fonts.gstatic.com/s/bevietnampro/v12/QdVPSTAyLFyeg_IDWvOJmVES_Hw5BXoKZA.woff2` | `https://fonts.gstatic.com/s/bevietnampro/v12/QdVPSTAyLFyeg_IDWvOJmVES_Hw3BXo.woff2` |
| 700 | `https://fonts.gstatic.com/s/bevietnampro/v12/QdVMSTAyLFyeg_IDWvOJmVES_HSMIG86Rb0bcw.woff2` | `https://fonts.gstatic.com/s/bevietnampro/v12/QdVMSTAyLFyeg_IDWvOJmVES_HSMIG87Rb0bcw.woff2` | `https://fonts.gstatic.com/s/bevietnampro/v12/QdVMSTAyLFyeg_IDWvOJmVES_HSMIG81Rb0.woff2` |
| 800 | `https://fonts.gstatic.com/s/bevietnampro/v12/QdVMSTAyLFyeg_IDWvOJmVES_HSQI286Rb0bcw.woff2` | `https://fonts.gstatic.com/s/bevietnampro/v12/QdVMSTAyLFyeg_IDWvOJmVES_HSQI287Rb0bcw.woff2` | `https://fonts.gstatic.com/s/bevietnampro/v12/QdVMSTAyLFyeg_IDWvOJmVES_HSQI281Rb0.woff2` |
| 900 | `https://fonts.gstatic.com/s/bevietnampro/v12/QdVMSTAyLFyeg_IDWvOJmVES_HS0Im86Rb0bcw.woff2` | `https://fonts.gstatic.com/s/bevietnampro/v12/QdVMSTAyLFyeg_IDWvOJmVES_HS0Im87Rb0bcw.woff2` | `https://fonts.gstatic.com/s/bevietnampro/v12/QdVMSTAyLFyeg_IDWvOJmVES_HS0Im81Rb0.woff2` |

SHA-256 của các file local được đưa vào fingerprint:

```text
BeVietnamPro-vietnamese-400.woff2  dc085e2fba3414e5c5bf1e6172f921a9f81c5859946a4ed3d63c1e470d96a9e2
BeVietnamPro-latinext-400.woff2   f7a2811e471c2973a1179ce39da3ad6bb8082381aa8d1535ccfcbc3d6d78a052
BeVietnamPro-latin-400.woff2      03d1b589cff172e1a670b3573e731d3380bc326f80cf83b0d3504e3188e2e074
BeVietnamPro-vietnamese-700.woff2 4f58af2d1c3e28a9ba14c51c82db2751d78344b75bdcb34de24a1031ebe59da6
BeVietnamPro-latinext-700.woff2  33d57e5bd840b03921568e08d2be1082d453e55f1ba55f421e41a1aa54e12601
BeVietnamPro-latin-700.woff2     a193dd87699bd2e18ddf72dc271493ea82a23dad9f5c334d9f2a257b1e05fc30
BeVietnamPro-vietnamese-800.woff2 26b241d1d5f489c8a65c1a3c4cdcdb48dd114a9ed7e0c0180182191f087cbe96
BeVietnamPro-latinext-800.woff2  85a2008e6d5f2381a076d36d38771957b118683d0fff3029844737aff6b96a10
BeVietnamPro-latin-800.woff2     7c5d0871188c09339a6eb46948420ed9b11f3d06ea3ff1c5d1cf41b06a3504e7
BeVietnamPro-vietnamese-900.woff2 70b8feb4c47c137c77ba65d3ef73d5eeda852af1d7ce26f307d7853983948795
BeVietnamPro-latinext-900.woff2  8734a69a892ce1efb37eeda024affe833d99f4cde8fce0c0bbfb4afa5255e6b0
BeVietnamPro-latin-900.woff2     b7437222bf15d6be4394c13ec31188e1bf8b9be13e6c38dc4c18ad14511b4888
```

## Glyph coverage evidence

`fc-query`/HarfBuzz trên host không đọc được các WOFF2 subset, nên không dùng chúng làm bằng chứng. CoreText của macOS đã mở từng WOFF2 và kiểm tra glyph ID khác `0` cho các mẫu `Học Vui Địa lí Việt Nam Đặng ơ ư ắ ễ`.

Kết quả union ba subset theo từng weight:

```text
weight=400 combined-subsets-missing=none
weight=700 combined-subsets-missing=none
weight=800 combined-subsets-missing=none
weight=900 combined-subsets-missing=none
```

Browser production origin sạch `http://127.0.0.1:4174/` xác nhận computed family là `"Be Vietnam Pro", ...`, có 12 `@font-face` rules, heading weight `900`, line-height computed `35.2px` ở viewport kiểm tra, và toolbar có background `rgba(255, 251, 237, 0.78)` cùng border `2px`. IAB test harness hiện thiếu đầy đủ `FontFaceSet.load/iterator`, nên `document.fonts.check()` trong IAB không được dùng làm bằng chứng duy nhất; bằng chứng glyph ở trên là kiểm tra coverage thực tế của file.

## Rive skeletal pet — feasibility và handoff brief

Chưa tích hợp Rive trong packet này. Kiểm tra local không tìm thấy `rive`, `rived`, Blender, Inkscape, fonttools, package runtime Rive, hoặc bất kỳ `.riv` nào. [Rive Editor docs](https://rive.app/docs/editor) mô tả Editor/browser app là nơi author/export asset; [Web JS runtime docs](https://rive.app/docs/runtimes/web/web-js) mô tả cách playback `.riv` đã có. Vì vậy checkout hiện không có đường authoring offline có thể kiểm chứng; thêm package runtime mà không có asset authored sẽ không tạo ra skeletal pet thật.

Pipeline bounded cho packet kế tiếp, khi có asset được duyệt:

- Asset: `public/art/fox-pet.riv`, artboard `FoxPet`, nền trong suốt; giữ nguyên fox lông cam, khăn teal, ba lô teal, la bàn và silhouette/biểu cảm của artwork đã duyệt. Không dùng stock fox khác.
- Xương/pivot tối thiểu: `root` (điểm giữa hai chân), `body` (trọng tâm thân), `head` (pivot cổ), `ear_l`, `ear_r`, `arm_l`, `arm_r`, `leg_l`, `leg_r`, `tail_base`, `tail_mid`, `tail_tip`, `scarf`, `backpack`, `compass`. `tail_*` và `scarf` dùng chain mềm; tay/chân giữ attachment không làm lệch ba lô/la bàn.
- Animation clips: `idle`, `greet`, `think`, `celebrate`, `rest`; mỗi clip có loop/non-loop rõ ràng và pose đầu/cuối không làm thay đổi identity.
- State machine: `FoxPetSM`; trigger inputs `tap`, `answerCorrect`, `answerTryAgain`, `openLesson`; boolean `isResting`; number `energy` trong `0..1`. Mapping UI: tap → `greet`, discovery/question → `think`, đúng → `celebrate`, rời activity/ẩn tab → `rest` hoặc pause.
- Runtime packet: chọn một runtime local đã pin (`@rive-app/canvas` hoặc WebGL2), bundle WASM/runtime nếu package yêu cầu, precache `.riv` và mọi runtime asset, cleanup instance khi unmount, tôn trọng reduced-motion/visibility, và kiểm tra offline bằng exact allowlist.

## Verification

```text
npm test -- --run  -> 10 test files, 35 tests passed
npm run typecheck  -> exit 0
npm run build      -> exit 0, Vite 5.4.21
```

Build hiện emit `dist/sw.js`, `dist/offline-manifest.json`, `dist/assets/index-BOLsJM0o.js`, `dist/assets/index-DJy_z1iu.css`, hai lesson JSON và đủ 12 WOFF2. Preview đang chạy trên `http://localhost:4174/`; dev server vẫn ở `http://localhost:4173/`. Coordinator đã kiểm tra visual ở desktop/tablet/mobile và không thấy cắt dấu ở heading/card.

HTTP smoke trên toàn bộ 21 URL trong `dist/offline-manifest.json` trả `200`; hai mẫu font trả `Content-Type: font/woff2`.

## Files trong write-set

- `src/`, gồm offline worker/status, audio visibility, settings focus/recovery, raw progress preservation, lesson/reward/parent pet/status UI, tests và `src/styles.css`.
- `public/fonts/`, gồm 12 WOFF2 subset và `OFL.txt`.
- `vite.config.ts`, `package.json`, `README.md`.
- File handoff này dưới `docs/executor/`.

Không sửa source/design/parent docs, không tạo task/subagent, không Git lifecycle, không deploy.

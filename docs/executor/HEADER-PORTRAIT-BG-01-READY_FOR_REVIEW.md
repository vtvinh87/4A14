# HEADER-PORTRAIT-BG-01 — READY_FOR_REVIEW

## Kết quả

Đã cập nhật header và background theo hướng đã duyệt:

- Logo mới `brand-plaque-clean.png` không còn Cáo Nhỏ chiếm góc; chữ `HỌC VUI` và `Lịch sử & Địa lí 4` vẫn được bake trực tiếp trong ảnh.
- Logo giảm từ kích thước desktop tối đa 320px xuống 275px; tablet dùng 216px; mobile dùng 156px/136px.
- HUD giảm nhẹ nhưng các nút tương tác vẫn giữ touch target tối thiểu 48px.
- Toàn bộ header chuyển thành fixed, nằm trên nội dung khi cuộn; dock vẫn fixed và dialog cài đặt vẫn ở lớp cao hơn.
- Portrait tablet dùng `world-background-portrait.png` qua `<picture>`; landscape giữ background hiện tại.

## Asset evidence

- `public/art/brand-plaque-clean.png`: 1889 × 833, alpha enabled, SHA-256 `6d19c3a248bc59778cb70db253a0deee6dda187952b6a4a490cf0c9154c3f5d4`.
- `public/art/world-background-portrait.png`: 1086 × 1448, opaque, SHA-256 `5976509d010b93cc4978894573e289d9d479b51ddf8c1acd06555e29f23c6039`.

## Thay đổi code

- `src/components/TopHud.tsx`: dùng plaque mới.
- `src/components/WorldScene.tsx`: chọn background dọc native bằng `<picture>` khi `orientation: portrait`.
- `src/styles.css`: fixed header, content offset tránh header, logo/HUD responsive compact, touch target không dưới 48px.
- `vite.config.ts`: precache hai asset mới và đưa hash vào cache fingerprint.

## ImageGen

Đã dùng built-in ImageGen, không dùng CLI. Plaque prompt yêu cầu bảng gỗ 3D trong suốt, chữ tiếng Việt chính xác và tuyệt đối không có fox/mascot. Portrait prompt dùng background hiện tại làm reference, yêu cầu tái bố cục dọc 3:4 với vùng trống cho header và nội dung.

## Verification

- `npm run typecheck` — PASS.
- `npm test -- --run` — PASS: 16 test files, 68 tests.
- `npm run build` — PASS; chỉ còn cảnh báo chunk Three.js lớn hơn ngưỡng 500 kB hiện có.
- `dist/offline-manifest.json` và `dist/sw.js` đều chứa `world-background-portrait.png` và `brand-plaque-clean.png`.
- Browser portrait `768 × 1024`: `currentSrc` là `/art/world-background-portrait.png`; header `position: fixed`; logo rộng khoảng 218px; icon button cao 48px; console error/warn rỗng.
- Browser landscape `1024 × 768`: `currentSrc` là `/art/world-background.png`; header vẫn `position: fixed`; icon button cao 48px; console error/warn rỗng.
- Khi cuộn trang bài học, `scrollY` đạt 453.5px nhưng header vẫn ở `y=10px`, xác nhận header không trôi theo nội dung.

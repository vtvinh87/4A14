# BRAND-PLAQUE-WOW-01 — READY_FOR_REVIEW

## Kết quả

Đã thay bảng gỗ góc trên bên trái bằng asset PNG 3D hoàn chỉnh có sẵn chữ trong ảnh:

- `HỌC VUI`
- `Lịch sử & Địa lí 4`

Asset có bảng gỗ nhiều lớp, chữ 3D vàng/xanh, chi tiết la bàn, bản đồ, lá cây và Cáo Nhỏ để đồng bộ với concept khám phá. Lớp chữ HTML cũ đã được loại bỏ, nên không còn phụ thuộc vào font live để tạo wordmark.

## Thay đổi

- `public/art/brand-plaque-wow.png`: asset PNG 1774 × 887, alpha enabled.
- `src/components/TopHud.tsx`: dùng ảnh logo mới với `alt` đầy đủ; bỏ các span wordmark/subtitle.
- `src/styles.css`: chuyển wrapper sang tỷ lệ asset mới và bỏ CSS chữ overlay; giữ nguyên kích thước menu dưới compact.
- `vite.config.ts`: precache asset mới cho offline mode.
- `public/art/brand-plaque-wow.README.md`: lưu hướng tạo asset và nguồn generated image.

## Evidence

- `npm run typecheck` — PASS.
- `npm test -- --run` — PASS: 16 test files, 68 tests.
- `npm run build` — PASS.
- `dist/offline-manifest.json` và `dist/sw.js` đều chứa `/art/brand-plaque-wow.png`.
- `sips -g hasAlpha public/art/brand-plaque-wow.png` — `hasAlpha: yes`.
- Browser smoke trên `http://127.0.0.1:4174/?brand=plaque-wow-final` — ảnh logo hiển thị ở góc trên trái, đủ hai dòng chữ; accessibility tree nhận diện ảnh là `Học Vui — Lịch sử & Địa lí 4`; menu dưới vẫn ở bản compact.

Build vẫn in cảnh báo chunk Three.js lớn hơn 500 kB; đây là cảnh báo tối ưu bundle hiện có, không phải lỗi của asset logo.

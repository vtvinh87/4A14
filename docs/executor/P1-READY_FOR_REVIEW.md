# P1 — READY_FOR_REVIEW

Ngày thực thi: 10/09/2026  
Checkout: `/Volumes/Pictures/Projects/Hoc_Vui`  
Phạm vi: local-only, không Git lifecycle, không publish/deploy, không Brain_Vault write.

## Artifact đã tạo

- React + TypeScript + Vite scaffold trong `src/`, `index.html`, `vite.config.ts`, `tsconfig.json`.
- Nền cảnh sạch từ asset parent (`public/art/world-background.png`, 1536×1024) qua layer riêng (`src/components/WorldScene.tsx`), không dùng nguyên ảnh concept có chữ làm background.
- Pet cáo cutout RGBA từ asset parent (`public/art/fox-pet-alpha.png`, 1145×1373) qua layer riêng trong `src/components/Pet.tsx`, với idle/greet/think/celebrate/rest và reduced-motion.
- HUD với hộ chiếu, sound toggle, Settings dialog và lối vào Góc phụ huynh.
- Dock điều hướng thật cho Hành trình, Bài học, Nhận dấu, Pet của tôi, Bộ sưu tập.
- Hai view bổ sung bằng action thật: Màn học shell và Góc phụ huynh; tổng cộng 7 view sản phẩm. Cài đặt là overlay, không tính thêm view.
- Hai chặng MVP hiển thị đúng tên từ đặc tả; 27 bài còn lại ghi rõ “chưa có trong bản này”.
- Journey đã nhận correction theo QA: bỏ nhãn bài nổi và bảng gỗ dư; title/CTA dùng backdrop nhỏ + text shadow; path button là entry thật; nút danh mục bên phải compact; caption không còn chui dưới speech/dock; 390px ẩn passport dư nhưng giữ sound/settings/parent với hitbox 48px; tên path có chip tương phản.
- `src/content/types.ts` giữ contract dữ liệu P2; `src/content/catalog.ts` chỉ chứa summary, không invent học liệu.
- `src/progress/storage.ts` chỉ lưu setting P1 trên thiết bị; chưa giả lập tiến độ học.

## Verification evidence

| Command | Exit | Kết quả |
|---|---:|---|
| `npm test` | 0 | 1 test file, 2 tests passed |
| `npm run typecheck` | 0 | `tsc -b` không lỗi |
| `npm run build` | 0 | Vite build tạo `dist/` thành công |
| `curl --fail --silent --show-error --output /dev/null --write-out '... HTTP %{http_code}\\n' http://127.0.0.1:4173/` | 0 | `HTTP 200` |
| `curl --fail --silent --show-error --output /dev/null --write-out '... HTTP %{http_code} ...' http://127.0.0.1:4173/art/world-background.png` | 0 | Asset background `HTTP 200`, 3,185,056 bytes |
| `curl --fail --silent --show-error --output /dev/null --write-out '... HTTP %{http_code} ...' http://127.0.0.1:4173/art/fox-pet-alpha.png` | 0 | Asset fox RGBA `HTTP 200`, 1,837,845 bytes |

Sau packet asset: `public/art/world-background.png` và `dist/art/world-background.png` giữ nguyên SHA-256 `9140df7a3cdbef4be19101945322261a59a64797d495f77e96c47d74d805e1bf` so với `design/assets/world-background.png`.

`design/assets/fox-pet-alpha.png`, `public/art/fox-pet-alpha.png` và `dist/art/fox-pet-alpha.png` giữ nguyên SHA-256 `0141b479768c575217bd3da5acde7aab7785356071cf6129ddd10713ac3bd8e3`; `sips` xác nhận `hasAlpha: yes`.

## Dev server

- URL: `http://localhost:4173/`
- Network URL: `http://192.168.101.114:4173/`
- PTY session: `58034` (đang giữ chạy cho coordinator)

## Giới hạn cần parent nghiệm thu

- Nền cảnh và bản fox transparent parent đã tích hợp vào layer riêng; bản `fox-pet.png` RGB có checkerboard bị bake được loại khỏi runtime. Coordinator đã QA landscape 1024×768, pet alpha và reduced-motion click; header 390×844 đã được chỉnh theo blocker. Quyết định visual acceptance cuối vẫn thuộc parent.
- Chưa implement discovery có source refs, 3 interaction evaluator, session/reward idempotence, backup, offline, bài học playable hoặc tiến độ thật — các phần này thuộc P2/P3.
- Chưa chạy browser screenshot/DOM QA trong delegated background task; smoke hiện tại là HTTP 200, typecheck, test và production build.
- Cài đặt âm thanh chỉ là feedback progressive enhancement; trình duyệt có thể yêu cầu user gesture trước khi mở AudioContext.
- Không tạo `.openai/hosting.json` và không gọi Sites hosting vì packet yêu cầu local-only.

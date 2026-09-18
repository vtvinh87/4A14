# Audit triển khai — bản đồ AI minh họa Việt Nam

- Ngày audit: 18/09/2026
- Workspace: `/Volumes/Pictures/Projects/Hoc_Vui`
- Branch: `codex/bang-tien-bo`
- HEAD trước khi commit: `039558d30ae6658eedc9a21fe984d438f4b63a71`
- Phạm vi: thay artwork runtime của Bản đồ tiến bộ, bỏ route vàng, thêm 8 điểm khám phá và card kể chuyện ngắn.
- Backend, database, schema, progress event và dữ liệu học sinh: không thay đổi.

## Asset và provenance

- Runtime duy nhất: `public/art/progress/vietnam-progress-map-illustrated.png`
- Kích thước: `1840 × 1940`
- Dung lượng: `1785893 bytes` (dưới giới hạn 2 MiB)
- SHA-256: `93bb877ea95e3cf02d8070f1b978f4772b471e430de3b1fb64a3e6e95eb785ba`
- Reference hình học giữ nguyên tại `public/art/progress/vietnam-progress-map.svg` và không nằm trong active offline allowlist.
- AI source: `design/progress-map/ai/vietnam-map-ai-source.png`, SHA-256 `3689a4aa40942299bdcc157f6a0bd039fa5f90adae50a403d397baa5c3f593a2`.
- Prompt: `design/progress-map/ai/vietnam-map-generation-prompt.md`.
- Provenance: built-in ImageGen tạo tranh minh họa từ brief và rasterized reference hỗ trợ bố cục; `sharp` giữ nguyên toàn bộ canvas source, resize `fit: 'fill'` về 1840 × 1940, rồi hậu kỳ hai nhãn Hoàng Sa/Trường Sa bằng SVG text deterministic. Reference SVG chỉ dùng để kiểm tra QA, không dùng làm alpha mask cắt artwork. AI không tự sinh chữ tiếng Việt và output thô không được dùng làm nguồn geometry authoritative.

## Automated gates

| Gate | Kết quả |
| --- | --- |
| `npm run build:progress-map-art` | PASS — tạo đúng PNG 1840×1940 |
| `npm run validate:progress-map` | PASS — `valid reference SVG and illustrated PNG` |
| Focused map/offline tests | PASS — 2 asset tests + 12 offline tests (14/14) |
| `npm run typecheck` | PASS — exit 0 |
| `npm run typecheck:server` | PASS — exit 0 |
| `npm test -- --run --reporter=dot` | PASS — 122 files, 522 tests; 4 integration tests skipped theo cấu hình |
| `npm run build` | PASS — Vite production build exit 0 |
| `git diff --check` | PASS |
| Conflict-marker scan trong scope | PASS |
| Dist retired-art scan | PASS — không có SVG/texture cũ trong manifest, SW hoặc assets runtime |
| Dist credential/database scan | PASS — không có `postgresql://`, `SUPABASE_SERVICE_ROLE_KEY` hoặc `HOC_VUI_DATABASE_URL` |

Build chỉ còn warning chunk size đã biết của các bundle lớn; không có build error.

## Offline và HTTP smoke

- `dist/offline-manifest.json` chỉ liệt kê `/art/progress/vietnam-progress-map-illustrated.png` trong nhóm progress-map và đã cập nhật hash mới.
- `dist/sw.js` chứa PNG mới và không chứa reference SVG hoặc `adventure-paper-texture`.
- Preview Vite tại `127.0.0.1:4174`:
  - `/` — HTTP 200, `text/html`
  - `/art/progress/vietnam-progress-map-illustrated.png` — HTTP 200, `image/png`, `1785893` bytes
  - `/offline-manifest.json` — HTTP 200, `application/json`
- Preview process đã được dừng sau smoke; không đụng tới dev server người dùng đang mở tại `localhost:8888`.
- `localhost:8888/` được kiểm tra read-only — HTTP 200.

## Browser QA bằng CUA

### Viewport đã quan sát

- URL: `http://localhost:8888/`
- Viewport CUA hiện có: `577 × 814`
- Kết quả: PASS cho luồng mobile/tablet đang quan sát.
- Screenshot được xem inline trong CUA; môi trường không cung cấp path file screenshot ổn định để lưu vào repository.

### Checks đã thực hiện

- Dialog hiển thị artwork PNG mới; ảnh có alt nhắc rõ Hoàng Sa và Trường Sa.
- Toàn bộ canvas artwork được hiển thị trong vùng map với `object-fit: contain`: biển, bầu trời, Bắc–Trung–Nam, Hoàng Sa và Trường Sa đều còn trong ảnh; không còn chỉ hiển thị phần đất liền đã bị mask.
- DOM image metrics: `naturalWidth × naturalHeight = 1840 × 1940`, rendered `515 × 542.984375`, `objectFit = contain`, source `/art/progress/vietnam-progress-map-illustrated.png`.
- DOM geometry: 6 topic nodes, 8 landmark controls, mỗi control `44 × 44` CSS px, landmark layer `z-index: 5`.
- DOM geometry: `[data-progress-map-route]` và `polyline` đều `null`.
- Đã mở và đóng card bằng nút/Escape cho: Cột cờ Lũng Cú, Khuê Văn Các, Cố đô Hoa Lư, Cố đô Huế, Nhà rông Tây Nguyên và Chợ nổi miền Tây; mỗi card có đúng heading và focus quay về trigger.
- Card ở mobile nằm trong flow ngay dưới canvas, không phủ node/đảo; khoảng đệm dưới card cũng giữ drawer phía sau không chồng lên card (`overlap: 0` trong lần đo cuối).
- Reduced-motion được kiểm tra bằng test contract và prop `data-reduced-motion`; card/node bị tắt animation/transition khi bật.
- CUA không cung cấp console-inspection API trong phiên này; trong luồng manual không quan sát thấy runtime error mới. Automated suite, production build và HTTP smoke đều sạch.

### Giới hạn QA cần ghi rõ

Môi trường hiện chỉ cho phép viewport in-app browser `577 × 814`; Chrome không khả dụng và CUA không có API resize được hỗ trợ trong phiên này. Vì vậy chưa thể cung cấp screenshot trực tiếp ở `390 × 844`, `1180 × 700` và `1440 × 900`. Các breakpoint CSS, hit-area contract, overflow/layout contract và landscape rule đã được kiểm tra tĩnh qua test/build, nhưng không thay thế hoàn toàn visual sign-off ở ba viewport đó.

## Review boundary

- Một runtime artwork phẳng duy nhất; SVG cũ chỉ là reference/QA.
- Không còn route vàng, province label runtime, map tile, remote image hoặc embedded script.
- Landmark là semantic React button và card, không phải lớp vector/artwork thứ hai.
- Copy landmark ngắn, xưng hô `tớ/cậu`, không có điểm số/xếp hạng và không tạo áp lực so sánh.
- Không thêm endpoint, migration, credential, PII hoặc dữ liệu học sinh.
- Các file AppleDouble `._*` phát sinh trong thư mục asset đã được chuyển khỏi workspace; source/artwork thực vẫn giữ nguyên.

## Handoff status

- Implementation code, asset pipeline, offline wiring, tests, build và local HTTP smoke đã hoàn tất.
- Chưa commit/push/deploy trong audit này; plan ghi rõ Git/hosting handoff chỉ thực hiện khi có quyền Git/hosting cụ thể.
- Spec vẫn giữ trạng thái review cho đến khi có visual sign-off desktop thật; không đánh dấu PASS giả cho các viewport chưa quan sát được.

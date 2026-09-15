# 29 bài học + Bộ sưu tập — READY_FOR_REVIEW

Ngày kiểm tra: 12/09/2026  
Checkout: `/Volumes/Pictures/Projects/Hoc_Vui`  
Phạm vi: local-only; không commit, push, publish hoặc deploy.

## Kết quả triển khai

- `src/content/courseSeeds.ts` có 29 seed bài học, mỗi bài 3 nhiệm vụ × 2 hoạt động; Bài 1 và Bài 7 giữ package đã rà soát trước đó.
- `src/content/packages.ts` biên dịch thành 29 package playable, mọi discovery/activity có `SourceRef` và `reviewStatus: verified`.
- VBT scan được giữ nguyên tại `/Users/macbook/Downloads/VBT  Lịch sử và ĐL L4 scan.pdf`; SHA-256: `4a13ff218c81e17a1c7595659564782a4a41c4ca70ee904bafbb24ae51128b86`.
- Mapping nguồn và phạm vi diễn đạt lại nằm trong [`docs/lesson-content-vbt-2026.md`](../lesson-content-vbt-2026.md).
- `src/content/collectionArtwork.ts`, `src/views/CollectionView.tsx` và `public/art/collection/collection-emblem.png` hoàn thiện gallery 29 thẻ; mọi ảnh runtime đều local, có alt và nằm trong offline allowlist.
- Progress, rewards, parent view, lesson catalog, session validation và offline manifest đã chuyển từ 2 package sang 29 package, vẫn giữ schema progress v1.

## Verification evidence

| Check | Kết quả |
|---|---|
| `npm test` | PASS — 20 test files, 80 tests |
| `npm run typecheck` | PASS — `tsc -b --pretty false` |
| `npm run build` | PASS — Vite build tạo shell, 29 lesson JSON, SW và manifest |
| Manifest lesson packages | 29 URL, 29 file, 87 mission, 174 activity |
| Manifest artwork | 30 URL ảnh: 29 lesson + 1 collection emblem |
| Source IDs trong artifact | `sgk-lsdl4-sample`, `vbt-lsdl4-2026` |
| Collection emblem | SHA-256 public/dist trùng: `9c2a818120bb7d8a8b1368cdc0d920a29ddcb5f1778cba0f531c1cbfb9a6bc97` |
| Browser production preview | PASS ở 390×844, 820×1180, 1440×900; không thấy broken image hoặc pending card |
| Bài 29 smoke flow | PASS: mở card → bắt đầu → discovery → mở locator VBT → chọn đáp án → feedback giải thích đúng |

Build vẫn in cảnh báo chunk Three.js lớn hơn 500 kB; đây là cảnh báo tối ưu kích thước, không làm build thất bại.

# P2 — READY_FOR_REVIEW

Ngày thực thi: 11/09/2026  
Checkout: `/Volumes/Pictures/Projects/Hoc_Vui`  
Phạm vi: local-only, không Git lifecycle, không publish/deploy, không Brain_Vault write. P3 chưa bắt đầu.

## Artifact

- Map `source/mvp-content-reviewed.json` (`bai-1`, `bai-7`) thành `lesson-01`, `lesson-07` trong `src/content/packages.ts`; package gate yêu cầu `reviewed === true`.
- Có 2 bài, 6 nhiệm vụ và 12 hoạt động verified. Discovery/source locator, hint, explanation và `Xem trong sách` được hiển thị trong màn học. Nội dung truyền thuyết giữ nhãn `Theo truyền thuyết`; ghi chú biên tập không hiển thị cho bé.
- Bài 1 hiển thị bảng diện tích năm 2020 trước câu hỏi với đúng các số liệu đã cung cấp; distractor `Lược đồ` gây nhập nhằng đã loại khỏi câu hỏi nhận biết bản đồ.
- `src/game/evaluate.ts`: evaluator thuần cho choice/match/order; mismatch, id lạ, thiếu thẻ và duplicate là invalid; match không phụ thuộc thứ tự cặp và không mutate input.
- `src/game/session.ts`: state machine discovery → answer → feedback → retry/next → mission/lesson complete; double answer bị bỏ qua; hint được ghi trong attempt.
- `src/game/rewards.ts`: completion/stamp union idempotent cho từng nhiệm vụ và bài.
- `src/progress/storage.ts`: schema 1 local-first storage, semantic validation theo package IDs/indices/version/stage/attempts; mỗi attempt được replay đúng activity hiện tại qua evaluator thật để xác nhận option/card IDs, kết quả và feedback, stamp phải khớp đủ mission. Backup JSON có `schemaVersion`/`exportAt`/`progress`, giới hạn 1 MB, validate trước khi replace; corrupt import/load giữ nguyên raw cũ. `importProgressFile` chặn `file.size` trước khi đọc và bắt lỗi read. App giữ recovery mode và hỗ trợ import/reset có xác nhận.
- UI thật trong `LessonView`, `RewardView`, `CollectionView`, `ParentView`, `LessonsView`, `TopHud`: choice/match/order dùng hitbox native và keyboard; order/right match column bắt đầu ở trạng thái xoay ổn định chưa giải; passport, dấu, collection và parent summary phản ánh progress thật; không còn copy phase trong UI.
- App cleanup đã tách khỏi settings effect để toast không bị hủy timer khi đổi cài đặt; write failure vẫn giữ trạng thái trong phiên nhưng hiển thị cảnh báo chưa lưu, không báo đã lưu.

## Verification evidence

| Command/check | Exit | Kết quả |
|---|---:|---|
| `npm test` | 0 | 7 test files, 30 tests passed: evaluator, session/retry/resume, reward idempotence, package/source gate, storage/backup/corrupt semantic validation, forged/repeated-attempt/stamp rejection, file-size/read-error handling, valid full two-lesson save/load roundtrip, scrambled interaction order |
| `npm run typecheck` | 0 | `tsc -b --pretty false` không lỗi |
| `npm run build` | 0 | Vite production build thành công |
| `curl http://127.0.0.1:4173/` | 0 | HTTP 200 |
| `curl http://127.0.0.1:4173/art/world-background.png` | 0 | HTTP 200, 3,185,056 bytes |
| `curl http://127.0.0.1:4173/art/fox-pet-alpha.png` | 0 | HTTP 200, 1,837,845 bytes |
| asset SHA-256 | 0 | Background `9140df7a3cdbef4be19101945322261a59a64797d495f77e96c47d74d805e1bf`; fox alpha `0141b479768c575217bd3da5acde7aab7785356071cf6129ddd10713ac3bd8e3`; dist copies match |

## Delegated browser smoke

- Preview đang chạy tại `http://localhost:4173/`, PTY session `48546`, network URL `http://192.168.110.26:4173/`.
- Đã kiểm tra qua DOM/AX: danh mục → Bài 1 → discovery bắt buộc → choice sai → feedback có giải thích/gợi ý → retry → đúng → match đủ cặp → mission complete → nhiệm vụ order bắt đầu chưa giải; reload tự mở lại lesson/session ở đúng discovery của nhiệm vụ tiếp theo; Parent hiển thị số nhiệm vụ/lượt tự làm/lượt có gợi ý; không có console warning/error trong smoke.
- Coordinator cần chạy walkthrough end-to-end cả hai bài, gồm Bài 7, hoàn thành đủ 3 nhiệm vụ mỗi bài, reward/collection và backup/reset ở UI; đây là nghiệm thu parent, không tuyên bố thay thế bằng unit tests.

## Giới hạn còn lại cho parent/P3

- Chưa triển khai service worker/offline cache, pause audio theo visibility, focus trap/200% typography audit hoặc screenshot matrix; các mục này thuộc P3.
- Storage dùng localStorage với xử lý lỗi/quota và semantic validation; chưa chuyển sang IndexedDB.
- Không sửa `design/`, `source/`, `docs/mvp-technical-spec.md` hay `docs/tien-do-va-phe-duyet.md`; không sửa asset gốc.

# Học Vui — kế hoạch hoàn thiện 29 bài, Bộ sưu tập và icon

Ngày: 2026-09-12  
Trạng thái: đã triển khai và xác minh production preview; `npm test`, `npm run typecheck`, `npm run validate:fox` và `npm run build` đều PASS

## Mục tiêu

- Mở nội dung chơi cho toàn bộ 29 bài đang có artwork trong catalog.
- Dùng các bài tập trong VBT Lịch sử và Địa lí 4 được cung cấp làm nguồn tham chiếu cho Bài 1–27; giữ nguồn SGK hiện có cho các dữ kiện đã rà soát và đối chiếu Bài 28–29 theo SGK.
- Cập nhật danh mục, tiến độ, phần thưởng, backup và offline manifest để mọi bài đều dùng cùng engine, không phá dữ liệu tiến độ cũ.
- Hoàn thiện Bộ sưu tập bằng artwork local có ý nghĩa và thay placeholder/default icon còn sót bằng asset có mô tả, không dùng emoji làm biểu tượng giao diện.

## Ranh giới dữ liệu

- Nội dung học phải có `SourceRef` và trạng thái `verified`; các câu hỏi diễn đạt lại, không chép dài từ tài liệu.
- Bài 1 và Bài 7 giữ các activity hiện có đã được rà soát.
- Các bài mới dùng gói hoạt động ngắn, nhất quán với engine `choice`, `match`, `order`; mỗi bài có 3 nhiệm vụ, mỗi nhiệm vụ có 2 activity.
- VBT được giữ nguyên làm nguồn đọc; không sửa hoặc ghi đè PDF. Ghi lại số trang PDF/trang in và locator trong source data.
- Không tự khẳng định địa giới/số liệu hiện tại khi tài liệu chỉ nói theo sách.

## Các bước triển khai

1. ✅ OCR và đọc mục lục/nội dung VBT, lập dữ liệu bài 1–27 với title, source refs, fact paraphrases và exercise seed; đối chiếu Bài 28–29 với SGK local.
2. ✅ Mở rộng type/content catalog từ hai lesson sang 29 lesson; tạo factory dữ liệu có kiểm tra source refs và không để activity rỗng.
3. ✅ Cập nhật rewards/progress/session validation, danh mục bài học, parent/reward/collection để không còn trạng thái “27 bài chưa có trong bản này”; giữ tương thích progress v1 bằng migration mềm.
4. ✅ Tạo gallery artwork cho Bộ sưu tập và map mỗi stamp/bài với ảnh local; thay default/placeholder icon trong các empty state và teaser bằng ảnh đó, vẫn giữ icon SVG chức năng cho thao tác.
5. ✅ Cập nhật offline manifest, tests content/catalog/progress/UI; chạy typecheck, Vitest, build và kiểm tra asset hashes.
6. ✅ QA production preview tại viewport 390×844, 820×1180 và 1440×900; mở Bài 29, hoàn thành hoạt động đầu tiên, kiểm tra locator VBT và Bộ sưu tập.

## Tiêu chí hoàn tất

- `MVP_LESSON_PACKAGES` có đúng 29 lesson, mỗi lesson 3 mission × 2 activity, tất cả activity verified và source-linked.
- Danh mục không còn bài pending; 29 card mở được và mỗi card có artwork.
- Progress/reward/backup/session validation chấp nhận mọi lesson mới và vẫn đọc progress cũ không có session lỗi.
- Bộ sưu tập không còn empty placeholder mặc định khi có dấu; mọi ảnh/asset đều local, có alt và có trong offline allowlist.
- `npm run typecheck`, `npm test`, `npm run build` đều pass; các URL lesson/artwork trả về 200 trong preview.

## Lưu ý về số lượng bài

VBT scan được cung cấp có mục lục Bài 1–27. Sách giáo khoa local đã dùng trong catalog có Bài 1–29, trong đó Bài 28 là Địa đạo Củ Chi và Bài 29 là Ôn tập. Hai nguồn sẽ được ghi rõ trong `sourceRef` để tránh gắn nhầm trang VBT cho hai bài cuối.

# Học Vui — Thiết kế hệ thống artwork cho 29 bài

Ngày: 2026-09-12  
Trạng thái: Đã duyệt hướng thiết kế; chờ người dùng duyệt spec trước khi triển khai  
Phạm vi: catalog artwork và hiển thị minh hoạ cho toàn bộ 29 bài Lịch sử và Địa lí 4

## 1. Mục tiêu và ranh giới

Mỗi bài trong chương trình 29 bài có một minh hoạ riêng, giàu năng lượng và đồng bộ với giao diện game Học Vui. Minh hoạ mô phỏng các địa điểm, cảnh quan, đồ vật hoặc hoạt động có thật bằng artwork nguyên bản được tạo theo cùng một art direction.

PDF SGK do người dùng cung cấp là nguồn quyết định tên bài và nội dung học. Nguồn công khai bên ngoài chỉ làm tham chiếu thị giác cho hình dạng, vật liệu, màu sắc và không được dùng để tự bổ sung dữ kiện bài học. Hai bài đã có dữ liệu được rà soát trong `source/mvp-content-reviewed.json` giữ nguyên ranh giới fact hiện tại.

Không mở khoá hay tự tạo hoạt động học cho 27 bài chưa có package nội dung. Artwork có thể tồn tại trước, nhưng trạng thái chơi vẫn do content package và progress hiện tại quyết định.

## 2. Danh mục 29 bài và visual anchor

Các ID giữ ổn định theo số bài. Nhãn `confirmed-from-textbook` chỉ dùng cho visual anchor đã có fact trong dữ liệu được rà soát; `visual-reference-only` là mô-típ vùng/địa danh dùng cho hình ảnh, không phải claim nội dung; `needs-content-review` là mô-típ cần rà soát thêm trước khi dùng làm nội dung giải thích hoặc hoạt động.

| ID | Bài theo mục lục PDF | Chủ đề | Visual anchor | Mức độ |
|---|---|---|---|---|
| lesson-01 | Làm quen với phương tiện học tập môn Lịch sử và Địa lí | Địa phương em | Bàn khám phá có bản đồ, trục thời gian, biểu đồ và kính lúp | confirmed-from-textbook |
| lesson-02 | Thiên nhiên và con người ở địa phương em | Địa phương em | Cảnh quan địa phương tổng quát với ghim bản đồ và nhóm cộng đồng nhỏ | needs-content-review |
| lesson-03 | Lịch sử và văn hoá truyền thống địa phương em | Địa phương em | Cổng di sản/nhà sinh hoạt cộng đồng và một chi tiết thủ công địa phương trung tính | needs-content-review |
| lesson-04 | Thiên nhiên vùng Trung du và miền núi Bắc Bộ | Trung du và miền núi Bắc Bộ | Dãy núi xanh, ruộng bậc thang, thung lũng và dòng suối | visual-reference-only |
| lesson-05 | Dân cư và hoạt động sản xuất ở vùng Trung du và miền núi Bắc Bộ | Trung du và miền núi Bắc Bộ | Đồi chè, ruộng bậc thang, đường núi và chợ vùng cao tổng quát | visual-reference-only |
| lesson-06 | Một số nét văn hoá ở vùng Trung du và miền núi Bắc Bộ | Trung du và miền núi Bắc Bộ | Nhà sàn, hoa văn dệt và không gian sinh hoạt cộng đồng; không gán trang phục cho dân tộc cụ thể | needs-content-review |
| lesson-07 | Đền Hùng và lễ Giỗ Tổ Hùng Vương | Trung du và miền núi Bắc Bộ | Đền trên đồi, khói hương, đoàn rước và lễ vật; không vẽ chân dung Vua Hùng | confirmed-from-textbook |
| lesson-08 | Thiên nhiên vùng Đồng bằng Bắc Bộ | Đồng bằng Bắc Bộ | Sông, đê, ruộng lúa, làng quê và đường chân trời thấp | visual-reference-only |
| lesson-09 | Dân cư và hoạt động sản xuất ở vùng Đồng bằng Bắc Bộ | Đồng bằng Bắc Bộ | Ruộng lúa, bến sông, làng nghề và hoạt động sản xuất tổng quát | visual-reference-only |
| lesson-10 | Một số nét văn hoá ở vùng Đồng bằng Bắc Bộ | Đồng bằng Bắc Bộ | Đình làng, cổng làng và chi tiết lễ hội dân gian trung tính | needs-content-review |
| lesson-11 | Sông Hồng và văn minh sông Hồng | Đồng bằng Bắc Bộ | Dải sông uốn lượn, bãi bồi, đê và lớp phù sa; không tự thêm hiện vật lịch sử | needs-content-review |
| lesson-12 | Thăng Long – Hà Nội | Đồng bằng Bắc Bộ | Cổng thành/công trình lịch sử, mặt hồ và thành phố hiện đại ở hậu cảnh | visual-reference-only |
| lesson-13 | Văn Miếu – Quốc Tử Giám | Đồng bằng Bắc Bộ | Khuê Văn Các, sân bia và hàng cây; không chèn chữ lên bia | visual-reference-only |
| lesson-14 | Ôn tập | Đồng bằng Bắc Bộ | Bản đồ hành trình với thẻ ghi nhớ, la bàn và các huy hiệu vùng | visual-reference-only |
| lesson-15 | Thiên nhiên vùng Duyên hải miền Trung | Duyên hải miền Trung | Bờ biển dài, đầm phá, cồn cát và dãy núi sát biển | visual-reference-only |
| lesson-16 | Dân cư và hoạt động sản xuất ở vùng Duyên hải miền Trung | Duyên hải miền Trung | Thuyền đánh cá, ruộng muối, bến cảng và chợ biển tổng quát | needs-content-review |
| lesson-17 | Một số nét văn hoá ở vùng Duyên hải miền Trung | Duyên hải miền Trung | Nhà phố ven sông, đèn lồng và đồ thủ công; không gán một lễ hội cụ thể | needs-content-review |
| lesson-18 | Cố đô Huế | Duyên hải miền Trung | Cổng thành cổ, mái cung điện, sông và cây xanh; không sao chép nguyên ảnh | visual-reference-only |
| lesson-19 | Phố cổ Hội An | Duyên hải miền Trung | Nhà màu vàng, mái ngói, thuyền gỗ và đèn lồng ven sông | visual-reference-only |
| lesson-20 | Thiên nhiên vùng Tây Nguyên | Tây Nguyên | Cao nguyên đất đỏ, rừng, thác và đường chân trời rộng | visual-reference-only |
| lesson-21 | Dân cư và hoạt động sản xuất ở vùng Tây Nguyên | Tây Nguyên | Nương rẫy/cánh đồng, đường cao nguyên và khu dân cư tổng quát | needs-content-review |
| lesson-22 | Một số nét văn hoá và truyền thống yêu nước, cách mạng của đồng bào Tây Nguyên | Tây Nguyên | Nhà sinh hoạt cộng đồng, hoa văn dệt và lối mòn lịch sử; không tự gán nhân vật/sự kiện | needs-content-review |
| lesson-23 | Lễ hội Cồng chiêng Tây Nguyên | Tây Nguyên | Bộ cồng chiêng quanh không gian cộng đồng, ánh lửa và bóng người cách điệu | needs-content-review |
| lesson-24 | Thiên nhiên vùng Nam Bộ | Nam Bộ | Sông ngòi chằng chịt, kênh rạch, vườn cây và vùng ngập nước | visual-reference-only |
| lesson-25 | Dân cư và hoạt động sản xuất ở vùng Nam Bộ | Nam Bộ | Ghe thuyền, vườn cây, ruộng và chợ nổi tổng quát | visual-reference-only |
| lesson-26 | Một số nét văn hoá và truyền thống yêu nước, cách mạng của đồng bào Nam Bộ | Nam Bộ | Nhà ven sông, chi tiết văn hoá Nam Bộ và biểu tượng ký ức lịch sử trung tính | needs-content-review |
| lesson-27 | Thành phố Hồ Chí Minh | Nam Bộ | Đô thị ven sông, cầu, cây xanh và skyline hiện đại; không phụ thuộc vào một logo/biển hiệu | visual-reference-only |
| lesson-28 | Địa đạo Củ Chi | Nam Bộ | Lối vào hầm trong rừng và mặt cắt giáo dục không có cảnh bạo lực | needs-content-review |
| lesson-29 | Ôn tập | Nam Bộ | Bản đồ tổng hợp sáu vùng, hộ chiếu, la bàn và các mảnh ghép ghi nhớ | visual-reference-only |

## 3. Art direction chung

- Asset type: original raster illustration, dùng cho thẻ bài học và có thể tái sử dụng ở lesson hero sau này.
- Kích thước chuẩn: 768 × 1024 px, tỉ lệ dọc khoảng 3:4; chủ thể chính nằm trong vùng an toàn 8% ở bốn cạnh.
- Góc máy: diorama 2.5D hơi từ trên xuống, phối cảnh rõ, lớp tiền cảnh–trung cảnh–hậu cảnh để giữ chiều sâu khi hiển thị ở cột trái hẹp.
- Phong cách: game giáo dục cho trẻ 9 tuổi, hình khối mềm, vật liệu giàu chi tiết vừa đủ, viền/ánh sáng mềm, màu bão hoà vừa phải, không photorealistic cứng.
- Không có text, số bài, logo, watermark, biển hiệu đọc được hoặc chữ giả trong ảnh. Tiêu đề và số bài do HTML đảm nhiệm.
- Không dùng lại pet cáo trong artwork bài học; pet là nhân vật dẫn đường riêng.
- Không vẽ chân dung nhân vật lịch sử cụ thể, cảnh bạo lực, biểu tượng chính trị hoặc trang phục gán sai nhóm văn hoá.
- Mỗi chủ đề có palette riêng nhưng vẫn dùng chung màu xanh biển, vàng khám phá và kem của Học Vui.
- Nguồn ảnh web chỉ là mood/reference board; không tải, nhúng hoặc tái phân phối ảnh bên ngoài.

## 4. Kiến trúc dữ liệu và runtime

Tạo module `src/content/lessonArtwork.ts` độc lập với package hoạt động:

```ts
export type LessonArtworkId =
  | 'lesson-01' | 'lesson-02' | 'lesson-03' | 'lesson-04' | 'lesson-05'
  | 'lesson-06' | 'lesson-07' | 'lesson-08' | 'lesson-09' | 'lesson-10'
  | 'lesson-11' | 'lesson-12' | 'lesson-13' | 'lesson-14' | 'lesson-15'
  | 'lesson-16' | 'lesson-17' | 'lesson-18' | 'lesson-19' | 'lesson-20'
  | 'lesson-21' | 'lesson-22' | 'lesson-23' | 'lesson-24' | 'lesson-25'
  | 'lesson-26' | 'lesson-27' | 'lesson-28' | 'lesson-29';

export type LessonArtwork = {
  lessonId: LessonArtworkId;
  src: string;
  alt: string;
  theme: 'local' | 'north-mountains' | 'red-river' | 'central-coast' | 'highlands' | 'south';
  visualAnchor: string;
  referenceStatus: 'confirmed-from-textbook' | 'visual-reference-only' | 'needs-content-review';
  objectPosition?: string;
};
```

`LESSON_ARTWORKS` phải có đúng 29 bản ghi, mỗi `lessonId` duy nhất và `src` trỏ tới `public/art/lessons/lesson-XX.png`. `MVP_LESSONS` vẫn chỉ chứa bài có package chơi được; không mở rộng union `Lesson['id']` cho các bài chưa có package.

Các tài liệu phụ trợ của phase tạo hình là `design/lesson-artwork/reference-ledger.md` (URL/tham chiếu và phạm vi sử dụng) và `design/lesson-artwork/prompt-set.md` (prompt cuối cho 29 asset). Hai file này là provenance của artwork, không phải nguồn runtime.

Nếu cần gắn nhanh artwork vào các summary đang hiển thị, `LessonSummary` được bổ sung additive bằng `illustration?: Pick<LessonArtwork, 'src' | 'alt' | 'objectPosition'>`; manifest 29 bài vẫn là nguồn chuẩn, không nhân đôi visual brief trong từng summary.

`LessonsView` thay vùng CSS mặt trời–núi–nước bằng `<img>` có `loading="lazy"`, `decoding="async"` và alt phù hợp. Nếu asset không tải được, hiển thị fallback gradient hiện tại để không làm mất khả năng mở bài. Fallback là cơ chế lỗi, không phải artwork chính.

## 5. Offline, hiệu năng và accessibility

- Đưa đủ 29 URL vào local asset manifest và version hash; không phụ thuộc CDN hoặc URL ngoài.
- Lazy-load ảnh ngoài viewport; ảnh ở hai bài MVP được ưu tiên tải sớm.
- Dùng `object-fit: cover` với `object-position` do manifest cung cấp nếu một artwork có tiêu điểm lệch tâm.
- Alt text mô tả ngắn visual anchor, không lặp nguyên tiêu đề dài.
- `prefers-reduced-motion` không làm biến dạng hay thay đổi artwork; chỉ giảm chuyển cảnh của card.
- Không thay đổi progress, reward, session, package hay dữ liệu backup hiện có.

## 6. Phân chia Luna Max và coordinator

Luna Max dùng một task duy nhất, tái sử dụng tuần tự:

1. Packet R0 (đang chạy, read-only): đối chiếu mục lục PDF, 29 visual brief, certainty và schema đề xuất; không ghi file.
2. Packet D1 sau khi spec được duyệt: chỉ sửa data layer được giao, dự kiến `src/content/lessonArtwork.ts`, các type/catalog liên quan và test manifest; không tạo ảnh, không sửa CSS/React, không chạy git lifecycle.
3. Dừng ở `READY_FOR_REVIEW`; coordinator kiểm tra diff và test trước khi giao packet tiếp theo.

Coordinator:

1. Giữ source ledger/prompts và tạo 29 ảnh bằng ImageGen built-in, theo từng batch chủ đề.
2. Kiểm tra alpha/format/kích thước, chữ giả, watermark, subject drift và tính nhất quán giữa các batch.
3. Sau khi Luna hoàn tất data layer, tích hợp `LessonsView`, CSS, offline manifest và fallback.
4. Chạy visual QA và kiểm thử toàn bộ; không sửa file Luna đang sở hữu khi task còn chạy.

## 7. Kiểm thử và nghiệm thu

Nghiệm thu chỉ đạt khi:

- Manifest có đúng 29 artwork, không thiếu/không trùng ID, tất cả file tồn tại và hash được đăng ký.
- Card bài 1 và bài 7 hiển thị đúng artwork mới; không còn hình CSS chung khi asset tải thành công.
- 27 artwork còn lại đã được đăng ký nhưng không làm các bài chưa có package trở thành bài chơi được.
- Alt text, lazy-load, fallback và offline manifest có test tự động.
- Build/typecheck/test hiện tại vẫn đạt; test mới bao phủ 29-entry manifest và URL asset.
- Kiểm tra trực quan ở 390 px, tablet dọc 820 px, tablet ngang và 1440 px; không cắt mất landmark chính, không làm tràn card hay che nút.
- Kiểm tra trực tiếp trên `http://localhost:5001` sau khi server reload.

## 8. Không nằm trong phase này

- Không viết nội dung/hoạt động cho 27 bài chưa được rà soát.
- Không thay đổi cấu trúc progress hoặc mở khoá bài.
- Không dùng ảnh web làm asset runtime.
- Không tạo animation riêng cho từng artwork; chuyển động chỉ ở card/pet/UI hiện có.
- Không commit, push, merge hoặc triển khai production.

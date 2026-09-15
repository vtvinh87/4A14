# Dấu vật phẩm và Pet mở khóa

## Mục tiêu

Biến trang “Nhận dấu” thành một hộ chiếu sưu tầm 29 vật phẩm gắn với các vùng đất, hiện vật, nghề truyền thống hoặc biểu tượng lịch sử đã được rà soát trong nội dung bài học. Mỗi dấu có một ảnh tròn, tên ngắn (tối đa khoảng bốn từ), vùng gợi nhớ, câu chuyện mở rộng và trạng thái đã nhận/chưa nhận.

## Thiết kế đã chốt

- Mỗi bài học có một `StampArtifact` trong manifest dùng chung cho UI và offline cache.
- Ảnh dấu là PNG vuông do ImageGen tạo theo một art direction thống nhất: huy hiệu tròn, viền vàng, bảng màu xanh ngọc/navy, vật phẩm ở trung tâm, không chữ trong ảnh.
- Ô dấu luôn cho phép mở câu chuyện. Dấu chưa nhận dùng cùng ảnh nhưng giảm bão hòa/độ sáng, đồng thời hiển thị tiến độ nhiệm vụ; modal nói rõ điều kiện mở khóa.
- Modal có ảnh lớn hơn, tên vật phẩm, bài/vùng, câu chuyện 2–3 đoạn ngắn và ghi chú nguồn hoặc trạng thái “huy hiệu phỏng theo” khi đây là biểu tượng tổng hợp.
- Những icon chức năng nhỏ vẫn là SVG có ngữ nghĩa; các artwork mặc định trong khu vực sưu tầm và Pet được thay bằng tài sản local có tên/alt rõ ràng.
- Ba Pet mới giữ các hành vi của Cáo Nhỏ, dùng ba màu riêng, và mở khóa lần lượt khi `stamp-lesson-09`, `stamp-lesson-19`, `stamp-lesson-29` xuất hiện trong tiến độ.

## Nội dung vật phẩm

Manifest bám các mốc trong `docs/lesson-content-vbt-2026.md` và `src/content/courseSeeds.ts`. Các bài tổng hợp hoặc bài thiên nhiên dùng huy hiệu phỏng theo cảnh quan/biểu tượng vùng, được ghi rõ trong câu chuyện để không biến minh họa thành trích dẫn hiện vật.

## Kiểm chứng

- Unit test manifest đủ 29 ID, tên ngắn, đường dẫn ảnh và câu chuyện.
- Unit test RewardView render đủ 29 nút dấu, mở/đóng modal và hiển thị đúng trạng thái.
- Unit test Pet kiểm tra ngưỡng 9/19/29 và giữ Cáo Nhỏ.
- Build, typecheck, test suite, kiểm tra hash offline và smoke test ở mobile/desktop.

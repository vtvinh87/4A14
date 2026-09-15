# Kịch bản nghiệm thu MVP

## P1 đã kiểm tra

- Fresh unit/typecheck/build và HTTP root/assets.
- Quan sát home ở 1024×768, 768×1024, 390×844; pet không có caro, controls thật.
- Mở danh mục và cài đặt; bật giảm chuyển động có phản hồi tĩnh.

## P2 đã nghiệm thu 2026-09-11

Parent hoàn thành cả hai bài qua UI (6 nhiệm vụ, 2 dấu), kiểm tra sai/gợi ý/retry và reload giữa bài. Fresh 30 tests, typecheck và build đạt sau correction validation/import. Các mục sau là kịch bản đã dùng và cần giữ khi kiểm thử hồi quy.

1. Bài 1: discovery → chọn sai một lần → đọc giải thích → sửa đúng → ghép cặp → sắp xếp bằng nút. Hoàn thành 3 nhiệm vụ.
2. Refresh giữa câu hỏi phải tiếp tục đúng vị trí, không mất hint/attempt.
3. Bài 7: kiểm tra ngày âm lịch, địa danh theo sách; nhãn truyền thuyết; hoàn thành 3 nhiệm vụ.
4. Kiểm tra 2 dấu bài, 6 nhiệm vụ; replay/double submit không nhân thưởng.
5. Export/import roundtrip; JSON hỏng/không đúng schema/phiên bất hợp lệ phải từ chối, giữ dữ liệu cũ.
6. Điều hướng ra/vào màn học không làm mất phiên; không dùng trạng thái UI làm đáp án.

## P3 đang triển khai và review — chưa nghiệm thu

- Production service worker: parent đã xác minh trên origin sạch `127.0.0.1:4174` báo “Đã sẵn sàng offline”; dừng preview đúng server rồi reload vẫn mở được danh mục, Bài 1, discovery và activity choice từ cache. Còn cần Luna đóng gói report và kiểm tra các trường hợp cập nhật worker/trình duyệt hỗ trợ.
- Focus dialog, keyboard, nhãn accessibility, 48px targets, chữ/phản hồi không chỉ dùng màu.
- Giảm chuyển động từ hệ điều hành và toggle; tab ẩn dừng âm/chuyển động.
- Toast settings tự ẩn; đổi settings không tạo leak AudioContext.
- Responsive sau có nội dung dài; đường dẫn tài sản không hỏng.
- Fresh test/typecheck/build cuối, README cách chạy và giới hạn 2 bài.

Không suy diễn test tự động tương đương đo hiệu năng trên iPad thật. Không publish hoặc Git lifecycle.

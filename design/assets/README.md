# Tài sản mỹ thuật MVP

Tạo bằng công cụ imagegen tích hợp; đây là minh họa hư cấu, không phải tư liệu địa lí/lịch sử.

- `world-background.png`: nền tách từ concept đã duyệt, bỏ toàn bộ chữ/nút/pet. Prompt: preserve lush 3D adventure island scenery and lighting; remove UI, labels and fox, leave empty foreground ledge.
- `fox-pet-alpha.png`: pet cáo render 3D tách lớp, PNG có alpha thật được kiểm tra bằng sips. Prompt cuối: keep exact full-body fox, remove entire checkerboard, actual transparent PNG alpha outside silhouette; preserve fur, compass, backpack and pose.
- `fox-pet.png`: bản thử bị nền caro baked, KHÔNG dùng trong app.

Nguồn concept: `../approved/concept-v02.png`. Executor copy hai tài sản chính vào `public/art/`; không dùng nguyên concept có chữ làm nền ứng dụng. MVP dùng ảnh render và chuyển động CSS, không phải mô hình 3D realtime.

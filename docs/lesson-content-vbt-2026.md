# Gói nội dung 29 bài — đối chiếu VBT và SGK

Ngày rà soát: 2026-09-12  
VBT scan: `/Users/macbook/Downloads/VBT  Lịch sử và ĐL L4 scan.pdf`  
SHA-256 VBT: `4a13ff218c81e17a1c7595659564782a4a41c4ca70ee904bafbb24ae51128b86`

## Cách dùng nguồn

PDF VBT được quét ảnh nên đã được OCR bằng macOS Vision và kiểm tra lại mục lục cùng các trang chứa câu hỏi. Nội dung runtime chỉ diễn đạt lại các ý để tạo hoạt động chọn, ghép và sắp xếp; mỗi hoạt động giữ `sourceId`, số trang PDF, số trang in và locator. PDF gốc không bị sao chép hoặc chỉnh sửa.

VBT bản scan có mục lục Bài 1–27. SGK local của dự án có 29 bài và giữ cùng mạch nội dung ở các bài cuối. Vì vậy runtime dùng VBT cho các bài có nội dung tương ứng, dùng SGK local cho Tây Nguyên (Bài 20–23) và các bài 28–29 theo danh mục SGK. Bài 18–19 dùng các trang VBT về Cố đô Huế và Phố cổ Hội An dù số bài trong VBT khác bản SGK.

## Bản đồ nguồn

| ID app | Bài | Nguồn chính | Trang in | Phạm vi dùng |
|---|---|---|---:|---|
| lesson-01 | Phương tiện học tập | VBT | 4–7 | Bản đồ, trục thời gian, hiện vật, tranh ảnh |
| lesson-02 | Thiên nhiên địa phương | VBT | 8–10 | Vị trí, địa hình, khí hậu, bảo vệ môi trường |
| lesson-03 | Văn hoá địa phương | VBT | 10–12 | Món ăn, lễ hội, di tích, kế hoạch tham quan |
| lesson-04 | Thiên nhiên Trung du và miền núi phía Bắc | VBT | 13–16 | Vị trí, địa hình, Phan-xi-păng, sông và khoáng sản |
| lesson-05 | Dân cư và sản xuất Trung du và miền núi phía Bắc | VBT | 17–21 | Dân cư, ruộng bậc thang, thuỷ điện, khoáng sản |
| lesson-06 | Văn hoá Trung du và miền núi phía Bắc | VBT | 22–24 | Hát Then, Xoè, chợ phiên, lễ hội |
| lesson-07 | Đền Hùng và Giỗ Tổ | VBT/SGK | 25–27 | Phú Thọ, mồng 10 tháng Ba, truyền thuyết |
| lesson-08 | Thiên nhiên Đồng bằng Bắc Bộ | VBT | 28–30 | Địa hình, khí hậu, bảo vệ thiên nhiên |
| lesson-09 | Dân cư và sản xuất Đồng bằng Bắc Bộ | VBT | 32–33 | Dân cư, lúa nước, làng nghề |
| lesson-10 | Văn hoá Đồng bằng Bắc Bộ | VBT | 34–36 | Làng quê, lễ hội, nhà ở |
| lesson-11 | Sông Hồng và văn minh sông Hồng | VBT | 37–40 | Sông Hồng, Văn Lang–Âu Lạc, đời sống người Việt cổ |
| lesson-12 | Thăng Long – Hà Nội | VBT | 41–44 | Dời đô 1010, ý nghĩa Thăng Long, vai trò Hà Nội |
| lesson-13 | Văn Miếu – Quốc Tử Giám | VBT | 45–46 | Thời Lý, chức năng công trình, hiếu học |
| lesson-14 | Ôn tập Đồng bằng Bắc Bộ | VBT | 47–50 | So sánh hai vùng, di sản và lễ hội |
| lesson-15 | Thiên nhiên Duyên hải miền Trung | VBT | 51–58 | Vị trí, địa hình, biển, rừng và thiên tai |
| lesson-16 | Dân cư và sản xuất Duyên hải miền Trung | VBT | 59–65 | Kinh tế biển, muối, hải sản, năng lượng |
| lesson-17 | Văn hoá Duyên hải miền Trung | VBT | 66–69 | Lễ hội, di sản, nhà rông |
| lesson-18 | Cố đô Huế | VBT | 73–75 | Sông Hương, triều Nguyễn, sự kiện 1885 |
| lesson-19 | Phố cổ Hội An | VBT | 76–80 | Vị trí, kiến trúc, bảo tồn |
| lesson-20 | Thiên nhiên Tây Nguyên | SGK local | 85–88 | Vị trí, cao nguyên, đất badan, rừng |
| lesson-21 | Dân cư và sản xuất Tây Nguyên | SGK local | 89–92 | Dân cư, cây công nghiệp, chăn nuôi, thuỷ điện |
| lesson-22 | Văn hoá và truyền thống yêu nước Tây Nguyên | SGK local | 93–96 | Nhà Rông, lễ hội, N’Trang Lơng, Đinh Núp |
| lesson-23 | Lễ hội Cồng chiêng Tây Nguyên | VBT/SGK | 81–83 / 97–99 | Không gian, vai trò, tổ chức lễ hội |
| lesson-24 | Thiên nhiên Nam Bộ | VBT | 84–86 | Vị trí, sông ngòi, khí hậu, khó khăn |
| lesson-25 | Dân cư và sản xuất Nam Bộ | VBT | 87–89 | Dân cư, nông nghiệp, công nghiệp |
| lesson-26 | Văn hoá và truyền thống yêu nước Nam Bộ | VBT | 90–92 | Chợ nổi, ghe xuồng, Trương Định |
| lesson-27 | Thành phố Hồ Chí Minh | VBT | 93–95 | Mốc lịch sử, tên gọi, vai trò trung tâm |
| lesson-28 | Địa đạo Củ Chi | VBT/SGK | 96–97 / 118–120 | Vị trí, cấu trúc, bếp Hoàng Cầm, kháng chiến |
| lesson-29 | Ôn tập | VBT/SGK | 98–99 / 121 | Ba vùng, liên hệ di sản và hoạt động |

Các seed runtime nằm trong [`src/content/courseSeeds.ts`](/Volumes/Pictures/Projects/Hoc_Vui/src/content/courseSeeds.ts); các gói đã biên dịch được xuất thành `dist/lessons/lesson-XX.json`.

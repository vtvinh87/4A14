# Đăng nhập và hội thoại Pet — thiết kế local

## Mục tiêu

Cải thiện hai điểm trên bản chạy local của Học Vui: hướng dẫn đăng nhập ngắn gọn, có kênh liên hệ Admin; và làm cho Pet ở trang “Pet của tôi” sinh động hơn bằng lời thoại ngẫu nhiên cùng bong bóng dễ đọc.

## Quyết định đã duyệt

### Màn hình đăng nhập

- Bỏ hoàn toàn câu `Nhập tên tài khoản và mã PIN 6 số mà Admin đã cấp cho con.`.
- Dùng chính xác câu `Liên hệ Admin để tạo tài khoản hoặc đặt lại mật khẩu.`.
- Dòng tiếp theo là liên kết `Zalo: Thành Vinh` tới `https://zalo.me/0948584429`.
- Liên kết mở tab mới với `target="_blank"` và `rel="noreferrer"`.
- Không thay đổi luồng xác thực, nhãn trường, PIN sáu ô hoặc màn hình quản trị.

### Pet và hội thoại

- Catalog thoại nằm trong module TypeScript thuần local, không thêm API, database, audio hay dependency.
- Catalog có 30 câu, chia các sắc thái: động viên, nghịch ngợm, tò mò, tâm trạng, vui tươi và nghiêm túc.
- Lời thoại đầu tiên chọn ngẫu nhiên.
- Mỗi lần chạm Pet chọn một câu khác câu vừa hiển thị; không tự động đổi theo thời gian.
- Khi đổi sang một Pet đã mở khóa khác, chọn lại một câu mới; Pet bị khóa vẫn giữ hành vi hiện tại.
- Bubble giữ quan hệ xưng hô `tớ`/`cậu`, có nhãn ARIA status và không che modal.
- Bubble full-size trên trang Pet có nền kem nhiều lớp, viền xanh đậm, bóng đổ, đuôi hội thoại và accent theo sắc thái; compact lesson bubble giữ bố cục gọn hiện có.
- Trong `.pet-room`, bubble/companion nằm trên caption và pseudo-background bằng stacking layer riêng; modal hiện có vẫn cao hơn.

## Catalog thoại được duyệt

1. `Tớ có bản đồ, cậu có tò mò — cả đội sẵn sàng rồi!` — encouraging
2. `Chậm một nhịp cũng được, tớ sẽ cùng cậu bước tiếp nhé.` — encouraging
3. `Cậu làm tốt hơn cậu nghĩ đấy. Tớ nhìn thấy mà!` — encouraging
4. `Tớ tin một manh mối nhỏ hôm nay có thể mở ra cả kho báu ngày mai.` — encouraging
5. `Tớ đứng về phía cậu, kể cả lúc câu hỏi trông hơi tinh quái.` — encouraging
6. `Nếu tớ giấu chiếc la bàn, cậu có tìm ra không nhỉ?` — playful
7. `Suỵt… tớ vừa nghe thấy một mẩu lịch sử đang cười khúc khích.` — playful
8. `Đuôi tớ đang quẫy theo nhịp khám phá của cậu đây!` — playful
9. `Tớ tuyên bố hôm nay là ngày săn manh mối siêu hạng!` — playful
10. `Cậu nhìn thấy ba lô của tớ không? Nó đang đầy ắp chuyện vui đấy.` — playful
11. `Nếu được du hành thời gian, cậu sẽ ghé nơi nào đầu tiên?` — curious
12. `Tớ tự hỏi lối đi này đã chứng kiến bao nhiêu câu chuyện rồi nhỉ?` — curious
13. `Cậu thử nhìn kỹ thêm một lần nhé, chi tiết nhỏ thường rất thú vị.` — curious
14. `La bàn chỉ về phía trước, còn trí tò mò của cậu thì chỉ khắp nơi!` — curious
15. `Tớ muốn biết điều gì làm cậu bất ngờ nhất hôm nay.` — curious
16. `Hôm nay tớ hơi chậm một chút, nhưng vẫn muốn đồng hành cùng cậu.` — moody
17. `Có những ngày tớ và cậu chỉ cần hoàn thành một việc nhỏ cũng đáng tự hào rồi.` — moody
18. `Tớ đang nghe đây. Cậu cứ suy nghĩ thật bình tĩnh nhé.` — moody
19. `Uống một ngụm nước, thở sâu cùng tớ, rồi cậu thử lại từ từ.` — moody
20. `Tớ cũng từng bối rối trước manh mối khó. Cậu không phải tự xoay xở đâu.` — moody
21. `Yay! Tớ muốn nhảy một vòng quanh chiếc la bàn quá!` — joyful
22. `Có tiến bộ rồi! Tớ và cả đội thám hiểm đang vui lây với cậu.` — joyful
23. `Hôm nay ánh mắt cậu sáng như kho báu mới tìm thấy vậy!` — joyful
24. `Tớ muốn lưu khoảnh khắc này vào nhật ký phiêu lưu cùng cậu!` — joyful
25. `Tớ nghe tiếng chuông chiến thắng rồi — leng keng!` — joyful
26. `Muốn đi xa thì cậu đọc kỹ, nghĩ kỹ và kiểm tra thật cẩn thận.` — serious
27. `Cậu cứ suy nghĩ thật kỹ, không cần chạy đua với ai.` — serious
28. `Tớ luôn nhớ: manh mối tốt cần một đôi mắt quan sát thật kỹ.` — serious
29. `Nếu cậu chưa chắc, hãy quay lại tư liệu và kiểm chứng nhé.` — serious
30. `Tớ sẽ nhắc cậu: hiểu bài quan trọng hơn trả lời thật nhanh.` — serious

## Ngoài phạm vi

- Không deploy Firebase, không gọi Supabase CLI, không push GitHub.
- Không đổi dữ liệu tài khoản, API, schema, PWA hoặc nội dung bài học.
- Không làm bubble nổi trên modal; `z-index` chỉ cao trong khu Pet và thấp hơn lớp modal hiện hữu.

## Kiểm chứng

- Test AuthView kiểm tra copy mới, URL Zalo, thuộc tính mở tab và vắng copy cũ.
- Test catalog kiểm tra đủ 30 câu, không trùng text và đủ sáu sắc thái.
- Test PetView kiểm tra lời thoại khởi tạo nằm trong catalog, chạm đổi câu và gọi callback hiện có.
- Chạy targeted tests, toàn bộ Vitest, client typecheck và build local; chỉ kiểm tra localhost, không deploy.

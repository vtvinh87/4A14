# Học Vui — Nhà thám hiểm Việt Nam

Ngày: 10/09/2026. Trạng thái: đề xuất thiết kế và kế hoạch xây dựng, chưa triển khai ứng dụng.

## 1. Mục tiêu và các quyết định đầu vào

Xây dựng web app tiếng Việt cho bé trai 9 tuổi/lớp 4 học Lịch sử và Địa lí qua khám phá, thao tác và kể chuyện. Thiết bị chính: **máy tính bảng**, do phụ huynh xác nhận. Giao diện tươi sáng, hiện đại, nhiều phản hồi vui và chuyển động mượt.

Giả định để lập kế hoạch: trước mắt một bé sử dụng trong gia đình; học theo sách đã cung cấp; một chuyến khám phá khoảng 8–12 phút, có thể dừng giữa chừng. Thời lượng là giả thuyết cần thử với bé, không phải kết luận sư phạm. Chưa biết model máy tính bảng, tỉnh/thành của bé, bài đang học và sở thích trò chơi; các điểm này được xác nhận khi chọn nội dung thử nghiệm.

Tiêu chí sản phẩm: bé hiểu mình cần làm gì, muốn khám phá tiếp, có thể giải thích lại điều vừa học và tiếp tục đúng chỗ khi quay lại.

## 2. Kết quả rà skill

Chi tiết nguồn và quyết định áp dụng ở [rà soát skills](./ra-soat-skills.md). Đã rà danh mục native skills và tìm có mục tiêu trong Brain_Vault; đọc các tài liệu phù hợp về game, giao diện, hoạt ảnh, âm thanh, kể chuyện, hiệu năng và lập kế hoạch. Không đồng nghĩa đã đọc mọi skill trên Internet.

Game Designer định hình vòng chơi và trạng thái thành công/thử lại; Level Designer định hình nhịp khám phá; Narrative Designer giữ lời dẫn ngắn và nhất quán; Lingo cùng Frontend Designer tạo hệ giao diện rõ ràng; Whimsy Injector và GSAP Animator tạo phản hồi có mục đích. Game Audio Engineer chỉ dùng nguyên tắc tổ chức âm thanh, không mang middleware game desktop vào web.

## 3. Ba hướng và lựa chọn đề xuất

| Hướng | Trải nghiệm | Đánh đổi |
|---|---|---|
| **Hành trình khám phá 2D — đề xuất** | Bản đồ chuyến đi, cảnh tương tác, thử thách đa dạng, hộ chiếu sưu tầm | Cần đầu tư minh họa và biên soạn; dùng lại các kiểu thử thách để mở rộng |
| Chuỗi bài luyện có điểm thưởng | Học từng màn ngắn, nhiều câu hỏi | Nhanh xây dựng nhưng ít khám phá, dễ lặp lại |
| Thế giới 3D có nhân vật di chuyển | Khám phá không gian tự do | Chi phí mỹ thuật, điều khiển và tối ưu tablet cao; cần kiểm chứng lợi ích học tập |

Chọn hướng 2D có lớp cảnh tạo chiều sâu. Game engine riêng chỉ được bổ sung nếu thử nghiệm chứng minh cần chuyển động tự do/va chạm; prototype đầu dùng giao diện web và SVG cho tương tác.

## 4. Trải nghiệm của bé

Tên làm việc: **Học Vui — Nhà thám hiểm Việt Nam**. Bé nhận hộ chiếu khám phá và cùng một bạn đồng hành hư cấu đi qua các chủ đề trong sách. Bạn đồng hành hướng dẫn thao tác, động viên và gợi ý; lời nói về kiến thức phải truy được về sách.

Màn đầu mở ngay hành trình đang học, nút “Đi tiếp”, và các chặng có thể chọn. Có hai cách tìm bài: hành trình khám phá và danh sách đúng số bài trong sách, để phụ huynh chọn bài bé đang học ở trường. Bài 1 là trạm làm quen; sáu chủ đề là sáu chương. “Địa phương em” là chương cá nhân hóa, không vẽ thành một vùng địa lí thứ bảy.

Vòng chơi:

1. **Nhận nhiệm vụ:** lời dẫn một hoặc hai câu, mục tiêu cụ thể.
2. **Khám phá:** chạm chi tiết trên cảnh, đọc/nghe mẩu kiến thức ngắn có ảnh.
3. **Thử sức:** 3–5 hoạt động phù hợp mục tiêu, tăng từ có gợi ý đến tự làm.
4. **Giải thích:** phản hồi nêu vì sao và hướng dẫn xem lại đúng phần.
5. **Ghi dấu hành trình:** thêm dấu vào hộ chiếu, lưu tiến độ và cho phép nghỉ.

Thời lượng và số hoạt động là thông số thử nghiệm. Một bài dài có thể chia nhiều chuyến; không ép 29 bài có cùng độ dài hoặc cùng dạng trò chơi.

Ví dụ màn Bài 1: bé chọn phương tiện học tập phù hợp với nhiệm vụ, chạm một chi tiết trên lược đồ đã kiểm chứng, đọc một bảng số liệu đơn giản từ sách. Hoàn thành thì dụng cụ được xếp vào ba lô. Ba lô và lời dẫn là sáng tạo giao diện; dữ kiện và đáp án phải biên soạn từ các trang tương ứng.

## 5. Các kiểu thử thách

| Kiểu | Bé làm gì | Mục tiêu và nguồn dự kiến |
|---|---|---|
| Ba lô thám hiểm | Chọn phương tiện phù hợp một yêu cầu | Bài 1, trang in 6–11 |
| Chạm bản đồ | Tìm địa danh, đọc chú giải hoặc xác định vị trí | Bài 1; các bài thiên nhiên vùng |
| Ghép đôi/phân loại | Ghép hình, mô tả và nhóm nội dung | Văn hóa, sản xuất, ôn tập |
| Sắp xếp câu chuyện | Xếp thẻ theo trình tự được sách nêu | Bài 7, 12, 27; phân biệt truyền thuyết và sự kiện |
| Thám tử tư liệu | Quan sát ảnh/sơ đồ rồi chọn bằng chứng cho câu trả lời | Bài 11, 13, 18, 19, 28 |
| Chọn hành động | Chọn cách bảo vệ thiên nhiên/di tích và giải thích | Các mục vận dụng có căn cứ trong sách |
| Hướng dẫn viên nhí | Kể lại bằng lời với người lớn, có gợi ý kiểm tra | Hoạt động giới thiệu, kể chuyện; không tự chấm đúng/sai bằng từ khóa |

Mọi kéo-thả có cách thay thế: chạm vật → chạm vị trí đích. Sai thì vật trở về, hiện gợi ý, được thử lại. Trò chơi không phụ thuộc tốc độ phản xạ; không có mạng chơi bị trừ khi sai. Hành vi chạm liên tục, xoay màn hình hoặc thoát giữa lượt không được gây cộng thưởng lặp hay mất trạng thái.

Bản đồ dùng để học phải đúng địa danh, vị trí và chú giải của nguồn. Bản đồ hành trình cách điệu có nhãn riêng, không dùng làm bằng chứng chấm vị trí. Không dùng ảnh AI tạo bản đồ hoặc sơ đồ di tích để xác định đáp án.

## 6. Phần thưởng và tiến bộ

Phần thưởng đầu tiên gồm dấu hộ chiếu và vật phẩm trang trí ba lô. Mỗi nhiệm vụ chỉ cấp vật phẩm lần đầu; chơi lại vẫn được phản hồi và ghi nhận ôn tập. Bé được chọn chặng và trang trí; không cần tiền ảo, cửa hàng hoặc bảng xếp hạng.

Theo dõi riêng: “đã khám phá”, “làm được với gợi ý”, “tự làm được”, “đã ôn lại”. Hoàn thành khi đã thực hiện mọi hoạt động bắt buộc và xem phản hồi; mức tự làm phản ánh đúng số lần dùng gợi ý. Câu hỏi mở ghi “đã thực hành” và nhận xét phụ huynh, không tự chuyển thành đã hiểu.

Đề xuất ôn lại ở lần học sau; bài đã làm sai xuất hiện dưới biến thể có cùng mục tiêu. Lịch thử nghiệm có thể là 1, 3, 7 ngày; chỉnh sau quan sát, không hứa hẹn mức tăng ghi nhớ. Không làm mất thành tích vì nghỉ học một ngày. Màn kết thúc có điểm nghỉ tự nhiên.

Góc phụ huynh xem bài đã học, mục tiêu còn cần gợi ý, lần ôn gần nhất, đổi bài và sao lưu tiến độ. Giai đoạn đầu đây là màn quản lý tại thiết bị, không phải tài khoản bảo mật đa người dùng.

## 7. Hướng mỹ thuật và chuyển động

Một hệ thống nhất: **giao diện Lingo biến thể riêng + minh họa thám hiểm 2D có chiều sâu**. Nút nổi có cảm giác nhấn, hình tròn mềm, icon nhất quán, một linh vật riêng; tránh sao chép nhận diện Duolingo. Claymorphism là tham khảo độ mềm cho linh vật/vật phẩm, không phủ mọi bề mặt. Doodle chỉ dành cho nét đường đi và sticker.

Tokens đề xuất: nền trời #EAF7FF, bề mặt #FFFFFF, chữ #16324F, xanh hành động #1269D3, vàng nhấn #FFD34E, xanh lá phản hồi #257A3E. Màu nhấn dùng cùng chữ đậm; phải đo từng cặp tương phản trước khi nghiệm thu. Font Nunito có bộ chữ tiếng Việt, nội dung 18–20px, tiêu đề 28–36px, giãn dòng 1.5; kiểm tra đầy đủ dấu tiếng Việt. Khoảng cách 4/8/12/16/24/32px; góc bo 16px cho điều khiển, 24px cho khung nhiệm vụ.

| Tình huống | Phản hồi đề xuất | Mục đích |
|---|---|---|
| Chạm nút | Lún nhẹ 80–120ms, âm click nhỏ | Xác nhận đã nhận thao tác |
| Chọn vật | Nâng nhẹ, viền rõ, bóng đích | Hiểu vật đang được chọn |
| Ghép đúng | Snap vào đích 150–250ms, âm vui | Thấy quan hệ đã đúng |
| Cần thử lại | Trả vật, hiện gợi ý cạnh mục tiêu | Biết sửa ở đâu |
| Chuyển cảnh | Đường đi/zoom nhẹ 250–450ms | Giữ cảm giác cùng hành trình |
| Nhận dấu | Đóng dấu, hạt nhỏ dưới 1 giây | Ghi nhận cột mốc |
| Đang đọc | Cảnh nền yên, linh vật nghỉ | Dễ tập trung nội dung |

Thời gian trên là thông số thiết kế ban đầu. Có giảm chuyển động theo hệ thống và công tắc trong app. Hiệu ứng có thể bỏ qua; không chặn việc đọc, chạm hoặc lưu tiến độ. Không chạy hạt/zoom liên tục trong màn học.

Tablet: vùng chạm ưu tiên 48–56px; dọc xếp cảnh trên và thao tác dưới, ngang chia cảnh và nhiệm vụ hai cột. Không dùng hover làm điều kiện khám phá. Xử lý safe area, phóng chữ, thanh địa chỉ trình duyệt và đổi hướng màn hình mà không reset bài.

Âm thanh có ba nhóm: tương tác, không gian, lời đọc; nút tắt dễ thấy. Khởi động âm sau thao tác của bé, lưu lựa chọn, giảm nhạc nền khi đọc; dừng khi tab ẩn. Âm thất bại nhẹ, không gây giật mình. Lời đọc tiếng Việt chỉ xuất bản sau kiểm tra phát âm tên riêng; nội dung chữ luôn đủ để học khi tắt âm. Không cần thu âm bé ở MVP.

## 8. Nguồn học liệu và giới hạn hiện tại

PDF nguồn: `/Users/macbook/Downloads/Lich su va dia ly.pdf`.
SHA-256 đã ghi nhận ở lượt trước: `f7d8c9a7f7e069fcd9e509561468797c3dbd89b9e62b706291667ae87fc2577d`.

Đã xác nhận qua lượt đọc trước: 127 trang PDF; mục lục 29 bài, gồm Bài 14 và 29 ôn tập; sáu chủ đề, phần mở đầu và thuật ngữ. Bìa ghi Kết nối tri thức với cuộc sống và có dấu “Bản mẫu”. Metadata sai, OCR có lỗi dấu/tên riêng và bảng nhiều cột. Các file OCR tạm đã bị xóa ở lượt trước; chưa có kho nội dung đã kiểm duyệt trong dự án.

Cần đính chính mức độ hoàn tất của lượt trước: chạy OCR 126 ảnh và đọc mục tiêu/mục lục không chứng minh đã đối chiếu đầy đủ từng câu, ảnh, số liệu. Kế hoạch này dựa trên cấu trúc đã đọc, không coi OCR là bộ đáp án sẵn sàng phát hành.

Quy trình học liệu: tạo bản nguồn trong dự án và xác minh hash → trích xuất theo trang → đối chiếu trực quan từng bài → tách mục tiêu/kiến thức/ảnh/câu hỏi → viết hoạt động và lời giải → duyệt → cho phép đưa vào app.

Mỗi hoạt động lưu `id`, `lessonId`, `objectiveIds`, `sourceId`, `pdfPage`, `printedPage`, vị trí hình/mục, `type`, đề bài, lựa chọn, quy tắc đáp án, giải thích, gợi ý và `reviewStatus`. Mỗi mục tiêu phải có ít nhất một hoạt động hoặc thực hành được phụ huynh đánh giá. Nội dung `draft` không được đóng gói vào bản học cho bé.

Giữ riêng dấu nguồn sách, phần diễn đạt lại và lời dẫn hư cấu. Không tự cập nhật địa giới/số liệu theo kiến thức ngoài PDF. Mâu thuẫn hoặc chữ không đọc rõ được ghi lại để đối chiếu. Bài 2–3 cần địa phương của bé và tư liệu tương ứng vì sách đưa khung tìm hiểu; không tự điền từ suy đoán. Xác nhận bản sách bé dùng trước khi mở rộng toàn bộ 29 bài.

## 9. Kiến trúc đề xuất

React + TypeScript làm giao diện và trạng thái, CSS cho phản hồi đơn giản, GSAP cho chuỗi hoạt ảnh. SVG dùng cho vùng chạm trên sơ đồ có nguồn; ảnh WebP/AVIF cho minh họa; Web Audio cho hiệu ứng. GSAP có cơ chế cleanup qua `useGSAP`; tài liệu chính thức: https://gsap.com/resources/React/.

Không bắt buộc dùng game engine ở MVP. Phaser là lựa chọn bổ sung cho game 2D có scene, input, vật lý khi phát sinh nhu cầu thực sự: https://docs.phaser.io/phaser/getting-started/what-is-phaser. Chọn renderer theo kết quả prototype, không theo số hiệu ứng mong muốn.

Các khối: nội dung có phiên bản → bộ chạy nhiệm vụ → hoạt động tương tác → kết quả và phản hồi → lưu tiến độ → đề xuất ôn. Giao diện đọc kết quả từ bộ chạy; animation không quyết định đáp án và không phải nơi duy nhất cập nhật tiến độ.

Trạng thái nhiệm vụ: giới thiệu → khám phá → thử sức → phản hồi → hoàn thành. Pause/resume độc lập. Một `attemptId` chỉ ghi kết quả một lần; thao tác hoàn thành lặp không cấp lại thưởng.

Lưu bằng IndexedDB trên tablet, kèm xuất/nhập sao lưu có kiểm tra phiên bản. Khi lưu thất bại phải báo rõ và cho xuất dữ liệu; không hiển thị “đã lưu” giả. Khả năng đồng bộ nhiều thiết bị là giai đoạn sau; không cần AI sinh đáp án lúc bé học. Phiên bản câu hỏi gắn với tiến độ để sửa nội dung không làm sai lịch sử kết quả.

PWA: sau bản thử, bổ sung tải gói bài để học offline; hiển thị gói đã tải, chỉ công bố offline với gói đã xác minh đủ tài nguyên. Cập nhật nội dung giữa các phiên, không thay bài khi đang chơi. Lưu trình duyệt có thể bị xóa nên bản sao lưu cần dễ dùng.

Sites building/hosting được đưa vào tuyến triển khai web khi bắt đầu build; hiện thư mục trống, chưa có `.openai/hosting.json`. Runtime/starter được kiểm tra tại thời điểm triển khai, giữ các khối game độc lập với starter. Chưa tạo Site, cài package hoặc chọn dịch vụ trả phí trong bước lập kế hoạch.

## 10. Các giai đoạn và tiêu chí nghiệm thu

| Giai đoạn | Công việc và đầu ra | Điều kiện qua bước |
|---|---|---|
| P0 — Nguồn chương trình | Chỉ mục 29 bài, đối chiếu PDF; xác nhận bản mẫu; biên soạn Bài 1 và Bài 7 | Mọi câu hỏi thử có trang nguồn, đáp án, giải thích được đọc lại; điểm chưa rõ được loại khỏi bản thử |
| P1 — Thiết kế cảm giác chơi | Ba màn: hành trình, nhiệm vụ, nhận dấu; bộ tokens, linh vật, motion/audio mẫu | Phụ huynh xem được hướng thẩm mỹ; bé biết chạm đâu; chữ, nút và bố cục tốt trên tablet |
| P2 — Bản chơi hoàn chỉnh đầu tiên | Bài 1 và Bài 7, khoảng 6–8 nhiệm vụ tổng, ba kiểu hoạt động: chạm khám phá, ghép/phân loại, sắp xếp | Đi được từ chọn bài đến nhận dấu; đáp án sai có gợi ý; refresh/rotate/pause không mất tiến độ |
| P3 — Chơi thử và chỉnh | Hai hoặc ba buổi ngắn với bé, sửa thao tác, lời dẫn, nhịp và độ khó | Bé hoàn thành một chuyến sau hướng dẫn ban đầu, giải thích lại được ý chính; ghi quan sát cụ thể |
| P4 — Mở rộng chương trình | Bổ sung các kiểu hoạt động còn lại và nội dung theo từng chủ đề; Bài 2–3 theo địa phương; Bài 14/29 làm chặng ôn | Từng lô nội dung qua kiểm duyệt; đủ 29 bài được ánh xạ mục tiêu; không ép cùng khuôn |
| P5 — Bản dùng thường xuyên | PWA/offline, sao lưu, góc phụ huynh, kiểm tra máy thật và bản phát hành | Đạt kiểm tra lưu/khôi phục/offline; bằng chứng hiệu năng trên tablet; mọi bài xuất bản truy được nguồn |

P2 chọn Bài 1 để kiểm tra cách học địa lí bằng công cụ và Bài 7 để kiểm tra kể chuyện/văn hóa. Đây là đề xuất thử hai loại trải nghiệm; có thể đổi Bài 7 theo bài bé đang học. P4 chia theo chủ đề, chỉ đưa lô đã duyệt vào ứng dụng. Không công bố đủ chương trình nếu một lô còn thiếu.

Ước lượng lập kế hoạch: P0–P3 khoảng 10–16 ngày công; P4–P5 khoảng 15–25 ngày công, phụ thuộc khối lượng tranh/lời đọc và kiểm duyệt. Đây là ước lượng công sức, không phải cam kết lịch chạy agent. Sau P0 và P2 đo công sức thực tế để cập nhật; nội dung là phần cần đầu tư đáng kể.

## 11. Gói xây dựng đầu tiên

Các đường dẫn dưới đây là vị trí dự kiến, chưa tạo code. Mỗi gói được kiểm tra trước khi chuyển sang gói phụ thuộc.

- [ ] A — Học liệu: `content/source-manifest.json`, `content/curriculum.json`, `content/lessons/lesson-01.json`, `content/lessons/lesson-07.json`, `docs/content-review.md`. Kiểm tra id duy nhất, trang tồn tại, mục tiêu được phủ, mọi đáp án có giải thích; review hình nguồn trực tiếp.
- [ ] B — Hệ giao diện: `src/ui/`, `src/styles/tokens.css`, `public/art/`, `docs/design.md`. Đủ default/pressed/focus/disabled/loading/error; kiểm tra văn bản dài, dấu tiếng Việt, tương phản, zoom và hai hướng màn hình.
- [ ] C — Bộ chạy: `src/game/session.ts`, `src/game/evaluate.ts`, `src/game/rewards.ts`, `src/game/activity-types.ts`. Interface: `evaluate(activity, response)` trả kết quả và phản hồi; `transition(session, event)` trả session mới; `grantReward(progress, completion)` không cấp trùng. Test đúng/sai/gợi ý, gửi trùng, tiếp tục sau pause, sửa đáp án.
- [ ] D — Hoạt động: `src/activities/ExploreScene.tsx`, `MatchActivity.tsx`, `SequenceActivity.tsx`. Dùng hợp đồng C, không tự chấm riêng. Kiểm tra chạm-kéo tương đương, thả ra ngoài, đổi hướng khi đang kéo, màn bị đóng trong animation.
- [ ] E — Lưu và hành trình: `src/progress/repository.ts`, `src/pages/Journey.tsx`, `Passport.tsx`, `Parent.tsx`. Ghi theo schema/version; test tải lại, storage lỗi, nhập sai phiên bản và ghi kết quả lặp. Sau nhập lỗi giữ nguyên bản hiện có.
- [ ] F — Ghép bản thử: `src/audio/`, `src/motion/`, `tests/e2e/learning-flow.spec.ts`, `docs/playtest.md`. Chạy hết Bài 1 và 7, ghi trace/performance trên tablet, kiểm tra âm bị chặn và reduced motion, sửa lỗi trước chơi thử.

Lệnh kiểm chứng cần được tạo cùng scaffold: `npm run typecheck`, `npm run test`, `npm run build`, `npm run test:e2e`. Kiểm tra trọng tâm là logic đáp án/tiến độ và luồng học; không viết test chỉ để xác nhận màu hoặc mirror implementation. Khi executor thực thi phải đọc baseline và ghi evidence thực tế vào ledger; không tự commit/push/deploy theo các ví dụ trong skill.

## 12. Chất lượng và cách đo

- Mục tiêu ban đầu: tương tác không có độ trễ rõ rệt; hoạt ảnh hướng đến 60fps trên tablet mục tiêu. Đo cả chơi liên tục 15 phút để phát hiện nóng máy, tăng bộ nhớ và rớt khung hình; không tuyên bố mọi thiết bị đạt 60fps.
- Web Vitals mục tiêu LCP ≤2.5s, INP ≤200ms, CLS ≤0.1. Báo cáo điều kiện đo; Lighthouse lab không chứng minh INP thực địa. Nguồn: https://web.dev/articles/vitals.
- Tải minh họa theo chương, đặt sẵn kích thước ảnh, tránh đọc/ghi layout liên tục; tối đa một cảnh hoạt động, dọn animation/listener khi rời cảnh. Chỉ tối ưu thêm sau đo.
- Chơi được khi tắt âm; âm khởi động sau tương tác phù hợp chính sách trình duyệt. Nguồn: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices.
- Kiểm tra tablet thật Safari/iPadOS hoặc Chrome/Android theo thiết bị gia đình; mô phỏng viewport không thay thế thử trên máy thật.
- Playtest ghi: chỗ bé cần giúp, chỗ bấm nhầm, chỗ bỏ qua chữ, cảm xúc khi sai, có muốn chơi lại, kể lại một hoặc hai ý không nhìn đáp án. Ghi số lần cụ thể vì chỉ có một bé, không dùng tỷ lệ giả đại diện nhiều học sinh.
- Đo hứng thú và mức hiểu riêng. Bé có thể thích phần thưởng nhưng không hiểu bài, hoặc làm đúng vì nhớ vị trí đáp án; đổi vị trí/lối hỏi và nghe bé giải thích để kiểm tra.

## 13. Mốc quyết định tiếp theo

Bản kế hoạch đã đủ để xem xét hướng sản phẩm. Bước xây dựng đầu tiên được đề xuất là P0 và P1, sau đó P2 có hai bài chơi được trước khi nhân rộng. Dùng kết quả chơi thử của chính bé để quyết định mật độ hiệu ứng và các dạng trò chơi tiếp theo.

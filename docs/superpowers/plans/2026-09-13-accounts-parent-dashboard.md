# Kế hoạch nâng cấp tài khoản và Dashboard phụ huynh

> Trạng thái v2: **PHƯƠNG ÁN SẢN PHẨM ĐÃ DUYỆT — CHỜ DUYỆT TRIỂN KHAI LOCALHOST**. Người dùng chốt Supabase database, GitHub source và Netlify deploy. Rà soát lần cuối chỉ cập nhật tài liệu; chưa sửa mã ứng dụng, tạo tài khoản, database hay dịch vụ triển khai.
> Dành cho executor: thực hiện bằng `superpowers:executing-plans`, từng packet có kiểm tra và bàn giao READY_FOR_REVIEW. Coordinator kiểm tra artifact và kết quả thực tế trước khi duyệt phase kế tiếp. Không tự tạo thêm executor, commit, push hoặc triển khai dịch vụ bên ngoài.

**Mục tiêu:** tài khoản học sinh do Admin cấp, PIN 6 số, PIN phụ huynh độc lập, tiến độ riêng từng con và Dashboard có gợi ý hỗ trợ dựa trên lịch sử học thật.

**Kiến trúc v2:** giữ React/Vite và gameplay hiện tại; API TypeScript qua Netlify Functions, dữ liệu trong Supabase PostgreSQL. Toàn bộ đăng nhập/quyền/ghi tiến độ đi qua API cùng origin, trình duyệt không kết nối database trực tiếp. Phát triển bằng Netlify Dev và Supabase local trước, GitHub/Netlify/Supabase cloud chỉ ở phase phát hành sau.

**Công nghệ:** TypeScript, React, Vite, Vitest; Netlify Functions/Dev; Supabase CLI/PostgreSQL; driver Postgres.js phía server theo hướng dẫn Supabase. Không đưa thêm framework Dashboard lớn. Phiên bản công cụ được pin sau kiểm tra tương thích ở P0. Quyết định kiến trúc và điều kiện môi trường xem mục 11.

## 1. Hiện trạng đã kiểm tra

- `src/progress/storage.ts`: một khóa `hoc-vui-progress-v1` cho cả trình duyệt; chưa có chủ sở hữu tài khoản. Có kiểm tra dữ liệu, backup JSON giới hạn 1 MB và cơ chế giữ dữ liệu lỗi để phục hồi.
- `src/content/types.ts`, `src/game/session.ts`: giữ phiên học hiện hành và các lượt trả lời của phiên đó; chưa phải kho lịch sử lâu dài. ID phiên mặc định `session-new`, ID lượt trả lời theo thứ tự trong phiên, không đủ duy nhất cho đồng bộ nhiều thiết bị.
- `src/App.tsx`: đọc/ghi tiến độ, điều hướng và xử lý gameplay cùng tại đây. Nút HUD hiện điều hướng trực tiếp đến phụ huynh.
- `src/views/ParentView.tsx`: có tổng nhiệm vụ/dấu, phiên hiện tại và backup/reset; chưa có PIN. Một số câu chữ vẫn nói mọi bài đều mở, cần sửa theo quy tắc mở khóa tuần tự đang có.
- `src/pwa/offline.ts`: cache nội dung tĩnh cho chơi offline. Khi thêm tài khoản, cần phân biệt rõ “nội dung đã tải” với “tiến độ đã đồng bộ”.
- `package.json`: ứng dụng frontend, chưa khai báo backend/database/auth. README còn mô tả 3 nhiệm vụ; kế hoạch dùng yêu cầu hiện tại 29 bài × 5 nhiệm vụ và phải cập nhật tài liệu lỗi thời.

## 2. Quyết định sản phẩm đề xuất để duyệt

### 2.1 Học sinh

- Admin tạo toàn bộ tài khoản; không có đăng ký tự do, email, số điện thoại hoặc OTP.
- Tên đăng nhập 3–16 ký tự: chữ Latin không dấu và số, ví dụ `minhan`, `bao04`. Bỏ khoảng trắng đầu/cuối, không phân biệt hoa thường; tên hiển thị riêng cho phép tiếng Việt. `admin` là tên dành riêng.
- PIN là chuỗi đúng 6 chữ số, giữ được số 0 ở đầu, nhập bằng bàn phím số và hỗ trợ dán mã.
- Tài khoản mới có PIN `123456`. Lần đầu xác thực chỉ được mở màn đặt PIN mới, chưa được vào game/API học tập. Nhập PIN mới hai lần, khác `123456`; không thêm quy tắc phức tạp khác.
- Refresh khi chưa đổi PIN vẫn ở bước đổi PIN. Sau khi đổi thành công mới vào màn bắt đầu.
- Đăng nhập bình thường vào màn bắt đầu, có nút tiếp tục bài đang dở. Refresh trong phiên đăng nhập giữ đúng trang đang xem; trang riêng tư chỉ phục hồi sau kiểm tra phiên.
- Ghi nhớ tên đăng nhập gần nhất; mặc định phiên học tồn tại 7 ngày, đăng xuất/chuyển tài khoản rõ ràng. Không lưu PIN để tự điền. Sau khi đăng xuất, người tiếp theo không nhìn thấy dữ liệu của con trước.
- Học sinh đổi PIN bằng PIN hiện tại; quên PIN nhờ Admin đặt lại. Reset PIN không reset tiến độ.

### 2.2 Admin

- Đăng nhập qua lối nhỏ “Quản trị” tại màn đăng nhập, không đưa vào dock chơi.
- Tài khoản khởi tạo đúng yêu cầu: `Admin`, mật khẩu `123456@`; **không bắt buộc đổi mật khẩu lần đầu**. Có chức năng đổi mật khẩu tự nguyện.
- Khởi tạo một lần khi cài hệ thống; restart/deploy không tạo lại và không ghi đè mật khẩu đã đổi. Không nhúng mật khẩu vào bundle frontend hay ghi log.
- Tạo một hoặc nhiều học sinh bằng danh sách tên; xem trước lỗi trùng/sai trước khi xác nhận. Hiển thị rõ dòng thành công/thất bại, gửi lại không tạo trùng.
- Tìm kiếm, sửa tên hiển thị, vô hiệu hóa/kích hoạt, đặt lại riêng PIN học sinh hoặc PIN phụ huynh, xem tổng quan tiến độ lớp. Phiên bị thu hồi khi vô hiệu hóa hoặc reset thông tin tương ứng.
- Không hiển thị PIN hiện tại. Sau reset, PIN trở về `123456`, bật lại yêu cầu đổi lần đầu; reset học sinh không đổi PIN phụ huynh và ngược lại.
- Bản đầu dùng vô hiệu hóa thay xóa tài khoản. Xóa hẳn không nằm trong phạm vi này. Có nhật ký thao tác quản trị và backup/restore vận hành.
- Phiên Admin tối đa 8 giờ; không cần CAPTCHA, MFA hay đăng nhập mạng xã hội.

### 2.3 Phụ huynh

- Không tạo tài khoản phụ huynh. Nút “Phụ huynh” trên HUD mở hộp nhập PIN dành cho **học sinh đang đăng nhập**, nêu rõ tên con.
- Mỗi hồ sơ con có PIN phụ huynh riêng, độc lập với PIN học sinh. Hai PIN khởi tạo đều là `123456`, nhưng đổi/reset mã này không tác động mã kia.
- Đúng PIN mặc định lần đầu → bắt đặt PIN phụ huynh mới hai lần → mới vào Dashboard. Không thể bỏ qua bằng refresh, Back hoặc gọi API.
- Mỗi lần mở lại từ HUD phải nhập PIN; quyền tạm thời hết khi rời Dashboard, refresh, đăng xuất/đổi con hoặc sau 15 phút không hoạt động. Thao tác trong Dashboard không hỏi lại liên tục.
- Phụ huynh dùng thiết bị khác đăng nhập tài khoản của con trước, sau đó bấm HUD và nhập PIN phụ huynh. Không dùng một PIN chung để lựa chọn bất kỳ con nào.
- Đổi PIN phụ huynh cần PIN hiện tại; quên mã nhờ Admin reset. Khi chưa đăng nhập học sinh, hướng dẫn đăng nhập tài khoản con trước.
- Giới hạn thực tế đã chấp nhận: khi PIN còn mặc định, người biết mã mặc định có thể là người đặt mã mới đầu tiên. Hướng dẫn Admin/phụ huynh thiết lập PIN phụ huynh trước khi bàn giao thiết bị; không bổ sung OTP hoặc tài khoản người lớn.

## 3. Lựa chọn lưu trữ và vận hành

| Phương án | Đáp ứng | Đánh đổi |
|---|---|---|
| API/database dùng qua Internet — đề xuất | Cùng tài khoản ở trường/nhà; Admin quản lý tập trung; phụ huynh thấy tiến độ đã đồng bộ | Cần nơi chạy API/database và kết nối khi đăng nhập |
| API/database trên máy trong LAN | Quản lý tập trung trong lớp | Ngoài mạng lớp không truy cập được nếu chưa có kết nối riêng |
| Chỉ tạo tài khoản trong localStorage | Dễ dựng bản thử trên một máy | Không đáp ứng tài khoản dùng chung nhiều thiết bị; không chọn làm bản hoàn chỉnh |

Người dùng đã chọn phương án Internet: Netlify host frontend/API, Supabase database, GitHub lưu source. Bảng trên giữ để giải thích lựa chọn; không còn yêu cầu lựa chọn Internet/LAN. P0 chuẩn bị local; P9 mới xác nhận project cloud, tên miền, backup và chi phí trước khi provision. Máy Mac là môi trường phát triển.

Mức bảo vệ vừa đủ: PIN/mật khẩu băm có salt bằng thư viện chuẩn phía server; cookie phiên HttpOnly, HTTPS khi chạy Internet, kiểm tra quyền tại API, chống gửi yêu cầu trái nguồn cho thao tác ghi và giới hạn thử PIN có thời gian chờ ngắn. Đề xuất sau 5 lần sai liên tiếp chờ 30 giây theo tài khoản và thiết bị/nguồn; không khóa vĩnh viễn. PIN/mật khẩu không xuất hiện trong log, analytics hoặc backup tiến độ.

## 4. Luồng dữ liệu và giao ước tích hợp

### Mô hình dữ liệu

| Nhóm | Trường và quy tắc chính |
|---|---|
| Student | UUID bất biến, username chuẩn hóa duy nhất, displayName, active, createdAt |
| Credential | ownerId, loại student/parent/admin, hash, mustChange, credentialVersion; không trả hash qua API |
| AuthSession | token băm, ownerId, quyền student/admin hoặc change-only, hạn dùng, revokedAt |
| ParentGrant | studentId, studentSessionId, parentCredentialVersion, hạn dùng; cấp riêng sau nhập PIN |
| LearningRun | runId UUID, studentId, lessonId, lessonVersion, deviceId, trạng thái, thời gian bắt đầu/kết thúc |
| LearningEvent | eventId UUID, runId, sequence, loại sự kiện, activityId, response/hint, clientTime, receivedAt; unique eventId và unique runId+sequence |
| ProgressSnapshot | studentId, schemaVersion, revision, nhiệm vụ/dấu, phiên tiếp tục, cài đặt theo con, thời điểm cập nhật |
| MigrationReceipt | fingerprint dữ liệu cũ, studentId, trạng thái và kết quả nhập; ngăn nhập lặp hoặc gán sang con khác |
| AdminAudit | người thực hiện, hành động, đối tượng, thời gian, kết quả; không ghi bí mật |

Các sự kiện gồm mở phiên, xem xong tư liệu, gửi đáp án, dùng gợi ý, chuyển bước, hoàn thành nhiệm vụ/bài và nhịp tương tác phục vụ tính thời gian. API đánh giá lại câu trả lời bằng logic nội dung đã có, không tin cờ `correct` hoặc danh sách dấu do client gửi. Lịch sử được giữ khi học lại hoặc chuyển bài; dữ liệu cũ chỉ chứa bằng chứng nào thì di chuyển bằng chứng đó.

### API dự kiến

| Endpoint | Quyền và kết quả |
|---|---|
| POST /api/auth/student/login | username + PIN → phiên đầy đủ hoặc change-only |
| POST /api/auth/student/change-pin | phiên change-only hoặc PIN hiện tại → đổi mã, xoay phiên |
| POST /api/auth/admin/login | username + password → phiên Admin |
| POST /api/auth/admin/change-password | Admin + mật khẩu hiện tại → đổi mã, thu hồi phiên cũ |
| GET /api/auth/me; POST /api/auth/logout | kiểm tra/thu hồi phiên; logout thu hồi parent grant |
| POST /api/parent/unlock, /change-pin, /lock | PIN phụ huynh → grant hoặc change-only; không nhận studentId tùy ý từ client |
| GET/POST /api/admin/students; PATCH /api/admin/students/:id | chỉ Admin; tạo lẻ/batch, sửa hồ sơ/trạng thái |
| POST /api/admin/students/:id/reset-pin | chỉ Admin, loại student hoặc parent; audit bắt buộc |
| GET /api/admin/summary | tổng quan lớp dành riêng Admin |
| GET /api/me/progress; POST /api/me/events | chỉ con hiện hành; ghi batch nguyên tử, chống gửi trùng, trả revision và event acknowledgements |
| GET /api/parent/dashboard?range=7d/30d/all | chỉ grant hợp lệ; dữ liệu con hiện hành, thời điểm đồng bộ và độ đủ dữ liệu |
| GET /api/parent/export | backup của con, không chứa credentials |
| POST /api/parent/import-preview, /import-confirm, /reset-progress | xem trước phạm vi; xác nhận gắn revision/token một lần; sao lưu trước thao tác thay đổi |

Frontend dùng `AuthProvider`, `AccountProgressProvider`, `ParentGate` thay vì kiểm tra quyền rải rác trong từng view. API trả mã lỗi thống nhất cho sai mã, cần đổi mã, phiên hết hạn, tài khoản khóa, conflict và mất mạng. Không dùng lỗi HTTP làm nội dung trực tiếp cho trẻ.

## 5. Đồng bộ, offline và chuyển dữ liệu cũ

- Đăng nhập mới, đổi/reset PIN, vào phụ huynh và quản trị cần kết nối server. Khi offline không xác thực bằng bản PIN lưu cục bộ.
- Học sinh đang chơi có thể tiếp tục phiên đã tải khi mất mạng ngắn: lưu sự kiện trong IndexedDB theo studentId; báo “Đã lưu trên máy — đang chờ đồng bộ”. Cold start offline ở bản đầu hiển thị hướng dẫn kết nối để xác minh tài khoản, không hứa đăng nhập offline đầy đủ.
- Khi có mạng: xác thực lại, gửi event theo thứ tự, xóa khỏi hàng đợi chỉ khi server xác nhận. Retry cùng eventId không tăng số lượt trả lời/dấu.
- Logout/chuyển tài khoản: dừng listener/timer cũ, hủy request hoặc bỏ kết quả đến muộn, che sạch dữ liệu UI và cache bộ nhớ. Hàng đợi chưa gửi giữ theo chủ sở hữu; chỉ gửi khi đúng học sinh đăng nhập lại. Không gửi dữ liệu A bằng phiên của B.
- Hai thiết bị: có runId riêng, server tổng hợp hoàn thành theo tập hợp, không dùng last-write-wins xóa tiến độ. Mỗi run có thiết bị ghi; nếu hai tab cùng run thì tab sau chuyển read-only hoặc mở run mới qua xác nhận. Phiên tiếp tục chọn run chưa xong được server nhận gần nhất, cho phép chọn lại run còn lại. Không trộn state của hai run.
- Offline đổi/reset/vô hiệu hóa từ xa chỉ phát hiện khi kết nối lại. Event của tài khoản bị vô hiệu hóa không được ghi cho tới khi Admin kích hoạt lại; giữ hàng đợi và thông báo đúng tình trạng.
- Dữ liệu `hoc-vui-progress-v1` chưa biết chủ: không tự gán cho học sinh đầu tiên. Sau đăng nhập và PIN phụ huynh hợp lệ, cho xem trước số nhiệm vụ/dấu, tên tài khoản nhận và xác nhận nhập. Có thể bỏ qua.
- Sao lưu raw trước chuyển, validate bằng quy tắc legacy hiện có, tạo receipt chống nhập lặp; không xóa bản cũ trước khi server xác nhận. Dữ liệu hỏng giữ nguyên để xuất/phục hồi, không tạo thành tích giả.
- Tiến độ cũ không có lịch sử đầy đủ: hiển thị “Tiến độ được chuyển từ bản cũ”; không suy ra ngày học, thời lượng hay tỷ lệ đúng lịch sử. Backup/import mới có owner/schema/contentVersion; tệp thuộc con khác bị chặn, Admin mới được xử lý chuyển chủ có audit.
- Reset tiến độ trong Dashboard cần xác nhận ghi rõ tên con, backup trước, tăng generation để event cũ không làm sống lại dấu đã reset; hỗ trợ khôi phục từ bản trước reset.

## 6. Dashboard trực quan và phân tích hỗ trợ con

### Bố cục

1. Đầu trang: tên con, lần học gần nhất, lần đồng bộ mới nhất, bộ lọc 7 ngày/30 ngày/toàn bộ.
2. Tổng quan: bài hoàn thành/29, nhiệm vụ hoàn thành/145, ngày có hoạt động trong khoảng chọn, số dấu/pet đã mở. Tổng thành tích là lũy kế và ghi rõ; thống kê học tập theo bộ lọc.
3. Biểu đồ: hoạt động theo ngày và bản đồ 6 vùng/29 bài; phân biệt chưa mở, đang học, hoàn thành. Bấm một bài xem bằng chứng từng nhiệm vụ.
4. “Con đang làm tốt” và “Cùng con thử tiếp”: tối đa 3 gợi ý ngắn, có ví dụ hoạt động 5–10 phút, liên kết bài và nguồn SGK đã kiểm chứng.
5. Chi tiết theo bài/dạng trò chơi: lượt thử, đúng lần đầu, dùng gợi ý, hoàn thành sau luyện lại. Có bảng chữ tương đương biểu đồ trên điện thoại.
6. Khu quản lý phía dưới: đổi PIN phụ huynh, xuất/nhập/reset có xác nhận. Tách khỏi phần đọc nhanh; dùng artwork đã có, thẻ nhẹ và gọn, không biến màn học sinh thành dashboard công việc.

### Định nghĩa chỉ số

- Đúng lần đầu ở chi tiết phiên = số activity có lần trả lời hợp lệ đầu tiên đúng / số activity đã có trả lời đầu tiên, nhóm theo runId+activityId. Với tổng quan và luật gợi ý, gộp activityId+lessonVersion, chọn lần tiếp xúc sớm nhất trong khoảng lọc để học lại không nhân số mẫu; kết quả luyện lại hiển thị riêng. Báo thêm “tự làm” nếu không dùng gợi ý trước lần đầu. Không lấy tỷ lệ tất cả lượt thử để gọi là năng lực.
- Dùng gợi ý = số activity có sự kiện gợi ý / số activity đã bắt đầu tương tác; luôn hiển thị số lượng mẫu.
- Thời gian tương tác ước tính: cộng các đoạn heartbeat khi tab visible và có tương tác trong 60 giây gần nhất, heartbeat mỗi 15 giây, cắt khi hidden/idle/logout. Không tính tab mở cả ngày; ghi nhãn “ước tính”.
- Ngày hoạt động: có tương tác học thật, không chỉ đăng nhập; quy về Asia/Ho_Chi_Minh. Event offline có clientTime ngoài giới hạn hợp lý được đánh dấu, không âm thầm đưa vào biểu đồ ngày sai.
- Dữ liệu ít: dưới 5 activity khác nhau trong một chủ đề → “Chưa đủ dữ liệu để nhận xét”, kèm gợi ý chung. Ô chưa có dữ liệu dùng “Chưa có”, không dùng 0% mang ý nghĩa đánh giá.
- Luật gợi ý bản đầu: trong khoảng chọn, ≥5 activity khác nhau và ≥80% đúng lần đầu không gợi ý → ghi nhận điểm mạnh; ≥3 activity khác nhau phải thử từ 2 lần hoặc ≥50% activity dùng gợi ý → đề xuất cùng đọc lại đúng phần SGK. Nếu nhiều luật trùng, gộp theo chủ đề.
- Luật cố định, có phiên bản và test; không cần AI/LLM hay gửi dữ liệu học sinh ra dịch vụ phân tích. Ngưỡng là quy tắc sản phẩm, không phải chẩn đoán giáo dục. Không gắn nhãn “yếu”, so sánh xếp hạng trẻ hoặc coi dùng gợi ý là xấu.
- Mỗi gợi ý phải có bằng chứng, ví dụ “3/6 hoạt động ghép cặp cần thử lại”, ngày/phạm vi và một việc phụ huynh có thể làm. Chỉ dẫn SGK lấy từ mapping hiện tại đã xác minh; thiếu trang thì dẫn tên bài, không bịa số trang.

## 7. Phase và packet thực hiện

Mỗi packet: viết test hành vi cho thay đổi dữ liệu/quyền → chạy thấy lỗi dự kiến → triển khai → chạy lại → gửi danh sách file, lệnh/exit code, ảnh nếu đổi UI, hạn chế. Dừng READY_FOR_REVIEW; coordinator duyệt mới qua dependency tiếp theo. Phạm vi file mới dưới đây là thiết kế đề xuất, chưa được tạo.

### P0 — Chốt phương án và baseline

**Phụ thuộc:** người dùng duyệt triển khai localhost sau báo cáo rà soát v2. Phương án sản phẩm và nền tảng đã được chốt.

- [ ] P0.1 Chuẩn bị Netlify Dev + Supabase CLI/runtime container local theo mục 11; xác minh origin hiện dùng trước đổi cổng, không đụng runtime của dự án khác. Chỉ local, dữ liệu tổng hợp.
- [ ] P0.2 Snapshot mã, asset, dữ liệu test, hash và lệnh chạy. Không dùng tiến độ thật của con để test ghi/xóa.
- [ ] P0.3 Tạo ledger `docs/executor/ACCOUNTS-DASHBOARD-EXECUTION.md`: phase, packet, executor, write-set, bằng chứng, lỗi mở, quyết định audit, next action.
- [ ] P0.4 Chạy baseline `npm run typecheck`, `npm test`, `npm run build`; ghi rõ fail có sẵn. Kiểm tra trạng thái Git thật trước mọi thao tác lifecycle.

**Nghiệm thu:** quyết định hạ tầng cụ thể, backup đọc lại được, baseline có kết quả thực tế; chưa bật login trên bản học sinh đang dùng.

### P1 — API, database và tài khoản lõi

**Phụ thuộc:** P0. **File:** tạo `server/auth/`, `server/db/client.ts`, `supabase/migrations/`, `supabase/config.toml`, `server/accounts/`, `server/app.ts`, `netlify/functions/api.ts`, `netlify.toml`, `shared/account-contracts.ts`, test tương ứng; cập nhật scripts/config cần thiết. Một nguồn migration duy nhất ở `supabase/migrations/`.

- [ ] P1.1 Schema/constraints/transaction và migration version; seed Admin một lần, chạy lại không đổi credential.
- [ ] P1.2 Login student/admin, cookie/session, trạng thái change-only, đổi mã và logout; giới hạn thử sai. Phiên và bộ đếm lưu PostgreSQL, không nằm trong RAM function; khóa/thao tác đổi credential và tạo phiên phải nguyên tử.
- [ ] P1.3 Tạo/sửa/vô hiệu hóa/reset PIN ở API; reset độc lập, thu hồi phiên đúng phạm vi, audit.
- [ ] P1.4 Contract test: `bao04` và `Bao04` không tạo hai tài khoản; PIN `012345` hợp lệ; 5/7 số bị từ chối; mặc định bắt đổi; Admin không bị bắt đổi; student gọi API admin bị chặn.

**Nghiệm thu:** test chạy trên database thử thật, không chỉ mock; seed idempotent; không có credential trong build/log/API response. Migration rollback thử trên dữ liệu tổng hợp.

### P2 — Màn đăng nhập và quản trị học sinh

**Phụ thuộc:** P1. **File:** tạo `src/auth/`, `src/views/LoginView.tsx`, `src/views/ChangePinView.tsx`, `src/views/AdminView.tsx`, CSS/test; sửa `src/App.tsx`, `src/app/navigation.ts`, HUD.

- [ ] P2.1 Login dành trẻ: tên ngắn, PIN 6 số, báo lỗi dễ hiểu, bàn phím số, focus/dán mã, trạng thái chờ chống double-submit.
- [ ] P2.2 First-login không bỏ qua; refresh/logout/back đúng trạng thái; không mất PIN mới nếu phản hồi mạng đến chậm — kiểm tra lại phiên trước yêu cầu reset.
- [ ] P2.3 Admin tạo lẻ/batch có preview, tìm kiếm, sửa tên, reset từng loại PIN, vô hiệu hóa; thông báo từng dòng.
- [ ] P2.4 Tách auth state khỏi gameplay trong App; chặn route riêng tư trước render để không ló dữ liệu; trang mặc định/refresh đúng yêu cầu.

**Nghiệm thu:** E2E Admin tạo hai học sinh, mỗi con đổi PIN lần đầu và vào màn bắt đầu; không thể mở game bằng route trực tiếp khi change-only. UI 390×844, 820×1180, 1180×820 và 1440×900.

### P3 — Tiến độ theo tài khoản và lịch sử học

**Phụ thuộc:** P1–P2. **File:** tạo `server/learning/`, `shared/learning-contracts.ts`, `src/progress/accountProgress.ts`, `src/progress/eventQueue.ts`; sửa `src/App.tsx`, `src/game/session.ts`, `src/content/types.ts`, storage adapter.

- [ ] P3.1 UUID cho run/event; thêm owner/schema/revision; lưu event ở ranh giới gameplay mà không đổi quy tắc đánh giá và trao thưởng.
- [ ] P3.2 Server replay/validate event và lessonVersion; event sai bước, sai content hoặc tự nhận dấu bị từ chối có mã lỗi.
- [ ] P3.3 Giữ mọi run khi chuyển bài/học lại; tổng hợp dấu/nhiệm vụ không trùng; pet và mở bài n+1 vẫn đúng.
- [ ] P3.4 Queue/retry/ack, hai tab, hai thiết bị, request đến muộn và logout; kiểm tra tách A/B cả bộ nhớ, storage, API.

**Nghiệm thu:** A và B cùng máy không lẫn dữ liệu; A đổi thiết bị có tiến độ sau đồng bộ; gửi cùng event 3 lần chỉ ghi một; hoàn thành 5 nhiệm vụ mở bài tiếp; lịch sử bài trước còn sau mở bài mới.

### P4 — Chuyển tiến độ cũ, backup và khả năng phục hồi

**Phụ thuộc:** P3, P5 cho luồng xác nhận phụ huynh tích hợp. Có thể xây logic migration trước P5 nhưng chưa cho người dùng nhập.
**File:** tạo `src/progress/accountMigration.ts`, `server/learning/import.ts`, `server/learning/reset.ts`; sửa storage/backup tests và `src/pwa/offline.ts`.

- [ ] P4.1 Preview legacy, receipt gắn owner, backup trước ghi; tương thích dấu cũ đã được công nhận mà không giả tạo activity history.
- [ ] P4.2 Import/export schema mới, kiểm tra owner/dung lượng/version; lỗi một bước không thay một phần dữ liệu.
- [ ] P4.3 Reset có snapshot/generation; stale event/import bị chặn; restore thử thật.
- [ ] P4.4 Phân biệt static offline và sync; API cá nhân không vào precache; lỗi quota/IndexedDB/mất mạng phải báo đúng khả năng lưu.

**Nghiệm thu:** nhập lặp không nhân đôi; không chuyển tự động sang con đầu; tệp lỗi giữ bản gốc; mất mạng giữa import retry an toàn; logout khi còn queue không trộn dữ liệu; restore đưa về đúng snapshot.

### P5 — Cổng PIN phụ huynh

**Phụ thuộc:** P1–P3. **File:** tạo `server/parent/access.ts`, `src/auth/ParentGate.tsx`, `src/auth/ParentPinDialog.tsx`; sửa HUD/App/ParentView, test route/API.

- [ ] P5.1 HUD → hộp PIN có tên con → đổi lần đầu → Dashboard. Cancel trở lại màn hiện hành.
- [ ] P5.2 ParentGrant theo phiên con; đổi mã, hết hạn, thoát, refresh và đổi con đều thu hồi/đòi xác thực đúng chính sách.
- [ ] P5.3 Bảo vệ API Dashboard/backup/import/reset, không chỉ ẩn giao diện; học sinh không tự nhận grant bằng đổi local state.
- [ ] P5.4 Test PIN phụ huynh mới không thay PIN học sinh; reset một loại không reset loại kia; grant của A không đọc B; mặc định chưa đổi không đọc Dashboard.

**Nghiệm thu:** mọi cửa vào trang/API đều kiểm tra grant; bấm HUD mở lại luôn nhập PIN. Không thêm tài khoản phụ huynh.

### P6 — Chỉ số và gợi ý có bằng chứng

**Phụ thuộc:** P3. **File:** tạo `server/analytics/metrics.ts`, `server/analytics/recommendations.ts`, `shared/dashboard-contracts.ts`, `src/analytics/activityTime.ts` và test fixtures.

- [ ] P6.1 Tính đúng lần đầu, gợi ý, số ngày, thời gian tương tác, tiến độ theo quy tắc mục 6; lưu provenance và ruleVersion.
- [ ] P6.2 Gợi ý theo chủ đề/hoạt động và mapping SGK; xử lý ít mẫu, dữ liệu cũ, không có dữ liệu, học lại.
- [ ] P6.3 Fixture kiểm chứng: 10 activity đầu, 8 đúng không gợi ý → 80%; 4 activity → chưa kết luận; retry không tăng mẫu activity; tab hidden không cộng thời gian.
- [ ] P6.4 Kiểm tra range/múi giờ, trùng event, event offline đến muộn và reset generation; Dashboard cho biết độ mới dữ liệu.

**Nghiệm thu:** số tính tay khớp API; mọi gợi ý truy ra bằng chứng; không suy đoán lịch sử thiếu; không thêm dịch vụ AI.

### P7 — Dashboard phụ huynh và tổng quan Admin

**Phụ thuộc:** P4–P6. **File:** sửa `src/views/ParentView.tsx`; tạo `src/components/parent/` gồm Summary, ActivityChart, LessonMap, SupportSuggestions, History, DataTools và CSS/test; tích hợp summary vào AdminView.

- [ ] P7.1 Dựng bố cục mục 6, biểu đồ có bảng dữ liệu tương đương, lọc ngày và drill-down từng bài.
- [ ] P7.2 Loading/empty/error/stale/legacy states; sửa copy “tất cả bài đang mở” theo trạng thái thật.
- [ ] P7.3 Tích hợp đổi PIN/backup/import/reset từ P4–P5; tên con và phạm vi luôn rõ; dữ liệu chưa đồng bộ không giả báo đã lưu trên server.
- [ ] P7.4 Audit ngang/dọc, focus/modal/bàn phím số, touch target, chữ tiếng Việt, không bị HUD/dock che; hình ảnh hiện có dùng vừa phải.

**Nghiệm thu:** phụ huynh nhìn nhanh biết con đang học gì, điểm làm tốt và một việc cụ thể nên cùng con làm; tất cả số khớp fixture/backend; không lộ Dashboard trước nhập PIN.

### P8 — Audit toàn hệ thống và thử nghiệm lớp nhỏ

**Phụ thuộc:** P4–P7. **File:** `tests/e2e/accounts-parent.spec.ts`, các integration test, `docs/executor/ACCOUNTS-DASHBOARD-AUDIT.md`.

- [ ] P8.1 Chạy typecheck, toàn bộ unit/integration, production build, E2E trình duyệt; thêm cấu hình E2E nếu workspace chưa có.
- [ ] P8.2 Chạy ma trận mục 8; kiểm tra API với session thật cho A/B/Admin/parent/change-only, không chỉ DOM.
- [ ] P8.3 Pilot localhost bằng tài khoản tổng hợp; mô phỏng 30 học sinh hoạt động đồng thời như giả định kiểm thử. Pilot online nhóm nhỏ chuyển sang P9.
- [ ] P8.4 Mục tiêu local: không mất/trùng event; login dưới 2 giây và Dashboard dưới 3 giây trong điều kiện thử được ghi lại. Đo lại ở P9 trên cloud. Lỗi dữ liệu/quyền bắt buộc sửa trước phát hành; không xem benchmark local là bằng chứng production.

**Nghiệm thu:** không còn lỗi nghiêm trọng về mất dữ liệu, xuyên tài khoản, bypass PIN hoặc gameplay; báo cáo PASS/FAIL kèm bằng chứng và hạn chế, người dùng nghiệm thu bản thử.

### P9 — Phát hành có phục hồi và bàn giao

**Phụ thuộc:** P8 và người dùng duyệt riêng việc đưa lên mạng. P9 chưa thuộc phạm vi triển khai localhost.

- [ ] P9.1 Backup database, cấu hình và build cũ; diễn tập restore; tài liệu Admin tạo tài khoản/reset PIN và tài liệu phụ huynh lần đầu.
- [ ] P9.2 Chuẩn bị GitHub repo private, push source đã rà secret/asset; tạo Supabase cloud và kết nối Netlify theo môi trường được duyệt. Áp migration database trước; Netlify build/deploy frontend và functions cùng artifact, smoke tài khoản thử. Không reset Admin hoặc tiến độ khi deploy. Preview không dùng database production.
- [ ] P9.3 Kiểm tra service worker nâng phiên bản, phiên đăng nhập, hai thiết bị và queue; hướng dẫn cập nhật app không mất dữ liệu.
- [ ] P9.4 Nếu lỗi: dừng thao tác ghi bị ảnh hưởng, giữ event queue/database, phục hồi bản server/frontend tương thích; không quay về bản local-only đang ghi dữ liệu thật một cách mù quáng. Dữ liệu phát sinh sau backup phải được đối soát trước restore.
- [ ] P9.5 Cập nhật README, giới hạn offline, runbook backup định kỳ/restore, ledger và danh sách kiểm tra vận hành. Backup database tự động hằng ngày, giữ 14 bản gần nhất theo cấu hình hạ tầng được duyệt; không cần gửi thông báo định kỳ cho người dùng.

**Nghiệm thu:** đường truy cập thực tế hoạt động, tài liệu bàn giao đầy đủ, restore có bằng chứng; không gọi bản build local là đã phát hành.

## 8. Ma trận audit bắt buộc

| Mã | Tình huống | Kết quả cần có |
|---|---|---|
| A01 | Student lần đầu dùng 123456 | Chỉ đổi PIN, chưa chơi được |
| A02 | Refresh/Back/gọi API trước đổi PIN | Không vượt cổng |
| A03 | Admin lần đầu | Vào quản trị, không ép đổi mật khẩu |
| A04 | Username khác hoa thường/PIN có số 0 đầu | Chuẩn hóa đúng, không trùng tài khoản |
| A05 | Reset/vô hiệu hóa khi có phiên cũ | Phiên đúng loại mất hiệu lực; tiến độ giữ nguyên |
| D01 | A logout, B login cùng thiết bị | Không thấy/ghi dữ liệu A |
| D02 | A ghi offline rồi B login | Queue A giữ riêng, không upload dưới B |
| D03 | Gửi event trùng/sai thứ tự/hai tab | Không nhân thành tích, trả conflict rõ |
| D04 | Hai thiết bị/học lại/chuyển bài | Không mất lịch sử, không trộn run |
| D05 | Import legacy lỗi/lặp/khác chủ | Không ghi sai hoặc phá dữ liệu cũ |
| D06 | Reset rồi event cũ quay lại | Không tái sinh tiến độ đã reset |
| P01 | HUD lần đầu nhập PIN phụ huynh | Buộc đổi mã riêng trước Dashboard |
| P02 | Thoát/refresh/đổi con/timeout | Grant không được tái sử dụng |
| P03 | Gọi API parent bằng student session | Bị từ chối; không lộ dữ liệu |
| M01 | Dữ liệu ít/legacy/idle/offline | Không bịa chỉ số hay kết luận |
| M02 | Fixture đủ dữ liệu | Số và gợi ý đúng, có nguồn bằng chứng |
| G01 | 29 bài, 5 nhiệm vụ, dấu, pet | Gameplay và mở khóa tuần tự không hồi quy |
| U01 | Tablet ngang/dọc, điện thoại | PIN dễ nhập, modal/focus đúng, không bị menu che |
| O01 | Deploy lại/backup/restore | Không seed đè Admin, phục hồi được |

## 9. Tổ chức thực thi và điểm duyệt

- Thứ tự thực thi rõ ràng: **P0 → P1 → P2 → P3 → P5 → P4 → P6 → P7 → P8**; dừng để người dùng nghiệm thu local. **P9** chỉ sau duyệt phát hành. Giữ ID cũ để đối chiếu tài liệu, không thực hiện P4 trước cổng PIN P5.
- Sau khi duyệt kế hoạch, coordinator chia packet nhỏ, một executor triển khai tuần tự theo workflow đã chọn; coordinator sở hữu spec, audit và quyết định nghiệm thu. Không tạo task triển khai trong bước lập kế hoạch này.
- Không sửa mã cùng write-set trong lúc executor đang làm. Mỗi lần gián đoạn quota tiếp tục từ ledger và artifact, không triển khai lại packet đã qua audit.
- Người dùng đã duyệt phương án nhưng yêu cầu duyệt báo cáo lần cuối mới triển khai. **Chưa có quyền bắt đầu P0–P8 ở lượt rà soát này.** Sau duyệt tiếp theo, thực hiện local; P9, tạo dịch vụ, phát sinh phí và dùng dữ liệu học sinh thật vẫn có điểm duyệt riêng.
- Sản phẩm giữ phương án đã duyệt: vận hành qua Internet; PIN phụ huynh riêng từng con; login online + chịu mất mạng giữa phiên; phiên học 7 ngày; mỗi lần mở phụ huynh nhập PIN; không xóa hẳn tài khoản trong bản đầu.
- Báo cáo mỗi phase gồm: mục tiêu, file thay đổi, lệnh/exit code, kết quả audit, ảnh UI khi cần, dữ liệu migration/rollback và việc còn lại. Chỉ ghi DONE khi parent đã kiểm chứng.

## 10. Tự rà soát kế hoạch

- Bao phủ tài khoản do Admin tạo, PIN 6 số, mã mặc định, bắt đổi student/parent và ngoại lệ Admin: mục 2, P1–P2, P5.
- Dashboard và gợi ý: mục 6, P6–P7; bao gồm nguồn dữ liệu, định nghĩa chỉ số và giới hạn lịch sử cũ.
- Rủi ro dễ bỏ sót đã có packet: tách người dùng, đa thiết bị, queue logout, reset generation, quyền API, service worker, backup/restore, legacy và hồi quy gameplay.
- Chưa thực hiện thay đổi ứng dụng. Tài liệu này là đối tượng để người dùng duyệt hoặc yêu cầu điều chỉnh trước P0.

## 11. Rà soát kiến trúc v2 — Supabase / GitHub / Netlify

### 11.1 Quyết định xác thực và dữ liệu

- Chọn **Supabase làm PostgreSQL**, không dùng song song Supabase Auth và hệ tài khoản tự quản. Luồng username/PIN, credential độc lập và phiên đã thiết kế ở mục 4 do API ứng dụng quản lý. Điều này không yêu cầu học sinh có email giả hay tài khoản phụ huynh. Đánh đổi: ứng dụng chịu trách nhiệm kiểm thử credential/session thay vì giao cho dịch vụ Auth.
- PIN/mật khẩu băm bằng primitive chuẩn phía server (Node crypto scrypt bất đồng bộ, salt ngẫu nhiên, so sánh constant-time; tham số/version lưu cùng hash và benchmark trong P1). Không tự thiết kế thuật toán mã hóa.
- Token phiên ngẫu nhiên 32 byte; chỉ hash token lưu database. Cookie HttpOnly/SameSite=Lax, Secure ở production; local HTTP chỉ dùng ngoại lệ cấu hình local. API kiểm tra session, credentialVersion, active và quyền cho mỗi yêu cầu.
- Bảng ứng dụng ở schema `hoc_vui_private`, không expose qua Data API; revoke quyền anon/authenticated/PUBLIC; nếu Supabase project riêng không dùng Data API thì tắt Data API. Runtime dùng database role riêng không DDL/superuser; role migration riêng. Không đưa database password/service key vào `VITE_*` hoặc frontend.
- Tenant/student scope được lấy từ phiên đã xác thực, không nhận ownerId client làm nguồn quyền. Truy vấn luôn bind tham số và scope studentId; test đọc/ghi xuyên tài khoản cả endpoint và repository. Không tuyên bố `auth.uid()` bảo vệ custom session này: ứng dụng không dùng Supabase JWT.
- Netlify Functions là adapter mỏng gọi `server/app.ts`. `server/*` giữ logic thuần và database adapter để test; không tạo server Express chạy thường trực cho production.
- Production dùng Supabase transaction pooler, pool tối đa 1 connection mỗi function instance, `prepare:false`, TLS đúng chứng chỉ. Transaction đọc/ghi event, revision, reward và ack trên cùng connection; không dùng session-scoped SET ngoài transaction. Migrations dùng connection phù hợp cho quản trị, không chạy trong request/login/deploy frontend tự động.
- ParentGrant dùng token chỉ giữ trong bộ nhớ trang, gửi header và gắn studentSessionId; refresh làm mất token, rời Dashboard thu hồi qua API và xóa ngay trong client. Nếu request thu hồi không tới server, TTL vẫn giới hạn grant; không dựa vào unload để bảo đảm thu hồi. Grant đổi PIN lần đầu chỉ cho phép endpoint đổi PIN.

### 11.2 Môi trường local và chuyển cloud

| Thành phần | P0–P8 localhost | P9 sau duyệt đưa online |
|---|---|---|
| Frontend/API | Netlify Dev chạy Vite + functions cùng origin | Netlify frontend + Functions |
| Database | Supabase local qua CLI/container, chỉ dữ liệu test | Supabase cloud riêng |
| Migration | SQL version hóa, chạy lại từ database sạch | Cùng chuỗi SQL sau backup và kiểm tra |
| Source | Files local, chuẩn bị ignore và manifest | GitHub private; Netlify liên kết repo |
| Secret | File local được ignore, không in nội dung ra log | Netlify environment variables phía server |
| Preview | Localhost | Database test riêng; không nối production |

- Kiểm tra read-only hiện tại: có Docker CLI nhưng daemon của context hiện hành chưa kết nối được; không thấy lệnh Supabase CLI/Netlify CLI trong PATH; thư mục chưa là Git repository. Đây là việc chuẩn bị của P0, **chưa phải môi trường đã chạy được**. Chưa khởi động/cài đặt hoặc thay Docker context trong lượt rà soát.
- P0 kiểm tra runtime container, dung lượng và cổng; cấu hình riêng Học Vui, không tự dùng lại/xóa database hay VM của dự án khác. Dữ liệu container đặt trên volume runtime thích hợp, không bind database trực tiếp vào thư mục source ExFAT.
- Nếu local runtime không hoạt động, dừng packet P0 và báo nguyên nhân; không âm thầm chuyển sang Supabase cloud. Chỉ dùng database dev cloud nếu người dùng đồng ý ngoại lệ.
- Origin là host + port: đổi `localhost` sang `127.0.0.1` hoặc đổi cổng làm localStorage cũ không xuất hiện. Trước đổi cổng, xác minh origin đang dùng; giữ origin qua Netlify Dev nếu khả thi hoặc xuất backup từ origin cũ. Không diễn giải storage trống ở cổng mới thành mất tiến độ.
- Chưa cần người dùng cung cấp key Supabase, GitHub repo hay Netlify token để bắt đầu local. Các thông tin cloud thu thập tại P9, không yêu cầu gửi secret qua chat.
- Chuẩn bị `.gitignore` loại `.env*` (trừ mẫu không có secret), `node_modules`, `dist`, `.netlify`, `supabase/.temp`, dump, dữ liệu học sinh, `._*`; rà file ảnh lớn và thư mục evidence trước GitHub push. Chỉ theo dõi source, migrations, lockfile, asset được dùng và tài liệu bàn giao cần thiết; không upload bản scan sách/dữ liệu test riêng tư theo quán tính.
- Backup 14 bản là mục tiêu vận hành của ứng dụng, không giả định gói Supabase bất kỳ cung cấp sẵn. P9 chọn cách backup và chứng minh restore theo gói thực dùng; không hứa tính năng trả phí hiện chưa cấu hình.

### 11.3 Bổ sung kiểm thử bắt buộc

1. Cold restart function vẫn giữ phiên, cooldown và trạng thái đổi mã; hai function cạnh tranh đổi PIN không tạo trạng thái nửa chừng.
2. Truy cập Data API bằng anon không đọc được bảng riêng; role runtime không thay schema; endpoint không tin studentId người gửi.
3. `/api/*` đi vào function trước SPA fallback; 401/403 không bị chuyển thành HTML 200; API response `Cache-Control: no-store`, không bị service worker/cache Netlify giữ lại.
4. Cookie local/production đúng cờ; frontend bundle không chứa DB URL/password; preview không có production credential.
5. Migration từ database sạch và nâng version có kết quả giống nhau; seed Admin chỉ chạy bootstrap, không ghi đè mật khẩu đã đổi.
6. Phụ huynh refresh mất grant; mất mạng lúc rời Dashboard vẫn xóa grant client. Thu hồi đúng student session khi logout/reset.
7. Học lại cùng activity 10 lần không tạo 10 mẫu độc lập để vượt ngưỡng gợi ý. Thiếu dữ liệu hiện “Chưa đủ dữ liệu”.
8. Mất mạng sau server commit nhưng trước client nhận ack: retry không nhân đôi event/reward. Validation và commit có revision check trong transaction; conflict tải lại/retry, không ghi snapshot cũ đè mới.

### 11.4 Kết luận readiness

**Kế hoạch v2 sẵn sàng để người dùng duyệt bắt đầu P0 và triển khai local tuần tự.** Không còn lựa chọn nhà cung cấp hoặc mâu thuẫn dependency chưa giải quyết. Môi trường local cần chuẩn bị/xác minh trong P0, vì Docker daemon hiện chưa truy cập được và CLI chưa có trong PATH. Chưa chứng minh bản runtime mới chạy; không tuyên bố sản phẩm sẵn sàng phát hành. P9 tách khỏi phạm vi lần triển khai local.

### 11.5 Nguồn chính thức đối chiếu trong lần rà soát

- [Netlify Functions](https://docs.netlify.com/build/functions/overview/): môi trường function tạm thời và deploy cùng site.
- [Netlify Dev](https://docs.netlify.com/api-and-cli-guides/cli-guides/local-development/): proxy local cho framework/functions/redirects.
- [Supabase local development](https://supabase.com/docs/guides/local-development): CLI và container runtime cho stack local.
- [Supabase PostgreSQL connections](https://supabase.com/docs/guides/database/connecting-to-postgres): transaction pooler cho serverless, connection limit và prepared statements.
- [Supabase securing API](https://supabase.com/docs/guides/api/securing-your-api): disable Data API khi không dùng và giới hạn schema/grants.

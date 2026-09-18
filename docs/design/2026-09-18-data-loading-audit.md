# Kiểm tra thời gian tải dữ liệu Học Vui — 18/09/2026

## Phạm vi và bằng chứng

Baseline code: `98690ab3b5b527862821658cd8afcfa8287ebcbe`.
Người dùng báo Bạn cùng lớp và Chuyến đi của tớ gần 10 giây, Thách đố trên 5 giây. Đây là quan sát của người dùng; chưa có trace đăng nhập để phân bổ thời gian thực tế cho từng tầng.

## Bản sửa local đã thực hiện

- Roster chỉ tự tải khi mở dialog, mỗi lần đóng/mở lại gọi dữ liệu mới; nút thử lại vẫn hoạt động. Timer, visibility, online và Broadcast không tải lại roster.
- Request danh sách không chờ request hiện diện. Presence heartbeat và realtime vẫn gắn với session; polling tin nhắn và autoscroll giữ nguyên.
- Read receipt cập nhật unread của đúng bạn ngay trong snapshot local, không phát sinh roster request và không đổi thứ tự danh sách.
- Bảo vệ phản hồi muộn khi đóng/mở, đổi tài khoản hoặc logout; config realtime về sau cleanup không tạo subscription bị bỏ sót.
- Danh sách/online/unread là snapshot của lần mở gần nhất; khi dialog đóng, số unread không được polling cập nhật. Tin nhắn trong cuộc trò chuyện vẫn được cập nhật bằng realtime/polling.
- Fresh verification sau gián đoạn: 556 tests pass / 4 skip; build và server typecheck pass. Chưa deploy. Các tối ưu P1/P2 dưới đây là đề xuất, chưa triển khai.

Đo HTTP từ máy hiện tại, 3 request riêng mỗi endpoint, không token, không dữ liệu trẻ, không thay đổi cloud:

| Request | HTTP | Tổng thời gian từng mẫu (giây) |
|---|---:|---|
| OPTIONS /me/friends | 204 | 0.544 / 0.486 / 0.290 |
| GET /auth/me | 401 | 0.245 / 0.396 / 0.327 |
| GET /me/progress-board | 401 | 0.336 / 0.370 / 0.434 |
| GET /me/challenge/today | 401 | 0.326 / 0.521 / 0.415 |

URL: public Edge API được cấu hình trong `src/auth/apiClient.ts`. Các phép đo này chỉ kiểm tra đường mạng/gateway/runtime và nhánh từ chối khi thiếu session. Không chạy truy vấn dữ liệu được bảo vệ, không chứng minh tốc độ đăng nhập, tốc độ DB hay SLA dưới 3 giây. Mẫu nhỏ; không gọi là p95. Python urllib có lỗi CA cục bộ; dùng curl với kiểm tra TLS mặc định thành công, không tắt xác minh TLS.

## Những điểm xác nhận được từ code

1. **Danh sách bạn bè:** `src/classroom/useClassroomFriends.ts` chờ `sendPresence()` hoàn tất trước `getFriends()`. Hook được bật theo session học sinh trong `src/App.tsx`, không theo vòng đời dialog; polling 15 giây, visibility, online và Broadcast đều kích hoạt refresh. Mỗi refresh đặt loading và `FriendListDialog` thay danh sách bằng thông báo tải. Đây là nguyên nhân trực tiếp của việc danh sách bị gián đoạn.
2. **Chi phí xác thực lặp:** `currentSession()` trong `server/auth/service.ts` đọc session rồi tài khoản; `loadAccount()` ở PostgreSQL đọc thêm credentials. Vì vậy request hợp lệ thông thường có 3 SQL round trips trước nghiệp vụ. `/auth/me` còn clear parent grant; không được bỏ bước này vì grant cố ý page-scoped.
3. **Roster:** sau auth là 3 truy vấn lấy peer, presence và unread. Pool mặc định `max=1` (`server/db/client.ts`), nên `Promise.all` ở service không đồng nghĩa nhiều SQL thật sự chạy song song trên kết nối đó. `presence -> friends` tạo đường chờ khoảng 10 SQL statements trên hai HTTP requests (4 + 6), chưa tính realtime/config hoặc tranh chấp với các API khác.
4. **Chuyến đi:** `useProgressBoard` gọi config rồi board nối tiếp, dù App đã kiểm tra config trước khi hiển thị nút. Endpoint board tự kiểm tra rollout phía server. Board đọc snapshot và toàn bộ learning events rồi mới lọc generation trong analytics; lượng lịch sử tăng thì payload DB và CPU tăng. Transaction hiện tại không chỉ định repeatable-read, nên không mặc định coi hai SELECT là một snapshot nhất quán.
5. **Thách đố hôm nay:** với vòng đã có đủ 5 câu, không vòng cũ cần đóng, có khoảng 23 SQL statements kể cả auth: 3 auth + 2 preferences + open-rounds + get-round + items + get-round + items + attempts + 10 question/author + contributions + mine. `getPreferences()` luôn INSERT ON CONFLICT rồi SELECT, kể cả khi preference đã tồn tại. Trường hợp tạo vòng/đóng vòng cũ/duyệt ứng viên có thể nhiều hơn. Đây là đếm từ code, không phải trace DB thực đo. Endpoint GET này còn có nghiệp vụ ghi/lazy initialization; không dùng nó để benchmark production vô điều kiện.
6. **Thách đố tuần:** đọc items và contributions theo từng ngày, sau đó đọc question theo từng item. `activeStudentIds` và `activeStudentCount` dùng `listStudents()`, vốn tải credentials theo từng học sinh. Màn này cần ID/count, không cần credential hashes.
7. **CORS:** Edge trả preflight đúng origin nhưng chưa có `Access-Control-Max-Age`; có thể bổ sung cache preflight có giới hạn. Cache này chỉ dành cho chính sách CORS; response dữ liệu riêng tư vẫn phải `no-store`.
8. **Kết nối:** `getDefaultApp()` đã giữ app/DB trong promise cấp module và không dispose mặc định mỗi request. Không có bằng chứng cho giả thuyết tạo kết nối lại trên *mọi* request. Cold start, idle reconnect và vùng Edge/DB vẫn cần đo.

## Phương án ưu tiên để đạt mục tiêu dưới 3 giây

| Ưu tiên | Thay đổi cụ thể | Tác động cần kiểm chứng |
|---|---|---|
| P0 — yêu cầu trực tiếp | Tải roster mỗi lần mở; tách heartbeat/realtime khỏi việc tải roster; roster không chờ heartbeat | Loại gián đoạn 15s và bỏ HTTP presence khỏi đường chờ hiển thị |
| P1 — frontend | Gọi board trực tiếp, dùng server làm rollout gate; giữ xử lý disabled/expired/offline và account/generation isolation | Bớt một HTTP request cùng một lượt auth mỗi lần mở Chuyến đi |
| P1 — backend chung | Read projection JOIN session/account cho kiểm tra session; không nạp credentials; kiểm tra expiry/revocation/active/credentialVersion ngay trên mỗi request | Auth từ 3 xuống 1 SQL round trip, không dùng cache quyền có thể stale |
| P1 — roster | Một SELECT có JOIN presence và aggregate unread theo actor, giữ filter student/active/exclude self | Nghiệp vụ roster từ 3 xuống 1 SQL statement; cộng auth tối ưu là 2 thay vì 6 |
| P1 — Thách đố | Batch read round items/questions/authors/attempts; dùng query ID/count học sinh thay cho `listStudents()`; tránh đọc round/items lặp | Loại N+1 và giảm mạnh đường chờ tuần tự; không thay đổi thứ tự transaction ghi/duyệt/đóng vòng |
| P2 — tiến độ | Read snapshot + relevant events trong một statement/consistent read; lọc student/generation ở DB; xem EXPLAIN trước khi đề xuất index | Giảm dữ liệu lịch sử truyền về, giữ nguyên kết quả reset/generation và evidence |
| P2 — vận hành | Server-Timing cho auth/read/assemble; kiểm tra vùng Edge–DB và cold/warm latency; cân nhắc pool sau đo | Phân biệt bottleneck trước khi đổi hạ tầng hoặc tăng kết nối |

Không chọn tăng pool tùy tiện làm bước đầu: nó không loại N+1, có thể tăng tổng connection khi nhiều Edge isolates chạy. Không cache quyền truy cập hay chia sẻ dữ liệu giữa học sinh để đổi lấy tốc độ. Cache tiến độ nếu dùng phải có account + generation + content/rule version và hiển thị trạng thái đang cập nhật; đó là cải thiện thời gian thấy dữ liệu cũ, không phải bằng chứng dữ liệu mới về dưới 3s.

## Điều kiện nghiệm thu hiệu năng

- Đo từ thao tác mở đến dữ liệu mới sẵn sàng tương tác; không dùng thời gian skeleton xuất hiện.
- Dùng tài khoản synthetic được duyệt trong môi trường phù hợp, không dùng dữ liệu trẻ thật làm fixture và không tự tạo account cloud.
- Lấy ít nhất 30 lần cho từng luồng, tách lần đầu/cold và warm; đo trên thiết bị/mạng mục tiêu. Báo median/p95 và số lỗi, mục tiêu p95 warm dưới 3 giây. Cold cần báo riêng, không loại khỏi báo cáo.
- Ghi waterfall HTTP, preflight, Server-Timing, query count/duration; so sánh cùng dataset và môi trường trước/sau.
- Xác minh account switch/logout, session revoke/PIN version, rollout disabled, offline/retry, tiến độ reset, chat realtime, duyệt và trả lời thách đố.
- Deploy và phép đo có đăng nhập trên production là bước riêng; bản audit này không chứng nhận production đạt dưới 3 giây.

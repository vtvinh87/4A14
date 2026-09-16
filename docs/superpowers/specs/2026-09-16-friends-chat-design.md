# Danh sách bạn bè và trò chuyện — Design

Date: 2026-09-16
Status: SPEC_APPROVED — implementation plan to be created
Scope: localhost:8888 với roster học sinh thật từ Supabase; chưa deploy Firebase/Edge Function và chưa push GitHub.

## Goal

Thêm một tính năng Bạn bè trên rail bên phải màn hình Hành trình. Học sinh đã đăng nhập có thể xem các tài khoản học sinh đang hoạt động do Admin tạo, nhận biết trạng thái online, mở cuộc trò chuyện riêng, gửi tin nhắn và nhận badge cho tin chưa đọc. Đồng thời hoàn thiện icon menu người dùng và hạ Pet một chút ở bố cục ngang.

## Existing context and boundaries

- Frontend là React/Vite; API hiện đi qua server/app.ts và repository PostgreSQL, không cho browser truy cập trực tiếp Supabase.
- hoc_vui_private.accounts đã có role, active, display_name, avatar_id và cơ chế session custom. Admin hiện dùng listStudents nhưng student chưa có endpoint roster ngang hàng.
- Session student phải ở mode full. Người gửi luôn được suy ra từ bearer/cookie session hiện tại.
- Local server hiện dùng runtime database Supabase qua scripts/start-netlify-with-supabase.sh. Vì vậy localhost có thể đọc tài khoản thật; không seed, import hoặc hiển thị thêm dữ liệu giả.
- Roster lớp ở phiên bản này được hiểu là toàn bộ account có role student và active. Mô hình classroom membership riêng là phạm vi tương lai.
- Không thay đổi luồng PIN, parent grant, dashboard, tiến độ học hoặc dữ liệu hồ sơ ngoài các asset và layout được nêu trong spec.
- Không dùng Supabase Realtime ở phiên bản đầu; polling đủ cho quy mô lớp nhỏ.

## Approved architecture

### Server boundary

Browser chỉ gọi các route /api/me/friends và /api/me/presence của app hiện tại. Server dùng AuthService để xác thực student full-session, dùng repository PostgreSQL để đọc accounts và ghi presence/messages. Không đưa database URL, service key, credential, raw session token hoặc parent grant vào response.

Rosters chỉ trả về các bạn học sinh khác với account hiện tại, có active = true. Admin bị loại theo role và account hiện tại bị loại để danh sách thể hiện đúng ý nghĩa “bạn bè”.

### Supabase tables

Migration mới tạo trong schema hoc_vui_private:

1. classroom_presence
   - account_id uuid primary key, foreign key tới accounts(id) on delete cascade;
   - last_seen timestamptz not null;
   - updated_at timestamptz not null default now().
2. classroom_messages
   - id uuid primary key;
   - sender_id uuid not null, foreign key tới accounts(id) on delete cascade;
   - recipient_id uuid not null, foreign key tới accounts(id) on delete cascade;
   - body text not null, check độ dài từ 1 tới 500 ký tự;
   - created_at timestamptz not null default now();
   - read_at timestamptz null;
   - check sender_id <> recipient_id.

Tạo index cho presence(last_seen), messages(recipient_id, read_at, created_at desc), messages(sender_id, recipient_id, created_at desc) và cặp hội thoại theo thời gian. RLS/private-schema policy tiếp tục chặn public, anon và authenticated; chỉ runtime role hiện tại truy cập qua server.

Migration sẽ được áp dụng vào Supabase để localhost có thể hoạt động thật sau khi written spec và implementation plan được duyệt. Không deploy frontend hoặc Edge Function trong task này.

## API contract

All protected routes require a valid full student session. Server không nhận studentId của chính người gọi để quyết định phạm vi.

- GET /api/me/friends
  - trả friends và unreadCount;
  - mỗi FriendSummary gồm id, username, displayName, avatarId, online và unreadCount;
  - không trả birthDate, role admin, credential, session hoặc last_seen chính xác.
- POST /api/me/presence
  - cập nhật last_seen của account hiện tại;
  - không nhận accountId từ client.
- GET /api/me/friends/:id/messages?limit=50
  - chỉ đọc tin nhắn giữa account hiện tại và active student đích;
  - giới hạn page size, sắp xếp cũ tới mới trong cửa sổ hội thoại.
- POST /api/me/friends/:id/messages
  - body chỉ gồm body;
  - server kiểm tra người nhận tồn tại, là student active, và không phải chính người gửi;
  - tạo message với sender_id từ session.
- POST /api/me/friends/:id/read
  - đánh dấu các tin đến từ friend id là đã đọc cho account hiện tại;
  - không đánh dấu tin của người khác hoặc tin gửi đi.

Mã lỗi được map về các trạng thái hiện có: 401/403 cho session hoặc quyền không hợp lệ, 404/409 cho bạn không còn hoạt động hoặc trạng thái cạnh tranh, 422/400 cho nội dung không hợp lệ, 503 khi database tạm thời không sẵn sàng.

## Presence and unread semantics

- Frontend gửi heartbeat khoảng 15 giây khi tab hiển thị và student đang ở mode full.
- Student được xem là online nếu last_seen không cũ hơn 2 phút tại thời điểm API đọc roster.
- Khi tab ẩn, mất mạng hoặc session hết hạn, heartbeat dừng; account tự chuyển offline khi vượt ngưỡng.
- GET friends được polling định kỳ khoảng 15 giây và gọi lại sau khi gửi tin hoặc đánh dấu đã đọc.
- unreadCount là tổng tin nhắn đến có read_at null của account hiện tại; FriendSummary.unreadCount là tổng tương ứng theo từng friend.
- Mở danh sách không làm mất badge. Chỉ khi mở hội thoại friend cụ thể mới gọi route read.
- Gửi tin được giới hạn server-side ở mức tối đa 30 tin trong mỗi cửa sổ 60 giây trên từng account; nội dung chỉ là plain text và được render như text trong React.

## UI and interaction design

### Journey feature rail

Thêm feature id friends và asset /art/hud/friends.png. Rail vẫn hiển thị dạng icon-only, theo thứ tự Bảng xếp hạng, Thách đố, Danh sách bạn bè. Nút Bạn bè có aria-label/title, badge unread tổng và trạng thái nổi bật khi có tin chưa đọc. Hai feature cũ tiếp tục mở coming-soon dialog.

### Friend list modal

FriendListDialog là modal riêng, không dùng FeatureComingSoonDialog:

- header có icon Bạn bè, tiêu đề Danh sách bạn bè, nút đóng;
- danh sách Đang online ở trên, sau đó là đường phân cách ngang, rồi nhóm Đang offline;
- mỗi row có avatar, display name, chấm online/offline và badge chưa đọc;
- loading, empty, network error và friend vừa bị khóa có trạng thái hiển thị rõ;
- bấm row mở ConversationPanel trong cùng modal, có nút quay lại, lịch sử tin nhắn, ô nhập tối đa 500 ký tự, bộ đếm và nút gửi;
- sau khi mở ConversationPanel, gọi read cho đúng friend; danh sách và badge được cập nhật lại sau thao tác;
- modal có focus trap, Escape, backdrop click, khóa cuộn nền và nhãn ARIA.

### User menu icons

Các row Hồ sơ, Phụ huynh và Đăng xuất giữ nguyên hành vi hiện có nhưng thêm image asset đồng bộ, kích thước khoảng 28–32px. Tên vẫn hiển thị bằng text để dễ đọc; ảnh dùng alt rỗng và aria-hidden vì text đã là accessible name. Dùng lại parent.png cho Phụ huynh nếu phù hợp; tạo friends.png, profile.png và logout.png theo hướng HUD PNG toy-adventure, không chữ, nền trong suốt.

### Landscape Pet position

Trong media query orientation landscape với min-width 701px, .pet-zone được hạ từ translateY(22px) xuống khoảng translateY(38px). Các breakpoint mobile giữ nguyên transform hiện tại. Sau khi chạy local sẽ kiểm tra Pet, bubble và bệ đá không chồng lên launch panel hoặc rail.

## Security and privacy

- Chỉ student full-session mới truy cập roster, presence và message routes.
- Server re-check account active và role student cho cả sender và recipient tại thời điểm thao tác.
- Không tin senderId, ownerId, studentId hoặc recipient profile do client cung cấp ngoài route id đã được server xác thực.
- Không trả ngày sinh, thông tin phụ huynh, PIN, hash, salt, raw token hoặc parent grant cho peer.
- Giới hạn độ dài và tốc độ gửi; không cho HTML/script trong body.
- Nếu account bị Admin khóa, session/route hiện tại bị từ chối theo currentSession và account biến mất khỏi roster.

## Error handling

- Khi tải roster thất bại, modal giữ được lần tải trước nếu có và hiển thị trạng thái chưa đồng bộ; nếu chưa có dữ liệu thì hiển thị retry.
- Khi gửi thất bại, draft không bị xóa và không hiển thị thành công giả.
- Khi đọc tin thất bại, badge vẫn giữ nguyên.
- Khi session hết hạn, hiển thị thông báo localized và dùng luồng logout/session reset hiện có.
- Khi một bạn bị khóa giữa lúc đang chat, composer bị vô hiệu hóa và lịch sử hiện có vẫn được giữ nếu API cho phép đọc.

## Verification plan

1. RED tests cho repository/service: roster chỉ trả active students, loại Admin và self; message authorization không nhận diện sender từ client; duplicate/read/rate-limit và response privacy.
2. API contract tests cho login student, GET friends, presence heartbeat, list messages, send, read, session hết hạn và account bị khóa.
3. Component tests cho rail badge, modal online separator, unread row badge, loading/error/empty, conversation send/read và focus behavior.
4. Regression tests cho UserMenu icons, hành vi Hồ sơ/Phụ huynh/Đăng xuất và landscape Pet transform.
5. Chạy toàn bộ Vitest, client/server typecheck, build và browser smoke trên localhost:8888 với hai session student. Xác nhận roster thật từ Supabase, nhắn tin giữa hai tài khoản test được cấp quyền, badge thay đổi đúng và không có dữ liệu Admin.

## Rollout boundary

Trong task hiện tại:

- tạo migration và code local cần thiết;
- áp dụng migration vào Supabase đã được user phê duyệt để localhost đọc/ghi được dữ liệu thật;
- kiểm thử qua localhost:8888.

Không thực hiện:

- deploy Firebase Hosting;
- deploy Supabase Edge Function;
- push GitHub hoặc tạo PR;
- dùng Supabase Realtime;
- thông báo push/native, nhóm chat, mời bạn, chat ngoài lớp, upload avatar hoặc phân quyền classroom membership riêng.

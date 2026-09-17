# Học Vui API latency and safe rollout design

## Goal

Giảm thời gian chờ ở các luồng đồng bộ thường dùng, đặc biệt là mở danh sách bạn bè và quản trị tài khoản học sinh, mà không mở dữ liệu private cho browser, không thay đổi cơ chế ownership của phụ huynh/học sinh và không yêu cầu đổi region hoặc connection pool trong đợt đầu.

## Current constraints

- Firebase Hosting chỉ phục vụ frontend; Supabase Edge Function `api` là API duy nhất nói chuyện với schema `hoc_vui_private`.
- Browser tiếp tục dùng opaque application session và Bearer token; không chuyển dữ liệu private sang Supabase Data API với `anon key`.
- Parent grant vẫn chỉ tồn tại trong memory của page và mọi route phụ huynh vẫn tự xác định student scope từ session.
- Các API cũ phải tiếp tục hoạt động trong thời gian frontend/PWA cũ còn được cache.
- Không tạo migration/schema change cho release đầu tiên của gói tối ưu này.

## Scope

### 1. Instrumentation and transport

- Thêm request id không chứa token, username, child data hoặc secret.
- Đo các mốc server-side tối thiểu: app load/cold start, authentication, feature work và tổng request; expose timing qua `Server-Timing` hoặc log structured tối thiểu.
- Thêm `Access-Control-Max-Age` hữu hạn cho preflight exact-origin. Actual request vẫn phải chạy exact-origin check; không dùng wildcard.

### 2. Classroom bootstrap API

Thêm route additive:

```text
POST /api/me/classroom/bootstrap
```

Request body là object rỗng; endpoint không nhận `studentId`. Server lấy student id từ full student session.

Response thành công:

```ts
type ClassroomBootstrapResponse = {
  friends: FriendSummary[];
  unreadCount: number;
  realtime: ClassroomRealtimeConfig | null;
  presenceUpdated: boolean;
};
```

Semantics:

- Chỉ full student session được gọi; parent grant hoặc session chưa đổi PIN bị từ chối như các route classroom hiện tại.
- Presence update là best-effort và idempotent. Nếu presence không cập nhật được nhưng roster đọc được, response vẫn trả roster với `presenceUpdated: false`; lỗi không được làm mất danh sách bạn.
- Roster phải giữ nguyên các quy tắc hiện tại: chỉ active students, loại actor hiện tại, online window 120 giây, unread theo recipient/sender và sort online trước rồi display name/username.
- Realtime config có thể là `null` nếu bridge chưa sẵn sàng; roster không phụ thuộc vào Realtime.
- Giữ `/api/me/presence`, `/api/me/friends` và `/api/me/realtime` để fallback/compatibility. Frontend chỉ fallback khi endpoint mới không tồn tại hoặc response không đúng contract, không tự retry các write có nguy cơ tạo tác dụng phụ.

### 3. Admin UI refresh behavior

- Sau khi `POST /api/admin/students` thành công, dùng `account` từ response để thêm/cập nhật state theo id.
- Không chặn thông báo thành công bởi một GET toàn bộ danh sách.
- Revalidation nền hoặc nút refresh vẫn được giữ để xử lý thay đổi từ tab khác.
- Không optimistic-create trước server ACK và không tự retry POST create.

### 4. Database round-trip reductions

- Thêm đường đọc session/account nhẹ cho protected read routes, nhưng giữ nguyên các điều kiện `revokedAt`, `expiresAt`, `active`, `credentialVersion`, role, mode và parent grant.
- Tách hoặc tối ưu student summary query để `listStudents()` không tải credential rows riêng cho từng học sinh khi caller chỉ cần account view/display name/id.
- Gộp roster, presence và unread aggregate thành một query có parameter binding; không tin giá trị id từ client và không thay đổi các index hiện hữu nếu chưa có EXPLAIN evidence.
- Không tăng `HOC_VUI_DB_POOL_MAX` trong release này.

## Error and rollback model

- Backend mới được deploy trước frontend và không xóa route cũ.
- Frontend mới nếu gặp 404/invalid contract sẽ dùng flow cũ; nếu endpoint trả lỗi nghiệp vụ thì hiển thị lỗi theo contract, không âm thầm nhân đôi write.
- Mỗi nhóm thay đổi phải nằm trong commit độc lập: transport/instrumentation, admin UI, classroom bootstrap, query optimization.
- Rollback frontend về bundle cũ vẫn phải gọi được API cũ; rollback Edge không làm mất schema hoặc dữ liệu.

## Security invariants

- Không nhận `studentId`/`actorId` để quyết định scope từ request body.
- Không trả credential hash, parent grant token, realtime topic secret, service-role key hoặc database URL.
- Realtime chỉ là notification; API session-scoped vẫn là source of truth.
- Không thêm cache client persistent cho dữ liệu classroom/parent; chỉ cache timing/config nếu không chứa child data.

## Verification requirements

- Unit/service tests cho online threshold, inactive peers, unread count, empty roster, presence failure và realtime unavailable.
- API tests cho missing token, change-only session, parent grant, forged student id, inactive account và response contract.
- Browser hook tests giữ race protection hiện tại khi hai refresh resolve ngược thứ tự.
- Admin tests xác nhận POST thành công không cần GET mới hiển thị account, không duplicate theo id và vẫn có revalidation.
- CORS tests xác nhận exact origin, preflight max-age hữu hạn và origin ngoài allowlist vẫn bị từ chối.
- Chạy full Vitest, typecheck frontend/server, build, edge check và synthetic browser/API smoke trước khi cân nhắc deploy.

## Out of scope

- Đổi sang `anon key` cho private data.
- Đổi Supabase region, runtime hosting hoặc pool size.
- Thay custom session bằng Supabase Auth.
- Thêm persistent parent grant hoặc persistent Admin login.

# Học Vui persistent student session design

## Goal

Cho phép học sinh quay lại PWA iOS/Safari mà không phải đăng nhập lại mỗi lần mở ứng dụng, với lựa chọn chủ động của người dùng và thời hạn tối đa 30 ngày.

## Security decision

Đợt đầu dùng persistent storage ở client vì frontend Firebase và API Supabase đang khác origin; không thay kiến trúc sang HttpOnly cookie trong cùng release.

Trade-off được chấp nhận có kiểm soát: opaque bearer token trong `localStorage` có thể bị đọc nếu ứng dụng gặp XSS. Để giới hạn blast radius:

- Tính năng được bật mặc định cho student login; người dùng có thể tắt rõ ràng trên thiết bị dùng chung.
- Không lưu PIN, password hoặc parent grant.
- Session remembered có hạn server tối đa 30 ngày.
- Chỉ áp dụng cho student full session; Admin không được ghi nhớ.
- Parent grant luôn page-memory-only và phải nhập lại sau reload/reopen.

## Client behavior

### Storage keys

- Giữ key session hiện tại cho phiên tab/PWA không ghi nhớ.
- Thêm key riêng cho remembered student session, không dùng chung với parent grant.
- Token chỉ được coi là candidate; startup luôn gọi `/api/auth/me` để server xác thực.

### Login flow

UI student login thêm checkbox:

```text
Ghi nhớ thiết bị này (tối đa 30 ngày)
```

Copy cảnh báo ngắn: không bật trên thiết bị dùng chung.

- Checkbox mặc định `true`.
- Login full student với `rememberDevice=true` lưu access token vào persistent key.
- Login không ghi nhớ lưu token vào session storage và xóa persistent token cũ để tránh giữ nhầm account trước đó.
- Nếu login trả về `change-only`, provisional token không được lưu persistent. Lựa chọn `rememberDevice` chỉ giữ trong memory cho bước đổi student PIN kế tiếp; sau khi đổi PIN thành công, full session mới được lưu persistent.
- Nếu người dùng reload giữa bước đổi PIN, yêu cầu login lại là chấp nhận được.

### Startup, logout and invalidation

- Startup ưu tiên token trong session storage; nếu không có thì thử remembered token.
- `/api/auth/me` thành công thì tiếp tục vào app; session hết hạn/revoked/forbidden thì xóa cả hai storage keys và về màn hình login.
- Logout xóa session storage, persistent student token và parent grant memory.
- Lock parent chỉ xóa parent grant, không logout student session.
- Không dùng persistent token để mở parent dashboard nếu parent grant chưa được nhập trong page hiện tại.

## Server behavior

- Student login nhận `rememberDevice?: boolean`.
- Full student session bình thường giữ TTL hiện tại 7 ngày.
- Full student session với `rememberDevice=true` có TTL 30 ngày; provisional `change-only` session vẫn dùng TTL 7 ngày và chỉ phiên full sau khi đổi PIN mới nhận TTL 30 ngày.
- Student change-PIN route nhận cùng cờ để chuyển provisional choice thành full remembered session; parent change-PIN và Admin login bỏ qua cờ này.
- Không cần lưu cờ `rememberDevice` trong database; TTL đã nằm trong `auth_sessions.expires_at`.
- Token hash, revocation, credential version và account active checks giữ nguyên.
- Không tạo refresh token hoặc migration schema trong release đầu tiên.

## Compatibility and failure handling

- Client cũ chỉ gửi login payload hiện tại và tiếp tục nhận TTL 7 ngày/session behavior cũ.
- Client mới vẫn dùng Bearer token; cookie hiện tại không trở thành nguồn auth duy nhất.
- Nếu localStorage bị chặn, quota lỗi hoặc iOS private browsing không cho ghi, app vẫn đăng nhập bằng session storage và không hiển thị lỗi fatal.
- Nếu Safari/PWA bị gỡ, website data bị xóa hoặc iOS purge storage, yêu cầu đăng nhập lại là hành vi bình thường.
- Không tự động retry login hoặc change-PIN để tránh lặp side effect.

## Verification requirements

- API client tests: default session-only, opt-in persistent, stale persistent token, logout clears both, storage exception fallback.
- Auth service tests: 7-day normal session, 30-day remembered student session, Admin remains 8-hour, change-only token is not persisted until successful student PIN change.
- App tests: student/admin/parent separation, parent grant not persisted, forged student id rejected, revoked/inactive/credential-version-mismatch session rejected.
- Browser/PWA smoke: reload, close/reopen same origin, logout, expired token, multiple accounts on one device and parent lock/unlock.
- Không claim “đăng nhập vĩnh viễn”; UI/documentation nêu rõ giới hạn 30 ngày và khả năng bị hệ điều hành xóa storage.

## Out of scope

- Lưu PIN/password trong bất kỳ storage nào.
- Persistent parent grant.
- Persistent Admin login.
- HttpOnly refresh-token architecture hoặc Supabase Auth migration.

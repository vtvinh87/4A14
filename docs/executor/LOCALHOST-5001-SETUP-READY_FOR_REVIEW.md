# LOCALHOST-8888 — READY_FOR_REVIEW

## Cấu hình

Học Vui chạy bằng macOS per-user `LaunchAgent` với label `com.hoc-vui.localhost`:

- URL: `http://localhost:8888/`
- Runtime: Netlify Dev offline, proxy API `/api/*` vào Netlify Function `api`
- Command: `npx --yes netlify-cli dev --offline`
- Database: Supabase PostgreSQL qua transaction pooler `aws-0-ap-south-1.pooler.supabase.com:6543`, role `hoc_vui_runtime`; password lấy từ macOS Keychain, không ghi trong plist/source. Không dùng database CRM.
- Tự chạy khi tài khoản macOS đăng nhập sau restart/power-on (`RunAtLoad`).
- Tự khởi động lại khi tiến trình bị dừng (`KeepAlive`) với throttle 5 giây.
- Log: `/Users/macbook/Library/Logs/HocVui/localhost-8888.out.log` và `.err.log`.
- Plist đang cài: `/Users/macbook/Library/LaunchAgents/com.hoc-vui.localhost.plist`.
- Cấu hình cũ của cổng 5001 được giữ ngoài LaunchAgents với hậu tố `.disabled`, không còn tự khởi chạy.

## Reinstall thủ công

```sh
launchctl bootout gui/$(id -u) /Users/macbook/Library/LaunchAgents/com.hoc-vui.localhost.plist
cp docs/executor/com.hoc-vui.localhost.plist /Users/macbook/Library/LaunchAgents/com.hoc-vui.localhost.plist
launchctl bootstrap gui/$(id -u) /Users/macbook/Library/LaunchAgents/com.hoc-vui.localhost.plist
```

## Evidence cần kiểm tra

- `launchctl print gui/<uid>/com.hoc-vui.localhost` có trạng thái `running`.
- `lsof -nP -iTCP:5001 -sTCP:LISTEN` không trả về tiến trình Học Vui.
- `lsof -nP -iTCP:8888 -sTCP:LISTEN` chỉ ra tiến trình Netlify Dev của Học Vui.
- `curl http://127.0.0.1:8888/` trả về HTML của Học Vui.
- API login và `/api/auth/me` trả về `200` khi Supabase pooler và Keychain runtime sẵn sàng.
- `npx --yes supabase@2.117.0 db push --dry-run --include-all --skip-vault` báo remote database up to date.
- Browser smoke load không có lỗi console.

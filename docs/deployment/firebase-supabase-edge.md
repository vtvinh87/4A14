# Firebase Hosting Spark + Supabase Edge API

Tài liệu này mô tả rollout production cho Học Vui. Firebase chỉ phục vụ static frontend/PWA; Supabase Edge Function `api` là lớp API duy nhất nói chuyện với PostgreSQL private schema. Không dùng Firebase Functions, Firestore, Firebase Auth hoặc Supabase Data API cho `hoc_vui_private`.

## Configuration boundary

`VITE_API_BASE_URL` là giá trị public được nhúng vào browser bundle:

```text
https://tvlpabqkternfvsxqovi.supabase.co/functions/v1/api
```

Các biến sau chỉ được đặt trong môi trường Edge/server, không commit vào Git và không đưa vào `VITE_*`:

- `HOC_VUI_ALLOWED_ORIGINS`: exact origins, phân cách bằng dấu phẩy; thêm Firebase `*.web.app`, custom domain nếu có, và `http://localhost:8888` khi cần test local.
- `HOC_VUI_DATABASE_URL`: connection transaction pooler của role runtime ít quyền nhất, có SSL bắt buộc.
- `SUPABASE_DB_URL`: fallback do Supabase cung cấp nếu chưa cấu hình runtime-role URL riêng.
- `HOC_VUI_DB_POOL_MAX=1`, `HOC_VUI_COOKIE_SECURE=true`, và `PGSSLMODE=require`.

Không ghi password, connection string đầy đủ, access token, service-role key hay dữ liệu học sinh thật trong file này, shell history, log hoặc bundle. Dùng password manager/secret store để nhập secrets trực tiếp cho Supabase; không gửi secret qua chat.

## Pre-deploy checks

Từ root repository:

```bash
npm ci
npm run validate:firebase
npm test
npm run typecheck
npm run typecheck:server
npm run validate:fox
npm run build
deno check --unstable-sloppy-imports --import-map supabase/functions/api/deno.json supabase/functions/api/index.ts
```

Kiểm tra bundle sau build không chứa `postgresql://`, tên/password runtime role, hoặc service-role key. Không dùng dữ liệu học sinh thật để smoke test.

## Deploy Edge Function

1. Đăng nhập Supabase CLI bằng luồng chính thức của CLI trên máy triển khai; không ghi access token vào repository hoặc command output lưu trữ.
2. Xác nhận project ref là `tvlpabqkternfvsxqovi` và function config giữ `verify_jwt = false`, vì Học Vui dùng opaque custom session token chứ không dùng Supabase Auth JWT.
3. Đặt `HOC_VUI_ALLOWED_ORIGINS` và `HOC_VUI_DATABASE_URL` bằng Supabase Edge Function secrets. Ưu tiên runtime role transaction-pooler; chỉ dùng `SUPABASE_DB_URL` fallback khi đã đánh giá quyền truy cập phù hợp.
4. Deploy riêng function `api`:

```bash
npx supabase@latest functions deploy api --project-ref tvlpabqkternfvsxqovi
```

5. Smoke test preflight và unauthenticated response từ URL function. Một response 401 cho `/auth/me` khi chưa có session là đúng; response 503 hoặc CORS wildcard là lỗi rollout.

## Build and deploy Hosting

Sau khi Edge Function pass smoke test, build frontend với API URL public:

```bash
VITE_API_BASE_URL="https://tvlpabqkternfvsxqovi.supabase.co/functions/v1/api" npm run build
npm run validate:firebase
```

Đăng nhập Firebase CLI, liệt kê và xác nhận đúng project đích trước khi tạo `.firebaserc`. Chỉ sau khi project được xác nhận mới chạy Hosting deploy:

```bash
npx firebase-tools projects:list
npx firebase-tools use <CONFIRMED_FIREBASE_PROJECT_ID>
npx firebase-tools deploy --only hosting
```

`<CONFIRMED_FIREBASE_PROJECT_ID>` chỉ là placeholder tài liệu; không thay bằng một project suy đoán. `firebase.json` không chứa project id để tránh deploy nhầm.

## Browser/PWA smoke test

Trên URL HTTPS Firebase, kiểm tra bằng tài khoản synthetic được tạo riêng cho môi trường test:

1. Đăng nhập student/admin và xác nhận request tiếp theo có `Authorization: Bearer ...`; không có database credential trong Network response/bundle.
2. Reload tab/PWA và xác nhận ordinary session còn hiệu lực từ `sessionStorage`; đóng browsing context phải xoá token.
3. Unlock phụ huynh, đọc dashboard/profile và xác nhận `X-Parent-Grant` chỉ tồn tại trong tab hiện tại; reload phải yêu cầu grant lại.
4. Đổi PIN/password, xác nhận token được rotate; logout phải xoá session và không truy cập được route bảo vệ.
5. Cập nhật profile synthetic và ghi đúng một learning event synthetic; xác nhận owner-scoping không nhận `studentId` do client tự chèn.
6. Mở deep link SPA, kiểm tra manifest, favicon/icon PWA, Service Worker và cache shell/assets/29 lesson packages.
7. Kiểm tra mobile portrait/landscape và cài PWA trên một thiết bị test; không dùng thiết bị/tài khoản có dữ liệu học sinh thật trong rollout đầu tiên.

## Rollback

- Nếu API lỗi: redeploy function từ commit/version cuối đã smoke-test hoặc tạm build frontend với API base URL của đường lui; giữ Netlify Dev/local port 8888 nguyên vẹn.
- Nếu frontend lỗi: deploy lại release Hosting cuối đã biết tốt từ Firebase Console/CLI hoặc phục hồi bản build trước.
- Nếu CORS sai: sửa exact allowlist ở function secrets rồi redeploy function; không mở wildcard khi credentials đang bật.
- Không chạy database reset, import/export, migration ngược hoặc xoá dữ liệu để rollback. Rollout này không tạo/import/chuyển dữ liệu học sinh thật.

## Official references

- [Firebase Hosting](https://firebase.google.com/products/hosting)
- [Firebase Hosting full configuration](https://firebase.google.com/docs/hosting/full-config)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
- [Supabase Edge Function CORS](https://supabase.com/docs/guides/functions/cors)

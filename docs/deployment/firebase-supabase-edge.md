# Firebase Hosting Spark + Supabase Edge API

Tài liệu này mô tả rollout production cho Học Vui. Firebase chỉ phục vụ static frontend/PWA; Supabase Edge Function `api` là lớp API duy nhất nói chuyện với PostgreSQL private schema. Không dùng Firebase Functions, Firestore, Firebase Auth hoặc Supabase Data API cho `hoc_vui_private`.

## Current rollout status — 2026-09-15

- Supabase project `4A14` (`tvlpabqkternfvsxqovi`): Edge Function `api` is `ACTIVE`, `verify_jwt=false`, and managed preflight/unauthenticated `/auth/me` smoke checks pass.
- Firebase project `4A14` (`a14-82a69`): Hosting release is live at [https://a14-82a69.web.app](https://a14-82a69.web.app). Root, manifest, Service Worker and SPA deep-link checks return HTTP 200; the deployed bundle contains the public Edge URL and no database credential markers.
- The final credentialed login/profile/learning smoke still requires a known synthetic Admin credential. The bootstrap credential probe returned `invalid`, so no credential was guessed and no student account was modified.

## Configuration boundary

`VITE_API_BASE_URL` là giá trị public được nhúng vào browser bundle:

```text
https://<CONFIRMED_SUPABASE_PROJECT_REF>.supabase.co/functions/v1/api
```

Các biến sau chỉ được đặt trong môi trường Edge/server, không commit vào Git và không đưa vào `VITE_*`:

- `HOC_VUI_ALLOWED_ORIGINS`: exact origins, phân cách bằng dấu phẩy. Nhập origin Firebase đã xác nhận `https://<CONFIRMED_FIREBASE_PROJECT_ID>.web.app`; chỉ thêm exact custom domain và `http://localhost:8888` khi thực sự cần. Không dùng wildcard vì implementation normalize rồi exact-match từng origin.
- `HOC_VUI_DATABASE_URL`: connection transaction pooler của custom role `hoc_vui_runtime`, có SSL bắt buộc. Role này bị giới hạn vào private schema/tables và các quyền CRUD cần cho server API.
- `SUPABASE_DB_URL`: fallback do Supabase cung cấp. Fallback này không tương đương custom `hoc_vui_runtime` role và không được dùng cho production khi rollout yêu cầu custom runtime role.
- `HOC_VUI_DB_POOL_MAX=1`, `HOC_VUI_COOKIE_SECURE=true`, và `PGSSLMODE=require`.

Các policy RLS hiện tại dành cho `hoc_vui_runtime` là broad server-side policies (`using (true)`/`with check (true)`). Cô lập dữ liệu theo từng trẻ được thực thi tại boundary auth/session của ứng dụng; không được coi database RLS riêng lẻ là cơ chế per-child isolation.

Không ghi password, production connection string đầy đủ, access token, service-role key hay dữ liệu học sinh thật trong file này, shell history, log hoặc bundle. Dùng password manager/secret store để nhập secrets trực tiếp cho Supabase; không gửi secret qua chat.

## Pre-deploy checks

Từ root repository:

```bash
npm ci
npm run validate:firebase
npm test
npm run typecheck
npm run typecheck:server
npm run validate:fox
deno check --config supabase/functions/api/deno.json supabase/functions/api/index.ts
npm run check:edge-runtime
```

`deno check` phân giải dependency graph theo chế độ strict giống managed bundler: các import relative reachable từ Edge entrypoint phải có đuôi `.ts`; không dùng `sloppy-imports`. Function-local `deno.json` chỉ giữ import map `postgres` và ba ánh xạ exact cho các import nội bộ nằm trong hai module type dùng chung chưa thuộc write set của fix deployment.

`check:edge-runtime` chạy strict `deno check` trước, rồi chạy `deno serve --config supabase/functions/api/deno.json` trên entrypoint thật với cổng localhost ngẫu nhiên, gửi duy nhất một `OPTIONS` allowlisted, kiểm tra HTTP 204 và toàn bộ CORS headers chính xác, rồi dừng đúng child process. Bất kỳ lỗi dependency resolution, startup, HTTP hoặc cleanup nào đều làm command thoát non-zero. Preflight kết thúc trước khi khởi tạo app/database, nên gate này không cần database URL, secret hoặc dữ liệu học sinh.

Không dùng dữ liệu học sinh thật để smoke test.

## Deployment order

### 1. Authenticate, select, and confirm Firebase

Đăng nhập Firebase CLI trước, liệt kê project có thể truy cập và đối chiếu project id với nguồn vận hành độc lập. Chỉ sau khi đã xác nhận chính xác project đích mới được tạo/cập nhật `.firebaserc` hoặc chọn active project:

```bash
npx firebase-tools login
npx firebase-tools projects:list
npx firebase-tools use <CONFIRMED_FIREBASE_PROJECT_ID>
```

`<CONFIRMED_FIREBASE_PROJECT_ID>` là placeholder; không thay bằng một project suy đoán. `firebase.json` không chứa project id để tránh deploy nhầm. Chưa deploy Hosting ở bước này.

### 2. Authenticate and confirm Supabase

1. Đăng nhập Supabase CLI bằng luồng chính thức của CLI trên máy triển khai; không ghi access token vào repository hoặc command output lưu trữ.
2. Liệt kê/link project rồi đối chiếu project ref với nguồn vận hành độc lập; chỉ tiếp tục với `<CONFIRMED_SUPABASE_PROJECT_REF>`. Xác nhận function config giữ `verify_jwt = false`, vì Học Vui dùng opaque custom session token chứ không dùng Supabase Auth JWT.

### 3. Configure, deploy, and smoke-test Edge

1. Đặt `HOC_VUI_ALLOWED_ORIGINS` và `HOC_VUI_DATABASE_URL` bằng Supabase Edge Function secrets. Dùng transaction pooler của `hoc_vui_runtime`; không thay bằng `SUPABASE_DB_URL` trong production khi custom runtime role là yêu cầu của rollout.
2. Xác nhận allowlist chứa origin Firebase cụ thể `https://<CONFIRMED_FIREBASE_PROJECT_ID>.web.app`, cộng exact custom domain và localhost chỉ khi cần; không dùng wildcard.
3. Deploy riêng function `api`:

```bash
npx supabase@latest functions deploy api --project-ref <CONFIRMED_SUPABASE_PROJECT_REF>
```

4. Chạy lại `npm run check:edge-runtime`, sau đó trước khi build frontend mới smoke-test trực tiếp function URL bằng origin Firebase đã xác nhận và tài khoản synthetic: kiểm tra CORS preflight, login, bearer session, `/auth/me`, logout và một request được bảo vệ. Response 401 cho `/auth/me` khi chưa có session là đúng; response 503, origin phản chiếu ngoài allowlist hoặc CORS wildcard là lỗi rollout.

### 4. Build and deploy Firebase Hosting

Sau khi Edge Function pass smoke test, build frontend với API URL public:

```bash
VITE_API_BASE_URL="https://<CONFIRMED_SUPABASE_PROJECT_REF>.supabase.co/functions/v1/api" npm run build
npm run validate:firebase
npx firebase-tools deploy --only hosting
```

Trước khi deploy, kiểm tra bundle vừa build không chứa `postgresql://`, tên/password runtime role hoặc service-role key.

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

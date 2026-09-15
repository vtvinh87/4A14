# Học Vui — Firebase Hosting + Supabase Edge API

Học Vui là trải nghiệm game-world tiếng Việt cho bé 9 tuổi trên máy tính bảng. Bản hiện tại giữ nền cảnh/pet đã duyệt, mở đủ 29 bài học và dùng các seed bài tập được đối chiếu với VBT/SGK Lịch sử và Địa lí 4. Frontend production được cấu hình để phục vụ bằng Firebase Hosting Spark; API tài khoản, phiên, hồ sơ, phụ huynh và tiến độ chạy trong Supabase Edge Function `api`, còn database cloud dùng Supabase PostgreSQL trong môi trường server-only.

## Chạy local

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 4173
```

Mở `http://localhost:4173/`.

Để chạy bản tích hợp API tại `http://localhost:8888/`, dùng Netlify Dev:

```bash
npm run dev:netlify
```

LaunchAgent `com.hoc-vui.localhost` đã được cấu hình để tự chạy cổng 8888. Khi chạy theo cấu hình tích hợp, server dùng transaction pooler Supabase với role `hoc_vui_runtime`; mật khẩu chỉ được đọc từ macOS Keychain qua `scripts/start-netlify-with-supabase.sh`, không đặt trong source, `VITE_*`, plist hay log. Nếu chạy thủ công và chưa có Keychain item, hãy cấu hình biến môi trường server-only theo `.env.example`.

## Firebase Hosting + Supabase Edge API

`firebase.json` chỉ phục vụ `dist` và fallback SPA; không bật Firebase Functions, Firestore hay Firebase Auth. Khi build production, đặt `VITE_API_BASE_URL` tới URL của Supabase Edge Function `api` thuộc project đã xác nhận. Browser chỉ giữ opaque session token trong `sessionStorage`; database URL, runtime-role credential, service-role key và allowlist CORS chỉ được cấu hình ở phía function.

Quy trình secrets, deploy, smoke test và rollback được ghi tại [docs/deployment/firebase-supabase-edge.md](docs/deployment/firebase-supabase-edge.md). Chỉ tạo `.firebaserc` sau khi đã đăng nhập đúng tài khoản Firebase và xác nhận chính xác project đích.

Migration cloud được quản lý duy nhất trong `supabase/migrations/` và có thể kiểm tra trạng thái bằng Supabase CLI. Role `hoc_vui_runtime` chỉ có quyền dùng private schema/tables và CRUD cần cho server API; các policy hiện tại của role này là broad server-side policies, nên việc cô lập dữ liệu theo từng trẻ do lớp auth/session của ứng dụng thực thi, không phải chỉ nhờ database RLS. Không dùng Supabase Data API cho schema `hoc_vui_private`. `SUPABASE_DB_URL` chỉ là fallback do nền tảng cung cấp, không tương đương custom runtime role và không dùng cho production khi rollout yêu cầu `hoc_vui_runtime`. Database hiện chỉ có Admin bootstrap và không nhập dữ liệu học sinh thật.

Để kiểm tra bản production có cache offline:

```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 4174
```

Mở `http://localhost:4174/`. Service Worker chỉ được tạo trong production build với cache có phiên bản; góc Phụ huynh chỉ hiện “Đã sẵn sàng offline” sau khi xác nhận đủ shell, JavaScript, CSS, ảnh, font local và 29 gói bài học. Hãy mở app khi có mạng và chờ trạng thái này trước khi ngắt mạng. Nếu trình duyệt không hỗ trợ Service Worker hoặc trạng thái chưa sẵn sàng, app chỉ được xem là online-only. App không tự tải lại giữa một hoạt động đang học.

## Kiểm tra

```bash
npm run typecheck
npm test
npm run validate:fox
npm run build
```

Để tái tạo và kiểm tra asset pet procedural:

```bash
npm run generate:fox
npm run validate:fox
```

## Phạm vi hiện tại

- Hành trình, danh mục sáu chủ đề, màn học, nhận dấu, pet, bộ sưu tập, góc phụ huynh và cài đặt.
- 29 bài học, mỗi bài có 3 nhiệm vụ và 6 hoạt động: lựa chọn, ghép cặp, sắp xếp bằng nút lên/xuống.
- Discovery luôn mở trước câu hỏi; mỗi hoạt động có gợi ý, giải thích và locator “Xem trong sách”.
- Tiến độ phiên, nhiệm vụ và dấu được lưu local-first bằng `localStorage` schema 1; lỗi/quota được báo mà không âm thầm ghi đè dữ liệu cũ.
- Khi có phiên server, tài khoản, session, event và snapshot được đồng bộ qua API vào Supabase; localStorage vẫn là cache/queue offline ở phía trình duyệt.
- Góc phụ huynh có xuất/nhập JSON tối đa 1 MB, validate trước khi thay thế và reset có xác nhận.
- Danh mục mở đủ sáu vùng học tập; dev server không cài Service Worker, chỉ bản production preview mới có kiểm tra offline.
- Bản production precache 29 gói bài học, JavaScript/CSS đã build, ảnh local, `fox-pet.glb` và các subset WOFF2 local của Be Vietnam Pro; dữ liệu học vẫn local-only trong `localStorage` và bản sao lưu JSON tối đa 1 MB.
- Typography dùng Be Vietnam Pro từ [Google Fonts](https://fonts.google.com/specimen/Be+Vietnam+Pro), gồm subset Vietnamese, Latin-ext và Latin; giấy phép SIL OFL 1.1 được giữ tại `public/fonts/OFL.txt`.
- Pet dùng GLB procedural local thật: mesh nhiều part có skin joints/weights và các clip `idle`, `greet`, `think`, `celebrate`, `rest`; runtime Three.js `0.186.0` được lazy-load local. Nếu WebGL hoặc asset lỗi, app giữ fallback PNG đã duyệt.
- `scripts/generate-fox-glb.mjs` là generator deterministic không dùng stock/copyright-unclear asset; `scripts/validate-fox-glb.mjs` kiểm tra GLB header, skin attributes, 17 bones và 5 clips.
- Nền cảnh vẫn là artwork đã duyệt; chỉ Cáo Nhỏ là render 3D realtime khi runtime khả dụng.
- Netlify Dev/local port 8888 vẫn là đường lui; chưa thực hiện production deploy Firebase Hosting/Supabase Edge, restore, import/reset hoặc đưa dữ liệu học sinh thật lên cloud.

Các file `._*` là metadata AppleDouble của volume ExFAT và được Vitest loại khỏi test discovery; không dùng làm source app.

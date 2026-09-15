# PIN 6 ô và PWA/icon — Local audit

Date: 2026-09-14  
Status: `PASS — local implementation ready for review`  
Scope: checkout local, không deploy cloud, không thay đổi Git lifecycle và không claim production acceptance.

## Đã triển khai

- Tạo `src/components/PinField.tsx` dùng một input semantic `type=password` cho mỗi luồng PIN, hiển thị sáu ô vuông dẫn xuất từ value.
- Sanitization chỉ giữ ASCII `0–9`, giữ số `0` ở đầu, giới hạn 6 ký tự và dùng `inputMode=numeric` để mobile ưu tiên bàn phím số.
- Thay thế tất cả PIN surface trong `AuthView`: học sinh đăng nhập, đổi PIN học sinh, mở Góc phụ huynh, đổi PIN phụ huynh lần đầu và đổi PIN phụ huynh trong Dashboard. Mật khẩu Admin vẫn là password field thông thường.
- Thêm `PwaInstallCard` vào Settings: deferred `beforeinstallprompt`, trạng thái `appinstalled`, hướng dẫn iOS và fallback browser menu trung thực.
- Thêm `public/manifest.webmanifest`, metadata trong `index.html`, Apple touch icon, favicon và precache cho manifest/icon trong service worker tự viết hiện hữu.
- Tạo bộ icon từ một master bitmap trong `public/icons/`; không thay thế artwork đang có trong `public/art/`.

## Verification evidence

| Gate | Kết quả |
|---|---|
| Focused PIN/PWA/manifest suite | `7` files passed, `24` tests passed |
| Full Vitest suite | `50` files passed, `4` skipped; `195` tests passed, `4` skipped; exit `0` |
| `npm run typecheck` | PASS |
| `npm run typecheck:server` | PASS |
| `npm run build` | PASS; 98 modules transformed; chỉ còn cảnh báo chunk Three.js >500 kB hiện hữu |
| Production preview HTTP | `/`, manifest, 5 PNG icon và `offline-manifest.json` đều HTTP `200`; content type lần lượt là HTML, `application/manifest+json`, `image/png` và `application/json` |
| Browser smoke 390×844 | 6 cells, numeric input attributes, `scrollWidth=390`, không tràn ngang |
| Browser smoke 1440×900 | 6 cells, numeric input attributes, `scrollWidth=1440`, không tràn ngang |
| Settings fallback ở local 390px | Hiển thị hướng dẫn “Mở menu trình duyệt…”; không báo đã cài giả |
| Offline boundary scan | Credential/database scan trong `dist` rỗng; `dist/sw.js` và `dist/offline-manifest.json` không có `/api/` |

### PIN DOM contract đã quan sát

Production preview ở 390px render:

- `#auth-pin`: `type=password`, `inputmode=numeric`, `autocomplete=current-password`, `maxlength=6`, `pattern=[0-9]*`.
- Sáu phần tử `[data-pin-cell]` nằm trong visual row; input semantic vẫn là control duy nhất cho accessibility, paste, autofill và backspace.
- Manifest link, favicon, Apple touch icon và theme color đều xuất hiện trong document metadata.

### Icon contract

Các file served đều là PNG opaque, đúng kích thước:

- `favicon-32.png`: 32×32
- `icon-180.png`: 180×180
- `icon-192.png`: 192×192
- `icon-512.png`: 512×512
- `icon-512-maskable.png`: 512×512

SHA-256 của các file PWA được ghi trong `vite.config.ts`:

```text
public/manifest.webmanifest       b9e28071fb102bf0e48ecc4335209536d6b41229e4ac1fc13b2d3ccb1a62f289
public/icons/favicon-32.png       24d5d7a562d2e64796b19872ca02454869a93b640635c38a4162a9c2cf849ed1
public/icons/icon-180.png         d9bde06f336bec768bec0f4348613f59a45908e4559595b6425f59701e2d4ee7
public/icons/icon-192.png         3596603c7ae97fb23eb67a30541f87dc10b36be9e8504d3444823349f675cd57
public/icons/icon-512.png         100b5697f8503055e26532686ad057b986e7da16dc8336a8a24efef2dc81fbe0
public/icons/icon-512-maskable.png 100b5697f8503055e26532686ad057b986e7da16dc8336a8a24efef2dc81fbe0
```

## Giới hạn còn lại

- Chưa thực hiện acceptance trên thiết bị iOS/Android thật; prompt native và việc cài thực tế cần kiểm tra thêm trên từng browser/device.
- Production preview không có Netlify Functions nên login server trên origin preview báo lỗi expected; auth/API integration không bị thay đổi. Install prompt được kiểm thử bằng contract test và Settings fallback được quan sát trên local app.
- Không có cloud deploy, signing, native store packaging, push notification hoặc P9 trong phạm vi này.

Các AppleDouble sidecar phát sinh tạm thời trên ExFAT trong lúc tạo asset/test đã được di chuyển nguyên trạng sang `/tmp/hoc-vui-appledouble-recovery/pin-pwa-2026-09-14/`; không xóa dữ liệu người dùng. Kiểm tra cuối cho thấy không còn `._*` trong `src/pwa/` và `public/icons/`.

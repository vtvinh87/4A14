# Học Vui — audit handoff hồ sơ học sinh, sinh nhật và lời chúc

Status: `P8-F-READY_FOR_REVIEW`  
Audit time: `2026-09-14 17:15 +07:00`  
Workspace: `/Volumes/Pictures/Projects/Hoc_Vui`  
Plan: [2026-09-14-student-profile-birthday-wishes.md](../superpowers/plans/2026-09-14-student-profile-birthday-wishes.md)  
Spec: [2026-09-14-student-profile-birthday-wishes-design.md](../superpowers/specs/2026-09-14-student-profile-birthday-wishes-design.md)

## Kết luận ngắn

Các packet mở rộng đã được tiếp tục theo đúng thứ tự **P0-F → P1-F → P2-F → P3-F → P5-F → P4-F → P6-F → P7-F → P8-F**. Full test, client/server typecheck và production build hiện đều chạy được. Database integration vẫn bị skip vì checkout không có database URL riêng; browser smoke chỉ có bằng chứng ở viewport khả dụng `1280×720`, chưa phải nghiệm thu authenticated ở `390×844` và `1440×900`.

Đây là handoff để review cục bộ, không phải xác nhận production-ready, cloud-deployed, PWA đã cài trên thiết bị thật hay đã chấp nhận với trẻ thật.

## 1. Automated gates

| Lệnh | Exit | Kết quả quan sát được | Phân loại |
|---|---:|---|---|
| `npm test -- --reporter=dot` | `0` | `62` test files passed, `4` skipped; `252` tests passed, `4` skipped | PASS; 4 skip là integration DB hiện hữu |
| `npm run typecheck` | `0` | `tsc -b --pretty false` không có lỗi | PASS |
| `npm run typecheck:server` | `0` | server TypeScript không có lỗi | PASS |
| `npm run build` | `0` | Vite build `105` modules, tạo `dist/` thành công | PASS; còn cảnh báo chunk lớn, `three.module` khoảng `746.94 kB` |
| `npm run test:db -- --reporter=dot` | `0` | `3` test files / `3` tests bị skip vì không có điều kiện DB | UNVERIFIED, không quy đổi thành DB PASS |

Full-suite output được lấy fresh sau P7-F; không dùng kết quả cũ để thay thế gate P8-F.

## 2. Feature audit matrix

| ID | Trạng thái | Bằng chứng | Giới hạn |
|---|---|---|---|
| `PF-01` | PASS | `src/components/UserMenu.test.tsx`, `src/components/TopHud.test.ts`: đúng ba action Hồ sơ/Phụ huynh/Đăng xuất, mở bằng click/keyboard, Escape/outside click và trả focus về trigger; `src/components/UserMenu.tsx` là owner menu | Chưa walkthrough bằng browser authenticated |
| `PF-02` | PASS | `src/components/ProfileDialog.test.tsx`: preset avatar allowlist, display name, ngày sinh, patch chỉ gồm field đổi; save lỗi giữ draft; `src/App.test.ts` kiểm tra profile hiển thị trong flow tổng hợp | Chưa nhập/sửa qua browser thật |
| `PF-03` | PASS | `server/auth/profile.test.ts`, `server/app.test.ts`, `src/auth/apiClient.profile.test.ts`: username read-only, patch allowlist, profile response không credential/hash/salt/token, route `no-store` | Postgres persistence chưa chạy do DB skip |
| `PIN-01` | PASS | `src/components/PinField.tsx:5-43` dùng một semantic password input, lọc ASCII `0–9`, giữ leading zero, `maxLength=6`, `pattern=[0-9]*`, `inputMode=numeric` và render đúng 6 cell; `src/views/AuthView.test.tsx`, `src/components/ProfileDialog.test.tsx` cover các surface | CUA không thực hiện submit tài khoản; browser shell đã xác nhận 6 cell và thuộc tính numeric |
| `BD-01` | PASS | `src/profile/birthday.ts` dùng `Asia/Ho_Chi_Minh`; `src/profile/birthday.test.ts` cover ranh giới ngày; App test tạo DOB khớp ngày Việt Nam hiện tại | Browser timezone/overlay chưa walkthrough |
| `BD-02` | PASS | Birthday tests cover Feb 29 fallback sang Feb 28 trong năm không nhuận | Không có claim ngoài date-only engine |
| `BD-03` | PASS | Birthday tests cover marker theo `accountId + year`, best-effort local storage; App chỉ set celebration sau guard phiên/profile | Marker local không phải server audit/event |
| `BD-04` | PASS | `BirthdayCelebration.test.tsx` cover reduced-motion, sound callback tối đa một lần, copy không có tuổi/ngày sinh; source không có Notification/push | OS notification và sound trên thiết bị thật chưa kiểm tra |
| `PR-01` | PASS | `StudentProfileCard.test.tsx`, `src/views/ParentView.test.ts`, `server/auth/profile.test.ts`: profile lấy từ active parent grant, preference boolean default-off, lock/failure dọn profile; App boundary cover stale response | Parent API/migration Postgres chưa chạy trên DB thật |
| `SC-01` | PASS | `LessonMap.test.tsx` giữ đủ `29` row trong một region focusable; `LessonMap.tsx` và CSS dùng region cuộn độc lập | Chưa kéo cuộn vật lý trên mobile browser |
| `SC-02` | PASS | `History.test.tsx` giữ toàn bộ dữ liệu synthetic trong region thứ hai; `History.tsx` đã bỏ `slice(0, 12)`; heading/count nằm ngoài region | Chưa kiểm tra cảm giác cuộn vật lý ở 390px |
| `BW-01` | PASS_WITH_CONCERN | `shared/birthday-wish-contracts.test.ts` và `server/classroom/birthdayWishPolicy.test.ts` cover allowlist, consent, cùng lớp, rate/idempotency, stale/concurrent insert và redaction; không có UI/route/SQL/cloud cho peer wish | Runtime avatar validation ở resolver tương lai vẫn là boundary cần giữ khi online hóa |
| `ISO-01` | PASS | `src/App.test.ts`, `src/profile/featureFixtures.test.ts`, server auth tests và `tests/e2e/accounts-parent.spec.ts` cover A/B/account epoch, progress độc lập, parent lock và failed-network logout không để lại profile/DOB/dashboard/celebration | Browser authenticated A/B chưa chạy vì không nhập credentials |

## 3. Production-preview smoke

Production artifact được build bằng `npm run build`, sau đó serve bằng:

```text
npm run preview -- --host 127.0.0.1 --port 4174 --strictPort
http://127.0.0.1:4174/
```

Viewport do Codex in-app browser cấp thực tế là `1280×720`; không có capability override về `390×844` hoặc `1440×900` trong surface này. Bằng chứng read-only trên login shell:

- `document.documentElement.scrollWidth === clientWidth === 1280`.
- `document.body.scrollWidth === clientWidth === 1280`.
- Có `6` `[data-pin-cell]`.
- PIN là `type=password`, `inputmode="numeric"`, `pattern="[0-9]*"`, `maxLength=6`.
- Có link manifest `/manifest.webmanifest`.

HTTP/static checks trên preview:

- `/manifest.webmanifest` — `200`, `application/manifest+json`.
- `/icons/icon-192.png`, `/icons/icon-512.png` — `200`, `image/png`.
- `/sw.js` — `200`, `text/javascript`.
- `offline-manifest.json` — schema `1`, cache `hoc-vui-offline-5ad5efdd`, `129` URL, `apiUrls: []`.
- Scan `dist/offline-manifest.json` và `dist/sw.js` không có `/api/`.

Không nhập credentials, PIN thật hoặc dữ liệu người học thật. Do đó các mục sau được giữ `UNVERIFIED`, không suy diễn từ shell smoke: cài PWA trên OS/mobile thật; authenticated menu/modal; mobile date picker; birthday overlay; parent profile và hai vùng cuộn bằng thao tác kéo; failed logout qua browser; chính xác hai viewport `390×844` và `1440×900`.

## 4. Database, cloud và privacy boundary

- Migration additive hiện có: `supabase/migrations/20260914120000_student_profiles.sql`.
- `npm run test:db -- --reporter=dot` chỉ thu được `3` skip; không có dedicated database URL trong môi trường hiện tại. Chưa claim apply migration, rerun/idempotency hoặc Postgres reload.
- Không provision Supabase/cloud, không deploy Netlify, không gửi notification/push, không dùng secret và không nhập real learner data.
- P6-F chỉ cung cấp shared contract + policy in-memory; không có classroom table, endpoint, peer wish UI hay online send flow.
- Profile self/parent dùng scope phiên hiện hữu; parent profile không nhận `studentId` tùy ý để quyết định quyền. Peer birthday card không trả exact DOB/age/credential material.
- PIN/PWA/icon là nền tảng có trước và được tái sử dụng; packet này không tạo auth store/PWA plugin/icon pipeline thứ hai.

## 5. Files changed by packet

Danh sách dưới đây gom các source chính theo report packet; các report/snapshot/review tương ứng nằm trong `.superpowers/sdd/2026-09-14-student-profile-birthday-wishes/`.

| Packet | Source/docs chính |
|---|---|
| P0-F | `docs/executor/STUDENT-PROFILE-BIRTHDAY-EXECUTION.md`, baseline report/brief/snapshot |
| P1-F | `shared/account-contracts.ts`; `server/auth/types.ts`, `service.ts`, `memoryRepository.ts`, `postgresRepository.ts`; `server/app.ts`; `src/auth/apiClient.ts`; `src/profile/avatarCatalog.ts`; profile migration và API/service tests |
| P2-F | `src/components/UserMenu.tsx`, `ProfileDialog.tsx`, `TopHud.tsx`, `src/App.tsx`, `src/styles.css` và các test tương ứng |
| P3-F | `src/profile/birthday.ts`; `src/components/BirthdayCelebration.tsx`; `src/App.tsx`, `src/styles.css` và birthday tests |
| P5-F | `src/components/parent/StudentProfileCard.tsx`; `src/App.tsx`, `src/views/ParentView.tsx`, `src/styles.css`; parent/server regression tests |
| P4-F | `src/components/parent/LessonMap.tsx`, `History.tsx`; `src/views/ParentView.tsx`, `src/styles.css`; scroll-region tests |
| P6-F | `shared/birthday-wish-contracts.ts`; `server/classroom/birthdayWishPolicy.ts`; contract/policy tests; không thêm cloud surface |
| P7-F | `src/App.tsx`, `src/styles.css`; `src/App.test.ts`, `src/profile/featureFixtures.ts`, `src/profile/featureFixtures.test.ts`; mở rộng `TopHud.test.ts`, `ParentView.test.ts` |
| P8-F | Tài liệu audit này, execution ledger, SDD progress, P8 brief và snapshot; không thay đổi source behavior |

Nền tảng được giữ nguyên, không triển khai lại: `src/components/PinField.tsx`, `public/manifest.webmanifest`, `public/icons/*`, `src/pwa/*`, `vite.config.ts` và [PIN-PWA-ICONS-AUDIT.md](PIN-PWA-ICONS-AUDIT.md).

## 6. Next safe action

Review audit này và các packet report. Nếu cần nâng mức xác nhận, bước tiếp theo an toàn là cấp một dedicated local DB test environment và một browser harness có viewport/auth fixture; sau đó chạy lại riêng các gate hiện đang `UNVERIFIED`. Chưa có cơ sở để deploy hoặc gọi tính năng online classroom wishes là khả dụng.

## 7. Final read-only review

Reviewer `01a09f6d-66a1-73c3-8d64-214ea0015cf2` returned `PASS_WITH_CONCERNS`: không có blocker; DB `3` test bị skip và authenticated QA tại `390×844`/`1440×900` chưa verify. Đây là cùng các giới hạn đã nêu trong audit, không có mismatch mới cần sửa.

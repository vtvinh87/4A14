# Bản đồ tiến bộ — Hướng dẫn triển khai cho GPT-5.6 Luna Max

> Dùng `superpowers:executing-plans` để thực hiện từng gói việc; dùng subagent chỉ khi runtime và vai trò cho phép. Đây là tài liệu triển khai, chưa phải bằng chứng đã triển khai. Đọc toàn bộ tài liệu này và asset brief liên kết trước khi sửa code.

**Goal:** Đưa bố cục đã duyệt trong demo vào ứng dụng thật, hoàn thiện hình ảnh phụ theo concept, đạt ít nhất 95/100 theo rubric ở cuối tài liệu và vượt toàn bộ điều kiện bắt buộc.

**Architecture:** Một ảnh bản đồ nguyên vẹn, năm dấu mốc vùng nhỏ, một nút Địa phương em ở header và một vùng thông tin thống nhất. React quản lý lựa chọn; dữ liệu và hành động học tập tiếp tục dùng các contract hiện hữu. Mobile đặt thông tin dưới tranh, desktop đặt bên phải.

**Tech stack:** React 18, TypeScript, CSS hiện hữu, Be Vietnam Pro local, Vitest, Vite/PWA, ImageGen built-in cho ảnh phụ. Không cần UI framework hay backend mới.

## 1. Đầu vào và thứ tự ưu tiên

Workspace hiện tại: `/Volumes/Pictures/Projects/Hoc_Vui`. Mọi đường dẫn bên dưới tính từ checkout thực tế, không mặc định subagent có cùng checkout.

| Nguồn | Đường dẫn | Vai trò |
|---|---|---|
| Demo đã được người dùng khen và đồng ý | `design/progress-map/layout-review.html` | Chuẩn bố cục, vị trí panel, giữ tỷ lệ ảnh, hai trạng thái |
| Concept mobile | `design/progress-map/references/mobile-concept.png` | Chất liệu, màu, nét chữ vui, nút và minh họa phụ |
| Concept desktop | `design/progress-map/references/desktop-concept.png` | Bố cục hai cột, Cáo Nhỏ, vignette địa danh và trang trí chân panel |
| Map runtime | `public/art/progress/vietnam-progress-map-illustrated.png` | Ảnh nền duy nhất, 1840×1940, không sửa |
| Brief ảnh phụ | `docs/design/progress-map-supporting-art-brief.md` | Danh sách đủ asset, prompt, tiêu chuẩn và bàn giao |

Thứ tự giải quyết xung đột: yêu cầu hiện tại của người dùng → invariants trong tài liệu này → bố cục demo → thẩm mỹ concept → giao diện cũ.

Concept AI bị kéo dài ảnh ở mobile và cắt ảnh ở desktop; tuyệt đối không tái tạo hai lỗi đó. Demo dùng system font, emoji và số liệu giả, nên không sao chép các phần đó vào production. Dùng font local của game, icon/ảnh đúng brief và dữ liệu API thật. Nhân vật dẫn đường thống nhất là Cáo Nhỏ; bé gái xuất hiện trong concept mobile là sai khác của AI, không phải yêu cầu thêm nhân vật.

Trước khi bắt đầu, mở cả hai PNG và demo. Không chỉ đọc mô tả. Nếu thiếu file, ghi rõ missing input trước khi thực hiện phần phụ thuộc; không tự tưởng tượng concept thay thế.

## 2. Phạm vi và các ràng buộc

- Chỉ thay giao diện Bản đồ tiến bộ, ảnh phụ, offline registration, tests và hồ sơ QA liên quan.
- Không thay backend, schema, progress scoring, quyền mở bài, API, auth, chat hoặc Thách đố.
- Giữ nguyên hash bản đồ: `93bb877ea95e3cf02d8070f1b978f4772b471e430de3b1fb64a3e6e95eb785ba`.
- Không dùng `cover`, clip mask hay scale không đồng nhất trên bản đồ. Tỷ lệ 1840/1940; `width:100%; height:auto; display:block`.
- Không dùng concept PNG nguyên tấm làm UI hay asset runtime. Chữ, nút, progress, focus phải là HTML/CSS thật.
- Không route vàng. Không thẻ tên vùng thường trực trên tranh. Không overlay trong khu vực Hoàng Sa/Trường Sa và nhãn của chúng.
- Không copy số `6/29`, `0/5` hoặc `3/4` vào production. Các số này chỉ hợp lệ ở fixture minh họa.
- Xưng hô tớ/cậu. Phân biệt “vùng” với “bài”; số header = exploredLessonCount / tổng lessons hiện hữu.
- Dữ liệu test là synthetic. Không sửa tiến bộ hay tài khoản học sinh thật để tạo screenshot.
- Tài liệu này không yêu cầu tự deploy. Ghi nhận quyền Git/deploy hiện hành khi thực thi; không suy ra quyền xuất bản từ prompt của subagent.

## 3. Thiết kế cụ thể phải triển khai

### 3.1. Shell và responsive

Một shell kem duy nhất, một đường viền mảnh, bo góc 20px, bóng nhẹ. Xóa khung scene thứ hai và vùng nền trống do `min-height`. Map chạm vùng header/panel một cách gọn, không thêm padding nhiều tầng.

| Hạng mục | Mobile <900px | Desktop ≥900px |
|---|---|---|
| Shell | rộng min(100vw−16px, 520px) | hai cột map + panel 280px, tối đa 860px |
| Header | 64px, nút compass/close 44px | 64px, nút compass/close 44px |
| Map | rộng 100%, cao tự tính theo tỷ lệ | rộng theo chiều cao khả dụng, tối đa 540px |
| Panel welcome | 140–180px, ảnh cáo 80–96px cạnh lời mời | panel 280px, ảnh cáo 160–190px |
| Panel selected | khoảng 160–220px trước khi mở danh sách | ảnh vùng 232×150px, tên, tiến bộ, CTA |
| Danh sách bài | mở trong flow dưới panel | mở trong panel; cho cuộn khi dài |
| Khoảng map→panel | 0–12px | 0px, phân cách 1px nhẹ |

Desktop tính width map = min(540px, (100dvh − 104px) × 1840/1940), shell width = map width + 280px + border. Nếu map tính ra <300px, chuyển fallback một cột và cho cuộn toàn body. Không cố ép portrait artwork vào vùng landscape bằng crop. Trên màn hình thấp, bảo toàn tỷ lệ và cuộn là chấp nhận được.

Header luôn dễ tìm: sticky top trong shell. Dùng flex shell, `max-height:calc(100dvh - 24px)`, body `min-height:0; overflow:auto`. Tránh hai thanh cuộn lồng nhau trên mobile. Panel không fixed đè lên đáy bản đồ. Nội dung mở rộng không làm biến dạng kích thước ảnh.

Typography Be Vietnam Pro: title mobile 17–19px/desktop 21–24px, tên vùng 20–24px, body 14–16px, metadata tối thiểu 12px, button 15–16px. Tránh uppercase kicker ở mọi vùng; welcome chỉ một câu “Cậu muốn ghé miền nào?” và một hướng dẫn ngắn.

Token scoped: ink `#103b50`, teal `#107e88`, cream `#fffbed`, muted `#4b6f74`, gold `#ffce4f`, border `#b6c8b7`. Kiểm tra contrast trên nền cuối, không tuyên bố đạt accessibility chỉ vì dùng đúng token.

### 3.2. Dấu mốc và địa danh

Năm vùng địa lý giữ đúng tên topic trong `progressMapMeta`; Địa phương em chuyển sang nút la bàn header, vẫn mở danh sách bài thật. Năm số 1–5 là mã vị trí trong UI, không phải thứ hạng hay thứ tự bắt buộc.

Khởi điểm anchor normalized theo demo: Bắc (20%,9%), Bắc Bộ (43%,18%), miền Trung (49%,34%), Tây Nguyên (52%,57%), Nam Bộ (35%,82%). Đây là tọa độ ảnh, không phải tọa độ địa lý. Kiểm tra với artwork và chỉnh nhẹ nếu cần để không che công trình.

Marker có hình tròn nhìn thấy 28–32px; button 44×44px. Chọn: nền teal, halo nhẹ tối đa 6px; không pulse vô hạn. Trạng thái tiến bộ dùng badge nhỏ check/diamond/star và accessible label, không chỉ màu. Chỉ một marker được chọn. Không hiện năm nhãn chữ dài. Tên xuất hiện trong panel; focus/hover có thể hiện tooltip ngắn nhưng không bắt buộc hover để dùng.

Tám địa danh hiện hữu phải tiếp tục khám phá được. Chuyển anchor tương tác của địa danh sang normalized artwork coordinates đã đối chiếu trực quan; giữ lat/lon làm metadata nếu cần, không dùng projection cũ để đoán hotspot trên tranh AI. Đánh dấu center từng công trình trên ảnh gốc, lưu vào metadata và ảnh QA annotated riêng. Không sửa ảnh gốc để vẽ debug.

Vùng chạm địa danh 44×44px có một dấu sparkle tĩnh nhỏ 10–12px ở cạnh công trình để gợi tương tác. Không làm tám vòng tròn lớn cạnh tranh năm marker. Nếu hitbox vùng và địa danh giao nhau, di chuyển marker vùng đến khoảng trống gần đó; không xử lý bằng cách vô hiệu một nút hoặc dùng z-index che nút kia. Ở viewport nhỏ phải đo bounding boxes thực tế.

### 3.3. State và hành động

```ts
type MapSelection =
  | { kind: 'welcome' }
  | { kind: 'topic'; topicName: string }
  | { kind: 'landmark'; landmarkId: ProgressMapLandmarkId };
```

Chủ sở hữu state là `ProgressBoardDialog`; scene gửi event, không giữ panel landmark riêng. State khởi đầu welcome mỗi lần mở dialog. `nextLessonId` vẫn là gợi ý học, không tự chọn vùng khi vừa mở. Chọn topic: chọn lesson tiếp theo của topic qua selector hiện hữu, reset expanded/detail. Chọn landmark: panel hiển thị tên + một câu + ảnh phụ phù hợp, không giả tiến độ cho địa danh. Nút “Về bản đồ” trả welcome và focus trigger vừa dùng. Nút compass chọn topic “Địa phương em”.

Nếu refresh data: giữ lựa chọn topic còn tồn tại, cập nhật counts và action lesson; topic/lesson bị loại bỏ thì quay welcome hoặc clear selectedLessonId. Không nhảy sang bài vùng khác. Account switch/unmount phải clear selection theo lifecycle hiện hữu.

CTA vùng dùng `PROGRESS_ACTION_LABELS` và `summarizeProgressMapTopic`, vẫn tôn trọng lesson availability. Không tự mở unreviewed lesson. “Xem bài học” mở `ProgressLessonStrip`, vẫn có `ProgressLessonDetail` và `ClassUnlockCard` như trước. Vùng rỗng: “Vùng này chưa có bài để mở.”, không CTA chết mang nhãn Khám phá.

Loading/error/stale/empty/logged-out vẫn hoạt động. Panel welcome không được giấu lỗi API. Stale có thông báo gọn và refresh. Escape từ landmark/panel detail đóng tầng đó trước, Escape tiếp theo đóng dialog; tránh listener cha đóng toàn dialog cùng một lần. Focus trap, return focus và body scroll lock phải giữ nguyên.

## 4. File map và interface

Modify:
- `src/components/progress/ProgressBoardDialog.tsx`: state owner, header compass, responsive shell, panel duy nhất.
- `src/components/progress/ProgressMapScene.tsx`: render map, năm markers + hotspot địa danh, controlled selection, bỏ hint lặp và card riêng.
- `src/components/progress/ProgressMapNode.tsx`: marker nhỏ, trạng thái/accessibility.
- `src/components/progress/ProgressMapDrawer.tsx`: giữ logic bài học, giao diện selected topic tích hợp.
- `src/components/progress/progressMapLandmarks.ts` và `.json`: artwork anchors, labels và validated IDs.
- `src/styles.css`: chỉ rules scoped progress-map/progress-board; thay rule cũ thay vì nối thêm override vô hạn.
- `vite.config.ts`, `src/pwa/offline.test.ts`: active asset allowlist/hash.
- Existing tests của Dialog/Scene/Drawer/skin/style: đổi expectation theo hành vi mới, giữ regression liên quan dữ liệu/focus.

Create:
- `src/components/progress/progressMapPresentation.ts`: MapSelection, normalized positions và asset registry.
- `src/components/progress/ProgressMapInfoPanel.tsx`: welcome/landmark/topic branch, render Drawer cho topic.
- `src/components/progress/ProgressMapInfoPanel.test.tsx`: selection branches và return focus event.
- `src/components/progress/progressMapPresentation.test.ts`: metadata consistency, không hardcoded fake counts.
- `design/progress-map/qa/`: screenshot, điểm số, artifact ledger.
- `public/art/progress/support/`: chỉ ảnh đã được accept từ brief.

Giữ `VietnamMapBase.tsx` trỏ đúng ảnh gốc, có thể thêm loading/decode handling nhưng không thay bytes. `ProgressMapLandmarkCard.tsx` không còn là panel riêng trong Scene; chỉ xóa file nếu xác nhận không consumer khác và cập nhật test tương ứng.

Contract Scene mới (import types từ modules hiện hữu):
```ts
type SceneProps = {
  topics: readonly ProgressBoardTopic[];
  nextLessonId: string | null;
  selection: MapSelection;
  reducedMotion: boolean;
  onSelectTopic: (topicName: string) => void;
  onSelectLandmark: (id: ProgressMapLandmarkId) => void;
};
```
InfoPanel nhận `selection`, `data: ProgressBoardData`, `selectedLessonId`, `expanded`, `detailsOpen`, `classUnlock`, `reducedMotion`, callbacks selectLesson/openLesson/toggleExpanded/toggleDetails/back. Không fetch API lần nữa trong panel. Giữ tất cả callback types tương ứng Props hiện hữu của Drawer.

## 5. Trình tự triển khai cho Luna

### Gói P0 — baseline và checkpoint

- [ ] Đọc tài liệu + brief + xem 2 concept + demo. Đọc AGENTS/skills live của checkout.
- [ ] `git status --short`, `git log -3 --oneline`; xác nhận map hash bằng `shasum -a 256 public/art/progress/vietnam-progress-map-illustrated.png`.
- [ ] Kiểm tra demo/reference là file chưa commit hay đã commit. Nếu dùng worktree mới, chuyển đúng các file này theo đường dẫn kiểm chứng; không giả định default branch có chúng.
- [ ] Tạo `design/progress-map/qa/execution-ledger.md` bằng apply_patch: checkout, baseline SHA, model/role thực tế, P0–P5 status, agent IDs nếu có, commands/exit, next action. Không ghi token/secrets.
- [ ] Chụp baseline UI với synthetic fixture ở 390×844 và 1440×900. Không sửa dữ liệu cloud để chụp.

### Gói P1 — supporting art (song song P2 nếu được phép)

- [ ] Thực hiện toàn bộ brief asset. Xem imagegen SKILL trong session hiện tại; built-in tool mặc định.
- [ ] Trả candidate contact sheet, PNG/WebP accepted, alpha/size/hash metadata và prompt log. Không chỉnh TS/CSS/vite.
- [ ] Parent mở từng ảnh, loại ảnh sai mascot, chữ giả, landmark sai hoặc nền checkerboard bị vẽ thật.
- [ ] Khóa manifest asset accepted trước P3. Không chấp nhận production dùng emoji/placeholder do tool ảnh thiếu; báo rõ dependency bị chặn, vẫn tiếp tục UI độc lập.

### Gói P2 — selection và bảo toàn chức năng

- [ ] Thêm MapSelection + anchors; sửa Dialog owner và Scene controlled props cùng một gói.
- [ ] Regression hành vi: initial welcome; topic click chọn đúng vùng; compass mở Địa phương em; không có map marker thứ sáu; landmark dùng chung panel; dữ liệu refresh không đưa bài khác vùng vào CTA.
- [ ] Thêm tests cho Escape tầng trong rồi dialog, return focus, empty topic không mở lesson, onOpenLesson đúng ID. Dùng fixture của tests hiện hữu, không snapshot khổng lồ.
- [ ] Chạy `npx vitest run src/components/progress/ProgressBoardDialog.test.tsx src/components/progress/ProgressMapScene.test.tsx src/components/progress/ProgressMapDrawer.test.tsx` và test mới có liên quan.
- [ ] Checkpoint: business behavior pass trước khi tinh chỉnh hình thức.

### Gói P3 — responsive UI và tích hợp ảnh

- [ ] Implement shell/header/grid theo §3; loại `min-height:680px`, mobile clamp min-height cũ, negative margin Drawer và giới hạn canvas tạo gutter thừa.
- [ ] Implement marker CSS/tap targets, info panel, assets theo manifest; import font hiện hữu, không thêm Google Fonts.
- [ ] Render ảnh với width/height và reserved aspect ratio để không nhảy layout. Ảnh panel trang trí `alt=""`; nội dung landmark vẫn có tên text đọc được.
- [ ] Dùng ảnh cáo gọn trên mobile; ẩn footer scenery trên mobile nếu chiếm chiều cao; không bỏ welcome mascot. Desktop không đệm panel bằng đoạn chữ thừa.
- [ ] Chọn lần lượt cả 6 topic và 8 landmark; đo hitbox không chồng, panel không đè ảnh; lấy screenshot.
- [ ] Mở lesson list/detail/class unlock và test trở lại map; chức năng không được mất vì panel mới.

### Gói P4 — offline/performance

- [ ] Chỉ parent sửa `LOCAL_ART_URLS` và `LOCAL_ART_VERSIONS`; tính SHA thực, không copy hash từ brief.
- [ ] Không precache concept/source/contact sheet. Không thêm asset vào public rồi quên giới hạn bundle/hosting.
- [ ] Chạy `npx vitest run src/pwa/offline.test.ts src/components/progress/progressMapIllustratedAsset.test.ts` và `npm run validate:progress-map`.
- [ ] Chạy `npm run typecheck`, `npm run typecheck:server`, `npm test -- --run --reporter=dot`, `npm run build`, `git diff --check` một lượt sau thay đổi cuối.
- [ ] Inspect manifest + SW + PNG hash ở dist; kiểm tra ảnh phụ khi offline qua browser cache nếu công cụ hỗ trợ. Nếu chỉ static check thì ghi đúng mức bằng chứng.

### Gói P5 — review thị giác, sửa và bàn giao

- [ ] Chụp đủ viewport/state ở §7 với ảnh thật. Không dùng screenshot mockup HTML thay screenshot app implementation.
- [ ] Reviewer so side-by-side concept/demo với UI, ghi từng mục rubric và finding có vị trí/ảnh.
- [ ] Sửa finding, chụp lại đúng viewport bị ảnh hưởng; không chạy full suite lặp vô ích khi chỉ cập nhật docs.
- [ ] Kết thúc READY_FOR_REVIEW chỉ khi mọi hard gate pass, điểm ít nhất 95, không còn finding nghiêm trọng; chưa đủ bằng chứng thì ghi NOT VERIFIED, không tự điền PASS.
- [ ] Bàn giao checkout, diff, asset manifest, ảnh QA, rubric, test result, hạn chế và hướng mở local. Commit/push/deploy chỉ theo quyền của task thực thi.

## 6. Phân công và prompt subagent

Nếu Luna là root task do người dùng mở trực tiếp, có công cụ subagent: tối đa 2 worker cùng lúc; một art worker song song parent UI, sau đó một reviewer read-only. Không chia Dialog/Scene/Drawer cho nhiều người cùng sửa vì state liên kết chặt.

Nếu Luna là executor được Astra giao packet: tuân guard workflow, không tự spawn descendants. Astra/parent điều phối art worker nếu được phép; nếu không thì Luna tạo ảnh và code tuần tự. Thiếu subagent không làm giảm tiêu chuẩn giao hàng. Không tạo task mới thay cho subagent mà chưa có quyền phù hợp.

**Brief ART worker (copy nguyên, bổ sung checkout thực):**
> Đọc docs/design/progress-map-supporting-art-brief.md và hai concept trong design/progress-map/references. Tạo đủ supporting art bằng ImageGen built-in, giữ map gốc và mascot identity. Chỉ ghi design/progress-map/supporting-art/ và public/art/progress/support/. Không ghi code, manifest offline, Brain_Vault; không commit/push/deploy, không descendants. Trả từng path, kích thước, byte size, SHA256, có alpha thật hay không, prompt và reference, contact sheet, các candidate bị reject và lý do. Dừng ART_READY_FOR_REVIEW. Nếu thiếu image tool thì báo BLOCKED_ART, không giả asset hoàn thành.

**Brief REVIEW worker:**
> Read-only code và screenshot tại design/progress-map/qa; đọc §1–3 và §7 plan. Đánh giá đủ 8 hard gates và rubric 100 điểm. Chỉ ghi design/progress-map/qa/independent-review.md, không sửa code/art. Findings theo mức nghiêm trọng, file hoặc screenshot, evidence, expected/actual, hướng khắc phục. Không chấm hạng mục chưa có screenshot. Trả READY hoặc NEEDS_FIX; không commit/push/deploy, không descendants.

Parent không ghi write-set art khi worker đang chạy. Parent tự kiểm tra artifact thật, không coi summary của worker là bằng chứng. Khi gián đoạn, đọc ledger + git diff + file hashes, tiếp tục gói dở, không tạo lại ảnh đã accept.

## 7. Định nghĩa nghiệm thu 95%

95% là điểm fidelity/UX theo rubric sau, không phải cam kết cảm tính hay pixel similarity với ảnh AI sai tỷ lệ. Pixel diff chỉ có ý nghĩa giữa screenshot cùng viewport/state/reference chuẩn hóa. User vẫn là người đánh giá cảm nhận cuối.

Hard gates — một mục fail thì tổng điểm không đủ điều kiện nghiệm thu:
1. Hash map đúng, tỷ lệ width/height sai số <0.5%; toàn bộ ảnh gồm hai quần đảo và nhãn vẫn trong image box, không crop/mask.
2. Không thẻ lớn trên map; markers không che các công trình chính. Tổng diện tích marker nhìn thấy mục tiêu ≤5% image box, đo bằng bounding boxes; không dùng con số này thay kiểm tra vị trí.
3. Không gutters vô nghĩa >24px quanh map trong body; khoảng map/panel 0–12px mobile; không min-height sinh khoảng trống dưới ảnh.
4. Năm vùng + Địa phương em + tám địa danh vẫn truy cập được, không hitbox overlap chặn thao tác, tap target tối thiểu 44×44.
5. Không mất API/error/stale/empty, lesson list/detail/class unlock hoặc quyền mở bài.
6. Tất cả ảnh phụ bắt buộc được tạo/accept/tích hợp; không emoji/placeholder/candidate lỗi ở runtime.
7. Không horizontal overflow tại các viewport bắt buộc; close/CTA tiếp cận được, keyboard/focus/Escape/reduced motion hoạt động.
8. Full gates kỹ thuật pass; mỗi skipped integration test được ghi rõ, không tuyên bố đã kiểm chứng DB khi chưa chạy.

| Nhóm | Điểm | Bằng chứng |
|---|---:|---|
| Map fidelity và khả năng ngắm tranh | 25 | nguyên ảnh, landmarks/đảo nhìn thấy, marker nhỏ |
| Bố cục responsive, khoảng cách, tỷ lệ panel | 25 | đủ portrait/desktop/landscape, không khoảng trống cũ |
| Supporting art đồng nhất với concept | 20 | mascot identity, 6 vignette + footer/icon, alpha, độ nét |
| Typography, màu, border/shadow, CTA | 15 | Be Vietnam Pro, hierarchy rõ, một shell thống nhất |
| Trạng thái và tương tác/accessibility | 15 | welcome/selected/expanded/error, touch/keyboard |

Chấm mỗi nhóm bằng các finding cụ thể: thiếu lớn trừ ít nhất 5; sai đáng thấy trừ 2; lệch nhỏ trừ 1. Không lấy điểm trung bình viewport để che một mobile lỗi: mỗi viewport chuẩn phải ≥95 và không hard-gate fail. Desktop/tablet/landscape có thể ẩn trang trí footer để fit; đó là adaptation cho phép, không bị trừ điểm. Không ẩn chức năng.

Viewport bắt buộc: 390×844, 430×932, 768×1024, 1440×900, 1180×700, 844×390. Chụp welcome và selected miền Trung ở từng viewport. Riêng 390×844 và 1440×900 chụp thêm Địa phương em, selected Bắc, landmark Huế, expanded lessons, lesson detail, empty topic, unavailable, stale. Fixture dùng data tổng nhất quán; không sửa API production.

Lưu screenshot dưới `design/progress-map/qa/<width>x<height>-<state>.png`; rubric tại `visual-review.md` ghi browser, viewport CSS pixels, zoom=100%, fixture, timestamp, group scores, remaining findings. Với màn hình phải cuộn: lưu cả viewport đầu và full-page, chứng minh nút đóng luôn truy cập được. Không dùng ảnh full-page để che việc CTA nằm ngoài vùng cuộn.

Nếu browser tool không resize/chụp được: dùng browser runner có sẵn được phép hoặc ghi missing evidence; test CSS/jsdom không thay screenshot. Không chấm 95 dựa riêng build pass.

## 8. Prompt khởi động cho Luna Max

```text
Triển khai Bản đồ tiến bộ trong repo Học Vui theo:
docs/superpowers/plans/2026-09-18-progress-map-luna-implementation.md
và docs/design/progress-map-supporting-art-brief.md.
Đọc đầy đủ hai tài liệu, mở demo và hai concept local trước khi sửa.
Giữ bản đồ nguyên file/tỷ lệ theo demo, dùng concept làm chuẩn thẩm mỹ.
Tạo đủ supporting art bằng ImageGen; không dùng emoji thay thành phẩm.
Thực hiện P0–P5, ghi ledger và tiếp tục từ checkpoint nếu gián đoạn.
Nếu là root task, có thể dùng art subagent với write-set trong tài liệu;
nếu là executor packet, tuân guard không tạo descendants.
Giữ business logic/dữ liệu/quyền lesson, kiểm tra toàn bộ trạng thái.
Đánh giá bằng screenshot app thật tại các viewport quy định,
đạt từng viewport ít nhất 95/100 và toàn bộ hard gates.
Không tuyên bố đạt 95% nếu thiếu evidence. Tự sửa lỗi trong scope
đến READY_FOR_REVIEW; báo đúng blocker nếu công cụ cần thiết thiếu.
Không triển khai cloud chỉ vì tài liệu có nhắc deployment.
```

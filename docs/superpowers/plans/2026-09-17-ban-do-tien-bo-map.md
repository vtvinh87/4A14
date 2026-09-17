# Bản đồ tiến bộ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task. Các bước phải được đánh dấu bằng checkbox để theo dõi.

**Goal:** Thay thế màn hình Bảng tiến bộ dạng báo cáo bằng Bản đồ tiến bộ cho trẻ: bản đồ Việt Nam là vùng trải nghiệm chính, sáu chặng học tập là các điểm dừng, bài học chi tiết chỉ xuất hiện khi trẻ chủ động mở rộng, và mọi trạng thái vẫn lấy từ ProgressBoardData hiện có.

**Architecture:** Giữ nguyên API, server calculator, shared DTO, feature flag và luật tính tiến bộ. Thêm một lớp trình bày thuần client gồm metadata bản đồ, phép chiếu tọa độ, selector tổng hợp topic, lớp bản đồ SVG nội bộ, node tương tác và drawer thấp. Tách tuyệt đối lớp địa lý đã kiểm chứng khỏi lớp da trò chơi A1 Giấy phiêu lưu. Bản đồ không được tự suy ra tiến bộ từ event hoặc dữ liệu riêng tư.

**Tech Stack:** React 18, TypeScript, Vite, CSS hiện có của Học Vui, Vitest/Testing Library, Playwright, SVG nội bộ, script Node.js kiểm tra asset. Không thêm thư viện bản đồ runtime hoặc remote image dependency.

**Source of truth:** Đặc tả UX/UI đã duyệt tại
docs/superpowers/specs/2026-09-17-ban-do-tien-bo-map-design.md.
Đặc tả nghiệp vụ nền tại
docs/superpowers/specs/2026-09-17-bang-tien-bo-design.md.

## Global Constraints

- Phạm vi chỉ là cách trình bày Bảng tiến bộ thành Bản đồ tiến bộ. Không mở rộng sang Bảng xếp hạng, Thách đố, realtime, migration, Parent Dashboard hoặc chat.
- Không thay đổi ProgressBoardData, ProgressBoardLesson, ProgressBoardTopic, ProgressState, nextAction, endpoint, repository, calculator, contentVersion, ruleVersion hoặc feature flag.
- Không thay đổi dữ liệu học tập, không đổi thứ tự 29 bài, không tạo progress mới khi trẻ chỉ xem bản đồ.
- Không hiển thị điểm, thứ hạng, phần trăm, tên bạn khác, raw event, objective dài hoặc danh sách 29 bài trong màn hình mặc định.
- Giữ xưng hô và copy khích lệ tớ/cậu; không dùng yếu, kém, thấp, chưa đạt hoặc câu chữ tạo so sánh.
- Hoàng Sa và Trường Sa phải có mặt, có nhãn riêng và giữ vị trí tương đối đúng. AI chỉ được dùng cho texture/trang trí không mang nghĩa địa lý.
- Mọi asset runtime phải nội bộ trong public/; không dùng URL ảnh từ mockup, CDN hoặc fetch bản đồ từ xa.
- Không dùng reset, checkout, stash hoặc thao tác phá thay đổi để làm sạch worktree. Worktree đang có thay đổi của người dùng và nhiều file của feature Bảng tiến bộ; chỉ sửa write-set đã nêu.
- Không tự commit, push, tạo PR, merge, deploy Firebase/Netlify hoặc đổi secret. Các lifecycle action cần user approval riêng sau khi kiểm thử.
- Mỗi task phải có test/verification cụ thể. Không kết luận hoàn thành chỉ dựa trên việc build thành công.

---

## Task 0 — Baseline, dirty-tree guard và chuẩn bị checkpoint

**Files:** không ghi file sản phẩm; chỉ đọc trạng thái và ghi bằng chứng vào báo cáo thực thi nếu cần.

- [ ] Đọc lại đặc tả UX/UI và kiểm tra rằng hướng đã triển khai là A, A1 Giấy phiêu lưu, tương tác thẻ trượt thấp.
- [ ] Chạy git status --short và git diff --stat. Ghi nhận các thay đổi có trước khi bắt đầu; không sửa các file ngoài phạm vi.
- [ ] Kiểm tra các điểm vào hiện có: src/App.tsx, src/progress/useProgressBoard.ts, src/components/JourneyFeatureRail.tsx và ProgressBoardDialog.
- [ ] Chạy baseline focused tests cho ProgressBoardDialog, ProgressBoardComponents, JourneyView và styles. Nếu baseline lỗi do thay đổi cũ, ghi tách lỗi baseline, không sửa lẫn vào task bản đồ.
- [ ] Tạo một checkpoint review sau khi asset địa lý và metadata hoàn thành; trước checkpoint không nối UI vào asset chưa được kiểm chứng.

**Acceptance:** Có baseline command/output; write-set được thống nhất; không có hành động destructive; các lỗi tồn tại trước được phân loại rõ.

---

## Task 1 — Asset bản đồ địa lý và source ledger

**Creates:**
- public/art/progress/vietnam-progress-map.svg
- public/art/progress/README.md
- docs/design/progress-map-source-ledger.md
- scripts/validate-progress-map-asset.mjs
- src/components/progress/progressMapAsset.test.ts

**Modifies:**
- package.json: thêm script validate:progress-map

**Implementation:**
- [ ] Chọn dữ liệu địa lý có nguồn và giấy phép rõ ràng. Ưu tiên đối chiếu cổng bản đồ hành chính VNSDI của Cục Đo đạc, Bản đồ và Thông tin địa lý; bộ GeoJSON cộng đồng chỉ là ứng viên kỹ thuật, không phải nguồn duy nhất. Nếu dùng nguồn dẫn xuất/Wikimedia cho prototype, ghi giấy phép và attribution đầy đủ.
- [ ] Lưu trong source ledger: URL, ngày truy cập, tên file gốc, giấy phép, checksum file gốc, hệ tọa độ/CRS, công cụ chuyển đổi, mức simplification, checksum SVG đầu ra, người kiểm tra và kết quả kiểm tra bằng mắt.
- [ ] Chuyển lớp địa lý thành SVG nội bộ có viewBox cố định, không nhúng script, không nhúng remote href, không chứa ảnh raster của bản đồ và không chứa đường yêu sách/chi tiết chính trị không cần cho mục tiêu học tập.
- [ ] SVG phải có path/group được đánh dấu bằng data-geo-feature cho mainland, hoang-sa và truong-sa. Hai quần đảo phải là hai feature riêng, không gộp thành một marker.
- [ ] Giữ đủ đường bờ để nhận ra dải Bắc–Trung–Nam và các đảo cần thiết ở mức hiển thị game. Không làm route trò chơi trộn vào path địa lý.
- [ ] Giới hạn kích thước SVG sau simplification ở mức tối đa 150 KB. Không giảm điểm đến mức làm mất nhận diện hoặc biến dạng vị trí hai quần đảo.
- [ ] README ghi rõ asset là lớp địa lý khóa cứng, không được chỉnh bằng prompt AI; mô tả cách tái tạo từ source đã ghi trong ledger.
- [ ] Script validator phải exit 1 nếu thiếu file, thiếu viewBox, thiếu mainland/hoang-sa/truong-sa, có script, có http/https href, không có path/group địa lý, hoặc kích thước vượt ngưỡng.
- [ ] Asset test đọc file cục bộ và assert các điều kiện trên, không phụ thuộc browser hoặc network.

**Validation commands:**

    npm run validate:progress-map
    npx vitest run src/components/progress/progressMapAsset.test.ts

**Acceptance:** Validator và asset test pass; ledger có checksum/source/license; SVG hiển thị được ở kích thước desktop và mobile; Hoàng Sa và Trường Sa có nhãn/feature riêng; không có remote dependency.

**Checkpoint review A:** Mở SVG trên nền sáng và nền biển, kiểm tra mắt bốn viewport. Nếu nguồn hoặc hình học chưa đủ chắc chắn thì dừng tại đây, không làm tiếp UI.

---

## Task 2 — Metadata, phép chiếu và selector tổng hợp topic

**Creates:**
- src/components/progress/progressMapMeta.ts
- src/components/progress/progressMapProjection.ts
- src/components/progress/progressMapProjection.test.ts
- src/components/progress/progressMapSelectors.ts
- src/components/progress/progressMapSelectors.test.ts

**Implementation contracts:**

    export type ProgressMapPoint = {
      latitude: number;
      longitude: number;
    };

    export type ProgressMapViewport = {
      minLatitude: number;
      maxLatitude: number;
      minLongitude: number;
      maxLongitude: number;
    };

    export type ProgressMapTopicMeta = {
      topic: string;
      anchor: ProgressMapPoint | null;
      shortLabel: string;
      markerTone: 'teal' | 'blue' | 'gold';
    };

    export type ProgressMapTopicSnapshot = {
      topic: string;
      state: ProgressState;
      lessonCount: number;
      exploredLessonCount: number;
      completedLessonCount: number;
      independentLessonCount: number;
      nextLessonId: string | null;
    };

- [ ] Dùng đúng sáu topic trong catalog.ts, không hard-code một danh sách khác ở component.
- [ ] Dùng viewport thống nhất: minLatitude 6.7, maxLatitude 23.5, minLongitude 102.1, maxLongitude 118.0. Viewport phải chứa toàn bộ hình học Trường Sa trong source đã kiểm tra; phép chiếu equirectangular trả về phần trăm left/top và clamp ra 0–100.
- [ ] Ghi trong ledger lý do không dùng viewport 115/8.2 ban đầu: kiểm tra source cho thấy Trường Sa có điểm tới khoảng 116.95°Đ và 6.95°B; cắt viewport sẽ làm mất một phần quần đảo.
- [ ] Anchor hiển thị là anchor trình bày cho điểm dừng học tập, không phải ranh giới vùng. Dùng năm anchor đã duyệt trong spec: 21.9/104.5, 20.7/106.1, 16.4/108.2, 13.0/108.0, 10.5/106.3. Kiểm tra lại trực tiếp trên SVG; nếu phải chỉnh, ghi lý do vào ledger.
- [ ] Địa phương em có anchor null. Selector coi đây là cổng khởi hành riêng, tuyệt đối không tự đoán tỉnh/thành từ tài khoản, IP hoặc tên trẻ.
- [ ] projectProgressMapPoint(point, viewport) trả { left, top } dạng number và clamp biên.
- [ ] getProgressMapTopicMeta(topic) trả metadata hoặc null khi topic ngoài catalog.
- [ ] summarizeProgressMapTopic(topic, nextLessonId) chỉ tổng hợp từ lessons và trạng thái DTO. Quy ước completedLessonCount phải nhất quán với contract hiện có: lesson completed hoặc state independent được đếm theo dữ liệu server; không tạo trạng thái mới.
- [ ] Selector xác định topic node state theo ưu tiên hiện có của các lesson và nextAction; không tự tính lại luật nghiệp vụ.
- [ ] Không để metadata chứa studentId, tên trẻ, điểm, ranking hoặc event.

**Tests:**

- [ ] Map góc 6.7/102.1 thành 0/100 và 23.5/118.0 thành 100/0.
- [ ] Điểm ngoài viewport bị clamp.
- [ ] Sáu topic trả metadata; Địa phương em trả anchor null.
- [ ] Snapshot topic rỗng, topic toàn not_started, topic có practicing/independent và nextLessonId đều có kết quả xác định.
- [ ] Tất cả topic trong selector khớp TOPICS và không làm mất lesson.

**Acceptance:** Module thuần dữ liệu, không import React/API; tests pass; thay đổi anchor hoặc quy ước đếm đều có test bảo vệ.

---

## Task 3 — Scene bản đồ và node semantic

**Creates:**
- src/components/progress/VietnamMapBase.tsx
- src/components/progress/ProgressMapNode.tsx
- src/components/progress/ProgressMapScene.tsx
- src/components/progress/ProgressMapScene.test.tsx

**Props bắt buộc:**

    export type VietnamMapBaseProps = {
      reducedMotion: boolean;
    };

    export type ProgressMapNodeProps = {
      meta: ProgressMapTopicMeta;
      snapshot: ProgressMapTopicSnapshot;
      selected: boolean;
      reducedMotion: boolean;
      onSelect: () => void;
    };

    export type ProgressMapSceneProps = {
      topics: readonly ProgressBoardTopic[];
      nextLessonId: string | null;
      selectedLessonId: string | null;
      reducedMotion: boolean;
      classUnlock?: ProgressClassUnlockSummary | null;
      onSelectLesson: (lessonId: string) => void;
      onOpenLesson: (lessonId: string) => void;
    };

- [ ] VietnamMapBase chỉ tham chiếu /art/progress/vietnam-progress-map.svg; route và node được render ở lớp khác.
- [ ] Render nhãn Hoàng Sa và Trường Sa bằng DOM/accessible text riêng để luôn có trong accessibility tree; nhãn không nằm trong ảnh AI.
- [ ] Render route theo thứ tự catalog, dùng nét đứt màu vàng cam chỉ mang nghĩa hành trình. Route phải nằm dưới node và không che hai nhãn đảo.
- [ ] Render sáu node; node Địa phương em dùng biểu tượng cổng/la bàn không định vị địa lý.
- [ ] Mỗi node là button hoặc control semantic có tối thiểu 44x44 CSS px, aria-label đầy đủ, aria-pressed đúng trạng thái chọn, data-progress-state đúng trạng thái dữ liệu.
- [ ] Trạng thái not_started/explored/practicing/independent phải khác nhau bằng hình dạng/icon và text/aria, không chỉ khác màu.
- [ ] Node đang chọn có focus ring/halo; focus ring không bị overflow của scene cắt.
- [ ] Map scene có data-progress-map và các hook test ổn định, không phụ thuộc class CSS ngẫu nhiên.
- [ ] reducedMotion tắt pulse/parallax/route animation; không tắt feedback focus hoặc trạng thái.
- [ ] Các trang trí compass, dấu mộc và Cáo Nhỏ không chặn pointer events lên node.

**Tests:**

- [ ] Scene có data-progress-map, asset src cục bộ, sáu node và text Hoàng Sa/Trường Sa.
- [ ] Mỗi node có aria-label, aria-pressed và data-progress-state.
- [ ] Callback chọn topic nhận đúng topic; callback open lesson chưa bị gọi khi chỉ chọn node.
- [ ] reducedMotion không tạo class/animation hook chuyển động.
- [ ] Kiểm tra map shell khi topics rỗng hoặc data status empty.

**Acceptance:** Scene mở được bằng dữ liệu fixture hiện có, không truy cập API, map chiếm vùng lớn nhất trong layout và labels/controls vẫn đọc được bằng screen reader.


---

## Task 4 — Drawer thấp, dải bài học và lớp chi tiết

**Creates:**
- src/components/progress/ProgressMapDrawer.tsx
- src/components/progress/ProgressMapDrawer.test.tsx
- src/components/progress/ProgressLessonStrip.tsx

**Modifies:**
- src/components/progress/ProgressLessonCard.tsx
- src/components/progress/ProgressLessonDetail.tsx
- src/components/progress/ClassUnlockCard.tsx

**Props bắt buộc:**

    export type ProgressMapDrawerProps = {
      topic: ProgressBoardTopic;
      topicSnapshot: ProgressMapTopicSnapshot;
      selectedLesson: ProgressBoardLesson | null;
      expanded: boolean;
      detailsOpen: boolean;
      reducedMotion: boolean;
      classUnlock?: ProgressClassUnlockSummary | null;
      onToggleExpanded: () => void;
      onToggleDetails: () => void;
      onSelectLesson: (lessonId: string) => void;
      onOpenLesson: (lessonId: string) => void;
    };

- [ ] Drawer mặc định là strip thấp ở đáy scene: icon, tên topic, một dòng trạng thái ngắn, một CTA chính và hành động phụ Xem các chặng.
- [ ] CTA chính gọi onOpenLesson với nextLessonId/lesson đang được chọn theo DTO; không tự chọn bài bằng index hoặc số lượng hiển thị.
- [ ] Khi collapsed, không render objective, paragraph dài, mission list hoặc full lesson detail.
- [ ] Khi expanded, ProgressLessonStrip hiển thị các lesson của topic bằng chip/dấu nhỏ; tên đầy đủ và trạng thái vẫn có trong accessibility tree.
- [ ] Chọn một lesson trong strip chỉ cập nhật selectedLessonId; mở chi tiết là hành động rõ ràng riêng.
- [ ] ProgressLessonDetail vẫn giữ objective và action contract hiện có nhưng đặt sau detailsOpen hoặc lớp phụ; có nút quay lại map.
- [ ] ClassUnlockCard chuyển thành ribbon nhỏ, chỉ nhận aggregate hợp lệ; không render tên học sinh, điểm, thứ hạng hoặc danh sách so sánh. Khi không có dữ liệu thì không render.
- [ ] Copy action theo nextAction: Khám phá, Luyện tập, Xem lại hoặc Ăn mừng; fallback tích cực khi callback không có.
- [ ] Drawer có keyboard navigation, focus-visible và không làm mất focus khi đóng/mở expansion.

**Tests:**

- [ ] Trạng thái collapsed có drawer và CTA nhưng không có text objective/dense report.
- [ ] Expanded render đúng số lesson của topic và callback chọn đúng lessonId.
- [ ] Details mở có nút quay lại và detail; đóng details không làm scene biến mất.
- [ ] CTA gọi đúng onOpenLesson; thao tác xem bản đồ không gọi callback ghi progress.
- [ ] Class ribbon không xuất hiện khi null và không chứa tên/điểm khi có fixture.

**Acceptance:** Trẻ có thể hiểu và hành động từ drawer trong một lần nhìn; bài chi tiết chỉ xuất hiện sau tương tác chủ động; không còn dense list trong trạng thái mặc định.

---

## Task 5 — Tích hợp dialog và Journey entry point

**Modifies:**
- src/components/progress/ProgressBoardDialog.tsx
- src/components/progress/ProgressTopicMap.tsx
- src/components/JourneyFeatureRail.tsx
- src/views/JourneyView.test.tsx
- src/components/progress/ProgressBoardComponents.test.tsx
- src/components/progress/ProgressBoardDialog.test.tsx
- src/App.test.ts
- tests/e2e/progress-board-flow.spec.ts khi assertion cũ cần cập nhật

- [ ] Thay header lớn bằng HUD compact: icon/la bàn hoặc Cáo Nhỏ, tiêu đề Chuyến đi của tớ, một badge exploredLessonCount/publishedLessonCount và nút đóng 44x44.
- [ ] Giữ id aria-labelledby và dialog role để không phá contract; aria-describedby trỏ tới câu hướng dẫn ngắn hoặc status phù hợp.
- [ ] Xóa intro dài khỏi default render. Loading, logged-out, idle, unavailable, empty và stale giữ nguyên semantics, retry và thông báo ngắn.
- [ ] Khi board visible, render ProgressMapScene và ProgressMapDrawer; không render ProgressSummaryCard và dense ProgressTopicMap trong cây mặc định.
- [ ] Đưa selectedLessonId từ dialog vào scene/drawer; giữ nextLessonId từ server làm nguồn CTA.
- [ ] Giữ focus trap, Escape, backdrop close, body scroll lock và restore focus hiện có. Khi drawer/detail thay đổi, không để focus rơi ra ngoài dialog.
- [ ] Xử lý data refresh: nếu selected lesson không còn tồn tại, fallback nextLessonId rồi lesson đầu tiên; không giữ id mồ côi.
- [ ] ProgressTopicMap có thể trở thành facade chỉ dùng ở lớp compatibility/test hoặc bỏ production import; không để nó âm thầm render lại grid 29 bài.
- [ ] JourneyFeatureRail dùng icon/art tiến bộ nội bộ phù hợp la bàn/hành trình, không dùng leaderboard.png hoặc semantic “xếp hạng”.
- [ ] Không thay đổi route/navigation, Bottom Dock hoặc callback mở bài học hiện có.

**Tests:**

- [ ] Dialog success có title Chuyến đi của tớ, map scene và drawer; không có ProgressSummaryCard/dense topic list ở default DOM.
- [ ] Loading/error/stale/empty vẫn giữ data-progress-board-state, retry và status.
- [ ] Escape, backdrop, close button và focus restore đều pass.
- [ ] App mở/đóng progress dialog qua entry point không thay đổi.
- [ ] Journey test xác nhận asset/icon mới là local và không còn leaderboard source.
- [ ] E2E xác nhận map → chọn chặng → mở drawer → mở bài học, đồng thời kiểm tra keyboard path.

**Acceptance:** Integration chỉ đổi presentation layer; toàn bộ API/server behavior và dialog accessibility contract trước đó vẫn hoạt động.

**Checkpoint review B:** Mở localhost với fixture success và xác nhận mắt rằng map là vùng chính, drawer đủ ngắn, không còn cảm giác báo cáo. Chỉ tiếp tục sang skin/CSS sau khi checkpoint này đạt.

---

## Task 6 — Skin A1 Giấy phiêu lưu và asset trang trí

**Creates:**
- public/art/progress/adventure-paper-texture.png
- src/components/progress/progressMapSkin.test.ts

**Modifies:**
- src/styles.css trong các block progress-board/progress-map

- [ ] Đọc skill imagegen ngay trước khi dùng công cụ tạo ảnh. Chỉ tạo texture giấy ngà cho nền, có wash teal rất nhẹ và họa tiết góc như la bàn/lá; prompt phải cấm coastline, silhouette Việt Nam, đảo, nhãn địa lý, chữ, cờ, UI và nhân vật.
- [ ] Nếu output có hình học Việt Nam, chữ sai, đảo giả hoặc chi tiết địa lý thì loại bỏ; dùng CSS gradient/noise fallback và không đưa asset đó vào public.
- [ ] Texture tối đa 200 KB, không remote, không làm giảm contrast của map/labels/nodes.
- [ ] Dùng palette/typography hiện có; border và shadow gợi giấy phiêu lưu nhưng không biến thành dashboard.
- [ ] Không dùng texture làm lớp che mờ khi map cần đọc; route decorative nằm trên map nhưng dưới node.
- [ ] Asset test kiểm tra file tồn tại, MIME/extension hợp lệ, không có remote reference trong CSS và skin class không đụng global surface styles.

**Acceptance:** Bản đồ vẫn là điểm nhìn đầu tiên; texture chỉ hỗ trợ không khí; trẻ nhìn thấy mình đang ở đâu, đã qua bao nhiêu chặng và đi tiếp bằng gì trong khoảng ba giây.

---

## Task 7 — CSS responsive, accessibility và reduced motion

**Modifies:**
- src/styles.css: chỉ vùng style progress board từ block hiện có khoảng dòng 5976 đến 6590
- src/styles.test.ts

- [ ] Viết layout map-first: scene chiếm phần lớn dialog; header compact; drawer bottom strip trên desktop/tablet và bottom sheet nhỏ trên portrait.
- [ ] Hỗ trợ viewport QA 390x844, 820x1180, 1180x700 và 1440x900.
- [ ] Với landscape thấp, chỉ chuyển drawer sang card cạnh phải nếu bottom strip che map một cách đo được; map vẫn lớn nhất và nhãn đảo không bị che.
- [ ] Dùng max-width/max-height, safe-area-inset, overflow có chủ đích và object-fit contain; không để dialog tràn viewport hoặc body scroll ngoài contract.
- [ ] Node/close/CTA tối thiểu 44x44; focus-visible rõ trên nền giấy; không dùng màu đơn độc cho state.
- [ ] Text phụ cắt ở một dòng trong collapsed drawer; title dài dùng line clamp có aria-label đầy đủ, không làm layout nhảy.
- [ ] prefers-reduced-motion và prop reducedMotion cùng tắt transition/pulse/parallax không cần thiết.
- [ ] Không thay đổi CSS toàn app, Journey, dock hoặc modal khác. Dùng prefix progress-map/progress-board.
- [ ] Test style hook bảo vệ map min-height, local asset reference, focus-visible, safe-area và reduced-motion rule.

**Acceptance:** Không có horizontal overflow ngoài ý muốn; map/labels/nodes đọc được ở bốn viewport; keyboard focus luôn nhìn thấy; reduced motion pass.

---

## Task 8 — Verification, browser QA và release gate

- [ ] Chạy focused unit/component tests:

    npx vitest run src/components/progress/progressMapAsset.test.ts src/components/progress/progressMapProjection.test.ts src/components/progress/progressMapSelectors.test.ts src/components/progress/ProgressMapScene.test.tsx src/components/progress/ProgressMapDrawer.test.tsx src/components/progress/ProgressBoardComponents.test.tsx src/components/progress/ProgressBoardDialog.test.tsx src/views/JourneyView.test.tsx src/App.test.ts src/styles.test.ts

- [ ] Chạy server/shared/e2e regression:

    npx vitest run tests/e2e/progress-board-flow.spec.ts server/analytics/progressBoard.test.ts server/analytics/progressBoardContent.test.ts shared/progress-board-contracts.test.ts

- [ ] Chạy full gates:

    npm test -- --reporter=dot
    npm run typecheck
    npm run typecheck:server
    npm run check:edge-runtime
    npm run build
    npm run validate:firebase
    npm run validate:progress-map
    git diff --check

- [ ] Browser QA local tại localhost:8888 bằng dữ liệu fixture hiện có; không nhập dữ liệu trẻ thật.
- [ ] Desktop/tablet/mobile/landscape QA: map chiếm vùng chính, sáu node hiển thị, nhãn Hoàng Sa/Trường Sa không bị mất, drawer collapsed/expanded, CTA mở đúng bài.
- [ ] Keyboard QA: focus vào close, node, drawer CTA, lesson strip, detail back; Tab không thoát dialog; Escape restore focus về Journey entry point.
- [ ] State QA: loading, empty, stale, unavailable, logged-out; retry không làm mất shell.
- [ ] Reduced-motion QA bằng OS setting và prop fixture.
- [ ] Kiểm tra network tab không có request ảnh/map remote; tìm trong source không có import leaderboard cho progress entry.
- [ ] Đối chiếu source ledger với SVG checksum và kiểm tra bằng mắt lần cuối ở desktop/mobile. Lưu screenshot QA trong thư mục báo cáo nếu cần, không đưa screenshot tạm vào production.
- [ ] Ghi rõ pass/fail từng gate, lỗi baseline và lỗi do thay đổi mới. Chỉ khi mọi gate pass mới đề xuất lifecycle review.

**Release acceptance:** Bản đồ Việt Nam chính xác theo source ledger ở mức được duyệt, có Hoàng Sa và Trường Sa; UI trẻ em vui và ít chữ; dữ liệu/progress contract không đổi; accessibility/responsive/reduced-motion pass; full test/build gates pass; không có remote asset.

## Execution handoff

Sau khi người dùng phê duyệt implementation plan này, thực thi theo skill superpowers:executing-plans với checkpoint sau Task 1 và Task 5. Do write-set asset + React + CSS liên kết chặt, nên ưu tiên triển khai trong task hiện tại thay vì chia agent song song; chỉ tách review độc lập nếu xuất hiện lane read-only đủ lớn. Ở đầu lượt triển khai, kiểm tra lại dirty worktree và cân nhắc using-git-worktrees theo quy định của workspace, nhưng không làm mất thay đổi hiện có.

Khi triển khai xong chỉ báo cáo bằng chứng test/build/visual QA. Commit, push, Firebase hoặc Netlify deploy là bước riêng và chỉ thực hiện khi người dùng cấp approval lifecycle tương ứng.

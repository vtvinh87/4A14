# Học Vui — Đặc tả UX/UI Bản đồ tiến bộ

- Ngày: 17/09/2026
- Trạng thái: Đã phê duyệt hướng mockup; chờ người dùng review đặc tả văn bản
- Đặc tả nghiệp vụ nền: docs/superpowers/specs/2026-09-17-bang-tien-bo-design.md
- Phạm vi: thay thế cách trình bày Bảng tiến bộ bằng bản đồ tương tác, không thay đổi luật tính tiến bộ
- Đối tượng chính: học sinh trong một lớp duy nhất
- Quyết định thiết kế: A — bản đồ dẫn đường; A1 — giấy phiêu lưu; tương tác 1 — thẻ trượt thấp

> Tài liệu này là bản đặc tả giao diện và pipeline tài sản cho Bản đồ tiến bộ. Nó không mở rộng phạm vi sang Bảng xếp hạng, Thách đố, realtime, database migration, cloud deployment hoặc dữ liệu của học sinh khác.

## 1. Quyết định thiết kế đã chốt

### 1.1. Trải nghiệm cốt lõi

Bản đồ là sân chơi chính. Khi mở tính năng, học sinh phải nhận ra trong khoảng ba giây:

1. Mình đang đi đến đâu.
2. Mình đã đi qua bao nhiêu chặng.
3. Bước tiếp theo là gì.

Màn hình mặc định không phải báo cáo. Không hiển thị đồng thời danh sách 29 bài, bảng thống kê dài, mô tả objective, phần trăm, điểm, thứ hạng hoặc tên học sinh khác.

### 1.2. Hình ảnh địa lý và lớp da trò chơi

Thiết kế dùng hai lớp tách biệt:

~~~
Lớp địa lý khóa cứng
  nguồn địa lý đã kiểm chứng
  -> vector/SVG hoặc GeoJSON nội bộ
  -> đường bờ, tỷ lệ, vị trí các đảo và nhãn địa lý

Lớp da trò chơi có thể thay đổi
  giấy phiêu lưu, màu sắc, texture, route, dấu mộc, la bàn, Cáo Nhỏ
  -> không được sửa hình học của lớp địa lý
~~~

“Bản đồ AI” trong sản phẩm được hiểu là AI hỗ trợ tạo lớp minh họa phù hợp với thế giới trò chơi, không phải để AI tự sinh đường bờ Việt Nam. Không dùng ảnh AI làm nguồn sự thật địa lý vì mô hình ảnh có thể làm sai hình dạng, tỷ lệ hoặc vị trí quần đảo.

### 1.3. Phong cách A1 — Giấy phiêu lưu

- Nền giấy màu ngà/kem, viền gỗ hoặc đường viền mực xanh đậm.
- Biển màu xanh ngọc nhạt; đất liền dùng màu giấy pha xanh lá nhạt.
- Tuyến khám phá là nét đứt vàng cam, chỉ mang nghĩa đường đi trong trò chơi, không phải đường giao thông hay ranh giới hành chính.
- Điểm đang đứng dùng xanh dương và vòng sáng nhẹ; điểm đã ghé dùng xanh ngọc; điểm sắp tới dùng vàng gỗ.
- La bàn, dấu mộc, mép giấy và nhân vật Cáo Nhỏ là lớp trang trí.
- Dùng palette và typography hiện có của Học Vui; không đưa phong cách dashboard doanh nghiệp vào màn hình học sinh.

## 2. Nguyên tắc bản đồ Việt Nam

### 2.1. Phạm vi hiển thị

Lớp địa lý phải thể hiện:

- Hình dạng Việt Nam ở mức đủ rõ để nhận ra dải đất Bắc — Trung — Nam.
- Các đảo ven bờ cần thiết cho nhận diện bản đồ.
- Quần đảo Hoàng Sa và Quần đảo Trường Sa với vị trí tương đối đúng so với đất liền.
- Nhãn riêng “Hoàng Sa” và “Trường Sa”, không gộp vào một điểm chung và không để lớp route che khuất.

Không vẽ thêm đường yêu sách, đường chín đoạn, đường biên giới biển hoặc chi tiết chính trị không cần thiết cho mục tiêu học tập của màn hình này. Bản đồ là lớp học địa lý trực quan, còn trạng thái tiến bộ là lớp trò chơi riêng.

### 2.2. Nguồn và quy trình kiểm chứng

Nguồn phải được ghi trong source ledger của tài sản, gồm URL, ngày truy cập, giấy phép, checksum và người kiểm tra. Quy trình trước khi đưa vào public/:

1. Ưu tiên dữ liệu/ấn phẩm từ nguồn nhà nước hoặc nguồn dữ liệu địa lý có giấy phép rõ ràng. Cổng tham chiếu ban đầu là [Bản đồ hành chính Việt Nam của Cục Đo đạc, Bản đồ và Thông tin địa lý](https://vnsdi.mae.gov.vn/bandohanhchinh/).
2. Có thể dùng bộ GeoJSON cộng đồng như một ứng viên kỹ thuật để dựng thử, nhưng không coi đó là nguồn duy nhất; phải đối chiếu lại với nguồn chính thức và kiểm tra phần Hoàng Sa/Trường Sa. Bộ dữ liệu tham khảo có nêu riêng các file bao gồm hai quần đảo, đồng thời tự ghi rõ cần xác minh với nguồn chính thức: [Free-GIS-Data](https://github.com/nguyenduy1133/Free-GIS-Data).
3. Nếu dùng tài sản Wikimedia cho bản thử nghiệm hoặc tài sản dẫn xuất, phải lưu metadata giấy phép và ghi công đúng theo trang file; file tham khảo đang công bố theo CC BY-SA 3.0: [Flag map of Vietnam.svg](https://commons.wikimedia.org/wiki/File:Flag_map_of_Vietnam.svg).
4. Chuẩn hóa dữ liệu về một hệ tọa độ, giản lược hình học có kiểm soát, chuyển thành SVG/asset nội bộ và giữ bản gốc cùng checksum trong ledger.
5. Rà soát bằng mắt ở kích thước desktop, tablet, mobile và màn hình ngang. Nếu đường bờ, vị trí nhãn hoặc hai quần đảo bị mờ/che/biến dạng thì không đạt.

Mockup brainstorming chỉ dùng hình minh họa để kiểm tra bố cục. Không lấy URL ảnh trong mockup làm dependency runtime của sản phẩm.

### 2.3. Định vị chặng học tập

Các điểm dừng là điểm kể chuyện của khóa học, không phải ranh giới địa lý mới:

- Địa phương em: cổng khởi hành. Không đặt vào một tỉnh/thành cụ thể khi hồ sơ lớp chưa cung cấp vị trí đã được phê duyệt; tránh bịa vị trí địa phương của trẻ.
- Trung du và miền núi phía Bắc: điểm đại diện vùng phía Bắc.
- Đồng bằng Bắc Bộ: điểm đại diện vùng đồng bằng phía Bắc.
- Duyên hải miền Trung: điểm đại diện dải ven biển miền Trung.
- Tây Nguyên: điểm đại diện khu vực cao nguyên.
- Nam Bộ: điểm đại diện vùng phía Nam.

Tọa độ trình bày của năm vùng địa lý phải nằm trong một module metadata riêng, được kiểm tra trên lớp bản đồ thật. Đây là anchor giao diện cho điểm dừng học tập, không được tô thành đường biên vùng hay dùng để đưa ra tuyên bố địa lý mới.

29 bài học không được đặt thành 29 pin rải khắp bản đồ vì sẽ làm sai cảm nhận địa lý và gây rối. Bản đồ hiển thị 6 chặng lớn; các bài của chặng đang chọn mở trong dải dấu nhỏ ở thẻ trượt.

## 3. Cấu trúc màn hình

### 3.1. Header tối giản

Header của ProgressBoardDialog được chuyển thành HUD nhỏ:

~~~
[ la bàn / Cáo Nhỏ ]  Chuyến đi của tớ       [ 5 / 29 chặng ]  [ đóng ]
~~~

- Tiêu đề người dùng: Chuyến đi của tớ.
- Một badge tiến độ duy nhất: {exploredLessonCount}/{publishedLessonCount} chặng hoặc nhãn tương đương đã thống nhất trong copy.
- Không dùng tiêu đề Bảng tiến bộ làm h1 lớn chiếm nhiều diện tích; có thể giữ trong aria-label/title của dialog để định danh tính năng.
- Nút đóng tối thiểu 44×44 CSS px, có nhãn Đóng Bản đồ tiến bộ.
- Không hiển thị đoạn giới thiệu dài. Nếu cần hướng dẫn, dùng một tooltip/bubble ngắn tối đa một câu.

### 3.2. Map scene

ProgressMapScene là vùng chính của dialog:

- Nền giấy phiêu lưu và texture không làm giảm tương phản của map.
- Lớp bản đồ địa lý nằm dưới route, node và trang trí.
- Route nối các topic stop theo thứ tự catalog, từ bắc xuống nam theo hành trình học tập; route là nét đứt trang trí, không phải dữ liệu địa lý.
- Node đang chọn luôn có focus ring/halo rõ; không chỉ dựa vào màu.
- Hai nhãn Hoàng Sa/Trường Sa luôn hiện trong viewport chính ở desktop và mobile. Khi không đủ chỗ, map được thu nhỏ hoặc cuộn có chủ đích; không ẩn nhãn.
- La bàn và trang trí không được chặn thao tác node, không nằm trên nhãn đảo và không làm vùng bấm nhỏ hơn 44×44.

### 3.3. Trạng thái node

| Trạng thái dữ liệu | Thể hiện chính | Văn bản trợ năng |
| --- | --- | --- |
| not_started | vòng tròn gỗ rỗng | Chưa khám phá |
| explored | dấu xanh ngọc | Đã khám phá |
| practicing | huy hiệu xanh dương | Đang luyện tập |
| independent | dấu mộc vàng có dấu kiểm | Tự làm được |

Các node không được dùng màu đơn độc để truyền tải trạng thái. Icon/hình dạng, aria-label và trạng thái focus phải cùng thể hiện ý nghĩa.

### 3.4. Thẻ trượt thấp — tương tác đã chọn

Khi học sinh chạm hoặc dùng bàn phím chọn một topic stop, thẻ xuất hiện ở đáy scene:

~~~
[icon]  Đồng bằng Bắc Bộ
        2 chặng đang chờ bé              [Đi tiếp]
~~~

Quy tắc:

- Chỉ hiển thị tên topic, một dòng trạng thái ngắn và một hành động chính.
- Không hiển thị paragraph, objective list, raw event, điểm hay bảng thống kê trong thẻ mặc định.
- Đi tiếp mở bài/chặng được server đề xuất qua nextLessonId hoặc lesson đang chọn; không tự đoán từ số lượng hiển thị.
- Thẻ có thể mở rộng bằng Xem các chặng để xem dải bài học nhỏ của topic. Đây là thao tác phụ, không làm thay đổi scene chính.
- Trên màn hình ngang thấp, thẻ vẫn là strip thấp; chỉ chuyển thành card cạnh phải khi kiểm thử chứng minh bottom strip che bản đồ quá nhiều. Dù chuyển vị trí, map vẫn phải chiếm vùng lớn nhất.
- Khi đóng thẻ, node vẫn giữ trạng thái đã chọn để focus không bị mất.

### 3.5. Dải bài học trong thẻ mở rộng

Dải mở rộng hiển thị bài học của một topic dưới dạng dấu/chip nhỏ:

- Dùng hero title ngắn từ catalog.
- Icon/dấu là tín hiệu chính; tiêu đề và trạng thái là text phụ.
- Cho phép chọn từng bài để xem ProgressLessonDetail ở lớp phụ hoặc mở bài học bằng callback hiện có.
- Tất cả bài vẫn phải có tên đầy đủ trong accessibility tree và có thể đi tới bằng bàn phím.
- Không render cả 29 bài trong scene mặc định.

### 3.6. Chi tiết bài học

ProgressLessonDetail hiện tại được giữ như lớp thứ hai, nhưng không render cạnh bản đồ ngay từ đầu. Khi mở:

- Có nút quay lại bản đồ rõ ràng.
- Có tên bài, trạng thái và một hành động chính.
- Objective chi tiết chỉ hiện sau khi học sinh chủ động mở rộng.
- Copy giữ giọng khích lệ tớ/cậu, không dùng yếu, kém, chưa đạt, thấp hoặc các câu so sánh.

### 3.7. Mục tiêu chung của lớp

Nếu classUnlock có dữ liệu hợp lệ, không dùng card lớn trong màn hình mặc định. Hiển thị một ribbon nhỏ trong thẻ mở rộng, ví dụ Cả lớp đang cùng mở một cánh cửa.

- Không có tên học sinh.
- Không có điểm, thứ hạng, danh sách đầu/cuối.
- Không làm thay đổi tiến bộ cá nhân.
- Nếu aggregate chưa sẵn sàng, ẩn ribbon; không tạo dữ liệu ở client.

## 4. Luồng tương tác

### 4.1. Mở bản đồ

1. Học sinh bấm entry point Bảng tiến bộ trong JourneyFeatureRail.
2. Dialog mở với map scene, header compact và node đề xuất được chọn.
3. Focus vẫn tuân theo contract dialog hiện có: nút đóng được focus ban đầu, Escape đóng, focus quay về entry point.
4. Nếu dữ liệu loading, hiển thị skeleton map và một câu ngắn Đang mở bản đồ...
5. Nếu logged out/unavailable/empty/stale, dùng map shell tương ứng với thông báo ngắn và hành động retry khi có thể.

### 4.2. Chọn chặng

- Click/tap node hoặc dùng Enter/Space chọn topic.
- Node được chọn có aria-pressed=true hoặc semantics tương đương.
- Drawer cập nhật mà không reload toàn bộ dialog.
- Nếu chọn node chưa mở, drawer giải thích bằng một câu tích cực và dùng hành động Khám phá.
- Nếu chọn node đang luyện tập, hành động là Luyện tập.
- Nếu đã tự làm được, hành động là Xem lại hoặc Ăn mừng chặng này theo nextAction hiện có.

### 4.3. Đi tiếp

- Nút Đi tiếp gọi onOpenLesson(lessonId) hiện có.
- Không ghi progress mới từ thao tác xem bản đồ.
- Không gửi analytics mới trong MVP chỉ để đo click map.
- Nếu callback không có, giữ drawer mở và không báo lỗi kỹ thuật cho trẻ.

### 4.4. Đóng và quay lại

- Nút đóng, Escape và hành vi backdrop hiện có tiếp tục được hỗ trợ.
- Không làm mất state của Journey.
- Không lưu thông tin trẻ mới ngoài cache session hiện tại đã được đặc tả ở bản nghiệp vụ nền.

## 5. Dữ liệu và ranh giới code

### 5.1. Không thay đổi backend

Giữ nguyên:

- ProgressBoardData, ProgressBoardLesson, ProgressBoardTopic, ProgressState và nextAction trong shared/progress-board-contracts.ts.
- Endpoint, repository, calculator, generation/contentVersion/ruleVersion và feature flag của Bảng tiến bộ.
- Ranh giới dữ liệu cá nhân: client chỉ nhận DTO của học sinh hiện tại.
- Parent Dashboard, Thách đố, Bạn bè, chat, realtime, Bottom Dock và database schema.

### 5.2. Model trình bày mới ở client

Tạo module thuần dữ liệu giao diện, không gọi API:

~~~ts
type ProgressMapTopicMeta = {
  topic: string;
  anchor: { latitude: number; longitude: number } | null;
  shortLabel: string;
  markerTone: 'teal' | 'blue' | 'gold';
};
~~~

Yêu cầu:

- topic phải khớp đúng một giá trị trong catalog.
- Địa phương em dùng anchor: null cho tới khi có nguồn vị trí lớp được phê duyệt; UI biểu diễn nó như cổng khởi hành, không phải tỉnh/thành cụ thể.
- Anchor không tạo ra boundary polygon và không được hiển thị như dữ liệu hành chính.
- Map metadata không chứa studentId, tên trẻ, điểm hoặc dữ liệu riêng tư.

### 5.3. Cây component mục tiêu

~~~text
ProgressBoardDialog
├── ProgressMapHeader
├── ProgressMapScene
│   ├── VietnamMapBase
│   ├── ProgressRoute
│   ├── ProgressTopicNode[]
│   ├── ArchipelagoLabels
│   └── MapDecorations
├── ProgressMapDrawer
│   └── ProgressLessonStrip (khi mở rộng)
├── ProgressLessonDetail (lớp phụ, không mặc định)
└── ClassUnlockRibbon (tùy dữ liệu)
~~~

Có thể giữ tên file/component cũ nếu giảm diff và không làm sai trách nhiệm. Điều bắt buộc là JSX của scene không tự tính trạng thái từ event và không truy cập server.

## 6. Asset và AI art pipeline

### 6.1. Asset bắt buộc

Dự kiến thêm:

- public/art/progress/vietnam-progress-map.svg: vector nội bộ từ nguồn đã kiểm chứng, có mainland/islands geometry.
- public/art/progress/vietnam-progress-map-source.json hoặc ledger tương đương: source URL, license, checksum, transform và ngày xác minh.
- public/art/progress/README.md: attribution và hướng dẫn không chỉnh sửa geometry bằng phần mềm tạo ảnh.

Có thể tái sử dụng:

- Cáo Nhỏ hiện có.
- Dấu/stamp bài học hiện có.
- La bàn/dock artwork nếu không làm layout nặng.

### 6.2. Asset AI được phép

Nếu CSS/SVG chưa đủ sinh động, có thể tạo riêng:

- texture giấy phiêu lưu tileable;
- góc trang giấy, mây, cây, hoa văn biển;
- Cáo Nhỏ cầm la bàn hoặc đứng cạnh bảng chỉ đường;
- huy hiệu/dấu mộc không chứa hình bản đồ.

Prompt và output phải yêu cầu transparent/background separation khi cần. Asset AI không được chứa đường bờ Việt Nam, Hoàng Sa, Trường Sa, ranh giới hoặc chữ địa lý làm nguồn chính. Nếu một asset trang trí vô tình chứa hình dạng địa lý, loại bỏ khỏi release.

### 6.3. Fallback và offline

- Sản phẩm không phụ thuộc CDN/remote image cho map.
- Nếu texture hoặc mascot lỗi, map base vẫn đọc được.
- Nếu map base không tải được, hiển thị fallback local rõ ràng và ghi log kỹ thuật; không hiện một silhouette tự vẽ khác.
- Bản đồ phải hoạt động trong flow local-first hiện có.

## 7. Responsive, accessibility và motion

### 7.1. Breakpoint

- Desktop/tablet ngang: map chiếm phần lớn dialog; drawer thấp phía dưới.
- Mobile dọc: map giữ chiều cao đủ để nhìn dải đất và hai quần đảo; drawer là bottom sheet cuộn nội bộ.
- Landscape thấp: giảm decoration trước, không giảm node/nhãn địa lý; chỉ dùng side card nếu bottom strip che quá mức.
- Dùng env(safe-area-inset-*) cho drawer và nút đóng trên thiết bị có tai thỏ/home indicator.

### 7.2. Accessibility

- Tất cả nút/node có vùng tương tác tối thiểu 44×44 CSS px.
- Có focus ring tương phản rõ, không bị texture làm chìm.
- Không truyền trạng thái bằng màu đơn độc.
- aria-label của node gồm tên topic, trạng thái và tiến độ cá nhân cần thiết.
- Nhãn Hoàng Sa và Trường Sa có accessible text ngay cả khi phần hình không được đọc như nội dung tương tác.
- Map base có alternative text/summary ngắn; danh sách lesson trong drawer là fallback semantic cho người dùng không dùng được canvas/map visuals.
- Giữ dialog role, aria-labelledby, aria-describedby, focus trap và Escape behavior hiện có.

### 7.3. Motion

- Node hiện tại có thể có glimmer/pulse nhẹ dưới 180–240ms.
- Route reveal chỉ chạy lúc mở scene hoặc chọn chặng, không lặp vô hạn.
- prefers-reduced-motion hoặc reducedMotion=true tắt pulse, parallax và route animation; giữ trạng thái tĩnh rõ ràng.

## 8. Ngân sách chữ và copy

Màn hình mặc định có ngân sách:

- một tiêu đề ngắn;
- một badge đếm chặng;
- một dòng trong drawer;
- một nút hành động;
- nhãn địa lý bắt buộc.

Các câu dài, stats chi tiết và objective list chỉ xuất hiện ở lớp phụ sau thao tác chủ động. Copy phải giữ xưng hô tớ/cậu, khích lệ theo tiến bộ cá nhân và không dùng ngôn ngữ so sánh.

Ví dụ copy chính:

- Chuyến đi của tớ
- 5 / 29 chặng
- 2 chặng đang chờ bé
- Đi tiếp
- Xem các chặng
- Cả lớp đang cùng mở một cánh cửa

## 9. Kiểm thử và tiêu chí chấp nhận

### 9.1. Component/unit

- Render đúng map shell ở loading, logged-out, empty, stale, unavailable và success.
- Success render 6 topic stop theo thứ tự catalog.
- Không render bảng summary/report dài ở trạng thái mặc định.
- Chọn node cập nhật đúng drawer và aria-pressed.
- Đi tiếp gọi đúng lesson id từ DTO.
- Dải mở rộng vẫn truy cập đủ lesson của topic; không mất bài vì lọc UI.
- Hoàng Sa và Trường Sa luôn có label/accessible text.
- Không có các từ/copy cạnh tranh hoặc nhãn đánh giá tiêu cực.
- reducedMotion tắt animation class/behavior.
- Focus trap, Escape, backdrop close và restore focus vẫn pass.

### 9.2. Asset/địa lý

- Asset map là local và có checksum/source ledger.
- SVG/GeoJSON có feature hoặc metadata cho mainland, Hoàng Sa và Trường Sa.
- Snapshot/render kiểm tra hình học không bị crop, rotate, mirror hoặc stretch sai tỷ lệ.
- Hai nhãn đảo không bị route/decorations che ở các kích thước chuẩn.

### 9.3. Visual/E2E

Chạy visual QA tối thiểu ở:

- 390×844 portrait;
- 820×1180 tablet portrait;
- 1180×700 landscape;
- 1440×900 desktop.

Các câu hỏi review như một bạn nhỏ:

1. Nhìn ba giây có biết mình đang ở đâu và đi tiếp bằng nút nào không?
2. Có cần đọc một đoạn dài mới hiểu không?
3. Bản đồ Việt Nam có còn là hình ảnh lớn nhất không?
4. Hoàng Sa và Trường Sa có nhìn thấy và đọc được không?
5. Có cảm giác mình đang chơi một chuyến đi, thay vì bị chấm điểm không?
6. Khi bấm một chặng, có biết ngay bước tiếp theo không?

### 9.4. Release gates

Trước khi bật rollout:

- test liên quan pass;
- npm run typecheck, npm run typecheck:server, npm run build pass;
- git diff --check pass;
- visual QA đủ bốn kích thước;
- map source/license/checksum ledger hoàn chỉnh;
- không có remote map dependency;
- không có student data thật trong fixtures/screenshot;
- feature flag vẫn cho phép rollback về coming-soon.

## 10. Ngoài phạm vi và rủi ro

Không thực hiện trong đặc tả này:

- đổi luật tính progress hoặc API;
- thêm database/migration;
- đưa bảng xếp hạng, điểm hoặc tên bạn học vào bản đồ;
- biến route game thành đường giao thông/ranh giới hành chính;
- dùng AI để sinh geometry địa lý;
- deploy Firebase/Netlify, push GitHub hoặc bật production rollout.

Rủi ro chính:

- Map quá chi tiết làm file nặng hoặc chữ nhỏ: dùng simplified geometry có kiểm soát, không xóa hai quần đảo.
- Map đúng nhưng khó chơi: map base và game layer tách rời để chỉnh màu/route/node mà không sửa địa lý.
- Nhãn đảo bị chồng trên mobile: có layout rule riêng và visual regression.
- Địa phương em bị gán nhầm vị trí: mặc định dùng cổng khởi hành không tọa độ.
- Asset AI làm sai chữ hoặc hình địa lý: asset AI chỉ là trang trí, phải qua source/visual QA và có fallback.

## 11. Kết quả mong đợi

Sau khi triển khai, học sinh mở Bản đồ tiến bộ và thấy một chuyến đi cá nhân trên bản đồ Việt Nam thật: ít chữ, nhiều tín hiệu hình ảnh, biết mình đang ở đâu, biết chặng tiếp theo và không bị đặt cạnh thành tích của bạn khác. Phụ huynh vẫn xem chi tiết ở Dashboard; backend và dữ liệu tiến bộ đã được duyệt tiếp tục giữ nguyên.

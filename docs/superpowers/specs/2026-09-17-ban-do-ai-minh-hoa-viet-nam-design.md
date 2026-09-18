# Học Vui — Đặc tả thiết kế bản đồ AI minh họa Việt Nam

- Ngày: 18/09/2026
- Trạng thái: Đã chốt theo yêu cầu hiển thị toàn bộ canvas; visual sign-off đa viewport còn pending
- Phạm vi: thay thế artwork bản đồ tiến bộ hiện tại bằng một tranh bản đồ hoàn chỉnh duy nhất
- Đặc tả liên quan: `docs/superpowers/specs/2026-09-17-ban-do-tien-bo-map-design.md`
- Source ledger hiện tại: `docs/design/progress-map-source-ledger.md`

> Đặc tả này cập nhật quyết định trình bày bản đồ. Bản đồ runtime sẽ là một artwork phẳng duy nhất do AI hỗ trợ tạo và được kiểm chứng bằng hình học địa lý chính xác. Không hiển thị bản đồ vector kỹ thuật bên dưới rồi chồng thêm lớp minh họa.

## 1. Mục tiêu

Tạo một bản đồ Việt Nam khiến học sinh muốn khám phá ngay khi mở “Bản đồ tiến bộ”:

1. Nhận ra hình dáng Việt Nam và cảm giác đang đi trên một hành trình thật của đất nước.
2. Nhìn thấy Hoàng Sa và Trường Sa đầy đủ, ở vị trí tương đối đúng, có thể nhận diện rõ.
3. Gặp các hình ảnh biểu tượng của nhiều vùng miền thay vì nhìn một bản đồ vector khô cứng.
4. Giữ phong cách tranh phiêu lưu A1 của Học Vui: tươi sáng, ấm áp, đáng yêu, phù hợp với trẻ tiểu học.
5. Bỏ hoàn toàn các đường tuyến màu vàng vì chúng không phải dữ liệu địa lý và gây cảm giác sai lệch.

## 2. Quyết định thiết kế đã chốt

### 2.1. Một artwork duy nhất

Artwork cuối cùng là một file ảnh phẳng hoàn chỉnh, bao gồm:

- biển, đất liền, đảo và quần đảo;
- cảnh quan cách điệu của các vùng miền;
- hình minh họa các địa danh tiêu biểu;
- nhãn “Hoàng Sa” và “Trường Sa” được đặt chính xác bằng pipeline hậu kỳ;
- màu sắc, ánh sáng và texture đồng nhất với game.

Trong quá trình sản xuất có thể dùng hình học địa lý hiện tại để đối chiếu/kiểm tra. Reference này không được dùng làm alpha mask cắt artwork: runtime phải giữ trọn canvas hình ảnh AI, bao gồm biển, bầu trời và cảnh quan xung quanh bản đồ. Đây là biện pháp bảo đảm chất lượng, không phải một lớp hình ảnh được tải hoặc hiển thị riêng trong runtime.

### 2.2. Phong cách hình ảnh

- Góc nhìn bản đồ từ trên xuống, hướng Bắc ở phía trên.
- Minh họa 2D giàu màu sắc, hơi giống tranh sách phiêu lưu và bản đồ kho báu dành cho trẻ.
- Biển xanh ngọc; đất liền xanh lá, vàng lúa và nâu đất; núi có lớp đổ bóng mềm.
- Sông, ruộng, rừng, mây và đường nét địa hình được vẽ như chi tiết cảnh quan tự nhiên, không mang nghĩa ranh giới hay tuyến đường.
- Hình ảnh có chiều sâu vừa đủ nhưng không dùng phối cảnh 3D làm biến dạng hình dáng lãnh thổ.
- Không dùng phong cách dashboard, infographic doanh nghiệp hoặc quá nhiều chữ.
- Không để AI tự vẽ chữ tiếng Việt. Các nhãn sẽ được dàn bằng font của game ở bước hậu kỳ để tránh chữ sai hoặc méo.

### 2.3. Đường tuyến

- Xóa `progress-map-route`, `data-progress-map-route` và polyline tuyến hành trình khỏi scene.
- Không thay thế bằng một tuyến vàng khác.
- Có thể giữ các màu vàng trong vật thể minh họa như nắng, lúa hoặc huy hiệu, nhưng tuyệt đối không dùng nét vàng nối các điểm trên bản đồ.

## 3. Hợp đồng chính xác địa lý

### 3.1. Phần bắt buộc phải đúng

Artwork phải thể hiện:

- toàn bộ dải đất Việt Nam từ Bắc xuống Nam;
- đường bờ và hình dáng tổng thể đủ rõ để nhận ra Việt Nam;
- các đảo ven bờ quan trọng theo nguồn địa lý tham chiếu;
- Hoàng Sa và Trường Sa là hai nhóm riêng biệt, không gộp thành một biểu tượng;
- vị trí tương đối của hai quần đảo so với đất liền;
- nhãn “Hoàng Sa” và “Trường Sa” không bị cắt, che hoặc đặt nhầm.

Không được:

- làm mất, di chuyển hoặc trộn Hoàng Sa/Trường Sa vào đất liền;
- thêm đảo, bờ biển hoặc địa danh hư cấu khiến người xem hiểu là địa lý thật;
- vẽ đường biên giới biển, đường yêu sách hoặc chi tiết chính trị không cần thiết;
- dùng AI output thô làm nguồn duy nhất để kết luận hình học chính xác.

### 3.2. Nguồn kiểm chứng

- Sử dụng `public/art/progress/vietnam-progress-map.svg` và source ledger hiện tại làm reference hình học cho bước QA, không cắt pixel runtime theo reference.
- Giữ riêng các feature `mainland`, `hoang-sa` và `truong-sa` trong source/reference để có thể kiểm tra tự động.
- Đối chiếu trực quan với nguồn chính thức đã ghi trong ledger trước khi thay thế artwork runtime.
- Cập nhật source ledger bằng prompt/phiên bản asset, ngày tạo, checksum, kích thước và ghi chú kiểm tra sau khi asset được chấp nhận.
- Không ghi đè asset địa lý gốc; artwork AI là tài sản trình bày mới.

## 4. Các biểu tượng địa danh trong artwork

Phiên bản đầu tiên giới hạn ở tám cụm minh họa để bản đồ vẫn thoáng. Đây là biểu tượng văn hóa/địa danh, không phải danh sách đầy đủ tỉnh thành:

| Khu vực trên bản đồ | Hình ảnh | Quy tắc thể hiện |
| --- | --- | --- |
| Cực Bắc | Cột cờ Lũng Cú | Nhỏ nhưng dễ nhận ra, đặt ở vùng núi phía Bắc; không biến thành mũi tên chỉ hướng lãnh thổ. |
| Hà Nội | Khuê Văn Các | Một vignette kiến trúc màu đỏ/nâu ấm, không kèm đoạn văn dài. |
| Ninh Bình | Cố đô Hoa Lư | Cổng/kiến trúc cổ giữa núi đá vôi và cây xanh. |
| Nghệ An | Làng Sen Kim Liên | Hoa sen, hàng tre và mái nhà giản dị; giữ cảm giác thân thiện, không tạo biểu tượng chính trị mới. |
| Huế | Cố đô Huế | Cổng thành hoặc mái cung điện màu vàng son, đặt tại dải miền Trung. |
| Miền Trung | Phố cổ Hội An | Mái ngói, đèn lồng và màu vàng ấm; không dùng chữ AI trong đèn/biển hiệu. |
| Tây Nguyên | Nhà rông và cồng chiêng | Dùng như cảnh quan văn hóa vùng cao, không gắn với ranh giới tỉnh. |
| Nam Bộ | Chợ nổi miền Tây | Thuyền nhỏ, trái cây và sông nước; đặt ở vùng đồng bằng phía Nam. |

Các biểu tượng phải được vẽ như một phần tự nhiên của bức tranh, không đặt thành một hàng icon rời. Mỗi cụm có thể có một vùng chạm trong suốt để mở thẻ giới thiệu ngắn, nhưng không tạo thêm lớp hình ảnh nhìn thấy trên artwork.

Nội dung thẻ của một địa danh chỉ gồm:

- tên địa danh;
- một câu giới thiệu thân thiện, tối đa khoảng 120 ký tự;
- nút đóng hoặc chạm ra ngoài.

Không hiển thị bảng dữ liệu, danh sách tỉnh, số điểm hoặc so sánh học sinh trong thẻ.

## 5. Tương tác trong game

### 5.1. Chặng tiến bộ

Các chặng học tập hiện tại vẫn là control của `ProgressMapScene` và tiếp tục phản ánh dữ liệu tiến bộ thật. Chúng không phải một phần của artwork AI:

- giữ node/chặng ở vị trí storytelling hiện tại;
- không nối node bằng route;
- không che Hoàng Sa, Trường Sa hoặc các biểu tượng địa danh;
- vùng bấm tối thiểu 44×44 CSS px;
- trạng thái vẫn có icon/hình dạng, aria-label và focus ring, không phụ thuộc riêng vào màu.

### 5.2. Địa danh

Tạo module dữ liệu UI riêng, ví dụ `progressMapLandmarks.ts`, gồm:

- `id` ổn định;
- tên hiển thị;
- vị trí neo theo hệ tọa độ của artwork/reference;
- vùng chạm;
- mô tả ngắn;
- thứ tự đọc bằng bàn phím.

Vùng chạm có thể là button trong suốt đặt trên artwork. Button không được vẽ thêm viền vàng hoặc nhãn trùng lặp lên bản đồ khi chưa được chọn.

Khi chọn:

- thẻ nhỏ xuất hiện gần vùng an toàn của map;
- thẻ không làm thay đổi kích thước hoặc tỷ lệ artwork;
- trên mobile, thẻ chuyển xuống đáy vùng map nếu cạnh landmark không đủ chỗ;
- Escape và nút đóng trả focus về landmark vừa chọn;
- `prefers-reduced-motion` tắt animation trượt/nảy.

### 5.3. Header và trạng thái hiện có

Giữ HUD compact và logic tiến bộ hiện tại. Không đưa trở lại tiêu đề dài, báo cáo nhiều chữ, bảng xếp hạng hoặc thông tin học sinh khác.

## 6. Pipeline tạo asset

### 6.1. Tạo concept bằng AI

Prompt phải yêu cầu:

- tranh bản đồ Việt Nam hoàn chỉnh, north-up;
- phong cách minh họa Học Vui A1, giấy phiêu lưu, màu tươi sáng;
- biểu tượng tám địa danh theo bảng trên;
- Hoàng Sa và Trường Sa xuất hiện thành hai nhóm đảo riêng biệt, ở vị trí tương đối đúng;
- không có chữ, logo, đường vàng, đường biên, tuyến nối, đảo hư cấu hoặc địa danh tưởng tượng.

AI được dùng để tạo ngôn ngữ hình ảnh và cảnh quan. Không tuyên bố rằng hình học trong output thô của AI là dữ liệu bản đồ chính xác.

### 6.2. Hậu kỳ và flatten

1. Chọn concept có bố cục tốt nhất.
2. Dùng reference geometry để đối chiếu vị trí tương đối của đất liền và hai quần đảo; không cắt canvas source theo reference.
3. Bổ sung nhãn Hoàng Sa/Trường Sa và mọi chữ cần thiết bằng font của game.
4. Kiểm tra landmark không che bờ biển, hai quần đảo hoặc vùng chạm của chặng học tập.
5. Flatten toàn bộ thành một artwork raster duy nhất.
6. Xuất bản master chất lượng cao và bản runtime tối ưu cục bộ; không có remote URL, script hoặc map tile.

### 6.3. Tên và manifest tài sản

Tên runtime dự kiến:

- `public/art/progress/vietnam-progress-map-illustrated.png` hoặc định dạng raster tương đương sau khi benchmark kích thước/chất lượng;
- cập nhật `LOCAL_ART_URLS` và `LOCAL_ART_VERSIONS` nếu asset được precache;
- ghi checksum SHA-256, kích thước pixel, kích thước byte và nguồn tạo vào source ledger.

Artwork runtime nên đạt tối thiểu 2× kích thước hiển thị thiết kế và được tối ưu để không làm chậm mở dialog. Nếu file nặng, ưu tiên WebP/PNG tối ưu mà không làm mất chi tiết đảo hoặc chữ.

## 7. Tích hợp code

Phạm vi code dự kiến:

- `VietnamMapBase.tsx`: hiển thị artwork duy nhất.
- `ProgressMapScene.tsx`: bỏ SVG route; thêm landmark hit areas và trạng thái chọn.
- `ProgressMapNode.tsx`: giữ logic chặng, rà lại va chạm với artwork mới.
- `ProgressBoardDialog.tsx`: giữ focus contract và thêm landmark detail card nếu cần.
- `src/styles.css`: xóa style route/polyline; thêm style vùng chạm, thẻ nhỏ và responsive.
- `src/pwa/offline.ts` hoặc manifest tương ứng: thêm asset runtime và version hash.
- test map scene, offline manifest, visual/structural validation và source ledger.

Không thay đổi:

- API, database, Supabase Edge Function, feature flag hoặc schema;
- tính toán tiến bộ và `nextLessonId`;
- Thách đố, Bảng xếp hạng, chat, realtime, Parent Dashboard;
- dữ liệu học sinh và ranh giới một lớp.

## 8. Responsive và accessibility

Phải kiểm tra tối thiểu ở:

- 390×844: map không tràn ngang, hai quần đảo vẫn nhận diện được, landmark không thành mảng chữ dày;
- 577×774: artwork chiếm phần lớn dialog, không bị crop đầu Bắc hoặc cực Nam;
- 1180×700: map không bị drawer/header che, không có route vàng;
- 1440×900: chi tiết landmark và chặng không chồng lấn.

Acceptance accessibility:

- artwork có `alt` phù hợp hoặc `alt=""` nếu toàn bộ landmark đã có semantic controls riêng;
- landmark buttons có tên đầy đủ, thứ tự tab hợp lý và focus visible;
- nội dung thẻ không chỉ truyền đạt bằng màu;
- thao tác bằng bàn phím và touch đều hoạt động;
- reduced motion được tôn trọng;
- không dùng ảnh AI có chữ giả làm nội dung trợ năng.

## 9. Acceptance criteria

Artwork và tích hợp chỉ được coi là đạt khi tất cả điều kiện sau đúng:

- [ ] Người xem nhận ra đây là bản đồ Việt Nam và thấy được hành trình khám phá vui vẻ trong vài giây.
- [ ] Hình dáng đất liền không bị AI làm méo ở các vùng Bắc, Trung, Nam.
- [ ] Hoàng Sa và Trường Sa đều hiện diện, tách biệt, ở vị trí tương đối đúng, có nhãn chính xác và không bị che.
- [ ] Tám biểu tượng địa danh xuất hiện đúng vùng tương đối, có phong cách đồng nhất và không làm bản đồ rối.
- [ ] Không còn `data-progress-map-route`, polyline route hoặc bất kỳ đường vàng nối chặng nào.
- [ ] Artwork runtime là một file ảnh hoàn chỉnh; không fetch map tile, ảnh remote hoặc lớp địa lý runtime thứ hai.
- [ ] Chặng tiến bộ vẫn chọn được, không bị landmark che và không thay đổi luật dữ liệu.
- [ ] Landmark có vùng chạm/keyboard accessible và thẻ giới thiệu ngắn.
- [ ] Asset được precache đúng hash và chạy được offline theo contract hiện tại.
- [ ] Typecheck, test suite, build, offline validation và visual QA ở bốn kích thước đều đạt.
- [ ] Source ledger ghi rõ nguồn hình học, nguồn tạo artwork, prompt/version, checksum và các giới hạn bản quyền.

## 10. Rủi ro và cách xử lý

| Rủi ro | Cách xử lý |
| --- | --- |
| AI làm sai đường bờ hoặc bỏ quần đảo | Dùng reference geometry để kiểm tra/cắt; loại concept không đạt; không dùng output thô làm nguồn địa lý. |
| AI tạo chữ sai | Cấm chữ trong prompt; dàn chữ ở hậu kỳ bằng font của game. |
| Landmark che map hoặc node | Có vùng an toàn và kiểm tra ở bốn breakpoint; điều chỉnh kích thước trước khi tích hợp. |
| Artwork quá nặng | Xuất bản runtime tối ưu, kiểm tra kích thước byte và cache; giữ master riêng trong asset pipeline. |
| Người chơi hiểu biểu tượng là ranh giới tỉnh | Không vẽ ranh giới hành chính, không dùng label tỉnh hàng loạt, dùng cảnh quan mềm và chú thích địa danh ngắn. |
| Nguồn hình học hoặc artwork có hạn chế phân phối | Giữ attribution/checksum trong ledger, rà soát quyền sử dụng trước khi phát hành public; không coi ghi chú “free for public use” là ý kiến pháp lý. |

## 11. Ngoài phạm vi

- Bổ sung đủ 63 tỉnh/thành hoặc tạo bản đồ hành chính.
- Thay đổi luật tiến bộ, API hoặc dữ liệu backend.
- Tạo đường đi thực tế, đường biên giới hoặc thông tin địa lý chính trị ngoài mục tiêu giáo dục.
- Tạo bảng xếp hạng, Thách đố hoặc cơ chế so sánh học sinh.
- Phát hành production trước khi asset vượt qua kiểm tra địa lý, visual QA và approval của người dùng.

# Bản đồ tiến bộ — modal chi tiết điểm dừng nhỏ

## Trạng thái

- Trạng thái thiết kế: ĐÃ PHÊ DUYỆT bởi người dùng ngày 2026-09-18.
- Trạng thái triển khai: chưa bắt đầu trong đặc tả này.
- Git lifecycle: không commit, push, deploy hoặc cloud action trong packet này theo yêu cầu hoãn của người dùng.
- Phạm vi: cả 8 điểm dừng nhỏ trên Bản đồ tiến bộ.

## Bối cảnh và vấn đề

Panel thông tin điểm dừng nhỏ hiện hiển thị một ảnh minh họa kích thước nhỏ cùng tên và mô tả ngắn. Người dùng muốn bấm vào ảnh để mở một modal phụ, xem ảnh lớn hơn và đọc thông tin địa danh chi tiết, chính xác, gần gũi với trẻ em. Modal phụ phải không làm mất lựa chọn điểm dừng, không thay đổi tiến độ bài học và không phá vỡ luồng đóng/focus của dialog Bảng tiến bộ.

Bản đồ nền, tỷ lệ/canvas gốc, business logic, dữ liệu lesson và quyền truy cập phải được giữ nguyên. Các thay đổi chỉ bổ sung lớp trình bày, dữ liệu mô tả địa danh, supporting art còn thiếu và kiểm thử.

## Mục tiêu

1. Áp dụng cùng một luồng xem ảnh chi tiết cho cả tám điểm dừng.
2. Khi bấm ảnh nhỏ, mở modal phụ với ảnh lớn, tiêu đề, phần giải thích dễ hiểu và các ý chính ngắn.
3. Bảo đảm keyboard accessibility: nút ảnh có tên truy cập được, focus trap ở modal phụ, Escape đóng đúng lớp, focus quay lại nút mở.
4. Mỗi địa danh có ảnh dedicated đúng chủ đề; không dùng emoji hoặc placeholder thay cho thành phẩm.
5. Nội dung được lưu dạng dữ liệu có kiểu, có nguồn tham khảo và không trộn vào business logic lesson.
6. Chỉ tuyên bố đạt 95/100 hoặc `READY_FOR_REVIEW` khi có screenshot app thật ở đủ viewport quy định và tất cả hard gates pass.

## Ngoài phạm vi

- Không thay đổi ảnh bản đồ nền hoặc tỷ lệ/crop của bản đồ.
- Không mở khóa lesson, thay đổi quyền lesson, tiến độ, dữ liệu người học hoặc API/server.
- Không provision cloud, deploy, push, commit hoặc tạo PR trong packet này.
- Không biến modal thành gallery/carousel hoặc một tuyến điều hướng mới.
- Không thêm nguồn kiến thức chưa được đối chiếu vào nội dung hiển thị.

## Các phương án đã cân nhắc

### Phương án A — phóng lớn asset hiện tại

Tái sử dụng toàn bộ asset runtime hiện tại và mở rộng ảnh trong modal. Ưu điểm là ít thay đổi, nhanh và không tăng asset pack. Nhược điểm là năm điểm đang dùng minh họa theo vùng sẽ vẫn không phải hình ảnh riêng của địa danh; điều này làm giảm độ chính xác trực quan của modal.

### Phương án B — modal do board quản lý và bổ sung asset dedicated (được chọn)

Giữ ba asset dedicated đã có cho Hoa Lư, Kim Liên và Hội An; dùng ImageGen tạo thêm asset dedicated cho Lũng Cú, Khuê Văn Các, Cố đô Huế, Nhà rông Tây Nguyên và Chợ nổi Cái Răng. `ProgressBoardDialog` sở hữu state/lifecycle của modal phụ; `ProgressMapInfoPanel` chỉ phát sự kiện mở ảnh; component modal riêng chịu trách nhiệm layout và accessibility.

Đây là phương án được chọn vì giữ nguyên kiến trúc bản đồ, sửa đúng vấn đề ảnh địa danh, bảo đảm cùng một interaction contract cho tám điểm và tách rõ dữ liệu trình bày khỏi business logic.

### Phương án C — modal giàu nội dung có chuyển điểm kế tiếp

Thêm nút trước/sau, gallery và nhiều lớp nguồn tham khảo. Phương án này có thể hữu ích cho một thư viện di sản, nhưng vượt nhu cầu hiện tại, làm tăng tải nhận thức và tạo thêm trạng thái focus/keyboard cần kiểm thử.

## Thiết kế trải nghiệm

### Điểm vào

- Ảnh trong panel điểm dừng nhỏ được bọc bởi `button` có `type="button"`.
- Accessible name theo mẫu `Xem ảnh lớn: {tên địa danh}`.
- Chỉ bấm ảnh mới mở modal; nút `← Về bản đồ` vẫn giữ chức năng hiện tại.
- Nút ảnh có focus ring theo style hiện hành và không làm thay đổi kích thước/crop ảnh nhỏ ngoài mức cần thiết.

### Modal phụ

Modal phụ được render bên trong `ProgressBoardDialog` nhưng là lớp tương tác riêng:

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` trỏ tới tiêu đề địa danh.
- Ảnh lớn dùng asset runtime WebP dedicated, `object-fit: contain`, giữ đúng tỷ lệ; desktop giới hạn theo chiều rộng panel, mobile giới hạn theo chiều rộng viewport và cho phép phần nội dung cuộn.
- Nội dung gồm: kicker “TÌM HIỂU THÊM”, tên địa danh, đoạn dẫn 2–3 câu, tối đa ba ý “Điều thú vị”.
- Nút đóng có accessible label `Đóng thông tin {tên địa danh}`.
- Click vào backdrop của modal phụ chỉ đóng modal phụ; không truyền thành click đóng Bảng tiến bộ.
- Escape đóng modal phụ trước. Khi modal phụ đã đóng, Escape tiếp theo mới quay về panel điểm dừng; các lớp drawer/dialog hiện tại giữ thứ tự đóng cũ.
- Khi đóng modal phụ, focus trả về đúng nút ảnh đã mở. Khi chuyển selection hoặc đóng board, state modal được reset để không giữ stale landmark.

### Responsive

- Desktop/tablet: ảnh và copy nằm theo bố cục dọc hoặc hai vùng cân đối trong modal, không vượt chiều cao viewport.
- Mobile portrait: modal gần full-width với khoảng đệm an toàn, nội dung cuộn độc lập, nút đóng luôn tiếp cận được.
- Landscape thấp: ưu tiên ảnh vừa đủ, copy cuộn; không tạo overflow ngang.
- Modal không thay đổi kích thước/canvas bản đồ nền khi đóng.

## Kiến trúc và data flow

### Component boundary

1. `ProgressBoardDialog`
   - Thêm state `landmarkImageOpen` hoặc state tương đương gắn với landmark đang được chọn.
   - Truyền callback mở ảnh cho `ProgressMapInfoPanel`.
   - Render `ProgressMapLandmarkImageModal` khi selection là landmark và modal đang mở.
   - Quản lý Escape ordering, focus trap modal phụ và focus return.

2. `ProgressMapInfoPanel`
   - Không tự quản lý modal lifecycle.
   - Render image trigger và gọi `onOpenLandmarkImage` với `landmarkId`.
   - Giữ nguyên nhánh welcome/topic và các callback lesson hiện tại.

3. `ProgressMapLandmarkImageModal`
   - Component trình bày thuần túy nhận landmark presentation/detail và callback đóng.
   - Không đọc/ghi progress data, không mở lesson, không gọi API.
   - Expose data attributes ổn định cho unit test và browser QA.

### Typed content model

Tách nội dung chi tiết khỏi `progressMapLandmarks.json` ngắn hiện tại, hoặc mở rộng presentation bằng một module dữ liệu riêng có kiểu rõ ràng:

```ts
type ProgressMapLandmarkDetail = {
  id: ProgressMapLandmarkId;
  lead: string;
  facts: readonly string[];
  sourceUrls: readonly string[];
};
```

Mỗi một trong tám `id` phải có đúng một detail entry, ít nhất hai fact, ít nhất một source URL và asset dedicated. Test dữ liệu phải fail nếu thiếu id, thiếu nguồn hoặc mapping asset bị trỏ nhầm sang asset vùng.

### Supporting art

Giữ nguyên map master và ba asset dedicated đã được chấp nhận. Tạo bằng ImageGen năm asset còn thiếu theo concept art brief và cùng contract runtime WebP:

- `landmark-lung-cu`
- `landmark-khue-van-cac`
- `landmark-hue`
- `landmark-tay-nguyen-rong-house`
- `landmark-mekong-floating-market`

Mỗi asset phải được mở kiểm tra trực quan, có master lưu trong supporting-art masters, runtime WebP, manifest/hash/offline entry và không chứa chữ/emoji ngoài ý muốn. Không sửa map nền để đặt lại tỷ lệ.

## Nội dung và kiểm chứng fact

Nội dung hiển thị sẽ viết lại theo giọng thân thiện `tớ/cậu`, nhưng không làm thay đổi fact:

| Điểm dừng | Fact tối thiểu được phép dùng trong modal | Nguồn nền |
|---|---|---|
| Cột cờ Lũng Cú | Cột cờ ở núi Rồng; dưới chân có hoa văn trống đồng Đông Sơn; lá cờ nhìn xuống hồ Lô Lô | Cổng Du lịch Quốc gia |
| Khuê Văn Các | Được xây năm 1805; cửa tròn và các thanh gỗ gợi tia sáng sao Khuê; biểu tượng văn chương/văn hiến Hà Nội | Văn Miếu - Quốc Tử Giám |
| Cố đô Hoa Lư | Từng là nơi đóng đô của Đinh, Tiền Lê và Lý; hiện còn hệ thống đền, thành và dấu tích lịch sử; là di tích quốc gia đặc biệt | Cục Di sản văn hóa |
| Làng Sen Kim Liên | Kim Liên là quê hương Bác; Hoàng Trù là nơi Người sinh ra; cụm Làng Sen là nơi Người sống cùng gia đình từ 1901–1906 và ghi dấu hai lần về thăm quê | Khu di tích Kim Liên |
| Cố đô Huế | Là kinh đô của Việt Nam thống nhất từ năm 1802; trung tâm chính trị, văn hóa và tôn giáo của triều Nguyễn đến năm 1945 | UNESCO |
| Phố cổ Hội An | Thương cảng Đông Nam Á được bảo tồn tốt, hoạt động từ thế kỷ XV–XIX; kiến trúc phản ánh sự giao thoa văn hóa | UNESCO |
| Nhà rông Tây Nguyên | Ở nhiều buôn làng, nhà rông là không gian sinh hoạt cộng đồng; hình dáng thay đổi theo từng dân tộc; nơi gặp gỡ, trao đổi và giữ gìn truyền thống | Cổng Du lịch Quốc gia |
| Chợ nổi Cái Răng | Chợ trên sông ở Cần Thơ, bán nông sản/trái cây; thường họp từ sáng sớm; người bán có thể treo sản vật lên cây bẹo để giới thiệu | Cơ sở dữ liệu ngành Du lịch |

Nguồn tham khảo triển khai:

- [Khu di tích Kim Liên](https://langsenkimlien.hochiminh.vn/KimLiendata/pano/info.html)
- [Cột cờ Lũng Cú](https://vietnamtourism.gov.vn/printer/14932?type=1)
- [Khuê Văn Các](https://www.vanmieu.gov.vn/vi/visit/architecture/khue-van-pavilion)
- [Cố đô Hoa Lư](https://dsvh.gov.vn/di-tich-lich-su-va-kien-truc-nghe-thuat-co-do-hoa-lu-2952)
- [Quần thể di tích Cố đô Huế](https://whc.unesco.org/en/list/678)
- [Phố cổ Hội An](https://whc.unesco.org/en/list/948)
- [Nhà rông Tây Nguyên](https://dantoc.vietnamtourism.gov.vn/nha-rong-ve-dep-kien-truc-doc-dao-cua-dong-bao-dan-toc-tai-tay-nguyen/)
- [Chợ nổi Cái Răng](https://csdl.vietnamtourism.gov.vn/dest/?item=545)

## Error handling và bảo toàn trạng thái

- Nếu detail data không tìm thấy, không render modal rỗng; giữ panel hiện tại và không mở trigger hoặc dùng fallback copy an toàn được test.
- Nếu ảnh lỗi tải, giữ khung ảnh, alt/name và copy; không làm modal crash hoặc ảnh hưởng panel.
- Khi `selection` đổi, đóng modal cũ trước khi render detail mới.
- Modal chỉ trình bày dữ liệu fixture/local hiện có; không thêm fetch mạng, auth, cloud hoặc secret.

## Kiểm thử và evidence

### TDD/automated

- RED trước: test image trigger, modal mở/đóng, title/copy/source mapping, Escape ordering và focus return.
- GREEN: implement tối thiểu theo test.
- REFACTOR: giữ component boundary và CSS scoped.
- Regression data test: đủ 8 landmark IDs, đủ detail/source/asset dedicated, không mapping về asset vùng.
- Regression accessibility: role/aria, nút đóng, Tab cycle trong modal phụ, backdrop không đóng board.
- Fresh gates: full test, typecheck, server typecheck, build, validate progress map, diff check, offline manifest/hash.

### App screenshot QA

Kiểm tra trên app thật qua fixture ở các viewport: `390x844`, `430x932`, `768x1024`, `1440x900`, `1180x700`, `844x390`. Mỗi viewport phải có ít nhất trạng thái panel landmark và modal phụ đang mở; riêng mobile phải chứng minh copy cuộn được, còn desktop phải chứng minh ảnh không bị méo/cắt sai.

Hard gates:

- Tám ảnh nhỏ mở đúng tám modal và đúng asset.
- Kim Liên không dùng ảnh Huế; Hội An không dùng ảnh Huế; Hoa Lư không dùng Khuê Văn Các.
- Modal không che/đè hit area khác ngoài lớp modal khi đang mở.
- Không overflow ngang ở sáu viewport.
- Escape/focus/backdrop hoạt động đúng.
- Không thay đổi lesson progress/permissions.
- Chỉ sau khi screenshot files và scoring đủ mới đánh giá 95/100 hoặc `READY_FOR_REVIEW`.

## Checkpoint và recovery

Checkpoint của feature ghi tại `design/progress-map/qa/execution-ledger.md` với phase riêng cho modal detail. Khi gián đoạn:

1. Đọc ledger, `git status`, `git diff` và hash supporting-art trước.
2. Kiểm tra asset/master/manifest thực tế trước khi tạo lại.
3. Tiếp tục phase đầu tiên chưa hoàn thành; không tạo duplicate asset/task.
4. Không commit/push/deploy nếu chưa có yêu cầu mới từ người dùng.

## Quyết định chờ triển khai

Thiết kế này đã được người dùng phê duyệt. Bước tiếp theo là lập implementation plan riêng, sau đó triển khai theo TDD và cập nhật ledger/evidence. Không bắt đầu sửa code ứng dụng trong lúc chỉ ghi đặc tả này.

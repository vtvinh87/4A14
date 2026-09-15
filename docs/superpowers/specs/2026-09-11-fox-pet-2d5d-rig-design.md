# Cáo Nhỏ 2D/2.5D Rig — Design Spec

Ngày: 2026-09-11  
Trạng thái: Đã được người dùng phê duyệt spec ngày 2026-09-11  
Dự án: Học Vui  
Checkout: /Volumes/Pictures/Projects/Hoc_Vui  
Executor dự kiến: task Luna hiện có 01a08b45-8019-7a33-8761-b6d05450f6af, model gpt-5.6-luna, thinking max

## 1. Mục tiêu

Thay đường chạy pet GLB procedural hiện tại bằng một nhân vật 2D/2.5D rigged local, giữ nguyên artwork cáo lông chi tiết đã được duyệt tại public/art/fox-pet-alpha.png.

Nhân vật mới phải tạo cảm giác là một pet có cơ thể mềm mại, có trọng tâm, độ trễ và phản ứng theo ngữ cảnh; không còn là một ảnh tĩnh chỉ chuyển động lên/xuống. Hệ thống phải chạy tốt trên máy tính bảng, hoạt động offline sau lần tải thành công và vẫn usable khi WebGL không khả dụng hoặc người dùng bật giảm chuyển động.

## 2. Quyết định và phạm vi

### 2.1 Quyết định chính

- Dùng hướng full-image weighted mesh 2.5D hybrid.
- Texture nguồn là toàn bộ public/art/fox-pet-alpha.png; không vẽ lại, không thay màu, không nén lại làm mất chi tiết và không ghi đè file gốc.
- Mesh có các điểm neo/xương mềm và trọng số theo vùng để tạo biến dạng nhỏ, liên tục, ít seam.
- Dùng Three.js hiện có với camera orthographic và renderer lazy-load local.
- Chỉ tạo overlay/mask riêng cho chi tiết nào thật sự cần xử lý chiều sâu/che khuất và chỉ sau khi bản mesh gốc qua visual gate.
- Giữ GLB hiện tại trong checkout trong giai đoạn chuyển đổi; không tải hoặc precache nó trong đường chạy chính sau khi 2.5D được nghiệm thu.
- Không dùng Rive, Live2D, Spine, Blender runtime, dịch vụ ngoài, tài khoản ngoài hoặc asset không rõ giấy phép.

### 2.2 Phạm vi bao gồm

- Renderer FoxPet2D5D local.
- Rig metadata, mesh subdivision, weight map và spring motion.
- Mapping các mood hiện có: idle, greet, think, celebrate, rest.
- Tương thích với Pet hiện tại, touch button, reduced motion, hidden tab, fallback PNG và offline manifest.
- Unit tests, typecheck, build, offline smoke test và visual QA bằng trình duyệt thực.

### 2.3 Ngoài phạm vi

- Mô hình 3D thật, xoay 360 độ, camera tự do hoặc ánh sáng realtime.
- Authoring tool bên ngoài hoặc quy trình cần người dùng tự biết xử lý file rig.
- Tạo artwork lông mới bằng AI hoặc thay thế concept đã duyệt.
- Hệ thống pet needs, timer buồn đói, tài khoản, server, chat AI hoặc analytics.
- Sửa gameplay, nội dung sách giáo khoa, điều hướng hoặc schema progress ngoài phần cần để giữ tương thích.

## 3. Bối cảnh hiện tại

- src/components/Pet.tsx đang là facade dùng chung cho Journey, Lesson, Reward và PetView.
- src/components/FoxPet3D.tsx đang lazy-load Three.js và GLTFLoader để render public/art/fox-pet.glb.
- src/motion/pet.ts định nghĩa PetMood, resolve reduced motion và thông điệp tiếng Việt.
- App.tsx điều khiển mood timer, sound, reduced motion và hidden-tab state.
- public/art/fox-pet-alpha.png là PNG RGBA 1145x1373 có alpha thật, chứa cáo cam, lông kem, khăn teal, balô và la bàn.
- public/art/fox-pet.glb là artifact procedural low-poly cũ. Nó không đạt fidelity artwork concept và không còn là art direction hiện hành.
- three@0.186.0 và @types/three@0.185.4 đã có trong package hiện tại.

## 4. Kiến trúc runtime

### 4.1 Component boundary

Pet giữ nguyên public API:

    <Pet
      mood={petMood}
      reducedMotion={effectiveReducedMotion}
      onTap={onPetTap}
      size="full | compact"
    />

Pet tiếp tục chịu trách nhiệm cho:

- resolve mood và reduced motion;
- semantic button, accessible label và pet bubble;
- fallback/loading boundary;
- kích thước full và compact.

FoxPet2D5D chỉ chịu trách nhiệm cho phần visual canvas:

- khởi tạo và dispose renderer;
- tải texture local;
- xây mesh/rig;
- phát motion theo mood;
- pause/resume theo visibility và reduced motion;
- báo onReady/onError.

### 4.2 Render pipeline

1. Pet render một button và canvas visual layer.
2. FoxPet2D5D lazy-load Three.js khi component mount.
3. Renderer dùng camera orthographic, background trong suốt và một mesh textured duy nhất ở đường chạy cơ bản.
4. Mesh dùng subdivision đủ dày cho vùng mặt, tay và đuôi; mỗi vertex có trọng số của các điểm neo lân cận.
5. Mỗi frame, hệ motion nội suy transform của các anchor; mesh cập nhật vị trí và độ sâu Z nhẹ.
6. Renderer chỉ giữ một requestAnimationFrame khi tab visible và motion được phép.
7. Khi lỗi, canvas bị ẩn và PNG fallback hiện ra mà không làm gián đoạn bài học.

### 4.3 2.5D depth

Độ sâu dùng để tạo cảm giác nổi và thứ tự lớp, không nhằm mô phỏng 3D thật:

- torso là mặt phẳng cơ sở;
- head, waving arm và tail có offset Z rất nhỏ;
- camera orthographic giữ kích thước ổn định; cảm giác chiều sâu đến từ z-order, scale và rotation có kiểm soát;
- camera không xoay tự do và không dùng perspective parallax;
- bóng đổ vẫn do CSS/UI layer hiện có đảm nhiệm;
- không thêm lighting hoặc post-processing nặng.

## 5. Rig contract

Rig metadata dùng tọa độ chuẩn hóa trong khoảng 0..1 theo texture, để không phụ thuộc kích thước CSS.

Các anchor bắt buộc:

- root: vị trí và scale tổng thể;
- torso: nhịp thở và chuyển trọng tâm;
- head: nghiêng/gật đầu;
- ear-left, ear-right: phản ứng nhỏ;
- wave-arm: tay phải đang vẫy;
- compass-arm: tay giữ la bàn, biên độ nhỏ hơn;
- tail-base, tail-mid, tail-tip: chuyển động có độ trễ;
- leg-left, leg-right: chuyển trọng tâm nhẹ.

Weight map phải bảo đảm:

- mỗi vertex có tổng trọng số bằng 1 trong sai số số thực cho phép;
- vùng chuyển tiếp giữa các anchor dùng blend mềm;
- biên ngoài silhouette không bị kéo thành răng cưa hoặc tạo khe trong suốt;
- compass, khăn và balô không bị tách khỏi vùng thân trong các pose chuẩn;
- mesh không cần cắt rời artwork ở bước đầu.

Nếu một chuyển động không thể đạt được bằng weighted mesh mà không làm méo lông, chuyển động đó phải giảm biên độ hoặc quay về pose an toàn; không tự ý tạo mask chất lượng thấp.

## 6. Motion contract

Motion dùng spring damping hoặc hàm easing tương đương có quán tính; không dùng chuyển động tuyến tính cứng cho các bộ phận có độ trễ.

| Mood | Hành vi | Giới hạn |
|---|---|---|
| idle | Thở nhẹ, chuyển trọng tâm và đuôi rất nhỏ | Không rung liên tục, không làm phân tán khi học |
| greet | Tay phải vẫy, đầu nghiêng, đuôi phản hồi | One-shot rồi settle về idle |
| think | Đầu/tai nghiêng chậm, đuôi có phản hồi nhỏ | Không loop biên độ lớn |
| celebrate | Thân bật mềm, tay và đuôi vui hơn | One-shot, không xoay méo mặt/la bàn |
| rest | Pose tĩnh | Không RAF loop |

- reducedMotion luôn ưu tiên pose tĩnh và feedback chữ.
- document.hidden pause RAF và không tích lũy delta lớn khi quay lại.
- Không dùng thêm CSS bounce/think trên toàn bộ avatar khi renderer 2.5D đang active.
- Mood timer hiện tại trong App.tsx tiếp tục là nguồn sự thật; renderer không tự tạo state gameplay mới.
- Tap vẫn đi qua button hiện tại, không xử lý gesture riêng trong canvas.

## 7. Asset và offline strategy

- PNG gốc giữ nguyên tại /art/fox-pet-alpha.png.
- Rig metadata và motion profile là code/data local trong src.
- Nếu có overlay an toàn, đặt trong thư mục asset riêng và ghi hash vào manifest; không ghi đè PNG gốc.
- Sau khi 2.5D được nghiệm thu, vite.config.ts chỉ precache PNG và các chunk runtime cần thiết; GLB không còn là dependency runtime.
- Service worker chỉ cache allowlist hiện có, không mở rộng ra network không kiểm soát.
- Không dùng remote font, remote texture hoặc CDN runtime.

## 8. Fallback và accessibility

Fallback PNG phải xuất hiện khi:

- WebGL/WebGL2 context không tạo được;
- texture hoặc renderer load lỗi;
- runtime throw trong init hoặc animation.

Khi reduced motion được bật, renderer vẫn có thể giữ texture mesh ở pose tĩnh để bảo toàn artwork; không chạy animation loop. Nếu runtime không thể khởi tạo an toàn, cùng lúc đó dùng PNG fallback.

Canvas phải aria-hidden="true". Button chứa pet phải giữ label tiếng Việt Chạm vào Cáo Nhỏ; bubble vẫn là role="status"/aria-live như hiện tại. Trạng thái rest phải có thông điệp chữ để người dùng không phụ thuộc vào animation.

## 9. Quality gate và verification

### 9.1 Visual gate

Kiểm tra các mood ở:

- Journey full;
- Lesson compact;
- Reward compact;
- PetView full;
- tablet ngang;
- tablet dọc;
- mobile fallback layout.

Pass khi:

- không thấy seam, khe trong suốt hoặc hard edge bất thường ở kích thước sử dụng;
- phóng đại kiểm tra không có rách silhouette nghiêm trọng;
- mặt, mắt, miệng, lông, khăn, balô, compass vẫn nhận diện đúng;
- chuyển động mềm, không giật, không nhảy scale;
- loading/error fallback không nhấp nháy khó chịu;
- reduced motion thật sự tĩnh.

### 9.2 Automated gate

- Unit test rig metadata và weight normalization.
- Unit test mood profile, transition, reduced motion và rest behavior.
- TypeScript typecheck exit 0.
- npm test -- --run exit 0.
- Production build exit 0.
- Offline manifest không chứa URL GLB sau migration acceptance.
- HTTP smoke kiểm tra asset/chunk allowlist trả 200.

### 9.3 Runtime budget

- Lazy-load renderer chỉ khi pet mount.
- Một canvas và texture local trong đường chạy cơ bản.
- Pause khi tab ẩn.
- Mục tiêu tối thiểu khoảng 30 FPS trên tablet mục tiêu trong trạng thái motion bình thường; nếu không đạt, giảm subdivision/overlay trước khi giảm chất lượng artwork.

## 10. Phase và write-set

### 2D5D-01 — Rig proof

Mục tiêu: dựng mesh/anchor/weight/motion trong preview hoặc harness nội bộ mà chưa thay renderer app.

Write-set dự kiến:

- src/components/FoxPet2D5D.tsx;
- src/pet2d5d/;
- test liên quan;
- validator hoặc preview artifact cần thiết;
- handoff report trong docs/executor/.

Acceptance: visual proof qua các mood, rig tests, typecheck, test và build pass; không thay đổi gameplay.

### 2D5D-02 — Runtime integration

Mục tiêu: thay đường visual chính trong Pet, giữ fallback, mood, touch, hidden tab, reduced motion và offline.

Write-set dự kiến:

- các file src/components/ và src/pet2d5d/ liên quan;
- src/styles.css nếu cần;
- src/pwa/offline.ts, vite.config.ts nếu manifest cần cập nhật;
- test và handoff report.

Acceptance: bốn màn pet hoạt động, fallback pass, offline manifest/build pass; GLB chưa bị xóa.

### 2D5D-03 — Polish và production QA

Mục tiêu: tinh chỉnh spring/depth/sizing, chạy walkthrough responsive/offline và chỉ sau acceptance mới ngừng tải GLB trong đường chạy chính.

Write-set dự kiến:

- các file runtime/style/manifest đã được 2D5D-02 bàn giao;
- test/validator/handoff report;
- không sửa source/, nội dung sách, Brain_Vault hoặc Git metadata.

Acceptance: toàn bộ quality gate pass, parent kiểm tra artifact/diff/command output thực tế, sau đó cập nhật ledger. Mỗi phase dừng ở READY_FOR_REVIEW và không tự khởi động phase tiếp theo.

## 11. Governance và rollback

- Chỉ reuse task Luna hiện có 01a08b45-8019-7a33-8761-b6d05450f6af; không tạo task mới và không đổi model.
- Luna chỉ nhận từng packet có objective, dependency, exact write-set, acceptance criteria và output contract.
- Luna không được ghi Brain_Vault, tạo subtask, commit, push, merge, deploy hoặc chỉnh sửa ngoài write-set.
- Parent phải đọc artifact/diff và chạy verification độc lập; READY_FOR_REVIEW không đồng nghĩa acceptance.
- Nếu phase thất bại, parent gửi correction bounded vào cùng task; không tự hạ chuẩn fidelity.
- Rollback an toàn là chuyển Pet về PNG fallback/renderer cũ mà không xóa artwork gốc. GLB chỉ được dọn khỏi manifest sau khi 2.5D đã được nghiệm thu và có bằng chứng fresh.

## 12. Trạng thái phê duyệt

- Người dùng đã phê duyệt hướng A hybrid full-image weighted mesh 2.5D.
- Người dùng đã phê duyệt kiến trúc runtime, rig/motion, asset pipeline, quality gate và phase breakdown.
- Spec đã được user review và phê duyệt. Implementation plan nằm tại docs/superpowers/plans/2026-09-11-fox-pet-2d5d-rig.md; bước kế tiếp là giao packet 2D5D-01 cho task Luna hiện có.

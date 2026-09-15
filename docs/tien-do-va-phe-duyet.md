# Học Vui — Tiến độ và phê duyệt

## Yêu cầu hiện hành

Người dùng yêu cầu mô phỏng giao diện để phê duyệt trước. Sau khi chốt giao diện: viết đặc tả kỹ thuật chi tiết, chia các phase đến tối thiểu MVP; tạo một task GPT-5.6 Luna với thinking max để thực hiện từng phase. Điều phối viên kiểm tra artifact, thao tác và tests thực tế sau mỗi phase; gửi sửa lỗi vào cùng task nếu cần rồi mới giao phase tiếp theo.

## Trạng thái

- Giao diện: bản 01 không đạt kỳ vọng. Concept 02 được người dùng duyệt và yêu cầu thực hiện ngày 10/09/2026: “Tuyệt vời. Chính là điều tôi muốn. Thực hiện nó nhé”.
- Nguồn mỹ thuật đã duyệt: `design/approved/concept-v02.png` — pet render 3D, thế giới phiêu lưu có chiều sâu, game HUD/dock.
- Nguồn mô phỏng: `/Users/macbook/.codex/visualizations/2026/09/10/01a08ad3-c1cc-74d3-b6ae-bae774397297/hoc-vui-first-look.html`.
- Thiết bị chính: máy tính bảng.
- Luồng mô phỏng: hành trình → ba bước làm quen thao tác → nhận dấu → hộ chiếu; thêm danh mục theo sáu chủ đề, công tắc âm và giảm chuyển động.
- Minh họa: sticker/emoji tạm cho linh vật và vật phẩm, chưa phải bộ mỹ thuật riêng.
- Bài làm quen là nội dung thử thao tác, không phải bài học/đáp án đã kiểm duyệt. Tên bài dựa trên mục lục đã đọc ở các lượt trước.
- Tiến độ mô phỏng chỉ giữ trong bộ nhớ lần xem; không có backend hoặc lưu offline.
- Đặc tả: `docs/mvp-technical-spec.md`; P1 nền/game world → P2 hai bài + lưu → P3 polish/offline/MVP.
- Executor Luna Max: `01a08b45-8019-7a33-8761-b6d05450f6af`, project `6ccc8d2f-ca87-4a77-8ac9-12195a08277d`, host local, checkout `/Volumes/Pictures/Projects/Hoc_Vui`, non-Git.
- Coordinator: `01a08ad3-c1cc-74d3-b6ae-bae774397297`.
- P1 ACCEPTED ở mức nền giao diện: parent xem 1024×768, 768×1024 và 390×844; header narrow đã sửa, pet alpha, navigation và reduced motion hoạt động. Fresh 2 tests/typecheck/build exit 0 sau sửa.
- P2 ACCEPTED 2026-09-11 sau actual walkthrough cả hai bài và correction import/replay: fresh30 tests/typecheck/build exit0; check current activity ID có trong replay; roundtrip hợp lệ cả hai bài đạt. P3 font/offline/accessibility/polish đã bàn giao local; packet pet GLB được giao nối tiếp trong cùng executor.
- Parent P2 walkthrough 2026-09-11: hoàn thành cả 2 bài qua UI, 6 nhiệm vụ/2 dấu đúng; sai→gợi ý→retry, ghép/order, reload giữa bài và thống kê phiên đều hoạt động. Fresh 26 tests/typecheck/build pass. Executor bị quota sau khi đã lưu READY_FOR_REVIEW.
- Lịch sử correction P2 (đã đóng): validate nội dung response/correctness khi import, tương quan stamps/missions, kiểm tra file.size trước đọc và catch read errors.
- P2 early review gửi Luna: semantic validation snapshot/import (indices/version/IDs/stage), bảo vệ raw corrupt; loại distractor lược đồ bị nhập nhằng; bảng 2020 thật thay text chỉ dẫn biên tập; không lặp nhãn truyền thuyết; gate reviewed flag.
- Polish debt P3: toast sau đổi setting có thể không tự ẩn (effect cleanup hủy timer); dialog focus trap; tương phản nhãn đường hành trình và font nhỏ.
- Recovery 2026-09-11: executor latest turn failed vì usage limit; quota hiện khả dụng, đã gửi resume cùng task/model. Baseline fresh 23/23 tests pass; typecheck FAIL 4 props progress chưa nối ở LessonsView/RewardView/ParentView/TopHud. Build chưa chạy vì typecheck thất bại. Đây là P2 dang dở, không hồi quy P1 đã nghiệm thu.
- Assets ready: design/assets/world-background.png; design/assets/fox-pet-alpha.png (sips hasAlpha:yes). fox-pet.png cũ có caro baked, không dùng runtime.
- Source reviewed ready: source/mvp-content-reviewed.json; parent đã xem PDF pages 7–12, 33–36; 6 missions/12 activities, locators rõ, truyền thuyết có nhãn riêng.
- Baseline concept hash: `f914b4347c4bf8b38dec3a7ef35a26cf3da2b1be4c568d28e10a2fdc09082f72`.

## Mốc tiếp theo

Quyết định hiện hành: chuyển sang pet 2D/2.5D rigged local theo hướng full-image weighted mesh hybrid, giữ nguyên artwork lông chi tiết và không đổi khỏi executor Luna Max hiện có. Người dùng đã phê duyệt runtime, rig/motion, asset pipeline, quality gate và phase breakdown.

Font ACCEPTED (2026-09-11): Be Vietnam Pro 400/700/800/900, đủ Latin/Latin-ext/Vietnamese, 12 WOFF2 local và OFL. Parent đã quan sát desktop, tablet 768×1024 và mobile 390×844 không thấy cắt dấu; fresh35 tests/typecheck đạt, 12 font manifest URLs trả 200 đúng `font/woff2`.

PET-3D-GLB-01 ACCEPTED trong phạm vi packet (2026-09-11) nhưng đã được thay thế về mặt product direction: `public/art/fox-pet.glb` là GLB thật 163172 bytes, 2148 vertices, 3140 triangles, 37 primitives, 17 joints, 37 `SkinnedMesh`, clips `idle/greet/think/celebrate/rest`; validator độc lập và `THREE.GLTFLoader` parse pass. Artifact này được giữ nguyên trong checkout để rollback/lịch sử, không còn là đường phát triển fidelity chính.

Giới hạn còn mở: asset hiện là stylized low-poly procedural, chưa đạt độ chi tiết lông/mesh sculpt như concept render; Three runtime chunk khoảng 747 kB minified/191.81 kB gzip; IAB hiện không có viewport setter native nên chưa có bằng chứng mới ở đúng 768×1024 và 390×844 cho packet GLB. Vì vậy P3/MVP tổng thể chưa nghiệm thu; cần một vòng QA responsive/production offline cuối và quyết định product về mức fidelity asset trước khi gọi MVP hoàn tất.

PET-3D-HIFI-01 STOPPED 2026-09-11 theo yêu cầu người dùng: không tiếp tục nghiên cứu, không chỉnh sửa code/tài liệu và không tạo asset mới. Task Luna đã xác nhận idle; toàn bộ file hiện có được giữ nguyên.

Spec 2D/2.5D đã được người dùng review và phê duyệt tại `docs/superpowers/specs/2026-09-11-fox-pet-2d5d-rig-design.md`. Implementation plan đã ghi tại `docs/superpowers/plans/2026-09-11-fox-pet-2d5d-rig.md`; bước kế tiếp là giao tuần tự 2D5D-01 → 2D5D-02 → 2D5D-03 cho cùng task Luna. Không commit/push/deploy.

## Ledger 2D/2.5D — 2026-09-11

- Baseline checkout: /Volumes/Pictures/Projects/Hoc_Vui, project 6ccc8d2f-ca87-4a77-8ac9-12195a08277d, host local, non-Git.
- Baseline fresh trước packet: npm test -- --run → 10 files/35 tests pass; npm run typecheck → exit 0; npm run build → exit 0.
- Protected asset hashes: fox-pet-alpha.png = 0141b479768c575217bd3da5acde7aab7785356071cf6129ddd10713ac3bd8e3; fox-pet.glb = 73ba975c459fa46c18b341ecc179c54d0fcf5f464e49e7fa1da2ac2190a9bd40.
- Runtime baseline hashes: Pet.tsx = 25f986dd956984a4b966194aab9f755982b69118e0ce0fe2b29bf5c20f409de8; FoxPet3D.tsx = c7dc54c1e4ff1461ef7c439c1000b46b5899fcc860bd1021a661a4af985b5692; motion/pet.ts = 2ce74d08d4f6cdecce796978c5f73a1c76114777aa60d166d7e113d4553df21a.
- Plan: docs/superpowers/plans/2026-09-11-fox-pet-2d5d-rig.md.
- Packet 2D5D-01 ACCEPTED sau parent verification: targeted rig/motion 9/9 tests pass; full suite 12 files/44 tests pass; typecheck, production build và validate:fox pass; offline manifest vẫn có cả `/art/fox-pet-alpha.png` và `/art/fox-pet.glb`; CUA đã xác nhận preview 2D5D, PNG fallback cưỡng bức và production default GLB; protected hashes không đổi.
- Luna task `01a08b45-8019-7a33-8761-b6d05450f6af` đã hoàn tất packet và đang idle; không có trạng thái chờ nào từ Luna. Parent đã hoàn tất kiểm tra độc lập.
- Packet 2D5D-02 ACCEPTED sau parent verification: offline regression 3/3; full suite 12 files/45 tests; typecheck, production build và validate:fox pass; CUA xác nhận production 2D5D default (không khởi tạo GLB), PetView full, Lesson compact, forced PNG fallback ở dev, reduced-motion toggle và console không có error/warning; manifest 23 URL vẫn giữ PNG/GLB; protected GLB/PNG hashes không đổi; rig files không bị chạm ở phase này.
- Packet 2D5D-03 ACCEPTED sau parent verification: motion 9/9 và offline 4/4; full suite 12 files/49 tests; typecheck, production build và validate:fox pass; manifest 22 URL không còn GLB nhưng vẫn có PNG; HTTP smoke toàn manifest 0 lỗi, GLB rollback trực tiếp vẫn 200 và hash không đổi; CUA production cachebust xác nhận canvas 2D5D ready, PetView full, Lesson compact, Reward sau đáp án đúng, chuyển think sau bước tiếp, forced PNG fallback ở dev, reduced-motion và console dev/prod không có error/warning.
- Final parent checkpoint: lane 2D/2.5D đã hoàn tất, không có packet 2D5D-04. Còn giới hạn QA: CUA hiện không có viewport setter native để tạo bằng chứng mới đúng 768×1024 và 390×844; hidden-tab visual chỉ được bảo vệ bằng unit contract, chưa claim whole-branch/MVP acceptance. GLB vẫn được giữ trên disk làm rollback nhưng không còn active precache.

Lịch sử recovery quota và các correction P2/P3 vẫn được giữ ở các dòng trước để truy vết; không dùng chúng làm trạng thái hiện hành.

Phê duyệt concept 02 đã có lời xác nhận trực tiếp. Các mô tả bản 01 ở trên giữ làm lịch sử, không là art direction hiện hành.

# Học Vui — Đặc tả kỹ thuật MVP

Ngày 10/09/2026. Nguồn duyệt: người dùng xác nhận concept 02 bằng “Tuyệt vời. Chính là điều tôi muốn. Thực hiện nó nhé”. Tài liệu này thay thế hướng UI đơn giản của kế hoạch ban đầu. Phạm vi thực thi được phép: xây dựng đến MVP, giao lần lượt cho GPT-5.6 Luna Max và điều phối viên kiểm tra mỗi phase. Không commit/push/publish trong gói thực thi local này.

> Cập nhật hiện trạng 12/09/2026: phạm vi nội dung đã được mở rộng theo yêu cầu mới của người dùng. Runtime hiện có 29 gói bài học source-linked, Bộ sưu tập đủ 29 artwork và offline manifest tương ứng; các mốc “hai bài/27 bài chờ” bên dưới được hiểu là baseline lịch sử của MVP, không còn là trạng thái sản phẩm hiện tại.

## 1. Sản phẩm và baseline

- Đối tượng: bé 9 tuổi, tiếng Việt, máy tính bảng; có phụ huynh chọn bài và xem tiến độ.
- Root: `/Volumes/Pictures/Projects/Hoc_Vui`, non-Git khi bắt đầu, project `6ccc8d2f-ca87-4a77-8ac9-12195a08277d`, host local.
- Concept được duyệt: `design/approved/concept-v02.png`. Không dùng concept nguyên tấm làm toàn bộ giao diện với nút giả; cần tách nền, pet và UI để các điều khiển thực sự hoạt động và responsive.
- Bản 01 bị bác bỏ về thẩm mỹ; không kế thừa emoji, grid dashboard và card trắng làm màn chủ đạo.
- Source: `source/lich-su-va-dia-li-4.pdf`, hash `f7d8c9a7f7e069fcd9e509561468797c3dbd89b9e62b706291667ae87fc2577d`. Bản mẫu; chỉ xuất bản các nội dung được đối chiếu. Không đoán hoặc cập nhật ngoài sách.

## 2. MVP phải có

1. Hành trình 2.5D toàn cảnh, pet cáo có chất lượng render 3D, responsive tablet. Điều khiển và tên bài là HTML thật.
2. Pet phản hồi khi chạm, vui khi hoàn thành và gợi ý khi sai. MVP dùng tài sản render 3D kết hợp animation lớp/biểu cảm; không tự gọi đó là mô hình WebGL xoay 360 độ. Việc render realtime không phải điều kiện MVP, chất lượng mỹ thuật và tương tác mới là điều kiện.
3. Gói nội dung hiện tại có đủ 29 bài source-linked; Bài 1 và Bài 7 giữ các hoạt động đã rà soát trước đó, 27 bài còn lại dùng seed bài tập đối chiếu VBT/SGK với cùng engine. Mỗi bài có ba nhiệm vụ, mỗi nhiệm vụ có phần khám phá và hai thao tác kiểm tra.
4. Hành trình, danh sách bài, màn học, nhận dấu, pet của tôi, bộ sưu tập, góc phụ huynh và cài đặt.
5. Ba cơ chế: lựa chọn trên tư liệu, ghép cặp bằng chạm hai phía, sắp xếp thẻ bằng nút lên/xuống có thể bổ sung kéo. Mọi thao tác dùng được với touch và bàn phím.
6. Lưu tiến độ và phiên đang học trên thiết bị, xuất/nhập sao lưu; offline cho đủ 29 gói bài sau lần tải thành công.
7. Âm phản hồi do app tạo và tắt/bật; reduced motion; không thu âm trẻ, không tài khoản, không chat AI tự sinh đáp án, không dịch vụ trả phí.

## 3. Art direction và responsive

Hành trình có bối cảnh đảo/cảnh quan phiêu lưu hư cấu, nước xanh lam ngọc, cây và vách đá có chiều sâu; không phải bản đồ hành chính. Pet cáo cam mềm, áo/khăn xanh teal, mắt biểu cảm, ba lô và la bàn. Palette chính: biển teal/blue, nắng vàng, cây xanh; ink navy. Màn học giảm nền chi tiết phía sau văn bản bằng lớp tương phản cục bộ; vẫn giữ pet và thế giới.

Layer stack: nền cảnh → điểm đến/đường hành trình → pet → HUD/logo → nhãn nhiệm vụ và nút vàng → dock điều hướng → dialog. Mỗi lớp có giới hạn z-index và pointer-events. Hình nền không chứa text hoặc nút, tránh chữ trùng và hitbox không khớp.

Typography: font Nunito tiếng Việt hoặc font tròn tương đương có subset tiếng Việt; main 18–20px, heading 28–40px; tên bài không cắt mất ý. Nút chính vàng với chữ navy và bóng sâu; vùng chạm ít nhất 48px. Icon nhất quán từ primitive đã có hoặc Lucide; pet và cảnh tuyệt đối không dùng emoji thay thế ở nghiệm thu.

Ở ngang (từ 900px): pet trái khoảng 28–34% khung, hành trình/CTA trung tâm và phải, dock dưới. Ở dọc: pet nhỏ lại không che bài, một chặng chính nhìn rõ, dock co chữ/đổi bố cục. Ở 390px vẫn dùng được, không yêu cầu ngang. Không dùng absolute position cố định theo pixel cho toàn bộ app; các hotspot gắn tỉ lệ khung cảnh và có fallback danh sách.

Trạng thái pet: idle (thở/chớp nhẹ có giới hạn), greet (chạm, vẫy/nảy và câu thân thiện), think (gợi ý), celebrate (nhận dấu), rest (reduced motion/tab ẩn). Khi reduce motion thì hiển thị tư thế tĩnh và feedback chữ; không loop gây phiền. Pet không cần ăn theo timer, không buồn vì bé nghỉ.

## 4. Cấu trúc công nghệ và đường dẫn

Executor dùng Sites skill để chọn starter phù hợp nhưng chỉ build local trong phase này. React + TypeScript; CSS cho phản hồi; GSAP chỉ khi cần timeline, không thêm nhiều thư viện hoạt ảnh. Có thể chọn static Vite export nếu phù hợp; nếu dùng bundled starter giữ build plugin và primitives hiện có. Học liệu/lưu trữ là client-only, không cần D1/R2/auth.

Write-set executor: app/ (nếu starter), src/, components/, public/, tests/, scripts/, package.json, lockfile, tsconfig*, vite.config.*, index.html, .openai/, build/, wrangler*, các config lint/test/build cần thiết, README.md, docs/executor/. Không ghi design/, source/, docs/mvp-technical-spec.md hoặc ledger. Không ghi Brain_Vault; không spawn/task khác; không lifecycle Git.

Parent sở hữu design/, source/, docs/*.md ngoài docs/executor/. Tài sản từ parent được executor COPY vào public/art khi có manifest ready; không sửa tài sản nguồn.

Module responsibilities:
- content/types.ts: schema và validation các package.
- content/catalog.ts + lesson-01/07: dữ liệu có nguồn, không trộn với component.
- game/session.ts: transition và snapshot.
- game/evaluate.ts: pure evaluator.
- game/rewards.ts: cấp dấu idempotent.
- progress/storage.ts: storage adapter, migrate và backup.
- audio/manager.ts: một AudioContext, event UI/feedback, mute và cleanup.
- motion/pet.ts hoặc Pet.tsx: trạng thái pet và reduced motion.
- views/Journey, Lesson, Reward, Pet, Collection, Parent: hiển thị.
- activities/Choice, Match, Order: component tương tác.

## 5. Hợp đồng dữ liệu

```ts
type SourceRef = { sourceId:'sgk-lsdl4-sample'; pdfPage:number; printedPage:number; locator:string };
type ReviewStatus = 'draft'|'verified';
type ActivityBase = { id:string; objectiveId:string; prompt:string; hint:string; explanation:string; source:SourceRef; reviewStatus:ReviewStatus };
type Choice = ActivityBase & {type:'choice'; options:{id:string;text:string}[]; correctId:string};
type Match = ActivityBase & {type:'match'; pairs:{leftId:string;left:string;rightId:string;right:string}[]};
type Order = ActivityBase & {type:'order'; items:{id:string;text:string}[]; correctOrder:string[]};
type Activity = Choice|Match|Order;
type Mission = {id:string; title:string; discovery:{text:string;source:SourceRef}[]; activities:Activity[]};
type Lesson = {id:'lesson-01'|'lesson-07'; version:number; title:string; objectives:{id:string;text:string}[]; missions:Mission[]};
type Response = {type:'choice';optionId:string}|{type:'match';pairs:[string,string][]}|{type:'order';ids:string[]};
type Evaluation = {correct:boolean; explanation:string; invalid:boolean};
type Attempt = {id:string;activityId:string;response:Response;hintUsed:boolean;correct:boolean;time:string};
type Session = {id:string;lessonId:string;lessonVersion:number;missionIndex:number;activityIndex:number;stage:'discover'|'answer'|'feedback'|'missionComplete'|'lessonComplete';attempts:Attempt[];hintUsed:boolean;lastEvaluation:Evaluation|null};
type Progress = {schemaVersion:1;completedMissions:string[];stamps:string[];settings:{sound:boolean;reducedMotion:boolean};session:Session|null;updatedAt:string};
```

Các tên trên là contract. Nếu adapter framework cần đổi đường dẫn thì ghi quyết định trong docs/executor, không tự đổi semantics. `evaluate(activity,response):Evaluation` trả invalid khi mismatch type/id/thiếu thẻ/duplicate ids; input không được mutate. Với match, so cặp id không phụ thuộc thứ tự; với order so toàn chuỗi; choice kiểm tra id có trong options.

`transition(session,event,lesson):Session` chỉ nhận event hợp lệ: START/DISCOVERY_DONE/ANSWER/HINT/NEXT/RESUME. Sai ở answer → feedback kèm gợi ý → trở lại activity đó; đúng → feedback → next. Không nhảy trực tiếp từ bắt đầu sang lessonComplete. Bộ UI không tự cộng điểm.

`grantReward(progress,missionId):Progress` union vào completedMissions, cấp một stamp/lesson khi đủ các mission; không nhân thưởng khi refresh hay double tap. Sau mỗi event ghi snapshot trước khi phát hiệu ứng; UI “đã lưu” chỉ hiện sau write thành công.

## 6. Học liệu và chấm

Parent cung cấp `source/mvp-content-reviewed.json` với dữ kiện đã xem trực quan và nguồn; executor chỉ chuyển thành các gói chạy, không invent facts. Nếu chưa có file này, P1 làm shell bằng tiêu đề thật và mô phỏng điều khiển tách biệt; không gắn reviewed giả.

Phần discovery diễn đạt ngắn, câu hỏi phải trả lời được từ discovery hoặc tư liệu source. Mỗi hoạt động hiển thị được “Xem trong sách” ở góc phụ huynh/chi tiết, không nhúng toàn sách lên web. Ảnh mô phỏng cảnh không làm bằng chứng lịch sử/địa lí. Phân biệt truyền thuyết với sự kiện. Không kể lịch sử dựa trên cảnh nền hư cấu.

Danh mục đủ sáu chủ đề và 29 tên bài có thể hiển thị, nhưng 27 bài ngoài MVP ghi “Chưa có trong bản này”. Không khóa theo XP hoặc gây áp lực, hai bài đã có luôn mở.

## 7. Lưu, sao lưu và offline

Storage IndexedDB ưu tiên, localStorage fallback được phép nếu có xử lý lỗi/quota, test, documented. Schema 1; load corrupt → không overwrite silently, báo có lỗi và cho export raw nếu khả thi. Backup JSON có schemaVersion, exportAt, progress; giới hạn import 1MB, validate trước khi thay; import sai không mất dữ liệu cũ. Reset có xác nhận và option export trước.

Offline caching chỉ app shell và public assets/lesson data bản MVP. Service worker chỉ production; cache versioned; install không thành công phải không báo offline ready. Cập nhật giữa phiên, không reload giữa câu trả lời. Không dựa vào CDN runtime để offline: font/ảnh/audio cần local hoặc fallback. Có nút trạng thái gói offline thực tế; mạng mất lần đầu báo cần tải.

## 8. Phases, phụ thuộc và acceptance

### P1 — Nền ứng dụng và thế giới đã duyệt

Input: spec + concept. Deliverable: app chạy local, 7 màn và navigation thật, nền/pet từ assets parent khi sẵn sàng; controls responsive, sound/reduce motion, pet click feedback, thông báo trạng thái bài. Có script typecheck/test/build phù hợp. Không implement học liệu chi tiết trước P2.

Acceptance: HTTP 200, build pass, không emoji mascot; pixel composition gần concept về tầng cảnh/pet/CTA/dock; không dùng ảnh concept có chữ làm nền chính thức; mọi nút có hành vi phù hợp, không fake full-course progress; 768×1024, 1024×768 và 390×844 không overflow. Nếu tài sản chưa có thì báo pending và chưa tự tuyên bố đủ visual acceptance.

### P2 — Hai bài học chơi được và lưu tiến độ

Input: P1 accepted, reviewed content ready. Implement types/evaluate/session/rewards + 3 interaction types + hai package + progress/backup. Tối thiểu 6 missions, 12 activities, đủ chạm chọn/ghép/order xuyên hai bài, phản hồi có giải thích và source refs.

Acceptance: unit tests choice đúng/sai/invalid; match đảo thứ tự; order duplicate/thiếu; double reward idempotence; hint tracked; reload resume đúng; backup roundtrip; corrupt import giữ cũ. E2E hoàn thành cả hai bài bằng UI, cố ý sai rồi sửa, phần thưởng đúng một lần. Cho xem trạng thái “cần gợi ý” riêng “tự làm” dựa trên attempts.

### P3 — MVP polish, offline và bàn giao

Input P2 accepted. Kiểm tra UI các viewport, hoàn thiện tài sản pet, responsive dock và overlay, pause audio khi tab ẩn, reduced motion, offline shell/packages, accessibility, export/reset và README. Screenshot/trace cho các màn chính, performance baseline và các giới hạn đã biết.

Acceptance: typecheck/tests/build pass fresh; không broken links/assets; screenshot home/lesson/reward và portrait phản ánh hướng concept; nhập/tải lại/offline bài đã tải chạy được; touch hoặc click fallback hết hoạt động; 200% text không mất controls; bàn phím có focus; color không là tín hiệu duy nhất. Không claims FPS hoặc thiết bị thật nếu chưa đo. Local preview truy cập được. MVP gồm 2 bài thật, 27 bài còn lại công bố rõ chưa có.

Các phase sau MVP: nhiều nội dung đã duyệt, tinh chỉnh theo playtest của bé, model pet realtime nếu chọn, đa thiết bị và release. Không tự mở rộng trước khi MVP được kiểm chứng.

## 9. Hợp đồng điều phối

Một executor `gpt-5.6-luna`, thinking max, cùng project local. Mỗi packet chỉ một phase và kết thúc READY_FOR_REVIEW. Báo checkout, files, commands+exit, output/screenshot, limitations. Parent đọc actual files và chạy checks tương xứng; gửi correction cùng task. Không giao phase kế khi acceptance còn thiếu. Ledger trong docs/tien-do-va-phe-duyet.md là nguồn tiếp tục sau interruption.

Luồng phê duyệt giao diện đã hoàn tất cho concept 02; không hỏi lại để scaffold/build local. Việc mở task và thực thi từng phase đã được user cho phép. Publication/Git/payment không nằm trong packet hiện tại.

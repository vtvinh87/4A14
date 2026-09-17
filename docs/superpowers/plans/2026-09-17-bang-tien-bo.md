# Học Vui — Implementation Plan: Bảng tiến bộ

- Ngày lập: 17/09/2026
- Trạng thái: Chờ người dùng review và phê duyệt kế hoạch
- Đặc tả nguồn: docs/superpowers/specs/2026-09-17-bang-tien-bo-design.md
- Phạm vi: một lớp duy nhất; mỗi học sinh chỉ nhìn thấy tiến bộ của chính mình
- Quy tắc nghiệp vụ: progress-board-v1

> Tài liệu này chỉ là kế hoạch triển khai. Chưa sửa source, chưa chạy migration, chưa commit, chưa push GitHub, chưa deploy Firebase/Netlify và chưa bật cho lớp thật.

## 1. Mục tiêu triển khai

Xây dựng Bảng tiến bộ của mình như một feature panel trong trang Hành trình. Mỗi học sinh có một bản đồ riêng gồm 29 bài học thuộc 6 chủ đề, trạng thái ở cấp bài học và mục tiêu học tập, hành động tiếp theo và một mục tiêu chung của lớp nếu dữ liệu hợp tác đã có sẵn.

Tính năng phải:

- Khuyến khích việc học tiếp thay vì tạo thứ hạng hoặc cảm giác thắng/thua.
- Tính trạng thái từ bằng chứng learning event đã được server xác thực, không tin cờ UI hoặc dữ liệu client tự khai.
- Phân biệt rõ khám phá, đang luyện tập và tự làm được.
- Không lộ tên, điểm, tốc độ, thứ hạng hoặc dữ liệu thô của học sinh khác.
- Hoạt động đúng khi có retry, nhiều thiết bị, đổi generation, nội dung thay version và offline tạm thời.
- Không làm thay đổi semantics của Parent Dashboard, Thách đố, Bạn bè, chat, realtime hoặc Bottom Dock.

## 2. Kiến trúc và quyết định kỹ thuật

Luồng dữ liệu dự kiến:

    catalog/packages
      -> server content index
      -> repository read boundary
      -> pure progress calculator
      -> service
      -> authenticated API
      -> client API wrapper
      -> session cache
      -> useProgressBoard
      -> ProgressBoardDialog
      -> JourneyFeatureRail

Các quyết định giữ cố định trong MVP:

1. Không tạo bảng database hoặc migration mới. Dùng progress snapshot và learning events hiện có.
2. Server là nơi duy nhất tính ProgressBoardData. React chỉ render DTO và gọi callback.
3. Endpoint không nhận studentId từ query hoặc body; identity lấy từ student session.
4. Cache chỉ ở sessionStorage, tách namespace với account progress và event queue.
5. Rollout mặc định tắt. Khi tắt, UI dùng luồng coming-soon hiện có.
6. Rule version và content version phải đi cùng dữ liệu để tránh dùng state cũ cho nội dung mới.
7. Không dùng tên leaderboard/ranking cho route, DTO, feature id hoặc copy người dùng.
8. ClassUnlockCard chỉ nhận aggregate mục tiêu chung đã được service hợp lệ cung cấp; không tự đọc dữ liệu bạn khác.

## 3. Ràng buộc và điều không được làm

Không được mở rộng công việc sang:

- Bảng xếp hạng, điểm số, phần trăm để xếp loại, streak, tốc độ trả lời hoặc speed score.
- Chẩn đoán năng lực, dự đoán học lực, nhãn yếu/giỏi, nhãn thấp/cao hoặc nội dung so sánh.
- AI sinh nhận xét, realtime subscription, push notification hoặc hệ thống đánh giá mới.
- Thay đổi evaluator, reward, challenge, chat, friends, classroom, Bottom Dock hoặc Parent Dashboard.
- Migration database, seed dữ liệu trẻ thật, import dữ liệu ngoài phạm vi.
- Deploy, push, commit, tạo PR, merge hoặc bật rollout production trước khi có phê duyệt riêng.

Phải giữ nguyên các thay đổi chưa commit liên quan đến Thách đố. Mọi diff của feature mới phải được tách biệt và kiểm tra lại trước khi tích hợp.

## 4. Dependency graph và thứ tự thực hiện

Các ticket được làm tuần tự theo dependency:

    T1 Contract + content index
      -> T2 Pure calculator
      -> T3 Repository read boundary
      -> T4 Learning service
      -> T5 Rollout + API routes
      -> T6 Client API + session cache
      -> T7 useProgressBoard
      -> T8 Presentational components
      -> T9 Dialog + class unlock card
      -> T10 Journey/App integration
      -> T11 Responsive CSS + accessibility
      -> T12 Lifecycle, sync, reset and account switching
      -> T13 Synthetic E2E + release gate

Ticket chỉ được đánh dấu hoàn thành khi:

- Có test đỏ trước khi triển khai logic tương ứng.
- Có test xanh và typecheck phù hợp sau khi triển khai.
- Diff chỉ nằm trong write-set đã nêu.
- Không có hạng mục tạm thời, contract mồ côi hoặc đường vòng làm lộ dữ liệu.

## 5. Bản đồ file và write-set

### 5.1. File sẽ tạo mới

- shared/progress-board-contracts.ts
- shared/progress-board-contracts.test.ts
- server/analytics/progressBoardContent.ts
- server/analytics/progressBoardContent.test.ts
- server/analytics/progressBoard.ts
- server/analytics/progressBoard.test.ts
- server/progress/rollout.ts
- server/progress/rollout.test.ts
- src/auth/apiClient.progress-board.test.ts
- src/progress/progressBoardCache.ts
- src/progress/progressBoardCache.test.ts
- src/progress/useProgressBoard.ts
- src/progress/useProgressBoard.test.tsx
- src/components/progress/ProgressSummaryCard.tsx
- src/components/progress/ProgressTopicMap.tsx
- src/components/progress/ProgressLessonCard.tsx
- src/components/progress/ProgressLessonDetail.tsx
- src/components/progress/ProgressBoardComponents.test.tsx
- src/components/progress/ClassUnlockCard.tsx
- src/components/progress/ProgressBoardDialog.tsx
- src/components/progress/ProgressBoardDialog.test.tsx
- tests/e2e/progress-board-flow.spec.ts

### 5.2. File có thể sửa

- server/learning/types.ts
- server/learning/memoryRepository.ts
- server/learning/postgresRepository.ts
- server/learning/service.ts
- server/learning/service.test.ts
- server/app.ts
- server/app.test.ts
- src/auth/apiClient.ts
- src/components/JourneyFeatureRail.tsx
- src/components/JourneyFeatureRail.test.tsx nếu file hiện hữu cần cập nhật
- src/views/JourneyView.tsx
- src/views/JourneyView.test.tsx
- src/App.tsx
- src/App.test.ts
- src/styles.css
- src/styles.test.ts

### 5.3. File không được sửa trong MVP

- supabase/migrations/*
- shared/learning-contracts.ts
- src/content/courseSeeds.ts
- src/content/catalog.ts
- src/content/packages.ts
- server/learning/engine.ts
- server/learning/evaluator.ts
- server/analytics/metrics.ts semantics hiện có
- toàn bộ server/challenge/*
- toàn bộ src/challenge/*
- toàn bộ src/components/parent/ChallengeReviewQueue*
- toàn bộ classroom/friends/chat/realtime implementation
- vite.config.ts và cấu hình test discovery

## 6. Quy tắc thực thi chung

- Trước mỗi ticket: kiểm tra git status và đọc file hiện tại; không giả định source còn giống đặc tả.
- Dùng RED/GREEN/refactor. Test phải thể hiện lỗi hoặc thiếu contract trước khi code production được thêm.
- Chạy test theo ticket, sau đó chạy nhóm test liên quan; cuối cùng chạy full release gates.
- Không dùng studentId từ URL, query string, localStorage hay props do UI tự nhập để quyết định scope dữ liệu.
- Dùng dữ liệu synthetic trong mọi test; không nhập dữ liệu nhận diện trẻ thật.
- Không đưa logic tính trạng thái vào JSX hoặc hook.
- Không thay đổi code Thách đố chỉ vì thấy cùng nằm ở Journey/App; chỉ nối entry point theo write-set.
- Không tự động commit hoặc push. Sau khi plan được duyệt, execution mới bắt đầu ở checkpoint T1.

## 7. Ticket T1 — Contract dùng chung và content index

### Mục tiêu

Tạo một contract ổn định cho dữ liệu trả về và một content index server-side phản ánh đúng catalog/published package hiện có.

### File và phạm vi

- Tạo shared/progress-board-contracts.ts và test.
- Tạo server/analytics/progressBoardContent.ts và test.
- Chỉ đọc src/content/catalog.ts và src/content/packages.ts; không sửa nguồn nội dung.

### Contract cần có

Export các hằng số:

- PROGRESS_BOARD_SCHEMA_VERSION = 1
- PROGRESS_BOARD_RULE_VERSION = progress-board-v1

Export các kiểu:

- ProgressState = not_started | explored | practicing | independent
- ProgressBoardNextAction = explore | practice | review | celebrate
- ProgressBoardContentLesson gồm lessonId, title, topic, missionIds, objectiveIds, published
- ProgressBoardContentObjective gồm objectiveId, lessonId, label, activityIds, minIndependentActivities
- ProgressBoardContentIndex gồm schemaVersion, ruleVersion, contentVersion, lessons, objectives, generatedAt
- ProgressBoardObjective gồm objectiveId, label, state, practicedActivityCount, independentActivityCount, nextAction
- ProgressBoardLesson gồm lessonId, title, topic, completed, state, completedMissionCount, missionCount, objectives, nextAction
- ProgressBoardData gồm schemaVersion, ruleVersion, contentVersion, generatedAt, lastSyncedAt, stale, summary, topics, nextLessonId

Wire DTO phải dùng generation dạng string để không phụ thuộc số nguyên trong client cache; calculator có thể nhận generation số từ snapshot/events rồi serialize nhất quán khi trả DTO.

Summary tối thiểu:

- exploredLessonCount
- completedLessonCount
- independentObjectiveCount
- nextLessonId

Không đưa studentId, email, raw event, raw response, score, rank hoặc danh sách bạn học vào DTO.

### Content index

Derive manifest từ MVP_LESSONS và MVP_LESSON_PACKAGES:

- Đủ 29 lesson hiện có.
- Đủ 6 topic theo thứ tự catalog.
- Chỉ lesson/package published và reviewStatus verified mới vào index.
- objectiveId và activityId phải tồn tại trong package; không tự sinh id.
- minIndependentActivities mặc định là 1 với objective chỉ có một activity published và 2 với objective có từ hai activity published trở lên.
- Giá trị min phải lớn hơn 0 và không vượt số activity published.
- contentVersion lấy từ contract hiện có, không tạo version động theo request.

validateProgressBoardContentIndex phải phát hiện duplicate id, reference mồ côi, topic ngoài catalog, objective không thuộc lesson, activity không thuộc objective và manifest rỗng.

### RED/GREEN và lệnh xác minh

RED:

    npx vitest run shared/progress-board-contracts.test.ts server/analytics/progressBoardContent.test.ts

GREEN:

    npx vitest run shared/progress-board-contracts.test.ts server/analytics/progressBoardContent.test.ts
    npm run typecheck
    npm run typecheck:server

Test bắt buộc:

- 29 lesson và 6 topic đúng catalog.
- Không có id trùng.
- Mọi objective/activity reference đều hợp lệ.
- Manifest chỉ nhận published/verified content.
- DTO không có field riêng tư hoặc field cạnh tranh.

### Hoàn tất ticket

T1 chỉ hoàn tất khi contract được import được ở client/server, content index validate được ở test, và output không chứa dữ liệu ngoài phạm vi.

## 8. Ticket T2 — Pure progress calculator

### Mục tiêu

Viết một hàm thuần, deterministic, không phụ thuộc React/DB/request, chuyển snapshot và event hợp lệ thành ProgressBoardData.

### File và API

- Tạo server/analytics/progressBoard.ts và test.
- Export buildProgressBoardData(snapshot, events, contentIndex, generatedAt).
- Input phải là snapshot đã được repository scope đúng student và danh sách LearningEventRecord.

### Luật lọc input

Calculator chỉ xét event thỏa tất cả:

- studentId trùng owner của snapshot.
- generation trùng snapshot generation.
- lessonVersion trùng contentVersion tương ứng.
- lessonId/activityId tồn tại trong content index.
- activity thuộc objective/lesson tương ứng.
- activity/lesson đã published và reviewStatus hợp lệ.
- event đã qua server normalization; không tin client-only flags chưa xác thực.

Sort event ổn định theo receivedAt, runId, sequence, eventId để cùng input luôn cùng output.

### Luật tính

- discovery_done hợp lệ mở trạng thái explored cho objective/lesson.
- run_started, heartbeat, next và hint_used riêng lẻ không nâng trạng thái.
- answer_submitted sai được tính là practicing nếu objective đã có hoạt động hợp lệ, nhưng không tăng independent count.
- answer_submitted đúng có hintUsed = false mới được tính cho independent.
- practicedActivityCount đếm activityId distinct hợp lệ đã có answer_submitted.
- independentActivityCount đếm activityId distinct có bằng chứng đúng và không dùng hint.
- Nếu event retry trùng eventId hoặc cùng activity/attempt, không làm tăng đếm ngoài luật distinct.
- Với objective một activity, đủ min 1 independent activity là independent.
- Với objective nhiều activity, mặc định cần 2 activityId distinct; tôn trọng minIndependentActivities từ manifest.
- State precedence là independent > practicing > explored > not_started.
- Lesson completed lấy semantics completedMissions từ snapshot; lesson state chỉ là independent khi lesson completed và mọi objective published là independent.
- Lesson completed nhưng còn objective practicing phải giữ thông tin đã hoàn thành chặng và nextAction review/practice.
- nextLessonId chọn lesson catalog order đầu tiên chưa ở trạng thái independent hoặc lesson tiếp theo có objective cần luyện; nếu không có thì null.
- lastSyncedAt lấy receivedAt mới nhất được tính; nếu chưa có event hợp lệ thì dùng snapshot.updatedAt.
- stale mặc định false; client có thể biến cache thành stale khi offline nhưng calculator không tự đoán trạng thái mạng.

### RED/GREEN và lệnh xác minh

RED:

    npx vitest run server/analytics/progressBoard.test.ts

GREEN:

    npx vitest run server/analytics/progressBoard.test.ts

Các case phải có:

- snapshot rỗng.
- discovery đơn lẻ.
- answer đúng và sai.
- answer đúng có hint không được independent.
- retry và activityId distinct.
- objective một activity và nhiều activity.
- lesson completed nhưng objective chưa independent.
- generation cũ bị bỏ qua.
- lessonVersion cũ bị bỏ qua.
- unknown lesson/objective/activity bị bỏ qua.
- event challenge không làm thay đổi tiến bộ cá nhân.
- thứ tự input khác nhau cho cùng event set cho cùng output.
- output không chứa raw response, raw events, studentId hoặc dữ liệu học sinh khác.

### Hoàn tất ticket

Calculator phải được test như domain module độc lập, không gọi DB, không gọi network và không chứa JSX.

## 9. Ticket T3 — Repository read boundary

### Mục tiêu

Bổ sung một read boundary duy nhất để service lấy snapshot và events trong cùng một scope, tránh việc service tự ghép nhiều truy vấn hoặc phát sinh N+1.

### File và interface

- Sửa server/learning/types.ts.
- Sửa server/learning/memoryRepository.ts.
- Sửa server/learning/postgresRepository.ts.
- Bổ sung test vào server/learning/service.test.ts hoặc test repository hiện hữu phù hợp.

Thêm:

    type LearningBoardSource = {
      snapshot: LearningSnapshotRecord;
      events: LearningEventRecord[];
    };

Và method:

    getProgressBoardSource(studentId: string): Promise<LearningBoardSource>;

### Memory repository

- Trả clone sâu hoặc cấu trúc bất biến tương đương để calculator không mutate state.
- Scope theo studentId được truyền từ service sau authorize.
- Test hai student synthetic không nhìn thấy event/snapshot của nhau.
- Test no-source/empty-events theo semantics hiện có.

### Postgres repository

- Dùng withTransaction đã có.
- Trong một transaction, đọc snapshot của studentId và events cùng studentId.
- Giữ điều kiện generation/content filtering ở server boundary hoặc trả đủ record để calculator lọc; không lấy tất cả lớp.
- Không thêm migration.
- Không gọi một query riêng cho từng lesson/objective.
- Không ghi dữ liệu, không làm migration, không thay đổi schema.

### RED/GREEN và lệnh xác minh

RED:

    npx vitest run server/learning/service.test.ts

GREEN:

    npx vitest run server/learning/service.test.ts
    npm run typecheck:server

Test spy/fake repository phải chứng minh service chỉ dùng getProgressBoardSource cho board và không rơi về getSnapshot + listEvents riêng lẻ.

### Hoàn tất ticket

Interface Memory và Postgres thống nhất, clone/scope đúng, một read boundary có thể được service dùng trực tiếp và không tạo migration.

## 10. Ticket T4 — Learning service

### Mục tiêu

Đặt orchestration ở learning service: authorize đã diễn ra ở app layer, service lấy đúng read boundary, gọi calculator thuần và trả DTO có timestamp server.

### File và API

- Sửa server/learning/service.ts.
- Sửa server/learning/service.test.ts.
- Không sửa semantics của getDashboard, exportBackup, importBackup hoặc resetProgress.

Mở rộng createLearningService để nhận content index tùy chọn sau clock hiện có, bảo đảm các caller cũ vẫn compile. Thêm:

    getProgressBoard(
      studentId: string,
      generatedAt?: string,
    ): Promise<ProgressBoardData>

Service phải:

- Gọi đúng một lần getProgressBoardSource(studentId).
- Dùng content index đã validate ở startup/module boundary.
- Dùng clock hiện có để tạo generatedAt nếu caller không truyền.
- Chuyển generation số của snapshot sang wire DTO nhất quán.
- Trả lỗi domain rõ ràng khi snapshot không tồn tại, không nuốt lỗi DB.
- Không nhận studentId từ client ngoài identity đã authorize.

### Kiểm thử

RED:

    npx vitest run server/learning/service.test.ts

GREEN:

    npx vitest run server/learning/service.test.ts
    npm run typecheck:server

Test bắt buộc:

- Service gọi một read boundary duy nhất.
- Calculator nhận đúng snapshot, events, index và generatedAt.
- Clock có thể fake để output deterministic.
- Existing getDashboard vẫn dùng buildDashboardData và semantics range cũ.
- Lỗi repository được truyền lên app layer để app trả response đúng.

### Hoàn tất ticket

Service là ranh giới duy nhất nối repository và calculator; không có logic aggregate trong route hoặc React.

## 11. Ticket T5 — Rollout flag và API routes

### Mục tiêu

Thêm feature flag server-side và hai endpoint authenticated để kiểm soát rollout an toàn, mặc định tắt.

### File và phạm vi

- Tạo server/progress/rollout.ts và test.
- Sửa server/app.ts và server/app.test.ts.
- Không sửa netlify.toml, Edge handler hay migration ở ticket này; wiring dùng getDefaultApp hiện có.

### Rollout contract

Dùng env:

    HOC_VUI_PROGRESS_BOARD_ENABLED

Chỉ coi các giá trị trim/lowercase true, 1 hoặc on là bật. Không có env, false, giá trị lạ hoặc lỗi parse đều là tắt. Export:

    type ProgressBoardRolloutConfig = { enabled: boolean };

Nếu flag tắt, config endpoint vẫn có thể trả 200 với enabled false để client biết tính năng chưa mở. Board endpoint trả 503 với reason rollout_disabled và không truy cập repository.

### Routes

Thêm gần route progress hiện có:

- GET /api/me/progress-board/config
- GET /api/me/progress-board

Quy tắc:

- Chỉ full student session được gọi.
- Parent grant bị từ chối như authorizeStudent hiện tại.
- Không nhận query studentId, student, account hoặc bất cứ tham số scope nào.
- Khi enabled, route gọi learningService.getProgressBoard(req.auth.studentId).
- Thành công dùng success() hiện có, giữ Cache-Control no-store.
- Rollout disabled không làm lộ dữ liệu hoặc query DB.
- Dependency/service failure trả lỗi 503 theo error handling hiện có.
- Không tạo route mang tên leaderboard/ranking.

Wiring mặc định phải truyền content index đã validate cho createLearningService nhưng không làm hỏng các test app đang dùng MemoryLearning.

### RED/GREEN và lệnh xác minh

RED:

    npx vitest run server/app.test.ts server/progress/rollout.test.ts

GREEN:

    npx vitest run server/app.test.ts server/progress/rollout.test.ts
    npm run typecheck:server

Test bắt buộc:

- flag mặc định false.
- true, 1 và on bật; false, empty và giá trị lạ tắt.
- config trả enabled false khi rollout tắt.
- board trả 503 khi tắt và không gọi repository.
- student full mode được phép khi bật.
- parent mode hoặc parent grant bị 403.
- query studentId bị bỏ qua hoặc từ chối theo policy, tuyệt đối không đổi identity.
- response success không có studentId/raw fields.
- no-store có mặt trên response.

### Hoàn tất ticket

Có thể bật/tắt feature bằng env mà không migration, không restart logic ngoài cơ chế server hiện có, và API không có lỗ hổng đổi student scope.

## 12. Ticket T6 — Client API wrapper và session cache

### Mục tiêu

Tạo client wrapper cho config/data và cache tạm theo account session để giao diện chịu được offline hoặc lỗi tạm thời mà không dùng dữ liệu sai account.

### File và API

- Sửa src/auth/apiClient.ts.
- Tạo src/auth/apiClient.progress-board.test.ts.
- Tạo src/progress/progressBoardCache.ts và test.

Thêm wrapper:

    getProgressBoardRolloutConfig()
    getProgressBoard()

Wrapper phải dùng request helper hiện có, parse DTO bằng type guard và không expose raw HTTP response ra component.

### Cache contract

Cache module export các hàm tương đương:

    getProgressBoardCacheKey(accountId, generation, contentVersion, ruleVersion)
    loadProgressBoardCache(...)
    saveProgressBoardCache(...)
    clearProgressBoardCache(...)

Quy tắc:

- Chỉ dùng sessionStorage.
- Prefix riêng, ví dụ hoc-vui:progress-board:v1:; không dùng chung với accountProgress hoặc eventQueue.
- Key phải bao gồm account identity ổn định, generation, contentVersion và ruleVersion.
- Dữ liệu lưu tối đa 256 KB; vượt giới hạn thì bỏ qua cache, không cắt DTO.
- Read cache trả stale = true khi không thể xác nhận tươi; stale không đồng nghĩa dữ liệu server mới.
- Validate schema/rule/content/generation trước khi dùng.
- JSON hỏng, dữ liệu thiếu, payload quá lớn hoặc sessionStorage lỗi phải trả cache miss an toàn.
- Không lưu studentId, email, raw event, raw response, access token hoặc danh sách bạn học.
- clear phải xóa đúng namespace/key của account; không xóa event queue hay toàn bộ localStorage.

### RED/GREEN và lệnh xác minh

RED:

    npx vitest run src/auth/apiClient.progress-board.test.ts src/progress/progressBoardCache.test.ts

GREEN:

    npx vitest run src/auth/apiClient.progress-board.test.ts src/progress/progressBoardCache.test.ts
    npm run typecheck

Test bắt buộc:

- URL/method/response parse của hai wrapper.
- Cache hit, miss, stale, generation mismatch, content/rule mismatch.
- Account A không đọc cache của account B.
- sessionStorage unavailable không làm crash app.
- payload 256 KB vừa đủ và payload lớn hơn bị bỏ qua.
- Không có raw/private/competitive field trong serialized payload.

### Hoàn tất ticket

Client có thể lấy dữ liệu tươi, fallback cache có kiểm soát và không trộn cache với tiến độ account hoặc hàng đợi event.

## 13. Ticket T7 — Hook useProgressBoard

### Mục tiêu

Đóng gói lifecycle fetch/cache/error/invalidation để component UI chỉ nhận trạng thái và action, không biết chi tiết API.

### File và API

- Tạo src/progress/useProgressBoard.ts.
- Tạo src/progress/useProgressBoard.test.tsx.

State union:

    idle
    loading
    success
    stale
    empty
    unavailable
    logged-out

Hook options:

    enabled
    accountId
    generation
    invalidationToken

Hook result tối thiểu:

    status
    data
    error
    refresh()
    invalidate()

### Hành vi

- enabled false hoặc chưa có student session trả idle/logged-out, không gọi API.
- Khi mở panel và enabled true, đọc rollout/data theo đúng order đã thống nhất.
- Có request token để response cũ không ghi đè account/generation hiện tại.
- Khi request lỗi và cache hợp lệ có mặt, trả stale với dữ liệu cache.
- Khi không có cache, trả unavailable với thông báo thân thiện và action thử lại.
- Khi DTO hợp lệ nhưng chưa có activity, trả empty; không coi là lỗi.
- Không retry loop tự động.
- Refresh bị giới hạn theo user action hoặc invalidation token; không poll.
- Invalidate xóa state cũ trong memory và ép fetch mới ở lần refresh phù hợp.
- Khi logout hoặc đổi account/generation, response đang bay phải bị bỏ qua.

### RED/GREEN và lệnh xác minh

RED:

    npx vitest run src/progress/useProgressBoard.test.tsx

GREEN:

    npx vitest run src/progress/useProgressBoard.test.tsx
    npm run typecheck

Test bắt buộc:

- disabled, logged-out, loading, success, empty, unavailable, stale.
- request cũ sau account switch không cập nhật state mới.
- generation mismatch không dùng cache cũ.
- refresh/invalidate không tạo request vô hạn.
- API lỗi có cache thì render stale; API lỗi không cache thì unavailable.

### Hoàn tất ticket

Hook không chứa business calculation, không tự lấy dữ liệu lớp và có lifecycle an toàn trước race condition.

## 14. Ticket T8 — Presentational components

### Mục tiêu

Xây các component thuần dữ liệu với copy tích cực, nhất quán và responsive-friendly. Component không gọi API, không biết session hoặc DB.

### File và phạm vi

- Tạo src/components/progress/ProgressSummaryCard.tsx.
- Tạo src/components/progress/ProgressTopicMap.tsx.
- Tạo src/components/progress/ProgressLessonCard.tsx.
- Tạo src/components/progress/ProgressLessonDetail.tsx.
- Tạo src/components/progress/ProgressBoardComponents.test.tsx.

### API component

ProgressSummaryCard nhận summary, nextLesson và onOpenNext.

ProgressTopicMap nhận topics, selectedLessonId và onSelectLesson.

ProgressLessonCard nhận lesson, selected, onSelect, reducedMotion.

ProgressLessonDetail nhận lesson, onAction, onCloseDetail nếu cần.

Không component nào nhận hoặc render studentId, email, raw event, score, percentage, speed, rank hoặc tên học sinh khác.

### UI semantics

Nhãn trạng thái:

- Chưa khám phá
- Đã khám phá
- Đang luyện tập
- Tự làm được

Action label:

- Khám phá
- Luyện tập
- Xem lại
- Ăn mừng chặng này

Lesson card hiển thị completed mission count trên tổng mission count chỉ như hướng dẫn cá nhân; không dùng màu hoặc copy tạo cảm giác xếp loại.

Detail:

- Hiển thị title/topic/summary.
- Hiển thị objective published theo thứ tự manifest.
- Hiển thị practicedActivityCount và independentActivityCount nếu copy vẫn là tiến trình cá nhân; không chuyển thành điểm.
- Một action rõ ràng cho objective/lesson.
- Objective chưa đủ bằng chứng vẫn có câu như Mình đang luyện thêm bước này.

### RED/GREEN và lệnh xác minh

RED:

    npx vitest run src/components/progress/ProgressBoardComponents.test.tsx

GREEN:

    npx vitest run src/components/progress/ProgressBoardComponents.test.tsx
    npm run typecheck

Test bắt buộc:

- Render empty state, all four states and mixed topic data.
- Action callback truyền đúng lesson/objective.
- Render không chứa copy cạnh tranh hoặc nội dung tạm thời.
- aria label, heading hierarchy và button name có thể truy vấn bằng role/name.
- reducedMotion được chuyển tiếp mà không thay đổi business state.

### Hoàn tất ticket

Component hiển thị đúng DTO, không có side effect dữ liệu và copy phù hợp học sinh trong một lớp.

## 15. Ticket T9 — Dialog và mục tiêu chung của lớp

### Mục tiêu

Đóng gói panel toàn màn hình cho Bảng tiến bộ, có focus management và các trạng thái mạng rõ ràng. Mục tiêu chung của lớp là phần tùy chọn, không được làm phụ thuộc vào dữ liệu cá nhân của học sinh.

### File và phạm vi

- Tạo src/components/progress/ClassUnlockCard.tsx.
- Tạo src/components/progress/ProgressBoardDialog.tsx.
- Tạo src/components/progress/ProgressBoardDialog.test.tsx.
- Có thể tái sử dụng helper focus từ FriendListDialog/ChallengeDialog nhưng không sửa behavior của hai dialog đó.

### ClassUnlockCard

Props:

    type ProgressClassUnlockSummary = {
      current: number;
      target: number;
      completedDays: number;
    };

Card chỉ render khi parent component truyền summary hợp lệ. Copy phải hướng tới hợp tác, ví dụ Cả lớp đang cùng mở thêm một chặng khám phá. Không hiển thị ai đã đóng góp bao nhiêu, ai dẫn đầu, ai chưa tham gia hoặc bất kỳ thứ tự nào.

Nếu current/target thiếu, target không dương hoặc dữ liệu không hợp lệ, card không render. Không tự gọi Challenge API, không tự tính aggregate từ event cá nhân.

### ProgressBoardDialog props và behavior

Props tối thiểu:

    status
    data
    error
    reducedMotion
    classUnlock?
    onRefresh
    onClose

Dialog phải:

- Có role dialog và aria-labelledby trỏ tới tiêu đề.
- Mở focus vào nút đóng hoặc heading phù hợp.
- Trap focus trong dialog khi mở.
- Escape đóng; backdrop click chỉ đóng khi click đúng backdrop, không đóng khi click nội dung.
- Trả focus về trigger sau khi đóng.
- Không khóa scroll body khi dialog không mở.
- Hỗ trợ Back của thiết bị thông qua cơ chế hiện có nếu app đã expose.
- Loading có skeleton hoặc trạng thái nhẹ.
- Empty có hướng dẫn bắt đầu.
- Unavailable có nút thử lại.
- Stale có banner nhỏ nói dữ liệu đang hiển thị có thể chưa mới và cho phép refresh.
- Logged-out đóng hoặc hiển thị yêu cầu đăng nhập theo flow auth hiện có.
- Không gọi request trong presentational dialog; onRefresh do hook/App cung cấp.

Không dùng challenge weekly fetch trong dialog. Nếu mục tiêu chung chưa có data, giao diện cá nhân vẫn hoạt động độc lập.

### RED/GREEN và lệnh xác minh

RED:

    npx vitest run src/components/progress/ProgressBoardDialog.test.tsx

GREEN:

    npx vitest run src/components/progress/ProgressBoardDialog.test.tsx
    npm run typecheck

Test bắt buộc:

- Open/close bằng button, Escape và backdrop.
- Focus trap và trả focus về trigger.
- Render đủ loading/success/empty/stale/unavailable.
- Nút retry gọi đúng callback một lần.
- ClassUnlockCard ẩn khi thiếu/invalid aggregate.
- Dialog không render tên học sinh, điểm hoặc thứ tự.

### Hoàn tất ticket

Dialog hoàn chỉnh về accessibility và network states, không chứa data fetching hoặc logic aggregate.

## 16. Ticket T10 — Tích hợp JourneyFeatureRail và App

### Mục tiêu

Đưa feature vào đúng entry point Hành trình, thay tile cạnh tranh đang tạm thời bằng Bảng tiến bộ, nhưng giữ fallback coming-soon khi rollout tắt.

### File và phạm vi

- Sửa src/components/JourneyFeatureRail.tsx.
- Sửa src/views/JourneyView.tsx và test.
- Sửa src/App.tsx và test.
- Không tạo ViewId mới và không thay Bottom Dock.

### JourneyFeatureRail

Đổi:

    JourneyFeatureId = progress | challenge | friends

Tile progress:

- label đầy đủ: Bảng tiến bộ
- label ngắn: Tiến bộ
- giữ artwork hiện tại nếu cần để tránh tạo asset ngoài phạm vi
- aria-label, tooltip, title và test đều dùng Bảng tiến bộ

Props mới:

    onOpenProgress
    progressBoardEnabled

Behavior:

- progressBoardEnabled true: gọi onOpenProgress.
- false: dùng FeatureComingSoonDialog hiện có với copy phù hợp hoặc fallback giữ nguyên pattern hiện tại.
- challenge/friends behavior không đổi.
- Không còn internal identifier hoặc copy người dùng mang nghĩa bảng xếp hạng.

### JourneyView

Nhận và truyền onOpenProgress/progressBoardEnabled xuống rail. Không tự fetch board, không tự tạo dialog. Giữ nguyên pet position, rail layout, challenge và friends props ngoài phần nối mới.

### App

Bổ sung:

- rollout config state cho progress board.
- progress dialog open/close state.
- invalidationToken theo lifecycle.
- useProgressBoard với account identity/generation đã có.
- render ProgressBoardDialog cùng lớp overlay hiện có.

Rollout config:

- Tải ở session/auth lifecycle hiện có.
- Không gọi data endpoint khi config disabled.
- Khi config lỗi, coi như disabled và giữ fallback an toàn.
- Không retry loop.

Modal body lock:

- Thêm progress dialog vào danh sách modal hiện có.
- Bảo đảm overlay không làm hỏng dialog friend/challenge đang mở.
- Đóng dialog không làm mất view Hành trình hoặc pet state.

### RED/GREEN và lệnh xác minh

RED:

    npx vitest run src/components/JourneyFeatureRail.test.tsx src/views/JourneyView.test.tsx src/App.test.ts

GREEN:

    npx vitest run src/components/JourneyFeatureRail.test.tsx src/views/JourneyView.test.tsx src/App.test.ts
    npm run typecheck

Test bắt buộc:

- Tile mới mở board khi rollout bật.
- Rollout tắt mở coming-soon và không gọi board data API.
- Config unavailable không làm Hành trình crash.
- App truyền đúng account/generation cho hook.
- Mở/đóng dialog giữ nguyên view và trigger focus.
- Challenge/friends lifecycle và existing app mocks vẫn pass.
- Không tạo Bottom Dock item mới hoặc ViewId mới.

### Hoàn tất ticket

Feature chạy được từ Hành trình trong môi trường bật flag, và vẫn graceful fallback trong môi trường tắt flag.

## 17. Ticket T11 — Responsive CSS, viewport và accessibility

### Mục tiêu

Đảm bảo panel dùng được ở màn hình dọc, ngang, nhỏ và khi người dùng giảm chuyển động, đồng thời không làm thay đổi layout ngoài feature.

### File và phạm vi

- Sửa src/styles.css.
- Sửa src/styles.test.ts.
- Nếu component cần className bổ sung, chỉ sửa các component progress đã tạo ở T8/T9.

### CSS contract

Overlay:

- fixed; inset: 0; z-index cao hơn app content và thấp hơn lớp top-level thật sự cần ưu tiên.
- background scrim phủ toàn viewport.
- overflow-y: auto.
- padding an toàn cho viewport/notch.

Dialog:

- width: min(1120px, calc(100vw - 24px)).
- max-height: calc(100dvh - 24px).
- overflow: auto.
- giữ border/radius/shadow và palette hiện có.

Layout:

- desktop/landscape: summary + topic map/detail có grid rõ ràng.
- narrow portrait: một cột, không overflow ngang.
- lesson card có text wrap cho tiếng Việt và không ép title ra ngoài.
- detail không bị che bởi keyboard khi focus input/button.

Accessibility:

- visible focus ring.
- color không là tín hiệu duy nhất của state.
- reduced-motion media query và prop reducedMotion tắt animation không cần thiết.
- min target size theo convention hiện có.
- scrollbar/focus không bị clip ngoài dialog.

Không chỉnh pet, top HUD, Bottom Dock hoặc layout feature khác ngoài selector mới.

### RED/GREEN và lệnh xác minh

RED:

    npx vitest run src/styles.test.ts

GREEN:

    npx vitest run src/styles.test.ts
    npm run typecheck

Test/kiểm tra:

- CSS selectors mới có fixed/inset/overflow/max-height cần thiết.
- Không có rule broad override làm đổi dialog cũ.
- reduced-motion selector có mặt.
- class names có tính namespace progress.
- Chạy render smoke ở viewport 375x812, 768x1024, 1280x800 và màn hình ngang nhỏ hơn.

### Hoàn tất ticket

Không có overflow/clip làm mất nội dung, overlay phủ đầy viewport và các dialog cũ vẫn giữ layout.

## 18. Ticket T12 — Lifecycle, event sync, reset và đổi account

### Mục tiêu

Đảm bảo dữ liệu board được refresh đúng sau learning event đã ghi nhận, không làm mất dữ liệu cục bộ khi sync thất bại và không cho response cũ xâm nhập session mới.

### File và phạm vi

- Sửa src/App.tsx.
- Sửa src/progress/useProgressBoard.ts.
- Sửa src/progress/progressBoardCache.ts nếu cần.
- Sửa test App/hook/cache tương ứng.
- Không sửa semantics eventQueue ngoài việc gọi acknowledge/invalidate đúng lifecycle hiện có.

### Luồng sau khi học

- UI vẫn enqueue event như hiện tại.
- Chỉ sau khi sendLearningEvents thành công và acknowledge đúng event batch, App mới tăng invalidationToken.
- Board refetch theo user action hoặc invalidation policy của hook; không poll.
- Nếu sync thất bại, board hiện có thể giữ stale/cache và không giả vờ là dữ liệu server mới.
- Không invalidate cache khi chỉ enqueue local thất bại hoặc request chưa xác nhận.
- Nếu owner account/generation đã đổi trong lúc request, bỏ response và clear state cũ.

### Reset/import/logout/account switch

- resetProgress hoặc import thành công: close board, clear active board cache phù hợp và tạo generation mới theo flow existing.
- logout: close board, clear in-memory data và xóa đúng cache session của account.
- đổi account: không hiển thị board account trước; request cũ bị bỏ qua.
- đổi content/rule version: cache miss và yêu cầu fetch mới.
- App boot với no session: không fetch board.

### RED/GREEN và lệnh xác minh

RED:

    npx vitest run src/App.test.ts src/progress/useProgressBoard.test.tsx src/progress/progressBoardCache.test.ts

GREEN:

    npx vitest run src/App.test.ts src/progress/useProgressBoard.test.tsx src/progress/progressBoardCache.test.ts
    npm run typecheck

Test bắt buộc:

- ack success mới invalidate.
- send failure không invalidate như server success.
- reset/import/logout dọn state và cache đúng.
- account switch không nhận response cũ.
- generation increment loại cache cũ.
- mở board nhiều lần không tạo listener/request leak.

### Hoàn tất ticket

Board nhất quán với vòng đời auth/progress hiện tại và không tạo race condition hoặc cache leak giữa account.

## 19. Ticket T13 — Synthetic E2E, privacy audit và release gate

### Mục tiêu

Chứng minh flow end-to-end ở môi trường synthetic trước khi xin phê duyệt rollout. Ticket này chỉ kiểm tra; không bật flag production và không deploy.

### File và phạm vi

- Tạo tests/e2e/progress-board-flow.spec.ts.
- Không sửa cấu hình test discovery trừ khi test mới không được include theo config hiện tại.
- Không dùng browser automation hoặc dữ liệu trẻ thật trong test contract này.

### Kịch bản E2E synthetic

Dùng MemoryAuth và MemoryLearning hiện có với hai student synthetic A/B:

1. Flag disabled: config trả disabled, board không được query.
2. Flag enabled: A gọi board và nhận đúng các lesson/objective của A.
3. B có event khác: response A không có event/trạng thái của B.
4. Query studentId trỏ sang B: identity vẫn là A hoặc request bị policy reject; không bao giờ trả B.
5. Parent grant: không đọc được endpoint student board.
6. Discovery/answer đúng/hint/wrong: state và counts đúng rule v1.
7. Generation reset: event generation cũ không làm bẩn board mới.
8. Retry cùng eventId/activity: kết quả deterministic.
9. Response field audit: không có studentId, email, raw event, raw response, score, speed hoặc rank.
10. Client cache: stale fallback hoạt động khi API tạm thời lỗi; refresh khôi phục success.

### Lệnh xác minh theo lớp

Test contract/domain/API:

    npx vitest run tests/e2e/progress-board-flow.spec.ts
    npx vitest run shared/progress-board-contracts.test.ts server/analytics/progressBoardContent.test.ts server/analytics/progressBoard.test.ts server/progress/rollout.test.ts server/learning/service.test.ts server/app.test.ts

Test client/UI:

    npx vitest run src/auth/apiClient.progress-board.test.ts src/progress/progressBoardCache.test.ts src/progress/useProgressBoard.test.tsx src/components/progress/ProgressBoardComponents.test.tsx src/components/progress/ProgressBoardDialog.test.tsx src/components/JourneyFeatureRail.test.tsx src/views/JourneyView.test.tsx src/App.test.ts src/styles.test.ts

Type/build/edge:

    npm run typecheck
    npm run typecheck:server
    npm run build
    npm run check:edge-runtime

Full suite:

    npm test

Privacy/copy scan trên các file mới và các file integration:

    rg -n -i 'rank|leaderboard|top|fastest|scoreByStudent|speedScore|đứng đầu|đứng cuối|hơn bạn|kém bạn' shared/progress-board-contracts.ts server/analytics/progressBoard.ts server/progress src/progress src/components/progress src/components/JourneyFeatureRail.tsx src/views/JourneyView.tsx src/App.tsx

Scan trên sẽ không được có kết quả trong runtime/copy mới. Nếu test cần chứng minh từ cấm bị chặn, đặt chuỗi kiểm tra ở test data hoặc dùng assertion không đưa copy đó vào production path; reviewer phải kiểm tra thủ công các exception.

### Release evidence

Lưu lại:

- commit/base SHA đang review; không commit mới bởi agent trong phase plan.
- output từng lệnh test/build/typecheck.
- git diff --check.
- danh sách file thay đổi và xác nhận migration = 0.
- xác nhận flag production vẫn false.
- xác nhận không có request studentId từ client.
- ảnh/screenshot smoke ở portrait và landscape nếu phase triển khai cho phép.

### Hoàn tất ticket

Chỉ khi toàn bộ gate xanh, diff đúng phạm vi, privacy audit sạch và có phê duyệt rollout riêng mới chuyển sang kế hoạch release/deploy.

## 20. Ma trận acceptance criteria

| Yêu cầu | Ticket chứng minh | Bằng chứng |
| --- | --- | --- |
| Học sinh thấy bản đồ tiến bộ cá nhân | T1, T2, T8, T10 | Contract, calculator, component và App test |
| 29 bài/6 chủ đề đúng catalog | T1 | Content index test |
| Trạng thái không mang nghĩa so sánh | T1, T2, T8, T13 | DTO/copy/privacy scan |
| Independent dựa trên bằng chứng | T2, T3, T4 | Domain và service test |
| Không dùng generation/version cũ | T2, T6, T7, T13 | Calculator/cache/E2E test |
| Không lộ account khác | T3, T5, T6, T7, T13 | Repository/API/cache/race test |
| Parent Dashboard không đổi semantics | T4, T10 | Regression test getDashboard/App |
| Offline fallback an toàn | T6, T7, T9, T12 | Cache/hook/dialog/lifecycle test |
| Responsive/accessibility | T9, T11 | Dialog/CSS/render smoke |
| Rollout/rollback an toàn | T5, T10, T13 | Flag/API/fallback/release evidence |
| Không migration hoặc deploy ngoài scope | T3, T5, T13 | File audit và release checklist |

## 21. Rollout plan sau khi implementation được phê duyệt

### P0 — Contract và calculator

- Thực hiện T1 và T2.
- Không expose UI/API ra lớp thật.
- Review DTO, rule independent và privacy boundary.

### P1 — Backend read boundary và API

- Thực hiện T3, T4, T5.
- Flag giữ false.
- Chạy synthetic API tests và server typecheck.

### P2 — Client cache và hook

- Thực hiện T6, T7.
- Kiểm tra sessionStorage, generation, stale và logout.
- Chưa nối tile nếu chưa có UI gate.

### P3 — UI/navigation

- Thực hiện T8, T9, T10, T11.
- Flag vẫn false trong môi trường mặc định.
- Smoke portrait/landscape và keyboard focus.

### P4 — Lifecycle/E2E

- Thực hiện T12 và T13.
- Review diff, full test, build và edge runtime.
- Chụp lại release evidence.

### P5 — Pilot có phê duyệt riêng

- Bật HOC_VUI_PROGRESS_BOARD_ENABLED chỉ ở môi trường pilot được chỉ định.
- Dùng account synthetic hoặc account test đã được phê duyệt; không seed trẻ thật ngoài dữ liệu đã có.
- Theo dõi lỗi API, stale rate, empty state và accessibility feedback.
- Nếu có lỗi, tắt flag để rollback; không cần migration rollback.
- Chỉ sau khi pilot được nghiệm thu riêng mới xem xét deploy/hosting.

## 22. Checklist review trước khi bắt đầu triển khai

- [ ] Đã review đúng file spec nguồn và plan này.
- [ ] Chấp thuận tên Bảng tiến bộ, không phải bảng xếp hạng.
- [ ] Chấp thuận rule independent mặc định 1/2 activity.
- [ ] Chấp thuận dùng snapshot + events hiện có, không migration.
- [ ] Chấp thuận cache sessionStorage tối đa 256 KB và stale fallback.
- [ ] Chấp thuận flag mặc định false.
- [ ] Chấp thuận ClassUnlockCard là aggregate hợp tác tùy chọn, không thuộc trạng thái cá nhân.
- [ ] Chấp thuận không sửa Challenge/Friends/Parent Dashboard semantics.
- [ ] Chấp thuận bắt đầu từ T1 và dừng ở từng checkpoint review.
- [ ] Chưa cho phép commit, push, deploy hoặc bật pilot nếu chưa có yêu cầu riêng.

## 23. Handoff sau khi kế hoạch được phê duyệt

Sau khi người dùng phê duyệt kế hoạch này, execution phase sẽ:

1. Chụp lại git status và tạo ledger/checkpoint cho T1.
2. Chọn cách thực hiện theo mức độ độc lập: subagent-driven-development cho các lane đã tách được, hoặc làm tuần tự trong task hiện tại nếu write-set cần tích hợp chặt.
3. Thực hiện từng ticket theo RED/GREEN/refactor.
4. Sau mỗi ticket, kiểm tra artifact thực tế và test output; không coi summary của worker là bằng chứng đủ.
5. Dừng trước các hành động có blast radius: migration, commit, push, deploy, bật flag production.
6. Chỉ gửi đề nghị rollout/deploy sau khi release gates xanh và người dùng phê duyệt bước đó.

Kết luận: đây là implementation plan chi tiết, chưa phải lệnh triển khai. Điểm kiểm soát chính là T1 contract, T2 calculator, T5 API/flag, T10 UI integration và T13 release evidence.

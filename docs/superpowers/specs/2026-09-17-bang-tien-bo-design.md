# Học Vui — Đặc tả kỹ thuật Bảng tiến bộ

- Ngày: 17/09/2026
- Trạng thái: Đã chốt thiết kế, chờ người dùng review văn bản
- Phạm vi sản phẩm: Một lớp duy nhất
- Đối tượng chính: Học sinh; phụ huynh là đối tượng xem bằng Dashboard hiện có
- Phiên bản luật nghiệp vụ: progress-board-v1

## 1. Quyết định sản phẩm

### 1.1. Tên và vai trò

Tính năng được gọi là Bảng tiến bộ của mình ở phía học sinh. Đây là bản đồ học tập cá nhân, giúp mỗi bạn nhìn thấy mình đã khám phá gì, đang luyện tập gì và bước tiếp theo là gì.

Tính năng này không phải bảng xếp hạng, không sắp thứ tự học sinh và không tạo cảm giác thắng/thua giữa các bạn. Không hiển thị điểm tổng, phần trăm, tốc độ, chuỗi ngày học, thứ hạng, tên bạn khác hay các nhãn so sánh.

### 1.2. Ranh giới với các tính năng đã có

- Thách đố là không gian cả lớp cùng tạo câu hỏi, trả lời và mở khóa tiến độ chung. Thách đố không dùng để nâng cấp trạng thái tiến bộ cá nhân trong MVP.
- Bảng tiến bộ là không gian riêng của từng học sinh, chỉ hiển thị dữ liệu của chính bạn đó.
- Tiến độ tổng hợp của cả lớp, nếu cần, chỉ xuất hiện dưới dạng mục tiêu chung tích cực trong Thách đố, ví dụ Cả lớp cùng mở khóa. Mục này không có tên cá nhân, điểm cá nhân hoặc thứ tự giữa các bạn.
- Parent Dashboard hiện có vẫn là nơi phụ huynh xem bằng chứng học tập chi tiết và các khoảng thời gian đã hỗ trợ; không thay thế Dashboard bằng màn hình học sinh.
- Không tạo route hoặc contract mới mang tên leaderboard/ranking.

### 1.3. Phương án trải nghiệm được chọn

Phương án kết hợp gồm ba lớp:

1. Học sinh nhìn thấy bản đồ đơn giản theo các chặng/bài học, với trạng thái tích cực và một hành động tiếp theo rõ ràng.
2. Backend tính trạng thái ở cấp mục tiêu học tập dựa trên bằng chứng hoạt động đã được xác thực, thay vì chỉ dựa vào cờ hoàn thành bài.
3. Phụ huynh tiếp tục nhận được thông tin chi tiết hơn trong Dashboard, còn học sinh không bị đưa vào một màn hình đánh giá hay chẩn đoán.

## 2. Hiện trạng và khoảng trống

### 2.1. Nền tảng hiện có

Repository đang dùng React/TypeScript/Vite ở client, Netlify Functions/dev server ở backend và Supabase PostgreSQL với schema riêng hoc_vui_private.

Các nền tảng có thể tái sử dụng:

- Cơ chế đăng nhập, student session, parent grant và generation để giới hạn phạm vi dữ liệu.
- Progress snapshot với completedMissions, stamps, settings, session và updatedAt.
- Learning events có runId, sequence, lessonId, lessonVersion, activityId, response, generation, receivedAt, hintUsed, correct, visible và interactive.
- Activity có objectiveId, source và reviewStatus.
- Catalog hiện có 29 bài học thuộc 6 chủ đề.
- Parent Dashboard dùng buildDashboardData và server/analytics/metrics.ts; với dữ liệu thưa hơn ngưỡng hiện tại, Dashboard dùng thông điệp Chưa đủ dữ liệu.
- Các route server đã có authorizeStudent và authorizeParent; truy cập cơ sở dữ liệu đi qua lớp server.

### 2.2. Khoảng trống cần bổ sung

- Chưa có DTO và luật tính trạng thái riêng cho Bảng tiến bộ.
- Ô hiện đang mang định danh leaderboard trong JourneyFeatureRail vẫn là placeholder.
- Chưa có bản đồ mục tiêu học tập ở cấp objectiveId.
- Chưa có hook đọc, cache và trạng thái loading/stale/error cho bảng tiến bộ.
- Chưa có ranh giới đọc nhất quán giữa progress snapshot và learning events.
- Chưa có bộ test để chứng minh không dùng dữ liệu cũ, dữ liệu draft, dữ liệu sai generation hoặc dữ liệu của học sinh khác.

## 3. Mục tiêu và ngoài phạm vi

### 3.1. Mục tiêu

Tính năng phải:

- Cho học sinh xem tiến bộ của chính mình trên 29 bài học và 6 chủ đề đã published.
- Hiển thị trạng thái ở cấp bài học và objective, cùng hành động tiếp theo có thể thực hiện.
- Chỉ khẳng định một objective đã độc lập khi có đủ bằng chứng activity hợp lệ từ server.
- Giữ cách diễn đạt khích lệ ngay cả khi học sinh mới bắt đầu hoặc còn cần luyện tập.
- Bảo toàn tính đúng đắn khi có nhiều thiết bị, retry, đổi generation hoặc thay đổi nội dung.
- Cho phụ huynh tiếp tục xem được bằng chứng trong Parent Dashboard mà không phá vỡ semantics range hiện tại.
- Hoạt động tốt ở màn hình dọc, ngang, kích thước nhỏ và khi giảm chuyển động.
- Có feature flag và đường rollback rõ ràng trước khi bật cho lớp thật.

### 3.2. Ngoài phạm vi MVP

Không thực hiện trong đặc tả này:

- Bảng xếp hạng, thứ hạng, huy hiệu theo vị trí hoặc so sánh giữa học sinh.
- Điểm số, phần trăm hoàn thành để xếp loại, streak, tốc độ trả lời hoặc speed score.
- Chẩn đoán năng lực, kết luận học lực, nhãn yếu/giỏi hoặc điểm dự báo.
- AI sinh nhận xét, realtime subscription hoặc thông báo đẩy.
- Migration database mới.
- Thay đổi evaluator, reward, challenge, chat, friends, realtime hoặc Bottom Dock.
- Thay đổi semantics của Parent Dashboard hoặc range query hiện có.

## 4. Information architecture và UI

### 4.1. Entry point

Trong JourneyFeatureRail:

- Đổi định danh nội bộ leaderboard thành progress.
- Nhãn chính: Bảng tiến bộ.
- Nhãn ngắn ở giao diện hẹp: Tiến bộ.
- Có thể tạm tái sử dụng artwork hiện tại của ô cũ để tránh phát sinh asset ngoài phạm vi, nhưng aria-label, tooltip, title và nội dung đều phải dùng tên Bảng tiến bộ.
- Không mở một route Bottom Dock mới. Khi bấm ô, mở ProgressBoardDialog như một feature panel toàn màn hình.

Lý do: thay đổi tối thiểu trong navigation, tránh để tên cũ tiếp tục gợi ý về cạnh tranh và không làm xáo trộn cấu trúc điều hướng đang có.

### 4.2. Cây component dự kiến

    ProgressBoardDialog
    ├── ProgressBoardHeader
    ├── ProgressSummaryCard
    ├── ProgressTopicMap
    │   └── ProgressLessonCard
    ├── ProgressLessonDetail
    │   └── ProgressObjectiveRow
    └── ClassUnlockCard

Các component chỉ nhận DTO đã tính xong và callback UI cần thiết; không truy cập Supabase, không tự tính event và không nhận studentId từ URL.

### 4.3. Header và thao tác

Header gồm:

- Tiêu đề Bảng tiến bộ của mình.
- Một câu phụ ngắn, ví dụ Mỗi bước nhỏ đều mở thêm một cánh cửa.
- Nút đóng rõ ràng.

Dialog phải:

- Đóng bằng nút, Escape và Back trên thiết bị hỗ trợ.
- Trả focus về đúng ô Bảng tiến bộ sau khi đóng.
- Giữ trạng thái scroll hợp lý trong lần mở hiện tại nhưng không lưu dữ liệu nhạy cảm ngoài cache đã quy định.
- Không làm mất trạng thái của Journey khi mở/đóng.
- Có role dialog, aria-labelledby, focus trap phù hợp và thứ tự tab tự nhiên.

### 4.4. Summary card

Summary card hiển thị bốn loại thông tin tích cực:

- Số bài đã khám phá.
- Số bài đã hoàn thành.
- Số objective đã tự làm được.
- Bài/chặng nên tiếp tục mở tiếp theo, nếu có.

Không hiển thị mẫu số theo cách tạo áp lực, không dùng tỷ lệ phần trăm và không dùng câu so sánh với bạn bè.

### 4.5. Topic map và lesson card

Topic map hiển thị 6 chủ đề theo thứ tự catalog. Mỗi lesson card hiển thị:

- Tên bài.
- Trạng thái tích cực.
- Số nhiệm vụ đã hoàn thành trên tổng số nhiệm vụ của bài, chỉ để định hướng cá nhân, không dùng để xếp loại.
- Hành động tiếp theo.
- Dấu hiệu bài đã hoàn thành chặng nếu có.

Các trạng thái người dùng nhìn thấy:

- Chưa khám phá
- Đã khám phá
- Đang luyện tập
- Tự làm được

Có thể dùng nhãn phụ Đã hoàn thành chặng cho một bài đã hoàn thành nhiệm vụ nhưng một hoặc nhiều objective vẫn đang ở trạng thái luyện tập. Không dùng nhãn lỗi, thất bại, yếu, thấp hoặc chưa đạt.

Lesson card có thể mở ProgressLessonDetail. Detail hiển thị:

- Tóm tắt bài học.
- Danh sách objective đã published.
- Trạng thái từng objective.
- Số activity đã luyện và số activity đã tự làm được, nếu số này mang tính động viên và không biến thành điểm.
- Một hành động tiếp theo: khám phá, luyện tập, xem lại hoặc ăn mừng.

### 4.6. Mục tiêu chung của lớp

ClassUnlockCard chỉ hiển thị tiến độ aggregate của mục tiêu chung đã được Challenge service cung cấp, ví dụ cả lớp đang cùng mở khóa một chặng. Card này:

- Không có danh sách học sinh.
- Không có tên người đứng đầu/đứng cuối.
- Không có điểm hoặc thứ tự.
- Không làm thay đổi trạng thái objective cá nhân.
- Có copy hướng tới hợp tác, không hướng tới thành tích cá nhân.

Nếu dữ liệu aggregate chưa sẵn sàng, ẩn card hoặc dùng empty state nhẹ nhàng; không tự suy luận từ dữ liệu của học sinh khác ở client.

## 5. Luật trạng thái và ngữ nghĩa dữ liệu

### 5.1. Kiểu trạng thái

    type ProgressState =
      | 'not_started'
      | 'explored'
      | 'practicing'
      | 'independent';

Ý nghĩa:

- not_started: chưa có activity hợp lệ được ghi nhận cho objective.
- explored: đã có discovery_done hoặc bằng chứng khám phá hợp lệ.
- practicing: đã có answer_submitted hợp lệ, nhưng chưa đủ điều kiện independent.
- independent: đủ bằng chứng tự làm được theo luật ở mục 5.3.

run_started một mình không nâng trạng thái. hint_used một mình không nâng trạng thái.

### 5.2. Trạng thái bài học

Lesson có hai khái niệm tách biệt:

- completed: lấy từ progress snapshot hoặc semantics hoàn thành nhiệm vụ hiện tại.
- state: suy ra từ objective state.

Một lesson chỉ được hiển thị ở trạng thái Tự làm được khi:

1. lesson đã completed; và
2. toàn bộ objective đã published của lesson ở trạng thái independent.

Một lesson có thể completed nhưng vẫn còn objective practicing. Trường hợp này vẫn hiển thị một thông điệp tích cực và hành động xem lại/luyện tập, không phủ nhận phần đã hoàn thành.

### 5.3. Điều kiện independent

Mặc định:

- Objective chỉ có một activity published: cần ít nhất 1 lần trả lời đúng, không dùng hint trong attempt đó.
- Objective có nhiều activity published: cần ít nhất 2 activityId khác nhau trả lời đúng, không dùng hint trong các attempt được tính.
- Content manifest có thể đặt minIndependentActivities riêng nhưng phải lớn hơn 0 và không vượt quá số activity published.

Một attempt được xem xét phải:

- Thuộc lesson/objective/activity đang published ở content version hiện tại.
- Có generation hiện tại.
- Có sequence/run hợp lệ theo learning service.
- Có answer_submitted với kết quả correct=true.
- Không có hint_used cho chính attempt đó.

Retry từ sai sang đúng có thể được tính nếu lần đúng đáp ứng điều kiện không dùng hint. Lần sai không bị ghi nhận như nhãn tiêu cực và không cần hiển thị cho học sinh.

### 5.4. Event được tính

Được dùng để suy ra tiến bộ:

- discovery_done
- answer_submitted
- hint_used, chỉ để loại attempt tương ứng khỏi bằng chứng independent

Không nâng cấp trạng thái:

- run_started
- next
- heartbeat

Event từ Thách đố không nâng cấp objective/lesson cá nhân trong MVP. Sau này có thể dùng làm tín hiệu cho Ôn thêm, nhưng không được lẫn vào contract hiện tại.

### 5.5. Version, generation và dữ liệu chưa xác thực

Calculator phải:

- Lọc snapshot và events theo generation hiện tại.
- Chỉ dùng lesson/objective/activity published trong content index hiện tại.
- Giữ event cũ trong storage để audit, nhưng không dùng event khác content version để khẳng định trạng thái hiện tại.
- Bỏ qua hoặc đánh dấu không sử dụng event có lessonVersion/contentVersion không khớp.
- Không dùng dữ liệu draft, unreviewed hoặc activity không có objectiveId.
- Trả về contentVersion, ruleVersion và generation để client kiểm tra.
- Có kết quả deterministic với cùng snapshot, event set, content index và generatedAt được truyền vào.

### 5.6. next action

Mỗi objective có đúng một nextAction:

- explore: chưa có bằng chứng khám phá.
- practice: đã khám phá nhưng cần thêm activity đúng không hint.
- revisit: đã có tiến bộ nhưng còn objective/activity cần xem lại.
- celebrate: objective đã independent.

nextLessonId ở summary là lesson published đầu tiên theo thứ tự catalog còn objective chưa independent. Nếu tất cả bài đã independent thì bỏ trường này.

## 6. Contract dùng chung

Tạo file shared/progress-board-contracts.ts.

Nội dung contract cốt lõi:

    export const PROGRESS_BOARD_RULE_VERSION = 'progress-board-v1' as const;

    export type ProgressState =
      | 'not_started'
      | 'explored'
      | 'practicing'
      | 'independent';

    export type ProgressBoardObjective = {
      objectiveId: string;
      label: string;
      state: ProgressState;
      practicedActivities: number;
      independentActivities: number;
      nextAction: 'explore' | 'practice' | 'revisit' | 'celebrate';
    };

    export type ProgressBoardLesson = {
      lessonId: LessonId;
      title: string;
      topic: string;
      state: ProgressState;
      completedMissions: number;
      totalMissions: number;
      completed: boolean;
      objectives: ProgressBoardObjective[];
    };

    export type ProgressBoardData = {
      schemaVersion: 1;
      ruleVersion: typeof PROGRESS_BOARD_RULE_VERSION;
      contentVersion: string;
      generation: string;
      generatedAt: string;
      lastSyncedAt: string;
      stale: boolean;
      summary: {
        exploredLessons: number;
        completedLessons: number;
        independentObjectives: number;
        totalObjectives: number;
        nextLessonId?: LessonId;
      };
      topics: Array<{
        topic: string;
        lessons: ProgressBoardLesson[];
      }>;
    };

Không đưa studentId vào response vì identity đã được xác định từ session và việc lộ identifier không giúp trải nghiệm. Không đưa raw event id, thời điểm event, response, correct, token, grant hoặc dữ liệu audit vào response học sinh.

### 6.1. Content index

Calculator nhận một content index có dạng logic sau:

    {
      contentVersion,
      lessons: [
        {
          lessonId,
          title,
          topic,
          objectiveIds,
          published
        }
      ],
      objectives: [
        {
          objectiveId,
          lessonId,
          label,
          activityIds,
          minIndependentActivities
        }
      ]
    }

Mỗi objective dùng được trong bảng phải có ít nhất một activity published. Content validation phải fail rõ ràng nếu objective trỏ tới lesson không tồn tại, activity không thuộc lesson hoặc minIndependentActivities không hợp lệ.

## 7. Backend và API

### 7.1. Endpoint học sinh

Endpoint chính:

    GET /api/me/progress-board

Quy tắc:

- Chỉ nhận identity từ authenticated student session.
- Không nhận studentId từ query, body hoặc path.
- Parent grant không được dùng để gọi endpoint này; phụ huynh dùng Parent Dashboard.
- Response 200 trả ProgressBoardData.
- 401 khi chưa đăng nhập hoặc session hết hạn.
- 403 khi session không có student scope phù hợp.
- 503 khi service/data source tạm thời chưa sẵn sàng.
- Không trả stack trace, secret, SQL, raw event hoặc thông tin của peer trong lỗi.
- Gửi Cache-Control: no-store cho response cá nhân.

### 7.2. Parent Dashboard

Không tạo parent endpoint mới trong MVP. Route /api/parent/dashboard?range=... tiếp tục giữ semantics range và authorization hiện có.

Một shared service có thể được dùng nội bộ để tránh tính toán trùng, nhưng không được làm thay đổi:

- quyền parent grant,
- phạm vi một học sinh đã được cấp quyền,
- ý nghĩa các range,
- ngưỡng dữ liệu thưa của Dashboard,
- shape response public hiện tại.

Progress Board là all-time trong generation hiện tại; không áp dụng range picker của Parent Dashboard.

### 7.3. Service và repository

Tạo server/analytics/progressBoard.ts với hàm thuần:

    buildProgressBoardData(
      snapshot,
      events,
      contentIndex,
      generatedAt
    ): ProgressBoardData

Hàm phải không đọc network/database và không phụ thuộc vào Date.now() ngầm; generatedAt được truyền vào để test deterministic.

Repository bổ sung getProgressBoardSource(studentId), đọc snapshot và events theo một read boundary nhất quán, lọc generation ở service/calculator và tránh N+1 query. Nếu database adapter hỗ trợ transaction/read snapshot, dùng read snapshot đó; nếu không, repository phải ghi rõ consistency behavior và test race tối thiểu.

Learning service bổ sung getProgressBoard, chịu trách nhiệm:

1. xác định student identity từ session ở tầng route;
2. lấy generation hiện tại;
3. lấy source data và content index;
4. gọi calculator;
5. gắn lastSyncedAt/stale theo trạng thái đọc;
6. trả lỗi chuẩn hóa.

### 7.4. Feature flag

Dùng một flag rõ ràng, mặc định tắt khi deploy lần đầu, ví dụ FEATURE_PROGRESS_BOARD. Flag phải được kiểm tra ở navigation và route/service nếu cần, để một lần tắt có thể ẩn entry point và ngăn truy cập trực tiếp.

Khi flag tắt:

- Journey không hiển thị entry point mới hoặc dùng fallback coming-soon hiện có.
- API có thể trả 404/disabled theo convention server hiện tại.
- Không ghi thêm event hay dữ liệu mới.

## 8. Bảo mật và riêng tư

- Browser không truy cập trực tiếp Supabase.
- Route phải authorize student trước khi gọi service.
- RLS vẫn là lớp phòng thủ thứ hai, không thay thế route authorization.
- Không tin studentId do client gửi lên.
- Không trả PIN, token, parent grant, birthDate, audit trail, raw event, peer data hoặc thông tin tài khoản không cần thiết.
- DTO không có trường rank, leaderboard, scoreByStudent, speedScore hoặc tương đương.
- Nội dung UI mới không chứa các khái niệm đứng đầu, đứng cuối, nhanh nhất, hơn bạn hoặc kém bạn.
- Cache key gắn với student identity và generation; không dùng cache chung giữa học sinh.
- Logout, chuyển tài khoản và reset phải vô hiệu hóa dữ liệu cache đang hoạt động.
- Session hết hạn phải đưa về trạng thái logged-out, không cố hiển thị dữ liệu cá nhân từ một cache không còn được xác nhận.

## 9. Frontend và trạng thái tải

### 9.1. File dự kiến

- shared/progress-board-contracts.ts
- src/auth/apiClient.ts
- src/progress/useProgressBoard.ts
- src/components/progress/ProgressBoardDialog.tsx
- src/components/progress/ProgressSummaryCard.tsx
- src/components/progress/ProgressTopicMap.tsx
- src/components/progress/ProgressLessonCard.tsx
- src/components/progress/ProgressLessonDetail.tsx
- src/components/progress/ClassUnlockCard.tsx
- component JourneyFeatureRail hiện có
- JourneyView/App và styles.css ở các điểm tích hợp cần thiết

Tên thư mục có thể điều chỉnh theo convention hiện tại, nhưng components không được đưa logic database hoặc event aggregation vào UI.

### 9.2. UI state

Hook và dialog phải phân biệt:

- loading: lần đầu đang gọi API.
- success: dữ liệu server đã xác nhận.
- stale: đang hiển thị DTO cache hợp lệ trong khi chờ server hoặc khi offline.
- empty: có response hợp lệ nhưng content index chưa có bài published phù hợp.
- unavailable: API 503 hoặc lỗi tạm thời.
- logged-out: session không còn hợp lệ.

Sau khi một learning event được server acknowledge, invalidate progress-board query/cache để đọc lại. Không optimistic upgrade trạng thái independent ở client.

### 9.3. Responsive và accessibility

Phải kiểm tra tối thiểu các viewport:

- 390x844
- 820x1180
- 1180x820
- 1440x900

Yêu cầu:

- Không có horizontal scroll ngoài ý muốn.
- Tiếng Việt xuống dòng tự nhiên, không cắt dấu hoặc tràn tiêu đề.
- Bản đồ có thể cuộn trong vùng nội dung nhưng header/nút đóng vẫn dùng được.
- Card có icon kèm text, không truyền tải trạng thái bằng màu duy nhất.
- Focus visible, keyboard navigation và dialog semantics đúng.
- prefers-reduced-motion tắt hoặc rút ngắn animation.
- Zoom trình duyệt tối thiểu 200% không làm mất nút thao tác chính.

## 10. Offline và cache an toàn

Cache client tùy chọn dùng sessionStorage với key:

    hoc-vui-progress-board-v1:<studentId>:<generation>

Chỉ lưu ProgressBoardData đã sanitize, không lưu raw events. Trước khi dùng phải validate:

- schemaVersion,
- ruleVersion,
- contentVersion,
- generation,
- enum state/nextAction,
- kích thước tối đa 256 KB.

Đọc cache luôn đánh dấu stale. Cache không được tạo event, mở khóa lesson hoặc tự chuyển state. Cold start offline vẫn cần session đã xác minh; nếu không có session hợp lệ, hiển thị logged-out.

Khi logout, chuyển student account hoặc reset generation:

- xóa cache active tương ứng;
- không đọc cache của identity/generation cũ;
- không để cache key do client tự chọn vượt qua kiểm tra scope.

Nếu storage không khả dụng, tính năng chạy online-only mà không làm app crash.

## 11. Kiểm thử

### 11.1. Domain calculator

Test bắt buộc:

- Không có snapshot/events.
- discovery_done chuyển not_started thành explored.
- answer đúng chuyển explored thành practicing.
- answer sai không tạo independent.
- hint loại attempt tương ứng khỏi bằng chứng independent.
- Retry sai rồi đúng không hint được tính.
- Một activity cần 1 bằng chứng.
- Nhiều activity cần các activityId khác nhau.
- Lesson completed nhưng objective chưa independent.
- Lesson chỉ independent khi completed và mọi objective published đều independent.
- Generation cũ bị loại.
- Event Thách đố không nâng trạng thái.
- Unknown, draft, unreviewed, activity thiếu objectiveId bị loại.
- Tính nextLessonId đúng theo catalog order.
- Cùng input cho kết quả deterministic.

### 11.2. Repository/service

- Snapshot và event được đọc trong read boundary đã định.
- Không có N+1 query theo bài/objective.
- student scope không thể đọc student khác.
- Reset generation không lấy lại event cũ.
- Adapter lỗi trả lỗi chuẩn hóa, không rò rỉ chi tiết hạ tầng.
- Memory adapter và Postgres adapter có contract test tương đương nếu repository hiện có abstraction này.

### 11.3. API

- 200 với authenticated student session.
- 401 khi thiếu/hết session.
- 403 với session không có student scope phù hợp.
- Parent grant bị từ chối ở /api/me/progress-board.
- Query/body studentId bị bỏ qua hoặc từ chối theo convention an toàn.
- Không có raw event, rank, score, peer name trong response.
- Flag off không cho truy cập feature.
- Response chứa ruleVersion, contentVersion, generation hợp lệ.
- 503 không làm client retry vô hạn và không lộ stack.

### 11.4. UI và E2E

- Entry point đổi đúng sang Bảng tiến bộ/Tiến bộ.
- Mở/đóng dialog và restore focus.
- Loading, success, empty, stale, unavailable, logged-out.
- Mở chi tiết lesson/objective và quay lại map.
- Logout, switch account, reset generation.
- Responsive ở bốn viewport đã nêu.
- Keyboard, screen-reader labels, reduced motion và zoom.
- Thách đố vẫn hoạt động riêng; sự kiện Thách đố không làm đổi bảng cá nhân.
- Không xuất hiện copy hoặc UI cạnh tranh.

### 11.5. Kiểm tra riêng tư và ngôn ngữ

Chạy grep kiểm tra các trường/từ không được xuất hiện trong route/response/copy mới:

    rank
    leaderboard
    top
    fastest
    scoreByStudent
    speedScore
    đứng đầu
    đứng cuối

Các tài liệu lịch sử có thể còn nhắc tên legacy để mô tả migration, nhưng route, DTO và copy mới không được dùng các khái niệm đó.

## 12. Tiêu chí chấp nhận

Tính năng được xem là đạt khi:

1. Học sinh chỉ thấy dữ liệu của mình và các chủ đề/bài published của catalog hiện tại.
2. Trạng thái objective tuân thủ đúng luật evidence, hint, activity distinct và generation.
3. Không có trường hợp chỉ mở bài hoặc chạy activity mà bị khẳng định là tự làm được.
4. Không có ranking, score comparison, peer list hoặc ngôn ngữ hơn/kém trong trải nghiệm.
5. Lesson completed và objective independent được hiển thị tách biệt, không overclaim.
6. Reset/logout/switch account không để lộ cache hoặc dữ liệu cũ.
7. Thách đố không bị thay đổi semantics và vẫn là luồng hợp tác riêng.
8. Parent Dashboard giữ nguyên quyền, scope và range semantics.
9. API và client xử lý được loading, stale, unavailable và session hết hạn.
10. Tests domain/repository/service/API/UI đều đạt.
11. TypeScript, server typecheck, build, E2E, responsive và accessibility checks đều đạt.
12. Có feature flag rollback và thử nghiệm không dùng dữ liệu thật của trẻ.

## 13. Rollout

### P0 — Contract và content index

- Tạo shared contract.
- Xây content index từ catalog hiện tại.
- Viết calculator thuần và domain tests.
- Chưa đổi UI, chưa gọi cloud, chưa migration database.

### P1 — Read boundary và service

- Bổ sung repository/service read path.
- Thêm authorization, generation filter và contract tests.
- Flag vẫn tắt.

### P2 — API, client hook và cache

- Thêm GET /api/me/progress-board.
- Thêm hook, query invalidation và cache validation.
- Test auth/privacy/error.
- Flag vẫn tắt mặc định.

### P3 — UI và navigation

- Đổi tile sang Bảng tiến bộ.
- Xây dialog, map, lesson detail, summary và class aggregate card.
- Hoàn tất responsive/accessibility/reduced-motion.

### P4 — Pilot

- Chạy local/test environment với dữ liệu seed không phải trẻ thật.
- Bật cho pilot một lớp duy nhất sau khi acceptance checklist được ký.
- Theo dõi lỗi API, stale rate, calculator mismatch và UI feedback.
- Nếu có lỗi, tắt flag để trả về behavior cũ mà không rollback schema.

Không deploy production, push GitHub, migrate cloud hoặc nhập dữ liệu trẻ thật trong phạm vi của đặc tả này. Các hành động đó cần approval riêng ở bước release.

## 14. File impact và ranh giới thay đổi

### Có thể thay đổi

- shared/progress-board-contracts.ts
- server/analytics/progressBoard.ts
- server repository/learning service liên quan đến read path
- route API /api/me/progress-board
- auth api client/hook
- các component và style của Progress Board
- JourneyFeatureRail/JourneyView/App ở điểm nối entry point và dialog
- test domain, server, API, UI/E2E
- tài liệu feature flag và acceptance checklist

### Không thay đổi trong MVP

- Supabase schema/migration.
- Learning event schema và evaluator/reward semantics.
- Challenge, chat, friends, realtime.
- Bottom Dock information architecture.
- Parent Dashboard response/range semantics.
- Dữ liệu nguồn bài học và lesson playable status.
- Git history, remote branches, deployment configuration hoặc Firebase/Netlify production state.

## 15. Release gates

Trước khi đề xuất bật flag phải có bằng chứng cho:

- domain tests;
- repository/service tests;
- API authorization/privacy tests;
- client/UI/E2E tests;
- client typecheck;
- server typecheck;
- production build;
- responsive screenshots hoặc test evidence;
- accessibility checks;
- privacy grep;
- rollback bằng feature flag;
- dữ liệu seed không chứa thông tin thật của trẻ.

Bản đặc tả này là nền tảng để lập implementation plan. Chưa có thay đổi source hoặc database nào được yêu cầu bởi chính đặc tả.

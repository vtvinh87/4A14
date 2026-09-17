# Học Vui — Thách đố tiếp sức tri thức

Date: 2026-09-17

Status: SPEC_FOR_REVIEW

Scope: một lớp học khép kín của Học Vui; không mở rộng đa lớp trong MVP.

## 1. Quyết định thiết kế

“Thách đố” là một sân chơi học tập nơi học sinh tự tạo câu hỏi lịch sử và địa lí cho các bạn. Mỗi câu hỏi phải gắn với một mảnh kiến thức trong catalog của Học Vui, được phụ huynh của người tạo duyệt trước khi xuất hiện, rồi trở thành một phần của nhiệm vụ chung trong ngày. Mảnh đã kiểm duyệt được đánh dấu riêng; mảnh tham khảo từ bài học vẫn phải qua bước phụ huynh kiểm tra.

Mục tiêu xã hội của tính năng là **cả lớp cùng mở khóa một chặng hành trình**, không phải chọn ra người giỏi nhất. Vì vậy MVP không có:

- điểm cá nhân được sắp xếp thành bảng xếp hạng;
- thưởng cho người trả lời nhanh nhất;
- giới hạn năm người đầu tiên;
- hiển thị nhóm cuối hoặc so sánh công khai;
- bình luận tự do, bỏ phiếu chê hoặc trêu chọc;
- bảng xếp hạng toàn trường/toàn hệ thống.

Thay cho bảng điểm là “Bản đồ đóng góp hôm nay” và “Bản đồ đóng góp tuần này”: một thanh tiến độ tập thể, các câu hỏi đã khám phá và những danh hiệu tích cực có thể trao cho nhiều bạn cùng lúc.

Đây là quyết định sản phẩm có chủ đích. Bảng xếp hạng công khai có thể tạo động lực cho một số học sinh nhưng cũng có thể gây lo âu và mất động lực cho các em khác; mục tiêu cá nhân, phản hồi cụ thể và mục tiêu nhóm phù hợp hơn với bối cảnh này. Tham khảo [tổng quan hệ thống về gamification trong giáo dục](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2026.1754080/full), [EEF về phản hồi](https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/feedback) và [EEF về siêu nhận thức/tự điều chỉnh](https://educationendowmentfoundation.org.uk/education-evidence/guidance-reports/metacognition).

## 2. Bối cảnh hiện tại và phạm vi

- Ứng dụng phục vụ một lớp duy nhất; toàn bộ tài khoản học sinh active là roster của lớp.
- Đối tượng chính là học sinh lớp 4, sử dụng tiếng Việt trên máy tính bảng.
- Frontend là React + TypeScript + Vite.
- Browser gọi API hiện có qua `server/app.ts` và Supabase Edge Function; browser không truy cập trực tiếp PostgreSQL.
- Xác thực học sinh, parent grant, Parent Dashboard và roster bạn bè đã tồn tại; tính năng mới phải dùng lại các ranh giới này.
- `JourneyFeatureRail` hiện có nút `challenge` đang mở placeholder; MVP sẽ thay placeholder bằng luồng thật sau khi plan triển khai được duyệt.
- Nội dung bài học hiện có source reference và `reviewStatus`; chỉ dùng fact/activity đã kiểm duyệt làm nguồn tạo câu hỏi.
- Không dùng Supabase Realtime trong MVP. Cập nhật thanh tiến độ bằng request khi mở màn và polling nhẹ khi màn đang hiển thị.
- Không đưa dữ liệu học sinh thật vào test hoặc seed. Test dùng fixture tổng hợp và tài khoản test đã có quyền.

## 3. Mục tiêu và không thuộc mục tiêu

### Mục tiêu

1. Học sinh có thể tạo câu hỏi bốn lựa chọn, trong đó có một đáp án đúng gắn với fact đã kiểm duyệt.
2. Mỗi học sinh chỉ tạo tối đa ba câu hỏi mới trong một ngày theo giờ Việt Nam.
3. Phụ huynh có thể xem, duyệt, từ chối và yêu cầu sửa câu hỏi của con.
4. Câu hỏi đã duyệt được đưa vào một nhiệm vụ chung của lớp theo cơ chế luân phiên công bằng.
5. Mỗi học sinh có cơ hội trả lời trong cùng một khoảng thời gian; trả lời sai không bị phạt và luôn có giải thích.
6. Cả lớp cùng tích lũy đóng góp để mở khóa một địa danh, con dấu hoặc vật phẩm trong Hành trình.
7. Tác giả câu hỏi nhận phản hồi tích cực có cấu trúc từ các bạn.
8. Phụ huynh có thể kiểm soát việc con tham gia và xem lịch sử duyệt/tiến bộ của con.
9. Dữ liệu câu hỏi, đáp án, thời gian và quyền duyệt do server làm nguồn sự thật.

### Không thuộc mục tiêu MVP

- Đấu 1-1, đấu theo nhóm nhỏ hoặc chat trực tiếp trong một câu hỏi.
- Tính điểm theo tốc độ, phản xạ, streak hoặc số lần đăng nhập.
- Cho phép học sinh tự đăng câu hỏi không gắn nguồn.
- AI tự sinh câu hỏi, tự xác nhận đáp án hoặc tự duyệt nội dung.
- Duyệt nội dung theo quy mô nhiều lớp/trường.
- Bảng xếp hạng cá nhân hôm nay/tuần này.
- Đồng bộ offline cho lượt trả lời có tính đóng góp; lượt trả lời cần server xác nhận.

## 4. Nguyên tắc trải nghiệm

### 4.1. Cả lớp cùng thắng

Mỗi đáp án đúng hợp lệ đóng góp một đơn vị vào thanh năng lượng của lớp. Khi đạt mục tiêu, toàn lớp mở khóa phần thưởng chung. Học sinh vắng mặt hoặc tham gia ít không bị mất dấu, bị trừ điểm hay bị nêu tên.

### 4.2. Không dùng tốc độ làm thước đo năng lực

Tất cả học sinh active có thể trả lời câu hỏi trong thời gian mở của ngày. Không có năm “slot” đầu tiên và không có timestamp dùng để xếp thứ tự thắng/thua. Server chỉ ghi nhận thời điểm nhận để chống gửi trùng và xử lý ngày đóng.

### 4.3. Học sinh vừa là người học vừa là người dẫn đường

Người tạo câu hỏi được hiển thị tên hiển thị và avatar lớp trên thẻ câu hỏi. Sau khi trả lời, các bạn thấy lời giải thích của tác giả cùng nguồn kiến thức. Việc tạo câu hỏi được ghi nhận như một đóng góp, không trở thành một cuộc thi chất lượng giữa các tác giả.

### 4.4. Phản hồi tích cực có cấu trúc

MVP chỉ có các phản hồi định sẵn:

- “Câu hỏi thú vị”;
- “Mình học được điều mới”;
- “Giải thích dễ hiểu”;
- “Cảm ơn bạn”.

Không có dislike, downvote, điểm trừ hoặc bình luận tự do trong luồng Thách đố. Chat Bạn bè là luồng riêng và không được dùng để thay thế kiểm duyệt câu hỏi.

### 4.5. Tách trò chơi xã hội khỏi đánh giá học tập

Thách đố có thể tạo learning event để đề xuất ôn lại, nhưng không tự động biến đóng góp tập thể thành “đã thành thạo”. Bảng tiến bộ cá nhân sau này vẫn là nơi duy nhất thể hiện mức độ làm quen/thành thạo theo kỹ năng.

## 5. Vòng đời người dùng

### 5.1. Tạo câu hỏi — học sinh

Từ `Thách đố`, học sinh chọn “Tạo câu hỏi”. Form gồm:

1. Chọn một bài học và một mảnh kiến thức trong toàn bộ catalog.
2. Viết câu hỏi.
3. Tự viết đáp án chuẩn và ba phương án gây nhiễu; bốn lựa chọn không trùng nhau và không chứa nội dung bị cấm.
5. Viết lời giải thích ngắn, nêu vì sao đáp án đúng và/hoặc dẫn lại ý chính của nguồn.
6. Xem preview như một bạn cùng lớp sẽ nhìn thấy.
7. Gửi phụ huynh duyệt.

Giới hạn MVP:

- câu hỏi: 20–240 ký tự;
- mỗi phương án: 1–140 ký tự;
- lời giải thích: 20–500 ký tự;
- đúng chính xác bốn phương án khác nhau sau khi chuẩn hóa khoảng trắng và không phân biệt hoa thường;
- tối đa ba câu hỏi mới/ngày theo `Asia/Ho_Chi_Minh`;
- câu bị từ chối có thể sửa và gửi lại trên cùng bản ghi, không tiêu thụ thêm quota;
- tạo một câu hỏi mới luôn tiêu thụ một quota, kể cả khi sau đó phụ huynh từ chối;
- draft chưa gửi có thể lưu cục bộ, nhưng gửi lên server cần mạng.

Mảnh kiến thức là ngữ cảnh để học sinh nghiên cứu và sáng tạo, không phải đáp án bắt buộc. Server chỉ kiểm tra cấu trúc, độ dài, tính khác nhau và an toàn nội dung; không tự kết luận đáp án học sinh viết là đúng theo canonical answer. Phụ huynh là chốt kiểm duyệt nội dung cuối cùng trong MVP và chịu trách nhiệm về tính chính xác, phù hợp với chủ đề và mức độ an toàn của câu đố.

### 5.2. Duyệt — phụ huynh

Trong Parent Dashboard, phụ huynh mở hàng đợi câu hỏi của chính con và xem:

- tên bài/fact card và source reference;
- câu hỏi, bốn phương án và đáp án chuẩn do con viết;
- lời giải thích;
- thời điểm tạo và số quota đã dùng;
- preview hiển thị cho bạn học.

Khi phụ huynh chọn phê duyệt, hệ thống mở modal cảnh báo rằng phụ huynh chịu trách nhiệm về tính chính xác và phù hợp với chủ đề của câu đố. Phụ huynh có thể chọn “Xem lại” để quay lại hàng đợi hoặc xác nhận “Phê duyệt câu hỏi”. Chỉ sau xác nhận này request approve mới được gửi.

Phụ huynh chọn một trong hai kết quả:

- `approve`: câu hỏi đủ phù hợp để đưa vào hàng đợi phát hành;
- `request_revision`: từ chối kèm lý do ngắn, để học sinh sửa lại cùng phiên bản.

Phụ huynh không thể duyệt câu hỏi của học sinh khác qua parent grant. Không có câu hỏi nào ở trạng thái pending được hiển thị cho lớp. Nếu phụ huynh chưa xử lý, câu hỏi giữ nguyên pending và không tự động hết hạn quota.

Parent grant hiện có là ranh giới quyền. Không lưu raw PIN, raw parent grant hoặc token vào dữ liệu câu hỏi.

### 5.3. Chọn câu hỏi cho nhiệm vụ ngày

Khi học sinh đầu tiên mở Thách đố trong một ngày, server tạo round ngày đó trong transaction có khóa idempotent. Round dùng giờ `Asia/Ho_Chi_Minh`, từ 00:00:00 đến trước 00:00:00 ngày hôm sau.

Bộ chọn câu hỏi:

1. chỉ lấy câu hỏi đã `approved` và chưa bị rút/void;
2. tối đa một câu của mỗi tác giả trong cùng một ngày;
3. ưu tiên câu chưa từng được phát hành hoặc lâu chưa được phát hành;
4. khi các câu có cùng mức ưu tiên, chọn ngẫu nhiên có seed cố định của ngày để mọi request trả cùng kết quả;
5. không phát hành lại cùng câu trong bảy ngày nếu còn câu hợp lệ khác;
6. nếu có ít hơn năm câu hợp lệ, phát hành số câu hiện có và hiển thị trạng thái “đang chờ thêm câu hỏi”; không tự tạo nội dung giả.

MVP hướng tới tối đa năm câu hỏi/ngày, nhưng con số này là số câu trong round chứ không phải số học sinh được quyền trả lời.

Tác giả không trả lời câu hỏi do chính mình tạo trong round đó. Tác giả vẫn xem được câu hỏi, lời giải thích và các phản hồi sau khi câu hỏi được phát hành.

### 5.4. Trả lời và phản hồi — học sinh

Mỗi học sinh active có một lượt trả lời tính đóng góp cho mỗi câu hỏi của round. Sau khi gửi:

- nếu đúng: cộng một đơn vị đóng góp cho lớp và hiển thị phản hồi tích cực;
- nếu sai: không trừ điểm, không làm mất cơ hội học; hiển thị đáp án đúng, lời giải thích và source reference;
- nếu double tap hoặc mạng gửi lại: server trả lại kết quả đã ghi, không cộng đóng góp lần hai;
- nếu round đã đóng: chỉ cho phép chế độ `practice`, không cộng đóng góp;
- nếu câu hỏi bị void sau khi đã có lượt trả lời: tất cả lượt liên quan được giữ lịch sử nhưng không ai bị phạt; đóng góp của câu đó được loại khỏi tổng và round được tính lại.

Sau feedback, nút “Ôn lại câu này” mở lại nội dung ở chế độ practice. Lượt practice có thể lặp lại và không ảnh hưởng thanh tiến độ tập thể.

### 5.5. Mục tiêu chung và phần thưởng

Mỗi correct scored attempt đóng góp một `classContribution = 1`. Mục tiêu ngày mặc định:

```text
target = min(60, max(10, activeStudentCount * 2))
```

`activeStudentCount` là số tài khoản role `student` và `active = true` tại thời điểm tạo round. Công thức này chỉ dùng để tạo cảm giác tiến bộ; không dùng để xếp loại lớp.

Khi tổng đóng góp đạt target:

- thanh năng lượng chuyển sang hoàn thành;
- toàn lớp nhận cùng một hiệu ứng/mốc Hành trình;
- phần thưởng được cấp idempotent theo ngày;
- học sinh quay lại sau vẫn nhìn thấy mốc đã mở;
- không có thông báo “bạn chưa đóng góp đủ”.

Nếu chưa đạt target khi hết ngày, thanh tiến độ được lưu trong lịch sử tuần và lớp tiếp tục với một round mới; không reset thành thất bại.

### 5.6. Bản đồ tuần này

Tuần được tính từ thứ Hai 00:00 đến Chủ nhật 23:59:59 theo `Asia/Ho_Chi_Minh`.

Màn tuần hiển thị:

- số ngày lớp đã có round;
- tổng mảnh bản đồ đã mở;
- các chủ đề đã được khám phá;
- danh sách câu hỏi nổi bật theo trạng thái đã phát hành, không theo số vote;
- danh hiệu đóng góp không độc quyền;
- thẻ riêng của học sinh: số câu đã tạo, số câu đã trả lời, số lần ôn lại và chủ đề đã chạm tới.

Không hiển thị tổng điểm của từng bạn theo thứ tự, vị trí thứ hạng, “top/bottom”, phần trăm thấp nhất hoặc lịch sử trả lời của bạn khác.

## 6. Danh hiệu và tương tác tích cực

Danh hiệu được cấp theo điều kiện riêng, không cạnh tranh và có thể trao cho nhiều học sinh:

| Danh hiệu | Điều kiện | Phạm vi hiển thị |
|---|---|---|
| Người dẫn đường | Có câu hỏi được phụ huynh duyệt và phát hành | Thẻ câu hỏi, tuần |
| Nhà khám phá | Hoàn thành ít nhất một lượt trả lời có feedback | Cá nhân, tuần |
| Người học kiên trì | Ôn lại một câu đã trả lời sai | Cá nhân, tuần |
| Người giải thích dễ hiểu | Câu hỏi có feedback “Giải thích dễ hiểu” | Tác giả và phụ huynh |
| Người mở khóa | Có đóng góp vào mốc chung | Cá nhân, mốc lớp |

Không giới hạn số người nhận danh hiệu. Không dùng danh hiệu để tạo một thứ hạng ngầm bằng cách sắp xếp theo số lượng.

## 7. Kiểm duyệt và xử lý bất đồng

### 7.1. Kiểm tra trước khi gửi

Client và server cùng kiểm tra hình thức; server là nơi quyết định cuối cùng:

- fact card tồn tại và đang ở trạng thái verified;
- lesson/source version đúng với catalog hiện hành;
- câu hỏi đủ dài và không vượt giới hạn;
- bốn phương án khác nhau;
- đáp án đúng khớp fact card;
- không có HTML/script, URL, thông tin liên hệ, tên người khác hoặc nội dung xúc phạm theo bộ lọc cơ bản;
- quota ngày chưa vượt ba câu hỏi mới;
- account đang là student active thuộc lớp.

Client validation chỉ giúp phản hồi nhanh; không được bỏ qua server validation.

### 7.2. Câu hỏi đã phát hành không sửa tại chỗ

Sau khi được chọn vào round, nội dung câu hỏi bị khóa. Mọi chỉnh sửa tạo revision mới và quay về `pending_parent_review`. Điều này bảo đảm người đã trả lời không bị thay đổi đáp án sau đó.

### 7.3. Báo câu hỏi có vấn đề

Mỗi thẻ có nút “Báo câu hỏi” với ba lý do định sẵn:

- “Đáp án hoặc nguồn có vẻ chưa đúng”;
- “Câu hỏi khó hiểu”;
- “Nội dung không phù hợp”.

Khi có report, câu hỏi không được đưa vào round mới cho tới khi parent/admin xử lý. Round đang chạy vẫn hiển thị cho người đã trả lời nhưng trạng thái báo rõ. Nếu xác định có lỗi, câu hỏi chuyển `voided`; không ai bị trừ điểm hoặc mất phần thưởng.

Không công khai người báo và không hiển thị số report cho học sinh.

### 7.4. Quyền kiểm soát của phụ huynh

Parent Dashboard có các điều khiển:

- cho phép/tạm dừng con tạo câu hỏi;
- cho phép/tạm dừng con tham gia social round;
- rút một câu hỏi đã duyệt khỏi hàng đợi/round tương lai;
- xem lịch sử quyết định và lý do từ chối;
- xem đóng góp của chính con mà không xem lịch sử chi tiết của bạn khác.

Hiển thị trong lớp dùng `displayName` và `avatarId` của roster; không hiển thị ngày sinh, PIN, thông tin phụ huynh hoặc dữ liệu hồ sơ khác.

## 8. Trạng thái và hợp đồng dữ liệu

### 8.1. Question lifecycle

```text
draft
  -> pending_parent_review
  -> approved
  -> featured
  -> closed

pending_parent_review --request_revision--> draft
approved              -> withdrawn
featured              -> voided
closed                -> archived
```

`featured` nghĩa là đã được gắn vào ít nhất một daily round. `closed` nghĩa là round chứa câu hỏi đã qua thời gian trả lời tính đóng góp. `voided` là trạng thái xử lý lỗi; không phải hình phạt tác giả.

`request_revision` là hành động review, không phải một giá trị được lưu trong `ChallengeQuestionStatus`.

### 8.2. Shared contracts dự kiến

Các kiểu dưới đây là contract định hướng cho implementation plan; tên file đề xuất là `shared/challenge-contracts.ts`.

```ts
export type ChallengeQuestionStatus =
  | 'draft'
  | 'pending_parent_review'
  | 'approved'
  | 'featured'
  | 'closed'
  | 'withdrawn'
  | 'voided'
  | 'archived';

export type ChallengeReactionType =
  | 'interesting'
  | 'learned'
  | 'clear_explanation'
  | 'thanks';

export type ChallengeOption = { id: string; text: string };

export type ChallengeAuthorView = {
  id: string;
  displayName: string;
  avatarId: string;
};

export type ChallengeQuestionView = {
  id: string;
  roundItemId: string;
  lessonId: string;
  lessonTitle: string;
  author: ChallengeAuthorView;
  prompt: string;
  options: ChallengeOption[];
  closesAt: string;
  answeredByMe: boolean;
  practiceOnly: boolean;
};

export type ChallengeAnswerResult = {
  questionId: string;
  selectedOptionId: string;
  correct: boolean;
  correctOptionId: string;
  explanation: string;
  sourceLabel: string;
  classContributionAdded: boolean;
  duplicate: boolean;
};

export type ChallengeTodayResponse = {
  roundDate: string;
  roundStatus: 'open' | 'closed' | 'empty';
  questions: ChallengeQuestionView[];
  classProgress: { current: number; target: number; completed: boolean };
  myContribution: { correctAnswers: number; questionsCreated: number; questionsRevisited: number };
};

export type ChallengeWeeklyResponse = {
  weekStart: string;
  weekEnd: string;
  classProgress: { current: number; target: number; completedDays: number };
  topics: { lessonId: string; title: string; questionCount: number }[];
  recognitions: { type: string; recipientIds: string[] }[];
  mySummary: { questionsCreated: number; correctAnswers: number; revisits: number };
};
```

`ChallengeQuestionView` tuyệt đối không trả `correctOptionId` hoặc `explanation` trước khi học sinh gửi đáp án. Parent/admin DTO mới được chứa đáp án, source locator và audit fields.

### 8.3. Hợp đồng authoring và review

```ts
export type CreateChallengeQuestionInput = {
  sourceFactId: string;
  prompt: string;
  correctAnswer: string;
  distractors: [string, string, string];
  explanation: string;
};

export type ReviewChallengeQuestionInput =
  | { decision: 'approve' }
  | { decision: 'request_revision'; reason: string };
```

`sourceFactId` là khóa tới catalog mảnh kiến thức, không phải URL do client tự gửi. Server kiểm tra source version, lưu `correctAnswer` do học sinh gửi và dựng `correctOptionId` server-side từ vị trí đáp án đó; server không thay thế đáp án bằng canonical answer của nguồn.

## 9. Lưu trữ và API

### 9.1. PostgreSQL trong `hoc_vui_private`

MVP thêm các bảng sau, không cấp quyền trực tiếp cho browser:

1. `challenge_questions`
   - `id uuid primary key`;
   - `author_id uuid references accounts(id)`;
   - `source_fact_id text not null`;
   - `source_version text not null`;
   - `lesson_id text not null`;
   - `prompt text not null`;
   - `options jsonb not null` gồm đúng bốn option;
   - `correct_option_id text not null`;
   - `explanation text not null`;
   - `revision integer not null`;
   - `status text not null` theo lifecycle;
   - `created_at`, `updated_at`, `submitted_at`, `reviewed_at`, `featured_at`, `closed_at`;
   - `review_reason text null`;
   - các check constraint cho độ dài, bốn option và trạng thái hợp lệ.
2. `challenge_rounds`
   - `round_date date primary key`;
   - `timezone text not null` luôn là `Asia/Ho_Chi_Minh` trong MVP;
   - `status text` gồm `open`, `closed`, `empty`;
   - `target_contributions integer not null`;
   - `created_at`, `closed_at`.
3. `challenge_round_items`
   - `id uuid primary key`;
   - `round_date date references challenge_rounds(round_date)`;
   - `question_id uuid references challenge_questions(id)`;
   - `position integer not null`;
   - unique `(round_date, question_id)` và unique `(round_date, position)`.
4. `challenge_attempts`
   - `id uuid primary key`;
   - `round_item_id uuid references challenge_round_items(id)`;
   - `student_id uuid references accounts(id)`;
   - `selected_option_id text not null`;
   - `submitted_at timestamptz not null` do server tạo;
   - `correct boolean not null` do server tính;
   - `counts_for_contribution boolean not null`;
   - unique `(round_item_id, student_id)`.
5. `challenge_reactions`
   - `round_item_id uuid references challenge_round_items(id)`;
   - `actor_id uuid references accounts(id)`;
   - `reaction_type text`;
   - primary key `(round_item_id, actor_id, reaction_type)`.
6. `challenge_reports`
   - `id uuid primary key`;
   - `round_item_id uuid references challenge_round_items(id)`;
   - `reporter_id uuid references accounts(id)`;
   - `reason text`;
   - `status text` gồm `open`, `dismissed`, `voided`;
   - `created_at`, `resolved_at`;
   - unique `(round_item_id, reporter_id, reason)`.

Vì app chỉ có một lớp, roster được suy ra từ `accounts where role = 'student' and active = true`; không tạo classroom membership tổng quát trong MVP. Hằng số scope này phải được ghi rõ trong service để không vô tình biến sản phẩm thành danh sách toàn hệ thống sau này.

RLS/private-schema policy tiếp tục chặn `public`, `anon` và `authenticated`; chỉ runtime database role truy cập qua server. Tạo index cho status/author/day, round item, attempt lookup, reaction và report.

### 9.2. API student

- `GET /api/me/challenge/today`
  - xác thực full student session;
  - tạo hoặc đọc round hiện tại idempotently;
  - trả DTO không chứa đáp án đúng trước khi trả lời.
- `POST /api/me/challenge/questions`
  - body là `CreateChallengeQuestionInput`;
  - lấy `author_id` từ session;
  - kiểm tra quota, active student, source fact và nội dung;
  - trả câu hỏi ở trạng thái `pending_parent_review`.
- `GET /api/me/challenge/questions/mine`
  - chỉ trả câu hỏi của chính học sinh, có trạng thái và lý do từ chối;
  - phân trang tối đa 50 bản ghi.
- `PATCH /api/me/challenge/questions/:id`
  - chỉ cho sửa bản ghi của chính tác giả khi `draft` hoặc `pending_parent_review` bị yêu cầu sửa;
  - mỗi sửa tăng revision và yêu cầu duyệt lại;
  - không cho sửa câu đã `featured`/`closed`.
- `POST /api/me/challenge/items/:id/attempt`
  - body chỉ gồm `selectedOptionId` và `attemptId` client tạo;
  - server lấy student từ session, tính correct, khóa unique và trả kết quả;
  - không nhận `correct`, `submittedAt`, `studentId` hoặc contribution từ client.
- `POST /api/me/challenge/items/:id/reactions`
  - chỉ nhận một trong bốn reaction type;
  - idempotent theo actor/item/type.
- `POST /api/me/challenge/items/:id/report`
  - chỉ nhận reason trong allowlist;
  - tạo report idempotent.
- `GET /api/me/challenge/week`
  - trả bản đồ tuần, chủ đề, recognition và summary riêng của người gọi;
  - không trả bảng xếp hạng.

### 9.3. API parent/admin

- `GET /api/parent/challenge/questions/pending`
  - parent grant bắt buộc;
  - chỉ trả câu hỏi của student được grant bảo vệ;
  - có source, đáp án đúng, preview và audit fields.
- `POST /api/parent/challenge/questions/:id/review`
  - body là `ReviewChallengeQuestionInput`;
  - `approve` hoặc `request_revision`;
  - kiểm tra câu hỏi thuộc đúng student của parent grant;
  - không cho review lại revision cũ.
- `POST /api/parent/challenge/questions/:id/withdraw`
  - rút câu hỏi của chính con khỏi hàng đợi/round tương lai;
  - không xóa lịch sử attempt.
- `PATCH /api/parent/challenge/settings`
  - bật/tắt quyền tạo câu hỏi và tham gia social round cho chính con.
- Admin route nội bộ để xử lý report/void được tách riêng khỏi parent grant và chỉ dùng cho operator đã xác thực; không hiển thị trong UI học sinh.

### 9.4. Không có API leaderboard

Không tạo endpoint trả danh sách học sinh được sắp xếp theo điểm. Các endpoint summary chỉ trả aggregate class progress và summary riêng của actor. Nếu sau này cần số liệu vận hành, admin-only report phải tách khỏi trải nghiệm học sinh và không được đưa vào client bundle.

## 10. Quy tắc server và bảo mật

- Server dùng `clock()`/database time cho ngày, trạng thái round và `submitted_at`; không tin giờ client.
- Quota ba câu/ngày khóa theo `author_id + local_date`, được kiểm tra trong transaction để chống gửi song song.
- Tạo round dùng advisory lock hoặc unique insert để hai request đồng thời không tạo hai kết quả khác nhau.
- Attempt dùng unique constraint và idempotency key; double tap không tạo đóng góp lặp.
- Student không thể xem đáp án trước attempt, tự trả lời câu của mình, tự duyệt, sửa câu đã phát hành hoặc gửi thay cho account khác.
- Parent grant chỉ có quyền trên student đã được unlock; không nhận `studentId` tùy ý từ browser để mở rộng phạm vi.
- Roster chỉ gồm active students; admin/inactive account không được tạo, trả lời hoặc nhận dữ liệu peer.
- Nội dung render bằng text, không `dangerouslySetInnerHTML`, không cho HTML/URL tự do.
- Không lưu raw token, PIN, parent grant, IP hoặc thiết bị chi tiết vào bảng challenge trong MVP.
- Tất cả bảng private có RLS và revoke giống các bảng classroom hiện có.
- Không dùng thông báo “bạn đứng cuối”, “bạn thua”, “bạn chậm nhất” hoặc các diễn đạt tương đương.

## 11. UI và bố cục

### 11.1. Trang Thách đố

Header hiển thị:

- tiêu đề “Thách đố tiếp sức”;
- câu dẫn “Mỗi câu đúng giúp cả lớp tiến thêm một bước”;
- thanh năng lượng `current/target` dạng đóng góp chung;
- nút “Tạo câu hỏi” và số quota còn lại của học sinh;
- tab “Hôm nay”, “Câu hỏi của em”, “Tuần này”.

Thẻ câu hỏi hiển thị author avatar/name, bài học, prompt, bốn nút đáp án và trạng thái đã trả lời. Không hiển thị điểm cá nhân hoặc thời gian đã dùng.

### 11.2. Form tạo câu hỏi

Form chia bốn bước ngắn:

1. Chọn bài/mảnh kiến thức.
2. Viết câu hỏi.
3. Tự viết đáp án chuẩn và ba phương án gây nhiễu.
4. Viết lời giải thích và preview.

Hiển thị counter quota “Còn X/3 câu hôm nay”. Khi gửi, UI chuyển sang “Đang chờ phụ huynh duyệt”, không nói “đã đăng”.

### 11.3. Phản hồi sau trả lời

Feedback luôn gồm trạng thái đúng/sai, giải thích và source label. Sai dùng ngôn ngữ “Mình cùng xem lại nhé”, không dùng màu/âm thanh làm học sinh xấu hổ. Nút tiếp theo là “Ôn lại” hoặc “Khám phá câu tiếp theo”, không phải “đánh bại bạn khác”.

### 11.4. Bản đồ tuần

Dùng bản đồ Hành trình hiện có: mỗi ngày hoàn thành là một mốc; mỗi chủ đề là một vùng kiến thức; recognition hiển thị như sticker có thể lặp. Không dùng cột số, thứ tự dọc hoặc màu sắc tạo cảm giác cao/thấp giữa các bạn.

### 11.5. Responsive và accessibility

- vùng chạm tối thiểu 48px;
- bốn option có thứ tự bàn phím và focus rõ;
- feedback không chỉ dựa vào màu;
- hỗ trợ reduced motion;
- portrait xếp meter → câu hỏi → feedback;
- landscape giữ rail/dock hiện có, modal không che mất câu hỏi;
- khi font tăng 200%, không mất nút gửi, nút duyệt hoặc lời giải thích;
- aria-label chứa trạng thái đã trả lời, pending và quota;
- không dùng hover làm điều kiện hiểu câu hỏi.

## 12. Offline, đồng bộ và lỗi

- Draft authoring có thể lưu cục bộ dưới key có version; khi reload, học sinh được khôi phục draft chưa gửi.
- Gửi câu hỏi, duyệt, lấy round, attempt, reaction và report đều cần mạng.
- Khi mạng mất, app không hiển thị “đã gửi”, “đã đúng” hoặc “đã đóng góp” nếu chưa nhận acknowledgement từ server.
- Nếu attempt gửi thất bại, lựa chọn vẫn được giữ trong màn hiện tại để retry; không tạo thêm attemptId cho cùng thao tác retry.
- Nếu round đóng trong lúc màn đang mở, server trả conflict rõ ràng; UI chuyển câu sang practice.
- Nếu một question bị void, UI giải thích rằng câu hỏi được tạm dừng và không ảnh hưởng kết quả của học sinh.
- Nếu parent review thất bại, pending state và draft không bị mất; UI có retry.
- API unavailable giữ dữ liệu round lần trước ở trạng thái stale và hiển thị thời điểm cập nhật; không cho thao tác ghi mới cho tới khi có mạng.

## 13. Learning events và tiến bộ

Challenge không mở rộng `LearningEventType` hiện có một cách tùy tiện. MVP ghi challenge activity ở namespace riêng hoặc mở rộng contract có version, tối thiểu gồm:

- `challenge_question_created`;
- `challenge_question_approved`;
- `challenge_answer_submitted`;
- `challenge_feedback_viewed`;
- `challenge_practice_revisited`.

Các event phải chứa `eventId`, `studentId` suy ra từ session, `questionId`, `sourceFactId`, `questionRevision`, `clientTime` tùy chọn và `receivedAt` server. Event idempotent; không ghi `speedScore` vì không tồn tại trong mô hình này.

Chỉ `challenge_practice_revisited` và kết quả answer có source/lesson rõ mới được dùng làm tín hiệu đề xuất ôn. Không tự cộng vào `completedMissions`, không cấp stamp học bài thay cho lesson engine và không đánh dấu “mastered” chỉ vì trả lời đúng một lần.

## 14. Tiêu chí nghiệm thu

### Authoring và parent review

- Học sinh tạo câu hỏi có source fact verified và nhận trạng thái pending.
- Câu thứ tư trong cùng ngày bị từ chối với mã quota; câu bị yêu cầu sửa không tiêu thụ thêm quota.
- Học sinh không thể gửi câu có 3/5 option, option trùng, prompt rỗng hoặc correct option không thuộc fact card.
- Parent A chỉ thấy câu của con A; parent grant không thể duyệt câu của con B.
- Câu pending không xuất hiện trong round; chỉ approved mới được chọn.
- Sửa câu đã featured bị từ chối; sửa bản bị request revision tạo revision mới và yêu cầu duyệt lại.

### Daily round và công bằng

- Hai request tạo round đồng thời nhận cùng round và cùng items.
- Round chọn tối đa một câu/tác giả/ngày, ưu tiên theo rotation và không lặp trong bảy ngày nếu còn câu khác.
- Nếu không có câu approved, UI hiển thị empty state và không tự sinh nội dung.
- Tất cả active students có thể mở và trả lời, không phụ thuộc ai bấm trước.
- Tác giả không thể nhận contribution bằng cách trả lời câu của mình.
- Một học sinh trả lời lại cùng item không tạo contribution thứ hai.
- Không có DTO/client route nào trả leaderboard hoặc correct option trước attempt.

### Feedback và mục tiêu chung

- Đáp án đúng hiển thị giải thích và source.
- Đáp án sai không trừ điểm, không làm giảm tiến độ cá nhân/lớp.
- Contribution chỉ tăng một lần sau server acknowledgement.
- Đạt target cấp mốc chung idempotently; reload không cấp mốc lần hai.
- Câu hỏi void không làm mất hay trừ thành tích của học sinh.
- Bản tuần hiển thị aggregate và summary của actor, không hiển thị thứ hạng.

### Privacy và resilience

- Không trả PIN, token, birthDate, parent data, inactive/admin account hoặc raw last-seen.
- Attempt giả mạo studentId/correct/submittedAt bị từ chối.
- HTML/script trong prompt, option, explanation và report reason được từ chối hoặc render như text.
- Network failure không tạo success giả và không làm mất draft.
- `npm run typecheck`, `npm run typecheck:server`, `npm run test`, `npm run build` phải được chạy fresh ở phase verification; test database/API phải có fixture synthetic riêng.

## 15. Kế hoạch kiểm thử

### Pure/domain tests

- validate prompt/options/distractors/explanation;
- normalize duplicate option;
- resolve local day/week boundaries in `Asia/Ho_Chi_Minh`;
- select fair round items deterministically;
- compute target and class contribution;
- question lifecycle transitions;
- void/recompute semantics;
- idempotent award and attempt.

### Repository/service tests

- quota race và quota ngày mới;
- source fact allowlist;
- one active classroom roster;
- parent scope;
- round creation lock;
- one attempt/student/item;
- author self-answer rejection;
- report idempotency;
- reaction uniqueness;
- no answer leakage.

### API tests

- student full-session và change-only/admin rejection;
- parent grant thiếu/hết hạn/sai student;
- all route status codes 400/401/403/404/409/429/503;
- stale round, duplicate attempt, voided item và unavailable database;
- response DTO snapshot không chứa correct answer trước attempt hoặc private fields.

### Component/E2E tests

- rail mở đúng Thách đố;
- create → pending → parent approve → round item xuất hiện;
- học sinh A và B trả lời cùng câu; cả hai có cơ hội, không có top-five lock;
- sai → feedback → practice;
- target đạt → animation/mốc chung chỉ cấp một lần;
- tuần hiển thị aggregate và recognition, không có bảng rank;
- mobile/landscape, keyboard focus, Escape/backdrop, reduced motion;
- refresh giữa form, double tap submit, offline retry.

## 16. Rollout theo phase

### P0 — Contract và nguồn kiến thức

Tạo catalog mảnh kiến thức cho đủ các bài học, giữ nhóm verified fact với source locator/canonical answer và nhóm lesson-reference được đánh dấu để phụ huynh kiểm tra. Viết policy nội dung, trạng thái, DTO và test domain. Chưa mở UI cho học sinh.

### P1 — Tạo câu hỏi và phụ huynh duyệt

Xây form source-anchored, quota server-side, parent review queue, revision và audit. Acceptance là câu pending/approve/revise đúng qua API và UI.

### P2 — Round ngày và feedback

Xây daily round tối đa năm câu, fair rotation, answer/feedback/practice, aggregate contribution và shared unlock. Không làm ranking.

### P3 — Phản hồi xã hội và bản tuần

Thêm reaction định sẵn, recognition nhiều người, weekly map, parent controls, report/void và lớp lỗi/resilience.

### P4 — Pilot trong đúng lớp

Chạy với fixture/tài khoản được phụ huynh cho phép, quan sát ít nhất một chu kỳ tuần. Ghi:

- số học sinh tham gia và số ngày quay lại;
- tỷ lệ câu hỏi được duyệt, yêu cầu sửa và bị void;
- tỷ lệ xem feedback và quay lại practice;
- phân bố tác giả/câu hỏi được phát hành;
- số report và thời gian xử lý;
- phản hồi định tính về cảm giác bị bỏ lại, tranh cãi hoặc trêu chọc.

Không dùng dữ liệu một lớp để tuyên bố hiệu quả sư phạm có tính đại diện. Nếu xuất hiện câu hỏi sai lặp lại, report không xử lý được hoặc dấu hiệu trêu chọc, tạm dừng phát hành round mới để sửa policy/service trước khi mở rộng.

## 17. Ranh giới triển khai

Trong phạm vi đặc tả này:

- dùng lại auth, parent grant, roster, content catalog và design system hiện có;
- thêm server boundary và private tables cần thiết;
- không truy cập trực tiếp Supabase từ browser;
- không dùng Firebase Functions, Realtime, push notification hoặc dịch vụ trả phí;
- không deploy, push GitHub, tạo PR hoặc thay đổi Git lifecycle trong bước đặc tả;
- không viết lại “Bảng xếp hạng” cũ thành một bảng điểm trá hình;
- không thay đổi luồng học bài, phần thưởng lesson hoặc dữ liệu cá nhân ngoài các contract được nêu.

## 18. Quyết định mở rộng sau MVP

Chỉ xem xét chế độ thi đua tốc độ hoặc bảng điểm cá nhân nếu có sự đồng ý riêng của phụ huynh và bằng chứng chơi thử cho thấy cơ chế đó không tạo áp lực trong lớp. Nếu được xem xét, nó phải là mode phụ, opt-in, không ảnh hưởng tiến bộ học tập, không hiển thị nhóm cuối và không thay thế “Cùng nhau mở khóa”.

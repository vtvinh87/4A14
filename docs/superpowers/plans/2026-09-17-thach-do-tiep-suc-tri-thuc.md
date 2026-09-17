# Thách đố tiếp sức tri thức - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai tính năng “Thách đố tiếp sức tri thức” cho đúng một lớp học, trong đó học sinh cùng đóng góp vào mục tiêu kiến thức chung bằng cách tạo, duyệt, trả lời và phản hồi các câu đố lịch sử. Tính năng phải khuyến khích tương tác tích cực, không xếp hạng cá nhân, không thưởng tốc độ, không phạt học sinh vắng mặt và không làm lộ đáp án trước khi trả lời.

**Architecture:** Browser React/Vite gọi các route hiện có trong `server/app.ts`; server xác thực bằng session hiện tại, đọc/ghi PostgreSQL private schema qua repository; Supabase Edge Function chỉ làm adapter vào app server. Dữ liệu nguồn câu đố dùng catalog đủ các mảnh kiến thức của bài học, trong đó fact đã review và lesson-reference được đánh dấu riêng. Các nghiệp vụ được tách thành source/validation, round rules, authoring, review, play, social và weekly services để từng vertical slice có thể kiểm thử độc lập. Không dùng Supabase Realtime trong MVP; màn hình đang mở sẽ refresh/poll có kiểm soát.

**Tech Stack:** React, TypeScript, Vite, Vitest, Node server hiện có, PostgreSQL private schema, Supabase migrations/Edge adapter, Firebase Hosting cho bước triển khai sau khi có phê duyệt riêng.

## Global Constraints

- Đặc tả đã được người dùng phê duyệt là nguồn yêu cầu duy nhất: [2026-09-17-thach-do-tiep-suc-tri-thuc-design.md](/Volumes/Pictures/Projects/Hoc_Vui/docs/superpowers/specs/2026-09-17-thach-do-tiep-suc-tri-thuc-design.md).
- Phạm vi MVP chỉ có một lớp. Roster là toàn bộ account có `role = student` và `active = true`; không thêm bảng membership/classroom.
- Không xây dựng bảng xếp hạng cá nhân, thứ hạng, huy hiệu “đứng đầu”, bảng điểm theo tốc độ hoặc cơ chế chỉ nhận năm người trả lời đầu tiên. Màn hình tuần chỉ hiển thị tiến độ chung và các đóng góp tích cực.
- Một học sinh được tạo tối đa 3 câu hỏi mới theo ngày `Asia/Ho_Chi_Minh`. Bản ghi mới tiêu thụ quota ngay cả khi bị từ chối; chỉnh sửa bản đang bị từ chối không tiêu thụ thêm quota.
- Câu hỏi là MCQ bốn lựa chọn. Học sinh tự cung cấp câu hỏi, đáp án chuẩn, ba distractor và lời giải thích dựa trên mảnh kiến thức đã chọn. Server không ép đáp án theo canonical answer; phụ huynh phải xem cảnh báo trách nhiệm và duyệt trước khi câu hỏi được đưa vào vòng chơi.
- Vòng ngày chọn tối đa 5 câu hỏi đã duyệt, tối đa một câu cho mỗi tác giả, xoay vòng công bằng và cố gắng tránh câu đã xuất hiện trong bảy ngày gần nhất. Tác giả không được trả lời câu do mình tạo.
- Mỗi lần trả lời đúng được một `classContribution = 1` cho mục tiêu chung. Mục tiêu ngày là `min(60, max(10, activeStudentCount * 2))`. Không trừ điểm khi trả lời sai, vắng mặt hoặc tham gia ít.
- Ranh giới ngày là 00:00 đến trước 00:00 kế tiếp theo `Asia/Ho_Chi_Minh`; tuần bắt đầu thứ Hai và kết thúc Chủ nhật theo cùng timezone.
- Public DTO tuyệt đối không trả `correctOptionId`, lời giải thích hoặc dữ liệu đáp án trước khi học sinh gửi câu trả lời. DTO của chính tác giả và phụ huynh có thể hiển thị dữ liệu cần thiết cho việc chỉnh sửa/duyệt.
- Catalog phải bao phủ đủ 29 bài học. Mười fact trong `source/mvp-content-reviewed.json` giữ nhãn reviewed; các mảnh lấy từ lesson seed khác giữ nhãn lesson-reference để không bị hiểu là đã kiểm chứng nguồn độc lập. Không sửa file nguồn gốc để phục vụ feature.
- Browser không truy cập trực tiếp Supabase. Không thêm secret vào client, không nhập dữ liệu thật của trẻ vào fixture/test.
- Các thao tác ghi mạng chỉ hiển thị thành công sau server ACK. Retry phải giữ cùng idempotency key; không tạo bản ghi nhân đôi.
- Report có thể khóa câu hỏi khỏi lần chọn tiếp theo; nếu câu bị void thì giữ lịch sử và không phạt cá nhân/thu hồi phần thưởng chung đã cấp, nhưng contribution của item đó phải bị loại khỏi aggregate round và round được tính lại.
- Reaction chỉ là tín hiệu tích cực (`interesting`, `learned`, `clear_explanation`, `thanks`); không có downvote và không có bình luận tự do trong MVP.
- Không mở khóa lesson, không đánh dấu mastered/completed và không mở rộng tùy tiện `LearningEventType`; event riêng dùng namespace `challenge_events`.
- Giữ nguyên các thay đổi chưa commit hiện có, đặc biệt phần hội thoại Pet trong `src/views/JourneyView.tsx`, `src/views/PetView.tsx` và các file motion/test liên quan. Khi tích hợp feature rail phải patch tối thiểu, không format lại file ngoài phạm vi.
- Chưa commit, push GitHub, deploy Firebase hoặc thay đổi cloud trong giai đoạn lập plan này. Những việc đó là phase riêng và cần phê duyệt tác động tương ứng sau khi code đã được verify.

## Dependency Graph and Delivery Gates

```text
P0 Source + contracts + rules
 ├─ P1 Authoring DB/repository → P2 Student authoring API/UI
 │                         └→ P3 Parent review/control API/UI
 └─ P4 Play DB/repository + round service → P5 Daily API/UI/dialog
                                      └→ P6 Social + weekly API/UI
P7 Integration, resilience, accessibility and release verification
```

Các checkpoint bắt buộc:

- Sau P0: contracts, source allowlist, validation, date/round/recognition rules đều có test xanh.
- Sau P1-P3: một fixture student có thể tạo, sửa, xem trạng thái; fixture parent chỉ thấy đúng child được grant và có thể approve/request revision/withdraw.
- Sau P4-P5: hai student cùng trả lời được cùng một câu; đáp án không lộ trước attempt; duplicate retry trả cùng kết quả; không có “top five” lock.
- Sau P6: tuần hiển thị tiến độ lớp, recognition và tín hiệu tích cực, nhưng không có bảng xếp hạng hay sort theo cá nhân.
- P7 chỉ được gọi là đạt khi fresh typecheck, unit/API/E2E, build, edge-runtime check, migration contract và responsive/accessibility smoke đều có bằng chứng.

## File Map

### Files sẽ tạo

- `shared/challenge-source.ts`
- `shared/challenge-contracts.ts`
- `server/challenge/validation.ts`
- `server/challenge/validation.test.ts`
- `server/challenge/roundRules.ts`
- `server/challenge/roundRules.test.ts`
- `server/challenge/recognition.ts`
- `server/challenge/recognition.test.ts`
- `supabase/migrations/20260917100000_challenge_authoring.sql`
- `server/challenge/authoringTypes.ts`
- `server/challenge/memoryAuthoringRepository.ts`
- `server/challenge/postgresAuthoringRepository.ts`
- `server/challenge/authoringRepository.test.ts`
- `server/challenge/authoringService.ts`
- `server/challenge/authoringService.test.ts`
- `src/challenge/drafts.ts`
- `src/challenge/drafts.test.ts`
- `src/components/ChallengeComposer.tsx`
- `src/components/ChallengeComposer.test.tsx`
- `server/challenge/reviewService.ts`
- `server/challenge/reviewService.test.ts`
- `src/challenge/useParentChallengeReview.ts`
- `src/challenge/useParentChallengeReview.test.ts`
- `src/components/parent/ChallengeReviewQueue.tsx`
- `src/components/parent/ChallengeReviewQueue.test.tsx`
- `supabase/migrations/20260917120000_challenge_play.sql`
- `server/challenge/playTypes.ts`
- `server/challenge/memoryPlayRepository.ts`
- `server/challenge/postgresPlayRepository.ts`
- `server/challenge/playRepository.test.ts`
- `server/challenge/playService.ts`
- `server/challenge/playService.test.ts`
- `src/challenge/useChallenge.ts`
- `src/challenge/useChallenge.test.ts`
- `src/components/ChallengeQuestionCard.tsx`
- `src/components/ChallengeFeedback.tsx`
- `src/components/ChallengeQuestionCard.test.tsx`
- `src/components/ChallengeDialog.tsx`
- `src/components/ChallengeDialog.test.tsx`
- `server/challenge/socialService.ts`
- `server/challenge/socialService.test.ts`
- `server/challenge/weeklyService.ts`
- `server/challenge/weeklyService.test.ts`
- `src/challenge/useChallengeSocial.ts`
- `src/challenge/useChallengeSocial.test.ts`
- `src/components/ChallengeWeeklyMap.tsx`
- `src/components/ChallengeWeeklyMap.test.tsx`
- `src/components/ChallengeReactionBar.tsx`
- `src/components/ChallengeReactionBar.test.tsx`
- `src/components/ChallengeReportDialog.tsx`
- `tests/e2e/challenge-flow.spec.ts`
- `server/challenge/rollout.ts`
- `server/challenge/rollout.test.ts`

### Files sẽ sửa tuần tự

- `src/auth/apiClient.ts` - thêm typed wrappers cho authoring, parent review, daily play, social và weekly endpoints.
- `server/app.ts` - thêm challenge service dependencies, default wiring và route handlers; giữ nguyên auth boundary hiện có.
- `server/app.test.ts` - mở rộng request helper/contract tests cho các route challenge.
- `src/views/ParentView.tsx` - nhúng hàng đợi duyệt và settings theo parent grant.
- `src/views/ParentView.test.tsx` - kiểm thử trạng thái review/control.
- `src/App.tsx` - sở hữu open state của `ChallengeDialog`, body scroll lock và truyền callback vào Journey.
- `src/components/JourneyFeatureRail.tsx` - chuyển nút `challenge` từ dialog “coming soon” sang callback mở feature.
- `src/views/JourneyView.tsx` - truyền callback xuống rail bằng patch nhỏ, giữ nguyên thay đổi Pet đang có.
- `src/styles.css` - thêm style scoped cho challenge, responsive, focus, reduced motion và không đổi style feature khác.
- `server/db/database.integration.test.ts` - cập nhật private-schema table contract cho các bảng challenge.

## Execution Checklist

- [ ] Task 1 - catalog fact verified, shared contracts và validator.
- [ ] Task 2 - timezone, target, round rotation và recognition rules.
- [ ] Task 3 - authoring migration và repository contract.
- [ ] Task 4 - student authoring service và HTTP API.
- [ ] Task 5 - composer, local drafts và student API client.
- [ ] Task 6 - parent review/control service và HTTP API.
- [ ] Task 7 - parent review queue/control hook và component.
- [ ] Task 8 - mount queue vào ParentView, lock và child scope.
- [ ] Task 9 - play migration và round/attempt repository.
- [ ] Task 10 - daily round selection, attempt, feedback và shared contribution.
- [ ] Task 11 - daily HTTP API và client wrappers.
- [ ] Task 12 - daily hook, question card và feedback UI.
- [ ] Task 13 - dialog, feature rail và App integration.
- [ ] Task 14 - positive reactions, reports và moderation routes.
- [ ] Task 15 - weekly aggregate, map data và recognition service.
- [ ] Task 16 - weekly map, social hook và client contract.
- [ ] Task 17 - reaction bar và report dialog.
- [ ] Task 18 - nối đầy đủ tabs/social/weekly vào ChallengeDialog.
- [ ] Task 19 - offline/retry/privacy E2E và DB contract.
- [ ] Task 20 - full verification, accessibility, responsive và acceptance evidence.
- [ ] Task 21 - rollout gate cho đúng một lớp và pilot approval packet.

---

## P0 - Source, contracts and deterministic rules

### Task 1 - `[ready-for-agent]` Catalog fact đã review và contracts dùng chung

**Files:**

- Tạo `shared/challenge-source.ts`.
- Tạo `shared/challenge-contracts.ts`.
- Tạo `server/challenge/validation.ts`.
- Tạo `server/challenge/validation.test.ts`.

**Write-set và interface bắt buộc:**

- Trong `shared/challenge-source.ts`, khai báo:

  ```ts
  export const CHALLENGE_SOURCE_VERSION = 'challenge-facts-v1' as const;

  export type ChallengeSourceRef = {
    sourceId: 'mvp-content-reviewed';
    sourceFile: 'lich-su-va-dia-li-4.pdf';
    sourceSha256: 'f7d8c9a7f7e069fcd9e509561468797c3dbd89b9e62b706291667ae87fc2577d';
    pdfPage: number;
    printedPage: number;
    locator: string;
  };

  export type VerifiedChallengeFact = {
    id: string;
    lessonId: string;
    lessonTitle: string;
    canonicalAnswer?: string;
    sourceText: string;
    source: ChallengeSourceRef;
  };

  export const VERIFIED_CHALLENGE_FACTS: readonly VerifiedChallengeFact[];
  export function findVerifiedChallengeFact(id: string): VerifiedChallengeFact | null;
  ```

  Catalog đầy đủ cũng cần có `sourceKind: 'reviewed' | 'lesson-reference'` và `sourceVersion`; `canonicalAnswer` chỉ là dữ liệu tham chiếu của nhóm reviewed, không phải giá trị dùng để khóa đáp án học sinh.

- Nhóm reviewed phải map đúng mười fact đã review: `map`, `sketch`, `data`, `table`, `artifact`, `picture`, `location`, `festival`, `dragon`, `cakes`. Trường `sourceId`, `sourceFile`, `sourceSha256`, page và locator phải khớp `source/mvp-content-reviewed.json`; câu chữ hiển thị có thể thân thiện hơn nhưng không được thay đổi ý nghĩa fact.
- `canonicalAnswer` chỉ được lấy từ đáp án/hoạt động verified hiện có trong `src/content/packages.ts` và nguồn review; các mảnh lesson-reference phải giữ nhãn tham khảo và không được suy diễn thành fact đã kiểm duyệt.
- Trong `shared/challenge-contracts.ts`, định nghĩa discriminated unions/types cho:
  - `ChallengeQuestionStatus = 'draft' | 'pending_parent_review' | 'approved' | 'featured' | 'closed' | 'withdrawn' | 'voided' | 'archived'`.
  - `ChallengeReviewDecision = 'approve' | 'request_revision'`.
  - `ChallengeOption`, `CreateChallengeQuestionInput`, `ReviseChallengeQuestionInput`, `ChallengeQuestionRecord`, `ChallengeQuestionView`, `ChallengeQuestionMine`, `ChallengeQuestionParent`.
  - `ChallengeRound`, `ChallengeRoundItem`, `ChallengeTodayResponse`, `ChallengeWeeklyResponse`, `ChallengeAnswerResult`, `ChallengeRecognition`, `ChallengeReactionType`, `ChallengeReportReason`.
  - Input types cho create/revise/attempt/reaction/report/review/settings.
  - `ChallengeFailureCode` phải dùng cùng convention server hiện tại: `invalid | forbidden | not-found | conflict | expired | locked | stale | rate-limited | unavailable`; thêm `reason` typed nếu UI cần phân biệt `quota_exceeded`, `revision_conflict`, `already_attempted`, `self_question`, `round_closed`, `question_reported` hoặc `not_available`.
- Public question type chỉ chứa `id`, `prompt`, bốn option không có cờ đúng, author display name, source lesson label nếu được phép, round item metadata và trạng thái attempt của actor. Không đưa `correctOptionId`, `explanation`, `sourceText` đầy đủ hoặc moderation notes.
- Định nghĩa một `ServiceResult<T>` dùng chung cho challenge service: `{ ok: true } & T | ChallengeFailure`. `ChallengeFailure` có `ok: false`, `code: ChallengeFailureCode`, `message` và `reason` optional; `server/app.ts` phải đưa failure này qua `statusForFailure` hiện có thay vì tạo bảng mã HTTP riêng.
- Giữ nguyên contract authoring đã duyệt:

  ```ts
  export type CreateChallengeQuestionInput = {
    sourceFactId: string;
    prompt: string;
    distractors: [string, string, string];
    explanation: string;
  };

  export type ReviewChallengeQuestionInput =
    | { decision: 'approve' }
    | { decision: 'request_revision'; reason: string };
  ```

- `ChallengeQuestionView` phải có tối thiểu `id`, `roundItemId`, `lessonId`, `lessonTitle`, `author`, `prompt`, bốn `options`, `closesAt`, `answeredByMe`, `practiceOnly`; `ChallengeAnswerResult` có `questionId`, selected option, correct, correct option, explanation, source label, contribution flag và duplicate flag; `ChallengeTodayResponse` và `ChallengeWeeklyResponse` phải giữ các aggregate/summary đã duyệt trong spec.
- Trong `server/challenge/validation.ts`, export:

  ```ts
  export type ValidationResult =
    | { ok: true }
    | { ok: false; code: 'VALIDATION_ERROR'; fieldErrors: Record<string, string> };

  export function validateCreateChallengeQuestion(
    input: CreateChallengeQuestionInput,
    sourceCatalog: readonly VerifiedChallengeFact[],
    context?: { forbiddenDisplayNames?: readonly string[] }
  ): ValidationResult;

  export function normalizeChallengeOption(value: string): string;
  ```

- Validation phải kiểm tra mảnh kiến thức tồn tại trong catalog, prompt dài 20–240 ký tự, `correctAnswer` và đúng ba distractor, mỗi option dài 1–140 ký tự, explanation dài 20–500 ký tự, không trùng sau normalize, không chứa HTML/URL/email/số điện thoại/lời mời liên lạc, tên học sinh khác hoặc nội dung xúc phạm theo bộ lọc cơ bản.
- Cho phép client gửi `correctAnswer`; service lưu đáp án đó và gán `correctOptionId` server-side, nhưng không yêu cầu khớp `canonicalAnswer`. Parent review là chốt kiểm tra tính đúng và phù hợp.

**RED:**

- Viết test trước cho catalog version/allowlist, đủ mười fact, page/locator có giá trị, prompt rỗng/quá dài, thiếu/thừa distractor, duplicate có khác hoa thường/dấu câu, HTML/URL/contact info và attempt input cố gửi `correctOptionId`.
- Chạy `npx vitest run server/challenge/validation.test.ts`; test mới phải fail trước khi viết implementation.

**GREEN và verification:**

- Implement catalog/contract/validator, chạy lại `npx vitest run server/challenge/validation.test.ts`.
- Chạy `npm run typecheck:server`.
- Kiểm tra bằng `rg` rằng không có public type nào export `correctOptionId` trong nhánh DTO public.

**Boundaries:** Không sửa `source/mvp-content-reviewed.json`, `src/content/packages.ts` hoặc `LearningEventType`. Không tự tạo fact lịch sử mới; các entry bổ sung phải được dẫn xuất từ lesson seed hiện có và giữ nhãn lesson-reference.

### Task 2 - `[ready-for-agent]` Date boundary, target, rotation và recognition rules

**Files:**

- Tạo `server/challenge/roundRules.ts`.
- Tạo `server/challenge/roundRules.test.ts`.
- Tạo `server/challenge/recognition.ts`.
- Tạo `server/challenge/recognition.test.ts`.

**Interface bắt buộc:**

```ts
export function localChallengeDate(now: Date): string;
export function challengeWeekBounds(now: Date): { start: string; end: string };
export function challengeTarget(activeStudentCount: number): number;
export function selectDailyQuestions(
  candidates: readonly RoundCandidate[],
  roundDate: string,
  limit?: number
): readonly RoundCandidate[];
export function classContribution(attempt: { isCorrect: boolean; isPractice: boolean; isVoided: boolean }): 0 | 1;
export function buildRecognitions(summary: RecognitionSummary): readonly ChallengeRecognition[];
```

- Dùng timezone IANA `Asia/Ho_Chi_Minh`; không dùng timezone của máy chạy test.
- Khai báo `RoundCandidate` gồm `questionId`, `authorId`, `approvedAt`, `lastFeaturedAt`, `recentRoundDates` và đủ metadata để selection không phải query ngầm; khai báo `RecognitionSummary` gồm các aggregate tuyệt đối cần cho recognition, không nhận một danh sách để sort học sinh.
- `challengeTarget(0)` trả 10; mọi giá trị dương trả `min(60, max(10, count * 2))`; giá trị âm bị normalize về 0 trước khi tính.
- `selectDailyQuestions` dùng seed ổn định từ `roundDate` và candidate IDs, chọn tối đa năm item, không quá một item/author. Tiebreak phải deterministic để cùng input luôn cùng output.
- Khi có đủ lựa chọn, ưu tiên item chưa featured hoặc featured lâu nhất; loại item xuất hiện trong bảy ngày gần nhất nếu vẫn còn lựa chọn thay thế; nếu không đủ thì chọn fallback deterministic và ghi metadata để quan sát được.
- Recognition là các nhãn không mang tính xếp hạng, ví dụ `question_creator`, `kind_helper`, `steady_learner`, `class_builder`; không trả về rank/score cá nhân và một học sinh có thể nhận nhiều nhãn nếu thỏa điều kiện độc lập.

**RED/GREEN:**

- Test trước cho 23:59/00:00 local, Chủ nhật/thứ Hai, DST-independent behavior, target min/max, seed ổn định, author uniqueness, recent-feature fallback, `classContribution`, recognition không exclusive.
- RED: `npx vitest run server/challenge/roundRules.test.ts server/challenge/recognition.test.ts`.
- GREEN: chạy lại hai test trên và `npm run typecheck:server`.

**Boundaries:** Không tạo bảng hoặc route. Không import UI hoặc `Date` locale không kiểm soát. Các rule thuần phải có thể chạy bằng memory fixture.

---

## P1 - Authoring and parent review

### Task 3 - `[ready-for-agent]` Authoring schema và repository

**Files:**

- Tạo `supabase/migrations/20260917100000_challenge_authoring.sql`.
- Tạo `server/challenge/authoringTypes.ts`.
- Tạo `server/challenge/memoryAuthoringRepository.ts`.
- Tạo `server/challenge/postgresAuthoringRepository.ts`.
- Tạo `server/challenge/authoringRepository.test.ts`.

**Migration contract:**

- Tạo private tables `challenge_questions`, `challenge_question_reviews`, `challenge_preferences` trong schema hiện app đang dùng.
- `challenge_questions` lưu `id`, `author_id`, `source_fact_id`, `source_version`, `lesson_id`, `prompt`, bốn option, `correct_option_id`, `explanation`, `status`, `revision`, `created_local_date`, timestamps, `submitted_at`, `reviewed_at`, `featured_at`, `closed_at`, `review_reason`, `withdrawn_at`, `voided_at`.
- Check constraint bảo đảm đúng bốn option và `correct_option_id` thuộc đúng option; `source_fact_id`/`source_version` có index; author FK trỏ account student.
- `challenge_question_reviews` là audit append-only theo question/revision, decision, reason, reviewer scope và timestamp; không lưu raw parent grant token.
- `challenge_preferences` có một row/student, mặc định `can_create = true`, `can_participate = true`.
- Bật RLS cho cả ba bảng, revoke quyền trực tiếp với `public`, `anon`, `authenticated`, thêm các index theo author/status/local date. Server role mới truy cập qua backend.

**Repository interface:**

```ts
export interface AuthoringRepository {
  countNewQuestionsForDay(authorId: string, localDate: string): Promise<number>;
  insertPendingQuestion(input: InsertPendingQuestion): Promise<ChallengeQuestionRecord | 'quota_exceeded'>;
  listMine(authorId: string, limit: number): Promise<readonly ChallengeQuestionMine[]>;
  findForAuthor(authorId: string, questionId: string): Promise<ChallengeQuestionRecord | null>;
  updateDraftRevision(authorId: string, questionId: string, revision: number, input: ReviseChallengeQuestionInput): Promise<ChallengeQuestionRecord | 'not_found' | 'revision_conflict'>;
  listApprovedCandidates(roundDate: string): Promise<readonly RoundCandidate[]>;
  markQuestionFeatured(questionId: string, featuredAt: string): Promise<void>;
  markQuestionClosed(questionId: string, closedAt: string): Promise<void>;
  listPendingForStudent(studentId: string): Promise<readonly ChallengeQuestionParent[]>;
  reviewQuestion(studentId: string, questionId: string, revision: number, decision: ReviewChallengeQuestionInput): Promise<ChallengeQuestionRecord | 'not_found' | 'revision_conflict' | 'invalid_state'>;
  withdrawQuestion(studentId: string, questionId: string): Promise<'ok' | 'not_found' | 'invalid_state'>;
  getPreferences(studentId: string): Promise<ChallengePreferences>;
  updatePreferences(studentId: string, patch: ChallengePreferencesPatch): Promise<ChallengePreferences>;
}
```

- Repository không nhận `authorId` từ request body; service truyền actor đã xác thực.
- `listApprovedCandidates(roundDate)` chỉ trả câu `approved` hợp lệ, kèm `lastFeaturedAt` và lịch sử bảy ngày để round rule không query ngầm; khi item được ghi vào round, service gọi `markQuestionFeatured`, và khi round đóng thì gọi `markQuestionClosed`.
- Quota phải được kiểm tra/ghi trong một transaction có lock theo `(authorId, localDate)` để hai request đồng thời không vượt quá ba.
- Memory repository phải dùng clock/ID factory injectable và cùng semantics với Postgres, phục vụ unit/API tests.
- Postgres repository dùng parameterized query, transaction cho create/review/revise và không ghép SQL từ prompt/options.

**RED/GREEN:**

- Viết contract suite dùng chung cho memory repository trước: create 3 thành công, create lần 4 trả quota, hai create đồng thời vẫn chỉ có 3; source/version được lưu; lifecycle `draft → pending_parent_review → approved → featured → closed`; request revision quay về `draft`; revision conflict không ghi; featured/closed immutable; withdraw không xóa record; preference default.
- RED: `npx vitest run server/challenge/authoringRepository.test.ts`.
- Tạo migration/repository và chạy GREEN cùng `npm run typecheck:server`.
- Kiểm tra SQL bằng `rg` cho `enable row level security`, `revoke`, các unique/index/check quan trọng; đối chiếu với pattern của migration classroom hiện có.

**Boundaries:** Task này chỉ tạo persistence cho authoring. Chưa expose HTTP, chưa render UI, chưa tạo round/attempt/reaction/report tables.

### Task 4 - `[ready-for-agent]` Student authoring service và API

**Files:**

- Tạo `server/challenge/authoringService.ts`.
- Tạo `server/challenge/authoringService.test.ts`.
- Sửa `server/app.ts`.
- Sửa `server/app.test.ts`.

**Service interface:**

```ts
export function createChallengeAuthoringService(deps: {
  repository: AuthoringRepository;
  sourceCatalog: readonly VerifiedChallengeFact[];
  activeStudentDisplayNames: () => Promise<readonly string[]>;
  clock: () => Date;
  idFactory: () => string;
}): {
  createQuestion(studentId: string, input: CreateChallengeQuestionInput): Promise<ServiceResult<ChallengeQuestionMine>>;
  listMine(studentId: string): Promise<ServiceResult<readonly ChallengeQuestionMine[]>>;
  reviseQuestion(studentId: string, questionId: string, input: ReviseChallengeQuestionInput): Promise<ServiceResult<ChallengeQuestionMine>>;
};
```

- `createQuestion` lấy snapshot tên hiển thị học sinh active từ roster reader (không expose roster qua client) để chạy bộ lọc nội dung cơ bản, validate input, lấy fact chuẩn từ catalog, tạo đáp án đúng server-side, ghi status `pending_parent_review` và trả status/quota còn lại.
- Default wiring tạo roster reader từ cùng `AuthRepository`/DB hiện app đang dùng, lọc `role = student AND active = true`; test injection dùng memory roster, không gọi admin HTTP route từ service.
- `reviseQuestion` chỉ cho tác giả sửa bản `draft` có `review_reason`, yêu cầu revision hiện tại, giữ nguyên quota record gốc và đưa status về `pending_parent_review`; bản đã `featured`/`closed` không sửa tại chỗ.
- `listMine` có thể hiển thị đáp án đúng/explanation cho chính tác giả vì đây là vùng riêng; không dùng DTO này cho daily public play.
- Trong `server/app.ts`, thêm nhóm dependency challenge authoring vào `AppDependencies` và default wiring theo pattern auth/learning/classroom hiện có.
- Thêm routes:
  - `POST /api/me/challenge/questions`
  - `GET /api/me/challenge/questions/mine`
  - `PATCH /api/me/challenge/questions/:id`
- Tất cả route dùng `authorizeStudent()`, lấy student ID từ session, bỏ qua/loại mọi `authorStudentId` do client gửi. Parent grant, admin token hoặc anonymous không được dùng route student.
- Dùng failure mapper thống nhất với `statusForFailure`: 401 cho thiếu session, 403 cho sai role/paused, 404 cho không thuộc actor, 409 cho revision/state conflict, 429 cho quota, 400 cho validation, 503 cho dependency unavailable.

**RED/GREEN:**

- Test request bằng memory repository: authenticated student create/list/revise; quota; invalid source; forged author ID; parent/admin rejection; revision conflict; response shape không lộ server fields sai route.
- RED: `npx vitest run server/challenge/authoringService.test.ts server/app.test.ts`.
- GREEN: chạy lại với `npm run typecheck:server`.
- Dùng `rg`/snapshot JSON để chứng minh public route không trả `correctOptionId` ngoài endpoint `mine` đã được xác định rõ.

**Boundaries:** Chưa cho câu hỏi xuất hiện trong daily round; approval vẫn là precondition ở play service.

### Task 5 - `[ready-for-agent]` Composer, draft local và API client cho học sinh

**Files:**

- Sửa `src/auth/apiClient.ts`.
- Tạo `src/challenge/drafts.ts`.
- Tạo `src/challenge/drafts.test.ts`.
- Tạo `src/components/ChallengeComposer.tsx`.
- Tạo `src/components/ChallengeComposer.test.tsx`.

**Client contract:**

- Thêm wrappers typed:

  ```ts
  getMyChallengeQuestions(): Promise<ApiResult<ChallengeQuestionMine[]>>;
  createChallengeQuestion(input: CreateChallengeQuestionInput, idempotencyKey: string): Promise<ApiResult<ChallengeQuestionMine>>;
  reviseChallengeQuestion(questionId: string, input: ReviseChallengeQuestionInput, idempotencyKey: string): Promise<ApiResult<ChallengeQuestionMine>>;
  ```

- Draft storage dùng key/schema `hoc-vui-challenge-drafts-v2`, lưu source fact ID, prompt, `correctAnswer`, ba distractor, explanation, updatedAt; không lưu session/token và không giả lập submit thành công.
- `loadDraft` phải chịu được JSON hỏng, schema cũ hoặc localStorage unavailable bằng cách trả draft rỗng và thông báo không chặn việc học.
- Composer hiển thị source card, prompt, ô `correctAnswer` có thể sửa, đúng ba ô distractor, explanation, bộ đếm tối đa 3 câu mới/ngày và trạng thái `pending_parent_review`/`draft` kèm lý do cần sửa.
- Nút submit disabled khi sai validation hoặc đang pending. Lỗi mạng giữ draft và idempotency key; chỉ clear draft sau ACK thành công.
- Đáp án chuẩn do học sinh nhập được giữ trong draft và payload; UI chỉ ngăn giá trị rỗng/trùng hoặc không an toàn, không khóa theo fact catalog.

**RED/GREEN:**

- Test draft save/load/corrupt/storage failure; validation message; submit giữ draft khi network failure; successful ACK clear đúng draft; revision không trừ quota; keyboard labels.
- RED: `npx vitest run src/challenge/drafts.test.ts src/components/ChallengeComposer.test.tsx`.
- GREEN: chạy lại và `npm run typecheck`.

**Boundaries:** Không thêm IndexedDB queue, không ghi trực tiếp Supabase, không mở composer nếu parent setting `can_create` đã pause (setting UI/API được nối ở Task 7).

### Task 6 - `[ready-for-agent]` Parent review/control service và API

**Files:**

- Tạo `server/challenge/reviewService.ts`.
- Tạo `server/challenge/reviewService.test.ts`.
- Sửa `server/app.ts`.
- Sửa `server/app.test.ts`.

**Service interface:**

```ts
export function createChallengeReviewService(deps: {
  repository: AuthoringRepository;
  clock: () => Date;
}): {
  listPending(parentStudentId: string): Promise<ServiceResult<readonly ChallengeQuestionParent[]>>;
  review(parentStudentId: string, questionId: string, input: ReviewChallengeQuestionInput): Promise<ServiceResult<ChallengeQuestionParent>>;
  withdraw(parentStudentId: string, questionId: string): Promise<ServiceResult<void>>;
  getSettings(parentStudentId: string): Promise<ServiceResult<ChallengePreferences>>;
  updateSettings(parentStudentId: string, patch: ChallengePreferencesPatch): Promise<ServiceResult<ChallengePreferences>>;
};
```

- `authorizeParent(token, parentGrantToken, requestedStudentId)` hiện có là ranh giới duy nhất; parent service nhận child ID đã được authorize, không nhận raw grant token.
- Approve/request revision chỉ chấp nhận câu đang `pending_parent_review` và revision hiện tại. `approve` chuyển sang `approved`; `request_revision` chuyển về `draft` kèm reason thân thiện, không có dữ liệu nhạy cảm. Ghi review audit trước khi trả ACK.
- Withdraw chỉ tác động câu của child trong scope grant; không xóa lịch sử review/draft.
- Settings chỉ cho parent của child đó cập nhật `can_create`/`can_participate`; khi pause không xóa câu đã gửi và không reset quota.
- Thêm routes:
  - `GET /api/parent/challenge/questions/pending`
  - `POST /api/parent/challenge/questions/:id/review`
  - `POST /api/parent/challenge/questions/:id/withdraw`
  - `PATCH /api/parent/challenge/settings`
- Không trả raw parent token, server audit secret hoặc dữ liệu của student khác.

**RED/GREEN:**

- Test parent grant đúng child; grant sai child 403/404 theo convention hiện có; approve/revision reason/state/revision; withdraw giữ record; settings pause; student/admin/anonymous bị từ chối.
- RED: `npx vitest run server/challenge/reviewService.test.ts server/app.test.ts`.
- GREEN: chạy lại cùng `npm run typecheck:server`.

**Boundaries:** Chưa đưa câu vào daily round; chưa thêm parent UI.

### Task 7 - `[ready-for-agent]` Parent review queue và control UI

**Files:**

- Sửa `src/auth/apiClient.ts`.
- Tạo `src/challenge/useParentChallengeReview.ts`.
- Tạo `src/challenge/useParentChallengeReview.test.ts`.
- Tạo `src/components/parent/ChallengeReviewQueue.tsx`.
- Tạo `src/components/parent/ChallengeReviewQueue.test.tsx`.

**Implementation details:**

- API client thêm `getPendingChallengeQuestions`, `reviewChallengeQuestion`, `withdrawChallengeQuestion`, `getChallengeSettings`, `updateChallengeSettings`; tất cả lấy parent grant từ cơ chế auth hiện có.
- Hook quản lý loading/error/refresh, optimistic update chỉ ở trạng thái pending UI và rollback khi server từ chối; không hiển thị approved/withdrawn trước ACK.
- Queue hiển thị question, bốn đáp án, đáp án chuẩn do học sinh viết, explanation, source ref, revision, approve và request-revision với reason bắt buộc. Khi approve, modal phải nêu rõ phụ huynh chịu trách nhiệm về tính chính xác/phù hợp và cho phép “Xem lại” hoặc xác nhận phê duyệt. Source ref phải click/expand được nhưng không mở URL ngoài allowlist.
- Control panel hiển thị hai toggle: cho phép tạo câu và cho phép tham gia. Khi parent khóa grant/session, clear queue và không giữ dữ liệu child trong state dùng lại.
- Test không có parent grant, empty, pending, approve, revision validation, withdraw, API failure, unmount/lock cleanup và không render child khác.

**RED/GREEN:**

- RED: `npx vitest run src/challenge/useParentChallengeReview.test.ts src/components/parent/ChallengeReviewQueue.test.tsx`.
- GREEN: chạy lại và `npm run typecheck`.

**Boundaries:** Component chưa được mount vào ParentView cho đến Task 8; dùng mock API typed, không gọi network trực tiếp trong component.

### Task 8 - `[ready-for-agent]` Mount parent queue vào ParentView và kiểm soát scope

**Files:**

- Sửa `src/views/ParentView.tsx`.
- Sửa `src/views/ParentView.test.tsx`.
- Sửa `src/App.tsx`.
- Sửa `src/styles.css`.

**Implementation details:**

- Dùng đúng parent grant state/child student ID hiện App đang truyền cho `ParentView`; không tạo auth flow thứ hai và không đưa grant token vào component con nếu API client đã có cơ chế hiện tại.
- Render `ChallengeReviewQueue` chỉ khi parent grant đang active và dashboard đang mở đúng child; khi grant hết hạn, lock hoặc đổi child phải unmount/clear challenge state.
- Thêm vùng rõ ràng trong ParentView cho “Thách đố tiếp sức tri thức”, phân biệt “câu đang chờ duyệt” với các metric học tập hiện có. Không thay đổi tính toán dashboard cũ.
- Giữ hành vi parent lock/error hiện tại; challenge queue failure là inline non-blocking error, không làm mất dashboard.
- Style scoped theo `.parent-challenge-*`; focus ring, contrast, empty state và responsive không phá cards hiện có.

**RED/GREEN:**

- Test ParentView với grant active/inactive, child switch, queue loading/empty/error, approve/revision/withdraw/settings callback và regression của dashboard hiện tại.
- RED: `npx vitest run src/views/ParentView.test.tsx`.
- GREEN: chạy lại, `npm run typecheck`, `git diff --check` trên file đã sửa.

**Boundaries:** Chưa thêm play UI hoặc feature rail. Không đọc dữ liệu parent của child khác bằng prop giả.

---

## P2 - Daily round and play

### Task 9 - `[ready-for-agent]` Play schema và repository

**Files:**

- Tạo `supabase/migrations/20260917120000_challenge_play.sql`.
- Tạo `server/challenge/playTypes.ts`.
- Tạo `server/challenge/memoryPlayRepository.ts`.
- Tạo `server/challenge/postgresPlayRepository.ts`.
- Tạo `server/challenge/playRepository.test.ts`.

**Migration contract:**

- Tạo các private tables `challenge_rounds`, `challenge_round_items`, `challenge_attempts`, `challenge_reactions`, `challenge_reports`, `challenge_events`.
- `challenge_rounds`: `round_date` unique/primary key, timezone/version, target, selected count, class contribution, reward state, closed/void timestamps và created/updated timestamps.
- `challenge_round_items`: round date FK, question ID FK, author ID snapshot nếu cần audit, ordinal, `featured_at`, selection metadata/seed version; unique `(round_date, question_id)` và unique `(round_date, ordinal)`.
- `challenge_attempts`: item ID, student ID, idempotency key, selected option, correctness, `is_practice`, `is_voided`, contribution, answered timestamp; unique `(item_id, student_id)` và unique `(student_id, idempotency_key)` trong scope challenge.
- `challenge_reactions`: item ID, `actor_id`, reaction enum, timestamps; primary/unique key `(item_id, actor_id, reaction_type)`.
- `challenge_reports`: item ID, reporter ID, reason enum, details length-limited, status `open|dismissed|voided`, optional idempotency key, timestamps; unique `(item_id, reporter_id, reason)` và index open reports.
- `challenge_events`: `event_id` primary/unique, `student_id`, `event_type` namespaced như `challenge.question_created`, `challenge.attempt_recorded`, `challenge.practice_completed`, `challenge.reaction_added`, `challenge.report_created`, payload JSON đã schema-validate, occurredAt/localDate, source/version. Không FK vào bảng analytics cũ để tránh thay đổi semantics.
- Bật RLS, revoke direct access cho `public`, `anon`, `authenticated`, dùng check constraints cho enum/date/positive contribution và indexes cho day/item/student.
- Migration phải idempotent theo convention repo, không sửa bảng learning hiện tại. Nếu FK tới `challenge_questions` cần giữ record sau withdraw/void thì dùng `RESTRICT`/soft state phù hợp, không cascade xóa lịch sử.

**Repository interface:**

```ts
export interface PlayRepository {
  getRound(roundDate: string): Promise<ChallengeRoundRecord | null>;
  insertRoundIfAbsent(input: CreateRoundInput): Promise<ChallengeRoundRecord>;
  closeRound(roundDate: string, closedAt: string): Promise<void>;
  listRoundItems(roundDate: string): Promise<readonly ChallengeRoundItemRecord[]>;
  insertRoundItem(input: CreateRoundItemInput): Promise<ChallengeRoundItemRecord>;
  findRoundItem(itemId: string): Promise<ChallengeRoundItemRecord | null>;
  findAttempt(itemId: string, studentId: string): Promise<ChallengeAttemptRecord | null>;
  findAttemptByIdempotency(studentId: string, idempotencyKey: string): Promise<ChallengeAttemptRecord | null>;
  insertAttempt(input: InsertAttemptInput): Promise<ChallengeAttemptRecord | 'duplicate'>;
  countCorrectContributions(roundDate: string): Promise<number>;
  appendEvent(input: AppendChallengeEventInput): Promise<void>;
  upsertReaction(input: UpsertReactionInput): Promise<ChallengeReactionRecord>;
  createReport(input: CreateChallengeReportInput): Promise<ChallengeReportRecord>;
  hasOpenReport(itemId: string): Promise<boolean>;
}
```

- Memory repository phải mô phỏng unique/idempotency/void state và cho phép seed round/question/attempt theo test fixture.
- Postgres insert attempt phải dùng transaction/unique constraint làm lớp bảo vệ cuối; duplicate cùng idempotency key trả record cũ thay vì tạo record mới.
- Không cho repository trả đáp án đúng trong phương thức dùng để dựng public round; service sẽ gọi bản record private theo ngữ cảnh.

**RED/GREEN:**

- Contract test trước cho round idempotent, item ordinal unique, attempt duplicate same/different payload, student chỉ một attempt/item, reaction unique, report open state, event append và contribution count.
- RED: `npx vitest run server/challenge/playRepository.test.ts`.
- GREEN: chạy lại cùng `npm run typecheck:server`.
- Kiểm tra migration: `rg` cho `challenge_rounds|challenge_round_items|challenge_attempts|challenge_reactions|challenge_reports|challenge_events|enable row level security|revoke`.

**Boundaries:** Chưa chọn câu, chưa expose API, chưa tính weekly summary.

### Task 10 - `[ready-for-agent]` Daily round và attempt service

**Files:**

- Tạo `server/challenge/playService.ts`.
- Tạo `server/challenge/playService.test.ts`.

**Service interface:**

```ts
export function createChallengePlayService(deps: {
  authoring: AuthoringRepository;
  play: PlayRepository;
  clock: () => Date;
  activeStudentCount: () => Promise<number>;
  idFactory: () => string;
}): {
  getToday(studentId: string): Promise<ServiceResult<ChallengeTodayResponse>>;
  submitAttempt(studentId: string, itemId: string, input: SubmitChallengeAttemptInput): Promise<ServiceResult<ChallengeAnswerResult>>;
};
```

- `getToday` tính local date, đóng các round cũ theo server time, lấy/tạo round idempotent, snapshot danh sách approved questions, gọi `selectDailyQuestions`, ghi item theo thứ tự ổn định, mark question `featured` và trả public DTO. Khi qua boundary, round cũ chuyển `closed`/câu featured chuyển `closed`; nếu không đủ câu approved thì trả trạng thái vòng “đang mở khóa thêm” cùng progress, không tự sinh câu.
- Chỉ `status = approved`, không withdrawn/voided, không open report bị khóa selection mới được đưa vào round. Câu đã chọn vẫn được giữ lịch sử nếu sau đó bị report/void.
- `submitAttempt` lấy actor từ argument đã authorize, kiểm tra item thuộc round ngày/round còn mở; tác giả của question bị `SELF_QUESTION` và không được trả lời.
- Correctness tính server-side từ private `correctOptionId`. Trả lời sai không có penalty; feedback sau ACK mới gồm đáp án chuẩn, explanation, source ref và nút practice.
- Attempt bình thường ghi contribution 1 nếu đúng; practice luôn contribution 0. Practice sau khi đã answered hoặc round closed không tạo thêm contribution. Dùng unique item/student và idempotency key.
- Khi đạt target, mark shared reward idempotently và phát event namespaced; tuyệt đối không phát reward cá nhân dựa trên tốc độ/số điểm.
- Nếu item/round bị void trước hoặc sau attempt, giữ toàn bộ attempt history nhưng loại contribution của item khỏi aggregate round và tính lại progress; không phạt cá nhân và không thu hồi shared reward đã cấp.
- Không expose `correctOptionId`/explanation trong `getToday`; sau attempt chỉ trả đáp án của item vừa trả lời trong `ChallengeAnswerResult`.

**RED/GREEN:**

- Test fixture hai student cùng nhìn/thực hiện cùng item; cả hai đều được attempt; author bị chặn; wrong answer no penalty; no top-five cap; duplicate retry returns identical result; forged selected correct field ignored; round boundary/close; practice zero; target/reward idempotent; approved-only; report/void aggregate recalculation behavior.
- RED: `npx vitest run server/challenge/playService.test.ts`.
- GREEN: chạy lại cùng `npm run typecheck:server`.
- Assert serialized public today JSON không có `correctOptionId`, `answer`, `explanation`, `sourceText` trước attempt.

**Boundaries:** Task này không sửa HTTP hoặc UI. Service không tự đánh dấu lesson progress/mastery.

### Task 11 - `[ready-for-agent]` Daily API và client wrappers

**Files:**

- Sửa `server/app.ts`.
- Sửa `server/app.test.ts`.
- Sửa `src/auth/apiClient.ts`.

**Implementation details:**

- Thêm `challenge.play` vào dependency bundle của `AppDependencies` và default Postgres wiring; test app có thể inject memory play/authoring services.
- Thêm routes:
  - `GET /api/me/challenge/today`
  - `POST /api/me/challenge/items/:id/attempt`
- Dùng `authorizeStudent`, lấy student ID từ session và chỉ nhận `selectedOptionId`, `idempotencyKey`, `isPractice` theo schema. Bỏ qua unknown/forged fields hoặc trả validation error theo convention, không tin client correctness/contribution.
- Client wrappers:

  ```ts
  getTodayChallenge(): Promise<ApiResult<ChallengeTodayResponse>>;
  submitChallengeAttempt(itemId: string, input: SubmitChallengeAttemptInput): Promise<ApiResult<ChallengeAnswerResult>>;
  ```

- Map error JSON vào `ApiResult` hiện có, giữ status/failure code để UI phân biệt offline, forbidden, duplicate, closed và validation.
- Test cookie/session, parent grant rejection, anonymous rejection, response privacy, duplicate idempotency, 503 dependency failure và malformed body.

**RED/GREEN:**

- RED: `npx vitest run server/app.test.ts` với các test route mới.
- GREEN: chạy `npm run typecheck:server` rồi `npm run test -- server/app.test.ts`/Vitest path tương ứng.
- Dùng `rg` kiểm tra không có route/response tên `leaderboard`, `ranking`, `topFive` trong challenge daily implementation.

**Boundaries:** Chưa render challenge dialog; chưa thêm weekly/social routes.

### Task 12 - `[ready-for-agent]` Hook và daily question/feedback UI

**Files:**

- Tạo `src/challenge/useChallenge.ts`.
- Tạo `src/challenge/useChallenge.test.ts`.
- Tạo `src/components/ChallengeQuestionCard.tsx`.
- Tạo `src/components/ChallengeFeedback.tsx`.
- Tạo `src/components/ChallengeQuestionCard.test.tsx`.

**Implementation details:**

- `useChallenge` expose `today`, `loading`, `refresh`, `submit`, `isSubmitting`, `lastError`, `lastResult`; poll/refresh khi tab visible với interval giới hạn và stop khi hidden/unmount. Không polling nền liên tục.
- Preserve selected option and draft UI while request pending; chỉ chuyển answered/success sau response ACK. Retry cùng attempt dùng cùng idempotency key.
- `ChallengeQuestionCard` render prompt, bốn option accessible radio/button, author display, progress lớp, trạng thái answered/practice/locked; không dùng màu đơn độc để truyền đúng/sai.
- `ChallengeFeedback` render correct/wrong/void, explanation, source lesson/page/locator, “luyện tập thêm” không cộng contribution và CTA đóng/tiếp tục.
- Empty state nói rõ lớp đang chờ thêm câu đã được phụ huynh duyệt; không biến thành thông báo thất bại cá nhân.
- Style class names dùng prefix `.challenge-*`, sẵn sàng cho responsive/reduced-motion ở Task 13/16.

**RED/GREEN:**

- Test fetch success/error/stale/poll cleanup, submit ACK vs timeout, selected state, four options, answer leak absence, wrong no penalty, practice zero, keyboard navigation, screen-reader labels and reduced-motion branch.
- RED: `npx vitest run src/challenge/useChallenge.test.ts src/components/ChallengeQuestionCard.test.tsx`.
- GREEN: chạy lại cùng `npm run typecheck`.

**Boundaries:** Component không tự gọi API ngoài hook; chưa có tabs mine/week/reaction/report.

### Task 13 - `[ready-for-agent]` Challenge dialog và mở từ Journey feature rail

**Files:**

- Tạo `src/components/ChallengeDialog.tsx`.
- Tạo `src/components/ChallengeDialog.test.tsx`.
- Sửa `src/components/JourneyFeatureRail.tsx`.
- Sửa `src/views/JourneyView.tsx`.
- Sửa `src/App.tsx`.

**Implementation details:**

- `ChallengeDialog` là full-screen overlay trong app shell, không đổi `ViewId`; có vùng header, progress lớp, tab “Hôm nay”, “Câu của mình”, “Tuần này” và composer entry point.
- Focus trap/restore, Escape, backdrop close theo convention dialog hiện có; body scroll lock do App sở hữu để không xung đột với Friends/Parent dialog.
- Journey rail nhận `onOpenChallenge?: () => void`; click `challenge` gọi callback thật, `leaderboard` vẫn giữ entry hiện tại nhưng không được biến thành bảng xếp hạng cá nhân; `friends` và unread behavior không đổi.
- App sở hữu `challengeDialogOpen`, pass auth/parent setting context, đóng khi logout/lock và không giữ data của child cũ. Avoid modifying Pet dialogue logic in `JourneyView.tsx` beyond prop/callback wiring.
- Tab mine mount Composer + list status; tab Hôm nay mount hook/card; tab Tuần tạm dùng typed loading boundary cho component sẽ nối ở Task 16, không tạo dữ liệu giả hoặc text hứa hẹn chưa có backend.

**RED/GREEN:**

- Test rail callback, open/close, Escape/backdrop, focus return, body lock, logout/lock cleanup, friends regression, no navigation ViewId change, Vietnamese accessible names.
- RED: `npx vitest run src/components/ChallengeDialog.test.tsx` và test Journey/App liên quan hiện có.
- GREEN: chạy lại, `npm run typecheck`, `git diff --check`; inspect diff riêng của `JourneyView.tsx` để chắc chắn không nuốt phần Pet đang có.

**Boundaries:** Không thêm weekly/social business logic vào dialog; không tạo route leaderboard.

---

## P3 - Positive social layer and weekly class map

### Task 14 - `[ready-for-agent]` Reactions, reports và moderation service/API

**Files:**

- Tạo `server/challenge/socialService.ts`.
- Tạo `server/challenge/socialService.test.ts`.
- Sửa `server/app.ts`.
- Sửa `server/app.test.ts`.

**Service interface:**

```ts
export function createChallengeSocialService(deps: {
  play: PlayRepository;
  clock: () => Date;
}): {
  addReaction(studentId: string, itemId: string, input: AddChallengeReactionInput): Promise<ServiceResult<ChallengeReactionRecord>>;
  reportItem(studentId: string, itemId: string, input: ReportChallengeItemInput): Promise<ServiceResult<ChallengeReportRecord>>;
  resolveReport(adminId: string, reportId: string, input: ResolveChallengeReportInput): Promise<ServiceResult<void>>;
  voidQuestion(adminId: string, questionId: string, reason: string): Promise<ServiceResult<void>>;
};
```

- Student reactions chỉ accept bốn positive enum values; cùng student/item/reaction là idempotent, không tạo count lặp.
- Report phải yêu cầu reason thuộc allowlist; details optional nhưng length-limited, strip/escape HTML và không hiển thị công khai. Một student không spam cùng item bằng nhiều report đang open.
- Report “answer/source seems wrong” đặt selection lock cho item ở các round tương lai qua trạng thái repository; report không tự void ngay và không làm mất attempt history.
- Admin route dùng boundary admin hiện có, không gọi từ child UI:
  - `POST /api/me/challenge/items/:id/reactions`
  - `POST /api/me/challenge/items/:id/report`
  - `POST /api/admin/challenge/reports/:id/resolve`
  - `POST /api/admin/challenge/questions/:id/void`
- Resolve report phải phân biệt `dismissed` và `voided`; void question bảo toàn lịch sử, loại contribution của item khỏi aggregate round nhưng không phạt cá nhân/thu hồi shared reward đã cấp, đồng thời ngăn selection mới. Không thêm admin UI trong task này.
- Thêm challenge social dependency vào App dependency bundle, inject memory repo trong tests và giữ admin auth tách khỏi `authorizeStudent`/`authorizeParent`.

**RED/GREEN:**

- Test positive reaction allowlist/idempotency, duplicate report, report lock, admin-only resolve/void, student/parent rejection, aggregate recalculation without individual penalty or shared-reward revocation, details sanitization, malformed IDs và dependency 503.
- RED: `npx vitest run server/challenge/socialService.test.ts server/app.test.ts`.
- GREEN: chạy lại với `npm run typecheck:server`.
- Kiểm tra response child không chứa admin notes/reporter identity hoặc raw moderation fields.

**Boundaries:** Không có downvote/comment wall, không gửi notification ngoài app, không thêm bảng mới ngoài migration Task 9.

### Task 15 - `[ready-for-agent]` Weekly class map và recognitions service/API

**Files:**

- Tạo `server/challenge/weeklyService.ts`.
- Tạo `server/challenge/weeklyService.test.ts`.
- Sửa `server/app.ts`.
- Sửa `server/app.test.ts`.

**Service interface:**

```ts
export function createChallengeWeeklyService(deps: {
  play: PlayRepository;
  authoring: AuthoringRepository;
  now: () => Date;
}): {
  getWeekly(studentId: string, now?: Date): Promise<ServiceResult<ChallengeWeeklyResponse>>;
};
```

- Aggregate từ thứ Hai đến Chủ nhật local: target từng ngày, contribution lớp, số câu đã mở/đã hoàn tất, map/progress/reward state và recognitions positive.
- Có thể trả `myParticipationSummary` riêng cho actor (ví dụ số câu đã trả lời đúng, số câu đã tạo, số ngày tham gia) chỉ để tự phản hồi; không trả percentile, rank, điểm của bạn khác hoặc sorted student list.
- Recognition chạy qua `buildRecognitions`, label theo ngưỡng tuyệt đối đã định trước và không sort theo “người giỏi nhất”. Nếu không có dữ liệu, trả empty state tích cực.
- Không dùng điểm tốc độ hoặc timestamp để xếp hạng; timestamp chỉ dùng idempotency/audit.
- Route `GET /api/me/challenge/week` dùng `authorizeStudent`; parent route nếu cần đọc dữ liệu child phải được thiết kế riêng sau khi có use case, không lách qua student session.
- Add weekly dependency vào app bundle; default wiring reuse play/authoring services và không query trực tiếp từ route.

**RED/GREEN:**

- Test timezone/week boundary, empty week, partial week, multiple students, no ranking fields, recognitions nonexclusive, voided question, duplicate attempts, target/reward aggregate and student scope.
- RED: `npx vitest run server/challenge/weeklyService.test.ts server/app.test.ts`.
- GREEN: chạy lại cùng `npm run typecheck:server`.
- Dùng `rg` kiểm tra weekly DTO không có keys `rank`, `position`, `leaderboard`, `top`, `fastest`, `scoreByStudent`.

**Boundaries:** Chưa render weekly map; chưa thêm API polling riêng ngoài `GET` khi tab tuần visible.

### Task 16 - `[ready-for-agent]` API client, social hook và weekly map UI

**Files:**

- Sửa `src/auth/apiClient.ts`.
- Tạo `src/challenge/useChallengeSocial.ts`.
- Tạo `src/challenge/useChallengeSocial.test.ts`.
- Tạo `src/components/ChallengeWeeklyMap.tsx`.
- Tạo `src/components/ChallengeWeeklyMap.test.tsx`.

**Client contract:**

```ts
getWeeklyChallenge(): Promise<ApiResult<ChallengeWeeklyResponse>>;
addChallengeReaction(itemId: string, reactionType: ChallengeReactionType, idempotencyKey: string): Promise<ApiResult<ChallengeReactionRecord>>;
reportChallengeItem(itemId: string, input: ReportChallengeItemInput, idempotencyKey: string): Promise<ApiResult<ChallengeReportRecord>>;
```

- `useChallengeSocial` giữ reaction pending/error, deduplicate click và chỉ cập nhật UI sau ACK; report retry cùng idempotency key, không mất reason khi offline.
- `ChallengeWeeklyMap` hiển thị bảy ngày như hành trình bản đồ: ô tiến độ chung, target/contribution/reward state, câu chuyện “cả lớp đã mở khóa gì”, recognitions và CTA ôn lại. Không có hàng/cột sort học sinh.
- Nếu API chưa sẵn sàng hoặc offline, component hiển thị snapshot stale có nhãn rõ ràng và nút retry; không bịa số liệu mới.
- Test no-rank contract, empty/partial week, recognition multiple, stale/error, responsive layout semantic labels.

**RED/GREEN:**

- RED: `npx vitest run src/challenge/useChallengeSocial.test.ts src/components/ChallengeWeeklyMap.test.tsx`.
- GREEN: chạy lại và `npm run typecheck`.

**Boundaries:** Reaction/report dialog chưa được nhúng; không có direct fetch trong WeeklyMap.

### Task 17 - `[ready-for-agent]` Reaction bar và report dialog

**Files:**

- Tạo `src/components/ChallengeReactionBar.tsx`.
- Tạo `src/components/ChallengeReactionBar.test.tsx`.
- Tạo `src/components/ChallengeReportDialog.tsx`.
- Tạo `src/components/ChallengeReportDialog.test.tsx`.

**Implementation details:**

- Reaction bar chỉ hiển thị bốn positive actions với label tiếng Việt dễ hiểu; mỗi action có pressed/pending/disabled state và không gợi cảm giác chấm điểm người tạo.
- Report dialog có ba lý do: đáp án/nguồn có vẻ sai, câu hỏi chưa rõ, nội dung không phù hợp; details optional, giới hạn độ dài, warning không đưa thông tin cá nhân; submit/close accessible.
- Sau report thành công, card hiện trạng thái “đã báo để người lớn kiểm tra”, không công khai reporter và không bắt các bạn khác tranh luận.
- Test keyboard/focus/ESC, reduced motion, network failure retains intent, duplicate click, no free-comment behavior, Vietnamese labels and privacy.

**RED/GREEN:**

- RED: `npx vitest run src/components/ChallengeReactionBar.test.tsx src/components/ChallengeReportDialog.test.tsx`.
- GREEN: chạy lại cùng `npm run typecheck`.

**Boundaries:** Component nhận callback typed, chưa sửa ChallengeDialog cho đến Task 18.

### Task 18 - `[ready-for-agent]` Nối tabs, feedback, reactions và weekly map vào ChallengeDialog

**Files:**

- Sửa `src/components/ChallengeDialog.tsx`.
- Sửa `src/challenge/useChallenge.ts`.
- Sửa `src/styles.css`.
- Sửa `src/components/ChallengeDialog.test.tsx`.

**Implementation details:**

- Tab “Hôm nay” nối question card, feedback, reaction bar và report dialog; item answered mới được phép hiện feedback private.
- Tab “Câu của mình” nối Composer/list từ Task 5, refresh sau create/revise và hiển thị status/review reason không làm lộ dữ liệu moderation nội bộ.
- Tab “Tuần này” gọi weekly API khi tab visible, mount `ChallengeWeeklyMap`; refresh khi mở tab và dừng khi dialog đóng/hidden.
- Khi parent setting `can_participate = false`, daily controls disabled với thông báo phù hợp; khi `can_create = false`, Composer disabled nhưng vẫn xem lịch sử câu đã gửi.
- Thêm aria tablist/tabpanels, focus order, 390px narrow layout, landscape tablet/desktop layout, safe-area padding, scrollbar nội bộ và `prefers-reduced-motion`.
- Không dùng blur toàn trang ngoài phạm vi dialog; challenge dialog không được can thiệp vào effect kính mờ của modal “Nhận dấu” đang có.
- Cập nhật test integration cho tab switching, no ranking text/fields, daily ACK, weekly stale, positive reaction, report, pause settings, lock/logout cleanup.

**RED/GREEN:**

- RED: `npx vitest run src/components/ChallengeDialog.test.tsx` với test mới.
- GREEN: chạy lại, `npm run typecheck`, `git diff --check`.
- Thực hiện manual visual check tại 390x844, 768x1024 và 1440x900 bằng app dev/preview; ghi nhận nếu môi trường chỉ hỗ trợ smoke chứ chưa có device thật.

**Boundaries:** Không đổi cấu trúc navigation, không tạo leaderboard, không sửa modal Nhận dấu/Hành trình ngoài callback/style challenge cần thiết.

---

## P4 - Resilience, contract integration and release verification

### Task 19 - `[ready-for-agent]` Offline draft, retry và privacy/integration flow

**Files:**

- Sửa `src/challenge/drafts.ts`.
- Sửa `src/challenge/useChallenge.ts`.
- Tạo `tests/e2e/challenge-flow.spec.ts`.
- Sửa `server/db/database.integration.test.ts`.

**Implementation details:**

- Giữ draft authoring local-only và versioned; không pre-cache challenge rounds/attempts như dữ liệu offline authoritative.
- Khi offline: cho đọc last-known snapshot nếu có, disable submit/reaction/report/attempt có message rõ; khi mạng trở lại retry request với cùng idempotency key và chỉ render success sau ACK.
- E2E/API contract fixture phải tạo một lớp synthetic với ít nhất ba student, một parent grant và nguồn fact allowlist; flow:
  1. student A tạo câu; lần 4 bị quota;
  2. parent grant approve câu A và request revision câu B;
  3. student B revise câu B;
  4. round daily chọn approved câu, cả student B/C đều trả lời được, author bị chặn;
  5. duplicate attempt/reaction/report không nhân bản;
  6. weekly response có class progress/recognition nhưng không có rank/score-by-student;
  7. void một câu loại contribution của item khỏi aggregate và tính lại round nhưng không phạt cá nhân/thu hồi shared reward đã cấp;
  8. parent grant không đọc được câu của child ngoài scope.
- Dùng synthetic UUID/name, không dùng dữ liệu trẻ thật. Test route phải chạy cùng Vitest include hiện có (`tests/e2e/**/*.spec.ts`), không thêm Playwright dependency.
- Cập nhật `server/db/database.integration.test.ts` expected private table list để bao gồm sáu bảng play và ba bảng authoring; test vẫn xác nhận direct public/anon/authenticated bị revoke.

**RED/GREEN:**

- RED: `npx vitest run tests/e2e/challenge-flow.spec.ts server/db/database.integration.test.ts`.
- GREEN: chạy lại với database test được cấu hình; nếu môi trường không có DB, ghi rõ test skipped vì thiếu dependency thay vì gọi là pass.
- Kiểm tra `git diff --check` và `rg` không có token/secret/real child data trong file mới.

**Boundaries:** Không chạy migration cloud/prod, không deploy, không seed data thật.

### Task 20 - `[ready-for-agent]` Full verification, accessibility and acceptance evidence

**Files:**

- Sửa `src/views/ParentView.test.tsx` nếu cần bổ sung acceptance assertion.
- Sửa `src/components/ChallengeDialog.test.tsx` nếu cần bổ sung acceptance assertion.
- Sửa `tests/e2e/challenge-flow.spec.ts` nếu cần bổ sung acceptance assertion.
- Không tạo/sửa file production chỉ để che lỗi test; mọi test adjustment phải truy được về một requirement trong spec.

**Verification sequence:**

- Chạy fresh, theo đúng thứ tự:

  ```bash
  npm run typecheck
  npm run typecheck:server
  npm run test -- --reporter=dot
  npm run build
  npm run check:edge-runtime
  npm run validate:firebase
  ```

- Nếu database credentials/test environment đã được cấu hình và user đã cho phép dùng môi trường đó, chạy `npm run test:db`; nếu chưa, chỉ kiểm tra migration static + memory/API contract và đánh dấu DB integration là chưa thực thi, không suy diễn thành pass.
- Chạy `git diff --check` và kiểm tra untracked plan/spec hiện có không bị gộp nhầm vào unrelated Pet changes.
- Accessibility smoke: tab qua rail/dialog/tabs/options/reactions/report/parent queue; kiểm tra visible focus, role/name/state, Escape/restore, no keyboard trap, contrast và `prefers-reduced-motion`.
- Responsive smoke: 390x844 portrait, 768x1024 tablet, 1024x768 landscape, 1440x900 desktop; xác nhận daily card/weekly map/parent queue không overflow và body scroll lock chỉ áp dụng đúng overlay đang mở.
- Privacy/security review bằng `rg`: không public direct Supabase client cho challenge, không raw token, không `correctOptionId` trước attempt, không rank/leaderboard endpoint, không source ngoài allowlist.
- Manual acceptance theo checkpoint P0-P4, lưu command/output/failing case trong task handoff; không ghi nhận deploy/push ở bước này.

**Definition of Done:**

- Tất cả requirement của approved spec có một task/test/acceptance assertion tương ứng.
- Create → parent approve/revise → daily round → two-student attempt → feedback → positive reaction/report → weekly class map chạy được với fixture.
- Không có đường đi nào để học sinh tự sửa đáp án đúng, tự duyệt câu, trả lời câu của mình, vượt quota hoặc làm lộ private answer trước attempt.
- Không có bảng xếp hạng cá nhân, so sánh học sinh, thưởng tốc độ, phạt trả lời sai/vắng mặt hay comment tự do.
- Migration/repository/service/API/UI đều có boundary test và error state; idempotency giữ được khi retry.
- Source fact provenance hiển thị được ở parent/feedback và không sửa nguồn gốc reviewed.
- Các thay đổi Pet/friends/leaderboard/modal Nhận dấu ngoài phạm vi vẫn giữ nguyên hành vi; diff đã được review thủ công.
- Fresh verification evidence đạt các lệnh phù hợp; các bước phụ thuộc DB/cloud được ghi rõ trạng thái chưa chạy nếu thiếu môi trường.

---

## P5 - One-class pilot, approval-gated

### Task 21 - `[ready-for-agent]` Rollout gate và pilot readiness

**Files:**

- Tạo `server/challenge/rollout.ts`.
- Tạo `server/challenge/rollout.test.ts`.
- Sửa `server/app.ts`.
- Sửa `src/auth/apiClient.ts`.
- Sửa `src/App.tsx`.

**Implementation details:**

- Định nghĩa `ChallengeRolloutMode = 'off' | 'pilot' | 'on'` và đọc `HOC_VUI_CHALLENGE_MODE` ở server; mặc định an toàn là `off` khi env chưa cấu hình.
- Thêm một config response tối thiểu `{ enabled, mode, scope: 'single-class' }` qua route authenticated để client biết trạng thái, nhưng không expose secrets/connection details.
- Server phải enforce mode ở mọi challenge route, không chỉ ẩn nút: `off` trả failure code hiện có với message an toàn; `pilot` bật cho toàn bộ active roster của đúng lớp; không thêm allowlist email/student để tạo so sánh hoặc vô tình biến thành multi-class.
- App nạp rollout sau auth, đóng challenge dialog khi mode chuyển off/lock/logout và không render success state khi config chưa được ACK. Nếu client config stale, server vẫn là nguồn quyết định cuối.
- Test env off/pilot/on, missing env, student inactive, route bypass, config privacy, logout/parent lock cleanup và compatibility với feature rail/dialog hiện tại.

**Pilot readiness packet, không phải lệnh deploy:**

- [ ] Xác nhận source hash/catalog version và migration checksum đã được review.
- [ ] Xác nhận có ít nhất một parent duyệt thử và một câu `request_revision` trong fixture, không dùng dữ liệu thật.
- [ ] Xác nhận hai student synthetic có thể cùng trả lời, retry không nhân bản, report/void không làm phạt cá nhân.
- [ ] Xác nhận dashboard/feature rail không có rank, top, fastest hoặc score comparison.
- [ ] Xác nhận log/metric vận hành chỉ ghi event ID, route/result/latency/error code; không ghi prompt nhạy cảm, token, PIN, raw report details hay tên trẻ không cần thiết.
- [ ] Xác nhận stop switch là chuyển mode về `off`, giữ lịch sử và không xóa dữ liệu.
- [ ] Chỉ sau khi người dùng duyệt release packet mới tiến hành migration/deploy/push; target Firebase project, Supabase project, Git remote và Git branch phải được xác nhận riêng.

**Verification:**

- RED: `npx vitest run server/challenge/rollout.test.ts`.
- GREEN: chạy lại, `npm run typecheck`, `npm run typecheck:server`, `npm run build`.
- Không xem feature là đã phát hành chỉ vì local pilot gate pass; cần evidence của môi trường đích ở phase release riêng.

**Boundaries:** Task này chỉ cung cấp kill switch/config contract và release readiness. Không tự chạy Supabase migration cloud, Firebase deploy, Git commit hoặc GitHub push.

## Review checkpoints trước khi triển khai

- Người dùng review file plan này và xác nhận thứ tự P0 → P5.
- Sau khi người dùng phê duyệt plan, mới bắt đầu code theo từng checkpoint; mỗi checkpoint phải dừng để báo test/diff thực tế trước khi sang checkpoint kế tiếp nếu có thay đổi blast-radius.
- Sau khi code và local verification đạt, sẽ xin phê duyệt riêng cho migration trên môi trường cloud nếu cần.
- Firebase deploy và GitHub push là bước cuối độc lập; chỉ thực hiện khi người dùng ra lệnh rõ ràng sau khi xem build/test/diff và xác nhận target project/repository/branch.

## Execution handoff

Khi plan được duyệt để triển khai, executor phải:

1. Đọc lại approved spec và plan này trước mỗi checkpoint.
2. Thực hiện ticket theo dependency graph, mỗi ticket bắt đầu bằng RED test và kết thúc bằng GREEN verification.
3. Không đụng vào write-set của Pet dialogue đang có; nếu phát hiện conflict trong `JourneyView.tsx`, dừng tại boundary và báo evidence.
4. Sau mỗi checkpoint gửi: files changed, tests run/result, known gaps, migration status và decision cần user duyệt.
5. Chỉ sau Task 21 mới chuẩn bị release/deploy packet; không tự động commit, push hoặc deploy.

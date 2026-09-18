# Học Vui — kế hoạch tối ưu tải dữ liệu cho GPT-5.6 Luna Max

> **For agentic workers:** Dùng `superpowers:executing-plans` để triển khai tuần tự từng gói; dùng TDD và verification-before-completion. Không tạo task/subagent khác. Mọi đường dẫn tương đối trong tài liệu này tính từ `/Volumes/Pictures/Projects/Hoc_Vui`.

**Mục tiêu:** Giảm thời gian từ bấm mở đến dữ liệu mới sử dụng được của Bạn cùng lớp, Chuyến đi của tớ và Thách đố xuống dưới 3 giây, có phép đo xác nhận; giữ nguyên dữ liệu, phân quyền và nghiệp vụ.

**Kiến trúc:** Giảm HTTP waterfall và SQL round trips trước; batch read theo phạm vi người dùng/ngày/tuần; giữ quy trình ghi và transaction nghiệp vụ. Đo từng lớp để quyết định tiếp về database/region/pool; không dùng cache quyền hoặc hiển thị dữ liệu cũ để tuyên bố đạt tốc độ dữ liệu mới.

**Công nghệ:** React 18, TypeScript, Vitest 2, PostgreSQL qua postgres.js, Supabase Edge/Deno, Firebase Hosting. Giữ dependencies hiện hành, không thêm ORM/APM/framework chỉ để làm gói này.

**Trạng thái tài liệu:** Kế hoạch bàn giao, chưa thực thi các gói L0–L7. Việc gửi prompt triển khai là quyết định của người dùng. Phiên soạn kế hoạch chỉ ghi tài liệu và manifest.

## 1. Điểm xuất phát và phạm vi

- Source chuẩn: `/Volumes/Pictures/Projects/Hoc_Vui`.
- HEAD tham chiếu: `98690ab3b5b527862821658cd8afcfa8287ebcbe`. Bản sửa Bạn cùng lớp đang **uncommitted** trên HEAD này; chỉ checkout commit là chưa đủ.
- Manifest 7 file đã nghiệm thu: `docs/executor/load-performance/accepted-source-baseline.json`.
- Audit: `docs/design/2026-09-18-data-loading-audit.md`.
- Ledger cũ: `docs/superpowers/plans/2026-09-18-load-latency-execution.md`; guard ở đó chỉ áp dụng Packet 1 cũ. Prompt mới chọn kế hoạch L0–L7 này sẽ cấp phạm vi triển khai mới, không thực hiện lại Packet 1.
- Task Luna có thể tái sử dụng: `01a0b397-4708-7b20-b158-c1e81917748d`.
- **Không dùng bản sửa cũ** ở `/Users/macbook/.codex/worktrees/4fc1/Hoc_Vui` làm baseline, không copy/merge nó vào source. Nó khác bản đã nghiệm thu và giữ lại chỉ làm dấu vết.
- Source chứa design/audio/progress-map cùng nhiều tài liệu untracked ngoài scope. Không add, reset, stash, xóa hay sửa chúng.
- Kết quả phiên trước: 556 tests đạt, 4 skip, typecheck/build đạt; đây là bằng chứng lịch sử, phải xác minh lại khi thực thi.

**Hành vi phải giữ:** roster chỉ open/reopen/retry; không polling roster; presence và chat realtime/polling vẫn hoạt động; read receipt cập nhật local; đổi account/logout/reset không lẫn dữ liệu; chưa reviewed lesson không thành playable.

**Không đổi trong kế hoạch này:** UI layout, artwork/audio, nội dung bài học, cách tính điểm/recognition, hạn mức câu hỏi, eligibility/moderation, timezone Asia/Ho_Chi_Minh, cách thu hồi phiên, parent grant, thuật toán PIN, pagination chat hoặc thứ tự tin nhắn.

## 2. Cách thực thi và quyền hạn

Khi người dùng gửi prompt kèm tài liệu này, executor làm trực tiếp tại source chuẩn, tuần tự một owner. Không tạo worktree mới; nếu đang đứng ở worktree cũ, đặt `workdir` tuyệt đối cho mọi command. Không đồng thời cho task khác sửa write-set này. Nếu phát hiện file đang được sửa ngoài gói, đối chiếu diff và dừng đúng phần xung đột.

Được sửa code/test/docs trong write-set mỗi gói; chạy kiểm tra local. Không tự commit/push/PR/merge, deploy, thay secrets/region/pool cloud, provision account cloud, apply migration hay xóa worktree. Không ghi Brain_Vault. Không dùng dữ liệu học sinh thật làm fixture. Không truy cập credential mới chỉ để benchmark.

**Local database:** Chỉ dùng database test biệt lập đã xác định rõ, không suy diễn từ `DATABASE_URL`. Test hiện có có thể fallback sang `DATABASE_URL`/`DB_URL` và có INSERT/UPDATE. L0 phải kiểm tra chỉ host/port/db-name và mục đích, không in password/token. Nếu chưa có local DB được phép dùng, vẫn làm unit tests và code; ghi `DB_VALIDATION_PENDING`, không gọi cloud fallback, không tuyên bố SQL đã được xác nhận trên PostgreSQL thật.

**Độ tự chủ:** Tự tiếp tục gói kế khi tiêu chí local của gói trước đạt. Không xin phép cho từng file/test. Dừng phần phụ thuộc khi có xung đột thực tế, cần đổi nghiệp vụ, thiếu target DB để chạy integration, hoặc tới bước external deployment. Thiếu DB không ngăn phần code/unit độc lập tiếp theo; nhưng chặn trạng thái READY_FOR_RELEASE.

## 3. Mục tiêu đo và ngân sách kỹ thuật

| Luồng | Mục tiêu cấu trúc sau tối ưu | Phép đo người dùng |
|---|---|---|
| Bạn cùng lớp | 1 GET roster khi mở; auth 1 SQL + roster 1 SQL | click → danh sách mới hiển thị và chọn bạn được |
| Chuyến đi | 1 GET board khi mở, không config → board trong hook; auth 1 SQL + source 1 statement | click → board mới và các tương tác sẵn sàng |
| Thách đố hôm nay | Đường vòng đã sẵn sàng: mục tiêu ≤12 SQL kể cả auth, độc lập số câu hỏi trong giới hạn; đường tạo/đóng vòng đo riêng | click → câu hỏi mới hoặc empty-state hợp lệ, nút hoạt động |
| Thách đố tuần | Không query theo mỗi ngày/item/student; mục tiêu ≤10 SQL kể cả auth | chọn tab → dữ liệu tuần mới hiển thị |

Ngân sách SQL là **acceptance thiết kế cần đo**, không phải thông số đã đạt. Nếu bảo toàn nghiệp vụ cần vượt ngân sách, báo số query, nguyên nhân và phương án trước khi đổi thuật toán. Không thêm query chỉ để đạt con số đẹp; không bỏ kiểm tra quyền hoặc khóa.

- Mục tiêu warm p95 <3.000 ms; tối thiểu 30 lần mỗi feature/mỗi dataset/mỗi môi trường, 100 lần nếu chi phí phù hợp. Báo số mẫu và dùng percentile nearest-rank: `sorted[Math.ceil(0.95 * n) - 1]`.
- Báo first-open, lần sau idle, warm riêng. Chỉ gọi “cold Edge” nếu có bằng chứng instance khởi tạo; không đánh đồng reload tab với cold start.
- Nếu cold/first-open >3s thì mục tiêu tổng thể còn thiếu, dù warm đạt. Không bỏ các mẫu chậm hoặc lỗi khỏi báo cáo; lỗi được tính error-rate riêng.
- Đo cả màn không có dữ liệu, có dữ liệu thông thường và dữ liệu lớn synthetic. Cache cũ hiển thị nhanh không tính là fresh-data-ready.
- Không cộng các duration chồng lấn để tính tổng. HTTP tổng chứa network; server duration chứa SQL; DB planning time khác network/queue.

## 4. Thứ tự giao việc

`L0 → L1 → L2 → L3 → L4 → L5 → L6 → L7`.

Mỗi gói có cycle: đọc đúng file → test mới chứng minh lỗi/ngân sách hiện tại → chạy RED → sửa nhỏ nhất → GREEN → tự review semantics → ghi ledger. Không phải mỗi checkbox là một lần gọi model; gom các bước cùng gói để giảm overhead.

### L0 — Khóa baseline và chuẩn bị đo

**Write-set:** `docs/executor/load-performance/`, `server/performance/read-budget.test.ts` (mới), `scripts/measure-load-performance.mjs` (mới), `.env.example` chỉ thêm chú thích biến test không secret. Không đổi production behavior.

- [ ] Đọc audit/ledger/manifest; `pwd`, `git rev-parse HEAD`, `git status --short`, `git diff --check`. So sánh hashes 7 file với manifest; nếu đã thay đổi, phân loại thay đổi mới, không khôi phục bản cũ tự động.
- [ ] Lưu HEAD, diff filenames, hashes và actual workdir vào `progress.md`. Đọc `package.json`, `vite.config.ts`, DB integration tests trước khi chạy command có DB.
- [ ] Chạy baseline unit/focused, client/server typechecks. Full test một lần nếu chưa có bằng chứng cùng baseline; lưu exit code thực, không để `tail` che mã lỗi.
- [ ] Tạo fixture synthetic deterministic trong test: 30 peers; 5 câu featured từ 5 authors; round có sẵn, chưa cần đóng vòng cũ; 7 ngày tuần có rounds. Không đưa đáp án thật hoặc tên trẻ vào fixture.
- [ ] Tạo spy/count wrapper ở test boundary cho SQL statements; đếm cả statements transaction nếu có. Tách service repository call count với SQL count — không gọi hai đại lượng là một.
- [ ] Viết runner HTTP chỉ gọi endpoint được chỉ định, token đọc qua env, không in token/header/body. Mặc định reject URL ngoài localhost. Endpoint GET Thách đố có lazy writes nên runner chỉ bật với target test explicit. Output chỉ route-label, iteration, status, totalMs, server-timing, error class.

CLI contract mới:

```text
node scripts/measure-load-performance.mjs --base-url http://127.0.0.1:8888 --route /api/me/friends --samples 30 --output docs/executor/load-performance/friends-before.json
HOC_VUI_BENCH_TOKEN: đọc từ env có sẵn, không ghi vào output/command line.
```

Runner này đo HTTP, không thay cho click-to-render. Nếu chưa có session synthetic local, unit-test parser/percentile/redaction; ghi benchmark NOT_RUN.

Test percentile tối thiểu:

```ts
expect(p95([100, 200, 300, 400, 500])).toBe(500);
expect(p95(Array.from({ length: 100 }, (_, i) => i + 1))).toBe(95);
```

Helper percentile có thể nằm trong script module export và import qua test ở `server/performance/`; CLI chỉ chạy khi module là entrypoint. Không thêm test dưới `scripts/` rồi giả định Vitest tự discover.

**Nghiệm thu:** baseline/fixture/runner có thể tái chạy; missing prerequisites ghi cụ thể; không có mutation cloud.

### L1 — Bỏ lượt config thừa của Chuyến đi

**Write-set:** `src/progress/useProgressBoard.ts`, `src/progress/useProgressBoard.test.tsx`, `src/auth/apiClient.ts`, `src/auth/apiClient.progress-board.test.ts`, `src/progress/progressBoardCache.test.ts` nếu cần thêm regression; báo cáo gói.

**Thiết kế:** giữ App kiểm tra config để hiển thị nút như hiện tại. Trong hook, gọi thẳng `getProgressBoard()`. Endpoint `/api/me/progress-board` đã kiểm tra rollout sau auth. Không gọi config song song “cho nhanh”; loại round trip thừa hẳn.

- [ ] RED: mở hook enabled với account/generation hợp lệ → config không gọi, board gọi đúng một lần.
- [ ] RED: board trả `{ok:false, code:'unavailable', reason:'rollout_disabled'}` → unavailable, không hiển thị cache đã lưu.
- [ ] RED: expired/forbidden → không dùng cache riêng tư làm fallback cho phiên không hợp lệ. Lỗi network/503 thông thường được dùng fallback scoped như hiện tại.
- [ ] Bổ sung reason hẹp cho response type nếu cần; không cast `any` hoặc mở `string` cho mọi error code.
- [ ] Giữ validation contentVersion/ruleVersion/generation, requestSequence và identity guards; old response sau đổi account/close không cập nhật UI.
- [ ] Chỉ dùng cache khi policy cho phép; không thêm SWR mới trong gói này.

Nhánh điều khiển cần thực hiện:

```ts
const result = await getProgressBoard();
if (!isCurrent()) return;
if (!result.ok) {
  if ('reason' in result && result.reason === 'rollout_disabled') {
    // set unavailable + rollout message + data null; never cache fallback
  } else if (result.code === 'expired' || result.code === 'forbidden') {
    // clear data; stable unauthorized UI; never cache fallback
  } else {
    fallback();
  }
  return;
}
// Validate identity, persist valid result, set ready as in existing hook.
```

Đây là control-flow định hướng, không được copy comment thay cho code. Test các giá trị state thực tế, gồm error/message/status/data.

**Command:** `npx vitest run src/progress/useProgressBoard.test.tsx src/progress/progressBoardCache.test.ts src/auth/apiClient.progress-board.test.ts src/App.test.ts`.

**Nghiệm thu:** 2 HTTP sequential → 1 cho mỗi lần mở board; server vẫn gate; không lộ cache khi mất quyền.

### L2 — Giảm xác thực read API từ 3 SQL xuống 1

**Write-set:** `server/auth/types.ts`, `server/auth/postgresRepository.ts`, `server/auth/memoryRepository.ts`, `server/auth/service.ts`, `server/auth/service.test.ts`, `server/auth/postgresRepository.integration.test.ts`, `server/auth/sessionProjection.test.ts` (mới), `server/app.test.ts`; báo cáo gói.

**Quyết định quan trọng:** tối ưu riêng `getSession()` dùng cho authorizeStudent/read routes. Không thay `currentSession()` đang phục vụ PIN/admin/parent/profile mutation bằng account rỗng credentials. Các thao tác cần credentials tiếp tục đường cũ.

Interface mới trong auth/types.ts:

```ts
export type SessionAccountView = Pick<ServerAccountRecord,
  'id' | 'username' | 'displayName' | 'role' | 'active' | 'credentialVersion'>;
export type SessionContext = {
  session: ServerSessionRecord;
  account: SessionAccountView | null;
};
// Add to AuthRepository (required, implement both repositories):
// findSessionContext(tokenHash: string): Promise<SessionContext | null>;
```

- [ ] RED: getSession hợp lệ dùng projection; không gọi findAccountById/loadCredentials; không trả credential/PIN/hash.
- [ ] RED matrix: token không tồn tại, revoked, expiresAt == now, inactive, thiếu account, credentialVersion mismatch, change-only, admin/full, student/full, parentGrant còn/hết hạn.
- [ ] PostgreSQL dùng một SELECT từ sessions LEFT JOIN accounts; alias từng trường để không nhầm hai credential_version. Null khi không session; account null khi session tồn tại nhưng account không có. Giữ mã `expired` vs `forbidden` như hiện tại.
- [ ] Memory implementation phản ánh cùng contract. Narrow `viewSession` account parameter nếu chỉ dùng public fields; không nới rộng payload public.
- [ ] `getSession` vẫn `await ready`, hash opaque token, kiểm tra thời gian bằng injected clock; không cache session/account.
- [ ] Giữ `/auth/me` clearParentGrant; không “tối ưu” bỏ thu hồi page grant. Phân biệt tổng query `/auth/me` với query auth read thông thường.
- [ ] Integration: revoke/disable/PIN version thay đổi trong DB được request kế tiếp nhận ra. Thao tác write/PIN hiện tại vẫn chạy đủ regression.

**Commands:** `npx vitest run server/auth/service.test.ts server/auth/sessionProjection.test.ts server/app.test.ts`; integration auth chỉ trên local DB xác nhận.

**Nghiệm thu:** protected getSession 1 SQL, toàn bộ kiểm tra bảo mật giữ nguyên; mutations không mất credentials; không có cache quyền.

### L3 — Gộp truy vấn danh sách bạn bè

**Write-set:** `server/classroom/types.ts`, `server/classroom/postgresRepository.ts`, `server/classroom/memoryRepository.ts`, `server/classroom/service.ts`, `server/classroom/repository.test.ts`, `server/classroom/service.test.ts`, `server/classroom/roster.integration.test.ts` (mới); báo cáo gói.

Interface mới:

```ts
export type ClassroomRosterRecord = ClassroomPeerRecord & {
  lastSeen: string | null;
  unreadCount: number;
};
// ClassroomRepository.listRoster(actorId: string): Promise<ClassroomRosterRecord[]>;
```

- [ ] RED fixture self + active peers + inactive student + admin + presence/null + messages read/unread hướng khác nhau. Expected public response khớp logic cũ.
- [ ] Một SELECT accounts, LEFT JOIN presence và subquery aggregate messages `WHERE recipient_id = actorId AND read_at IS NULL GROUP BY sender_id`.
- [ ] Filter role student, active true, id != actorId ngay SQL; bind actorId parameter. Không join raw messages rồi nhân số dòng; không lấy message body.
- [ ] Service dùng injected clock và ONLINE_WINDOW_MS hiện tại; giữ sort online rồi locale displayName/username ở cùng tầng như cũ, không đổi collation theo DB.
- [ ] Memory repository implement listRoster theo cùng semantics. Giữ methods cũ còn callers; chỉ xóa nếu xác minh không có caller và tests/contract cập nhật đồng bộ.
- [ ] Compare public keys exact, tổng unread chỉ tính peers hiện hữu, account không có presence là offline.
- [ ] Integration xác nhận PostgreSQL syntax/parameter types và query count thực.

**Commands:** `npx vitest run server/classroom/repository.test.ts server/classroom/service.test.ts src/classroom/useClassroomFriends.test.ts src/components/FriendListDialog.test.tsx src/App.test.ts`.

**Nghiệm thu:** roster business 1 SQL; cùng L2 tổng auth+roster 2 SQL/request; frontend lifecycle không đổi.

### L4 — Đọc nguồn Chuyến đi nhất quán và nhỏ hơn

**Write-set:** `server/learning/postgresRepository.ts`, `server/learning/postgresRepository.integration.test.ts`, `server/learning/progressBoardSource.test.ts` (mới), `server/analytics/progressBoard.test.ts`; báo cáo gói. Không đổi công thức analytics hoặc migration schema ở gói này.

**Thiết kế:** một SQL statement trả snapshot hiện tại và events đúng student/generation; tránh hai SELECT READ COMMITTED có thể gặp reset giữa chừng. Dùng CTE với một hàng actor anchor để vẫn có output khi snapshot chưa tồn tại, LEFT JOIN snapshot và aggregate events.

- [ ] RED parity fixtures: không snapshot/events, có progress, nhiều generation cũ, lesson version cũ, hai students, cùng receivedAt/sequence khác eventId.
- [ ] `getProgressBoardSource(studentId)` vẫn trả `{snapshot, events}` như interface hiện tại; mapSnapshot/mapEvent và createEmptySnapshot giữ quy tắc hiện tại. Generation mặc định phải lấy từ contract empty snapshot, không tự suy đoán literal.
- [ ] Lọc generation ở SQL. Chưa lọc event_type/lesson version trong SQL ở gói này: analytics là source-of-truth cho những quy tắc đó, tránh bỏ evidence cần cho timestamp/discovery.
- [ ] ORDER BY event timestamp/sequence/eventId deterministic; JSON aggregate rỗng trả `[]` chứ không `[null]`. Không cắt lịch sử bằng LIMIT gây sai điểm.
- [ ] Single statement read cho consistency; bỏ transaction bao ngoài nếu không còn cần vì statement đã có snapshot nhất quán. Test reset concurrent ở PostgreSQL.
- [ ] Test output board parity với hàm buildProgressBoardData trên fixture trước/sau, so sánh cùng generatedAt.

**Commands:** `npx vitest run server/learning/progressBoardSource.test.ts server/learning/service.test.ts server/analytics/progressBoard.test.ts src/progress/useProgressBoard.test.tsx`; local integration learning riêng.

**Nghiệm thu:** 1 source SQL statement, không kéo generation cũ, không đổi kết quả board; SQL thật chưa test phải ghi pending.

### L5A — Thách đố: batch câu hỏi và author cho hôm nay

**Write-set:** `server/challenge/authoringTypes.ts`, `server/challenge/postgresAuthoringRepository.ts`, `server/challenge/memoryAuthoringRepository.ts`, `server/challenge/playService.ts`, `server/challenge/playService.test.ts`, `server/challenge/authoringRepository.test.ts`, `server/challenge/readPerformance.integration.test.ts` (mới); báo cáo gói.

Interface mới trong authoringTypes.ts, dùng existing types:

```ts
// AuthoringRepository:
// findQuestionsByIds(ids: readonly string[]): Promise<readonly ChallengeQuestionRecord[]>;
// getAuthorViewsByIds(ids: readonly string[]): Promise<readonly ChallengeAuthorView[]>;
```

- [ ] RED fixture 0/1/5 items; questions/author batch query count không tăng theo item; disabled author, missing question, withdrawn, voided, attempt answered/practice có expected response rõ.
- [ ] Batch questions 1 SQL và authors 1 SQL, unique IDs, empty input trả [] không SQL; không chỉ fetch author từ studentId request vì questions có authors khác nhau.
- [ ] Map rows theo ID, iterate original items order để giữ position. Kiểm tra question.authorId khớp item.authorId; author active/role filter như getAuthorView hiện tại.
- [ ] todayResponse load items, attempts, contributions, mine với số lượt cố định; không nạp full student credential records. Không trả correctOptionId/explanation trước khi trả lời vì batch query có chúng internally.
- [ ] Chỉ bỏ đọc round/items lặp khi chứng minh không stale do insert/markFeatured/concurrent request. Giữ reread authoritative nếu cần correctness; ghi query budget thực.
- [ ] Không song song hóa insertRoundItem/markQuestionFeatured, closeRound hoặc submitAttempt để “giảm thời gian”. Không thay khóa/idempotency/rotation/quota.

**Commands:** `npx vitest run server/challenge/playService.test.ts server/challenge/authoringRepository.test.ts server/challenge/roundRules.test.ts server/challenge/socialService.test.ts src/challenge/useChallenge.test.tsx tests/e2e/challenge-flow.spec.ts`.

**Nghiệm thu:** bỏ 2N question/author reads; tất cả output và bảo vệ đáp án giữ nguyên; cold round path báo riêng.

### L5B — Thách đố: bỏ N+1 theo tuần và danh sách học sinh

**Write-set:** thêm `server/challenge/playTypes.ts`, `server/challenge/postgresPlayRepository.ts`, `server/challenge/memoryPlayRepository.ts`, `server/challenge/weeklyService.ts`, `server/challenge/weeklyService.test.ts`, `server/challenge/playRepository.test.ts`, `server/auth/postgresRepository.ts`, `server/auth/sessionProjection.test.ts`, `server/app.ts`, `server/app.test.ts`; các file authoring/batch từ L5A chỉ nếu cần reuse; báo cáo gói.

Interfaces mới:

```ts
// PlayRepository:
// listRoundItemsBetween(start: string, end: string): Promise<readonly ChallengeRoundItemRecord[]>;
// countCorrectContributionsBetween(start: string, end: string): Promise<ReadonlyMap<string, number>>;
// PostgresAuthRepository (not required on generic AuthRepository):
// listActiveStudentIds(): Promise<string[]>;
// countActiveStudents(): Promise<number>;
```

- [ ] RED week fixture đủ 7 ngày, 35 items, nhiều authors, missing days, zero contributions, rewardGranted, void/practice; so sánh output cũ/new cùng clock.
- [ ] 1 query items date range, 1 aggregate contributions GROUP BY round_date; sao chép đúng predicate countCorrectContributions cũ (không tự thay bằng count attempts).
- [ ] Reuse batch questions cho allItems. Không giả định listQuestionsBetween(created_date) bao phủ câu được featured tuần này nhưng tạo tuần trước.
- [ ] `getDefaultApp` chuyển activeStudentCount/activeStudentIds callbacks sang projection count/IDs. Không sửa admin listStudents response/credential workflows. Những caller khác chưa liên quan giữ nguyên.
- [ ] Không đổi fallback activeIds/recognition logic trong refactor performance; issue nghiệp vụ phát hiện riêng phải ghi finding.
- [ ] getPreferences: tối ưu existing-row read thành SELECT trước; thiếu mới insert-on-conflict rồi SELECT lại để đọc authoritative row khi có concurrent preference update. Không return default ngay sau ON CONFLICT vì có thể bỏ trạng thái khóa thực.
- [ ] Đếm SQL warm daily/week với input 1/5 câu và 1/7 ngày để xác nhận không tăng tuyến tính; tránh Promise.all chỉ chuyển hàng đợi sang một pool connection mà vẫn giữ N+1.

**Commands:** `npx vitest run server/challenge server/auth/sessionProjection.test.ts server/app.test.ts`; integration readPerformance local.

**Nghiệm thu:** daily ≤12 và weekly ≤10 SQL là target; query count không phụ thuộc sĩ số/items; preference khóa có hiệu lực request kế; không nạp credentials để lấy ID/count.

### L6 — Đo server và cache CORS preflight có giới hạn

**Write-set:** `server/app.ts`, `server/app.test.ts`, `server/performance/timing.ts` và `.test.ts` (mới), `supabase/functions/api/index.ts`, `supabase/functions/api/index.test.ts`, `scripts/check-edge-runtime.mjs` nếu assertions cần cập nhật; docs deployment chỉ mô tả timing headers.

- [ ] Tạo request-local timing accumulator, không dùng mutable global map theo student/token. Inject clock đo duration để test deterministic.
- [ ] Emit `Server-Timing: auth;dur=..., data;dur=..., total;dur=...` cho ba read routes. `auth` đo authorizeStudent; `data` đo service; `total` inclusive. Không claim sql duration nếu chưa instrument SQL thật.
- [ ] Error path cũng có timing thích hợp; không overwrite status/cache/content headers hoặc ghi sensitive value vào description.
- [ ] Trên allowlisted CORS response expose `Server-Timing` nếu dùng fetch headers để đọc. Không đổi allowlist/wildcard/credentials policy. Browser Resource Timing cross-origin cần policy riêng; kế hoạch dùng DevTools waterfall/fetch header, không thêm Timing-Allow-Origin rộng.
- [ ] OPTIONS hợp lệ trả `Access-Control-Max-Age: 600`. Giữ Vary Origin, exact methods/headers hiện tại; denied origin vẫn 403 không cho phép truy cập.
- [ ] Dữ liệu riêng tư vẫn Cache-Control no-store; không bật CDN caching response cá nhân.

Ví dụ test:

```ts
expect(preflight.headers.get('Access-Control-Max-Age')).toBe('600');
expect(privateResponse.headers.get('Cache-Control')).toBe('no-store');
expect(timingHeader).not.toContain(studentId);
expect(timingHeader).not.toContain(token);
```

**Commands:** `npx vitest run server/performance server/app.test.ts supabase/functions/api/index.test.ts`; `npm run check:edge-runtime`.

**Nghiệm thu:** timing số hữu hạn không âm, không rò ID/token, preflight cache đúng origin, strict Deno check/runtime smoke đạt. Chỉ thêm observability tối thiểu, không SaaS telemetry.

### L7 — Nghiệm thu tổng thể và bàn giao deploy

**Write-set:** `docs/executor/load-performance/`, `docs/deployment/firebase-supabase-edge.md` chỉ cập nhật hướng dẫn, sửa code chỉ cho defect đã chứng minh thuộc write-set L1–L6.

- [ ] Đối chiếu đủ yêu cầu, self-review auth/rollout/cache/moderation/concurrency. Yêu cầu reviewer độc lập khi có coordinator/user; executor không tự spawn agent. Nếu chỉ có self-review, báo đúng là self-review.
- [ ] Chạy full suite, client/server typecheck, build, Edge runtime, Firebase static validation, diff check. Lưu exit codes và danh sách skipped.
- [ ] Chạy DB integration trên target test đã được xác minh. Test mới phải được discover; skip/no tests không phải pass.
- [ ] Dùng fixtures và runner L0 chạy before/after cùng dataset, network, target. Nếu không lưu được baseline timing trước thay đổi, không bịa phần trăm cải thiện; chỉ báo query-count cũ từ fixture/reference và after timing có thật.
- [ ] Browser walkthrough ở local synthetic: mở feature, đợi dữ liệu mới, click thao tác; đo start click và paint sau response; check mở/đóng 5 lần, tab return, offline retry, reset/đổi account/logout.
- [ ] Báo kết quả các mức: `LOCAL_CODE_VERIFIED`, `DB_VERIFIED` hoặc `DB_VALIDATION_PENDING`, `STAGING_PERF_VERIFIED` hoặc `NOT_RUN`, `PRODUCTION_NOT_DEPLOYED`. Không gộp thành một chữ DONE che missing evidence.
- [ ] Xuất gói review: diff scoped, baseline/final hashes, reports tests/query budget/latency, known limitations, deployment runbook. Dừng `READY_FOR_REVIEW`.

Commands từ source chuẩn; với DB env chưa rõ, xóa khỏi môi trường test unit (không thay file env):

```bash
env -u HOC_VUI_TEST_DATABASE_URL -u DATABASE_URL -u DB_URL -u HOC_VUI_DATABASE_URL -u SUPABASE_DB_URL npm test
npm run typecheck
npm run typecheck:server
npm run build
npm run check:edge-runtime
npm run validate:firebase
git diff --check
```

Đọc lại integration tests để kiểm tra thêm biến target trước khi chạy — command trên là baseline dựa trên code hiện tại. Không dùng npm run test:db:cloud trong kế hoạch local.

## 5. Khi chưa đạt dưới 3 giây

| Bằng chứng đo | Bước kế tiếp |
|---|---|
| auth/data server nhỏ nhưng HTTP lớn | kiểm tra preflight, đường mạng, Edge region/DB region, cold/idle; lập change request môi trường |
| SQL count giảm nhưng data duration vẫn lớn | EXPLAIN trên fixture DB, đọc index hiện hữu, kiểm tra row counts và payload; đề xuất index cụ thể |
| DB/network nhanh nhưng paint chậm | profile render/asset load trên thiết bị mục tiêu; tách khỏi API latency; không mặc định sửa Three.js/UI |
| Chỉ lần đầu round chậm | báo riêng chi phí đóng/tạo/feature round; thiết kế chuẩn bị round cần gói nghiệp vụ riêng, không lén thêm cron |
| Nhiều request đồng thời chờ pool | đo queue/concurrency trước; đề xuất pool/connection budget có tính số isolates, không tự tăng max |

Index/region/pool/scheduler là phần **có điều kiện theo bằng chứng**, không bắt buộc sửa trong L0–L7. Nếu cần migration, chuẩn bị SQL + EXPLAIN trước/sau + tác động lock + rollback, trình review; chưa apply.

## 6. Deployment và rollback — bước riêng sau review

1. Người dùng/coordinator duyệt exact diff + target + quyền deploy. Tài liệu bàn giao không tự cấp quyền cloud.
2. Xác minh project/hosting mapping hiện hành. Các ref trong audit là lịch sử, không thay cho xác nhận target.
3. Có synthetic account và dataset được duyệt trên môi trường nghiệm thu; không tự tạo dữ liệu trẻ thật hoặc dùng account trẻ để benchmark.
4. Deploy backend backward-compatible trước, smoke auth/rollout/routes bằng tài khoản test, rồi deploy frontend. L1 chỉ dựa gate server đã có; không bắt frontend mới phải chờ schema mới nếu không cần.
5. Đo click-to-fresh-data 30+ lần, báo warm/first-open/idle và error-rate. Kiểm tra Service Worker thực sự dùng bundle mới; không xóa toàn bộ storage làm mất progress.
6. Theo dõi 401/403/503, auth revoke, payload correctness, cold/warm, DB connection load. Lỗi quyền/dữ liệu là stop/rollback, không chỉ nhìn tốc độ.
7. Rollback bằng release artifact/hosting version/Edge version đã xác minh trước deploy. Không `git reset --hard` source uncommitted; không rollback dữ liệu học tập hoặc revoke sessions toàn bộ để chữa performance.
8. Chỉ ghi `PERFORMANCE_ACCEPTED` khi có bảng số liệu môi trường đã duyệt đáp ứng mục tiêu. Nếu chỉ local mock nhanh thì trạng thái vẫn chưa đạt production.

## 7. Ledger và tiếp tục sau quota

Cập nhật `docs/executor/load-performance/progress.md` cuối mỗi gói và trước khi dừng:

```text
Task: L2
Status: IN_PROGRESS | LOCAL_VERIFIED | DB_VALIDATION_PENDING | READY_FOR_REVIEW
Actual checkout: absolute path
Baseline HEAD + dirty file hashes:
Changed files:
Last completed step:
Next concrete step:
Tests: exact command, exit code, count, timestamp
DB target: environment label/host/db name only, no secret
Metrics: HTTP count / SQL count / duration source / sample count
Failures and limitations:
```

Sau gián đoạn: đọc ledger và diff trước; không tạo task mới; không chạy lại gói hoàn tất nếu source/test không đổi; không mặc định một tool call chưa trả về đã thất bại; kiểm tra artifact/process/test log rồi mới retry. Không dùng tóm tắt agent thay cho kiểm tra file.

## 8. Gói kết quả bắt buộc

- `progress.md`: trạng thái từng gói và bước tiếp.
- `accepted-source-baseline.json`: giữ nguyên bản chụp đầu vào.
- `baseline.md`: target/fixture/query count/timing trước tối ưu.
- `verification.md`: commands, exit codes, passed/skipped, review findings.
- `latency-results.json`: số đo thật; nếu chưa chạy ghi trạng thái/thiếu prerequisite trong verification, không tạo dữ liệu mô phỏng gắn nhãn thật.
- `handoff.md`: code delivered ở đâu, query budget trước/sau, điều gì chưa xác minh, deploy/rollback proposal.

Không cần chạy benchmark/test lặp liên tục nếu chưa thay code hoặc chưa có giả thuyết mới. Không chạy production probes tăng tải để cố kiếm mẫu p95. Giữ phạm vi nhỏ và bằng chứng rõ.

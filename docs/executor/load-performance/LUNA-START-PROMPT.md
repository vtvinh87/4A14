# Prompt giao GPT-5.6 Luna Max

Dán khối dưới vào task Luna hiện có, chọn model `gpt-5.6-luna`, reasoning `max`. Task đã dùng: `01a0b397-4708-7b20-b158-c1e81917748d`. Không cần tạo task mới.

```text
Triển khai kế hoạch tối ưu tải dữ liệu Học Vui. Bạn là executor GPT-5.6 Luna Max; không tạo thêm task/subagent. Nếu model khác, báo rõ, không tự thay thế.

Đọc trước:
1. /Volumes/Pictures/Projects/Hoc_Vui/docs/superpowers/plans/2026-09-18-load-performance-luna.md
2. /Volumes/Pictures/Projects/Hoc_Vui/docs/executor/load-performance/progress.md
3. /Volumes/Pictures/Projects/Hoc_Vui/docs/executor/load-performance/accepted-source-baseline.json
4. /Volumes/Pictures/Projects/Hoc_Vui/docs/design/2026-09-18-data-loading-audit.md

Đây là packet triển khai mới L0–L7, thay quyền READ-ONLY REVIEW của packet trước trong đúng phạm vi ghi của kế hoạch mới. Không làm lại Packet 1 roster lifecycle cũ.

Tôi giao bạn triển khai trực tiếp tại /Volumes/Pictures/Projects/Hoc_Vui. Mọi command đặt workdir đúng source này, kể cả task đang ở /Users/macbook/.codex/worktrees/4fc1/Hoc_Vui. Không dùng/copy/merge implementation cũ của worktree đó. Không reset/stash/ghi đè bản roster đã nghiệm thu. Giữ behavior và dữ liệu hiện tại, bảo toàn untracked ngoài scope. Không tạo worktree mới.

Thực hiện tuần tự L0, L1, L2, L3, L4, L5A, L5B, L6, L7. Tự tiếp tục gói kế khi verification local đạt, không hỏi lại từng bước code/test thuộc plan. Dùng Brain_Vault router, executing-plans, TDD và verification-before-completion theo quy định hiện hành; không ghi Brain_Vault.

Không commit/push/PR/merge/deploy; không đổi secrets/cloud database/region/pool; không apply migration hoặc tạo tài khoản cloud; không dùng dữ liệu trẻ thật. Chỉ dùng local test database khi target đã xác minh, không suy diễn DATABASE_URL là test. Thiếu DB vẫn làm phần code/unit độc lập, ghi DB_VALIDATION_PENDING và không tuyên bố SQL thật/hiệu năng thật đã đạt.

Bảo toàn auth revoke/expiry/credentialVersion, parent grant, account/generation isolation, rollout gates, gameplay/moderation/quota/transactions. Không bỏ kiểm tra quyền hoặc dùng cache dữ liệu cũ để tuyên bố tải mới dưới 3 giây. Không thêm dependencies lớn.

Mỗi gói: test RED, sửa tối thiểu, GREEN, review, cập nhật progress.md với commands/exit codes, hashes, changed files và next step. Sau gián đoạn quota, kiểm tra diff/artifacts rồi tiếp tục checkpoint, không chạy lại từ đầu.

Chỉ báo số đo thật. Phân biệt SQL count, unit/mock latency, HTTP latency và click-to-fresh-data. Mục tiêu warm p95 dưới 3 giây; cold/first-open phải báo riêng và vẫn là khoảng thiếu nếu vượt mục tiêu. Anonymous 401 và skeleton time không chứng minh thời gian tải dữ liệu.

Kết thúc READY_FOR_REVIEW gồm actual checkout, changed files, trạng thái L0–L7, test/typecheck/build/Edge/integration (kể cả skip), HTTP/SQL count trước–sau, latency có nguồn/môi trường/số mẫu, các điểm chưa xác minh, link baseline.md/verification.md/handoff.md và đề xuất deploy/rollback. Dừng trước external actions.
```

## Prompt tiếp tục sau gián đoạn

```text
Tiếp tục kế hoạch Học Vui load-performance trong task này. Đọc /Volumes/Pictures/Projects/Hoc_Vui/docs/executor/load-performance/progress.md và kiểm tra diff/artifacts trước. Source chuẩn vẫn là /Volumes/Pictures/Projects/Hoc_Vui; không dùng implementation cũ trong worktree 4fc1. Làm đúng next step, không tạo task mới, không làm lại gói đã xác minh nếu source không đổi. Giữ quyền và giới hạn trong LUNA-START-PROMPT.md; dừng READY_FOR_REVIEW sau phần local, không deploy/cloud mutation.
```

## Prompt trả về coordinator để review

```text
Rà soát độc lập kết quả Luna tại /Volumes/Pictures/Projects/Hoc_Vui theo docs/superpowers/plans/2026-09-18-load-performance-luna.md và các file progress.md, verification.md, handoff.md trong docs/executor/load-performance/. Kiểm tra actual diff, preservation roster fix, auth/account isolation, query counts và performance evidence. Không dựa riêng vào kết luận Luna. Báo findings P1/P2 trước; phân biệt local verified với production performance; chưa deploy.
```

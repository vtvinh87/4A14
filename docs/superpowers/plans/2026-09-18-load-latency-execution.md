# Friends lifecycle and data loading latency

> EXECUTOR GUARD — 2026-09-18: Packet 1 has been superseded by the coordinator's direct atomic fix in the source checkout after setup failed to return a real thread ID. Do not implement or edit files from the old packet. If this queued task starts later, read this current source ledger, report READY_FOR_REVIEW with a read-only review of the source diff only, then stop. Never integrate an older worktree implementation.

Scope: refresh classmates on each dialog opening; no automatic roster reload while open. Investigate reported 5–10s loading of classmates, progress board and challenges, with a target below 3s. Local code and tests only; no deploy, cloud mutation, credentials, migration, commit or push.

Coordinator: current task 01a0b395-e9b6-7d53-8204-e31814527094.
Source checkout: /Volumes/Pictures/Projects/Hoc_Vui.
Project: 6ccc8d2f-ca87-4a77-8ac9-12195a08277d.
Baseline: tracked checkout clean; existing untracked design/audio/progress-map artifacts are outside scope.

## Packet 1 — roster lifecycle

Executor: Luna Max task `01a0b397-4708-7b20-b158-c1e81917748d`, host `local`, recovered after interruption from the exact session filename and confirmed with read_thread. Initial queued client ID `client-new-thread:448f0e30-fdb4-4f43-8f25-b5fd7833244f`. Isolated worktree `/Users/macbook/.codex/worktrees/4fc1/Hoc_Vui` from current working tree. The task was running despite not appearing in list_threads and failed on quota; its three-file implementation remains isolated and is not integrated.
Write-set: src/classroom/useClassroomFriends.ts, src/classroom/useClassroomFriends.test.ts, src/App.tsx, relevant App test file only if necessary. Do not edit other files.
Requirements:
- Tie roster loading to dialog opening, refresh once on every close/reopen, never periodically or from focus/online/realtime while open.
- Preserve chat realtime messageRevision and conversation polling/autoscroll. Keep presence updates separated from roster fetching and prevent stale async callbacks after cleanup.
- Do not block roster rendering on presence completion. Preserve explicit retry and send/read semantics without automatic roster re-fetch while open; inspect callbacks and design a minimal safe split if needed.
- Tests: no roster polling after 45s, no focus/online/realtime reload, close/reopen fresh call, late responses ignored, roster displayed while presence remains pending; existing conversation tests pass.
- Return actual checkout, changed files, test commands/results, patch, limitations; stop READY_FOR_REVIEW.

## Parent investigation

Trace frontend request waterfalls, server authentication, DB connection lifecycle, repository query count, and challenge/progress read paths. Prefer concrete local evidence and a reproducible benchmark; do not claim production <3s based on mocks. Define bounded follow-up optimization packet after diagnosis.

## Verification

Inspect diff; integrate only scoped changes preserving existing work; rerun focused regression tests, client/server typechecks and relevant runtime/build checks. Document measured evidence versus unverified production latency.

## Ledger

- Investigation: identified presence -> roster waterfall, progress rollout -> board waterfall, roster polling and visibility/online/realtime reloads.
- Packet 1: direct atomic fix implemented by coordinator in source checkout. Old worktree implementation superseded; recovered Luna task resumed as READ-ONLY reviewer of source diff, not as implementer.
- Actual source write-set: src/classroom/useClassroomFriends.ts, its test, src/App.tsx, src/components/FriendListDialog.tsx, src/components/FriendConversationPanel.tsx; read-receipt callback updates counts locally instead of re-fetching roster.
- TDD: 7 expected failures reproduced before fix. Focused post-fix run: 3 files / 30 tests pass (hook, FriendListDialog, App).
- Baseline revision: 98690ab3b5b527862821658cd8afcfa8287ebcbe.
- Baseline focused tests: 5 files, 35 tests pass (hook, FriendListDialog, progress hook, classroom service, challenge play service).
- Audit: docs/design/2026-09-18-data-loading-audit.md. Public anonymous HTTP checks 0.245–0.544s; protected loading time remains unmeasured. No cloud/account writes.
- Resume verification: npm test reports 126 files passed / 4 skipped, 556 tests passed / 4 skipped; npm run build exit 0 (existing >500kB chunk warning); npm run typecheck:server exit 0; git diff --check exit 0.
- Additional test changes: src/App.test.ts verifies dialog open/close/reopen hook inputs; FriendListDialog.test.tsx verifies read callback friend ID.
- Luna read-only review completed READY_FOR_REVIEW / CLEAN, no P1/P2. Independently reran focused 30 tests, full 556 passed / 4 skipped, client/server typechecks, build and diff check. Old worktree implementation is not integrated. Packet 1 ACCEPTED in source checkout.
- User performance investigation request delivered in audit; P1/P2 optimizations remain proposals. Production <3s is not claimed, no deploy performed.

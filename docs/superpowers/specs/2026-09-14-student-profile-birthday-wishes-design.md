# Hồ sơ học sinh, sinh nhật và lời chúc — Design

Date: 2026-09-14  
Status: `SPEC_APPROVED — implementation plan drafted`  
Scope: Học Vui local-first; phase online chỉ chốt contract và boundary, chưa deploy cloud hoặc nhập dữ liệu trẻ thật.

## Goal

Mở một điểm truy cập người dùng rõ ràng trên HUD để học sinh xem/sửa hồ sơ, đăng xuất và mở Góc phụ huynh; bổ sung avatar preset và ngày sinh; làm Dashboard phụ huynh gọn hơn bằng hai vùng danh sách cuộn độc lập; sau đó cung cấp một bảng lời chúc sinh nhật an toàn cho các bạn cùng lớp.

## Current context and boundaries

- `TopHud` hiện có nút `Phụ huynh`; `SettingsDialog` đã có logout nhưng người chơi khó tìm thấy.
- `PinField` đã tồn tại và phải tiếp tục dùng một input semantic `type=password` cho mỗi PIN, với sáu ô vuông hiển thị tách rời theo ảnh tham chiếu Apple-like.
- Account view hiện có `username`, `displayName`, role và trạng thái; username là định danh không được sửa.
- Auth/session hiện phải tiếp tục account-scoped. Parent PIN vẫn riêng cho đúng child đang đăng nhập, yêu cầu mỗi lần mở và không tin `studentId` từ client.
- ParentView đã có `LessonMap` cho 29 bài và `History` cho activity evidence; metrics, thứ tự dữ liệu và khoảng thời gian không thay đổi.
- Phase local dùng server/runtime local và dữ liệu tổng hợp để kiểm thử. Không provision Supabase/Netlify, không push/deploy, không import dữ liệu trẻ thật trong spec này.

## Approved design

### 1. User menu and student profile

Replace the HUD `Phụ huynh` button with a user/avatar button. The button shows the selected preset avatar, has an accessible label such as `Mở menu tài khoản`, and exposes a small menu with:

1. `Hồ sơ` — opens the profile modal.
2. `Phụ huynh` — opens the existing parent PIN gate; it must not bypass the gate.
3. `Đăng xuất` — calls the existing logout path immediately and returns to the login screen.

The menu closes on Escape, outside click or selecting an item. It uses `aria-expanded`, a labelled menu container and keyboard focus return to the HUD button.

The profile modal contains:

- preset avatar picker; no photo upload in the local phase;
- editable display name, validated by the existing `validateDisplayName` rule;
- read-only username;
- editable `birthDate` as an ISO calendar date, rejecting empty/invalid/future values;
- `Đổi mã PIN`, opening an in-modal change panel with current PIN, new PIN and confirmation fields using the shared `PinField`;
- `Lưu thay đổi`, inline validation/error state and `Đăng xuất`.

The student may update their own display name, avatar and birth date. A parent session scoped to the current child may view the same profile and update the birthday preference, but no client-supplied student ID is trusted for authorization. Save failures keep unsaved form values visible and do not silently alter the session or local progress.

### 2. Profile data contract

Add nullable profile fields without exposing credentials:

```ts
type StudentProfile = {
  avatarId: string;
  birthDate: string | null; // YYYY-MM-DD, calendar date without time zone
  birthdayWishesEnabled: boolean;
};
```

`avatarId` must resolve to an allowlisted Học Vui preset; arbitrary URLs and uploaded files are rejected. The account/session response may include `avatarId` and `birthDate` for the current student, but never includes PIN hashes, salts or raw tokens. Peer-facing responses never include `birthDate` or age.

The local server contract should expose self/parent-scoped profile operations rather than reusing the Admin student update route:

- `GET /api/me/profile` returns the current account's safe profile view.
- `PATCH /api/me/profile` accepts only `displayName`, `avatarId` and `birthDate` for the signed-in student.
- `GET /api/parent/profile` returns the current child's safe profile view under the active parent grant.
- `PATCH /api/parent/profile-preferences` accepts only the current child grant and `birthdayWishesEnabled`.

The existing `POST /api/auth/student/change-pin` remains the source of truth for normal PIN changes; it must receive the current PIN and a new six-digit PIN and must not use the default PIN as an implicit bypass for a full session.

### 3. Local birthday experience

When a full student session loads a valid `birthDate`, compare month/day using `Asia/Ho_Chi_Minh`. If today matches and the account has not celebrated in the current calendar year, show an in-app birthday celebration:

- a modal/banner addressed to the display name;
- Cáo Nhỏ birthday animation and confetti;
- optional sound controlled by the existing sound setting;
- reduced-motion mode removes confetti and uses a calm static celebration;
- a once-per-account-per-year marker keyed by the authenticated student ID and year prevents refresh/reopen duplicates.

Missing, invalid or future dates produce no celebration. For 29 February birthdays, non-leap years celebrate on 28 February. No age is announced. Browser/OS push notifications are out of scope for the local phase.

### 4. Independent ParentView scrolling

Keep each card heading and its action outside the scroll region:

- `LessonMap` renders all 29 lesson rows inside a labelled region such as `Danh sách trạng thái 29 bài`.
- `History` renders all activities in the selected range instead of silently truncating with `slice(0, 12)`, inside a labelled region such as `Danh sách lịch sử hoạt động`.
- Each region has keyboard focusability, touch scrolling, `overflow-y: auto`, `overscroll-behavior: contain`, stable scrollbar space and an explicit maximum height.
- Desktop target: up to roughly 430px; mobile target: up to roughly 360px or the smaller viewport-safe height. The outer Dashboard continues to scroll normally.
- Expanding a history item stays inside the history region and does not change metrics, event ordering or selected date range.

### 5. Online classroom birthday wishes — phase 2

The online phase uses a restricted classroom board, not chat:

- Admin/teacher-managed classroom membership; students cannot discover arbitrary accounts or invite contacts.
- Parent-controlled `birthdayWishesEnabled`, defaulting to `false` until explicitly enabled.
- Peers see only a sanitized message that the current birthday child has a birthday; no peer receives an exact birth date or age.
- Senders choose one approved phrase, emoji and/or Học Vui sticker. No free text and no direct messages in v1.
- One wish per sender/recipient birthday year, with server-side membership, consent and rate checks.
- The recipient sees a birthday board in the app; the parent can see the same received wishes through the scoped parent surface.
- No push notification, public profile directory or cross-class visibility.

The future server entities are `classrooms`, `class_memberships`, `birthday_preferences`, `birthday_wishes` and `in_app_notifications`. The server derives visibility from the authenticated session and membership; it must not trust a client-provided student ID merely because it is present in a request. The phase-2 contract is designed now but remains gated from cloud provisioning, deployment and real-child acceptance.

## Error handling and privacy

- Profile save shows a localized error and preserves the draft when the server is unavailable.
- Invalid avatar IDs, invalid dates, future dates and overlong display names are rejected before persistence and revalidated server-side.
- Logout clears session state, parent grant state, dashboard state and modal state even if the network logout request fails.
- Birthday celebration is best-effort UI state; a storage failure must not block login or learning.
- Birthday wishes are idempotent at the sender/recipient/year boundary; duplicate requests do not create duplicate wishes.
- Exact birth dates remain account/parent scoped; peer endpoints return only event-safe display data.
- Use synthetic accounts and progress for tests. Do not add photo upload, raw child data, or external notification permissions.

## Verification plan

1. Add RED tests for user-menu routing, profile modal fields/validation, avatar allowlist, birth-date rules, logout reachability and the existing PIN change contract.
2. Add pure date tests for Vietnam timezone, once-per-year celebration, invalid/future dates and 29 February behavior.
3. Add ParentView component tests proving all 29 lessons and all activities render inside two labelled scroll regions without changing metrics.
4. Add local server/API contract tests for self profile update, parent-scoped preference update, session boundaries and safe response fields. Add phase-2 wish contract tests for class membership, consent, duplicate prevention and peer privacy without provisioning cloud.
5. Run the full Vitest suite, client/server typechecks, production build and browser smoke at 390px and desktop width. Verify the six PIN cells remain separated, user menu/profile focus behavior works, logout returns to login, both Dashboard lists scroll independently and no horizontal overflow is introduced.

## Out of scope

- Uploading child photos or arbitrary avatar URLs.
- Direct chat, free-text messages, friend discovery, public profiles or cross-class interaction.
- Browser push notifications, email/SMS notifications and native notification permission prompts.
- Supabase/Netlify provisioning, cloud migration, deployment, signing, real-device production acceptance and P9.

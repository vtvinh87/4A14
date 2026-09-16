# Danh sách bạn bè và trò chuyện Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Thêm roster học sinh active từ Supabase, trạng thái online, chat riêng có unread badge trên localhost:8888; thêm icon menu và hạ Pet ở landscape.

**Architecture:** Browser tiếp tục gọi server/app.ts qua các route /api/me/friends và /api/me/presence. ClassroomService xác thực student full-session, đọc account active từ hoc_vui_private.accounts và dùng hai bảng mới cho presence/messages. Frontend polling 15 giây, mở FriendListDialog theo rail và không kết nối trực tiếp Supabase.

**Tech Stack:** React 18, TypeScript strict, Vite, Vitest/jsdom, Node postgres driver, Supabase PostgreSQL migration, Supabase Edge adapter hiện có, PNG HUD assets.

## Global Constraints

- Chỉ roster có role student và active = true; loại Admin và chính account đang đăng nhập.
- Chỉ student full-session được đọc presence/roster/messages; sender luôn lấy từ session server.
- Không trả birthDate, PIN, hash, salt, raw token, parent grant hoặc thông tin Admin cho peer.
- Tin nhắn là plain text, dài từ 1 đến 500 ký tự; giới hạn chính xác 30 tin trong mỗi cửa sổ 60 giây trên từng account.
- Online nghĩa là last_seen không cũ hơn 2 phút; heartbeat và roster polling chạy khoảng 15 giây khi tab hiển thị.
- Bản thử nghiệm dùng dữ liệu account thật đã có trong Supabase nhưng không seed, import hoặc tạo dữ liệu học sinh tự động.
- Tạo và áp dụng migration Supabase để localhost hoạt động; không deploy Firebase, không deploy Edge Function, không push GitHub, không tạo PR.
- Không thêm Supabase Realtime, chat nhóm, mời bạn, classroom membership riêng, push notification hoặc upload avatar.
- Mọi thay đổi phải có test RED trước implementation, test GREEN sau implementation, và fresh verification trước completion.
- Không commit hoặc thay đổi Git lifecycle tự động; chỉ giữ working tree và báo rõ diff cho người dùng trừ khi có yêu cầu riêng.

---

## File map

### Backend and database

- Create: shared/classroom-contracts.ts — DTO an toàn dùng chung giữa server và browser.
- Create: server/classroom/types.ts — repository records, repository interface và classroom failures.
- Create: server/classroom/memoryRepository.ts — repository deterministic cho unit/API tests.
- Create: server/classroom/postgresRepository.ts — truy vấn hoc_vui_private.accounts, classroom_presence và classroom_messages.
- Create: server/classroom/service.ts — classroom business rules sau khi App đã xác thực actor.
- Create: server/classroom/repository.test.ts — behavior tests cho memory repository.
- Create: server/classroom/service.test.ts — authorization, privacy, unread, online và rate-limit tests.
- Create: supabase/migrations/20260916150000_classroom_friends_chat.sql — schema, indexes, RLS và revoke.
- Modify: server/app.ts — AppDependencies, status mapping, student guard và five classroom routes.
- Modify: server/app.test.ts — route boundary and contract tests.
- Modify: server/app.integration.test.ts — optional Postgres smoke coverage with a dedicated test database.
- Modify: server/db/database.integration.test.ts — expected private tables after migration.

### Frontend

- Modify: src/auth/apiClient.ts — classroom API DTOs and request wrappers.
- Create: src/classroom/useClassroomFriends.ts — roster state, polling and presence heartbeat.
- Create: src/classroom/useClassroomFriends.test.ts — timer, visibility, error preservation and reset tests.
- Modify: src/components/JourneyFeatureRail.tsx — live friends item and unread badge.
- Modify: src/views/JourneyView.tsx — rail callback and unread count prop.
- Create: src/components/FriendListDialog.tsx — roster modal and selected conversation state.
- Create: src/components/FriendConversationPanel.tsx — message list, composer and read/send actions.
- Create: src/components/FriendListDialog.test.tsx — modal, grouping, unread and keyboard tests.
- Modify: src/App.tsx — hook, modal state, refresh callbacks, logout reset and body-lock integration.
- Modify: src/components/UserMenu.tsx — image icons for Hồ sơ, Phụ huynh and Đăng xuất.
- Modify: src/components/UserMenu.test.tsx — icon asset regression assertions.
- Modify: src/views/JourneyView.test.tsx — friends rail callback and badge assertions.
- Modify: src/styles.css — rail badge, friend modal, conversation, menu icons and landscape Pet transform.

### Artwork and offline allowlist

- Create: public/art/hud/friends.png — transparent 512px HUD icon.
- Create: public/art/hud/profile.png — transparent 512px menu icon.
- Create: public/art/hud/logout.png — transparent 512px menu icon.
- Modify: public/art/hud/README.md — asset catalog.
- Modify: vite.config.ts — precache URLs and SHA-256 version entries.
- Modify: src/pwa/offline.test.ts — new HUD asset allowlist and byte/hash checks.

---

### Task 1: Shared contracts, database migration and repositories

**Files:**

- Create: shared/classroom-contracts.ts
- Create: server/classroom/types.ts
- Create: server/classroom/memoryRepository.ts
- Create: server/classroom/postgresRepository.ts
- Create: server/classroom/repository.test.ts
- Create: supabase/migrations/20260916150000_classroom_friends_chat.sql
- Modify: server/db/database.integration.test.ts

**Interfaces:**

- Produces FriendSummary, ClassroomMessage, FriendsResponse and ClassroomRepository consumed by Tasks 2–5.
- ClassroomPeerRecord is { id: string; username: string; displayName: string; avatarId: AvatarId; role: 'student' | 'admin'; active: boolean }.
- ClassroomMessageRecord is { id: string; senderId: string; recipientId: string; body: string; createdAt: string; readAt: string | null }.
- ClassroomRepository has these exact methods: listActivePeers(actorId: string): Promise<ClassroomPeerRecord[]>; upsertPresence(accountId: string, lastSeen: string): Promise<void>; listPresence(accountIds: readonly string[]): Promise<ReadonlyMap<string, string>>; listUnreadCounts(recipientId: string): Promise<ReadonlyMap<string, number>>; listMessages(actorId: string, peerId: string, limit: number): Promise<ClassroomMessageRecord[]>; findActivePeer(peerId: string): Promise<ClassroomPeerRecord | null>; countRecentSentMessages(senderId: string, since: string): Promise<number>; insertMessage(input: { senderId: string; recipientId: string; body: string; createdAt: string }): Promise<ClassroomMessageRecord>; markMessagesRead(recipientId: string, senderId: string, readAt: string): Promise<number>.
- PostgresClassroomRepository receives one DatabaseClient and never receives browser/session secrets.
- MemoryClassroomRepository accepts explicit synthetic peers and starts with empty presence/messages; tests can add or update records deterministically.

- [ ] **Step 1: Write the failing shared/repository tests**

Add tests that assert the exact public DTO shape and repository behaviors:

~~~ts
it('lists only active student peers and excludes the actor', async () => {
  const repository = new MemoryClassroomRepository([
    peer('self', 'Minh', true, 'fox-scout'),
    peer('active-peer', 'Lan', true, 'fox-leaf'),
    peer('inactive-peer', 'Bao', false, 'fox-night'),
    adminPeer('admin', 'Admin'),
  ]);

  await expect(repository.listActivePeers('self')).resolves.toEqual([
    expect.objectContaining({ id: 'active-peer', role: 'student', active: true }),
  ]);
});

it('keeps unread counts scoped to recipient and sender', async () => {
  const repository = new MemoryClassroomRepository([peer('self', 'Minh', true, 'fox-scout'), peer('peer-a', 'Lan', true, 'fox-leaf')]);
  await repository.insertMessage({ senderId: 'peer-a', recipientId: 'self', body: 'Chào Minh' });
  await expect(repository.listUnreadCounts('self')).resolves.toEqual(new Map([['peer-a', 1]]));
  await expect(repository.listUnreadCounts('peer-a')).resolves.toEqual(new Map());
});
~~~

- [ ] **Step 2: Run the focused tests and verify RED**

Run: npx vitest run server/classroom/repository.test.ts

Expected: FAIL because the classroom contracts and repository implementations do not exist.

- [ ] **Step 3: Add the shared DTOs**

Implement shared/classroom-contracts.ts with these exact public fields:

~~~ts
export const CLASSROOM_MESSAGE_MAX_LENGTH = 500;
export type FriendSummary = {
  id: string;
  username: string;
  displayName: string;
  avatarId: AvatarId;
  online: boolean;
  unreadCount: number;
};
export type ClassroomMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};
export type FriendsResponse = { friends: FriendSummary[]; unreadCount: number };
export type ClassroomMessagesResponse = { messages: ClassroomMessage[] };
~~~

Import AvatarId from shared/account-contracts.ts. Do not add birthDate, role, active, lastSeen or credentials to FriendSummary.

- [ ] **Step 4: Define repository records and implement MemoryClassroomRepository**

Use ClassroomPeerRecord, ClassroomMessageRecord and ClassroomRepository in server/classroom/types.ts. The repository must:

1. filter peers by role student and active true;
2. exclude the actor ID;
3. store presence by account ID;
4. store messages with generated UUIDs and ISO timestamps;
5. count only unread messages where recipientId is the queried account;
6. mark only incoming messages from the requested peer;
7. return conversation messages in chronological order with a maximum of 50;
8. count recent sent messages using a supplied clock in tests.

Use structuredClone when returning mutable records so tests cannot mutate repository state accidentally.

- [ ] **Step 5: Write and implement the Postgres repository queries**

Use parameterized postgres tagged-template queries. The account roster query must select only:

~~~sql
select id, username, display_name, avatar_id
from hoc_vui_private.accounts
where role = 'student'
  and active = true
  and id <> actor_id
order by lower(display_name), username
~~~

Presence uses an upsert on account_id. Messages use a transaction for rate counting and insertion; the service validates the 1–500 body before calling it. Conversation queries use sender_id/recipient_id in either direction and order by created_at asc. Unread counts group by sender_id with recipient_id = actor_id and read_at is null.

- [ ] **Step 6: Add the migration**

Create classroom_presence and classroom_messages under hoc_vui_private with:

~~~sql
create table if not exists hoc_vui_private.classroom_presence (
  account_id uuid primary key references hoc_vui_private.accounts(id) on delete cascade,
  last_seen timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists hoc_vui_private.classroom_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references hoc_vui_private.accounts(id) on delete cascade,
  recipient_id uuid not null references hoc_vui_private.accounts(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint classroom_messages_distinct_accounts check (sender_id <> recipient_id)
);
~~~

Add indexes for last_seen, recipient unread lookup, both-direction conversation lookup and sender time-window rate lookup. Enable RLS, revoke schema/table access from public, anon and authenticated, matching the existing private schema policy.

- [ ] **Step 7: Run repository tests and static checks**

Run: npx vitest run server/classroom/repository.test.ts

Expected: PASS. Then run npm run typecheck:server and git diff --check; both must exit 0.

- [ ] **Step 8: Inspect the task diff**

Confirm the migration contains no destructive drop/truncate statement, repository responses contain no credential fields, and no .env or secret file was modified.

### Task 2: Classroom service and protected API routes

**Files:**

- Create: server/classroom/service.ts
- Create: server/classroom/service.test.ts
- Modify: server/app.ts
- Modify: server/app.test.ts
- Modify: server/app.integration.test.ts

**Interfaces:**

- createClassroomService(repository: ClassroomRepository, clock: () => Date = () => new Date()) produces:
  - listFriends(studentId): Promise<{ friends: FriendSummary[]; unreadCount: number }>
  - heartbeat(studentId): Promise<void>
  - listMessages(studentId, peerId, limit): Promise<{ messages: ClassroomMessage[] } | ClassroomFailure>
  - sendMessage(studentId, peerId, body): Promise<{ message: ClassroomMessage } | ClassroomFailure>
  - markRead(studentId, peerId): Promise<{ marked: number } | ClassroomFailure>
- createApp receives optional classroom?: ClassroomService.
- Routes derive the actor from auth.getSession(token) and reject admin/change-only sessions before invoking ClassroomService.

- [ ] **Step 1: Write failing service tests**

Cover body normalization, missing peer, inactive peer, unread scoping, online threshold and rate limit:

~~~ts
it('returns online friends first and computes unread badges', async () => {
  const now = new Date('2026-09-16T08:00:00.000Z');
  const repository = fixtureRepository(now);
  await repository.upsertPresence('peer-online', new Date(now.getTime() - 60_000).toISOString());
  await repository.insertMessage({ senderId: 'peer-online', recipientId: 'student-a', body: 'Chào bạn' });

  const service = createClassroomService(repository, () => now);
  await expect(service.listFriends('student-a')).resolves.toMatchObject({
    friends: [expect.objectContaining({ id: 'peer-online', online: true, unreadCount: 1 })],
    unreadCount: 1,
  });
});

it('rejects the 31st message in a rolling 60-second window', async () => {
  const now = new Date('2026-09-16T08:00:00.000Z');
  const repository = fixtureRepository(now);
  seedThirtyMessages(repository, 'student-a', 'peer-online', now);
  const service = createClassroomService(repository, () => now);
  await expect(service.sendMessage('student-a', 'peer-online', 'Tin thứ 31')).resolves.toEqual({
    ok: false,
    code: 'rate-limited',
    message: 'Bạn đã gửi quá nhanh; hãy thử lại sau một lát.',
  });
});
~~~

- [ ] **Step 2: Run the focused service tests and verify RED**

Run: npx vitest run server/classroom/service.test.ts

Expected: FAIL because ClassroomService is not implemented.

- [ ] **Step 3: Implement the service**

The service trims the body, rejects empty or overlong values, verifies findActivePeer(peerId), counts messages in the inclusive rolling 60-second window, and maps repository records to the shared DTO. listFriends calculates online as Date.parse(lastSeen) >= now - 120000, sorts online first, then display name/username, and sums per-peer unread counts. Never include exact lastSeen in the DTO.

- [ ] **Step 4: Add API failure typing and the student guard**

Extend the server classroom failure union with invalid, forbidden, not-found, rate-limited and unavailable. Update statusForFailure in server/app.ts so not-found maps to 404 and rate-limited maps to 429. Add an authorizeStudent helper that:

~~~ts
const token = requireToken(request);
if (typeof token !== 'string') return { ok: false, response: failure(token, 401) };
const session = await auth.getSession(token);
if ('ok' in session) return { ok: false, response: failure(session, 401) };
if (session.account.role !== 'student' || session.mode !== 'full') {
  return { ok: false, response: failure({ ok: false, code: 'forbidden', message: 'Hãy hoàn tất đăng nhập tài khoản học sinh trước.' }) };
}
return { ok: true, token, studentId: session.account.id };
~~~

- [ ] **Step 5: Add the five routes**

Implement:

1. GET /api/me/friends — calls listFriends.
2. POST /api/me/presence — calls heartbeat; ignores any client accountId.
3. GET /api/me/friends/:id/messages — decodes route ID and clamps limit to 1–50.
4. POST /api/me/friends/:id/messages — accepts only body, calls sendMessage.
5. POST /api/me/friends/:id/read — calls markRead.

Return 503 with Classroom chưa sẵn sàng trên máy chủ. when the optional service is absent. Make getDefaultApp construct PostgresClassroomRepository and ClassroomService beside the existing auth/learning services.

- [ ] **Step 6: Add route boundary tests**

Extend server/app.test.ts to assert:

- a student can read a roster but sees no Admin/self;
- a change-only student gets 403;
- an Admin gets 403;
- a client-supplied senderId is ignored/rejected;
- an inactive peer cannot receive a message;
- message DTO contains no role, active, birthDate, token or credential field;
- read marks only messages addressed to the actor.

- [ ] **Step 7: Run targeted backend tests**

Run: npx vitest run server/classroom server/app.test.ts

Expected: PASS. Then run npm run typecheck:server.

- [ ] **Step 8: Inspect API routes for accidental scope expansion**

Confirm routes do not accept parent grants, do not reuse Admin list routes, do not expose exact presence timestamps, and do not modify existing parent/progress behavior.

### Task 3: Browser API wrappers and classroom state hook

**Files:**

- Modify: src/auth/apiClient.ts
- Create: src/classroom/useClassroomFriends.ts
- Create: src/classroom/useClassroomFriends.test.ts

**Interfaces:**

- getFriends(): Promise<ApiResult<FriendsResponse>>
- sendPresence(): Promise<ApiResult<Record<string, never>>>
- getFriendMessages(friendId: string, limit = 50): Promise<ApiResult<ClassroomMessagesResponse>>
- sendFriendMessage(friendId: string, body: string): Promise<ApiResult<{ message: ClassroomMessage }>>
- markFriendMessagesRead(friendId: string): Promise<ApiResult<{ marked: number }>>
- useClassroomFriends(enabled: boolean) returns { friends, unreadCount, loading, error, refresh, clear }.

- [ ] **Step 1: Write failing client API and hook tests**

Mock fetch and fake timers. Assert route encoding, bearer inclusion from the existing request helper, initial refresh, 15-second heartbeat/polling, no polling when disabled or document hidden, previous data preservation on a temporary 503, and clear on disable:

~~~tsx
it('polls friends and sends presence only while enabled and visible', async () => {
  vi.useFakeTimers();
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  mockFriendsResponse([{ id: 'peer-a', online: true, unreadCount: 2 }]);
  const mount = document.createElement('div');
  const root = createRoot(mount);
  act(() => root.render(createElement(FriendsProbe, { enabled: true })));
  await settle();
  expect(fetchMock).toHaveBeenCalledWith('/api/me/presence', expect.any(Object));
  await act(async () => { vi.advanceTimersByTime(15_000); await settle(); });
  expect(fetchMock.mock.calls.filter(([url]) => url === '/api/me/friends')).toHaveLength(2);
  act(() => root.unmount());
  vi.useRealTimers();
});
~~~

Use the existing createRoot/act/jsdom test pattern already used by JourneyView.test.tsx; do not add @testing-library/react.

- [ ] **Step 2: Run tests and verify RED**

Run: npx vitest run src/classroom/useClassroomFriends.test.ts

Expected: FAIL because wrappers and hook are not present.

- [ ] **Step 3: Add API wrappers**

Use the existing request helper and encodeURIComponent(friendId). Keep messages and presence out of the parent-grant path. Extend ApiFailure only with not-found and rate-limited if TypeScript requires those codes.

- [ ] **Step 4: Implement useClassroomFriends**

Use one interval at 15,000 ms. On each visible tick, call sendPresence then getFriends. Register visibilitychange and online listeners; on becoming visible/online call refresh once. Preserve the last friends/unread state when refresh fails and expose the localized error. When enabled changes to false, clear the interval, listeners, state and error.

- [ ] **Step 5: Run hook tests and typecheck**

Run: npx vitest run src/classroom/useClassroomFriends.test.ts

Expected: PASS. Then run npm run typecheck.

### Task 4: Friend rail, modal and conversation UI

**Files:**

- Modify: src/components/JourneyFeatureRail.tsx
- Modify: src/views/JourneyView.tsx
- Create: src/components/FriendListDialog.tsx
- Create: src/components/FriendConversationPanel.tsx
- Create: src/components/FriendListDialog.test.tsx
- Modify: src/views/JourneyView.test.tsx

**Interfaces:**

- JourneyFeatureRailProps = { onOpenFriends: () => void; friendsUnreadCount: number }.
- JourneyViewProps gains onOpenFriends and friendsUnreadCount.
- FriendListDialogProps = { friends: readonly FriendSummary[]; loading: boolean; error: string; onRefresh: () => Promise<void> | void; onFriendsChanged: () => Promise<void> | void; onClose: () => void }.
- FriendConversationPanel consumes one FriendSummary and the API wrappers; it reports onFriendsChanged after read/send.

- [ ] **Step 1: Write failing UI tests**

Cover live friends button, three rail items, total badge, online separator, per-friend unread badge, opening a conversation marking only that friend read, sending a trimmed message, preserving a failed draft, empty/error/retry state and focus return:

~~~tsx
it('groups online friends first and keeps unread badges visible', async () => {
  render(<FriendListDialog friends={[
    friend('offline', false, 0),
    friend('online', true, 2),
  ]} loading={false} error="" onRefresh={vi.fn()} onFriendsChanged={vi.fn()} onClose={vi.fn()} />);
  expect(screen.getByText('Đang online')).toBeInTheDocument();
  expect(screen.getByText('Đang offline')).toBeInTheDocument();
  expect(screen.getByTestId('friend-unread-online')).toHaveTextContent('2');
  expect(screen.getByTestId('friend-online-separator')).toBeInTheDocument();
});
~~~

- [ ] **Step 2: Run UI tests and verify RED**

Run: npx vitest run src/components/FriendListDialog.test.tsx src/views/JourneyView.test.tsx

Expected: FAIL because the live feature and dialogs are not present.

- [ ] **Step 3: Make the rail support a live friends feature**

Add feature id friends and asset /art/hud/friends.png. Keep leaderboard/challenge mapped to FeatureComingSoonDialog. Clicking friends calls onOpenFriends; it must not open the coming-soon dialog. Render an accessible badge with aria-label containing the unread total and hide the badge when zero. Keep the text label visually hidden but available through aria-label/title.

- [ ] **Step 4: Implement FriendListDialog**

Use the existing dialog focus-trap pattern from SettingsDialog/FeatureComingSoonDialog. Render:

- a labelled dialog with close button;
- loading state;
- retry state after error;
- empty state;
- online rows first;
- a horizontal separator only when both online and offline groups exist;
- offline rows;
- unread count for each row.

Do not remove unread badges when the list opens. Keep selected friend state inside the modal.

- [ ] **Step 5: Implement FriendConversationPanel**

On selection, call getFriendMessages then markFriendMessagesRead for that friend. Render chronological message bubbles using text nodes, not dangerouslySetInnerHTML. The composer trims on submit, rejects empty and over-500 client values, keeps the draft on API failure, disables while sending, and announces errors with an aria-live region. Add back-to-list and close controls.

- [ ] **Step 6: Run focused UI tests**

Run: npx vitest run src/components/FriendListDialog.test.tsx src/views/JourneyView.test.tsx

Expected: PASS. Then run npm run typecheck.

### Task 5: App integration, visual polish, menu icons and landscape layout

**Files:**

- Modify: src/App.tsx
- Modify: src/components/UserMenu.tsx
- Modify: src/components/UserMenu.test.tsx
- Modify: src/styles.css
- Create: public/art/hud/friends.png
- Create: public/art/hud/profile.png
- Create: public/art/hud/logout.png
- Modify: public/art/hud/README.md
- Modify: vite.config.ts
- Modify: src/pwa/offline.test.ts

**Interfaces:**

- App creates useClassroomFriends(Boolean(authSession?.account.role === 'student' && authSession.mode === 'full')).
- App owns friendsDialogOpen, passes onOpenFriends={() => setFriendsDialogOpen(true)} to JourneyView and renders FriendListDialog at root.
- Logout sets friendsDialogOpen false; hook disable clears roster and unread state.

- [ ] **Step 1: Generate and inspect the new PNG assets**

Use the image-generation skill for three brand-new transparent PNGs. Prompt requirements for each: premium 3D toy-adventure HUD style, warm ivory/gold materials, cyan/teal highlights, centered square composition, no text, no watermark, no outer button, readable at 28–58px. Subject directions:

- friends: two friendly explorer badges/figures with a small shared compass motif;
- profile: friendly explorer identity badge with a simple portrait silhouette and star;
- logout: open adventure doorway with an outgoing arrow and warm gold light.

Save exact outputs under public/art/hud/. Verify each with file, confirm RGBA/transparent pixels, and check the visual at the rail/menu sizes before wiring it.

- [ ] **Step 2: Write failing integration and asset tests**

Add assertions for FriendsDialog rendering from App props, logout closing it, UserMenu item images, new URLs in the offline allowlist, and the landscape transform rule. Run the focused tests before implementation:

Run: npx vitest run src/App.test.ts src/components/UserMenu.test.tsx src/pwa/offline.test.ts

Expected: FAIL on new asset/menu/friends assertions.

- [ ] **Step 3: Integrate the hook and modal into App**

Add friendsDialogOpen state, include it in the existing body overflow effect, pass hook state to JourneyView, and render FriendListDialog after the existing profile/birthday/parent dialogs. The modal close callback returns focus to the rail button. Do not reset progress, profile or parent grant when opening/closing friends.

- [ ] **Step 4: Add menu images**

Render an image in each user-menu-item:

~~~tsx
<span className="user-menu-item-icon" aria-hidden="true">
  <img src="/art/hud/profile.png" alt="" />
</span>
<span>Hồ sơ</span>
~~~

Use profile.png for Hồ sơ, parent.png for Phụ huynh and logout.png for Đăng xuất. Keep existing action callbacks and keyboard behavior unchanged.

- [ ] **Step 5: Add CSS for the new UI**

Add styles for menu icon boxes, rail unread badge, friend dialog heading/rows, status dots, online separator, message bubbles, composer, error/retry states and mobile safe-area padding. Keep modal z-index above the rail and preserve overflow hidden on body while open.

Add this landscape-only adjustment after existing responsive rules:

~~~css
@media (orientation: landscape) and (min-width: 701px) {
  .pet-zone { transform: translateY(38px); }
}
~~~

Do not change the current mobile transform.

- [ ] **Step 6: Update PWA asset allowlist and hashes**

Add friends/profile/logout to LOCAL_ART_URLS in vite.config.ts. After assets are final, compute:

Run: shasum -a 256 public/art/hud/friends.png public/art/hud/profile.png public/art/hud/logout.png

Add the exact 64-character hashes to LOCAL_ART_VERSIONS and update offline tests to assert all three files exist, have PNG signatures and match their listed hashes. Update the HUD README.

- [ ] **Step 7: Run frontend focused tests**

Run: npx vitest run src/App.test.ts src/components/UserMenu.test.tsx src/components/FriendListDialog.test.tsx src/views/JourneyView.test.tsx src/pwa/offline.test.ts

Expected: PASS. Then run npm run typecheck and npm run build.

- [ ] **Step 8: Inspect visual layering and state reset**

Use localhost:8888 to verify: rail has three icon buttons, total unread badge is visible, modal blocks the page correctly, online separator is present, the user menu has aligned icons, and Pet is lower only in landscape. Exercise logout and confirm the friend state disappears.

### Task 6: Apply the approved migration and perform fresh local verification

**Files:**

- No source edits expected unless a verification failure identifies a concrete defect.
- Supabase remote schema target: the already linked 4A14 project only.

**Interfaces:**

- Requires the migration from Task 1 and the deployed local server runtime configuration.
- Produces schema verification evidence and localhost smoke evidence; it does not produce a Firebase or GitHub release.

- [ ] **Step 1: Verify the Supabase CLI target read-only**

Run supabase migration list and inspect only project/migration identifiers. Confirm the linked project is the 4A14 Supabase project before any write. Do not print connection strings, passwords or secret values.

- [ ] **Step 2: Apply only the new migration**

Run supabase db push from the repository root after confirming the migration list. Do not use --include-all, reset, db wipe or destructive SQL. Stop if the CLI target is not the linked 4A14 project.

- [ ] **Step 3: Verify the two new tables read-only**

Run the database metadata check used by server/db/database.integration.test.ts and confirm classroom_messages and classroom_presence exist under hoc_vui_private, RLS remains enabled and no public grants were added.

- [ ] **Step 4: Run the complete automated verification**

Run:

~~~bash
npm test
npm run typecheck
npm run typecheck:server
npm run build
npm run check:edge-runtime
~~~

Expected: all commands exit 0. Database integration tests may run only when their dedicated test database environment is configured; never point a destructive integration suite at the live class runtime without synthetic fixture isolation.

- [ ] **Step 5: Smoke-test localhost without deploying**

Confirm the existing local server on port 8888 serves the app and API. Use two already-authorized student sessions only if they are available to the user; do not create or reset real student credentials. Verify roster excludes Admin/self, online ordering changes after heartbeat, a message appears for the recipient and unread badges clear only after opening that friend conversation.

- [ ] **Step 6: Final diff and boundary check**

Run git status --short, git diff --check and git diff --stat. Confirm no Firebase deploy command, Supabase Edge deploy command, GitHub push, secret file or unrelated source file changed.

---

## Final verification checklist

- [ ] FriendSummary excludes Admin/self and never includes exact lastSeen or birthDate.
- [ ] API routes reject missing, Admin, change-only, inactive-peer and tampered-sender requests.
- [ ] Presence threshold is exactly 2 minutes and polling/heartbeat is approximately 15 seconds.
- [ ] Unread total and per-friend badges are correct; opening the list alone does not mark read.
- [ ] Conversation composer preserves failed drafts and sends plain text only.
- [ ] Menu icons align without changing profile/parent/logout behavior.
- [ ] Pet moves to translateY(38px) only in landscape min-width 701px.
- [ ] PNG assets are transparent, hash-listed and precached.
- [ ] Full tests, typechecks, build and Edge runtime checks pass.
- [ ] Only localhost and the approved Supabase schema migration were touched; Firebase/GitHub remain untouched.

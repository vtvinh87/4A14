# Classroom Chat Realtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add live direct-message updates to the existing student chat while preserving the current API and private database boundary.

**Architecture:** Keep `/api/me/friends/*` as the authenticated source of truth. Add an optional server-side Supabase Broadcast bridge that derives an opaque per-student topic with HMAC and broadcasts only `{ messageId }`; the browser subscribes with a public key, then re-fetches authorized messages through the existing API. The UI keeps the existing 15-second fallback while a conversation is open and refreshes immediately on valid Realtime events.

**Tech Stack:** React 18, TypeScript strict, Vitest/jsdom, `@supabase/supabase-js` Realtime client, Supabase Edge Function, Node Web Crypto, existing PostgreSQL API repository.

## Global Constraints

- Keep `hoc_vui_private.classroom_messages` server-only; do not add browser table grants or direct Supabase Data API reads.
- Never place `SUPABASE_SERVICE_ROLE_KEY`, Supabase secret key, database URL, JWT/signing secret or `HOC_VUI_REALTIME_TOPIC_SECRET` in source, `VITE_*`, browser responses or logs.
- Broadcast payload is exactly a validated non-empty `messageId`; never broadcast message body or full database rows.
- Existing custom bearer sessions remain the only student authentication for API reads/writes.
- Existing plain-text 1–500 character validation, 30 messages/60 seconds, read marking and active-peer checks remain unchanged.
- Realtime is best-effort; persisted messages must remain available through the API fallback after event loss or reconnect.
- Preserve unrelated untracked files, especially `docs/superpowers/specs/2026-09-17-thach-do-tiep-suc-tri-thuc-design.md` and its plan.
- Verify production secret scanning and full quality gates before commit, push and deploy.

---

### Task 1: Realtime contract, HMAC topic bridge and protected config route

**Files:**

- Modify: `shared/classroom-contracts.ts`
- Create: `server/classroom/realtime.ts`
- Modify: `server/classroom/service.ts`
- Modify: `server/app.ts`
- Test: `server/classroom/realtime.test.ts`
- Test: `server/app.test.ts`

**Interfaces:**

```ts
export type ClassroomRealtimeConfig = {
  supabaseUrl: string;
  publishableKey: string;
  topic: string;
};

export type ClassroomRealtimeBridge = {
  configForStudent(studentId: string): Promise<ClassroomRealtimeConfig>;
  notifyMessage(input: { messageId: string; recipientId: string }): Promise<void>;
};
```

- [x] **Step 1: Write the failing bridge tests**

Cover deterministic topic derivation, URL/key/topic config, no secret leakage in the config, exact Broadcast REST path/payload, and non-2xx notifier failure. Mock only the injected `fetch` boundary and environment reader.

- [x] **Step 2: Run the bridge tests and verify RED**

Run: `npx vitest run server/classroom/realtime.test.ts`

Expected: FAIL because the contract and bridge do not exist.

- [x] **Step 3: Implement the minimal bridge**

Use `crypto.subtle` HMAC-SHA-256 and base64url encoding to derive `classroom:student:<opaque-topic>` from the student ID and `HOC_VUI_REALTIME_TOPIC_SECRET`. Resolve the public key from `SUPABASE_PUBLISHABLE_KEYS.default`, falling back to `SUPABASE_ANON_KEY`; resolve the server broadcast key from `SUPABASE_SECRET_KEYS.default`, falling back to `SUPABASE_SERVICE_ROLE_KEY`. Send `POST /realtime/v1/api/broadcast/<encoded-topic>/events/classroom-message` with `{ messageId }` and no `private=true` flag.

- [x] **Step 4: Add the service seam and protected route**

Extend `ClassroomService` with `realtimeConfig(studentId): Promise<ClassroomRealtimeConfig | null>` and an optional bridge argument. Add `GET /api/me/realtime` after the existing student authorization guard. Return `503` when the bridge is not configured, and never return the topic secret or server key.

- [x] **Step 5: Run bridge and API tests**

Run: `npx vitest run server/classroom/realtime.test.ts server/app.test.ts`

Expected: PASS with the existing student/admin authorization boundaries intact.

### Task 2: Broadcast after durable message insert

**Files:**

- Modify: `server/classroom/service.ts`
- Test: `server/classroom/service.test.ts`

**Interfaces:**

- `createClassroomService(repository, clock, realtimeBridge?)` keeps the existing first two parameters compatible and accepts the optional `ClassroomRealtimeBridge` as the third parameter.

- [x] **Step 1: Write failing service tests**

Add one test proving `sendMessage` awaits/uses the bridge with only `{ messageId, recipientId }`, and one test proving a bridge failure still returns the persisted message successfully.

- [x] **Step 2: Run tests and verify RED**

Run: `npx vitest run server/classroom/service.test.ts`

Expected: FAIL because `createClassroomService` does not accept or call the bridge.

- [x] **Step 3: Implement the minimal integration**

After `insertMessage` succeeds, call `notifyMessage` in a `try/catch`; preserve the existing message response when Broadcast is unavailable. Do not pass `body` to the bridge.

- [x] **Step 4: Run service tests and typecheck the server**

Run: `npx vitest run server/classroom/service.test.ts && npm run typecheck:server`

Expected: PASS and exit code 0.

### Task 3: Wire the Edge bridge and browser Realtime adapter

**Files:**

- Modify: `server/app.ts`
- Modify: `supabase/functions/api/index.ts` only if the existing adapter needs no route change; otherwise keep the adapter unchanged.
- Modify: `src/auth/apiClient.ts`
- Create: `src/classroom/realtime.ts`
- Create: `src/classroom/realtime.test.ts`
- Modify: `src/classroom/useClassroomFriends.ts`
- Modify: `src/classroom/useClassroomFriends.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**

```ts
export async function getClassroomRealtimeConfig(): Promise<ApiResult<ClassroomRealtimeConfig>>;
export type ClassroomRealtimeSubscription = { close: () => void };
export function subscribeToClassroomRealtime(
  config: ClassroomRealtimeConfig,
  onMessage: (messageId: string) => void,
  onStateChange?: (state: 'connected' | 'degraded') => void,
): ClassroomRealtimeSubscription;
```

- [x] **Step 1: Add the dependency and write failing adapter tests**

Add `@supabase/supabase-js`, mock its client factory at the module boundary, and test that the adapter subscribes to `classroom-message`, validates `{ messageId }`, reports degraded channel states, and removes the channel/client on close.

- [x] **Step 2: Run adapter tests and verify RED**

Run: `npx vitest run src/classroom/realtime.test.ts`

Expected: FAIL because the API wrapper and adapter do not exist.

- [x] **Step 3: Implement the API wrapper and adapter**

Call `GET /api/me/realtime`; create one Supabase client/channel per enabled student session; subscribe to the config topic as a public channel; ignore malformed payloads; let the client reconnect; call `onStateChange('degraded')` for channel errors/timeouts and always expose an idempotent cleanup.

- [x] **Step 4: Add Realtime setup to `useClassroomFriends`**

Fetch config once per enabled session, subscribe while visible/enabled, increment a returned `messageRevision` for each valid event, and call the existing `refresh` for unread counts. Clean up on disable, logout, visibility teardown and session generation changes. If config is unavailable, leave the existing 15-second roster polling intact.

- [x] **Step 5: Run client classroom tests**

Run: `npx vitest run src/classroom/realtime.test.ts src/classroom/useClassroomFriends.test.ts`

Expected: PASS with no duplicate subscriptions after rerender or logout.

### Task 4: Live conversation rendering and fallback rehydration

**Files:**

- Modify: `src/components/FriendListDialog.tsx`
- Modify: `src/components/FriendConversationPanel.tsx`
- Modify: `src/components/FriendListDialog.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.ts`

**Interfaces:**

- Add optional `messageRevision?: number` to `FriendListDialogProps`; default to `0` for existing callers/tests.

- [x] **Step 1: Write failing UI tests**

Add tests that change `messageRevision` and assert the selected conversation calls `getFriendMessages` again, that duplicate rows collapse by message ID, and that the open panel refreshes at the fallback interval without requiring a close/reopen.

- [x] **Step 2: Run UI tests and verify RED**

Run: `npx vitest run src/components/FriendListDialog.test.tsx src/App.test.ts`

Expected: FAIL because revision changes and fallback polling are not wired.

- [x] **Step 3: Implement live refresh and deduplication**

Pass `messageRevision` from `App` through `FriendListDialog` to `FriendConversationPanel`. Separate initial load from silent refresh; merge messages by `id`, sort by `createdAt`, mark only new incoming messages from the selected friend as read, and keep the existing draft/send/error behavior. Add a 15-second open-panel fallback interval and clear it on unmount/back.

- [x] **Step 4: Run focused UI tests**

Run: `npx vitest run src/components/FriendListDialog.test.tsx src/App.test.ts`

Expected: PASS with focus, close, send and logout regressions covered.

### Task 5: Production configuration, documentation and gates

**Files:**

- Modify: `.env.example`
- Modify: `docs/deployment/firebase-supabase-edge.md`
- Modify: `src/pwa/offline.test.ts` only if the dependency/build changes the offline contract.
- Create: `scripts/validate-classroom-realtime.mjs` only if a non-network static secret/bundle gate is needed.

- [x] **Step 1: Document server-only configuration**

Document `HOC_VUI_REALTIME_TOPIC_SECRET` as Edge-only and the public-key fallback names without recording any values. Document that no database migration or direct table publication is required for the Broadcast notification path.

- [x] **Step 2: Run all verification gates**

Run, in order:

```bash
npm test
npm run typecheck
npm run typecheck:server
npm run build
npm run check:edge-runtime
npm run validate:firebase
npm audit --omit=dev
git diff --check
```

Scan `dist` for database URLs, service keys, topic secrets and server-only env names. Verify the bundle contains only the public Supabase URL/key path if the implementation uses it.

- [ ] **Step 3: Configure and deploy the Edge bridge**

Generate a random topic secret locally without printing it, set it only as the Supabase Edge Function secret for project `tvlpabqkternfvsxqovi`, deploy `api`, and smoke-test CORS, `/api/auth/me` unauthenticated behavior and `/api/me/realtime` without credentials. Never log the secret.

- [ ] **Step 4: Build and deploy Firebase Hosting**

Build with the public Edge API URL, deploy both Firebase Hosting targets, then smoke-test `/`, `/manifest.webmanifest`, `/sw.js`, `/pet` and the deployed JavaScript bundle.

- [ ] **Step 5: Commit and push the atomic feature**

Stage only the realtime feature files, spec/plan and dependency changes. Confirm the unrelated untracked challenge spec/plan remains unstaged. Commit with:

```bash
git commit -m "feat: add realtime classroom chat updates"
git push origin main
```

Verify the remote `main` hash equals `HEAD`, record the deploy URLs and preserve the previous Hosting release as rollback target.

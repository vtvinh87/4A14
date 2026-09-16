# Classroom Chat Realtime Design

**Date:** 2026-09-17
**Status:** Approved for implementation by the user after architecture review.

## Problem

Học Vui currently refreshes the friends roster and unread counts on a 15-second interval, but `FriendConversationPanel` loads the selected conversation only when the panel mounts. A message sent by another student therefore appears only after the panel is closed and opened again.

## Goals

- Show incoming direct messages in an already-open conversation without closing the dialog.
- Update the friends unread badge promptly when a new message arrives, including while the friends dialog is closed.
- Keep the existing API as the only authority for student authentication, conversation membership, message history and message content.
- Use Supabase Realtime Broadcast on the existing Free project without exposing a secret key or private message body to the browser.
- Recover after reconnects, tab visibility changes and dropped events.

## Non-goals

- No migration to Supabase Auth.
- No direct browser reads from `hoc_vui_private.classroom_messages`.
- No public broadcast of message text, display names or full database rows.
- No group chat, typing indicators, media uploads or push notifications.
- No change to the existing message validation, read semantics or rate limit.

## Architecture

The existing HTTP API remains the source of truth:

```text
Browser sends message
  -> existing authenticated API
  -> private database insert
  -> best-effort server-side Broadcast notification: { messageId }
  -> recipient browser receives a topic event
  -> recipient calls existing API to rehydrate the conversation
  -> UI deduplicates by message id and renders the authorized response
```

The current custom opaque student session cannot be passed to Supabase Realtime as a private-channel JWT without introducing a new Supabase signing-key/auth flow. This implementation therefore uses a public Broadcast channel whose topic is an HMAC-derived opaque value for the authenticated student. The topic is a routing guard only: the event carries only `messageId`, and every message read still passes through the existing student-scoped API. A server-only `HOC_VUI_REALTIME_TOPIC_SECRET` is required; it is never returned to the browser.

The Edge Function creates a `SupabaseClassroomRealtimeBridge` when `SUPABASE_URL`, a server-only Supabase API key and `HOC_VUI_REALTIME_TOPIC_SECRET` are available. The bridge exposes a student-specific public config through `GET /api/me/realtime` and sends notifications through Supabase's server-side Broadcast REST endpoint. Local/Netlify environments without the bridge continue using the HTTP fallback.

The browser creates one Supabase Realtime client per active student session and subscribes to that student's topic from `useClassroomFriends`. A valid `classroom-message` event increments a message revision and triggers an immediate friends/unread refresh. `FriendConversationPanel` reloads the selected conversation when the revision changes and also runs a 15-second history fallback while open. Initial load and fallback refreshes mark only the selected peer's incoming unread messages as read.

## Security and resilience

- The browser receives only the Supabase URL, publishable/legacy anon key and opaque topic. Secret/service keys remain Edge-only.
- Broadcast payloads are schema-validated and contain only a non-empty message ID.
- The API still checks the bearer session, full student mode and active peer before returning messages.
- A Broadcast failure does not fail a persisted chat message; the open-panel fallback and reconnect refresh recover it.
- Realtime is removed on logout/unmount and recreated after a session or visibility transition.
- Existing `hoc_vui_private` grants, RLS policies and message table remain unchanged.

## Acceptance criteria

1. Two authorized synthetic student clients can send a message through the existing API and the recipient's open panel renders it after the Broadcast event without closing/reopening.
2. An event received while the friends dialog is closed refreshes the unread badge.
3. Duplicate events or fallback responses do not duplicate a message bubble.
4. A malformed event, unavailable Realtime config, channel error or reconnect does not expose content or break the existing chat UI.
5. The production bundle contains no server-only Supabase key or topic secret.
6. Targeted tests, full tests, client/server typechecks, production build, Edge runtime check, Firebase validation and post-deploy smoke tests pass.

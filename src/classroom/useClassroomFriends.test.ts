import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FriendSummary } from '../../shared/classroom-contracts';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type FriendsState = {
  friends: FriendSummary[];
  unreadCount: number;
  messageRevision: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clear: () => void;
  markFriendRead: (friendId: string) => void;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
}

const lan: FriendSummary = {
  id: 'peer-a',
  username: 'lan01',
  displayName: 'Lan',
  avatarId: 'fox-leaf',
  online: true,
  unreadCount: 2,
};

const realtimeMocks = vi.hoisted(() => ({
  subscribeToClassroomRealtime: vi.fn(),
}));

vi.mock('./realtime', () => realtimeMocks);

describe('Classroom Friends browser client', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    realtimeMocks.subscribeToClassroomRealtime.mockReset();
    sessionStorage.clear();
    fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('uses protected same-origin classroom routes with encoded friend IDs and no parent grant', async () => {
    sessionStorage.setItem('hoc_vui_session_token', 'student-token');
    const api = await import('../auth/apiClient');

    await api.getFriends();
    await api.sendPresence();
    await api.getFriendMessages('peer/a b', 17);
    await api.sendFriendMessage('peer/a b', 'Chào bạn');
    await api.markFriendMessagesRead('peer/a b');

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/me/friends',
      '/api/me/presence',
      '/api/me/friends/peer%2Fa%20b/messages?limit=17',
      '/api/me/friends/peer%2Fa%20b/messages',
      '/api/me/friends/peer%2Fa%20b/read',
    ]);
    const presenceRequest = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const sendRequest = fetchMock.mock.calls[3]?.[1] as RequestInit;
    const readRequest = fetchMock.mock.calls[4]?.[1] as RequestInit;
    expect(new Headers(presenceRequest.headers).get('Authorization')).toBe('Bearer student-token');
    expect(new Headers(presenceRequest.headers).has('X-Parent-Grant')).toBe(false);
    expect(sendRequest.method).toBe('POST');
    expect(JSON.parse(String(sendRequest.body))).toEqual({ body: 'Chào bạn' });
    expect(readRequest.method).toBe('POST');
  });

  async function mountFriends(enabled = true, open = true, accountId = 'student-a') {
    const { useClassroomFriends } = await import('./useClassroomFriends');
    let state: FriendsState;
    const Probe = (props: { enabled: boolean; open: boolean; accountId: string }) => {
      state = useClassroomFriends(props.enabled, props.open, props.accountId);
      return createElement('output', null, state.loading ? 'loading' : state.friends.map((friend) => friend.displayName).join(','));
    };
    const mount = document.createElement('div');
    const root = createRoot(mount);
    const render = async (nextEnabled: boolean, nextOpen: boolean, nextAccountId = accountId) => {
      act(() => root.render(createElement(Probe, { enabled: nextEnabled, open: nextOpen, accountId: nextAccountId })));
      await settle();
    };
    await render(enabled, open);
    return { get state() { return state!; }, render, unmount: () => act(() => root.unmount()) };
  }

  function mockRoster() {
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => String(input) === '/api/me/friends'
      ? jsonResponse({ ok: true, friends: [lan], unreadCount: 2 })
      : jsonResponse({ ok: true }));
  }

  const rosterCalls = () => fetchMock.mock.calls.filter(([url]) => url === '/api/me/friends');

  it('loads only on opening and fetches fresh data on every close/reopen', async () => {
    mockRoster();
    const probe = await mountFriends(true, false);
    try {
      expect(rosterCalls()).toHaveLength(0);
      await probe.render(true, true);
      expect(rosterCalls()).toHaveLength(1);
      expect(probe.state.friends).toEqual([lan]);
      await probe.render(true, false);
      await probe.render(true, true);
      expect(rosterCalls()).toHaveLength(2);
    } finally { probe.unmount(); }
  });

  it('keeps the visible list stable across timer, visibility and online events while presence stays active', async () => {
    vi.useFakeTimers();
    mockRoster();
    const probe = await mountFriends();
    try {
      await act(async () => { vi.advanceTimersByTime(45_000); await settle(); });
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('online'));
        await settle();
      });
      expect(rosterCalls()).toHaveLength(1);
      expect(probe.state.loading).toBe(false);
      expect(probe.state.friends).toEqual([lan]);
      expect(fetchMock.mock.calls.filter(([url]) => url === '/api/me/presence').length).toBeGreaterThan(1);
    } finally { probe.unmount(); }
  });

  it('displays the roster without waiting for presence and ignores presence failure', async () => {
    mockRoster();
    const presence = deferred<Response>();
    fetchMock.mockImplementation((input: RequestInfo | URL) => String(input) === '/api/me/presence'
      ? presence.promise
      : Promise.resolve(String(input) === '/api/me/friends'
        ? jsonResponse({ ok: true, friends: [lan], unreadCount: 2 }) : jsonResponse({ ok: true })));
    const probe = await mountFriends();
    try {
      expect(probe.state.friends).toEqual([lan]);
      expect(probe.state.loading).toBe(false);
      presence.resolve(jsonResponse({ ok: false, message: 'Presence busy' }, 503));
      await settle();
      expect(probe.state.error).toBeNull();
    } finally { probe.unmount(); }
  });

  it('keeps realtime message revisions without reloading the roster', async () => {
    mockRoster();
    let onMessage: (() => void) | undefined;
    const close = vi.fn();
    realtimeMocks.subscribeToClassroomRealtime.mockImplementation((_config, handler) => {
      onMessage = handler;
      return { close };
    });
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/me/realtime') return jsonResponse({ ok: true, supabaseUrl: 'https://example.supabase.co', publishableKey: 'public-key', topic: 'classroom:student:opaque' });
      return String(input) === '/api/me/friends' ? jsonResponse({ ok: true, friends: [lan], unreadCount: 2 }) : jsonResponse({ ok: true });
    });
    const probe = await mountFriends();
    try {
      expect(onMessage).toBeTypeOf('function');
      await act(async () => { onMessage?.(); await settle(); });
      expect(probe.state.messageRevision).toBe(1);
      expect(rosterCalls()).toHaveLength(1);
      await probe.render(true, false);
      expect(close).not.toHaveBeenCalled();
      await probe.render(false, false);
      expect(close).toHaveBeenCalledOnce();
      await act(async () => { onMessage?.(); await settle(); });
      expect(probe.state.messageRevision).toBe(0);
    } finally { probe.unmount(); }
  });

  it('does not establish a realtime subscription after cleanup when config returns late', async () => {
    mockRoster();
    const config = deferred<Response>();
    fetchMock.mockImplementation((input: RequestInfo | URL) => String(input) === '/api/me/realtime'
      ? config.promise : Promise.resolve(jsonResponse({ ok: true, friends: [lan], unreadCount: 2 })));
    const probe = await mountFriends();
    probe.unmount();
    config.resolve(jsonResponse({ ok: true, supabaseUrl: 'https://example.supabase.co', publishableKey: 'public-key', topic: 'classroom:student:opaque' }));
    await settle();
    expect(realtimeMocks.subscribeToClassroomRealtime).not.toHaveBeenCalled();
  });

  it('ignores stale roster responses across close/reopen and same-role account switches', async () => {
    mockRoster();
    const responses = [deferred<Response>(), deferred<Response>(), deferred<Response>()];
    let request = 0;
    fetchMock.mockImplementation((input: RequestInfo | URL) => String(input) === '/api/me/friends'
      ? responses[request++]!.promise : Promise.resolve(jsonResponse({ ok: true })));
    const probe = await mountFriends();
    try {
      await probe.render(true, false);
      responses[0].resolve(jsonResponse({ ok: true, friends: [lan], unreadCount: 2 }));
      await settle();
      expect(probe.state.friends).toEqual([]);
      await probe.render(true, true);
      await probe.render(true, true, 'student-b');
      responses[2].resolve(jsonResponse({ ok: true, friends: [{ ...lan, displayName: 'New friend' }], unreadCount: 2 }));
      await settle();
      responses[1].resolve(jsonResponse({ ok: true, friends: [lan], unreadCount: 2 }));
      await settle();
      expect(probe.state.friends[0].displayName).toBe('New friend');
    } finally { probe.unmount(); }
  });

  it('keeps the newest explicit retry when overlapping requests complete out of order', async () => {
    mockRoster();
    const responses = [deferred<Response>(), deferred<Response>()];
    let request = 0;
    fetchMock.mockImplementation((input: RequestInfo | URL) => String(input) === '/api/me/friends'
      ? responses[request++]!.promise : Promise.resolve(jsonResponse({ ok: true })));
    const probe = await mountFriends();
    try {
      act(() => { void probe.state.refresh(); });
      responses[1].resolve(jsonResponse({ ok: true, friends: [{ ...lan, displayName: 'Newest' }], unreadCount: 2 }));
      await settle();
      responses[0].resolve(jsonResponse({ ok: true, friends: [lan], unreadCount: 2 }));
      await settle();
      expect(probe.state.friends[0].displayName).toBe('Newest');
    } finally { probe.unmount(); }
  });

  it('supports explicit retry and clears state on logout', async () => {
    mockRoster();
    const probe = await mountFriends();
    try {
      fetchMock.mockResolvedValue(jsonResponse({ ok: false, code: 'unavailable', message: 'Tạm thời bận.' }, 503));
      await act(async () => { await probe.state.refresh(); });
      expect(probe.state.friends).toEqual([lan]);
      expect(probe.state.error).toBe('Tạm thời bận.');
      mockRoster();
      await act(async () => { await probe.state.refresh(); });
      expect(probe.state.error).toBeNull();
      await probe.render(false, false);
      expect(probe.state.friends).toEqual([]);
      expect(probe.state.unreadCount).toBe(0);
      expect(probe.state.loading).toBe(false);
    } finally { probe.unmount(); }
  });

  it('updates read badges locally without fetching or changing callback identity', async () => {
    mockRoster();
    const probe = await mountFriends();
    try {
      const markRead = probe.state.markFriendRead;
      act(() => probe.state.markFriendRead(lan.id));
      expect(probe.state.friends[0].unreadCount).toBe(0);
      expect(probe.state.unreadCount).toBe(0);
      expect(probe.state.markFriendRead).toBe(markRead);
      expect(rosterCalls()).toHaveLength(1);
    } finally { probe.unmount(); }
  });
});

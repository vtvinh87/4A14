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

  it('uses the bootstrap response for the initial roster and realtime subscription', async () => {
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => String(input) === '/api/me/classroom/bootstrap'
      ? jsonResponse({ ok: true, friends: [lan], unreadCount: 2, presenceUpdated: true, realtime: { supabaseUrl: 'https://example.supabase.co', publishableKey: 'public-key', topic: 'classroom:student:opaque' } })
      : jsonResponse({ ok: false, code: 'invalid', message: 'Không nên gọi fallback.' }, 404));
    realtimeMocks.subscribeToClassroomRealtime.mockImplementation(() => ({ close: vi.fn() }));
    const { useClassroomFriends } = await import('./useClassroomFriends');
    let state: FriendsState | undefined;
    const FriendsProbe = () => {
      state = useClassroomFriends(true);
      return null;
    };
    const mount = document.createElement('div');
    const root = createRoot(mount);

    try {
      act(() => root.render(createElement(FriendsProbe)));
      await settle();
      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/me/classroom/bootstrap']);
      expect(state?.friends).toEqual([lan]);
      expect(state?.unreadCount).toBe(2);
      expect(realtimeMocks.subscribeToClassroomRealtime).toHaveBeenCalledOnce();
    } finally {
      act(() => root.unmount());
    }
  });

  it('polls friends and sends presence only while enabled and visible', async () => {
    vi.useFakeTimers();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/api/me/classroom/bootstrap') return jsonResponse({ ok: false, code: 'invalid', message: 'API cũ.' }, 404);
      return path === '/api/me/friends'
        ? jsonResponse({ ok: true, friends: [lan], unreadCount: 2 })
        : jsonResponse({ ok: true });
    });
    const { useClassroomFriends } = await import('./useClassroomFriends');
    let state: FriendsState | undefined;
    const FriendsProbe = ({ enabled }: { enabled: boolean }) => {
      state = useClassroomFriends(enabled);
      return createElement('output', null, state.unreadCount);
    };
    const mount = document.createElement('div');
    const root = createRoot(mount);

    try {
      act(() => root.render(createElement(FriendsProbe, { enabled: true })));
      await settle();
      expect(fetchMock.mock.calls.map(([url]) => url).filter((url) => url !== '/api/me/realtime' && url !== '/api/me/classroom/bootstrap')).toEqual(['/api/me/presence', '/api/me/friends']);
      expect(state?.friends).toEqual([lan]);

      await act(async () => {
        vi.advanceTimersByTime(15_000);
        await settle();
      });
      expect(fetchMock.mock.calls.filter(([url]) => url === '/api/me/presence')).toHaveLength(2);
      expect(fetchMock.mock.calls.filter(([url]) => url === '/api/me/friends')).toHaveLength(2);
    } finally {
      act(() => root.unmount());
    }
  });

  it('does not refresh while hidden and refreshes once when visibility or network returns', async () => {
    vi.useFakeTimers();
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => String(input) === '/api/me/friends'
      ? jsonResponse({ ok: true, friends: [lan], unreadCount: 2 })
      : String(input) === '/api/me/classroom/bootstrap'
        ? jsonResponse({ ok: false, code: 'invalid', message: 'API cũ.' }, 404)
        : jsonResponse({ ok: true }));
    const { useClassroomFriends } = await import('./useClassroomFriends');
    const FriendsProbe = ({ enabled }: { enabled: boolean }) => {
      useClassroomFriends(enabled);
      return null;
    };
    const mount = document.createElement('div');
    const root = createRoot(mount);

    try {
      act(() => root.render(createElement(FriendsProbe, { enabled: true })));
      await settle();
      await act(async () => {
        vi.advanceTimersByTime(15_000);
        await settle();
      });
      expect(fetchMock).not.toHaveBeenCalled();

      hidden.mockReturnValue(false);
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
        await settle();
      });
      expect(fetchMock.mock.calls.map(([url]) => url).filter((url) => url !== '/api/me/realtime' && url !== '/api/me/classroom/bootstrap')).toEqual(['/api/me/presence', '/api/me/friends']);

      await act(async () => {
        window.dispatchEvent(new Event('online'));
        await settle();
      });
      expect(fetchMock.mock.calls.filter(([url]) => url === '/api/me/friends')).toHaveLength(2);
    } finally {
      act(() => root.unmount());
    }
  });

  it('commits the newest roster when overlapping refreshes resolve out of order', async () => {
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const presenceResponses = [deferred<Response>(), deferred<Response>()];
    const friendsResponses = [deferred<Response>(), deferred<Response>()];
    let presenceIndex = 0;
    let friendsIndex = 0;
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/api/me/realtime') return Promise.resolve(jsonResponse({ ok: false, code: 'unavailable', message: 'Realtime chưa sẵn sàng.' }, 503));
      if (path === '/api/me/classroom/bootstrap') return Promise.resolve(jsonResponse({ ok: false, code: 'invalid', message: 'API cũ.' }, 404));
      return path === '/api/me/presence'
        ? presenceResponses[presenceIndex++]!.promise
        : friendsResponses[friendsIndex++]!.promise;
    });
    const { useClassroomFriends } = await import('./useClassroomFriends');
    let state: FriendsState | undefined;
    const FriendsProbe = ({ enabled }: { enabled: boolean }) => {
      state = useClassroomFriends(enabled);
      return null;
    };
    const mount = document.createElement('div');
    const root = createRoot(mount);

    try {
      act(() => root.render(createElement(FriendsProbe, { enabled: true })));
      await settle();

      await act(async () => {
        window.dispatchEvent(new Event('online'));
        await settle();
      });
      expect(fetchMock.mock.calls.filter(([url]) => url === '/api/me/presence')).toHaveLength(2);

      // The second heartbeat belongs to the newer refresh and is released first.
      presenceResponses[1]!.resolve(jsonResponse({ ok: true }));
      await settle();
      friendsResponses[0]!.resolve(jsonResponse({ ok: true, friends: [{ ...lan, id: 'new-peer', unreadCount: 7 }], unreadCount: 7 }));
      await settle();

      // The older refresh then finishes last and must not overwrite the newer roster.
      presenceResponses[0]!.resolve(jsonResponse({ ok: true }));
      await settle();
      friendsResponses[1]!.resolve(jsonResponse({ ok: true, friends: [lan], unreadCount: 2 }));
      await settle();

      expect(state?.friends).toEqual([{ ...lan, id: 'new-peer', unreadCount: 7 }]);
      expect(state?.unreadCount).toBe(7);
    } finally {
      act(() => root.unmount());
    }
  });

  it('preserves prior roster on temporary failure and clears state when disabled', async () => {
    vi.useFakeTimers();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    let unavailable = false;
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/api/me/classroom/bootstrap') return jsonResponse({ ok: false, code: 'invalid', message: 'API cũ.' }, 404);
      if (path === '/api/me/friends') {
        return unavailable
          ? jsonResponse({ ok: false, code: 'unavailable', message: 'Tạm thời bận.' }, 503)
          : jsonResponse({ ok: true, friends: [lan], unreadCount: 2 });
      }
      return jsonResponse({ ok: true });
    });
    const { useClassroomFriends } = await import('./useClassroomFriends');
    let state: FriendsState | undefined;
    const FriendsProbe = ({ enabled }: { enabled: boolean }) => {
      state = useClassroomFriends(enabled);
      return null;
    };
    const mount = document.createElement('div');
    const root = createRoot(mount);

    try {
      act(() => root.render(createElement(FriendsProbe, { enabled: true })));
      await settle();
      unavailable = true;
      await act(async () => {
        vi.advanceTimersByTime(15_000);
        await settle();
      });
      expect(state?.friends).toEqual([lan]);
      expect(state?.unreadCount).toBe(2);
      expect(state?.error).toBe('Tạm thời bận.');

      act(() => root.render(createElement(FriendsProbe, { enabled: false })));
      expect(state?.friends).toEqual([]);
      expect(state?.unreadCount).toBe(0);
      expect(state?.loading).toBe(false);
      expect(state?.error).toBeNull();
      const callsBefore = fetchMock.mock.calls.length;
      await act(async () => {
        vi.advanceTimersByTime(15_000);
        await settle();
      });
      expect(fetchMock).toHaveBeenCalledTimes(callsBefore);
    } finally {
      act(() => root.unmount());
    }
  });

  it('refreshes the roster and increments the conversation revision when a realtime event arrives', async () => {
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    let onMessage: ((messageId: string) => void) | undefined;
    realtimeMocks.subscribeToClassroomRealtime.mockImplementation((_config, handler) => {
      onMessage = handler;
      return { close: vi.fn() };
    });
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === '/api/me/classroom/bootstrap') return jsonResponse({ ok: false, code: 'invalid', message: 'API cũ.' }, 404);
      if (path === '/api/me/friends') return jsonResponse({ ok: true, friends: [lan], unreadCount: 2 });
      if (path === '/api/me/realtime') return jsonResponse({ ok: true, supabaseUrl: 'https://example.supabase.co', publishableKey: 'public-key', topic: 'classroom:student:opaque' });
      return jsonResponse({ ok: true });
    });
    const { useClassroomFriends } = await import('./useClassroomFriends');
    let state: FriendsState | undefined;
    const FriendsProbe = () => {
      state = useClassroomFriends(true);
      return null;
    };
    const mount = document.createElement('div');
    const root = createRoot(mount);

    try {
      act(() => root.render(createElement(FriendsProbe)));
      await settle();
      expect(realtimeMocks.subscribeToClassroomRealtime).toHaveBeenCalledOnce();
      expect(state?.messageRevision).toBe(0);

      await act(async () => {
        onMessage?.('message-123');
        await settle();
      });

      expect(state?.messageRevision).toBe(1);
      expect(fetchMock.mock.calls.filter(([url]) => url === '/api/me/friends')).toHaveLength(2);
    } finally {
      act(() => root.unmount());
    }
  });
});

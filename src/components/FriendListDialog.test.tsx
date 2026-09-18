import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FriendSummary } from '../../shared/classroom-contracts';
import { FriendListDialog } from './FriendListDialog';
import { JourneyFeatureRail } from './JourneyFeatureRail';
import { getFriendMessages, markFriendMessagesRead, sendFriendMessage } from '../auth/apiClient';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../auth/apiClient', () => ({
  getFriendMessages: vi.fn(),
  markFriendMessagesRead: vi.fn(),
  sendFriendMessage: vi.fn(),
}));

const mockedGetFriendMessages = vi.mocked(getFriendMessages);
const mockedMarkFriendMessagesRead = vi.mocked(markFriendMessagesRead);
const mockedSendFriendMessage = vi.mocked(sendFriendMessage);

function friend(id: string, online: boolean, unreadCount = 0): FriendSummary {
  return { id, username: `${id}04`, displayName: `Bạn ${id}`, avatarId: 'fox-scout', online, unreadCount };
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function DialogHarness({ opener, friends = [friend('online', true)] }: { opener: HTMLButtonElement; friends?: FriendSummary[] }) {
  const [open, setOpen] = useState(true);
  return open ? createElement(FriendListDialog, {
    friends,
    loading: false,
    error: '',
    onRefresh: vi.fn(),
    onFriendsChanged: vi.fn(),
    onClose: () => setOpen(false),
  }) : createElement('p', { 'data-dialog-closed': true }, `Đã đóng ${opener.textContent ?? ''}`);
}

describe('FriendListDialog', () => {
  let root: Root;
  let mount: HTMLDivElement;

  const renderDialog = (overrides: Partial<Parameters<typeof FriendListDialog>[0]> = {}) => {
    const props = {
      friends: [friend('online', true, 2), friend('offline', false)],
      loading: false,
      error: '',
      onRefresh: vi.fn(),
      onFriendsChanged: vi.fn(),
      onClose: vi.fn(),
      ...overrides,
    };
    act(() => root.render(createElement(FriendListDialog, props)));
    return props;
  };

  beforeEach(() => {
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
    mockedGetFriendMessages.mockResolvedValue({ ok: true, messages: [] });
    mockedMarkFriendMessagesRead.mockResolvedValue({ ok: true, marked: 1 });
    mockedSendFriendMessage.mockResolvedValue({ ok: true, message: { id: 'sent-1', senderId: 'me', recipientId: 'online', body: 'Chào bạn', createdAt: '2026-09-16T08:00:00.000Z', readAt: null } });
  });

  afterEach(() => {
    vi.clearAllMocks();
    act(() => root.unmount());
    mount.remove();
  });

  it('groups online friends first and keeps unread badges visible', () => {
    renderDialog({ friends: [friend('offline', false), friend('online', true, 2)] });

    expect(mount.textContent).toContain('Đang online');
    expect(mount.textContent).toContain('Đang offline');
    expect(mount.querySelector('[data-testid="friend-unread-online"]')?.textContent).toBe('2');
    expect(mount.querySelector('[data-testid="friend-online-separator"]')).not.toBeNull();
    expect(mount.querySelectorAll('[data-friend-row]')[0]?.getAttribute('data-friend-row')).toBe('online');
  });

  it('loads and marks only the selected friend as read', async () => {
    const onFriendsChanged = vi.fn();
    renderDialog({ friends: [friend('one', true, 3), friend('two', true, 4)], onFriendsChanged });

    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-friend-row="two"]')?.click();
      await Promise.resolve();
    });

    expect(mockedGetFriendMessages).toHaveBeenCalledWith('two');
    expect(mockedMarkFriendMessagesRead).toHaveBeenCalledWith('two');
    expect(mockedMarkFriendMessagesRead).not.toHaveBeenCalledWith('one');
    expect(onFriendsChanged).toHaveBeenCalledOnce();
    expect(onFriendsChanged).toHaveBeenCalledWith('two');
  });

  it('scrolls an opened conversation to its latest message', async () => {
    const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => 640 });
    mockedGetFriendMessages.mockResolvedValueOnce({ ok: true, messages: [
      { id: 'old-1', senderId: 'online', recipientId: 'me', body: 'Tin trước', createdAt: '2026-09-16T08:00:00.000Z', readAt: null },
      { id: 'latest-1', senderId: 'me', recipientId: 'online', body: 'Tin cuối', createdAt: '2026-09-16T08:01:00.000Z', readAt: null },
    ] });

    try {
      renderDialog({ friends: [friend('online', true)] });
      await act(async () => {
        mount.querySelector<HTMLButtonElement>('[data-friend-row="online"]')?.click();
        await Promise.resolve();
      });

      const messages = mount.querySelector<HTMLElement>('[data-friend-messages]');
      expect(messages?.scrollTop).toBe(640);
    } finally {
      if (originalScrollHeight) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight);
      else delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight;
    }
  });

  it('reloads the open conversation when the classroom message revision changes', async () => {
    const onFriendsChanged = vi.fn();
    renderDialog({ friends: [friend('online', true)], messageRevision: 0, onFriendsChanged });
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-friend-row="online"]')?.click();
      await Promise.resolve();
    });
    mockedGetFriendMessages.mockResolvedValueOnce({ ok: true, messages: [{ id: 'incoming-1', senderId: 'online', recipientId: 'me', body: 'Tin mới', createdAt: '2026-09-16T08:00:00.000Z', readAt: null }] });

    renderDialog({ friends: [friend('online', true)], messageRevision: 1, onFriendsChanged });
    await act(async () => { await Promise.resolve(); });

    expect(mockedGetFriendMessages).toHaveBeenCalledTimes(2);
    expect(mount.textContent).toContain('Tin mới');
  });

  it('sends a trimmed message and rejects empty or too-long drafts locally', async () => {
    renderDialog();
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-friend-row="online"]')?.click();
      await Promise.resolve();
    });
    const input = mount.querySelector<HTMLInputElement>('[data-friend-composer]')!;
    const form = mount.querySelector<HTMLFormElement>('[data-friend-composer-form]')!;

    mockedSendFriendMessage.mockResolvedValueOnce({ ok: true, message: { id: 'sent-trimmed', senderId: 'me', recipientId: 'online', body: 'Lời chào mới', createdAt: '2026-09-16T08:00:01.000Z', readAt: null } });
    act(() => setInputValue(input, '   Lời chào mới   '));
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(mockedSendFriendMessage).toHaveBeenCalledWith('online', 'Lời chào mới');
    expect(mount.textContent).toContain('Lời chào mới');

    act(() => setInputValue(input, '   '));
    act(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(mount.querySelector('[aria-live="polite"]')?.textContent).toContain('không được để trống');

    act(() => setInputValue(input, 'a'.repeat(501)));
    act(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(mount.querySelector('[aria-live="polite"]')?.textContent).toContain('500 ký tự');
  });

  it('keeps a failed draft and shows loading, empty, error, retry, and focus return states', async () => {
    const onRefresh = vi.fn();
    const opener = document.createElement('button');
    document.body.insertBefore(opener, mount);
    opener.focus();
    const onClose = vi.fn();
    renderDialog({ friends: [], loading: true, onClose });
    expect(mount.textContent).toContain('Đang tải');

    act(() => root.render(createElement(FriendListDialog, { friends: [], loading: false, error: '', onRefresh, onFriendsChanged: vi.fn(), onClose })));
    expect(mount.textContent).toContain('Chưa có bạn học nào');
    act(() => root.render(createElement(FriendListDialog, { friends: [], loading: false, error: 'Không thể tải danh sách.', onRefresh, onFriendsChanged: vi.fn(), onClose })));
    act(() => mount.querySelector<HTMLButtonElement>('[data-friend-retry]')?.click());
    expect(onRefresh).toHaveBeenCalledOnce();

    act(() => root.render(createElement(FriendListDialog, { friends: [friend('online', true)], loading: false, error: '', onRefresh, onFriendsChanged: vi.fn(), onClose })));
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-friend-row="online"]')?.click();
      await Promise.resolve();
    });
    mockedSendFriendMessage.mockResolvedValueOnce({ ok: false, code: 'unavailable', message: 'Máy chủ bận.' });
    const input = mount.querySelector<HTMLInputElement>('[data-friend-composer]')!;
    act(() => setInputValue(input, 'Nháp cần giữ lại'));
    await act(async () => {
      mount.querySelector<HTMLFormElement>('[data-friend-composer-form]')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(input.value).toBe('Nháp cần giữ lại');
    expect(mount.querySelector('[aria-live="polite"]')?.textContent).toContain('Máy chủ bận.');

    act(() => mount.querySelector<HTMLButtonElement>('[aria-label="Đóng danh sách bạn bè"]')?.click());
    expect(onClose).toHaveBeenCalledOnce();
    act(() => root.unmount());
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('ignores a deferred send after Back unmounts the conversation', async () => {
    const onFriendsChanged = vi.fn();
    renderDialog({ friends: [friend('online', true)], onFriendsChanged });
    await act(async () => {
      mount.querySelector<HTMLButtonElement>('[data-friend-row="online"]')?.click();
      await Promise.resolve();
    });
    onFriendsChanged.mockClear();

    let resolveSend!: (value: Awaited<ReturnType<typeof sendFriendMessage>>) => void;
    mockedSendFriendMessage.mockReturnValueOnce(new Promise((resolve) => { resolveSend = resolve; }));
    const input = mount.querySelector<HTMLInputElement>('[data-friend-composer]')!;
    act(() => setInputValue(input, 'Tin nhắn chờ xử lý'));
    act(() => mount.querySelector<HTMLFormElement>('[data-friend-composer-form]')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));

    act(() => {
      Array.from(mount.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('Danh sách bạn bè'))?.click();
    });
    expect(mount.querySelector('[data-friend-conversation]')).toBeNull();

    await act(async () => {
      resolveSend({ ok: true, message: { id: 'late-message', senderId: 'me', recipientId: 'online', body: 'Tin nhắn đến muộn', createdAt: '2026-09-16T08:01:00.000Z', readAt: null } });
      await Promise.resolve();
    });
    expect(onFriendsChanged).not.toHaveBeenCalled();
    expect(mount.textContent).not.toContain('Tin nhắn đến muộn');
  });

  it('hides the rail total badge when there are no unread messages', () => {
    act(() => root.render(createElement(JourneyFeatureRail, { onOpenFriends: vi.fn(), friendsUnreadCount: 0 })));

    expect(mount.querySelector('[data-journey-feature-rail]')?.getAttribute('aria-label')).toBe('Tính năng hành trình');
    expect(mount.querySelector('[data-journey-feature="friends"] [data-friends-unread-badge]')).toBeNull();
  });

  it('closes Friends dialog on Escape and restores focus to its opener', () => {
    const opener = document.createElement('button');
    opener.textContent = 'Mở bạn bè';
    document.body.insertBefore(opener, mount);
    opener.focus();
    act(() => root.render(createElement(DialogHarness, { opener })));

    expect(document.activeElement).toBe(mount.querySelector('[aria-label="Đóng danh sách bạn bè"]'));
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));

    expect(mount.querySelector('[data-friend-list-dialog]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('loops Tab focus within Friends dialog', () => {
    const opener = document.createElement('button');
    document.body.insertBefore(opener, mount);
    opener.focus();
    act(() => root.render(createElement(DialogHarness, { opener, friends: [friend('online', true), friend('offline', false)] })));
    const close = mount.querySelector<HTMLButtonElement>('[aria-label="Đóng danh sách bạn bè"]')!;
    const friendButtons = mount.querySelectorAll<HTMLButtonElement>('[data-friend-row]');
    const lastFriend = friendButtons[friendButtons.length - 1]!;

    act(() => {
      lastFriend.focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(document.activeElement).toBe(close);

    act(() => {
      close.focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    });
    expect(document.activeElement).toBe(lastFriend);
    opener.remove();
  });

  it('closes Friends dialog only when the backdrop is pressed', () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    const dialog = mount.querySelector<HTMLElement>('[data-friend-list-dialog]')!;
    const backdrop = mount.querySelector<HTMLElement>('.feature-dialog-backdrop')!;

    act(() => dialog.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
    expect(onClose).not.toHaveBeenCalled();
    act(() => backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

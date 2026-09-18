import { useEffect, useRef, useState } from 'react';
import type { FriendSummary } from '../../shared/classroom-contracts';
import { getFocusableElements, getNextFocusIndex } from './SettingsDialog';
import { FriendConversationPanel } from './FriendConversationPanel';

export type FriendListDialogProps = {
  friends: readonly FriendSummary[];
  loading: boolean;
  error: string;
  messageRevision?: number;
  onRefresh: () => Promise<void> | void;
  onFriendsChanged: (friendId: string) => Promise<void> | void;
  onClose: () => void;
};

export function FriendListDialog({ friends, loading, error, messageRevision = 0, onRefresh, onFriendsChanged, onClose }: FriendListDialogProps) {
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const selectedFriend = friends.find((friend) => friend.id === selectedFriendId) ?? null;
  const onlineFriends = friends.filter((friend) => friend.online);
  const offlineFriends = friends.filter((friend) => !friend.online);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = getFocusableElements(dialog);
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const lastIndex = focusable.length - 1;
      if (event.shiftKey && (currentIndex <= 0 || currentIndex === -1)) {
        event.preventDefault();
        focusable[getNextFocusIndex(0, focusable.length, true)]?.focus();
      } else if (!event.shiftKey && (currentIndex === lastIndex || currentIndex === -1)) {
        event.preventDefault();
        focusable[getNextFocusIndex(lastIndex, focusable.length, false)]?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
    };
  }, []);

  const renderFriend = (friend: FriendSummary) => (
    <button key={friend.id} data-friend-row={friend.id} type="button" onClick={() => setSelectedFriendId(friend.id)}>
      <span>{friend.displayName}</span>
      <span>{friend.online ? 'Đang online' : 'Đang offline'}</span>
      {friend.unreadCount > 0 && <span data-testid={`friend-unread-${friend.id}`}>{friend.unreadCount}</span>}
    </button>
  );

  return (
    <div className="dialog-backdrop feature-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section ref={dialogRef} className="feature-dialog" data-friend-list-dialog role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="friend-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        {selectedFriend ? <FriendConversationPanel friend={selectedFriend} messageRevision={messageRevision} onBack={() => setSelectedFriendId(null)} onClose={onClose} onFriendsChanged={onFriendsChanged} /> : (
          <>
            <div className="feature-dialog-heading">
              <div>
                <p className="eyebrow">BẠN BÈ</p>
                <h2 id="friend-dialog-title">Bạn cùng lớp</h2>
              </div>
              <button ref={closeRef} className="dialog-close" type="button" onClick={onClose} aria-label="Đóng danh sách bạn bè">×</button>
            </div>
            {loading ? <p>Đang tải danh sách bạn bè...</p> : error ? <div><p>{error}</p><button data-friend-retry className="secondary-button" type="button" onClick={() => void onRefresh()}>Thử lại</button></div> : friends.length === 0 ? <p>Chưa có bạn học nào trong lớp.</p> : (
              <div data-friend-list>
                {onlineFriends.length > 0 && <section aria-label="Bạn đang online"><h3>Đang online</h3>{onlineFriends.map(renderFriend)}</section>}
                {onlineFriends.length > 0 && offlineFriends.length > 0 && <hr data-testid="friend-online-separator" />}
                {offlineFriends.length > 0 && <section aria-label="Bạn đang offline"><h3>Đang offline</h3>{offlineFriends.map(renderFriend)}</section>}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

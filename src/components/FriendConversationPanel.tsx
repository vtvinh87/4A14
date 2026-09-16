import { useEffect, useRef, useState } from 'react';
import type { ClassroomMessage, FriendSummary } from '../../shared/classroom-contracts';
import { getFriendMessages, markFriendMessagesRead, sendFriendMessage } from '../auth/apiClient';

type FriendConversationPanelProps = {
  friend: FriendSummary;
  onBack: () => void;
  onClose: () => void;
  onFriendsChanged: () => Promise<void> | void;
};

const MESSAGE_MAX_LENGTH = 500;

export function FriendConversationPanel({ friend, onBack, onClose, onFriendsChanged }: FriendConversationPanelProps) {
  const [messages, setMessages] = useState<ClassroomMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const isMountedRef = useRef(false);
  const currentFriendIdRef = useRef(friend.id);
  currentFriendIdRef.current = friend.id;

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setMessages([]);
    setLoading(true);
    setError('');

    const loadConversation = async () => {
      const result = await getFriendMessages(friend.id);
      if (!active) return;
      if (!result.ok) {
        setError(result.message);
        setLoading(false);
        return;
      }
      setMessages([...result.messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      setLoading(false);

      const readResult = await markFriendMessagesRead(friend.id);
      if (!active) return;
      if (!readResult.ok) {
        setError(readResult.message);
        return;
      }
      await onFriendsChanged();
    };

    void loadConversation();
    return () => { active = false; };
  }, [friend.id, onFriendsChanged]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const sendingFriendId = friend.id;
    const body = draft.trim();
    if (!body) {
      setError('Tin nhắn không được để trống.');
      return;
    }
    if (body.length > MESSAGE_MAX_LENGTH) {
      setError('Tin nhắn không được dài quá 500 ký tự.');
      return;
    }

    setSending(true);
    setError('');
    const result = await sendFriendMessage(friend.id, body);
    if (!isMountedRef.current || currentFriendIdRef.current !== sendingFriendId) return;
    if (!result.ok) {
      setError(result.message);
      setSending(false);
      return;
    }
    setMessages((current) => [...current, result.message].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    setDraft('');
    setSending(false);
    if (!isMountedRef.current || currentFriendIdRef.current !== sendingFriendId) return;
    await onFriendsChanged();
  };

  return (
    <div data-friend-conversation>
      <div className="feature-dialog-heading">
        <div>
          <p className="eyebrow">TRÒ CHUYỆN</p>
          <h2 id="friend-dialog-title">Cùng {friend.displayName}</h2>
        </div>
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Đóng danh sách bạn bè">×</button>
      </div>
      <button className="secondary-button" type="button" onClick={onBack}>← Danh sách bạn bè</button>
      <p className="visually-hidden" aria-live="polite">{error}</p>
      {loading ? <p>Đang tải tin nhắn...</p> : (
        <div aria-label={`Tin nhắn với ${friend.displayName}`} data-friend-messages>
          {messages.length === 0 ? <p>Hãy gửi lời chào đầu tiên nhé!</p> : messages.map((message) => (
            <p key={message.id} data-friend-message={message.id} data-message-from={message.senderId === friend.id ? 'friend' : 'self'}>
              {message.body}
            </p>
          ))}
        </div>
      )}
      <form data-friend-composer-form onSubmit={submit}>
        <label htmlFor="friend-message-draft">Viết tin nhắn cho {friend.displayName}</label>
        <input id="friend-message-draft" data-friend-composer type="text" value={draft} maxLength={MESSAGE_MAX_LENGTH + 1} disabled={sending} onChange={(event) => setDraft(event.target.value)} />
        <button className="primary-small-button" type="submit" disabled={sending}>{sending ? 'Đang gửi...' : 'Gửi'}</button>
      </form>
    </div>
  );
}

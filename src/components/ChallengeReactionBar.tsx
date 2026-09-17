import type { ChallengeReactionType } from '../../shared/challenge-contracts';

export type ChallengeReactionBarProps = {
  itemId: string;
  selected?: readonly ChallengeReactionType[];
  pendingKey?: string | null;
  disabled?: boolean;
  onReact: (reactionType: ChallengeReactionType) => void | Promise<boolean>;
};

const reactions: readonly { type: ChallengeReactionType; icon: string; label: string }[] = [
  { type: 'interesting', icon: '✦', label: 'Thú vị' },
  { type: 'learned', icon: '☼', label: 'Mình đã học' },
  { type: 'clear_explanation', icon: '◎', label: 'Giải thích rõ' },
  { type: 'thanks', icon: '♡', label: 'Cảm ơn bạn' },
];

export function ChallengeReactionBar({ itemId, selected = [], pendingKey = null, disabled = false, onReact }: ChallengeReactionBarProps) {
  return (
    <div className="challenge-reaction-bar" data-challenge-reaction-bar={itemId} role="group" aria-label="Gửi lời khích lệ cho bạn">
      <span className="challenge-reaction-heading">Gửi một lời khích lệ</span>
      <div className="challenge-reaction-actions">
        {reactions.map((reaction) => {
          const key = `${itemId}:${reaction.type}`;
          const isSelected = selected.includes(reaction.type);
          const isPending = Boolean(pendingKey);
          return (
            <button
              key={reaction.type}
              type="button"
              className={`challenge-reaction-button${isSelected ? ' is-selected' : ''}`}
              data-challenge-reaction={reaction.type}
              aria-label={isSelected ? `${reaction.label} — đã gửi` : reaction.label}
              aria-pressed={isSelected}
              disabled={disabled || isSelected || isPending}
              onClick={() => { void onReact(reaction.type); }}
            >
              <span aria-hidden="true">{reaction.icon}</span>
              <span>{reaction.label}</span>
              {isSelected && <small>Đã gửi</small>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

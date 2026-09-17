import { useState } from 'react';
import { FeatureComingSoonDialog } from './FeatureComingSoonDialog';

export type JourneyFeatureId = 'progress' | 'challenge' | 'friends';

export type JourneyFeatureDefinition = Readonly<{
  id: JourneyFeatureId;
  label: string;
  art: string;
  description: string;
}>;

export const JOURNEY_FEATURES: readonly JourneyFeatureDefinition[] = [
  {
    id: 'progress',
    label: 'Bảng tiến bộ',
    art: '/art/dock/journey.png',
    description: 'Xem lại hành trình của mình và chọn bước học tập tiếp theo.',
  },
  {
    id: 'challenge',
    label: 'Thách đố',
    art: '/art/hud/challenge.png',
    description: 'Tạo và trả lời những câu đố lịch sử cùng các bạn.',
  },
  {
    id: 'friends',
    label: 'Bạn bè',
    art: '/art/hud/friends.png',
    description: 'Trò chuyện cùng các bạn trong lớp.',
  },
];

export type JourneyFeatureRailProps = {
  onOpenFriends: () => void;
  friendsUnreadCount: number;
  onOpenChallenge?: () => void;
  onOpenProgress?: () => void;
  progressBoardEnabled?: boolean;
};

export function JourneyFeatureRail({ onOpenFriends, friendsUnreadCount, onOpenChallenge, onOpenProgress, progressBoardEnabled = false }: JourneyFeatureRailProps) {
  const [activeFeature, setActiveFeature] = useState<JourneyFeatureDefinition | null>(null);

  return (
    <>
      <aside className="journey-feature-rail" data-journey-feature-rail aria-label="Tính năng hành trình">
        <div className="journey-feature-list">
          {JOURNEY_FEATURES.map((feature) => (
            <button
              key={feature.id}
              className="journey-feature-button"
              data-journey-feature={feature.id}
              type="button"
              aria-label={feature.id === 'friends' && friendsUnreadCount > 0 ? `${feature.label}, ${friendsUnreadCount} tin nhắn chưa đọc` : feature.label}
              title={feature.label}
              aria-haspopup="dialog"
              onClick={() => {
                if (feature.id === 'friends') onOpenFriends();
                else if (feature.id === 'challenge' && onOpenChallenge) onOpenChallenge();
                else if (feature.id === 'progress' && progressBoardEnabled && onOpenProgress) onOpenProgress();
                else setActiveFeature(feature);
              }}
            >
              <span className="journey-feature-art" aria-hidden="true">
                <img data-journey-feature-art src={feature.art} alt="" />
              </span>
              <span className="journey-feature-label" aria-hidden="true">{feature.label}</span>
              {feature.id === 'friends' && friendsUnreadCount > 0 && <span data-friends-unread-badge aria-label={`${friendsUnreadCount} tin nhắn chưa đọc`}>{friendsUnreadCount}</span>}
            </button>
          ))}
        </div>
      </aside>

      {activeFeature && <FeatureComingSoonDialog feature={activeFeature} onClose={() => setActiveFeature(null)} />}
    </>
  );
}

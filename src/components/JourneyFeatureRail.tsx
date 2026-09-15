import { useState } from 'react';
import { FeatureComingSoonDialog } from './FeatureComingSoonDialog';

export type JourneyFeatureId = 'leaderboard' | 'challenge';

export type JourneyFeatureDefinition = Readonly<{
  id: JourneyFeatureId;
  label: string;
  art: string;
  description: string;
}>;

export const JOURNEY_FEATURES: readonly JourneyFeatureDefinition[] = [
  {
    id: 'leaderboard',
    label: 'Bảng xếp hạng',
    art: '/art/hud/leaderboard.png',
    description: 'Cùng xem những thành tích nổi bật của các bạn trong lớp.',
  },
  {
    id: 'challenge',
    label: 'Thách đố',
    art: '/art/hud/challenge.png',
    description: 'Tạo và trả lời những câu đố lịch sử cùng các bạn.',
  },
];

export function JourneyFeatureRail() {
  const [activeFeature, setActiveFeature] = useState<JourneyFeatureDefinition | null>(null);

  return (
    <>
      <aside className="journey-feature-rail" data-journey-feature-rail aria-label="Tính năng sắp ra mắt">
        <p className="journey-feature-kicker">SẮP RA MẮT</p>
        <div className="journey-feature-list">
          {JOURNEY_FEATURES.map((feature) => (
            <button
              key={feature.id}
              className="journey-feature-button"
              data-journey-feature={feature.id}
              type="button"
              aria-haspopup="dialog"
              onClick={() => setActiveFeature(feature)}
            >
              <span className="journey-feature-art" aria-hidden="true">
                <img data-journey-feature-art src={feature.art} alt="" />
              </span>
              <span className="journey-feature-label">{feature.label}</span>
            </button>
          ))}
        </div>
      </aside>

      {activeFeature && <FeatureComingSoonDialog feature={activeFeature} onClose={() => setActiveFeature(null)} />}
    </>
  );
}

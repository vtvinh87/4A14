import { PRIMARY_VIEWS, type ViewId } from '../app/navigation';

type BottomDockProps = {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
};

const DOCK_IDS: ViewId[] = ['journey', 'lessons', 'reward', 'pet', 'collection'];

const iconForView = {
  journey: '/art/dock/journey.png',
  lessons: '/art/dock/lessons.png',
  reward: '/art/dock/reward.png',
  pet: '/art/dock/pet.png',
  collection: '/art/dock/collection.png',
} as const;

export function BottomDock({ activeView, onNavigate }: BottomDockProps) {
  return (
    <nav className="bottom-dock" aria-label="Điều hướng Học Vui">
      {DOCK_IDS.map((id) => {
        const view = PRIMARY_VIEWS.find((item) => item.id === id);
        const icon = iconForView[id as keyof typeof iconForView];
        if (!view || !icon) return null;
        const active = activeView === id || (id === 'journey' && activeView === 'lesson');
        return (
          <button
            className={`dock-item${active ? ' is-active' : ''}`}
            type="button"
            key={id}
            onClick={() => onNavigate(id)}
            aria-current={active ? 'page' : undefined}
          >
            <span className="dock-icon" aria-hidden="true"><img src={icon} alt="" draggable={false} width={64} height={64} /></span>
            <span>{view.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

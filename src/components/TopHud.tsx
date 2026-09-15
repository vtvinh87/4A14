import type { AppSettings } from '../progress/storage';
import type { Progress } from '../content/types';
import type { AvatarId } from '../../shared/account-contracts';
import { MVP_LESSONS } from '../content/catalog';
import { getLessonRewardState } from '../game/rewards';
import { UserMenu } from './UserMenu';

type TopHudProps = {
  progress: Progress;
  settings: AppSettings;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onOpenReward: () => void;
  onOpenParent: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  displayName: string;
  avatarId: AvatarId;
};

export function TopHud({ progress, settings, onToggleSound, onOpenSettings, onOpenReward, onOpenParent, onOpenProfile, onLogout, displayName, avatarId }: TopHudProps) {
  const completedLessons = MVP_LESSONS.filter((lesson) => getLessonRewardState(progress, lesson.id).stamped).length;
  const progressPercent = Math.round((completedLessons / MVP_LESSONS.length) * 100);
  return (
    <header className="top-hud">
      <div className="brand-plaque">
        <img className="brand-plaque-art" src="/art/brand-plaque-4a14.png" alt="4A14 VUI VẺ — Lịch sử &amp; Địa lí 4" />
      </div>

      <div className="top-hud-actions">
        <button className="passport-chip" type="button" onClick={onOpenReward} aria-label="Mở Hộ chiếu Cáo Nhỏ">
          <span className="passport-avatar"><img src="/art/dock/pet.png" alt="" /></span>
          <span className="passport-copy"><strong>Hộ chiếu Cáo Nhỏ</strong><small>{completedLessons}/{MVP_LESSONS.length} chặng đã hoàn thành</small></span>
          <span className="passport-progress" aria-label={`${completedLessons} trên ${MVP_LESSONS.length} bài hoàn thành`}><span style={{ width: `${progressPercent}%` }} /></span>
        </button>
        <button className="hud-icon-button" type="button" onClick={onToggleSound} aria-label={settings.sound ? 'Tắt âm thanh' : 'Bật âm thanh'} aria-pressed={settings.sound}>
          <img className={`hud-art-icon${settings.sound ? '' : ' is-muted'}`} src="/art/hud/sound.png" alt="" />
        </button>
        <button className="hud-icon-button" type="button" onClick={onOpenSettings} aria-label="Mở cài đặt">
          <img className="hud-art-icon" src="/art/hud/settings.png" alt="" />
        </button>
        <UserMenu displayName={displayName} avatarId={avatarId} onOpenProfile={onOpenProfile} onOpenParent={onOpenParent} onLogout={onLogout} />
      </div>
    </header>
  );
}

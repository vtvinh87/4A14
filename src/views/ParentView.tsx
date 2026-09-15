import { useEffect, useState } from 'react';
import type { AppSettings } from '../progress/storage';
import { MVP_LESSONS } from '../content/catalog';
import type { Progress } from '../content/types';
import { getLessonRewardState } from '../game/rewards';
import { isLessonUnlocked } from '../game/lessonAccess';
import { getDashboardMetrics, getSupportSuggestions } from '../analytics/metrics';
import type { LocalMigrationPreview } from '../progress/accountMigration';
import type { DashboardActivity, DashboardLessonStatus, DashboardRange, DashboardSuggestion, DashboardMetrics, ParentDashboardData } from '../../shared/dashboard-contracts';
import type { StudentProfileView } from '../../shared/account-contracts';
import { ActivityChart } from '../components/parent/ActivityChart';
import { DataTools } from '../components/parent/DataTools';
import { History } from '../components/parent/History';
import { LessonMap } from '../components/parent/LessonMap';
import { ParentSummary } from '../components/parent/Summary';
import { StudentProfileCard } from '../components/parent/StudentProfileCard';
import { SupportSuggestions } from '../components/parent/SupportSuggestions';

type ParentViewProps = {
  progress: Progress;
  settings: AppSettings;
  dashboard?: ParentDashboardData | null;
  parentProfile?: StudentProfileView | null;
  parentProfileBusy?: boolean;
  parentProfileError?: string;
  onBirthdayWishesEnabledChange?: (enabled: boolean) => void | Promise<void>;
  onRangeChange?: (range: DashboardRange) => void | Promise<boolean | void>;
  childName?: string;
  storageRecovery: boolean;
  storageWriteWarning: boolean;
  legacyMigrationPreview?: LocalMigrationPreview | null;
  onOpenSettings: () => void;
  onOpenLessons: () => void;
  onChangeParentPin: () => void;
  onImportLegacy?: () => void | Promise<void>;
  onLockParent: () => void;
};

function fallbackLessons(progress: Progress): DashboardLessonStatus[] {
  return MVP_LESSONS.map((lesson) => {
    const reward = getLessonRewardState(progress, lesson.id);
    const touched = progress.session?.lessonId === lesson.id;
    const status: DashboardLessonStatus['status'] = reward.stamped || reward.completed === reward.total
      ? 'complete'
      : touched || reward.completed > 0
        ? 'in-progress'
        : isLessonUnlocked(lesson.id, progress.completedMissions)
          ? 'open'
          : 'locked';
    return { lessonId: lesson.id, title: lesson.title, topic: lesson.topic, status, completedMissions: reward.completed, totalMissions: reward.total };
  });
}

function fallbackSuggestions(progress: Progress, range: DashboardRange): DashboardSuggestion[] {
  const generatedAt = new Date().toISOString();
  return getSupportSuggestions(progress, range).map((suggestion) => ({
    ...suggestion,
    provenance: {
      ruleVersion: 'dashboard-rules-v1',
      range,
      activityKeys: [],
      eventIds: [],
      generatedAt,
    },
  }));
}

function localMetrics(progress: Progress, range: DashboardRange): DashboardMetrics {
  const metrics = getDashboardMetrics(progress, range);
  return {
    ...metrics,
    completedLessons: progress.stamps.length,
    totalLessons: metrics.totalLessons,
    totalStamps: metrics.totalLessons,
  };
}

function ParentArt({ src }: { src: string }) {
  return <img className="hud-art-icon" src={src} alt="" aria-hidden="true" data-parent-art draggable={false} />;
}

export function ParentView({ progress, settings, dashboard, parentProfile = null, parentProfileBusy = false, parentProfileError = '', onBirthdayWishesEnabledChange = () => undefined, onRangeChange, childName, storageRecovery, storageWriteWarning, legacyMigrationPreview, onOpenSettings, onOpenLessons, onChangeParentPin, onImportLegacy, onLockParent }: ParentViewProps) {
  const [range, setRange] = useState<DashboardRange>(dashboard?.range ?? '7d');

  useEffect(() => {
    if (dashboard?.range) setRange(dashboard.range);
  }, [dashboard?.range]);

  const metrics = dashboard?.metrics ?? localMetrics(progress, range);
  const lessons = dashboard?.lessons ?? fallbackLessons(progress);
  const suggestions = dashboard?.suggestions ?? fallbackSuggestions(progress, range);
  const activities: DashboardActivity[] = dashboard?.activities ?? [];
  const learnerName = childName?.trim() || 'hành trình của con';
  const selectRange = (nextRange: DashboardRange) => {
    const result = onRangeChange?.(nextRange);
    if (result && typeof result.then === 'function') {
      void result.then((accepted) => { if (accepted !== false) setRange(nextRange); });
    } else {
      setRange(nextRange);
    }
  };

  return (
    <section className="content-view parent-view" aria-labelledby="parent-title">
      <div className="view-heading">
        <div className="page-title-tag">
          <p className="eyebrow">GÓC PHỤ HUYNH</p>
          <h1 id="parent-title">Theo dõi {learnerName}</h1>
        </div>
        <div className="parent-heading-actions">
          <span className="parent-safe-chip"><ParentArt src="/art/hud/parent.png" /> Chỉ trên thiết bị này</span>
          <button className="secondary-button parent-lock-button" type="button" onClick={onLockParent}>Khóa Dashboard</button>
        </div>
      </div>

      <StudentProfileCard
        profile={parentProfile}
        busy={parentProfileBusy}
        unavailableMessage={!parentProfile ? parentProfileError : undefined}
        errorMessage={parentProfile ? parentProfileError : undefined}
        onBirthdayWishesEnabledChange={onBirthdayWishesEnabledChange}
      />

      {(storageRecovery || storageWriteWarning) && <div className="storage-recovery-banner" role="alert"><ParentArt src="/art/collection/collection-emblem.png" /><span>{storageRecovery ? <><strong>Trạng thái lưu cần được phục hồi.</strong> Dữ liệu cũ chưa bị ghi đè. Hãy nhập một tệp sao lưu hợp lệ hoặc đặt lại sau khi đã xuất dữ liệu cần giữ.</> : <><strong>Thay đổi hiện chưa được lưu.</strong> Bộ nhớ thiết bị không nhận bản ghi mới; máy chủ vẫn là nguồn xác nhận.</>}</span></div>}

      <div className="parent-dashboard-toolbar">
        <div className="parent-range-switch" role="group" aria-label="Khoảng thời gian Dashboard">
          {([['7d', '7 ngày'], ['30d', '30 ngày'], ['all', 'Toàn bộ']] as const).map(([value, label]) => <button key={value} type="button" className={range === value ? 'is-active' : ''} aria-pressed={range === value} onClick={() => selectRange(value)}>{label}</button>)}
        </div>
      </div>

      {!dashboard && <p className="dashboard-local-note" role="status">Đang hiển thị bản xem cục bộ cho đến khi Dashboard máy chủ được nạp.</p>}
      {dashboard && metrics.dataQuality !== 'ready' && <p className="dashboard-local-note" role="status">{metrics.dataQuality === 'none' ? 'Chưa có hoạt động đủ để tính nhận xét.' : 'Mẫu còn ít; các gợi ý đang giữ ở mức thận trọng.'}</p>}

      <ParentSummary metrics={metrics} />

      <div className="parent-insight-grid">
        <section className="parent-card metric-card" aria-labelledby="time-metric-title">
          <div className="parent-card-heading"><div><p className="eyebrow">NHỊP HỌC</p><h2 id="time-metric-title">Thời gian tương tác</h2></div><span className="metric-spark">✦</span></div>
          <strong className="metric-value">{metrics.estimatedMinutes ? `${metrics.estimatedMinutes} phút` : 'Chưa có'}</strong>
          <p className="metric-detail">Ước tính từ heartbeat hợp lệ khi tab hiển thị và có tương tác gần đây; không tính tab bỏ quên.</p>
          <div className="metric-foot"><span>{metrics.totalAttempts} lượt trả lời</span><span>{metrics.retryAttempts} lượt thử lại</span><span>{metrics.hintActivities} hoạt động có gợi ý</span></div>
        </section>
        <SupportSuggestions suggestions={suggestions} />
      </div>

      <div className="parent-columns">
        <LessonMap lessons={lessons} onOpenLessons={onOpenLessons} />
        <DataTools settings={settings} storageRecovery={storageRecovery} storageWriteWarning={storageWriteWarning} legacyMigrationPreview={legacyMigrationPreview} onOpenSettings={onOpenSettings} onChangeParentPin={onChangeParentPin} onImportLegacy={onImportLegacy} />
      </div>

      <ActivityChart events={dashboard?.events ?? []} activities={activities} />
      <History activities={activities} />

    </section>
  );
}

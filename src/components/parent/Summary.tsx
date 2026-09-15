import type { DashboardMetrics } from '../../../shared/dashboard-contracts';

function Art({ src }: { src: string }) {
  return <img className="hud-art-icon" src={src} alt="" aria-hidden="true" data-parent-art draggable={false} />;
}

export function ParentSummary({ metrics }: { metrics: DashboardMetrics }) {
  return <div className="parent-summary-grid" data-dashboard-summary>
    <div className="parent-summary-card is-blue"><span className="summary-icon"><Art src="/art/dock/lessons.png" /></span><small>Nhiệm vụ đã xong</small><strong>{metrics.completedMissions}/{metrics.totalMissions}</strong><span>{metrics.totalMissions - metrics.completedMissions} nhiệm vụ còn trên hành trình</span></div>
    <div className="parent-summary-card is-gold"><span className="summary-icon"><Art src="/art/dock/reward.png" /></span><small>Bài &amp; dấu đã nhận</small><strong>{metrics.completedLessons}/{metrics.totalLessons}</strong><span>{metrics.stamps}/{metrics.totalStamps} dấu · {metrics.activeDays ? `${metrics.activeDays} ngày có hoạt động` : 'chưa có ngày hoạt động'}</span></div>
    <div className="parent-summary-card is-teal"><span className="summary-icon"><Art src="/art/collection/collection-emblem.png" /></span><small>Đúng lần đầu</small><strong>{metrics.firstAttemptAccuracy === null ? 'Chưa có' : `${Math.round(metrics.firstAttemptAccuracy * 100)}%`}</strong><span>{metrics.activitySample ? `${metrics.activitySample} hoạt động khác nhau` : 'Chưa có dữ liệu'}</span></div>
  </div>;
}

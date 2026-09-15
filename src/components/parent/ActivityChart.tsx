import type { LearningEventRecord } from '../../../shared/learning-contracts';
import type { DashboardActivity } from '../../../shared/dashboard-contracts';

type Props = { events: LearningEventRecord[]; activities: DashboardActivity[] };

function dateKey(time: string): string | null {
  const parsed = Date.parse(time);
  return Number.isFinite(parsed) ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', month: '2-digit', day: '2-digit' }).format(new Date(parsed)) : null;
}

export function ActivityChart({ events, activities }: Props) {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.type !== 'answer_submitted' && event.type !== 'discovery_done' && event.type !== 'hint_used' && event.type !== 'next') continue;
    const day = dateKey(event.receivedAt);
    if (day) counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const days = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
  const maximum = Math.max(1, ...days.map(([, count]) => count));
  return <section className="parent-card activity-chart-card" aria-labelledby="activity-chart-title">
    <div className="parent-card-heading"><div><p className="eyebrow">NHỊP HỌC</p><h2 id="activity-chart-title">Hoạt động theo ngày</h2></div><span className="metric-spark">✦</span></div>
    {days.length ? <div className="activity-chart" role="img" aria-label="Biểu đồ số lượt học theo ngày">{days.map(([day, count]) => <div className="activity-chart-bar" key={day}><span style={{ height: `${Math.max(8, Math.round(count / maximum * 100))}%` }} /><small>{day}</small><strong>{count}</strong></div>)}</div> : <p className="attempt-empty">Chưa có hoạt động trong khoảng đã chọn.</p>}
    <table className="dashboard-data-table"><caption>Danh sách tương đương biểu đồ</caption><thead><tr><th>Ngày</th><th>Lượt học</th></tr></thead><tbody>{days.length ? days.map(([day, count]) => <tr key={day}><td>{day}</td><td>{count}</td></tr>) : <tr><td colSpan={2}>Chưa có</td></tr>}</tbody></table>
    <p className="metric-detail">{activities.length} hoạt động khác nhau được dùng để tính lần đầu; thời gian chỉ là ước tính từ heartbeat hợp lệ.</p>
  </section>;
}

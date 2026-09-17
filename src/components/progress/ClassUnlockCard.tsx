export type ProgressClassUnlockSummary = {
  current: number;
  target: number;
  completedDays: number;
};

function isValidSummary(summary: ProgressClassUnlockSummary | null | undefined): summary is ProgressClassUnlockSummary {
  if (!summary) return false;
  return Number.isInteger(summary.current)
    && summary.current >= 0
    && Number.isInteger(summary.target)
    && summary.target > 0
    && summary.current <= summary.target
    && Number.isInteger(summary.completedDays)
    && summary.completedDays >= 0;
}

export function ClassUnlockCard({ summary }: { summary?: ProgressClassUnlockSummary | null }) {
  if (!isValidSummary(summary)) return null;
  return (
    <article className="progress-class-unlock-card" data-class-unlock-card>
      <p className="eyebrow">CÙNG NHAU KHÁM PHÁ</p>
      <h2>Cả lớp đang cùng mở thêm một chặng</h2>
      <p>Mỗi lượt khám phá đều góp thêm một bước vui cho hành trình chung của lớp mình.</p>
      <div className="progress-class-unlock-meter" aria-label="Tiến trình chung của lớp">
        <strong>{summary.current}/{summary.target}</strong>
        <span>lượt khám phá chung</span>
      </div>
      <small>{summary.completedDays} ngày cả lớp đã cùng mở chặng</small>
    </article>
  );
}

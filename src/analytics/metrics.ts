import { getLessonPackage } from '../content/packages';
import { formatTextbookReference } from '../content/textbookGuide';
import type { Activity, LessonId, Progress } from '../content/types';

export type DashboardRange = '7d' | '30d' | 'all';

export type DashboardMetrics = {
  range: DashboardRange;
  activitySample: number;
  totalAttempts: number;
  retryAttempts: number;
  firstAttemptCorrect: number;
  firstAttemptAccuracy: number | null;
  hintActivities: number;
  hintRate: number | null;
  activeDays: number;
  estimatedMinutes: number;
  completedMissions: number;
  totalMissions: number;
  stamps: number;
  totalLessons: number;
  lastActivityAt: string | null;
  dataQuality: 'none' | 'limited' | 'ready';
};

export type SupportSuggestion = {
  id: string;
  kind: 'insufficient' | 'strength' | 'support' | 'next';
  title: string;
  body: string;
  action: string;
  evidence: string;
  lessonId?: LessonId;
  textbookReference?: string;
};

type AttemptRecord = {
  activityId: string;
  correct: boolean;
  hintUsed: boolean;
  time: string;
  lessonId: LessonId;
};

function dateKeyInVietnam(time: string): string | null {
  const date = new Date(time);
  if (!Number.isFinite(date.getTime())) return null;
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });
  return formatter.format(date);
}

function withinRange(time: string, anchor: number, range: DashboardRange): boolean {
  if (range === 'all') return true;
  const timestamp = Date.parse(time);
  if (!Number.isFinite(timestamp)) return false;
  const days = range === '7d' ? 7 : 30;
  return timestamp >= anchor - days * 24 * 60 * 60 * 1000 && timestamp <= anchor;
}

function collectAttempts(progress: Progress, range: DashboardRange): AttemptRecord[] {
  const attempts = progress.session?.attempts ?? [];
  const anchor = attempts.reduce((latest, item) => Math.max(latest, Date.parse(item.time) || 0), Date.parse(progress.updatedAt) || Date.now());
  return attempts
    .filter((attempt) => withinRange(attempt.time, anchor, range))
    .map((attempt) => ({ ...attempt, lessonId: progress.session!.lessonId }));
}

function findActivity(lessonId: LessonId, activityId: string): Activity | null {
  const lesson = getLessonPackage(lessonId);
  return lesson.missions.flatMap((mission) => mission.activities).find((activity) => activity.id === activityId) ?? null;
}

export function getDashboardMetrics(progress: Progress, range: DashboardRange = 'all'): DashboardMetrics {
  const attempts = collectAttempts(progress, range);
  const firstByActivity = new Map<string, AttemptRecord>();
  for (const attempt of attempts) if (!firstByActivity.has(attempt.activityId)) firstByActivity.set(attempt.activityId, attempt);
  const first = [...firstByActivity.values()];
  const hintActivities = first.filter((attempt) => attempts.some((candidate) => candidate.activityId === attempt.activityId && candidate.hintUsed)).length;
  const activeDays = new Set(attempts.map((attempt) => dateKeyInVietnam(attempt.time)).filter((key): key is string => Boolean(key))).size;
  const ordered = attempts.map((attempt) => Date.parse(attempt.time)).filter(Number.isFinite).sort((a, b) => a - b);
  let activeSeconds = 0;
  for (let index = 1; index < ordered.length; index += 1) {
    const gap = ordered[index] - ordered[index - 1];
    if (gap > 0 && gap <= 90_000) activeSeconds += gap / 1000;
  }
  const firstAttemptAccuracy = first.length ? first.filter((attempt) => attempt.correct).length / first.length : null;
  const dataQuality = first.length === 0 ? 'none' : first.length < 5 ? 'limited' : 'ready';
  return {
    range,
    activitySample: first.length,
    totalAttempts: attempts.length,
    retryAttempts: Math.max(0, attempts.length - first.length),
    firstAttemptCorrect: first.filter((attempt) => attempt.correct).length,
    firstAttemptAccuracy,
    hintActivities,
    hintRate: first.length ? hintActivities / first.length : null,
    activeDays,
    estimatedMinutes: activeSeconds > 0 ? Math.max(1, Math.ceil(activeSeconds / 60)) : first.length ? 1 : 0,
    completedMissions: progress.completedMissions.length,
    totalMissions: 29 * 5,
    stamps: progress.stamps.length,
    totalLessons: 29,
    lastActivityAt: attempts.length ? attempts.reduce((latest, item) => Date.parse(item.time) > Date.parse(latest) ? item.time : latest, attempts[0].time) : null,
    dataQuality,
  };
}

function textbookForAttempt(attempt: AttemptRecord): string | undefined {
  const activity = findActivity(attempt.lessonId, attempt.activityId);
  return activity ? formatTextbookReference(activity.source) : undefined;
}

export function getSupportSuggestions(progress: Progress, range: DashboardRange = 'all'): SupportSuggestion[] {
  const metrics = getDashboardMetrics(progress, range);
  const attempts = collectAttempts(progress, range);
  const firstByActivity = new Map<string, AttemptRecord>();
  for (const attempt of attempts) if (!firstByActivity.has(attempt.activityId)) firstByActivity.set(attempt.activityId, attempt);
  const first = [...firstByActivity.values()];
  if (metrics.activitySample < 5) {
    return [{
      id: 'insufficient-data',
      kind: 'insufficient',
      title: 'Mình cùng khám phá thêm nhé',
      body: 'Chưa đủ dữ liệu để nhận xét việc học. Chỉ cần thêm vài hoạt động ngắn, bố mẹ sẽ thấy gợi ý sát hơn.',
      action: 'Chọn một chặng đang mở và làm tiếp 5–10 phút.',
      evidence: `${metrics.activitySample}/5 hoạt động khác nhau trong khoảng đã chọn`,
    }];
  }
  const suggestions: SupportSuggestion[] = [];
  if ((metrics.firstAttemptAccuracy ?? 0) >= 0.8 && metrics.hintRate !== null && metrics.hintRate < 0.5) {
    const example = first.find((attempt) => attempt.correct);
    suggestions.push({
      id: 'strength-first-try',
      kind: 'strength',
      title: 'Con đang bắt dấu rất chắc',
      body: 'Con thường nhận ra manh mối ngay từ lần đầu và tự làm trước khi xem gợi ý.',
      action: 'Mời con kể lại một điều vừa phát hiện bằng lời của mình.',
      evidence: `${metrics.firstAttemptCorrect}/${metrics.activitySample} hoạt động đúng lần đầu; ${metrics.hintActivities}/${metrics.activitySample} hoạt động có gợi ý`,
      lessonId: example?.lessonId,
      textbookReference: example ? textbookForAttempt(example) : undefined,
    });
  }
  if (metrics.retryAttempts >= 3 || (metrics.hintRate ?? 0) >= 0.5) {
    const example = first.find((attempt) => !attempt.correct) ?? first[0];
    suggestions.push({
      id: 'read-together',
      kind: 'support',
      title: 'Cùng đọc lại một mẩu tư liệu',
      body: 'Một vài hoạt động cần thử lại hoặc có gợi ý. Đọc lại đúng phần sách rồi quay lại chặng này sẽ giúp con nối các manh mối.',
      action: 'Cùng con đọc phần SGK được dẫn, sau đó thử lại một hoạt động.',
      evidence: `${metrics.retryAttempts} lượt thử lại; ${metrics.hintActivities}/${metrics.activitySample} hoạt động có gợi ý`,
      lessonId: example?.lessonId,
      textbookReference: example ? textbookForAttempt(example) : undefined,
    });
  }
  if (!suggestions.length) {
    const example = first[0];
    suggestions.push({
      id: 'keep-exploring',
      kind: 'next',
      title: 'Giữ nhịp chuyến đi',
      body: 'Con đang có nhịp học ổn định. Một chặng ngắn tiếp theo sẽ giúp mạch câu chuyện liền hơn.',
      action: 'Chọn bài tiếp theo đang mở trên bản đồ.',
      evidence: `${metrics.firstAttemptCorrect}/${metrics.activitySample} hoạt động đúng lần đầu`,
      lessonId: example?.lessonId,
      textbookReference: example ? textbookForAttempt(example) : undefined,
    });
  }
  return suggestions.slice(0, 3);
}

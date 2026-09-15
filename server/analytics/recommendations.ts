import { formatTextbookReference } from '../../src/content/textbookGuide.ts';
import { getLessonPackage } from '../../src/content/packages.ts';
import type { DashboardActivity, DashboardRange, DashboardSuggestion } from '../../shared/dashboard-contracts.ts';
import { DASHBOARD_RULE_VERSION } from '../../shared/dashboard-contracts.ts';

function sourceFor(activity: DashboardActivity): string | undefined {
  const lesson = getLessonPackage(activity.lessonId);
  const item = lesson.missions.flatMap((mission) => mission.activities).find((candidate) => candidate.id === activity.activityId);
  return item ? formatTextbookReference(item.source) : undefined;
}

function provenance(range: DashboardRange, activities: DashboardActivity[], generatedAt: string) {
  return {
    ruleVersion: DASHBOARD_RULE_VERSION,
    range,
    activityKeys: activities.map((activity) => activity.key),
    eventIds: activities.flatMap((activity) => activity.eventIds),
    generatedAt,
  } as const;
}

export function buildRecommendations(activities: DashboardActivity[], range: DashboardRange, generatedAt: string): DashboardSuggestion[] {
  if (!activities.length) {
    return [{
      id: 'insufficient-data',
      kind: 'insufficient',
      title: 'Mình cùng khám phá thêm nhé',
      body: 'Chưa đủ dữ liệu để nhận xét việc học. Chỉ cần thêm vài hoạt động ngắn, bố mẹ sẽ thấy gợi ý sát hơn.',
      action: 'Chọn một chặng đang mở và làm tiếp 5–10 phút.',
      evidence: `${activities.length}/5 hoạt động khác nhau trong khoảng đã chọn`,
      provenance: provenance(range, activities, generatedAt),
    }];
  }

  const byTopic = new Map<string, DashboardActivity[]>();
  for (const activity of activities) byTopic.set(activity.topic, [...(byTopic.get(activity.topic) ?? []), activity]);
  const suggestions: DashboardSuggestion[] = [];
  for (const [topic, topicActivities] of byTopic) {
    const sample = topicActivities.length;
    if (sample < 5) {
      suggestions.push({
        id: `insufficient-${topic}`,
        kind: 'insufficient',
        title: `Cùng khám phá thêm ở ${topic}`,
        body: 'Chưa đủ dữ liệu để nhận xét chủ đề này. Vài hoạt động ngắn nữa sẽ giúp gợi ý sát hơn mà không gắn nhãn cho con.',
        action: 'Chọn một hoạt động đang mở trong chủ đề này và làm tiếp 5–10 phút.',
        evidence: `${sample}/5 hoạt động khác nhau trong chủ đề`,
        lessonId: topicActivities[0]?.lessonId,
        textbookReference: topicActivities[0] ? sourceFor(topicActivities[0]) : undefined,
        provenance: provenance(range, topicActivities, generatedAt),
      });
      continue;
    }
    const firstCorrect = topicActivities.filter((activity) => activity.firstAttemptCorrect).length;
    const hintActivities = topicActivities.filter((activity) => activity.hintUsed).length;
    const retryActivities = topicActivities.filter((activity) => activity.retryCount > 0).length;
    const example = topicActivities[0];
    const reference = example ? sourceFor(example) : undefined;
    if (sample >= 5 && firstCorrect / sample >= 0.8 && hintActivities / sample < 0.5) {
      suggestions.push({
        id: `strength-${topic}`,
        kind: 'strength',
        title: `Con đang làm tốt ở ${topic}`,
        body: 'Con thường nhận ra manh mối ngay từ lần đầu và tự làm trước khi xem gợi ý.',
        action: 'Mời con kể lại một điều vừa phát hiện bằng lời của mình.',
        evidence: `${firstCorrect}/${sample} hoạt động đúng lần đầu; ${hintActivities}/${sample} hoạt động có gợi ý`,
        lessonId: example?.lessonId,
        textbookReference: reference,
        provenance: provenance(range, topicActivities, generatedAt),
      });
    }
    if (retryActivities >= 3 || hintActivities / sample >= 0.5) {
      suggestions.push({
        id: `support-${topic}`,
        kind: 'support',
        title: `Cùng con nối lại mạch ${topic}`,
        body: 'Một vài hoạt động cần thử lại hoặc có gợi ý. Đọc lại đúng phần sách rồi quay lại chặng này sẽ giúp con nối các manh mối.',
        action: 'Cùng con đọc phần SGK được dẫn, sau đó thử lại một hoạt động.',
        evidence: `${retryActivities}/${sample} hoạt động có thử lại; ${hintActivities}/${sample} hoạt động có gợi ý`,
        lessonId: example?.lessonId,
        textbookReference: reference,
        provenance: provenance(range, topicActivities, generatedAt),
      });
    }
  }

  if (!suggestions.length) {
    const example = activities[0];
    suggestions.push({
      id: 'keep-exploring',
      kind: 'next',
      title: 'Giữ nhịp chuyến đi',
      body: 'Con đang có nhịp học ổn định. Một chặng ngắn tiếp theo sẽ giúp mạch câu chuyện liền hơn.',
      action: 'Chọn bài tiếp theo đang mở trên bản đồ.',
      evidence: `${activities.filter((activity) => activity.firstAttemptCorrect).length}/${activities.length} hoạt động đúng lần đầu`,
      lessonId: example?.lessonId,
      textbookReference: example ? sourceFor(example) : undefined,
      provenance: provenance(range, activities, generatedAt),
    });
  }
  return suggestions.slice(0, 3);
}

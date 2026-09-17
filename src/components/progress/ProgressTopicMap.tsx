import type { ProgressBoardTopic } from '../../../shared/progress-board-contracts';
import { ProgressLessonCard } from './ProgressLessonCard';

export type ProgressTopicMapProps = {
  topics: readonly ProgressBoardTopic[];
  selectedLessonId: string | null;
  onSelectLesson: (lessonId: string) => void;
  reducedMotion: boolean;
};

export function ProgressTopicMap({ topics, selectedLessonId, onSelectLesson, reducedMotion }: ProgressTopicMapProps) {
  return (
    <section className="progress-topic-map" data-progress-topic-map data-reduced-motion={reducedMotion ? 'true' : 'false'} aria-labelledby="progress-topic-map-title">
      <div className="progress-topic-map-heading">
        <p className="eyebrow">BẢN ĐỒ KHÁM PHÁ</p>
        <h2 id="progress-topic-map-title">Mỗi vùng mở ra một điều mới</h2>
        <p>Chọn một chặng để xem mình đã đi đến đâu và bước nào đang chờ phía trước.</p>
      </div>
      {topics.length === 0 ? (
        <p className="progress-empty-map" data-progress-empty>Chưa có chặng nào để hiển thị. Mình bắt đầu từ bài học đầu tiên nhé!</p>
      ) : (
        <div className="progress-topic-list">
          {topics.map((topic, index) => {
            const topicHeadingId = 'progress-topic-heading-' + index;
            return (
              <section className="progress-topic-section" data-progress-topic={topic.topic} key={topic.topic} aria-labelledby={topicHeadingId}>
                <h3 id={topicHeadingId}>{topic.topic}</h3>
                <div className="progress-lesson-list">
                  {topic.lessons.map((lesson) => (
                    <ProgressLessonCard key={lesson.lessonId} lesson={lesson} selected={selectedLessonId === lesson.lessonId} onSelect={onSelectLesson} reducedMotion={reducedMotion} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

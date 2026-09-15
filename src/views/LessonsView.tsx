import { isLessonUnlocked, getPreviousLesson } from '../game/lessonAccess';
import { useState } from 'react';
import { MVP_LESSONS, TOPICS, type MvpLessonId } from '../content/catalog';
import { getLessonArtwork } from '../content/lessonArtwork';
import type { Progress } from '../content/types';
import { getLessonRewardState } from '../game/rewards';
import { ArrowIcon, BookIcon, CheckIcon, MountainIcon, LockIcon } from '../components/icons';

type LessonsViewProps = {
  progress: Progress;
  onOpenLesson: (lessonId: MvpLessonId) => void;
  onBack: () => void;
};

export function LessonsView({ progress, onOpenLesson, onBack }: LessonsViewProps) {
  const [activeTopic, setActiveTopic] = useState<string>('Tất cả');
  const [failedArtwork, setFailedArtwork] = useState<Partial<Record<MvpLessonId, boolean>>>({});
  const visibleLessons = activeTopic === 'Tất cả' ? MVP_LESSONS : MVP_LESSONS.filter((lesson) => lesson.topic === activeTopic);

  return (
    <section className="content-view lessons-view" aria-labelledby="lessons-title">
      <div className="view-heading">
        <div className="page-title-tag"><h1 id="lessons-title">Bài học</h1></div>
        <button className="secondary-button" type="button" onClick={onBack}><ArrowIcon direction="left" size={17} /> Về hành trình</button>
      </div>

      <div className="topic-tabs" role="tablist" aria-label="Lọc chủ đề">
        {['Tất cả', ...TOPICS].map((topic) => (
          <button className={`topic-tab${activeTopic === topic ? ' is-active' : ''}`} role="tab" aria-selected={activeTopic === topic} type="button" key={topic} onClick={() => setActiveTopic(topic)}>
            {topic}
          </button>
        ))}
      </div>

      <div className="lesson-grid lesson-grid-three-up-landscape" data-landscape-columns="3">
        {visibleLessons.map((lesson) => (
          <article className={`lesson-card lesson-card-${lesson.color}`} key={lesson.id}>
            <div className="lesson-card-art">
              <div className="lesson-art-sun" aria-hidden="true" />
              <div className="lesson-art-mountain mountain-back" aria-hidden="true" />
              <div className="lesson-art-mountain mountain-front" aria-hidden="true" />
              <div className="lesson-art-water" aria-hidden="true" />
              {!failedArtwork[lesson.id] && <img
                className="lesson-art-image"
                src={getLessonArtwork(lesson.id).src}
                alt={getLessonArtwork(lesson.id).alt}
                loading="lazy"
                decoding="async"
                width={768}
                height={1024}
                style={{ objectPosition: getLessonArtwork(lesson.id).objectPosition ?? '50% 50%' }}
                onError={() => setFailedArtwork(current => ({ ...current, [lesson.id]: true }))}
              />}
              <span className="lesson-art-badge" aria-hidden="true">{lesson.number.replace('Bài ', '')}</span>
            </div>
            <div className="lesson-card-body">
              <p className="eyebrow">{lesson.eyebrow}</p>
              <h2>{lesson.title}</h2>
              <p className="lesson-source"><BookIcon size={16} /> Có nguồn trong {lesson.sourceLabel}</p>
              <div className="lesson-meta"><span><CheckIcon size={16} /> {getLessonRewardState(progress, lesson.id).completed}/{lesson.missions} nhiệm vụ đã hoàn thành</span><span className="open-pill">{isLessonUnlocked(lesson.id, progress.completedMissions) ? 'Đang mở' : 'Đang khóa'}</span></div>
              {!isLessonUnlocked(lesson.id, progress.completedMissions) && <p className="lesson-unlock-hint"><LockIcon size={16} /> Hoàn thành {getPreviousLesson(lesson.id)?.title} để mở khóa.</p>}
              <button className="primary-small-button" type="button" disabled={!isLessonUnlocked(lesson.id, progress.completedMissions)} onClick={() => onOpenLesson(lesson.id)}>{isLessonUnlocked(lesson.id, progress.completedMissions) ? 'Mở chặng' : 'Chặng đang khóa'} <ArrowIcon size={18} /></button>
            </div>
          </article>
        ))}
      </div>

      <div className="catalog-ready" role="status">
        <BookIcon size={20} />
        <div><strong>29 bài học trong hành trình</strong><p>Mỗi bài có năm nhiệm vụ. Hoàn thành bài trước để mở khóa bài tiếp theo.</p></div>
      </div>

      <div className="topics-footnote"><MountainIcon size={18} /><span>Sáu vùng học tập: {TOPICS.join(' · ')}</span></div>
    </section>
  );
}

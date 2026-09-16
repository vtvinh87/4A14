import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowIcon, LockIcon } from '../components/icons';
import { FloatingPet } from '../components/FloatingPet';
import { MVP_LESSONS } from '../content/catalog';
import { getStampArtifact } from '../content/stampArtifacts';
import type { LessonId, Progress } from '../content/types';
import { getLessonRewardState } from '../game/rewards';

type RewardViewProps = {
  progress: Progress;
  reducedMotion: boolean;
  onPetTap: () => void;
  onOpenLessons: () => void;
};

const COMPACT_VIEWPORT_MAX = 700;

function isCompactViewport() {
  return typeof window !== 'undefined' && window.innerWidth <= COMPACT_VIEWPORT_MAX;
}

export function RewardView({ progress, reducedMotion, onPetTap, onOpenLessons }: RewardViewProps) {
  const [selectedLessonId, setSelectedLessonId] = useState<LessonId | null>(null);
  const [compactViewport, setCompactViewport] = useState(isCompactViewport);
  const [pageIndex, setPageIndex] = useState(0);
  const rewardStates = MVP_LESSONS.map((lesson) => ({ lesson, state: getLessonRewardState(progress, lesson.id) }));
  const earned = rewardStates.filter(({ state }) => state.stamped).length;
  const pageSize = compactViewport ? 2 : 6;
  const pageCount = Math.max(1, Math.ceil(rewardStates.length / pageSize));
  const activePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageRewards = rewardStates.slice(activePageIndex * pageSize, (activePageIndex + 1) * pageSize);
  const selectedReward = selectedLessonId ? rewardStates.find(({ lesson }) => lesson.id === selectedLessonId) : undefined;
  const selectedArtifact = selectedReward ? getStampArtifact(selectedReward.lesson.id) : undefined;

  useEffect(() => {
    const handleResize = () => setCompactViewport(isCompactViewport());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setPageIndex((currentPage) => Math.min(currentPage, pageCount - 1));
  }, [pageCount]);

  useEffect(() => {
    if (!selectedLessonId) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedLessonId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLessonId]);

  return (
    <section className="content-view reward-view" aria-labelledby="reward-title">
      <div className="view-heading">
        <div className="page-title-tag"><h1 id="reward-title">Hộ chiếu</h1></div>
        <div className="passport-count"><strong>{earned}</strong><span>/ {rewardStates.length} chặng đã hoàn thành</span></div>
      </div>
      <FloatingPet mood={earned === rewardStates.length ? 'celebrate' : 'idle'} reducedMotion={reducedMotion} onTap={onPetTap} />
      <div className="passport-board">
        <div className="passport-cover">
          <img className="passport-cover-art" data-reward-art src="/art/reward/passport-cover-lettered.png" alt="Hộ chiếu Cáo Nhỏ" draggable={false} />
        </div>
        <div className="passport-stamp-panel">
          <div className="stamp-grid" data-stamp-page={activePageIndex + 1}>
            {pageRewards.map(({ lesson, state }) => {
              const artifact = getStampArtifact(lesson.id);
              return (
                <button
                  className={`stamp-slot${state.stamped ? ' is-earned' : ' is-locked'}`}
                  type="button"
                  key={lesson.id}
                  data-reward-stamp={lesson.id}
                  aria-label={`${artifact.name} · ${state.stamped ? 'Đã nhận' : 'Chưa nhận'}`}
                  onClick={() => setSelectedLessonId(lesson.id)}
                >
                  <span className="stamp-outline">
                    <img className="stamp-art" data-reward-art data-reward-stamp={lesson.id} src={artifact.src} alt={artifact.alt} loading="lazy" draggable={false} />
                    {!state.stamped && <span className="stamp-lock-badge is-centered" data-stamp-lock data-stamp-lock-position="center" aria-hidden="true"><LockIcon size={18} /></span>}
                  </span>
                  <span className="stamp-copy">
                    <small className="stamp-lesson-number">{lesson.number} · {artifact.region}</small>
                    <strong>{artifact.name}</strong>
                    <small className="stamp-status">{state.stamped ? 'Đã đóng dấu' : `${state.completed}/${state.total} nhiệm vụ`}</small>
                  </span>
                </button>
              );
            })}
          </div>
          <nav className="stamp-pagination" data-stamp-pagination aria-label="Trang dấu trong hộ chiếu">
            <button className="stamp-page-button" data-stamp-prev type="button" disabled={activePageIndex === 0} onClick={() => setPageIndex((currentPage) => Math.max(0, currentPage - 1))}>← Trang trước</button>
            <span className="stamp-page-number" data-stamp-page-number aria-live="polite">Trang {activePageIndex + 1} / {pageCount}</span>
            <button className="stamp-page-button" data-stamp-next type="button" disabled={activePageIndex === pageCount - 1} onClick={() => setPageIndex((currentPage) => Math.min(pageCount - 1, currentPage + 1))}>Trang sau →</button>
          </nav>
        </div>
      </div>
      <div className="empty-action-card"><span className="empty-action-icon"><img className="empty-action-art" data-reward-art src="/art/reward/start-journey.png" alt="" aria-hidden="true" draggable={false} /></span><div><strong>{earned ? 'Tiếp tục một chặng đang mở' : 'Bắt đầu từ một chặng đang mở'}</strong><p>Dấu chỉ được cấp sau khi hoàn thành đủ các nhiệm vụ.</p></div><button className="secondary-button" type="button" onClick={onOpenLessons}>Xem bài học <ArrowIcon size={17} /></button></div>
      {selectedReward && selectedArtifact && typeof document !== 'undefined' ? createPortal(
        <div className="stamp-dialog-backdrop" data-stamp-dialog-backdrop onClick={() => setSelectedLessonId(null)}>
          <section className={`stamp-dialog${selectedReward.state.stamped ? '' : ' is-locked'}`} data-stamp-dialog role="dialog" aria-modal="true" aria-labelledby="stamp-dialog-title" onClick={(event) => event.stopPropagation()}>
            <button className="stamp-dialog-close" data-stamp-dialog-close type="button" aria-label="Đóng câu chuyện dấu" onClick={() => setSelectedLessonId(null)}>×</button>
            <div className="stamp-dialog-art-wrap">
              <img className="stamp-dialog-art" src={selectedArtifact.src} alt={selectedArtifact.alt} draggable={false} />
              {!selectedReward.state.stamped && <span className="stamp-dialog-lock-badge is-centered" data-stamp-dialog-lock data-stamp-dialog-lock-position="center" aria-hidden="true"><LockIcon size={28} /><small>Đang khóa</small></span>}
            </div>
            <div className="stamp-dialog-copy" data-stamp-dialog-locked={!selectedReward.state.stamped ? true : undefined}>
              <p className="eyebrow">{selectedReward.lesson.number} · {selectedArtifact.region}</p>
              <h2 id="stamp-dialog-title" data-stamp-dialog-title>{selectedArtifact.name}</h2>
              {selectedReward.state.stamped ? <p>{selectedArtifact.story}</p> : <p>Hoàn thành đủ {selectedReward.state.total} nhiệm vụ của {selectedReward.lesson.number} để mở khóa dấu này và đọc câu chuyện.</p>}
              <p className={`stamp-dialog-status${selectedReward.state.stamped ? ' is-earned' : ''}`}>
                {selectedReward.state.stamped
                  ? 'Dấu này đã được đóng vào hộ chiếu của em.'
                  : `Còn ${selectedReward.state.total - selectedReward.state.completed} nhiệm vụ để mở dấu này.`}
              </p>
              {selectedReward.state.stamped ? <small className="stamp-dialog-source">{selectedArtifact.sourceNote}</small> : <small className="stamp-dialog-source">Vào bài học này, hoàn thành các nhiệm vụ rồi quay lại hộ chiếu để nhận dấu.</small>}
            </div>
          </section>
        </div>,
        document.body,
      ) : null}
    </section>
  );
}

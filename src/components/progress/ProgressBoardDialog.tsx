import { useEffect, useRef, useState } from 'react';
import type { ProgressBoardData, ProgressBoardLesson } from '../../../shared/progress-board-contracts';
import { getFocusableElements, getNextFocusIndex } from '../SettingsDialog';
import type { ProgressBoardStatus } from '../../progress/useProgressBoard';
import type { ProgressClassUnlockSummary } from './ClassUnlockCard';
import { ProgressMapDrawer } from './ProgressMapDrawer';
import { ProgressMapScene } from './ProgressMapScene';
import { summarizeProgressMapTopic } from './progressMapSelectors';

export type ProgressBoardDialogProps = {
  status: ProgressBoardStatus;
  data: ProgressBoardData | null;
  error: string;
  reducedMotion: boolean;
  classUnlock?: ProgressClassUnlockSummary | null;
  onRefresh: () => Promise<void> | void;
  onClose: () => void;
  onOpenLesson?: (lessonId: string) => void;
  lockBodyScroll?: boolean;
};

function allLessons(data: ProgressBoardData | null): ProgressBoardLesson[] {
  return data?.topics.flatMap((topic) => topic.lessons) ?? [];
}

function isBoardVisible(status: ProgressBoardStatus, data: ProgressBoardData | null): data is ProgressBoardData {
  return Boolean(data) && (status === 'success' || status === 'empty' || status === 'stale');
}

const EMPTY_PROGRESS_TOPIC = { topic: 'Địa phương em', lessons: [] as ProgressBoardLesson[] };

export function ProgressBoardDialog({ status, data, error, reducedMotion, classUnlock, onRefresh, onClose, onOpenLesson, lockBodyScroll = true }: ProgressBoardDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const previousOverflowRef = useRef('');
  const onCloseRef = useRef(onClose);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(data?.nextLessonId ?? null);
  const [selectedTopicName, setSelectedTopicName] = useState<string | null>(null);
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  onCloseRef.current = onClose;

  const lessons = allLessons(data);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousOverflowRef.current = document.body.style.overflow;
    const ownsBodyLock = lockBodyScroll && previousOverflowRef.current !== 'hidden';
    if (ownsBodyLock) document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = getFocusableElements(dialog);
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const lastIndex = focusable.length - 1;
      if (event.shiftKey && (currentIndex <= 0 || currentIndex === -1)) {
        event.preventDefault();
        focusable[getNextFocusIndex(0, focusable.length, true)]?.focus();
      } else if (!event.shiftKey && (currentIndex === lastIndex || currentIndex === -1)) {
        event.preventDefault();
        focusable[getNextFocusIndex(lastIndex, focusable.length, false)]?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (ownsBodyLock) document.body.style.overflow = previousOverflowRef.current;
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
    };
  }, [lockBodyScroll]);

  useEffect(() => {
    setSelectedLessonId((current) => {
      if (current && lessons.some((lesson) => lesson.lessonId === current)) return current;
      return data?.nextLessonId ?? null;
    });
    setSelectedTopicName((current) => current && data?.topics.some((topic) => topic.topic === current) ? current : null);
    setDetailsOpen(false);
  }, [data]);

  const nextLesson = data?.nextLessonId ? lessons.find((lesson) => lesson.lessonId === data.nextLessonId) ?? null : null;
  const selectedLesson = selectedTopicName
    ? lessons.find((lesson) => lesson.lessonId === selectedLessonId && lesson.topic === selectedTopicName)
      ?? (nextLesson?.topic === selectedTopicName ? nextLesson : null)
    : lessons.find((lesson) => lesson.lessonId === selectedLessonId) ?? nextLesson ?? null;
  const selectedTopic = (selectedTopicName ? data?.topics.find((topic) => topic.topic === selectedTopicName) : undefined)
    ?? (selectedTopicName ? { topic: selectedTopicName, lessons: [] as ProgressBoardLesson[] } : undefined)
    ?? data?.topics.find((topic) => selectedLesson && topic.lessons.some((lesson) => lesson.lessonId === selectedLesson.lessonId))
    ?? data?.topics[0]
    ?? EMPTY_PROGRESS_TOPIC;
  const selectedTopicSnapshot = summarizeProgressMapTopic(selectedTopic, data?.nextLessonId ?? null);
  const openLesson = (lessonId: string) => onOpenLesson?.(lessonId);
  const selectLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setSelectedTopicName(data?.topics.find((topic) => topic.lessons.some((lesson) => lesson.lessonId === lessonId))?.topic ?? null);
    setDetailsOpen(false);
  };
  const toggleDrawer = () => {
    setDrawerExpanded((expanded) => {
      if (expanded) setDetailsOpen(false);
      return !expanded;
    });
  };
  const handleBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onCloseRef.current();
  };

  return (
    <div className="dialog-backdrop progress-board-dialog-backdrop" data-progress-board-backdrop role="presentation" onMouseDown={handleBackdropMouseDown}>
      <section
        ref={dialogRef}
        className="progress-board-dialog"
        data-progress-board-dialog
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="progress-board-dialog-title"
        aria-describedby="progress-board-dialog-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="progress-board-dialog-heading">
          <div className="progress-board-dialog-art" aria-hidden="true">
            <img src="/art/dock/journey.png" alt="" />
          </div>
          <div className="progress-board-dialog-title-copy">
            <p className="eyebrow">CHUYẾN ĐI CỦA MÌNH</p>
            <h2 id="progress-board-dialog-title">Chuyến đi của tớ</h2>
            {data && <span className="progress-board-dialog-badge" data-progress-board-badge>{data.summary.exploredLessonCount}/{lessons.length} chặng</span>}
          </div>
          <button ref={closeRef} className="dialog-close" type="button" onClick={onClose} aria-label="Đóng Bảng tiến bộ">×</button>
        </div>

        <p id="progress-board-dialog-description" className="progress-board-dialog-intro">Chọn một chặng trên bản đồ để xem bước tiếp theo nhé!</p>

        {status === 'loading' && (
          <div className="progress-board-state progress-board-loading" data-progress-board-state="loading" role="status">
            <span className="progress-board-loading-orb" aria-hidden="true">✦</span>
            <strong>Đang mở bản đồ tiến bộ...</strong>
            <p>Mình lấy những bước học tập mới nhất.</p>
          </div>
        )}

        {status === 'logged-out' && (
          <div className="progress-board-state" data-progress-board-state="logged-out" role="status">
            <strong>Hãy đăng nhập để xem hành trình của mình.</strong>
          </div>
        )}

        {status === 'idle' && (
          <div className="progress-board-state" data-progress-board-state="idle" role="status">
            <strong>Bản đồ tiến bộ đang chờ mình mở.</strong>
          </div>
        )}

        {status === 'unavailable' && (
          <div className="progress-board-state progress-board-error" data-progress-board-state="unavailable" role="alert">
            <strong>{error || 'Bảng tiến bộ tạm thời chưa sẵn sàng.'}</strong>
            <p>Mình thử kết nối lại nhé.</p>
            <button className="secondary-button" data-progress-board-retry type="button" onClick={() => void onRefresh()}>Thử lại</button>
          </div>
        )}

        {isBoardVisible(status, data) && (
          <>
            {status === 'stale' && (
              <div className="progress-board-stale-banner" data-progress-board-stale role="status">
                <span>Dữ liệu đang hiển thị có thể chưa mới.</span>
                <button className="text-button" type="button" onClick={() => void onRefresh()}>Cập nhật</button>
              </div>
            )}
            {status === 'empty' && (
              <div className="progress-board-empty-note" data-progress-board-empty role="status">
                Chưa có hoạt động nào trong bản đồ. Mình bắt đầu từ bài học đầu tiên nhé!
              </div>
            )}
            <div className="progress-board-content">
              <ProgressMapScene
                topics={data.topics}
                nextLessonId={data.nextLessonId}
                selectedLessonId={selectedLesson?.lessonId ?? null}
                selectedTopicName={selectedTopicName}
                reducedMotion={reducedMotion}
                classUnlock={classUnlock}
                onSelectLesson={selectLesson}
                onSelectTopic={(topicName) => {
                  setSelectedTopicName(topicName);
                  setSelectedLessonId(null);
                  setDetailsOpen(false);
                }}
                onOpenLesson={openLesson}
              />
              <ProgressMapDrawer
                topic={selectedTopic}
                topicSnapshot={selectedTopicSnapshot}
                selectedLesson={selectedLesson}
                expanded={drawerExpanded}
                detailsOpen={detailsOpen}
                reducedMotion={reducedMotion}
                classUnlock={classUnlock}
                onToggleExpanded={toggleDrawer}
                onToggleDetails={() => setDetailsOpen((value) => !value)}
                onSelectLesson={(lessonId) => {
                  selectLesson(lessonId);
                }}
                onOpenLesson={openLesson}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

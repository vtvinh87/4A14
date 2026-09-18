import { useEffect, useRef, useState } from 'react';
import type { ProgressBoardData, ProgressBoardLesson } from '../../../shared/progress-board-contracts';
import { getFocusableElements, getNextFocusIndex } from '../SettingsDialog';
import type { ProgressBoardStatus } from '../../progress/useProgressBoard';
import type { ProgressClassUnlockSummary } from './ClassUnlockCard';
import { ProgressMapLandmarkImageModal } from './ProgressMapLandmarkImageModal';
import { ProgressMapInfoPanel } from './ProgressMapInfoPanel';
import { ProgressMapScene } from './ProgressMapScene';
import { getProgressMapLandmarkPresentation, getProgressMapAsset, type MapSelection } from './progressMapPresentation';
import { getProgressMapLandmarkDetail } from './progressMapLandmarkDetails';
import type { ProgressMapLandmarkId } from './progressMapLandmarks';
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
  const selectionRef = useRef<MapSelection>({ kind: 'welcome' });
  const drawerExpandedRef = useRef(false);
  const detailsOpenRef = useRef(false);
  const landmarkImageOpenRef = useRef(false);
  const landmarkImageTriggerRef = useRef<HTMLButtonElement | null>(null);
  const landmarkModalRef = useRef<HTMLElement>(null);
  const landmarkModalCloseRef = useRef<HTMLButtonElement>(null);
  const [selection, setSelection] = useState<MapSelection>({ kind: 'welcome' });
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [landmarkImageOpen, setLandmarkImageOpen] = useState(false);
  onCloseRef.current = onClose;
  selectionRef.current = selection;
  drawerExpandedRef.current = drawerExpanded;
  detailsOpenRef.current = detailsOpen;
  landmarkImageOpenRef.current = landmarkImageOpen;

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
        if (landmarkImageOpenRef.current) {
          setLandmarkImageOpen(false);
          landmarkImageOpenRef.current = false;
          return;
        }
        if (detailsOpenRef.current) {
          setDetailsOpen(false);
          return;
        }
        if (selectionRef.current.kind === 'landmark') {
          setSelection({ kind: 'welcome' });
          return;
        }
        if (drawerExpandedRef.current) {
          setDrawerExpanded(false);
          return;
        }
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = landmarkImageOpenRef.current ? landmarkModalRef.current : dialogRef.current;
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
    if (landmarkImageOpen) {
      landmarkModalCloseRef.current?.focus();
      return;
    }

    const trigger = landmarkImageTriggerRef.current;
    if (trigger?.isConnected) trigger.focus();
    landmarkImageTriggerRef.current = null;
  }, [landmarkImageOpen]);

  useEffect(() => {
    if (!data) return;
    if (selection.kind === 'topic') {
      const topic = data.topics.find((candidate) => candidate.topic === selection.topicName);
      if (!topic) {
        setSelectedLessonId(null);
        setDetailsOpen(false);
        return;
      }
      const topicSnapshot = summarizeProgressMapTopic(topic, data.nextLessonId);
      setSelectedLessonId((current) => current && topic.lessons.some((lesson) => lesson.lessonId === current)
        ? current
        : topicSnapshot.nextLessonId);
      setDetailsOpen(false);
      return;
    }
    if (selection.kind === 'welcome') setSelectedLessonId(null);
  }, [data, selection]);

  const selectedTopic = selection.kind === 'topic'
    ? data?.topics.find((topic) => topic.topic === selection.topicName) ?? { topic: selection.topicName, lessons: [] as ProgressBoardLesson[] }
    : EMPTY_PROGRESS_TOPIC;
  const selectedLesson = selection.kind === 'topic'
    ? selectedTopic.lessons.find((lesson) => lesson.lessonId === selectedLessonId) ?? null
    : null;
  const openLesson = (lessonId: string) => onOpenLesson?.(lessonId);
  const resetLandmarkImage = () => {
    landmarkImageOpenRef.current = false;
    setLandmarkImageOpen(false);
    landmarkImageTriggerRef.current = null;
  };
  const openLandmarkImage = (landmarkId: ProgressMapLandmarkId, trigger: HTMLButtonElement) => {
    if (selection.kind !== 'landmark' || selection.landmarkId !== landmarkId) return;
    landmarkImageTriggerRef.current = trigger;
    landmarkImageOpenRef.current = true;
    setLandmarkImageOpen(true);
  };
  const closeLandmarkImage = () => {
    landmarkImageOpenRef.current = false;
    setLandmarkImageOpen(false);
  };
  const selectTopic = (topicName: string) => {
    const topic = data?.topics.find((candidate) => candidate.topic === topicName) ?? { topic: topicName, lessons: [] as ProgressBoardLesson[] };
    const topicSnapshot = summarizeProgressMapTopic(topic, data?.nextLessonId ?? null);
    setSelection({ kind: 'topic', topicName });
    setSelectedLessonId(topicSnapshot.nextLessonId);
    setDrawerExpanded(false);
    setDetailsOpen(false);
    resetLandmarkImage();
  };
  const selectLandmark = (landmarkId: Extract<MapSelection, { kind: 'landmark' }>['landmarkId']) => {
    setSelection({ kind: 'landmark', landmarkId });
    setDrawerExpanded(false);
    setDetailsOpen(false);
    resetLandmarkImage();
  };
  const selectLesson = (lessonId: string) => {
    if (selection.kind !== 'topic') return;
    setSelectedLessonId(lessonId);
    setDetailsOpen(false);
  };
  const handleBackToMap = () => {
    setSelection({ kind: 'welcome' });
    setSelectedLessonId(null);
    setDrawerExpanded(false);
    setDetailsOpen(false);
    resetLandmarkImage();
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
  const compassAsset = getProgressMapAsset('compass-start');
  const bookAsset = getProgressMapAsset('book-progress');

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
          <button className="progress-map-compass" data-progress-map-compass type="button" onClick={() => selectTopic('Địa phương em')} aria-label="Mở Địa phương em">
            <img src={compassAsset.src} width={compassAsset.width} height={compassAsset.height} alt="" />
          </button>
          <div className="progress-board-dialog-title-copy">
            <p className="eyebrow">CHUYẾN ĐI CỦA MÌNH</p>
            <h2 id="progress-board-dialog-title">Chuyến đi của tớ</h2>
            {data && (
              <span className="progress-board-dialog-badge" data-progress-board-badge>
                <img src={bookAsset.src} width={bookAsset.width} height={bookAsset.height} alt="" />
                <span>{data.summary.exploredLessonCount}/{lessons.length} chặng</span>
              </span>
            )}
          </div>
          <button ref={closeRef} className="dialog-close" type="button" onClick={onClose} aria-label="Đóng Bảng tiến bộ">×</button>
        </div>

        <p id="progress-board-dialog-description" className="progress-board-dialog-intro">Chọn một chặng trên bản đồ để xem bước tiếp theo nhé!</p>

        {status === 'loading' && (
          <div className="progress-board-state progress-board-loading" data-progress-board-state="loading" role="status">
            <span className="progress-board-loading-orb" aria-hidden="true" />
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
                selection={selection}
                reducedMotion={reducedMotion}
                onSelectTopic={selectTopic}
                onSelectLandmark={selectLandmark}
              />
              <ProgressMapInfoPanel
                selection={selection}
                data={data}
                selectedLessonId={selectedLesson?.lessonId ?? null}
                expanded={drawerExpanded}
                detailsOpen={detailsOpen}
                reducedMotion={reducedMotion}
                classUnlock={classUnlock}
                onToggleExpanded={toggleDrawer}
                onToggleDetails={() => setDetailsOpen((value) => !value)}
                onSelectLesson={selectLesson}
                onOpenLesson={openLesson}
                onOpenLandmarkImage={openLandmarkImage}
                onBack={handleBackToMap}
              />
            </div>
            {selection.kind === 'landmark' && landmarkImageOpen && (
              <ProgressMapLandmarkImageModal
                landmark={getProgressMapLandmarkPresentation(selection.landmarkId)}
                detail={getProgressMapLandmarkDetail(selection.landmarkId)}
                modalRef={landmarkModalRef}
                closeButtonRef={landmarkModalCloseRef}
                onClose={closeLandmarkImage}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}

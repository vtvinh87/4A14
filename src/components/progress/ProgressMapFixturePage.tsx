import { useState } from 'react';
import type { ProgressBoardData, ProgressBoardLesson } from '../../../shared/progress-board-contracts';
import { MVP_LESSONS, TOPICS } from '../../content/catalog';
import { ProgressBoardDialog } from './ProgressBoardDialog';

const FIXTURE_NEXT_LESSON_ID = 'lesson-18';

function createFixtureLesson(index: number): ProgressBoardLesson {
  const lesson = MVP_LESSONS[index];
  const explored = index < 7;
  const completed = index === 2 || index === 6;
  const independent = completed;
  return {
    lessonId: lesson.id,
    title: lesson.title,
    topic: lesson.topic,
    completed,
    state: independent ? 'independent' : explored ? 'explored' : 'not_started',
    completedMissionCount: independent ? lesson.missions : explored ? 2 : 0,
    missionCount: lesson.missions,
    objectives: [],
    nextAction: independent ? 'celebrate' : explored ? 'practice' : 'explore',
  };
}

const FIXTURE_LESSONS = MVP_LESSONS.map((_, index) => createFixtureLesson(index));

const FIXTURE_DATA: ProgressBoardData = {
  schemaVersion: 1,
  ruleVersion: 'progress-board-v1',
  contentVersion: 'local-progress-map-fixture',
  generation: 'fixture',
  generatedAt: '2026-09-18T00:00:00.000Z',
  lastSyncedAt: '2026-09-18T00:00:00.000Z',
  stale: false,
  summary: {
    exploredLessonCount: FIXTURE_LESSONS.filter((lesson) => lesson.state !== 'not_started').length,
    completedLessonCount: FIXTURE_LESSONS.filter((lesson) => lesson.completed).length,
    independentObjectiveCount: 0,
    nextLessonId: FIXTURE_NEXT_LESSON_ID,
  },
  topics: TOPICS.map((topic) => ({
    topic,
    lessons: FIXTURE_LESSONS.filter((lesson) => lesson.topic === topic),
  })),
  nextLessonId: FIXTURE_NEXT_LESSON_ID,
};

export function ProgressMapFixturePage() {
  const [open, setOpen] = useState(true);
  const [lastOpenedLessonId, setLastOpenedLessonId] = useState<string | null>(null);

  if (!open) {
    return <main data-progress-map-fixture data-progress-map-fixture-closed>Bản fixture đã đóng.</main>;
  }

  return (
    <main data-progress-map-fixture>
      <ProgressBoardDialog
        status="success"
        data={FIXTURE_DATA}
        error=""
        reducedMotion={false}
        onRefresh={() => undefined}
        onClose={() => setOpen(false)}
        onOpenLesson={setLastOpenedLessonId}
        lockBodyScroll={false}
      />
      <output data-progress-map-fixture-opened-lesson aria-live="polite">
        {lastOpenedLessonId ? `Fixture mở ${lastOpenedLessonId}` : ''}
      </output>
    </main>
  );
}

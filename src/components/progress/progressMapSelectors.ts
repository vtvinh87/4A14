import type { ProgressBoardTopic, ProgressState } from '../../../shared/progress-board-contracts';

export type ProgressMapTopicSnapshot = {
  topic: string;
  state: ProgressState;
  lessonCount: number;
  exploredLessonCount: number;
  completedLessonCount: number;
  independentLessonCount: number;
  nextLessonId: string | null;
};

const STATE_RANK: Record<ProgressState, number> = {
  not_started: 0,
  explored: 1,
  practicing: 2,
  independent: 3,
};

function strongestState(states: readonly ProgressState[]): ProgressState {
  return states.reduce<ProgressState>((strongest, state) => STATE_RANK[state] > STATE_RANK[strongest] ? state : strongest, 'not_started');
}

function getPresentationNextLessonId(topic: ProgressBoardTopic, nextLessonId: string | null): string | null {
  if (nextLessonId && topic.lessons.some((lesson) => lesson.lessonId === nextLessonId)) return nextLessonId;
  return topic.lessons.find((lesson) => lesson.nextAction !== 'celebrate')?.lessonId ?? null;
}

export function summarizeProgressMapTopic(topic: ProgressBoardTopic, nextLessonId: string | null): ProgressMapTopicSnapshot {
  const lessons = topic.lessons;
  return {
    topic: topic.topic,
    state: strongestState(lessons.map((lesson) => lesson.state)),
    lessonCount: lessons.length,
    exploredLessonCount: lessons.filter((lesson) => lesson.state !== 'not_started').length,
    completedLessonCount: lessons.filter((lesson) => lesson.completed).length,
    independentLessonCount: lessons.filter((lesson) => lesson.state === 'independent').length,
    nextLessonId: getPresentationNextLessonId(topic, nextLessonId),
  };
}

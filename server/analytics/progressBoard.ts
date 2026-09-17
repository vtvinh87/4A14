import {
  PROGRESS_BOARD_RULE_VERSION,
  PROGRESS_BOARD_SCHEMA_VERSION,
  type ProgressBoardContentIndex,
  type ProgressBoardContentLesson,
  type ProgressBoardData,
  type ProgressBoardLesson,
  type ProgressBoardNextAction,
  type ProgressBoardObjective,
  type ProgressBoardTopic,
  type ProgressState,
} from '../../shared/progress-board-contracts.ts';
import type { LearningEventRecord, LearningSnapshotRecord } from '../learning/types.ts';

type ObjectiveEvidence = {
  practicedActivityIds: Set<string>;
  independentActivityIds: Set<string>;
};

function eventTime(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareEvents(a: LearningEventRecord, b: LearningEventRecord): number {
  return eventTime(a.receivedAt) - eventTime(b.receivedAt)
    || a.runId.localeCompare(b.runId)
    || a.sequence - b.sequence
    || a.eventId.localeCompare(b.eventId);
}

function nextAction(state: ProgressState, independentActivityCount: number): ProgressBoardNextAction {
  if (state === 'independent') return 'celebrate';
  if (state === 'practicing' && independentActivityCount > 0) return 'review';
  if (state === 'not_started') return 'explore';
  return 'practice';
}

function lessonState(
  completed: boolean,
  objectives: ProgressBoardObjective[],
  discovered: boolean,
): ProgressState {
  if (completed && objectives.length > 0 && objectives.every((objective) => objective.state === 'independent')) return 'independent';
  if (objectives.some((objective) => objective.state === 'practicing' || objective.state === 'independent')) return 'practicing';
  if (discovered) return 'explored';
  return 'not_started';
}

function lessonNextAction(state: ProgressState, completed: boolean): ProgressBoardNextAction {
  if (state === 'independent') return 'celebrate';
  if (completed && state === 'practicing') return 'review';
  return nextAction(state, 0);
}

function publishedLessonMap(index: ProgressBoardContentIndex): Map<string, ProgressBoardContentLesson> {
  return new Map(index.lessons.filter((lesson) => lesson.published).map((lesson) => [lesson.lessonId, lesson]));
}

export function buildProgressBoardData(
  snapshot: LearningSnapshotRecord,
  events: LearningEventRecord[],
  contentIndex: ProgressBoardContentIndex,
  generatedAt: string,
): ProgressBoardData {
  const lessonsById = publishedLessonMap(contentIndex);
  const objectivesById = new Map(
    contentIndex.objectives
      .filter((objective) => objective.published && lessonsById.has(objective.lessonId))
      .map((objective) => [objective.objectiveId, objective]),
  );
  const objectiveByActivity = new Map<string, string>();
  for (const objective of objectivesById.values()) {
    for (const activityId of objective.activityIds) objectiveByActivity.set(activityId, objective.objectiveId);
  }

  const evidence = new Map<string, ObjectiveEvidence>();
  for (const objective of objectivesById.values()) {
    evidence.set(objective.objectiveId, { practicedActivityIds: new Set(), independentActivityIds: new Set() });
  }
  const discoveredLessons = new Set<string>();
  let latestSyncedAt = snapshot.updatedAt;
  let latestSyncedTime = eventTime(snapshot.updatedAt);

  const validEvents = events
    .filter((event) => {
      const lesson = lessonsById.get(event.lessonId);
      if (event.studentId !== snapshot.studentId || event.generation !== snapshot.generation || !lesson || event.lessonVersion !== lesson.lessonVersion) return false;
      if (event.type === 'discovery_done' || event.type === 'hint_used') {
        if (event.activityId && !objectiveByActivity.has(event.activityId)) return false;
        return true;
      }
      if (event.type !== 'answer_submitted' || !event.activityId || typeof event.correct !== 'boolean') return false;
      return objectiveByActivity.has(event.activityId);
    })
    .sort(compareEvents);

  for (const event of validEvents) {
    const timestamp = eventTime(event.receivedAt);
    if (timestamp >= latestSyncedTime) {
      latestSyncedTime = timestamp;
      latestSyncedAt = event.receivedAt;
    }
    if (event.type === 'discovery_done') {
      discoveredLessons.add(event.lessonId);
      continue;
    }
    if (event.type === 'hint_used') continue;

    const objectiveId = objectiveByActivity.get(event.activityId!);
    const current = objectiveId ? evidence.get(objectiveId) : undefined;
    if (!current) continue;
    current.practicedActivityIds.add(event.activityId!);
    if (event.correct === true && !event.hintUsed) current.independentActivityIds.add(event.activityId!);
  }

  const completedMissions = new Set(snapshot.progress.completedMissions);
  const lessonData = new Map<string, ProgressBoardLesson>();
  for (const lesson of contentIndex.lessons) {
    if (!lesson.published) continue;
    const objectives = lesson.objectiveIds
      .map((objectiveId) => objectivesById.get(objectiveId))
      .filter((objective): objective is NonNullable<typeof objective> => Boolean(objective))
      .map((contentObjective) => {
        const current = evidence.get(contentObjective.objectiveId)!;
        const practicedActivityCount = current.practicedActivityIds.size;
        const independentActivityCount = current.independentActivityIds.size;
        const state: ProgressState = independentActivityCount >= contentObjective.minIndependentActivities
          ? 'independent'
          : practicedActivityCount > 0
            ? 'practicing'
            : discoveredLessons.has(lesson.lessonId)
              ? 'explored'
              : 'not_started';
        return {
          objectiveId: contentObjective.objectiveId,
          label: contentObjective.label,
          state,
          practicedActivityCount,
          independentActivityCount,
          nextAction: nextAction(state, independentActivityCount),
        };
      });
    const completedMissionCount = lesson.missionIds.filter((missionId) => completedMissions.has(missionId)).length;
    const completed = lesson.missionIds.length > 0 && completedMissionCount === lesson.missionIds.length;
    const state = lessonState(completed, objectives, discoveredLessons.has(lesson.lessonId));
    lessonData.set(lesson.lessonId, {
      lessonId: lesson.lessonId,
      title: lesson.title,
      topic: lesson.topic,
      completed,
      state,
      completedMissionCount,
      missionCount: lesson.missionIds.length,
      objectives,
      nextAction: lessonNextAction(state, completed),
    });
  }

  const topicsByName = new Map<string, ProgressBoardTopic>();
  for (const lesson of contentIndex.lessons) {
    const data = lessonData.get(lesson.lessonId);
    if (!data) continue;
    const topic = topicsByName.get(lesson.topic) ?? { topic: lesson.topic, lessons: [] };
    topic.lessons.push(data);
    topicsByName.set(lesson.topic, topic);
  }
  const topics: ProgressBoardTopic[] = [...topicsByName.values()];
  const lessons = topics.flatMap((topic) => topic.lessons);
  const nextLessonId = lessons.find((lesson) => lesson.state !== 'independent')?.lessonId ?? null;
  const independentObjectiveCount = lessons.flatMap((lesson) => lesson.objectives).filter((objective) => objective.state === 'independent').length;

  return {
    schemaVersion: PROGRESS_BOARD_SCHEMA_VERSION,
    ruleVersion: PROGRESS_BOARD_RULE_VERSION,
    contentVersion: contentIndex.contentVersion,
    generation: String(snapshot.generation),
    generatedAt,
    lastSyncedAt: latestSyncedAt,
    stale: false,
    summary: {
      exploredLessonCount: lessons.filter((lesson) => lesson.state !== 'not_started').length,
      completedLessonCount: lessons.filter((lesson) => lesson.completed).length,
      independentObjectiveCount,
      nextLessonId,
    },
    topics,
    nextLessonId,
  };
}

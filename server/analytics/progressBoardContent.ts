import { CONTENT_VERSION } from '../../shared/learning-contracts.ts';
import {
  PROGRESS_BOARD_RULE_VERSION,
  PROGRESS_BOARD_SCHEMA_VERSION,
  type ProgressBoardContentIndex,
  type ProgressBoardContentLesson,
  type ProgressBoardContentObjective,
} from '../../shared/progress-board-contracts.ts';
import { MVP_LESSONS, TOPICS } from '../../src/content/catalog.ts';
import { MVP_LESSON_PACKAGES } from '../../src/content/packages.ts';

type ValidationResult = { ok: true } | { ok: false; errors: string[] };

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function makeContentLesson(lessonId: string): ProgressBoardContentLesson {
  const summary = MVP_LESSONS.find((lesson) => lesson.id === lessonId);
  const lesson = MVP_LESSON_PACKAGES.find((candidate) => candidate.id === lessonId);
  if (!summary || !lesson) throw new Error('Progress board lesson not found: ' + lessonId);
  return {
    lessonId: lesson.id,
    lessonVersion: lesson.version,
    title: lesson.title,
    topic: summary.topic,
    missionIds: lesson.missions.map((mission) => mission.id),
    objectiveIds: lesson.objectives.map((objective) => objective.id),
    published: summary.status === 'open' && lesson.missions.every((mission) => mission.activities.every((activity) => activity.reviewStatus === 'verified')),
  };
}

function makeContentObjective(lessonId: string, objectiveId: string): ProgressBoardContentObjective {
  const lesson = MVP_LESSON_PACKAGES.find((candidate) => candidate.id === lessonId);
  const objective = lesson?.objectives.find((candidate) => candidate.id === objectiveId);
  if (!lesson || !objective) throw new Error('Progress board objective not found: ' + lessonId + '/' + objectiveId);
  const activities = lesson.missions.flatMap((mission) => mission.activities).filter((activity) => activity.objectiveId === objectiveId);
  const activityIds = activities.map((activity) => activity.id);
  return {
    objectiveId,
    lessonId,
    label: objective.text,
    activityIds,
    minIndependentActivities: activityIds.length <= 1 ? 1 : Math.min(2, activityIds.length),
    published: activities.length > 0 && activities.every((activity) => activity.reviewStatus === 'verified'),
  };
}

export const PROGRESS_BOARD_CONTENT_INDEX: ProgressBoardContentIndex = {
  schemaVersion: PROGRESS_BOARD_SCHEMA_VERSION,
  ruleVersion: PROGRESS_BOARD_RULE_VERSION,
  contentVersion: CONTENT_VERSION,
  generatedAt: '2026-09-17T00:00:00.000Z',
  lessons: MVP_LESSON_PACKAGES.map((lesson) => makeContentLesson(lesson.id)),
  objectives: MVP_LESSON_PACKAGES.flatMap((lesson) => lesson.objectives.map((objective) => makeContentObjective(lesson.id, objective.id))),
};

export function validateProgressBoardContentIndex(index: ProgressBoardContentIndex): ValidationResult {
  const errors: string[] = [];
  if (index.schemaVersion !== PROGRESS_BOARD_SCHEMA_VERSION) errors.push('schemaVersion không hợp lệ');
  if (index.ruleVersion !== PROGRESS_BOARD_RULE_VERSION) errors.push('ruleVersion không hợp lệ');
  if (!index.contentVersion) errors.push('contentVersion bị thiếu');
  if (!index.lessons.length) errors.push('content index không có lesson');
  if (!unique(index.lessons.map((lesson) => lesson.lessonId))) errors.push('lessonId bị trùng');
  if (!unique(index.objectives.map((objective) => objective.objectiveId))) errors.push('objectiveId bị trùng');
  if (!index.lessons.every((lesson) => TOPICS.includes(lesson.topic as (typeof TOPICS)[number]))) errors.push('lesson có topic ngoài catalog');

  const lessonIds = new Set(index.lessons.map((lesson) => lesson.lessonId));
  const objectivesById = new Map(index.objectives.map((objective) => [objective.objectiveId, objective]));
  for (const lesson of index.lessons) {
    if (!unique(lesson.missionIds)) errors.push('missionId bị trùng ở ' + lesson.lessonId);
    if (!unique(lesson.objectiveIds)) errors.push('objectiveId bị trùng trong lesson ' + lesson.lessonId);
    for (const objectiveId of lesson.objectiveIds) {
      const objective = objectivesById.get(objectiveId);
      if (!objective) {
        errors.push('objective không tồn tại: ' + lesson.lessonId + '/' + objectiveId);
        continue;
      }
      if (objective.lessonId !== lesson.lessonId) errors.push('objective thuộc sai lesson: ' + objectiveId);
    }
  }

  const activityOwners = new Map<string, string>();
  for (const objective of index.objectives) {
    if (!lessonIds.has(objective.lessonId)) errors.push('objective trỏ tới lesson không tồn tại: ' + objective.objectiveId);
    if (!objective.label.trim()) errors.push('objective thiếu label: ' + objective.objectiveId);
    if (!unique(objective.activityIds)) errors.push('activityId bị trùng ở ' + objective.objectiveId);
    if (!Number.isInteger(objective.minIndependentActivities) || objective.minIndependentActivities < 1 || objective.minIndependentActivities > objective.activityIds.length) {
      errors.push('minIndependentActivities không hợp lệ: ' + objective.objectiveId);
    }
    for (const activityId of objective.activityIds) {
      const owner = activityOwners.get(activityId);
      if (owner && owner !== objective.objectiveId) errors.push('activity thuộc nhiều objective: ' + activityId);
      activityOwners.set(activityId, objective.objectiveId);
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}

const validation = validateProgressBoardContentIndex(PROGRESS_BOARD_CONTENT_INDEX);
if (!validation.ok) throw new Error('Invalid progress board content index: ' + validation.errors.join('; '));

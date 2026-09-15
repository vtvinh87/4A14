import type { LessonId, Progress } from '../content/types';
import { MVP_LESSON_PACKAGES } from '../content/packages';

export const LESSON_MISSION_IDS: Record<LessonId, string[]> = Object.fromEntries(
  MVP_LESSON_PACKAGES.map((lesson) => [lesson.id, lesson.missions.map((mission) => mission.id)]),
) as Record<LessonId, string[]>;

export const STAMP_IDS: Record<LessonId, string> = Object.fromEntries(
  MVP_LESSON_PACKAGES.map((lesson) => [lesson.id, `stamp-${lesson.id}`]),
) as Record<LessonId, string>;

function lessonForMission(missionId: string): LessonId | null {
  for (const [lessonId, missionIds] of Object.entries(LESSON_MISSION_IDS) as [LessonId, string[]][]) {
    if (missionIds.includes(missionId)) return lessonId;
  }
  return null;
}

export function getLessonRewardState(progress: Progress, lessonId: LessonId) {
  const missionIds = LESSON_MISSION_IDS[lessonId] ?? [];
  return {
    completed: missionIds.filter((id) => progress.completedMissions.includes(id)).length,
    total: missionIds.length,
    stamped: progress.stamps.includes(STAMP_IDS[lessonId]),
  };
}

/** Adds one mission and, once all three are done, one idempotent lesson stamp. */
export function grantReward(progress: Progress, missionId: string): Progress {
  const lessonId = lessonForMission(missionId);
  if (!lessonId || progress.completedMissions.includes(missionId)) return progress;

  const completedMissions = [...progress.completedMissions, missionId];
  const missionIds = LESSON_MISSION_IDS[lessonId];
  const stamps = [...progress.stamps];
  if (missionIds.every((id) => completedMissions.includes(id)) && !stamps.includes(STAMP_IDS[lessonId])) {
    stamps.push(STAMP_IDS[lessonId]);
  }
  return { ...progress, completedMissions, stamps };
}

import type { Lesson, LessonId } from '../content/types.ts';

/**
 * Mission ids that were shipped before the two additional expedition missions
 * were introduced. Keep this list explicit: deriving it from the current
 * package would make a future content change silently rewrite old rewards.
 */
export const LEGACY_MISSION_IDS: Partial<Record<LessonId, readonly string[]>> = {
  'lesson-01': ['b1-m1', 'b1-m2', 'b1-m3'],
  'lesson-07': ['b7-m1', 'b7-m2', 'b7-m3'],
};

/** Return the verified three-mission view of a current lesson, if it matches the old ids. */
export function getVerifiedLegacyLesson(lesson: Lesson): Lesson | null {
  const legacyMissionIds = LEGACY_MISSION_IDS[lesson.id];
  if (!legacyMissionIds || lesson.version !== 1 || lesson.missions.length < legacyMissionIds.length) return null;
  if (legacyMissionIds.some((missionId, index) => lesson.missions[index]?.id !== missionId)) return null;
  return { ...lesson, missions: lesson.missions.slice(0, legacyMissionIds.length) };
}

export function hasLegacyMissionCompletion(completedMissions: readonly string[], lessonId: LessonId): boolean {
  const legacyMissionIds = LEGACY_MISSION_IDS[lessonId];
  return !!legacyMissionIds && legacyMissionIds.every((missionId) => completedMissions.includes(missionId));
}

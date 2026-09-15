import { MVP_LESSON_PACKAGES } from '../content/packages';
import type { LessonId } from '../content/types';

export function getPreviousLesson(lessonId: LessonId) {
  const index = MVP_LESSON_PACKAGES.findIndex(lesson => lesson.id === lessonId);
  return index > 0 ? MVP_LESSON_PACKAGES[index - 1] : null;
}

export function isLessonUnlocked(lessonId: LessonId, completedMissions: readonly string[]): boolean {
  if (lessonId === MVP_LESSON_PACKAGES[0].id) return true;
  const previous = getPreviousLesson(lessonId);
  return !!previous && previous.missions.every(mission => completedMissions.includes(mission.id));
}

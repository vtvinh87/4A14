import { FULL_LESSON_SEEDS } from './courseSeeds.ts';
import type { LessonId } from './types.ts';

export type MvpLessonId = LessonId;

/**
 * Short display names keep the lesson hero scannable while the full, reviewed
 * lesson title remains available to assistive technology and in the catalogue.
 */
export const LESSON_HERO_TITLES: Record<MvpLessonId, string> = {
  'lesson-01': 'Phương tiện học tập',
  'lesson-02': 'Địa phương em',
  'lesson-03': 'Văn hoá địa phương',
  'lesson-04': 'Thiên nhiên vùng núi phía Bắc',
  'lesson-05': 'Người và đất vùng núi',
  'lesson-06': 'Sắc màu vùng cao',
  'lesson-07': 'Đền Hùng và Giỗ Tổ',
  'lesson-08': 'Thiên nhiên Bắc Bộ',
  'lesson-09': 'Mùa vụ và làng nghề',
  'lesson-10': 'Làng quê Bắc Bộ',
  'lesson-11': 'Sông Hồng kể chuyện',
  'lesson-12': 'Thăng Long – Hà Nội',
  'lesson-13': 'Vườn hiền tài',
  'lesson-14': 'Ôn tập Bắc Bộ',
  'lesson-15': 'Dải đất ven biển',
  'lesson-16': 'Biển và sinh kế',
  'lesson-17': 'Di sản ven biển',
  'lesson-18': 'Cố đô Huế',
  'lesson-19': 'Phố cổ Hội An',
  'lesson-20': 'Thiên nhiên Tây Nguyên',
  'lesson-21': 'Cà phê và dòng sông',
  'lesson-22': 'Nhà Rông và anh hùng',
  'lesson-23': 'Nhịp cồng chiêng',
  'lesson-24': 'Miệt vườn sông nước',
  'lesson-25': 'Mùa vụ phương Nam',
  'lesson-26': 'Sắc màu sông nước',
  'lesson-27': 'Thành phố bên sông',
  'lesson-28': 'Mạch hầm lịch sử',
  'lesson-29': 'Bản đồ tổng hợp',
};

export function getLessonHeroTitle(id: MvpLessonId): string {
  return LESSON_HERO_TITLES[id];
}

export type LessonSummary = {
  id: MvpLessonId;
  number: string;
  title: string;
  eyebrow: string;
  topic: string;
  color: 'sun' | 'coral';
  sourceLabel: string;
  missions: number;
  status: 'open';
};

export const MVP_LESSONS: LessonSummary[] = FULL_LESSON_SEEDS.map((seed, index) => ({
  id: seed.id,
  number: `Bài ${String(index + 1).padStart(2, '0')}`,
  title: seed.title,
  eyebrow: seed.eyebrow,
  topic: seed.topic,
  color: index % 2 === 0 ? 'sun' : 'coral',
  sourceLabel: 'SGK Lịch sử và Địa lí 4',
  missions: 5,
  status: 'open',
}));

export const TOPICS = [
  'Địa phương em',
  'Trung du và miền núi phía Bắc',
  'Đồng bằng Bắc Bộ',
  'Duyên hải miền Trung',
  'Tây Nguyên',
  'Nam Bộ',
] as const;

export const PENDING_LESSON_COUNT = 0;

export function getLessonSummary(id: LessonId): LessonSummary {
  const lesson = MVP_LESSONS.find((candidate) => candidate.id === id);
  if (!lesson) throw new Error(`Lesson summary not found: ${id}`);
  return lesson;
}

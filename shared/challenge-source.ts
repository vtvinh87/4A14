import reviewedContent from '../source/mvp-content-reviewed.json' with { type: 'json' };
import { FULL_LESSON_SEEDS } from '../src/content/courseSeeds.ts';

export const CHALLENGE_SOURCE_VERSION = 'challenge-facts-v1' as const;
export const CHALLENGE_REFERENCE_SOURCE_VERSION = 'challenge-lesson-references-v1' as const;
const SOURCE_ID = 'mvp-content-reviewed' as const;
const SOURCE_FILE = 'lich-su-va-dia-li-4.pdf' as const;
const SOURCE_SHA256 = 'f7d8c9a7f7e069fcd9e509561468797c3dbd89b9e62b706291667ae87fc2577d' as const;

export type ChallengeSourceRef = {
  sourceId: string;
  sourceFile: string;
  sourceSha256: string;
  pdfPage: number;
  printedPage: number;
  locator: string;
};

export type ChallengeSourceKind = 'reviewed' | 'lesson-reference';

export type VerifiedChallengeFact = {
  id: string;
  lessonId: 'lesson-01' | 'lesson-07';
  lessonTitle: string;
  canonicalAnswer: string;
  sourceText: string;
  source: ChallengeSourceRef;
  sourceKind: 'reviewed';
  sourceVersion: typeof CHALLENGE_SOURCE_VERSION;
};

export type ChallengeSourceFact = {
  id: string;
  lessonId: string;
  lessonTitle: string;
  canonicalAnswer?: string;
  sourceText: string;
  source: ChallengeSourceRef;
  sourceKind: ChallengeSourceKind;
  sourceVersion: string;
};

type ReviewedFact = {
  id: string;
  pdfPage: number;
  printedPage: number;
  locator: string;
  text: string;
};

type ReviewedLesson = {
  id: 'bai-1' | 'bai-7';
  title: string;
  facts: ReviewedFact[];
};

type ReviewedContent = {
  reviewed: boolean;
  source: string;
  sourceSha256: string;
  lessons: ReviewedLesson[];
};

const content = reviewedContent as ReviewedContent;
if (content.reviewed !== true || content.source !== SOURCE_FILE || content.sourceSha256 !== SOURCE_SHA256) {
  throw new Error('Reviewed challenge source manifest is missing or has changed.');
}

const canonicalAnswers: Record<string, string> = {
  map: 'Bản đồ',
  sketch: 'Chú giải',
  data: 'Biểu đồ',
  table: 'Lâm Đồng',
  artifact: 'Hiện vật lịch sử',
  picture: 'Ảnh cánh đồng Phong Nậm ở Cao Bằng',
  location: 'Phú Thọ',
  festival: 'Mồng 10 tháng Ba âm lịch',
  dragon: 'Vua, hiệu Hùng Vương',
  cakes: 'Bánh chưng hình vuông tượng trưng Đất và bánh giầy hình tròn tượng trưng Trời',
};

const lessonIds: Record<ReviewedLesson['id'], VerifiedChallengeFact['lessonId']> = {
  'bai-1': 'lesson-01',
  'bai-7': 'lesson-07',
};

function toFact(lesson: ReviewedLesson, fact: ReviewedFact): VerifiedChallengeFact {
  const canonicalAnswer = canonicalAnswers[fact.id];
  if (!canonicalAnswer) throw new Error(`Canonical challenge answer missing for ${fact.id}.`);
  return {
    id: fact.id,
    lessonId: lessonIds[lesson.id],
    lessonTitle: lesson.title,
    canonicalAnswer,
    sourceText: fact.text,
    sourceKind: 'reviewed',
    sourceVersion: CHALLENGE_SOURCE_VERSION,
    source: {
      sourceId: SOURCE_ID,
      sourceFile: SOURCE_FILE,
      sourceSha256: SOURCE_SHA256,
      pdfPage: fact.pdfPage,
      printedPage: fact.printedPage,
      locator: fact.locator,
    },
  };
}

export const VERIFIED_CHALLENGE_FACTS: readonly VerifiedChallengeFact[] = content.lessons
  .filter((lesson) => lesson.id === 'bai-1' || lesson.id === 'bai-7')
  .flatMap((lesson) => lesson.facts.map((fact) => toFact(lesson, fact)));

const referenceFacts: readonly ChallengeSourceFact[] = FULL_LESSON_SEEDS
  .filter((lesson) => lesson.id !== 'lesson-01' && lesson.id !== 'lesson-07')
  .flatMap((lesson) => lesson.facts.map((fact) => ({
    id: `${lesson.id}:${fact.id}`,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    sourceText: fact.text,
    sourceKind: 'lesson-reference' as const,
    sourceVersion: CHALLENGE_REFERENCE_SOURCE_VERSION,
    source: {
      sourceId: fact.source.sourceId,
      sourceFile: 'Nội dung tham khảo của bài học',
      sourceSha256: 'reference-only',
      pdfPage: fact.source.pdfPage,
      printedPage: fact.source.printedPage,
      locator: fact.source.locator,
    },
  })));

export const CHALLENGE_SOURCE_FACTS: readonly ChallengeSourceFact[] = [
  ...VERIFIED_CHALLENGE_FACTS,
  ...referenceFacts,
];

const verifiedFactsById = new Map(VERIFIED_CHALLENGE_FACTS.map((fact) => [fact.id, fact]));
const sourceFactsById = new Map(CHALLENGE_SOURCE_FACTS.map((fact) => [fact.id, fact]));

export function findVerifiedChallengeFact(id: string): VerifiedChallengeFact | null {
  return verifiedFactsById.get(id) ?? null;
}

export function findChallengeSourceFact(id: string): ChallengeSourceFact | null {
  return sourceFactsById.get(id) ?? null;
}

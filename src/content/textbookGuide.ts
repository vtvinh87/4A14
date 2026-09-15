import { FULL_LESSON_SEEDS } from './courseSeeds.ts';
import type { SourceRef } from './types.ts';

// Visually checked against printed pages 4–5 (PDF pages 5–6) of the supplied SGK.
// Chapter ranges guide reading; they do not pretend VBT exercise locators are SGK locators.
const CHAPTER_STARTS = [6, 12, 16, 18, 24, 28, 32, 36, 41, 46, 50, 54, 59, 63, 65, 70, 73, 77, 81, 85, 89, 93, 97, 100, 104, 108, 112, 118, 121];

export function formatTextbookReference(reference: SourceRef): string {
  const book = 'SGK Lịch sử và Địa lí 4';
  if (reference.sourceId === 'sgk-lsdl4-sample') return `${book} · trang ${reference.printedPage} · ${reference.locator}`;
  const index = FULL_LESSON_SEEDS.findIndex((seed) => seed.facts.some(({ source }) =>
    source.sourceId === reference.sourceId && source.pdfPage === reference.pdfPage
    && source.printedPage === reference.printedPage && source.locator === reference.locator));
  if (index < 0) return `${book} · mở mục lục và tìm tên bài đang học`;
  const start = CHAPTER_STARTS[index];
  const end = index === 28 ? 121 : CHAPTER_STARTS[index + 1] - 1;
  return `${book} · Bài ${index + 1} · trang ${start === end ? start : `${start}–${end}`} · ${FULL_LESSON_SEEDS[index].title}`;
}

import { describe, expect, it } from 'vitest';
import { FULL_LESSON_SEEDS } from './courseSeeds';
import { formatTextbookReference } from './textbookGuide';

describe('textbook lookup', () => {
  it('maps workbook references to the verified textbook chapter, not workbook page numbers', () => {
    const ref = FULL_LESSON_SEEDS[1].facts[0].source;
    const guide = formatTextbookReference(ref);
    expect(guide).toContain('trang 12–15');
    expect(guide).toContain('Thiên nhiên và con người ở địa phương em');
    expect(guide).not.toContain('Bài tập 1');
    expect(guide).not.toContain('trang 8');
  });
  it('preserves exact locators that actually come from the textbook', () => {
    expect(formatTextbookReference({ sourceId: 'sgk-lsdl4-sample', pdfPage: 10, printedPage: 9, locator: 'Hình 4' })).toBe('SGK Lịch sử và Địa lí 4 · trang 9 · Hình 4');
  });
});

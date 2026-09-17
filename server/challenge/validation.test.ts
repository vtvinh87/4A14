import { describe, expect, it } from 'vitest';
import { CHALLENGE_SOURCE_VERSION, CHALLENGE_SOURCE_FACTS, VERIFIED_CHALLENGE_FACTS, findChallengeSourceFact, findVerifiedChallengeFact } from '../../shared/challenge-source';
import type { CreateChallengeQuestionInput } from '../../shared/challenge-contracts';
import { normalizeChallengeOption, validateCreateChallengeQuestion } from './validation';

const validInput: CreateChallengeQuestionInput = {
  sourceFactId: 'map',
  prompt: 'Phương tiện nào thu nhỏ một khu vực theo tỉ lệ?',
  correctAnswer: 'Bản đồ giúp tìm và đọc thông tin về khu vực.',
  distractors: ['Bảng số liệu', 'Trục thời gian', 'Biểu đồ'],
  explanation: 'Bản đồ thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.',
};

describe('challenge source catalog', () => {
  it('contains exactly the reviewed pilot facts with stable provenance', () => {
    expect(CHALLENGE_SOURCE_VERSION).toBe('challenge-facts-v1');
    expect(VERIFIED_CHALLENGE_FACTS).toHaveLength(10);
    expect(VERIFIED_CHALLENGE_FACTS.map((fact) => fact.id)).toEqual([
      'map', 'sketch', 'data', 'table', 'artifact', 'picture', 'location', 'festival', 'dragon', 'cakes',
    ]);
    for (const fact of VERIFIED_CHALLENGE_FACTS) {
      expect(fact.source.sourceId).toBe('mvp-content-reviewed');
      expect(fact.source.sourceFile).toBe('lich-su-va-dia-li-4.pdf');
      expect(fact.source.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fact.source.pdfPage).toBeGreaterThan(0);
      expect(fact.source.printedPage).toBeGreaterThan(0);
      expect(fact.source.locator.length).toBeGreaterThan(0);
      expect(fact.canonicalAnswer.length).toBeGreaterThan(0);
      expect(findVerifiedChallengeFact(fact.id)).toEqual(fact);
    }
    expect(findVerifiedChallengeFact('not-a-reviewed-fact')).toBeNull();
  });

  it('offers every lesson knowledge area while keeping reviewed facts distinguishable', () => {
    expect(new Set(CHALLENGE_SOURCE_FACTS.map((fact) => fact.lessonId)).size).toBe(29);
    expect(CHALLENGE_SOURCE_FACTS.some((fact) => fact.sourceKind === 'lesson-reference')).toBe(true);
    expect(CHALLENGE_SOURCE_FACTS.filter((fact) => fact.sourceKind === 'reviewed')).toHaveLength(10);
    const reference = CHALLENGE_SOURCE_FACTS.find((fact) => fact.id === 'lesson-02:location');
    expect(reference).toEqual(expect.objectContaining({ lessonId: 'lesson-02', sourceKind: 'lesson-reference' }));
    expect(findChallengeSourceFact('lesson-02:location')).toEqual(reference);
  });
});

describe('challenge question validation', () => {
  it('accepts a source-anchored question with a student-authored answer and three distinct distractors', () => {
    expect(validateCreateChallengeQuestion(validInput, VERIFIED_CHALLENGE_FACTS)).toEqual({ ok: true });
  });

  it('enforces the approved prompt, option and explanation lengths', () => {
    expect(validateCreateChallengeQuestion({ ...validInput, prompt: 'ngắn' }, VERIFIED_CHALLENGE_FACTS)).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
    expect(validateCreateChallengeQuestion({ ...validInput, prompt: 'x'.repeat(241) }, VERIFIED_CHALLENGE_FACTS)).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
    expect(validateCreateChallengeQuestion({ ...validInput, distractors: ['x'.repeat(141), 'Bảng số liệu', 'Biểu đồ'] }, VERIFIED_CHALLENGE_FACTS)).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
    expect(validateCreateChallengeQuestion({ ...validInput, explanation: 'ngắn' }, VERIFIED_CHALLENGE_FACTS)).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
  });

  it('rejects duplicate options after whitespace and case normalization', () => {
    expect(normalizeChallengeOption('  BẢNG   Số liệu ')).toBe('bảng số liệu');
    expect(validateCreateChallengeQuestion({ ...validInput, distractors: ['Bảng số liệu', ' bảng   số liệu ', 'Biểu đồ'] }, VERIFIED_CHALLENGE_FACTS)).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
  });

  it('rejects a missing or duplicate student-authored correct answer', () => {
    expect(validateCreateChallengeQuestion({ ...validInput, correctAnswer: '' }, VERIFIED_CHALLENGE_FACTS)).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
    expect(validateCreateChallengeQuestion({ ...validInput, correctAnswer: ' BẢNG   SỐ LIỆU ' }, VERIFIED_CHALLENGE_FACTS)).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
  });

  it('rejects unknown sources and client supplied answer overrides', () => {
    expect(validateCreateChallengeQuestion({ ...validInput, sourceFactId: 'not-allowed' }, VERIFIED_CHALLENGE_FACTS)).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
    const forged = { ...validInput, correctOptionId: 'student-chosen-answer' } as CreateChallengeQuestionInput & { correctOptionId: string };
    expect(validateCreateChallengeQuestion(forged, VERIFIED_CHALLENGE_FACTS)).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
  });

  it('rejects markup, links, contact details and another student name', () => {
    for (const value of ['<script>alert(1)</script>', 'https://example.com', 'email@example.com', '0901234567']) {
      expect(validateCreateChallengeQuestion({ ...validInput, prompt: `Hãy tìm ${value} trong tư liệu lịch sử nhé` }, VERIFIED_CHALLENGE_FACTS)).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
    }
    expect(validateCreateChallengeQuestion({ ...validInput, prompt: 'Cao Ngọc Đức đã làm điều gì trong câu hỏi này?' }, VERIFIED_CHALLENGE_FACTS, { forbiddenDisplayNames: ['Cao Ngọc Đức'] })).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
  });
});

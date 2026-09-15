import { describe, expect, it } from 'vitest';
import { FULL_LESSON_SEEDS } from './courseSeeds';
import { getExpeditionDecision, type ExpeditionDecision } from './expeditionDecisions';

const GENERIC_SEEDS = FULL_LESSON_SEEDS.filter((seed) => seed.id !== 'lesson-01' && seed.id !== 'lesson-07');

function sourceQuiz(seedId: string, missionNumber: 4 | 5) {
  const seed = FULL_LESSON_SEEDS.find((candidate) => candidate.id === seedId);
  if (!seed) throw new Error(`missing seed ${seedId}`);
  return seed.quizzes[missionNumber === 4 ? 2 : 1];
}

function expectStableChoiceContract(seedId: string, missionNumber: 4 | 5, decision: ExpeditionDecision) {
  const source = sourceQuiz(seedId, missionNumber);
  expect(decision.options.map((option) => option.id)).toEqual(source.options.map((option) => option.id));
  expect(decision.correctId).toBe(source.correctId);
  expect(decision.factIds).toEqual(source.factIds);
  expect(decision.explanation).toBe(`Theo tư liệu của bài, đáp án đúng là “${source.options.find((option) => option.id === source.correctId)?.text ?? source.correctId}”.`);
}

describe('generated expedition decisions', () => {
  it('provides distinct m4 evidence applications and m5 clue questions for all 27 generic lessons', () => {
    expect(GENERIC_SEEDS).toHaveLength(27);

    for (const seed of GENERIC_SEEDS) {
      const m4 = getExpeditionDecision(seed, 4);
      const m5 = getExpeditionDecision(seed, 5);
      const sourceM4 = sourceQuiz(seed.id, 4);
      const sourceM5 = sourceQuiz(seed.id, 5);

      expectStableChoiceContract(seed.id, 4, m4);
      expectStableChoiceContract(seed.id, 5, m5);
      expect(m4.prompt).not.toBe(sourceM4.prompt);
      expect(m5.prompt).not.toBe(sourceM5.prompt);
      expect(m4.prompt).not.toBe(m5.prompt);
      expect(m4.options.map((option) => option.text)).not.toEqual(sourceM4.options.map((option) => option.text));
      expect(m5.options.map((option) => option.text)).not.toEqual(sourceM5.options.map((option) => option.text));
      expect(new Set(m4.options.map((option) => option.text)).size).toBe(m4.options.length);
      expect(new Set(m5.options.map((option) => option.text)).size).toBe(m5.options.length);
      expect(m4.options.every((option) => option.text.trim().length > 12)).toBe(true);
      expect(m5.options.every((option) => option.text.trim().endsWith('?'))).toBe(true);
      expect(JSON.stringify({ prompt: m4.prompt, options: m4.options })).not.toContain('Manh mối của chặng khác');
      expect(JSON.stringify({ prompt: m5.prompt, options: m5.options })).not.toContain('Manh mối của chặng khác');
    }
  });

  it('does not alter non-target missions and keeps the original choice explanation', () => {
    const seed = FULL_LESSON_SEEDS.find((candidate) => candidate.id === 'lesson-12');
    if (!seed) throw new Error('lesson-12 seed missing');
    const unchanged = getExpeditionDecision(seed, 2);

    expect(unchanged.prompt).toBe(seed.quizzes[1].prompt);
    expect(unchanged.options).toEqual(seed.quizzes[1].options);
    expect(unchanged.correctId).toBe(seed.quizzes[1].correctId);
    expect(unchanged.explanation).toBe(`Theo tư liệu của bài, đáp án đúng là “${seed.quizzes[1].options[0].text}”.`);
  });

  it('rejects a missing generic lesson recipe instead of silently producing filler', () => {
    const seed = FULL_LESSON_SEEDS.find((candidate) => candidate.id === 'lesson-01');
    if (!seed) throw new Error('lesson-01 seed missing');
    expect(() => getExpeditionDecision(seed, 4)).toThrow('Expedition decision not found');
  });
});

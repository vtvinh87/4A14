import { describe, expect, it } from 'vitest';
import { buildRecognitions, type RecognitionSummary } from './recognition';

describe('positive challenge recognitions', () => {
  it('allows multiple students to receive independent recognitions', () => {
    const summary: RecognitionSummary = {
      questionCreators: ['student-a', 'student-b'],
      kindHelpers: ['student-b', 'student-c'],
      steadyLearners: ['student-a'],
      classBuilders: ['student-a', 'student-b', 'student-c'],
    };
    expect(buildRecognitions(summary)).toEqual([
      { type: 'question_creator', recipientIds: ['student-a', 'student-b'] },
      { type: 'kind_helper', recipientIds: ['student-b', 'student-c'] },
      { type: 'steady_learner', recipientIds: ['student-a'] },
      { type: 'class_builder', recipientIds: ['student-a', 'student-b', 'student-c'] },
    ]);
  });

  it('does not emit an empty or ranked recognition', () => {
    const empty: RecognitionSummary = { questionCreators: [], kindHelpers: [], steadyLearners: [], classBuilders: [] };
    expect(buildRecognitions(empty)).toEqual([]);
    expect(JSON.stringify(buildRecognitions(empty))).not.toMatch(/rank|position|score|fastest/i);
  });
});

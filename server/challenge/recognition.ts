import type { ChallengeRecognition } from '../../shared/challenge-contracts.ts';

export type RecognitionSummary = {
  questionCreators: readonly string[];
  kindHelpers: readonly string[];
  steadyLearners: readonly string[];
  classBuilders: readonly string[];
};

export function buildRecognitions(summary: RecognitionSummary): readonly ChallengeRecognition[] {
  const entries: { type: ChallengeRecognition['type']; recipientIds: readonly string[] }[] = [
    { type: 'question_creator', recipientIds: summary.questionCreators },
    { type: 'kind_helper', recipientIds: summary.kindHelpers },
    { type: 'steady_learner', recipientIds: summary.steadyLearners },
    { type: 'class_builder', recipientIds: summary.classBuilders },
  ];
  return entries
    .filter((entry) => entry.recipientIds.length > 0)
    .map((entry) => ({ type: entry.type, recipientIds: [...new Set(entry.recipientIds)] }));
}

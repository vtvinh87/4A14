import type {
  ChallengeQuestionRecord,
  ChallengeRecognition,
  ChallengeWeeklyDay,
  ChallengeWeeklyResponse,
  ServiceResult,
} from '../../shared/challenge-contracts.ts';
import { buildRecognitions } from './recognition.ts';
import { challengeWeekBounds } from './roundRules.ts';
import type { AuthoringRepository } from './authoringTypes.ts';
import type { ChallengeAttemptRecord, ChallengeRoundRecord, ChallengeRoundItemRecord, ChallengeReactionRecord, PlayRepository } from './playTypes.ts';

function addDays(value: string, amount: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function activeOnly(ids: Iterable<string>, activeIds: Set<string>): string[] {
  return [...new Set(ids)].filter((id) => activeIds.has(id)).sort();
}

function questionIsCountable(question: ChallengeQuestionRecord): boolean {
  return !['draft', 'pending_parent_review', 'withdrawn', 'voided', 'archived'].includes(question.status);
}

function questionCreatorIds(questions: readonly ChallengeQuestionRecord[], activeIds: Set<string>): string[] {
  return activeOnly(questions.filter(questionIsCountable).map((question) => question.authorId), activeIds);
}

function kindHelperIds(reactions: readonly ChallengeReactionRecord[], activeIds: Set<string>): string[] {
  const counts = new Map<string, number>();
  for (const reaction of reactions) counts.set(reaction.actorId, (counts.get(reaction.actorId) ?? 0) + 1);
  return activeOnly([...counts.entries()].filter(([, count]) => count >= 2).map(([id]) => id), activeIds);
}

function steadyLearnerIds(attempts: readonly ChallengeAttemptRecord[], activeIds: Set<string>): string[] {
  const days = new Map<string, Set<string>>();
  for (const attempt of attempts) {
    if (attempt.isVoided) continue;
    const dates = days.get(attempt.studentId) ?? new Set<string>();
    dates.add(attempt.roundDate);
    days.set(attempt.studentId, dates);
  }
  return activeOnly([...days.entries()].filter(([, dates]) => dates.size >= 2).map(([id]) => id), activeIds);
}

function classBuilderIds(attempts: readonly ChallengeAttemptRecord[], activeIds: Set<string>): string[] {
  const contributions = new Map<string, number>();
  for (const attempt of attempts) {
    if (attempt.isVoided || attempt.isPractice || !attempt.isCorrect) continue;
    contributions.set(attempt.studentId, (contributions.get(attempt.studentId) ?? 0) + 1);
  }
  return activeOnly([...contributions.entries()].filter(([, count]) => count >= 2).map(([id]) => id), activeIds);
}

function recognitionSummary(
  questions: readonly ChallengeQuestionRecord[],
  reactions: readonly ChallengeReactionRecord[],
  attempts: readonly ChallengeAttemptRecord[],
  activeIds: Set<string>,
): ChallengeRecognition[] {
  return [...buildRecognitions({
    questionCreators: questionCreatorIds(questions, activeIds),
    kindHelpers: kindHelperIds(reactions, activeIds),
    steadyLearners: steadyLearnerIds(attempts, activeIds),
    classBuilders: classBuilderIds(attempts, activeIds),
  })];
}

export function createChallengeWeeklyService(deps: {
  play: PlayRepository;
  authoring: AuthoringRepository;
  now: () => Date;
  activeStudentIds?: () => Promise<readonly string[]>;
}) {
  async function getWeekly(studentId: string, now = deps.now()): Promise<ServiceResult<ChallengeWeeklyResponse>> {
    const { start, end } = challengeWeekBounds(now);
    const rounds = await deps.play.listRoundsBetween(start, end);
    const roundsByDate = new Map(rounds.map((round) => [round.roundDate, round]));
    const [allItems, contributionByDate] = await Promise.all([
      deps.play.listRoundItemsBetween(start, end),
      deps.play.countCorrectContributionsBetween(start, end),
    ]);
    const itemsByDate = new Map<string, ChallengeRoundItemRecord[]>();
    for (const item of allItems) {
      const items = itemsByDate.get(item.roundDate) ?? [];
      items.push(item);
      itemsByDate.set(item.roundDate, items);
    }
    const days: ChallengeWeeklyDay[] = [];
    let current = 0;
    let target = 0;
    let completedDays = 0;

    for (let offset = 0; offset < 7; offset += 1) {
      const date = addDays(start, offset);
      const round = roundsByDate.get(date);
      const items = round ? (itemsByDate.get(date) ?? []) : [];
      const contribution = round ? Number(contributionByDate.get(date) ?? 0) : 0;
      const completed = Boolean(round && (round.completed || round.rewardGranted));
      days.push({
        date,
        current: contribution,
        target: round?.targetContributions ?? 0,
        completed,
        rewardGranted: Boolean(round?.rewardGranted),
        questionCount: items.length,
      });
      current += contribution;
      target += round?.targetContributions ?? 0;
      if (completed) completedDays += 1;
    }

    const [questions, attempts, reactions, roster, itemQuestions] = await Promise.all([
      deps.authoring.listQuestionsBetween(start, end),
      deps.play.listAttemptsBetween(start, end),
      deps.play.listReactionsBetween(start, end),
      deps.activeStudentIds?.() ?? Promise.resolve([] as readonly string[]),
      deps.authoring.findQuestionsByIds(allItems.map((item) => item.questionId)),
    ]);
    const itemQuestionsById = new Map(itemQuestions.map((question) => [question.id, question]));
    const discoveredIds = new Set<string>([
      ...questions.map((question) => question.authorId),
      ...attempts.map((attempt) => attempt.studentId),
      ...reactions.map((reaction) => reaction.actorId),
    ]);
    const activeIds = roster.length > 0 ? new Set(roster) : discoveredIds;

    const topicCounts = new Map<string, { lessonId: string; title: string; questionCount: number }>();
    for (const item of allItems) {
      const question = itemQuestionsById.get(item.questionId);
      if (!question || question.authorId !== item.authorId || !questionIsCountable(question)) continue;
      const currentTopic = topicCounts.get(question.lessonId) ?? { lessonId: question.lessonId, title: question.lessonTitle, questionCount: 0 };
      currentTopic.questionCount += 1;
      topicCounts.set(question.lessonId, currentTopic);
    }

    const studentAttempts = attempts.filter((attempt) => attempt.studentId === studentId && !attempt.isVoided);
    const mineQuestions = await deps.authoring.listMine(studentId, 50);
    const mineQuestionsInWeek = mineQuestions.filter((question) => question.createdLocalDate >= start && question.createdLocalDate <= end);
    return {
      ok: true,
      weekStart: start,
      weekEnd: end,
      days,
      classProgress: { current, target, completedDays },
      topics: [...topicCounts.values()].sort((left, right) => left.lessonId.localeCompare(right.lessonId)),
      recognitions: recognitionSummary(questions, reactions, attempts, activeIds),
      mySummary: {
        questionsCreated: mineQuestionsInWeek.length,
        correctAnswers: studentAttempts.filter((attempt) => attempt.isCorrect && !attempt.isPractice).length,
        revisits: studentAttempts.filter((attempt) => attempt.isPractice).length,
      },
    };
  }

  return { getWeekly };
}

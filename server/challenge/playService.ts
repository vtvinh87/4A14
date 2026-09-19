import type {
  ChallengeAnswerResult,
  ChallengeFailure,
  ChallengeQuestionView,
  ChallengeTodayResponse,
  SubmitChallengeAttemptInput,
} from '../../shared/challenge-contracts.ts';
import { CHALLENGE_ROUND_QUESTION_LIMIT } from '../../shared/challenge-contracts.ts';
import { challengeTarget, localChallengeDate, selectDailyQuestions } from './roundRules.ts';
import type { TimingStage, RequestTiming } from '../performance/timing.ts';
import type { AuthoringRepository } from './authoringTypes.ts';
import type { ChallengeReadRepository, ChallengeTodayReadSnapshot } from './readRepository.ts';
import type {
  ChallengeAttemptRecord,
  ChallengeRoundRecord,
  ChallengeRoundItemRecord,
  CreateRoundInput,
  PlayRepository,
} from './playTypes.ts';

const CHALLENGE_EVENT_SOURCE = 'challenge-play';
const CHALLENGE_EVENT_SOURCE_VERSION = 'challenge-play-v1';
type ChallengeReadTiming = Pick<RequestTiming, 'measureStage'>;

function measureStage<T>(timing: ChallengeReadTiming | undefined, stage: TimingStage, work: () => Promise<T> | T): Promise<T> {
  return timing ? timing.measureStage(stage, work) : Promise.resolve(work());
}

function failure(code: ChallengeFailure['code'], message: string, reason?: ChallengeFailure['reason']): ChallengeFailure {
  return { ok: false, code, message, ...(reason ? { reason } : {}) };
}

function closesAtForLocalDate(roundDate: string): string {
  return new Date(`${roundDate}T23:59:59.999+07:00`).toISOString();
}

function answerResult(
  attempt: ChallengeAttemptRecord,
  question: Awaited<ReturnType<AuthoringRepository['findForAuthor']>>,
  duplicate: boolean,
  practiceOnly = attempt.isPractice,
): ChallengeAnswerResult {
  if (!question) throw new Error('question_not_found');
  return {
    questionId: question.id,
    selectedOptionId: attempt.selectedOptionId,
    correct: attempt.isCorrect,
    correctOptionId: question.correctOptionId,
    explanation: question.explanation,
    sourceLabel: `${question.lessonTitle} · Nguồn ${question.sourceFactId}`,
    classContributionAdded: attempt.contribution === 1 && !duplicate,
    duplicate,
    ...(practiceOnly ? { practiceOnly: true } : {}),
    ...(attempt.isVoided ? { voided: true } : {}),
  };
}

function publicQuestion(
  question: NonNullable<Awaited<ReturnType<AuthoringRepository['findForAuthor']>>>,
  item: Awaited<ReturnType<PlayRepository['findRoundItem']>>,
  round: ChallengeRoundRecord,
  author: NonNullable<Awaited<ReturnType<AuthoringRepository['getAuthorView']>>>,
  answeredByMe: boolean,
  practiceOnly: boolean,
): ChallengeQuestionView {
  if (!item) throw new Error('round_item_not_found');
  return {
    id: question.id,
    roundItemId: item.id,
    lessonId: question.lessonId,
    lessonTitle: question.lessonTitle,
    author,
    prompt: question.prompt,
    options: question.options,
    sourceLabel: `${question.lessonTitle} · Nguồn ${question.sourceFactId}`,
    closesAt: round.closesAt,
    answeredByMe,
    practiceOnly,
  };
}

export function createChallengePlayService(deps: {
  authoring: AuthoringRepository;
  play: PlayRepository;
  clock: () => Date;
  activeStudentCount: () => Promise<number>;
  idFactory: () => string;
  read?: ChallengeReadRepository;
}): {
  getToday(studentId: string, timing?: ChallengeReadTiming): Promise<import('../../shared/challenge-contracts.ts').ServiceResult<ChallengeTodayResponse>>;
  submitAttempt(studentId: string, itemId: string, input: SubmitChallengeAttemptInput): Promise<import('../../shared/challenge-contracts.ts').ServiceResult<ChallengeAnswerResult>>;
} {
  const closePreviousRounds = async (roundDate: string): Promise<void> => {
    const previousRounds = await deps.play.listOpenRoundsBefore(roundDate);
    for (const previousRound of previousRounds) {
      const items = await deps.play.listRoundItems(previousRound.roundDate);
      await deps.play.closeRound(previousRound.roundDate, deps.clock().toISOString());
      for (const item of items) {
        const question = await deps.authoring.findForAuthor(item.authorId, item.questionId);
        if (question?.status === 'featured') await deps.authoring.markQuestionClosed(question.id, deps.clock().toISOString());
      }
    }
  };

  const createOrLoadRound = async (
    roundDate: string,
    timing?: ChallengeReadTiming,
    initialSnapshot?: ChallengeTodayReadSnapshot | null,
  ): Promise<{ round: ChallengeRoundRecord; items: readonly ChallengeRoundItemRecord[]; changed: boolean }> => {
    return measureStage(timing, 'challenge_prepare', async () => {
      let round = initialSnapshot?.round ?? await deps.play.getRound(roundDate);
      if (!round) {
        const target = challengeTarget(await deps.activeStudentCount());
        const input: CreateRoundInput = {
          roundDate,
          timezone: 'Asia/Ho_Chi_Minh',
          status: 'empty',
          targetContributions: target,
          closesAt: closesAtForLocalDate(roundDate),
          selectionSeedVersion: 'challenge-round-v1',
        };
        round = await deps.play.insertRoundIfAbsent(input);
      }

      let items = initialSnapshot ? [...initialSnapshot.items] : await measureStage(timing, 'challenge_items', () => deps.play.listRoundItems(roundDate));
      let changed = false;
      if (round.status !== 'closed' && items.length < CHALLENGE_ROUND_QUESTION_LIMIT) {
        const existingQuestionIds = new Set(items.map((item) => item.questionId));
        const existingAuthors = new Set(items.map((item) => item.authorId));
        const candidates = (await deps.authoring.listApprovedCandidates(roundDate))
          .filter((candidate) => !existingQuestionIds.has(candidate.questionId) && !existingAuthors.has(candidate.authorId));
        const available: typeof candidates = [];
        for (const candidate of candidates) {
          if (!(await deps.play.hasOpenReportForQuestion(candidate.questionId))) available.push(candidate);
        }
        const selected = selectDailyQuestions(available, roundDate, CHALLENGE_ROUND_QUESTION_LIMIT - items.length);
        for (const candidate of selected) {
          const question = await deps.authoring.findForAuthor(candidate.authorId, candidate.questionId);
          const author = await deps.authoring.getAuthorView(candidate.authorId);
          if (!question || question.status !== 'approved' || !author) continue;
          const featuredAt = deps.clock().toISOString();
          const inserted = await deps.play.insertRoundItem({
            roundDate,
            questionId: question.id,
            authorId: question.authorId,
            position: items.length + 1,
            featuredAt,
            selectionSeedVersion: round.selectionSeedVersion,
            selectionMetadata: {
              source: 'approved-rotation',
              recentFeatureAvoidance: !candidate.recentRoundDates.includes(roundDate),
            },
          });
          if (inserted) {
            await deps.authoring.markQuestionFeatured(question.id, featuredAt);
            items = [...items, inserted];
            changed = true;
          }
        }
      }
      return { round: changed ? ((await deps.play.getRound(roundDate)) ?? round) : round, items, changed };
    });
  };

  const todayResponse = async (
    studentId: string,
    roundDate: string,
    round: ChallengeRoundRecord,
    items: readonly ChallengeRoundItemRecord[],
    timing?: ChallengeReadTiming,
    snapshot?: ChallengeTodayReadSnapshot,
  ): Promise<ChallengeTodayResponse> => {
    const attempts = snapshot?.attempts ?? await measureStage(timing, 'challenge_attempts', () => deps.play.listAttemptsForStudent(studentId, roundDate, roundDate));
    const attemptsByItem = new Map(attempts.map((attempt) => [attempt.roundItemId, attempt]));
    const [questionRecords, authors] = snapshot
      ? [snapshot.questions, snapshot.authors] as const
      : await Promise.all([
        measureStage(timing, 'challenge_questions', () => deps.authoring.findQuestionsByIds(items.map((item) => item.questionId))),
        measureStage(timing, 'challenge_authors', () => deps.authoring.getAuthorViewsByIds(items.map((item) => item.authorId))),
      ]);
    const questionsById = new Map(questionRecords.map((question) => [question.id, question]));
    const authorsById = new Map(authors.map((author) => [author.id, author]));
    const questions: ChallengeQuestionView[] = [];
    for (const item of items) {
      const question = questionsById.get(item.questionId);
      const author = authorsById.get(item.authorId);
      if (!question || question.authorId !== item.authorId || !author || question.status === 'withdrawn' || question.status === 'voided') continue;
      const attempt = attemptsByItem.get(item.id);
      questions.push(publicQuestion(question, item, round, author, Boolean(attempt), Boolean(attempt?.isPractice)));
    }
    const current = snapshot?.currentContributions ?? await measureStage(timing, 'challenge_contributions', () => deps.play.countCorrectContributions(roundDate));
    const created = snapshot?.mine ?? await measureStage(timing, 'challenge_mine', () => deps.authoring.listMine(studentId, 50));
    return {
      roundDate,
      roundStatus: questions.length === 0 ? 'empty' : round.status,
      questions,
      classProgress: { current, target: round.targetContributions, completed: current >= round.targetContributions || round.rewardGranted },
      myContribution: {
        correctAnswers: attempts.filter((attempt) => attempt.isCorrect && !attempt.isVoided).length,
        questionsCreated: created.filter((question) => question.createdLocalDate === roundDate).length,
        questionsRevisited: attempts.filter((attempt) => attempt.isPractice).length,
      },
    };
  };

  const getToday = async (studentId: string, timing?: ChallengeReadTiming) => {
    const preferences = await measureStage(timing, 'challenge_preferences', () => deps.authoring.getPreferences(studentId));
    if (!preferences.canParticipate) return failure('locked', 'Thách đố đang được tạm dừng cho tài khoản này.', 'rollout_disabled');
    const roundDate = localChallengeDate(deps.clock());
    await closePreviousRounds(roundDate);
    const initialSnapshot = deps.read
      ? await measureStage(timing, 'challenge_snapshot', () => deps.read!.loadToday(studentId, roundDate))
      : null;
    if (initialSnapshot?.round && (initialSnapshot.round.status === 'closed' || initialSnapshot.items.length >= CHALLENGE_ROUND_QUESTION_LIMIT)) {
      return { ok: true as const, ...(await todayResponse(studentId, roundDate, initialSnapshot.round, initialSnapshot.items, timing, initialSnapshot)) };
    }
    const prepared = await createOrLoadRound(roundDate, timing, initialSnapshot);
    if (initialSnapshot && !prepared.changed) {
      const snapshot = { ...initialSnapshot, round: prepared.round, items: prepared.items };
      return { ok: true as const, ...(await todayResponse(studentId, roundDate, prepared.round, prepared.items, timing, snapshot)) };
    }
    if (deps.read) {
      const snapshot = await measureStage(timing, 'challenge_snapshot', () => deps.read!.loadToday(studentId, roundDate));
      if (snapshot.round) {
        return { ok: true as const, ...(await todayResponse(studentId, roundDate, snapshot.round, snapshot.items, timing, snapshot)) };
      }
    }
    return { ok: true as const, ...(await todayResponse(studentId, roundDate, prepared.round, prepared.items, timing)) };
  };

  const submitAttempt = async (studentId: string, itemId: string, input: SubmitChallengeAttemptInput) => {
    const preferences = await deps.authoring.getPreferences(studentId);
    if (!preferences.canParticipate) return failure('locked', 'Thách đố đang được tạm dừng cho tài khoản này.', 'rollout_disabled');
    const idempotencyKey = typeof input.idempotencyKey === 'string' && input.idempotencyKey.trim()
      ? input.idempotencyKey.trim()
      : typeof input.attemptId === 'string' && input.attemptId.trim()
        ? input.attemptId.trim()
        : null;
    if (!idempotencyKey) return failure('invalid', 'Mã thử sức không hợp lệ.');
    const item = await deps.play.findRoundItem(itemId);
    if (!item) return failure('not-found', 'Không tìm thấy câu hỏi trong vòng hôm nay.', 'not_available');
    const round = await deps.play.getRound(item.roundDate);
    const currentDate = localChallengeDate(deps.clock());
    if (!round || round.status === 'closed' || item.closedAt || item.roundDate !== currentDate) return failure('expired', 'Vòng Thách đố này đã khép lại.', 'round_closed');
    if (studentId === item.authorId) return failure('forbidden', 'Con hãy để các bạn trong lớp cùng thử sức với câu hỏi của mình nhé.', 'self_question');

    const question = await deps.authoring.findForAuthor(item.authorId, item.questionId);
    if (!question || question.status === 'withdrawn' || question.status === 'voided') return failure('not-found', 'Câu hỏi này hiện không còn mở.', 'not_available');
    if (!question.options.some((option) => option.id === input.selectedOptionId)) return failure('invalid', 'Hãy chọn một trong bốn phương án.');

    const previousByKey = await deps.play.findAttemptByIdempotency(studentId, idempotencyKey);
    if (previousByKey) {
      if (previousByKey.roundItemId !== itemId) return failure('conflict', 'Mã thử sức này đã được dùng cho câu hỏi khác.', 'already_attempted');
      return { ok: true as const, ...answerResult(previousByKey, question, true) };
    }
    const previous = await deps.play.findAttempt(itemId, studentId);
    if (previous) {
      if (input.isPractice) return { ok: true as const, ...answerResult(previous, question, true, true) };
      return failure('conflict', 'Câu hỏi này đã được ghi nhận cho con rồi.', 'already_attempted');
    }

    const answeredAt = deps.clock().toISOString();
    const inserted = await deps.play.insertAttempt({
      id: deps.idFactory(),
      roundItemId: itemId,
      studentId,
      idempotencyKey,
      selectedOptionId: input.selectedOptionId,
      isCorrect: input.selectedOptionId === question.correctOptionId,
      isPractice: Boolean(input.isPractice),
      isVoided: false,
      contribution: 0,
      answeredAt,
    });
    if (inserted === 'duplicate') {
      const existing = await deps.play.findAttemptByIdempotency(studentId, idempotencyKey) ?? await deps.play.findAttempt(itemId, studentId);
      if (!existing) return failure('conflict', 'Lượt thử sức đã được ghi nhận nhưng chưa đọc lại được.', 'already_attempted');
      return { ok: true as const, ...answerResult(existing, question, true) };
    }

    await deps.play.appendEvent({
      eventId: deps.idFactory(),
      studentId,
      eventType: inserted.isPractice ? 'challenge.practice_completed' : 'challenge.attempt_recorded',
      payload: { questionId: question.id, sourceFactId: question.sourceFactId, questionRevision: question.revision, roundDate: item.roundDate },
      occurredAt: answeredAt,
      localDate: item.roundDate,
      source: CHALLENGE_EVENT_SOURCE,
      sourceVersion: CHALLENGE_EVENT_SOURCE_VERSION,
    });
    const current = await deps.play.countCorrectContributions(item.roundDate);
    if (current >= round.targetContributions && !round.rewardGranted) await deps.play.grantRoundReward(item.roundDate);
    return { ok: true as const, ...answerResult(inserted, question, false) };
  };

  return { getToday, submitAttempt };
}

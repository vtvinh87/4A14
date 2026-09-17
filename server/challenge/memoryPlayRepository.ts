import { randomUUID } from 'node:crypto';
import { classContribution } from './roundRules.ts';
import type {
  AppendChallengeEventInput,
  ChallengeAttemptRecord,
  ChallengeEventRecord,
  ChallengeReactionRecord,
  ChallengeReportPrivateRecord,
  ChallengeRoundItemRecord,
  ChallengeRoundRecord,
  CreateChallengeReportInput,
  CreateRoundInput,
  CreateRoundItemInput,
  InsertAttemptInput,
  PlayRepository,
  PlayRepositoryOptions,
  UpsertReactionInput,
} from './playTypes.ts';

function clone<T>(value: T): T {
  return structuredClone(value);
}

function reactionKey(roundItemId: string, actorId: string, reactionType: string): string {
  return `${roundItemId}\u0000${actorId}\u0000${reactionType}`;
}

function reportIdentityKey(roundItemId: string, reporterId: string, reason: string): string {
  return `${roundItemId}\u0000${reporterId}\u0000${reason}`;
}

export class MemoryPlayRepository implements PlayRepository {
  readonly rounds = new Map<string, ChallengeRoundRecord>();
  readonly items = new Map<string, ChallengeRoundItemRecord>();
  readonly attempts = new Map<string, ChallengeAttemptRecord>();
  readonly reactions = new Map<string, ChallengeReactionRecord>();
  readonly reports = new Map<string, ChallengeReportPrivateRecord>();
  readonly events = new Map<string, ChallengeEventRecord>();

  private readonly now: () => Date;
  private readonly idFactory: () => string;

  constructor(options: PlayRepositoryOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
    for (const value of options.rounds ?? []) this.rounds.set(value.roundDate, clone(value));
    for (const value of options.items ?? []) this.items.set(value.id, clone(value));
    for (const value of options.attempts ?? []) this.attempts.set(value.id, clone(value));
    for (const value of options.reactions ?? []) this.reactions.set(reactionKey(value.roundItemId, value.actorId, value.reactionType), clone(value));
    for (const value of options.reports ?? []) this.reports.set(value.id, clone(value));
    for (const value of options.events ?? []) this.events.set(value.eventId, clone(value));
  }

  private timestamp(): string {
    return this.now().toISOString();
  }

  private refreshRoundProgress(roundDate: string): void {
    const round = this.rounds.get(roundDate);
    if (!round) return;
    const currentContributions = [...this.attempts.values()]
      .filter((attempt) => attempt.roundDate === roundDate)
      .reduce((sum, attempt) => sum + classContribution({ isCorrect: attempt.isCorrect, isPractice: attempt.isPractice, isVoided: attempt.isVoided }), 0);
    this.rounds.set(roundDate, clone({
      ...round,
      currentContributions,
      completed: currentContributions >= round.targetContributions,
      updatedAt: this.timestamp(),
    }));
  }

  async getRound(roundDate: string): Promise<ChallengeRoundRecord | null> {
    const round = this.rounds.get(roundDate);
    return round ? clone(round) : null;
  }

  async listRoundsBetween(startDate: string, endDate: string): Promise<readonly ChallengeRoundRecord[]> {
    return [...this.rounds.values()]
      .filter((round) => round.roundDate >= startDate && round.roundDate <= endDate)
      .sort((left, right) => left.roundDate.localeCompare(right.roundDate))
      .map(clone);
  }

  async listOpenRoundsBefore(roundDate: string): Promise<readonly ChallengeRoundRecord[]> {
    return [...this.rounds.values()]
      .filter((round) => round.roundDate < roundDate && round.status !== 'closed')
      .sort((left, right) => left.roundDate.localeCompare(right.roundDate))
      .map(clone);
  }

  async insertRoundIfAbsent(input: CreateRoundInput): Promise<ChallengeRoundRecord> {
    const existing = this.rounds.get(input.roundDate);
    if (existing) return clone(existing);
    const createdAt = input.createdAt ?? this.timestamp();
    const round: ChallengeRoundRecord = {
      roundDate: input.roundDate,
      timezone: 'Asia/Ho_Chi_Minh',
      status: input.status ?? 'open',
      targetContributions: input.targetContributions,
      currentContributions: 0,
      selectedQuestionCount: 0,
      completed: false,
      closesAt: input.closesAt,
      rewardGranted: false,
      createdAt,
      updatedAt: input.updatedAt ?? createdAt,
      closedAt: null,
      voidedAt: null,
      selectionSeedVersion: input.selectionSeedVersion ?? 'challenge-round-v1',
    };
    this.rounds.set(round.roundDate, clone(round));
    return clone(round);
  }

  async closeRound(roundDate: string, closedAt: string): Promise<void> {
    const round = this.rounds.get(roundDate);
    if (!round) throw new Error('round_not_found');
    if (round.status === 'closed') return;
    this.rounds.set(roundDate, clone({ ...round, status: 'closed', closedAt, updatedAt: closedAt }));
    for (const [id, item] of this.items) {
      if (item.roundDate !== roundDate || item.closedAt) continue;
      this.items.set(id, clone({ ...item, closedAt }));
    }
  }

  async listRoundItems(roundDate: string): Promise<readonly ChallengeRoundItemRecord[]> {
    return [...this.items.values()]
      .filter((item) => item.roundDate === roundDate)
      .sort((left, right) => left.position - right.position || left.id.localeCompare(right.id))
      .map(clone);
  }

  async insertRoundItem(input: CreateRoundItemInput): Promise<ChallengeRoundItemRecord> {
    if (!this.rounds.has(input.roundDate)) throw new Error('round_not_found');
    const existingByQuestion = [...this.items.values()].find((item) => item.roundDate === input.roundDate && item.questionId === input.questionId);
    if (existingByQuestion) {
      if (existingByQuestion.position === input.position) return clone(existingByQuestion);
      throw new Error('duplicate_round_item_question');
    }
    const existingByPosition = [...this.items.values()].find((item) => item.roundDate === input.roundDate && item.position === input.position);
    if (existingByPosition) throw new Error('duplicate_round_item_ordinal');
    const id = input.id ?? this.idFactory();
    const existingById = this.items.get(id);
    if (existingById) throw new Error('duplicate_round_item_id');
    const record: ChallengeRoundItemRecord = {
      id,
      roundDate: input.roundDate,
      questionId: input.questionId,
      position: input.position,
      featuredAt: input.featuredAt,
      authorId: input.authorId,
      selectionSeedVersion: input.selectionSeedVersion,
      selectionMetadata: clone(input.selectionMetadata ?? {}),
      closedAt: null,
    };
    this.items.set(id, clone(record));
    const round = this.rounds.get(input.roundDate)!;
    this.rounds.set(input.roundDate, clone({
      ...round,
      selectedQuestionCount: Math.max(round.selectedQuestionCount, (await this.listRoundItems(input.roundDate)).length),
      status: round.status === 'empty' ? 'open' : round.status,
      updatedAt: this.timestamp(),
    }));
    return clone(record);
  }

  async findRoundItem(itemId: string): Promise<ChallengeRoundItemRecord | null> {
    const item = this.items.get(itemId);
    return item ? clone(item) : null;
  }

  async findAttempt(itemId: string, studentId: string): Promise<ChallengeAttemptRecord | null> {
    const attempt = [...this.attempts.values()].find((value) => value.roundItemId === itemId && value.studentId === studentId);
    return attempt ? clone(attempt) : null;
  }

  async findAttemptByIdempotency(studentId: string, idempotencyKey: string): Promise<ChallengeAttemptRecord | null> {
    const attempt = [...this.attempts.values()].find((value) => value.studentId === studentId && value.idempotencyKey === idempotencyKey);
    return attempt ? clone(attempt) : null;
  }

  async insertAttempt(input: InsertAttemptInput): Promise<ChallengeAttemptRecord | 'duplicate'> {
    if (await this.findAttemptByIdempotency(input.studentId, input.idempotencyKey)) return 'duplicate';
    if (await this.findAttempt(input.roundItemId, input.studentId)) return 'duplicate';
    const item = this.items.get(input.roundItemId);
    if (!item) throw new Error('round_item_not_found');
    const id = input.id ?? this.idFactory();
    if (this.attempts.has(id)) return 'duplicate';
    const record: ChallengeAttemptRecord = {
      id,
      roundItemId: item.id,
      roundDate: input.roundDate ?? item.roundDate,
      questionId: input.questionId ?? item.questionId,
      studentId: input.studentId,
      idempotencyKey: input.idempotencyKey,
      selectedOptionId: input.selectedOptionId,
      isCorrect: input.isCorrect,
      isPractice: input.isPractice,
      isVoided: input.isVoided,
      contribution: classContribution({ isCorrect: input.isCorrect, isPractice: input.isPractice, isVoided: input.isVoided }),
      answeredAt: input.answeredAt,
    };
    this.attempts.set(record.id, clone(record));
    this.refreshRoundProgress(record.roundDate);
    return clone(record);
  }

  async countCorrectContributions(roundDate: string): Promise<number> {
    return [...this.attempts.values()]
      .filter((attempt) => attempt.roundDate === roundDate)
      .reduce((sum, attempt) => sum + classContribution({ isCorrect: attempt.isCorrect, isPractice: attempt.isPractice, isVoided: attempt.isVoided }), 0);
  }

  async listAttemptsForStudent(studentId: string, startDate: string, endDate: string): Promise<readonly ChallengeAttemptRecord[]> {
    return [...this.attempts.values()]
      .filter((attempt) => attempt.studentId === studentId && attempt.roundDate >= startDate && attempt.roundDate <= endDate)
      .sort((left, right) => left.answeredAt.localeCompare(right.answeredAt) || left.id.localeCompare(right.id))
      .map(clone);
  }

  async listAttemptsBetween(startDate: string, endDate: string): Promise<readonly ChallengeAttemptRecord[]> {
    return [...this.attempts.values()]
      .filter((attempt) => attempt.roundDate >= startDate && attempt.roundDate <= endDate)
      .sort((left, right) => left.answeredAt.localeCompare(right.answeredAt) || left.id.localeCompare(right.id))
      .map(clone);
  }

  async listReactionsBetween(startDate: string, endDate: string): Promise<readonly ChallengeReactionRecord[]> {
    const itemDates = new Map([...this.items.values()].map((item) => [item.id, item.roundDate]));
    return [...this.reactions.values()]
      .filter((reaction) => {
        const date = itemDates.get(reaction.roundItemId);
        return Boolean(date && date >= startDate && date <= endDate);
      })
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .map(clone);
  }

  async appendEvent(input: AppendChallengeEventInput): Promise<void> {
    if (this.events.has(input.eventId)) return;
    const createdAt = input.createdAt ?? this.timestamp();
    this.events.set(input.eventId, clone({ ...input, createdAt }));
  }

  async upsertReaction(input: UpsertReactionInput): Promise<ChallengeReactionRecord> {
    const byIdempotency = input.idempotencyKey
      ? [...this.reactions.values()].find((reaction) => reaction.actorId === input.actorId && reaction.idempotencyKey === input.idempotencyKey)
      : undefined;
    const key = reactionKey(input.roundItemId, input.actorId, input.reactionType);
    const existing = byIdempotency ?? this.reactions.get(key);
    if (existing) return clone(existing);
    const record: ChallengeReactionRecord = {
      roundItemId: input.roundItemId,
      actorId: input.actorId,
      reactionType: input.reactionType,
      createdAt: input.createdAt ?? this.timestamp(),
      idempotencyKey: input.idempotencyKey ?? null,
    };
    this.reactions.set(key, clone(record));
    return clone(record);
  }

  async createReport(input: CreateChallengeReportInput): Promise<ChallengeReportPrivateRecord> {
    const byIdempotency = input.idempotencyKey
      ? [...this.reports.values()].find((report) => report.reporterId === input.reporterId && report.idempotencyKey === input.idempotencyKey)
      : undefined;
    const byIdentity = [...this.reports.values()].find((report) => reportIdentityKey(report.roundItemId, report.reporterId, report.reason) === reportIdentityKey(input.roundItemId, input.reporterId, input.reason));
    const existing = byIdempotency ?? byIdentity;
    if (existing) return clone(existing);
    const id = input.id ?? this.idFactory();
    if (this.reports.has(id)) throw new Error('duplicate_report_id');
    const record: ChallengeReportPrivateRecord = {
      id,
      roundItemId: input.roundItemId,
      reporterId: input.reporterId,
      reason: input.reason,
      details: input.details ?? null,
      status: 'open',
      idempotencyKey: input.idempotencyKey ?? null,
      createdAt: input.createdAt ?? this.timestamp(),
      resolvedAt: null,
      resolutionReason: null,
    };
    this.reports.set(id, clone(record));
    return clone(record);
  }

  async findReportByIdempotency(reporterId: string, idempotencyKey: string): Promise<ChallengeReportPrivateRecord | null> {
    const report = [...this.reports.values()].find((candidate) => candidate.reporterId === reporterId && candidate.idempotencyKey === idempotencyKey);
    return report ? clone(report) : null;
  }

  async hasOpenReport(itemId: string): Promise<boolean> {
    return [...this.reports.values()].some((report) => report.roundItemId === itemId && report.status === 'open');
  }

  async hasOpenReportByReporter(itemId: string, reporterId: string): Promise<boolean> {
    return [...this.reports.values()].some((report) => report.roundItemId === itemId && report.reporterId === reporterId && report.status === 'open');
  }

  async hasOpenReportForQuestion(questionId: string): Promise<boolean> {
    const itemIds = new Set([...this.items.values()].filter((item) => item.questionId === questionId).map((item) => item.id));
    return [...this.reports.values()].some((report) => itemIds.has(report.roundItemId) && report.status === 'open');
  }

  async grantRoundReward(roundDate: string): Promise<ChallengeRoundRecord> {
    const round = this.rounds.get(roundDate);
    if (!round) throw new Error('round_not_found');
    if (round.rewardGranted) return clone(round);
    const updatedAt = this.timestamp();
    const next = { ...round, rewardGranted: true, updatedAt };
    this.rounds.set(roundDate, clone(next));
    return clone(next);
  }

  async voidAttemptsForQuestion(questionId: string, voidedAt: string): Promise<void> {
    const itemIds = new Set([...this.items.values()].filter((item) => item.questionId === questionId).map((item) => item.id));
    for (const [id, attempt] of this.attempts) {
      if (!itemIds.has(attempt.roundItemId)) continue;
      this.attempts.set(id, clone({ ...attempt, isVoided: true, contribution: 0, answeredAt: attempt.answeredAt || voidedAt }));
      this.refreshRoundProgress(attempt.roundDate);
    }
  }

  async findReport(reportId: string): Promise<ChallengeReportPrivateRecord | null> {
    const report = this.reports.get(reportId);
    return report ? clone(report) : null;
  }

  async resolveReport(
    reportId: string,
    status: Extract<ChallengeReportPrivateRecord['status'], 'dismissed' | 'voided'>,
    resolvedAt: string,
    reason = '',
  ): Promise<ChallengeReportPrivateRecord> {
    const report = this.reports.get(reportId);
    if (!report) throw new Error('report_not_found');
    if (report.status !== 'open') {
      if (report.status === status) return clone(report);
      throw new Error('report_already_resolved');
    }
    const next = { ...report, status, resolvedAt, resolutionReason: reason || null };
    this.reports.set(reportId, clone(next));
    return clone(next);
  }
}

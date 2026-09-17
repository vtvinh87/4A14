import { randomUUID } from 'node:crypto';
import type {
  AddChallengeReactionInput,
  ChallengeFailure,
  ChallengeReactionRecord,
  ChallengeReactionType,
  ChallengeReportRecord,
  ChallengeReportReason,
  ChallengeReportStatus,
  ReportChallengeItemInput,
  ResolveChallengeReportInput,
  ServiceResult,
} from '../../shared/challenge-contracts.ts';
import { CHALLENGE_REPORT_DETAILS_MAX_LENGTH } from '../../shared/challenge-contracts.ts';
import type { AuthoringRepository } from './authoringTypes.ts';
import type { ChallengeReactionRecord as PrivateReactionRecord, ChallengeReportPrivateRecord, PlayRepository } from './playTypes.ts';

const REACTION_TYPES: readonly ChallengeReactionType[] = ['interesting', 'learned', 'clear_explanation', 'thanks'];
const REPORT_REASONS: readonly ChallengeReportReason[] = ['answer_or_source', 'unclear', 'inappropriate'];
const MAX_IDEMPOTENCY_LENGTH = 160;
const MAX_RESOLUTION_REASON_LENGTH = 500;
const EVENT_SOURCE = 'challenge-social';
const EVENT_SOURCE_VERSION = 'challenge-social-v1';

function failure(code: ChallengeFailure['code'], message: string): ChallengeFailure {
  return { ok: false, code, message };
}

function isReactionType(value: unknown): value is ChallengeReactionType {
  return typeof value === 'string' && REACTION_TYPES.includes(value as ChallengeReactionType);
}

function isReportReason(value: unknown): value is ChallengeReportReason {
  return typeof value === 'string' && REPORT_REASONS.includes(value as ChallengeReportReason);
}

function normalizeIdempotency(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= MAX_IDEMPOTENCY_LENGTH ? normalized : null;
}

function stripMarkup(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function publicReaction(record: PrivateReactionRecord): ChallengeReactionRecord {
  return {
    roundItemId: record.roundItemId,
    actorId: record.actorId,
    reactionType: record.reactionType,
    createdAt: record.createdAt,
  };
}

function publicReport(record: ChallengeReportPrivateRecord): ChallengeReportRecord {
  return {
    id: record.id,
    roundItemId: record.roundItemId,
    reason: record.reason,
    status: record.status,
    createdAt: record.createdAt,
  };
}

function validResolutionInput(value: unknown): value is ResolveChallengeReportInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (candidate.decision === 'dismissed' || candidate.decision === 'voided')
    && typeof candidate.reason === 'string'
    && stripMarkup(candidate.reason).length >= 1
    && stripMarkup(candidate.reason).length <= MAX_RESOLUTION_REASON_LENGTH;
}

export function createChallengeSocialService(deps: {
  play: PlayRepository;
  authoring: AuthoringRepository;
  clock: () => Date;
}) {
  async function addReaction(studentId: string, itemId: string, input: AddChallengeReactionInput): Promise<ServiceResult<ChallengeReactionRecord>> {
    if (!isReactionType(input?.reactionType)) return failure('invalid', 'Phản hồi này chưa được hỗ trợ.');
    const idempotencyKey = normalizeIdempotency(input?.idempotencyKey);
    if (!idempotencyKey) return failure('invalid', 'Mã phản hồi không hợp lệ.');
    if (!(await deps.play.findRoundItem(itemId))) return failure('not-found', 'Không tìm thấy câu hỏi để gửi phản hồi.');

    const record = await deps.play.upsertReaction({
      roundItemId: itemId,
      actorId: studentId,
      reactionType: input.reactionType,
      idempotencyKey,
      createdAt: deps.clock().toISOString(),
    });
    await deps.play.appendEvent({
      eventId: randomUUID(),
      studentId,
      eventType: 'challenge.reaction_added',
      payload: { roundItemId: itemId, reactionType: record.reactionType },
      occurredAt: record.createdAt,
      localDate: (await deps.play.findRoundItem(itemId))?.roundDate ?? deps.clock().toISOString().slice(0, 10),
      source: EVENT_SOURCE,
      sourceVersion: EVENT_SOURCE_VERSION,
    });
    return { ok: true, ...publicReaction(record) };
  }

  async function reportItem(studentId: string, itemId: string, input: ReportChallengeItemInput): Promise<ServiceResult<ChallengeReportRecord>> {
    if (!isReportReason(input?.reason)) return failure('invalid', 'Lý do báo cáo chưa được hỗ trợ.');
    const idempotencyKey = normalizeIdempotency(input?.idempotencyKey);
    if (!idempotencyKey) return failure('invalid', 'Mã báo cáo không hợp lệ.');
    if (!(await deps.play.findRoundItem(itemId))) return failure('not-found', 'Không tìm thấy câu hỏi để báo cáo.');

    let details: string | null = null;
    if (input.details !== undefined) {
      if (typeof input.details !== 'string') return failure('invalid', 'Mô tả báo cáo chưa hợp lệ.');
      details = stripMarkup(input.details);
      if (details.length > CHALLENGE_REPORT_DETAILS_MAX_LENGTH) return failure('invalid', 'Mô tả báo cáo không được dài quá 500 ký tự.');
      if (!details) details = null;
    }
    const existing = await deps.play.findReportByIdempotency(studentId, idempotencyKey);
    if (existing) return { ok: true, ...publicReport(existing) };
    if (await deps.play.hasOpenReportByReporter(itemId, studentId)) return failure('conflict', 'Báo cáo của con đã được gửi để người lớn kiểm tra rồi.');

    const createdAt = deps.clock().toISOString();
    const record = await deps.play.createReport({
      roundItemId: itemId,
      reporterId: studentId,
      reason: input.reason,
      details,
      idempotencyKey,
      createdAt,
    });
    await deps.play.appendEvent({
      eventId: randomUUID(),
      studentId,
      eventType: 'challenge.report_created',
      payload: { roundItemId: itemId, reason: record.reason },
      occurredAt: record.createdAt,
      localDate: (await deps.play.findRoundItem(itemId))?.roundDate ?? createdAt.slice(0, 10),
      source: EVENT_SOURCE,
      sourceVersion: EVENT_SOURCE_VERSION,
    });
    return { ok: true, ...publicReport(record) };
  }

  async function resolveReport(adminId: string, reportId: string, input: ResolveChallengeReportInput): Promise<ServiceResult<void>> {
    if (!validResolutionInput(input)) return failure('invalid', 'Quyết định xử lý báo cáo chưa hợp lệ.');
    const report = await deps.play.findReport(reportId);
    if (!report) return failure('not-found', 'Không tìm thấy báo cáo cần xử lý.');
    if (report.status !== 'open') {
      if (report.status === input.decision) return { ok: true };
      return failure('conflict', 'Báo cáo này đã được xử lý.');
    }

    const reason = stripMarkup(input.reason);
    if (input.decision === 'voided') {
      const item = await deps.play.findRoundItem(report.roundItemId);
      if (!item) return failure('not-found', 'Không tìm thấy câu hỏi của báo cáo.');
      const voided = await voidQuestion(adminId, item.questionId, reason);
      if (!voided.ok) return voided;
    }
    await deps.play.resolveReport(reportId, input.decision, deps.clock().toISOString(), reason);
    return { ok: true };
  }

  async function voidQuestion(_adminId: string, questionId: string, reason: string): Promise<ServiceResult<void>> {
    const safeReason = stripMarkup(reason);
    if (safeReason.length < 1 || safeReason.length > MAX_RESOLUTION_REASON_LENGTH) return failure('invalid', 'Lý do tạm dừng câu hỏi chưa hợp lệ.');
    const result = await deps.authoring.voidQuestion(questionId, deps.clock().toISOString());
    if (result === 'not_found') return failure('not-found', 'Không tìm thấy câu hỏi cần tạm dừng.');
    if (result === 'invalid_state') return failure('conflict', 'Câu hỏi chưa ở trạng thái có thể tạm dừng.');
    await deps.play.voidAttemptsForQuestion(questionId, deps.clock().toISOString());
    return { ok: true };
  }

  return { addReaction, reportItem, resolveReport, voidQuestion };
}

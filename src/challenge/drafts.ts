export const CHALLENGE_DRAFT_STORAGE_KEY = 'hoc-vui-challenge-drafts-v1' as const;
export const CHALLENGE_DRAFT_SCHEMA_VERSION = 2 as const;

// This store is deliberately limited to an authoring draft. Challenge rounds,
// attempts, reactions and reports remain server-authoritative and are never
// pre-cached here for offline use.

export type ChallengeDraft = {
  sourceFactId: string;
  prompt: string;
  correctAnswer: string;
  distractors: [string, string, string];
  explanation: string;
  updatedAt: string;
};

export type DraftStorageResult = { ok: true; available: boolean; draft: ChallengeDraft };
export type DraftStorageWriteResult = { ok: boolean; available: boolean };

export function emptyChallengeDraft(): ChallengeDraft {
  return { sourceFactId: '', prompt: '', correctAnswer: '', distractors: ['', '', ''], explanation: '', updatedAt: '' };
}

function resolveStorage(storage?: Storage | null): Storage | null {
  if (storage !== undefined) return storage;
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isDraft(value: unknown): value is ChallengeDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.sourceFactId === 'string'
    && typeof record.prompt === 'string'
    && typeof record.correctAnswer === 'string'
    && Array.isArray(record.distractors)
    && record.distractors.length === 3
    && record.distractors.every((item) => typeof item === 'string')
    && typeof record.explanation === 'string'
    && typeof record.updatedAt === 'string';
}

function isLegacyDraft(value: unknown): value is Omit<ChallengeDraft, 'correctAnswer'> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.sourceFactId === 'string'
    && typeof record.prompt === 'string'
    && !('correctAnswer' in record)
    && Array.isArray(record.distractors)
    && record.distractors.length === 3
    && record.distractors.every((item) => typeof item === 'string')
    && typeof record.explanation === 'string'
    && typeof record.updatedAt === 'string';
}

export function loadChallengeDraft(storage?: Storage | null): DraftStorageResult {
  const target = resolveStorage(storage);
  if (!target) return { ok: true, available: false, draft: emptyChallengeDraft() };
  let raw: string | null;
  try {
    raw = target.getItem(CHALLENGE_DRAFT_STORAGE_KEY);
  } catch {
    return { ok: true, available: false, draft: emptyChallengeDraft() };
  }
  if (!raw) return { ok: true, available: true, draft: emptyChallengeDraft() };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: true, available: true, draft: emptyChallengeDraft() };
    const envelope = parsed as Record<string, unknown>;
    if (envelope.version === 1 && isLegacyDraft(envelope.draft)) {
      const legacy = envelope.draft;
      return { ok: true, available: true, draft: { ...legacy, correctAnswer: '', distractors: [...legacy.distractors] as [string, string, string] } };
    }
    if (envelope.version !== CHALLENGE_DRAFT_SCHEMA_VERSION || !isDraft(envelope.draft)) return { ok: true, available: true, draft: emptyChallengeDraft() };
    const draft = envelope.draft;
    return { ok: true, available: true, draft: { ...draft, distractors: [...draft.distractors] as [string, string, string] } };
  } catch {
    return { ok: true, available: true, draft: emptyChallengeDraft() };
  }
}

export function saveChallengeDraft(draft: ChallengeDraft, storage?: Storage | null): DraftStorageWriteResult {
  const target = resolveStorage(storage);
  if (!target) return { ok: false, available: false };
  try {
    target.setItem(CHALLENGE_DRAFT_STORAGE_KEY, JSON.stringify({ version: CHALLENGE_DRAFT_SCHEMA_VERSION, draft }));
    return { ok: true, available: true };
  } catch {
    return { ok: false, available: false };
  }
}

export function clearChallengeDraft(storage?: Storage | null): DraftStorageWriteResult {
  const target = resolveStorage(storage);
  if (!target) return { ok: false, available: false };
  try {
    target.removeItem(CHALLENGE_DRAFT_STORAGE_KEY);
    return { ok: true, available: true };
  } catch {
    return { ok: false, available: false };
  }
}

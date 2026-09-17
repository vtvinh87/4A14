import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearChallengeDraft, emptyChallengeDraft, loadChallengeDraft, saveChallengeDraft, type ChallengeDraft } from './drafts';

function storage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

const draft: ChallengeDraft = {
  sourceFactId: 'map',
  prompt: 'Theo con, bản đồ giúp chúng ta học điều gì?',
  correctAnswer: 'Bản đồ giúp tìm vị trí và đọc thông tin.',
  distractors: ['Một bài hát về ngày hội.', 'Một loại bánh truyền thống.', 'Một câu chuyện kể về nhân vật.'],
  explanation: 'Bản đồ giúp thể hiện thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.',
  updatedAt: '2026-09-17T08:00:00.000Z',
};

describe('challenge draft storage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', storage());
  });

  it('round-trips only the draft fields under the versioned key', () => {
    const target = storage();
    expect(saveChallengeDraft(draft, target)).toEqual({ ok: true, available: true });
    expect(loadChallengeDraft(target)).toEqual({ ok: true, available: true, draft });
    expect(target.getItem('hoc-vui-challenge-drafts-v1')).not.toContain('token');
    expect(target.getItem('hoc-vui-challenge-drafts-v1')).not.toContain('session');
  });

  it('returns an empty draft for corrupt, old-schema, or unavailable storage without throwing', () => {
    const corrupt = storage({ 'hoc-vui-challenge-drafts-v1': '{bad json' });
    expect(loadChallengeDraft(corrupt)).toEqual(expect.objectContaining({ ok: true, available: true, draft: emptyChallengeDraft() }));
    const oldSchema = storage({ 'hoc-vui-challenge-drafts-v1': JSON.stringify({ version: 99, draft }) });
    expect(loadChallengeDraft(oldSchema).draft).toEqual(emptyChallengeDraft());
    const unavailable = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    } as unknown as Storage;
    expect(loadChallengeDraft(unavailable)).toEqual(expect.objectContaining({ ok: true, available: false, draft: emptyChallengeDraft() }));
    expect(saveChallengeDraft(draft, unavailable)).toEqual({ ok: false, available: false });
    expect(clearChallengeDraft(unavailable)).toEqual({ ok: false, available: false });
  });

  it('clears exactly the challenge draft and keeps a fresh updated timestamp', () => {
    const target = storage();
    saveChallengeDraft(draft, target);
    expect(clearChallengeDraft(target)).toEqual({ ok: true, available: true });
    expect(loadChallengeDraft(target).draft).toEqual(emptyChallengeDraft());
  });
});

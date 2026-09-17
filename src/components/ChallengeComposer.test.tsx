import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHALLENGE_SOURCE_FACTS, VERIFIED_CHALLENGE_FACTS } from '../../shared/challenge-source';
import type { ChallengeQuestionMine } from '../../shared/challenge-contracts';
import { createChallengeQuestion, reviseChallengeQuestion } from '../auth/apiClient';
import { ChallengeComposer } from './ChallengeComposer';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../auth/apiClient', () => ({
  createChallengeQuestion: vi.fn(),
  reviseChallengeQuestion: vi.fn(),
}));

const mockedCreate = vi.mocked(createChallengeQuestion);
const mockedRevise = vi.mocked(reviseChallengeQuestion);

function setValue(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function question(): ChallengeQuestionMine {
  return {
    id: 'q-revision',
    authorId: 'student-a',
    sourceFactId: 'map',
    sourceVersion: 'challenge-facts-v1',
    lessonId: 'lesson-01',
    lessonTitle: 'Làm quen với phương tiện học tập môn Lịch sử và Địa lí',
    prompt: 'Theo con, bản đồ giúp chúng ta học điều gì?',
    options: [
      { id: 'correct', text: 'Bản đồ' },
      { id: 'wrong-1', text: 'Một bài hát về ngày hội.' },
      { id: 'wrong-2', text: 'Một loại bánh truyền thống.' },
      { id: 'wrong-3', text: 'Một câu chuyện kể về nhân vật.' },
    ],
    correctOptionId: 'correct',
    explanation: 'Bản đồ giúp thể hiện thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.',
    status: 'draft',
    revision: 1,
    createdLocalDate: '2026-09-17',
    createdAt: '2026-09-17T08:00:00.000Z',
    updatedAt: '2026-09-17T08:00:00.000Z',
    submittedAt: '2026-09-17T08:00:00.000Z',
    reviewedAt: '2026-09-17T09:00:00.000Z',
    featuredAt: null,
    closedAt: null,
    reviewReason: 'Con hãy viết rõ hơn nhé.',
    withdrawnAt: null,
    voidedAt: null,
    quotaUsedOnCreatedDate: 3,
  };
}

describe('ChallengeComposer', () => {
  let root: Root;
  let mount: HTMLDivElement;
  let target: Storage;

  beforeEach(() => {
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
    target = (() => {
      const values = new Map<string, string>();
      return {
        get length() { return values.size; },
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        key: (index: number) => [...values.keys()][index] ?? null,
        removeItem: (key: string) => { values.delete(key); },
        setItem: (key: string, value: string) => { values.set(key, value); },
      } as Storage;
    })();
    mockedCreate.mockReset();
    mockedRevise.mockReset();
  });

  afterEach(() => {
    act(() => root.unmount());
    mount.remove();
  });

  function render(overrides: Partial<Parameters<typeof ChallengeComposer>[0]> = {}) {
    const props = {
      sourceFacts: VERIFIED_CHALLENGE_FACTS,
      quotaUsedOnCreatedDate: 0,
      canCreate: true,
      storage: target,
      ...overrides,
    };
    act(() => root.render(createElement(ChallengeComposer, props)));
    return props;
  }

function fillValidDraft() {
  act(() => {
    setValue(mount.querySelector<HTMLTextAreaElement>('[data-challenge-prompt]')!, 'Theo con, bản đồ giúp chúng ta học điều gì?');
    setValue(mount.querySelector<HTMLInputElement>('[data-challenge-correct-answer]')!, 'Bản đồ giúp tìm và đọc thông tin về khu vực.');
    setValue(mount.querySelector<HTMLInputElement>('[data-challenge-distractor="0"]')!, 'Một bài hát về ngày hội.');
      setValue(mount.querySelector<HTMLInputElement>('[data-challenge-distractor="1"]')!, 'Một loại bánh truyền thống.');
      setValue(mount.querySelector<HTMLInputElement>('[data-challenge-distractor="2"]')!, 'Một câu chuyện kể về nhân vật.');
      setValue(mount.querySelector<HTMLTextAreaElement>('[data-challenge-explanation]')!, 'Bản đồ giúp thể hiện thu nhỏ một khu vực hoặc toàn bộ bề mặt Trái Đất theo tỉ lệ.');
    });
  }

  it('offers every knowledge area and lets the student author the correct answer', () => {
    render({ sourceFacts: CHALLENGE_SOURCE_FACTS });
    expect(mount.querySelectorAll('#challenge-source optgroup')).toHaveLength(29);
    expect(mount.querySelectorAll('#challenge-source option')).toHaveLength(CHALLENGE_SOURCE_FACTS.length);
    expect(mount.querySelector<HTMLInputElement>('[data-challenge-correct-answer]')?.value).toBe('');
    expect(mount.querySelector<HTMLInputElement>('[data-challenge-correct-answer]')?.disabled).toBe(false);
    expect(mount.querySelector<HTMLButtonElement>('[data-challenge-submit]')?.disabled).toBe(true);
    expect(mount.querySelector('[data-challenge-prompt-label]')?.textContent).toContain('câu hỏi');
    expect(mount.querySelector('[data-challenge-explanation-label]')?.textContent).toContain('giải thích');
    expect(mount.querySelector('[data-challenge-validation]')?.textContent).toContain('20');

    fillValidDraft();
    expect(mount.querySelector<HTMLButtonElement>('[data-challenge-submit]')?.disabled).toBe(false);
  });

  it('keeps the draft and idempotency flow intact on network failure, then clears it only after success', async () => {
    render();
    fillValidDraft();
    mockedCreate.mockResolvedValueOnce({ ok: false, code: 'unavailable', message: 'Mạng đang chập chờn.' });
    await act(async () => { mount.querySelector<HTMLButtonElement>('[data-challenge-submit]')?.click(); await Promise.resolve(); });
    expect(mount.querySelector('[data-challenge-error]')?.textContent).toContain('Mạng đang chập chờn');
    expect(target.getItem('hoc-vui-challenge-drafts-v1')).toContain('Theo con');
    expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({ sourceFactId: 'map', correctAnswer: 'Bản đồ giúp tìm và đọc thông tin về khu vực.' }), expect.any(String));

    mockedCreate.mockResolvedValueOnce({ ok: true, question: question() });
    await act(async () => { mount.querySelector<HTMLButtonElement>('[data-challenge-submit]')?.click(); await Promise.resolve(); });
    expect(target.getItem('hoc-vui-challenge-drafts-v1')).toBeNull();
  });

  it('does not block a revision on the original quota and shows the parent reason', async () => {
    const saved = question();
    render({ initialQuestion: saved, quotaUsedOnCreatedDate: 3 });
    expect(mount.textContent).toContain('Con hãy viết rõ hơn nhé.');
    expect(mount.querySelector<HTMLButtonElement>('[data-challenge-submit]')?.disabled).toBe(false);
    mockedRevise.mockResolvedValueOnce({ ok: true, question: { ...saved, revision: 2, status: 'pending_parent_review' } });
    await act(async () => { mount.querySelector<HTMLButtonElement>('[data-challenge-submit]')?.click(); await Promise.resolve(); });
    expect(mockedRevise).toHaveBeenCalledWith('q-revision', expect.objectContaining({ revision: 1 }), expect.any(String));
  });

  it('does not offer authoring while the parent has paused creation', () => {
    render({ canCreate: false });
    expect(mount.querySelector('[data-challenge-composer-paused]')?.textContent).toContain('tạm dừng');
    expect(mount.querySelector('[data-challenge-submit]')).toBeNull();
  });
});

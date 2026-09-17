import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChallengeReactionType } from '../../shared/challenge-contracts';
import { ChallengeReactionBar } from './ChallengeReactionBar';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('ChallengeReactionBar', () => {
  let root: Root;
  let mount: HTMLDivElement;

  beforeEach(() => {
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
  });

  afterEach(() => {
    act(() => root.unmount());
    mount.remove();
  });

  it('offers only positive, non-scoring reactions and exposes selected state accessibly', () => {
    const onReact = vi.fn(async () => true);
    act(() => root.render(createElement(ChallengeReactionBar, { itemId: 'item-1', selected: ['learned'] as ChallengeReactionType[], onReact })));

    const buttons = mount.querySelectorAll<HTMLButtonElement>('[data-challenge-reaction]');
    expect(buttons).toHaveLength(4);
    expect(mount.querySelector<HTMLButtonElement>('[data-challenge-reaction="learned"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(mount.textContent).toContain('Mình đã học');
    expect(mount.textContent).not.toMatch(/điểm|xếp hạng|nhanh nhất|thắng/i);
    expect(mount.querySelector('[role="group"]')?.getAttribute('aria-label')).toContain('khích lệ');
  });

  it('disables duplicate and concurrent reactions until the parent receives an acknowledgement', () => {
    const onReact = vi.fn(async () => true);
    act(() => root.render(createElement(ChallengeReactionBar, { itemId: 'item-1', pendingKey: 'item-1:interesting', onReact })));

    expect(mount.querySelector<HTMLButtonElement>('[data-challenge-reaction="interesting"]')?.disabled).toBe(true);
    expect(mount.querySelector<HTMLButtonElement>('[data-challenge-reaction="thanks"]')?.disabled).toBe(true);
    act(() => mount.querySelector<HTMLButtonElement>('[data-challenge-reaction="interesting"]')?.click());
    expect(onReact).not.toHaveBeenCalled();
  });
});

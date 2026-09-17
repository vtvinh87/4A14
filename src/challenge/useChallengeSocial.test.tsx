import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addChallengeReaction, reportChallengeItem } from '../auth/apiClient';
import { useChallengeSocial, type ChallengeSocialState } from './useChallengeSocial';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../auth/apiClient', () => ({
  addChallengeReaction: vi.fn(),
  reportChallengeItem: vi.fn(),
}));

const mockedReaction = vi.mocked(addChallengeReaction);
const mockedReport = vi.mocked(reportChallengeItem);

async function settle(): Promise<void> {
  await act(async () => {
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
  });
}

describe('useChallengeSocial', () => {
  let root: Root;
  let mount: HTMLDivElement;
  let state: ChallengeSocialState | null;

  beforeEach(() => {
    vi.clearAllMocks();
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
    state = null;
    mockedReaction.mockResolvedValue({ ok: true, roundItemId: 'item-1', actorId: 'student-a', reactionType: 'learned', createdAt: '2026-09-17T08:00:00.000Z' });
    mockedReport.mockResolvedValue({ ok: true, id: 'report-1', roundItemId: 'item-1', reason: 'unclear', status: 'open', createdAt: '2026-09-17T08:00:00.000Z' });
  });

  afterEach(() => {
    act(() => root.unmount());
    mount.remove();
  });

  function Probe() {
    const current = useChallengeSocial(true);
    useEffect(() => { state = current; });
    return <output data-reaction-count={current.reactions['item-1']?.length ?? 0} data-reported={current.reportedItemIds.includes('item-1') ? 'yes' : 'no'} />;
  }

  it('commits a reaction only after acknowledgement and deduplicates repeated clicks', async () => {
    act(() => root.render(createElement(Probe)));

    await act(async () => {
      const first = state?.addReaction('item-1', 'learned');
      const second = state?.addReaction('item-1', 'learned');
      await Promise.all([first, second]);
    });

    expect(mockedReaction).toHaveBeenCalledOnce();
    expect(mockedReaction).toHaveBeenCalledWith('item-1', 'learned', expect.any(String));
    expect(state?.reactions).toEqual({ 'item-1': ['learned'] });

    await act(async () => { await state?.addReaction('item-1', 'learned'); });
    expect(mockedReaction).toHaveBeenCalledOnce();
  });

  it('keeps the same report intent and idempotency key for a failed request and retry', async () => {
    act(() => root.render(createElement(Probe)));
    mockedReport
      .mockResolvedValueOnce({ ok: false, code: 'unavailable', message: 'Mạng đang chập chờn.' })
      .mockResolvedValueOnce({ ok: true, id: 'report-1', roundItemId: 'item-1', reason: 'unclear', status: 'open', createdAt: '2026-09-17T08:00:00.000Z' });

    let firstResult: boolean | undefined;
    await act(async () => { firstResult = await state?.report('item-1', { reason: 'unclear', details: 'Con chưa hiểu phần này.' }); });
    expect(firstResult).toBe(false);
    expect(state?.reportedItemIds).toEqual([]);
    expect(state?.lastError).toBe('Mạng đang chập chờn.');

    let retryResult: boolean | undefined;
    await act(async () => { retryResult = await state?.retryReport('item-1'); });
    expect(retryResult).toBe(true);
    expect(state?.reportedItemIds).toEqual(['item-1']);
    expect(mockedReport).toHaveBeenCalledTimes(2);
    const firstCall = mockedReport.mock.calls[0];
    const secondCall = mockedReport.mock.calls[1];
    expect(firstCall?.[0]).toBe('item-1');
    expect(secondCall?.[0]).toBe('item-1');
    expect(secondCall?.[1]).toEqual(firstCall?.[1]);
    expect(secondCall?.[2]).toBe(firstCall?.[2]);
  });

  it('clears visible social state and invalidates pending work when disabled', async () => {
    act(() => root.render(createElement(Probe)));
    await act(async () => { await state?.addReaction('item-1', 'thanks'); });
    expect(state?.reactions['item-1']).toEqual(['thanks']);

    act(() => root.render(createElement(() => {
      const current = useChallengeSocial(false);
      useEffect(() => { state = current; });
      return null;
    })));
    expect(state?.reactions).toEqual({});
    expect(state?.reportedItemIds).toEqual([]);
    expect(state?.lastError).toBe('');
  });

  it('stores reaction and report intents while offline so reconnect retries use the original key and reason', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    act(() => root.render(createElement(Probe)));
    act(() => window.dispatchEvent(new Event('offline')));

    await act(async () => {
      await state?.addReaction('item-1', 'thanks');
      await state?.report('item-1', { reason: 'unclear', details: 'Con chưa hiểu phần này.' });
    });
    expect(mockedReaction).not.toHaveBeenCalled();
    expect(mockedReport).not.toHaveBeenCalled();
    expect(state?.lastError).toContain('ngoại tuyến');

    online.mockReturnValue(true);
    act(() => window.dispatchEvent(new Event('online')));
    await act(async () => {
      await state?.addReaction('item-1', 'thanks');
      await state?.retryReport('item-1');
    });
    expect(mockedReaction).toHaveBeenCalledWith('item-1', 'thanks', expect.any(String));
    expect(mockedReport).toHaveBeenCalledWith('item-1', { reason: 'unclear', details: 'Con chưa hiểu phần này.' }, expect.any(String));
    expect(mockedReport.mock.calls[0]?.[2]).toBeTypeOf('string');
    online.mockRestore();
  });
});

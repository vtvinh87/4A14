import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProgressBoardData } from '../../shared/progress-board-contracts';
import { getProgressBoard, getProgressBoardRolloutConfig } from '../auth/apiClient';
import { saveProgressBoardCache } from './progressBoardCache';
import { useProgressBoard, type ProgressBoardHookResult, type ProgressBoardOptions } from './useProgressBoard';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../auth/apiClient', async () => {
  const actual = await vi.importActual<typeof import('../auth/apiClient')>('../auth/apiClient');
  return { ...actual, getProgressBoard: vi.fn(), getProgressBoardRolloutConfig: vi.fn() };
});

const mockedConfig = vi.mocked(getProgressBoardRolloutConfig);
const mockedBoard = vi.mocked(getProgressBoard);

const identity = { accountId: 'student-a', generation: 2, contentVersion: 'lesson-content-v1', ruleVersion: 'progress-board-v1' };

function board(overrides: Partial<ProgressBoardData> = {}): ProgressBoardData {
  return {
    schemaVersion: 1,
    ruleVersion: 'progress-board-v1',
    contentVersion: 'lesson-content-v1',
    generation: String(identity.generation),
    generatedAt: '2026-09-17T10:00:00.000Z',
    lastSyncedAt: '2026-09-17T09:00:00.000Z',
    stale: false,
    summary: { exploredLessonCount: 0, completedLessonCount: 0, independentObjectiveCount: 0, nextLessonId: 'lesson-01' },
    topics: [],
    nextLessonId: 'lesson-01',
    ...overrides,
  };
}

async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
}

describe('useProgressBoard', () => {
  let root: Root;
  let mount: HTMLDivElement;
  let current: ProgressBoardHookResult | undefined;

  const Probe = ({ options }: { options: ProgressBoardOptions }) => {
    current = useProgressBoard(options);
    return createElement('output', null, current.status);
  };

  beforeEach(() => {
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
    current = undefined;
    sessionStorage.clear();
    mockedConfig.mockResolvedValue({ ok: true, config: { enabled: true } });
    mockedBoard.mockResolvedValue({ ok: true, data: board() });
  });

  afterEach(() => {
    act(() => root.unmount());
    mount.remove();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('does not fetch while disabled and distinguishes logged-out from idle', async () => {
    act(() => root.render(createElement(Probe, { options: { enabled: false, accountId: null, generation: null } })));
    expect(current?.status).toBe('logged-out');
    expect(mockedConfig).not.toHaveBeenCalled();

    act(() => root.render(createElement(Probe, { options: { enabled: false, accountId: identity.accountId, generation: identity.generation } })));
    await settle();
    expect(current?.status).toBe('idle');
    expect(mockedBoard).not.toHaveBeenCalled();
  });

  it('returns empty for a valid board with no activity and success after progress exists', async () => {
    act(() => root.render(createElement(Probe, { options: { enabled: true, accountId: identity.accountId, generation: identity.generation } })));
    await settle();
    expect(mockedConfig).not.toHaveBeenCalled();
    expect(current?.status).toBe('empty');
    expect(current?.data?.stale).toBe(false);

    mockedBoard.mockResolvedValueOnce({ ok: true, data: board({ summary: { ...board().summary, exploredLessonCount: 1 } }) });
    await act(async () => { await current?.refresh(); });
    expect(current?.status).toBe('success');
  });

  it('does not show private cache when the board endpoint reports rollout disabled', async () => {
    const cached = board({ summary: { ...board().summary, exploredLessonCount: 1 } });
    expect(saveProgressBoardCache(identity, cached)).toBe(true);
    mockedBoard.mockResolvedValue({ ok: false, code: 'unavailable', reason: 'rollout_disabled', message: 'Bảng tiến bộ đang được mở dần cho lớp.' } as never);

    act(() => root.render(createElement(Probe, { options: { enabled: true, accountId: identity.accountId, generation: identity.generation } })));
    await settle();

    expect(mockedConfig).not.toHaveBeenCalled();
    expect(mockedBoard).toHaveBeenCalledOnce();
    expect(current?.status).toBe('unavailable');
    expect(current?.data).toBeNull();
    expect(current?.error).toContain('mở dần');
  });

  it.each(['expired', 'forbidden'] as const)('does not use private cache for %s board failures', async (code) => {
    expect(saveProgressBoardCache(identity, board({ summary: { ...board().summary, exploredLessonCount: 1 } }))).toBe(true);
    mockedBoard.mockResolvedValue({ ok: false, code, message: 'Phiên không còn quyền.' });

    act(() => root.render(createElement(Probe, { options: { enabled: true, accountId: identity.accountId, generation: identity.generation } })));
    await settle();

    expect(mockedConfig).not.toHaveBeenCalled();
    expect(current?.status).toBe('unavailable');
    expect(current?.data).toBeNull();
  });

  it('uses a valid session cache as stale fallback when the API is unavailable', async () => {
    const cached = board({ summary: { ...board().summary, exploredLessonCount: 1 } });
    expect(saveProgressBoardCache(identity, cached)).toBe(true);
    mockedBoard.mockResolvedValue({ ok: false, code: 'unavailable', message: 'Tạm thời chưa sẵn sàng.' });

    act(() => root.render(createElement(Probe, { options: { enabled: true, accountId: identity.accountId, generation: identity.generation } })));
    await settle();
    expect(current?.status).toBe('stale');
    expect(current?.data).toEqual({ ...cached, stale: true });
  });

  it('returns unavailable without cache and refreshes only on explicit action', async () => {
    mockedBoard.mockResolvedValue({ ok: false, code: 'unavailable', message: 'Tạm thời chưa sẵn sàng.' });
    act(() => root.render(createElement(Probe, { options: { enabled: true, accountId: identity.accountId, generation: identity.generation } })));
    await settle();
    expect(current?.status).toBe('unavailable');
    expect(current?.error).toContain('thử lại');
    expect(mockedBoard).toHaveBeenCalledOnce();

    await act(async () => { await current?.refresh(); });
    expect(mockedBoard).toHaveBeenCalledTimes(2);
  });

  it('ignores an older account response after switching identity', async () => {
    const dataA = deferred<{ ok: true; data: ProgressBoardData }>();
    const dataB = deferred<{ ok: true; data: ProgressBoardData }>();
    mockedBoard.mockReset();
    mockedBoard.mockImplementationOnce(() => dataA.promise).mockImplementationOnce(() => dataB.promise);

    act(() => root.render(createElement(Probe, { options: { enabled: true, accountId: 'student-a', generation: 2 } })));
    await settle();
    act(() => root.render(createElement(Probe, { options: { enabled: true, accountId: 'student-b', generation: 2 } })));
    await settle();

    dataB.resolve({ ok: true, data: board({ generation: '2', summary: { ...board().summary, exploredLessonCount: 2 } }) });
    await settle();
    expect(current?.data?.summary.exploredLessonCount).toBe(2);

    dataA.resolve({ ok: true, data: board({ summary: { ...board().summary, exploredLessonCount: 99 } }) });
    await settle();
    expect(current?.data?.summary.exploredLessonCount).toBe(2);
  });

  it('does not use cache from another generation and responds once to invalidation', async () => {
    expect(saveProgressBoardCache(identity, board({ summary: { ...board().summary, exploredLessonCount: 1 } }))).toBe(true);
    mockedBoard.mockResolvedValue({ ok: false, code: 'unavailable', message: 'Tạm thời chưa sẵn sàng.' });
    act(() => root.render(createElement(Probe, { options: { enabled: true, accountId: identity.accountId, generation: 3, invalidationToken: 0 } })));
    await settle();
    expect(current?.status).toBe('unavailable');

    mockedBoard.mockResolvedValue({ ok: true, data: board({ generation: '3', summary: { ...board().summary, exploredLessonCount: 3 } }) });
    act(() => root.render(createElement(Probe, { options: { enabled: true, accountId: identity.accountId, generation: 3, invalidationToken: 1 } })));
    await settle();
    expect(current?.data?.summary.exploredLessonCount).toBe(3);
    expect(mockedBoard).toHaveBeenCalledTimes(2);
  });
});

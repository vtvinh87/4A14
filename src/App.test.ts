import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ParentDashboardData } from '../shared/dashboard-contracts';
import type { StudentProfileView } from '../shared/account-contracts';
import type { FriendSummary } from '../shared/classroom-contracts';
import type { ProgressBoardData } from '../shared/progress-board-contracts';
import type { ClientSession } from './auth/apiClient';
import { createAccountProgressSnapshot, saveAccountProgressSnapshot } from './progress/accountProgress';
import { createDefaultProgress } from './progress/storage';
import { getCalendarDateInTimeZone } from './profile/birthday';
import { App } from './App';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const apiMocks = vi.hoisted(() => ({
  getCurrentAuthSession: vi.fn(),
  getStudentProfile: vi.fn(),
  getAccountProgress: vi.fn(),
  getParentDashboard: vi.fn(),
  getParentProfile: vi.fn(),
  unlockParent: vi.fn(),
  updateParentProfilePreferences: vi.fn(),
  lockParent: vi.fn(),
  logout: vi.fn(),
  getPendingChallengeQuestions: vi.fn(),
  getChallengeSettings: vi.fn(),
  reviewChallengeQuestion: vi.fn(),
  updateChallengeSettings: vi.fn(),
  withdrawChallengeQuestion: vi.fn(),
  getChallengeRolloutConfig: vi.fn(),
  getProgressBoardRolloutConfig: vi.fn(),
  getProgressBoard: vi.fn(),
}));

const classroomMocks = vi.hoisted(() => ({
  useClassroomFriends: vi.fn(),
}));

vi.mock('./auth/apiClient', async () => {
  const actual = await vi.importActual<typeof import('./auth/apiClient')>('./auth/apiClient');
  return { ...actual, ...apiMocks };
});

vi.mock('./components/Pet', () => ({ Pet: () => null }));
vi.mock('./components/ChallengeDialog', () => ({
  ChallengeDialog: ({ onClose }: { onClose: () => void }) => createElement(
    'section',
    { 'data-test-challenge-dialog': true },
    createElement('button', { type: 'button', onClick: onClose }, 'Đóng Thách đố'),
  ),
}));
vi.mock('./classroom/useClassroomFriends', () => classroomMocks);

const session: ClientSession = {
  account: { id: 'student-a', username: 'bebao', displayName: 'Bé Bảo', role: 'student', active: true, credentialVersion: 1 },
  mode: 'full',
  changeKind: null,
  createdAt: '2026-09-14T05:00:00.000Z',
  expiresAt: '2026-09-21T05:00:00.000Z',
  mustChange: false,
};

const studentProfile: StudentProfileView = {
  accountId: 'student-a',
  username: 'bebao',
  displayName: 'Bé Bảo',
  avatarId: 'fox-leaf',
  birthDate: (() => {
    const today = getCalendarDateInTimeZone(new Date());
    return `${today.year - 10}-${String(today.month).padStart(2, '0')}-${String(today.day).padStart(2, '0')}`;
  })(),
  birthdayWishesEnabled: false,
};

const classroomFriend: FriendSummary = {
  id: 'friend-lan',
  username: 'lan04',
  displayName: 'Bạn Lan',
  avatarId: 'fox-leaf',
  online: true,
  unreadCount: 3,
};

const progressBoardData: ProgressBoardData = {
  schemaVersion: 1,
  ruleVersion: 'progress-board-v1',
  contentVersion: 'lesson-content-v1',
  generation: '0',
  generatedAt: '2026-09-17T10:00:00.000Z',
  lastSyncedAt: '2026-09-17T09:00:00.000Z',
  stale: false,
  summary: { exploredLessonCount: 1, completedLessonCount: 0, independentObjectiveCount: 0, nextLessonId: 'lesson-01' },
  topics: [{ topic: 'Mái nhà Việt Nam', lessons: [{
    lessonId: 'lesson-01', title: 'Địa phương em', topic: 'Mái nhà Việt Nam', completed: false, state: 'explored', completedMissionCount: 1, missionCount: 5,
    objectives: [{ objectiveId: 'objective-01', label: 'Nhận biết địa phương', state: 'explored', practicedActivityCount: 1, independentActivityCount: 0, nextAction: 'practice' }], nextAction: 'practice',
  }] }],
  nextLessonId: 'lesson-01',
};

function createDashboard(): { snapshot: ReturnType<typeof createAccountProgressSnapshot>; dashboard: ParentDashboardData } {
  const progress = createDefaultProgress();
  const snapshot = createAccountProgressSnapshot('student-a', progress);
  const dashboard = {
    schemaVersion: 1,
    ruleVersion: 'dashboard-rules-v1',
    studentId: 'student-a',
    range: 'all',
    generatedAt: '2026-09-14T05:00:00.000Z',
    lastSyncedAt: '2026-09-14T05:00:00.000Z',
    snapshot,
    metrics: {
      range: 'all', activitySample: 0, totalAttempts: 0, retryAttempts: 0, firstAttemptCorrect: 0, firstAttemptAccuracy: null,
      hintActivities: 0, hintRate: null, activeDays: 0, estimatedMinutes: 0, completedLessons: 0, totalLessons: 29,
      completedMissions: 0, totalMissions: 145, stamps: 0, totalStamps: 29, lastActivityAt: null, dataQuality: 'none',
    },
    activities: [], lessons: [], suggestions: [], events: [],
  } satisfies ParentDashboardData;
  return { snapshot, dashboard };
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function settle(): Promise<void> {
  await act(async () => {
    for (let index = 0; index < 12; index += 1) await Promise.resolve();
  });
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
}

function clickText(mount: HTMLElement, selector: string, text: string): void {
  const target = Array.from(mount.querySelectorAll<HTMLElement>(selector)).find((element) => element.textContent?.includes(text));
  expect(target).toBeDefined();
  act(() => target?.click());
}

describe('App cross-feature account flow', () => {
  let root: Root;
  let mount: HTMLDivElement;

  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    const { snapshot, dashboard } = createDashboard();
    apiMocks.getCurrentAuthSession.mockResolvedValue({ ok: true, session });
    apiMocks.getStudentProfile.mockResolvedValue({ ok: true, profile: studentProfile });
    apiMocks.getAccountProgress.mockResolvedValue({ ok: true, snapshot });
    apiMocks.unlockParent.mockResolvedValue({ ok: true, session: { ...session, parentGrantUntil: '2026-09-14T05:15:00.000Z' }, parentGrantToken: 'grant-a' });
    apiMocks.getParentDashboard.mockResolvedValue({ ok: true, studentId: 'student-a', snapshot, dashboard, events: [] });
    apiMocks.getParentProfile.mockResolvedValue({ ok: true, profile: studentProfile });
    apiMocks.updateParentProfilePreferences.mockResolvedValue({ ok: true, profile: { ...studentProfile, birthdayWishesEnabled: true } });
    apiMocks.lockParent.mockResolvedValue({ ok: true });
    apiMocks.logout.mockRejectedValue(new Error('offline'));
    apiMocks.getPendingChallengeQuestions.mockResolvedValue({ ok: true, questions: [] });
    apiMocks.getChallengeSettings.mockResolvedValue({ ok: true, settings: { studentId: 'student-a', canCreate: true, canParticipate: true, updatedAt: '2026-09-14T05:00:00.000Z' } });
    apiMocks.reviewChallengeQuestion.mockResolvedValue({ ok: true, question: {} });
    apiMocks.updateChallengeSettings.mockResolvedValue({ ok: true, settings: { studentId: 'student-a', canCreate: true, canParticipate: true, updatedAt: '2026-09-14T05:00:00.000Z' } });
    apiMocks.withdrawChallengeQuestion.mockResolvedValue({ ok: true });
    apiMocks.getChallengeRolloutConfig.mockResolvedValue({ ok: true, config: { enabled: true, mode: 'pilot', scope: 'single-class' } });
    apiMocks.getProgressBoardRolloutConfig.mockResolvedValue({ ok: true, config: { enabled: false } });
    apiMocks.getProgressBoard.mockResolvedValue({ ok: true, data: progressBoardData });
    classroomMocks.useClassroomFriends.mockReturnValue({
      friends: [classroomFriend],
      unreadCount: classroomFriend.unreadCount,
      messageRevision: 0,
      loading: false,
      error: null,
      refresh: vi.fn(async () => undefined),
      clear: vi.fn(),
      markFriendRead: vi.fn(),
    });
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
  });

  afterEach(() => {
    act(() => root.unmount());
    mount.remove();
    document.body.style.overflow = '';
  });

  it('keeps the account flow coherent and clears owned UI after a failed network logout', async () => {
    act(() => root.render(createElement(App)));
    await settle();

    expect(mount.querySelector('[data-birthday-celebration]')).not.toBeNull();
    expect(mount.textContent).not.toMatch(/\b\d+\s*tuổi\b/i);
    expect(mount.textContent).not.toContain(studentProfile.birthDate);
    act(() => mount.querySelector<HTMLButtonElement>('[aria-label="Đóng lời chúc sinh nhật"]')?.click());

    clickText(mount, '[aria-label="Mở menu tài khoản"]', '');
    clickText(mount, '[role="menuitem"]', 'Hồ sơ');
    await settle();
    expect((mount.querySelector('#profile-birth-date') as HTMLInputElement | null)?.value).toBe(studentProfile.birthDate);
    expect(mount.querySelector('[data-avatar-option="fox-leaf"]')).not.toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
    expect(mount.querySelector('.profile-dialog')).not.toBeNull();
    act(() => mount.querySelector<HTMLButtonElement>('[aria-label="Đóng hồ sơ"]')?.click());

    clickText(mount, '[aria-label="Mở menu tài khoản"]', '');
    clickText(mount, '[role="menuitem"]', 'Phụ huynh');
    const parentPin = mount.querySelector<HTMLInputElement>('#parent-pin');
    expect(parentPin).not.toBeNull();
    act(() => setInputValue(parentPin!, '246810'));
    act(() => mount.querySelector<HTMLButtonElement>('.auth-modal .auth-submit')?.click());
    await settle();
    expect(mount.querySelector('[data-parent-profile-card]')).not.toBeNull();
    expect(mount.querySelector('[data-parent-profile-card] time')?.getAttribute('datetime')).toBe(studentProfile.birthDate);

    act(() => mount.querySelector<HTMLInputElement>('[data-parent-profile-card] [role="switch"]')?.click());
    await settle();
    expect(apiMocks.updateParentProfilePreferences).toHaveBeenCalledWith(true);
    expect(mount.querySelector<HTMLInputElement>('[data-parent-profile-card] [role="switch"]')?.checked).toBe(true);

    act(() => mount.querySelector<HTMLButtonElement>('.parent-lock-button')?.click());
    await settle();
    expect(mount.querySelector('[data-parent-profile-card]')).toBeNull();
    expect(mount.querySelector('[data-parent-scroll-region="lessons"]')).toBeNull();

    clickText(mount, '[aria-label="Mở menu tài khoản"]', '');
    clickText(mount, '[role="menuitem"]', 'Đăng xuất');
    await settle();
    expect(mount.querySelector('#auth-title')?.textContent).toContain('Đăng nhập');
    expect(mount.querySelector('[aria-label="Mở menu tài khoản"]')).toBeNull();
    expect(mount.querySelector('[data-parent-profile-card]')).toBeNull();
    expect(mount.querySelector('[data-birthday-celebration]')).toBeNull();
    expect(mount.textContent).not.toContain(studentProfile.birthDate);
    expect(mount.textContent).not.toContain('Hồ sơ của con');
  });

  it('does not leave the journey loading when profile hydration finishes before progress hydration', async () => {
    const profileRequest = deferred<{ ok: true; profile: StudentProfileView }>();
    const progressRequest = deferred<{ ok: true; snapshot: ReturnType<typeof createAccountProgressSnapshot> }>();
    apiMocks.getStudentProfile.mockReturnValue(profileRequest.promise);
    apiMocks.getAccountProgress.mockReturnValue(progressRequest.promise);

    act(() => root.render(createElement(App)));
    await settle();
    expect(mount.querySelector('h1')?.textContent).toContain('Đang tải tiến độ');

    await act(async () => { profileRequest.resolve({ ok: true, profile: studentProfile }); await Promise.resolve(); });
    await settle();
    expect(mount.querySelector('h1')?.textContent).toContain('Đang tải tiến độ');

    const { snapshot } = createDashboard();
    await act(async () => { progressRequest.resolve({ ok: true, snapshot }); await Promise.resolve(); });
    await settle();
    expect(mount.querySelector('#journey-title')?.textContent).toBe('Ba lô thám hiểm');
  });

  it('opens the classroom friends dialog for a full student session and closes it on logout', async () => {
    act(() => root.render(createElement(App)));
    await settle();
    act(() => mount.querySelector<HTMLButtonElement>('[aria-label="Đóng lời chúc sinh nhật"]')?.click());

    expect(classroomMocks.useClassroomFriends).toHaveBeenLastCalledWith(true, false, session.account.id);
    const friendsButton = mount.querySelector<HTMLButtonElement>('[data-journey-feature="friends"]');
    expect(friendsButton).not.toBeNull();
    expect(friendsButton?.querySelector('[data-friends-unread-badge]')?.textContent).toBe('3');
    act(() => friendsButton?.click());

    expect(mount.querySelector('[data-friend-list-dialog]')).not.toBeNull();
    expect(mount.textContent).toContain('Bạn Lan');
    expect(classroomMocks.useClassroomFriends).toHaveBeenLastCalledWith(true, true, session.account.id);
    act(() => mount.querySelector<HTMLButtonElement>('[aria-label="Đóng danh sách bạn bè"]')?.click());
    expect(classroomMocks.useClassroomFriends).toHaveBeenLastCalledWith(true, false, session.account.id);
    act(() => friendsButton?.click());
    expect(classroomMocks.useClassroomFriends).toHaveBeenLastCalledWith(true, true, session.account.id);
    expect(document.body.style.overflow).toBe('hidden');

    clickText(mount, '[aria-label="Mở menu tài khoản"]', '');
    clickText(mount, '[role="menuitem"]', 'Đăng xuất');
    await settle();

    expect(mount.querySelector('[data-friend-list-dialog]')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps the progress board data endpoint gated when rollout is disabled', async () => {
    act(() => root.render(createElement(App)));
    await settle();
    act(() => mount.querySelector<HTMLButtonElement>('[aria-label="Đóng lời chúc sinh nhật"]')?.click());

    act(() => mount.querySelector<HTMLButtonElement>('[data-journey-feature="progress"]')?.click());
    expect(mount.querySelector('[data-coming-soon-dialog="progress"]')).not.toBeNull();
    expect(mount.textContent).toContain('Bảng tiến bộ đang được phát triển');
    expect(apiMocks.getProgressBoard).not.toHaveBeenCalled();
  });

  it('opens the personal progress board after rollout is enabled and preserves the Journey view', async () => {
    apiMocks.getProgressBoardRolloutConfig.mockResolvedValue({ ok: true, config: { enabled: true } });
    act(() => root.render(createElement(App)));
    await settle();
    act(() => mount.querySelector<HTMLButtonElement>('[aria-label="Đóng lời chúc sinh nhật"]')?.click());

    act(() => mount.querySelector<HTMLButtonElement>('[data-journey-feature="progress"]')?.click());
    await settle();
    expect(mount.querySelector('[data-progress-board-dialog]')).not.toBeNull();
    expect(mount.textContent).toContain('Bảng tiến bộ');
    expect(mount.querySelector('#journey-title')).not.toBeNull();
    expect(apiMocks.getProgressBoard).toHaveBeenCalledOnce();
    expect(apiMocks.getProgressBoardRolloutConfig).toHaveBeenCalledTimes(2);
    expect(document.body.style.overflow).toBe('hidden');

    act(() => mount.querySelector<HTMLButtonElement>('[aria-label="Đóng Bảng tiến bộ"]')?.click());
    expect(mount.querySelector('[data-progress-board-dialog]')).toBeNull();
    expect(mount.querySelector('#journey-title')).not.toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps the cached generation when the initial account progress request is unavailable', async () => {
    const { snapshot } = createDashboard();
    const cachedSnapshot = { ...snapshot, generation: 4 };
    expect(saveAccountProgressSnapshot(cachedSnapshot)).toBe(true);
    apiMocks.getAccountProgress.mockResolvedValue({ ok: false, code: 'unavailable', message: 'offline' });
    apiMocks.getProgressBoardRolloutConfig.mockResolvedValue({ ok: true, config: { enabled: true } });
    apiMocks.getProgressBoard.mockResolvedValue({ ok: true, data: { ...progressBoardData, generation: '4' } });

    act(() => root.render(createElement(App)));
    await settle();
    act(() => mount.querySelector<HTMLButtonElement>('[aria-label="Đóng lời chúc sinh nhật"]')?.click());
    act(() => mount.querySelector<HTMLButtonElement>('[data-journey-feature="progress"]')?.click());
    await settle();

    expect(mount.querySelector('[data-progress-board-dialog]')).not.toBeNull();
    expect(mount.querySelector('[data-progress-board-state="unavailable"]')).toBeNull();
    expect(apiMocks.getProgressBoard).toHaveBeenCalledOnce();
  });

  it('waits for a rollout acknowledgement and closes the challenge when the server kill switch turns off', async () => {
    apiMocks.getChallengeRolloutConfig
      .mockResolvedValueOnce({ ok: true, config: { enabled: true, mode: 'pilot', scope: 'single-class' } })
      .mockResolvedValueOnce({ ok: true, config: { enabled: false, mode: 'off', scope: 'single-class' } });
    act(() => root.render(createElement(App)));
    await settle();
    act(() => mount.querySelector<HTMLButtonElement>('[aria-label="Đóng lời chúc sinh nhật"]')?.click());

    act(() => mount.querySelector<HTMLButtonElement>('[data-journey-feature="challenge"]')?.click());
    expect(mount.querySelector('[data-test-challenge-dialog]')).not.toBeNull();

    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); await settle(); });
    expect(mount.querySelector('[data-test-challenge-dialog]')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(apiMocks.getChallengeRolloutConfig).toHaveBeenCalledTimes(2);
  });

  it('does not open the live challenge before the rollout config is acknowledged', async () => {
    apiMocks.getChallengeRolloutConfig.mockResolvedValue({ ok: true, config: { enabled: false, mode: 'off', scope: 'single-class' } });
    act(() => root.render(createElement(App)));
    await settle();
    act(() => mount.querySelector<HTMLButtonElement>('[aria-label="Đóng lời chúc sinh nhật"]')?.click());

    act(() => mount.querySelector<HTMLButtonElement>('[data-journey-feature="challenge"]')?.click());
    expect(mount.querySelector('[data-test-challenge-dialog]')).toBeNull();
    expect(mount.querySelector('[data-coming-soon-dialog="challenge"]')).not.toBeNull();
  });

  it('keeps the desktop landscape pet adjustment separate from the mobile transform', () => {
    const stylesSource = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
    expect(stylesSource).toMatch(/@media \(orientation: landscape\) and \(min-width: 701px\)\s*\{\s*\.pet-zone \{ transform: translateY\(48px\); \}/);
    expect(stylesSource).toMatch(/@media \(max-width: 700px\)[\s\S]*?\.pet-zone \{[^}]*transform: translateY\(28px\);/);
  });
});

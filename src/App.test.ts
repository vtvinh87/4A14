import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ParentDashboardData } from '../shared/dashboard-contracts';
import type { StudentProfileView } from '../shared/account-contracts';
import type { ClientSession } from './auth/apiClient';
import { createAccountProgressSnapshot } from './progress/accountProgress';
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
}));

vi.mock('./auth/apiClient', async () => {
  const actual = await vi.importActual<typeof import('./auth/apiClient')>('./auth/apiClient');
  return { ...actual, ...apiMocks };
});

vi.mock('./components/Pet', () => ({ Pet: () => null }));

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
});

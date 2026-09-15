import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudentProfileView } from '../../../shared/account-contracts';
import type { ParentDashboardData } from '../../../shared/dashboard-contracts';
import type { ClientSession } from '../../auth/apiClient';
import { App } from '../../App';
import { createAccountProgressSnapshot } from '../../progress/accountProgress';
import { createDefaultProgress } from '../../progress/storage';
import { StudentProfileCard } from './StudentProfileCard';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const apiMocks = vi.hoisted(() => ({
  getCurrentAuthSession: vi.fn(),
  getStudentProfile: vi.fn(),
  getAccountProgress: vi.fn(),
  unlockParent: vi.fn(),
  getParentDashboard: vi.fn(),
  getParentProfile: vi.fn(),
  updateParentProfilePreferences: vi.fn(),
  lockParent: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../../auth/apiClient', async () => {
  const actual = await vi.importActual<typeof import('../../auth/apiClient')>('../../auth/apiClient');
  return { ...actual, ...apiMocks };
});

vi.mock('../../components/Pet', () => ({ Pet: () => null }));

const profile: StudentProfileView = {
  accountId: 'student-1',
  username: 'bao04',
  displayName: 'Bé Bảo',
  avatarId: 'fox-leaf',
  birthDate: '2016-09-14',
  birthdayWishesEnabled: false,
};

describe('StudentProfileCard', () => {
  let root: Root;
  let mount: HTMLDivElement;

  const renderCard = (overrides: Partial<Parameters<typeof StudentProfileCard>[0]> = {}) => {
    const props = {
      profile,
      busy: false,
      onBirthdayWishesEnabledChange: vi.fn(),
      ...overrides,
    };
    act(() => root.render(createElement(StudentProfileCard, props)));
    return props;
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
  });

  afterEach(() => {
    act(() => root.unmount());
    mount.remove();
  });

  it('shows only the granted child profile and defaults birthday wishes to off', () => {
    renderCard();

    expect(mount.querySelector('[data-parent-profile-card]')).not.toBeNull();
    expect(mount.textContent).toContain('Bé Bảo');
    expect(mount.querySelector('time[datetime="2016-09-14"]')?.textContent).toBe('14/09/2016');
    expect(mount.querySelector<HTMLImageElement>('[data-parent-profile-avatar] img')?.src).toMatch(/\/art\/fox-pet-alpha\.png$/);

    const toggle = mount.querySelector<HTMLInputElement>('[role="switch"]');
    expect(toggle?.checked).toBe(false);
    expect(toggle?.disabled).toBe(false);
  });

  it('sends only the next boolean preference and leaves state controlled by the safe profile', () => {
    const onBirthdayWishesEnabledChange = vi.fn();
    renderCard({ onBirthdayWishesEnabledChange });
    const toggle = mount.querySelector<HTMLInputElement>('[role="switch"]')!;

    act(() => toggle.click());

    expect(onBirthdayWishesEnabledChange).toHaveBeenCalledOnce();
    expect(onBirthdayWishesEnabledChange).toHaveBeenCalledWith(true);
    expect(toggle.checked).toBe(false);

    act(() => root.render(createElement(StudentProfileCard, {
      profile: { ...profile, birthdayWishesEnabled: true },
      busy: false,
      onBirthdayWishesEnabledChange,
    })));
    expect(mount.querySelector<HTMLInputElement>('[role="switch"]')?.checked).toBe(true);
  });

  it('disables the preference and avoids guessing when the grant-scoped profile is unavailable', () => {
    renderCard({ profile: null, unavailableMessage: 'Chưa thể tải hồ sơ phụ huynh.' });

    expect(mount.textContent).toContain('Chưa thể tải hồ sơ phụ huynh.');
    expect(mount.textContent).not.toContain('Bé Bảo');
    expect(mount.querySelector('time[datetime="2016-09-14"]')).toBeNull();
    expect(mount.querySelector<HTMLInputElement>('[role="switch"]')?.disabled).toBe(true);

    act(() => root.render(createElement(StudentProfileCard, { profile, busy: true, onBirthdayWishesEnabledChange: vi.fn() })));
    expect(mount.querySelector<HTMLInputElement>('[role="switch"]')?.disabled).toBe(true);
  });

  it('preserves the previous switch state and reports a localized update failure', async () => {
    const onBirthdayWishesEnabledChange = vi.fn(async () => {
      throw new Error('Máy chủ tạm thời không khả dụng.');
    });
    renderCard({ onBirthdayWishesEnabledChange });
    const toggle = mount.querySelector<HTMLInputElement>('[role="switch"]')!;

    await act(async () => {
      toggle.click();
      await Promise.resolve();
    });

    expect(toggle.checked).toBe(false);
    expect(mount.querySelector('[role="alert"]')?.textContent).toContain('Máy chủ tạm thời không khả dụng.');
  });

  it('clears the parent profile through App when a dashboard range refresh fails', async () => {
    const progress = createDefaultProgress();
    const snapshot = createAccountProgressSnapshot('student-1', progress);
    const session: ClientSession = {
      account: { id: 'student-1', username: 'bao04', displayName: 'Bé Bảo', role: 'student', active: true, credentialVersion: 1 },
      mode: 'full',
      changeKind: null,
      createdAt: '2026-09-14T05:00:00.000Z',
      expiresAt: '2026-09-21T05:00:00.000Z',
      parentGrantUntil: '2026-09-14T05:15:00.000Z',
      mustChange: false,
    };
    const parentProfile: StudentProfileView = { ...profile, accountId: 'student-1' };
    const dashboard: ParentDashboardData = {
      schemaVersion: 1,
      ruleVersion: 'dashboard-rules-v1',
      studentId: 'student-1',
      range: 'all',
      generatedAt: '2026-09-14T05:00:00.000Z',
      lastSyncedAt: '2026-09-14T05:00:00.000Z',
      snapshot,
      metrics: {
        range: 'all', activitySample: 0, totalAttempts: 0, retryAttempts: 0, firstAttemptCorrect: 0, firstAttemptAccuracy: null,
        hintActivities: 0, hintRate: null, activeDays: 0, estimatedMinutes: 0, completedLessons: 0, totalLessons: 29,
        completedMissions: 0, totalMissions: 145, stamps: 0, totalStamps: 29, lastActivityAt: null, dataQuality: 'none',
      },
      activities: [],
      lessons: [],
      suggestions: [],
      events: [],
    };

    apiMocks.getCurrentAuthSession.mockResolvedValue({ ok: true, session });
    apiMocks.getStudentProfile.mockResolvedValue({ ok: true, profile: parentProfile });
    apiMocks.getAccountProgress.mockResolvedValue({ ok: true, snapshot });
    apiMocks.unlockParent.mockResolvedValue({ ok: true, session, parentGrantUntil: session.parentGrantUntil, parentGrantToken: 'grant-token' });
    apiMocks.getParentProfile.mockResolvedValue({ ok: true, profile: parentProfile });
    apiMocks.getParentDashboard
      .mockResolvedValueOnce({ ok: true, studentId: 'student-1', snapshot, dashboard, events: [] })
      .mockResolvedValueOnce({ ok: false, code: 'unavailable', message: 'Dashboard tạm thời không khả dụng.' });
    apiMocks.lockParent.mockResolvedValue({ ok: true });
    apiMocks.logout.mockResolvedValue({ ok: true });
    let resolvePreference!: (value: { ok: true; profile: StudentProfileView }) => void;
    apiMocks.updateParentProfilePreferences.mockReturnValue(new Promise((resolve) => { resolvePreference = resolve; }));

    const settle = async () => {
      await act(async () => {
        for (let index = 0; index < 8; index += 1) await Promise.resolve();
      });
    };
    const clickByText = (selector: string, text: string) => {
      const element = Array.from(mount.querySelectorAll<HTMLElement>(selector)).find((candidate) => candidate.textContent?.includes(text));
      expect(element).toBeDefined();
      act(() => element?.click());
    };

    act(() => root.render(createElement(App)));
    await settle();
    clickByText('button[aria-label="Mở menu tài khoản"]', '');
    clickByText('[role="menuitem"]', 'Phụ huynh');

    const parentPin = mount.querySelector<HTMLInputElement>('#parent-pin');
    expect(parentPin).not.toBeNull();
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(parentPin, '123456');
      parentPin?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => mount.querySelector<HTMLButtonElement>('[role="dialog"] .auth-submit')?.click());
    await settle();

    expect(mount.querySelector('time[datetime="2016-09-14"]')?.textContent).toBe('14/09/2016');
    expect(mount.querySelector<HTMLInputElement>('[data-parent-profile-card] [role="switch"]')?.disabled).toBe(false);

    act(() => mount.querySelector<HTMLInputElement>('[data-parent-profile-card] [role="switch"]')?.click());
    await settle();
    expect(apiMocks.updateParentProfilePreferences).toHaveBeenCalledWith(true);

    clickByText('button', '30 ngày');
    await settle();

    expect(apiMocks.getParentDashboard).toHaveBeenLastCalledWith('30d');
    expect(mount.querySelector('time[datetime="2016-09-14"]')).toBeNull();
    expect(mount.querySelector<HTMLInputElement>('[data-parent-profile-card] [role="switch"]')?.disabled).toBe(true);
    expect(mount.querySelector('[data-parent-profile-card]')?.textContent).toContain('Hồ sơ phụ huynh chưa sẵn sàng');
    expect(mount.textContent).toContain('Theo dõi Bé Bảo');
    expect(mount.querySelector('.parent-range-switch button[aria-pressed="true"]')?.textContent).toContain('Toàn bộ');
    expect(apiMocks.lockParent).not.toHaveBeenCalled();

    resolvePreference({ ok: true, profile: { ...parentProfile, birthdayWishesEnabled: true } });
    await settle();
    expect(mount.querySelector('time[datetime="2016-09-14"]')).toBeNull();
    expect(mount.querySelector<HTMLInputElement>('[data-parent-profile-card] [role="switch"]')?.disabled).toBe(true);
  });
});

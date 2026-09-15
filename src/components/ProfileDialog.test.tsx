import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudentProfileView } from '../../shared/account-contracts';
import { isCurrentSessionRequest } from '../App';
import { ProfileDialog } from './ProfileDialog';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const profile: StudentProfileView = {
  accountId: 'student-1',
  username: 'bao04',
  displayName: 'Bé Bảo',
  avatarId: 'fox-scout',
  birthDate: '2016-09-14',
  birthdayWishesEnabled: false,
};

function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('ProfileDialog', () => {
  let root: Root;
  let mount: HTMLDivElement;

  const renderDialog = (overrides: Partial<Parameters<typeof ProfileDialog>[0]> = {}) => {
    const props = {
      profile,
      onSave: vi.fn(async () => undefined),
      onChangePin: vi.fn(async () => undefined),
      onClose: vi.fn(),
      onLogout: vi.fn(),
      ...overrides,
    };
    act(() => root.render(createElement(ProfileDialog, props)));
    return props;
  };

  beforeEach(() => {
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
  });

  afterEach(() => {
    act(() => root.unmount());
    mount.remove();
  });

  it('keeps username read-only and exposes only four allowlisted avatar presets', () => {
    renderDialog();

    const username = mount.querySelector<HTMLInputElement>('#profile-username');
    expect(username?.readOnly).toBe(true);
    expect(mount.querySelector('input[type="date"]')?.id).toBe('profile-birth-date');
    expect(mount.querySelectorAll('[data-avatar-option]')).toHaveLength(4);
    expect(mount.querySelectorAll('input[type="file"]')).toHaveLength(0);
    expect(mount.querySelector('input[placeholder*="http"]')).toBeNull();
    expect(Array.from(mount.querySelectorAll<HTMLImageElement>('[data-avatar-option] img')).every((image) => image.src.endsWith('/art/fox-pet-alpha.png'))).toBe(true);
  });

  it('validates display name and future birth date before saving', () => {
    const onSave = vi.fn(async () => undefined);
    renderDialog({ onSave });
    const name = mount.querySelector<HTMLInputElement>('#profile-display-name')!;
    const birthDate = mount.querySelector<HTMLInputElement>('#profile-birth-date')!;
    const form = mount.querySelector('form')!;

    act(() => setInputValue(name, '   '));
    act(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(onSave).not.toHaveBeenCalled();
    expect(mount.textContent).toContain('Tên hiển thị không được để trống.');

    act(() => setInputValue(name, 'Bé Bảo mới'));
    act(() => setInputValue(birthDate, '2999-01-01'));
    act(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(onSave).not.toHaveBeenCalled();
    expect(mount.textContent).toContain('Ngày sinh không được ở tương lai.');
  });

  it('preserves the draft when the profile save is rejected', async () => {
    const onSave = vi.fn(async () => { throw new Error('Máy chủ tạm thời không khả dụng.'); });
    renderDialog({ onSave });
    const name = mount.querySelector<HTMLInputElement>('#profile-display-name')!;
    const form = mount.querySelector('form')!;

    act(() => setInputValue(name, 'Tên nháp chưa mất'));
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledOnce();
    expect(name.value).toBe('Tên nháp chưa mất');
    expect(mount.textContent).toContain('Máy chủ tạm thời không khả dụng.');
  });

  it('sends only the changed display name instead of overwriting untouched profile fields', async () => {
    const onSave = vi.fn(async () => undefined);
    renderDialog({ onSave });
    const name = mount.querySelector<HTMLInputElement>('#profile-display-name')!;
    const form = mount.querySelector<HTMLFormElement>('form')!;

    act(() => setInputValue(name, 'Tên mới'));
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledWith({ displayName: 'Tên mới' });
  });

  it('allows a safe empty patch when the profile draft is unchanged', async () => {
    const onSave = vi.fn(async () => undefined);
    renderDialog({ onSave });
    const form = mount.querySelector<HTMLFormElement>('form')!;

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledWith({});
  });

  it('sends the avatar only when the user deliberately selects a new preset', async () => {
    const onSave = vi.fn(async () => undefined);
    renderDialog({ onSave });
    const avatar = mount.querySelector<HTMLButtonElement>('[data-avatar-option="fox-leaf"]')!;
    const form = mount.querySelector<HTMLFormElement>('form')!;

    act(() => avatar.click());
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledWith({ avatarId: 'fox-leaf' });
  });

  it('sends a changed birth date and sends null when the user clears it', async () => {
    const onSave = vi.fn(async () => undefined);
    renderDialog({ onSave });
    const birthDate = mount.querySelector<HTMLInputElement>('#profile-birth-date')!;
    const form = mount.querySelector<HTMLFormElement>('form')!;

    act(() => setInputValue(birthDate, '2017-09-14'));
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(onSave).toHaveBeenLastCalledWith({ birthDate: '2017-09-14' });

    act(() => setInputValue(birthDate, ''));
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(onSave).toHaveBeenLastCalledWith({ birthDate: null });
  });

  it('uses three six-cell PIN fields and calls the change handler only for valid matching values', async () => {
    const onChangePin = vi.fn(async () => undefined);
    renderDialog({ onChangePin });
    const toggle = Array.from(mount.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('Đổi mã PIN'))!;

    act(() => toggle.click());
    expect(mount.querySelectorAll('[data-pin-cell]')).toHaveLength(18);
    expect(mount.querySelector('#profile-current-pin')?.getAttribute('autocomplete')).toBe('current-password');
    expect(mount.querySelector('#profile-new-pin')?.getAttribute('autocomplete')).toBe('new-password');
    expect(mount.querySelector('#profile-confirm-pin')?.getAttribute('autocomplete')).toBe('new-password');

    const pinForm = mount.querySelector<HTMLFormElement>('#profile-pin-form')!;
    const [current, next, confirmation] = Array.from(pinForm.querySelectorAll<HTMLInputElement>('input'));
    act(() => {
      setInputValue(current, '246810');
      setInputValue(next, '135790');
      setInputValue(confirmation, '135791');
      pinForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(onChangePin).not.toHaveBeenCalled();
    expect(mount.textContent).toContain('Hai lần nhập mã PIN mới chưa giống nhau.');

    act(() => setInputValue(confirmation, '135790'));
    await act(async () => {
      pinForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(onChangePin).toHaveBeenCalledWith('246810', '135790');
    expect(current.value).toBe('');
    expect(next.value).toBe('');
    expect(confirmation.value).toBe('');
  });
});

describe('App session request generation guard', () => {
  it('rejects a stale same-account response after the session epoch changes', () => {
    const request = { accountId: 'student-1', epoch: 7 };

    expect(isCurrentSessionRequest('student-1', 7, request)).toBe(true);
    expect(isCurrentSessionRequest('student-1', 8, request)).toBe(false);
    expect(isCurrentSessionRequest('student-2', 7, request)).toBe(false);
  });
});

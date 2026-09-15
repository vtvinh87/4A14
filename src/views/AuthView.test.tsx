import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangePinView, LoginView, ParentPinChangeDialog, ParentPinDialog } from './AuthView';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('account entry views', () => {
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

  it('submits a student username and six digit PIN', () => {
    const onLogin = vi.fn();
    act(() => root.render(createElement(LoginView, { onStudentLogin: onLogin, onAdminLogin: vi.fn() })));
    const inputs = mount.querySelectorAll('input');
    act(() => {
      const username = inputs[0] as HTMLInputElement;
      const pin = inputs[1] as HTMLInputElement;
      username.value = 'bao04';
      pin.value = '012345';
      username.dispatchEvent(new Event('input', { bubbles: true }));
      pin.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => mount.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(onLogin).toHaveBeenCalledWith('bao04', '012345');
  });

  it('shows the concise Admin contact without the old login explanation', () => {
    act(() => root.render(createElement(LoginView, { onStudentLogin: vi.fn(), onAdminLogin: vi.fn() })));

    expect(mount.textContent).not.toContain('Nhập tên tài khoản và mã PIN 6 số mà Admin đã cấp cho con.');
    expect(mount.textContent).toContain('Liên hệ Admin để tạo tài khoản hoặc đặt lại mật khẩu.');

    const zalo = mount.querySelector<HTMLAnchorElement>('a.auth-admin-contact');
    expect(zalo?.textContent).toBe('Thành Vinh');
    expect(zalo?.querySelector('img.auth-admin-icon')?.getAttribute('src')).toBe('/art/hud/zalo.webp');
    expect(zalo?.querySelector('img.auth-admin-icon')?.getAttribute('alt')).toBe('');
    expect(zalo?.getAttribute('href')).toBe('https://zalo.me/0948584429');
    expect(zalo?.getAttribute('target')).toBe('_blank');
    expect(zalo?.getAttribute('rel')).toBe('noreferrer');
  });

  it('requires matching replacement PINs before calling the change handler', () => {
    const onChange = vi.fn();
    act(() => root.render(createElement(ChangePinView, { title: 'Đổi mã PIN', kind: 'student', onChange, onLogout: vi.fn() })));
    const inputs = mount.querySelectorAll('input');
    act(() => {
      const next = inputs[0] as HTMLInputElement;
      const confirmation = inputs[1] as HTMLInputElement;
      next.value = '246810';
      confirmation.value = '246810';
      next.dispatchEvent(new Event('input', { bubbles: true }));
      confirmation.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => mount.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(onChange).toHaveBeenCalledWith('246810', '246810');
  });

  it('explains why the parent PIN is requested for the signed-in child', () => {
    act(() => root.render(createElement(ParentPinDialog, { childName: 'Bé Bảo', onSubmit: vi.fn(), onCancel: vi.fn() })));
    expect(mount.textContent).toContain('Bé Bảo');
    expect(mount.textContent).toContain('mã PIN phụ huynh');
  });

  it('requires the current parent PIN before submitting a replacement', () => {
    const onChange = vi.fn();
    act(() => root.render(createElement(ParentPinChangeDialog, { childName: 'Bé Bảo', onSubmit: onChange, onCancel: vi.fn() })));
    act(() => {
      const inputs = mount.querySelectorAll('input');
      for (const [index, value] of ['864208', '246810', '246810'].entries()) (inputs[index] as HTMLInputElement).value = value;
      for (const input of inputs) input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => mount.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(onChange).toHaveBeenCalledWith('864208', '246810');
  });

  it('uses six-cell numeric PIN controls across every PIN surface', () => {
    act(() => root.render(createElement(LoginView, { onStudentLogin: vi.fn(), onAdminLogin: vi.fn() })));
    expect(mount.querySelectorAll('[data-pin-cell]')).toHaveLength(6);
    expect(mount.querySelector('#auth-pin')?.getAttribute('autocomplete')).toBe('current-password');

    act(() => root.render(createElement(ChangePinView, { title: 'Đổi mã PIN', kind: 'student', onChange: vi.fn(), onLogout: vi.fn() })));
    expect(mount.querySelectorAll('[data-pin-cell]')).toHaveLength(12);
    expect(mount.querySelector('#new-pin')?.getAttribute('autocomplete')).toBe('new-password');
    expect(mount.querySelector('#confirm-pin')?.getAttribute('autocomplete')).toBe('new-password');

    act(() => root.render(createElement(ParentPinDialog, { childName: 'Bé Bảo', onSubmit: vi.fn(), onCancel: vi.fn() })));
    expect(mount.querySelectorAll('[data-pin-cell]')).toHaveLength(6);
    expect(mount.querySelector('#parent-pin')?.getAttribute('autocomplete')).toBe('current-password');

    act(() => root.render(createElement(ParentPinChangeDialog, { childName: 'Bé Bảo', onSubmit: vi.fn(), onCancel: vi.fn() })));
    expect(mount.querySelectorAll('[data-pin-cell]')).toHaveLength(18);
    expect(mount.querySelector('#current-parent-pin')?.getAttribute('autocomplete')).toBe('current-password');
    expect(mount.querySelector('#new-parent-pin')?.getAttribute('autocomplete')).toBe('new-password');
    expect(mount.querySelector('#confirm-parent-pin')?.getAttribute('autocomplete')).toBe('new-password');
  });
});

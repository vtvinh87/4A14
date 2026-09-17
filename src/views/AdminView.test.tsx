import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientAccount } from '../auth/apiClient';

const apiMocks = vi.hoisted(() => ({
  createStudentAccount: vi.fn(),
  listStudentAccounts: vi.fn(),
  resetStudentPin: vi.fn(),
  updateStudentAccount: vi.fn(),
}));

vi.mock('../auth/apiClient', () => apiMocks);

import { AdminView } from './AdminView';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function account(id: string, displayName: string): ClientAccount {
  return { id, username: id, displayName, role: 'student', active: true, credentialVersion: 1 };
}

async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('AdminView', () => {
  let mount: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    mount = document.createElement('div');
    document.body.appendChild(mount);
    root = createRoot(mount);
    apiMocks.listStudentAccounts.mockResolvedValue({ ok: true, accounts: [] });
    apiMocks.createStudentAccount.mockResolvedValue({ ok: true, account: account('bao04', 'Bé Bảo') });
    apiMocks.resetStudentPin.mockResolvedValue({ ok: true });
    apiMocks.updateStudentAccount.mockResolvedValue({ ok: true, account: account('bao04', 'Bé Bảo') });
  });

  afterEach(() => {
    act(() => root.unmount());
    mount.remove();
  });

  it('shows the server-acknowledged account before background revalidation finishes', async () => {
    await act(async () => root.render(createElement(AdminView, { onLogout: vi.fn() })));
    await settle();

    let resolveRevalidation!: (value: { ok: true; accounts: ClientAccount[] }) => void;
    apiMocks.listStudentAccounts.mockReturnValueOnce(new Promise((resolve) => { resolveRevalidation = resolve; }));

    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    act(() => {
      const input = mount.querySelector<HTMLInputElement>('#student-username')!;
      valueSetter.call(input, 'bao04');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => {
      const input = mount.querySelector<HTMLInputElement>('#student-display-name')!;
      valueSetter.call(input, 'Bé Bảo');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      mount.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiMocks.createStudentAccount).toHaveBeenCalledWith('bao04', 'Bé Bảo');
    expect(mount.querySelector('[role="status"]')?.textContent).toContain('Đã tạo tài khoản');
    expect(mount.textContent).toContain('Bé Bảo');
    expect(mount.textContent).toContain('@bao04');
    expect(apiMocks.listStudentAccounts).toHaveBeenCalledTimes(2);

    resolveRevalidation({ ok: true, accounts: [account('bao04', 'Bé Bảo')] });
    await settle();
    expect(mount.querySelectorAll('.admin-student-row')).toHaveLength(1);
  });
});

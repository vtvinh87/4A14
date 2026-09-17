import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChallengeReportDialog } from './ChallengeReportDialog';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function setValue(element: HTMLTextAreaElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

async function settle(): Promise<void> {
  await act(async () => {
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
  });
}

describe('ChallengeReportDialog', () => {
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

  it('requires a reason and keeps typed details when the report is rejected', async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn(async () => false);
    act(() => root.render(createElement(ChallengeReportDialog, { onClose, onSubmit })));

    act(() => mount.querySelector<HTMLButtonElement>('[data-challenge-report-submit]')?.click());
    expect(mount.querySelector('[data-challenge-report-error]')?.textContent).toContain('chọn một lý do');

    act(() => mount.querySelector<HTMLInputElement>('[data-challenge-report-reason="unclear"]')?.click());
    act(() => { setValue(mount.querySelector<HTMLTextAreaElement>('[data-challenge-report-details]')!, 'Con chưa hiểu phần giải thích này.'); });
    act(() => { mount.querySelector<HTMLButtonElement>('[data-challenge-report-submit]')?.click(); });
    await settle();

    expect(onSubmit).toHaveBeenCalledWith({ reason: 'unclear', details: 'Con chưa hiểu phần giải thích này.' });
    expect(mount.querySelector<HTMLTextAreaElement>('[data-challenge-report-details]')?.value).toBe('Con chưa hiểu phần giải thích này.');
    expect(mount.querySelector('[data-challenge-report-error]')?.textContent).toContain('Chưa gửi được');
    expect(onClose).not.toHaveBeenCalled();

    onSubmit.mockResolvedValueOnce(true);
    act(() => { mount.querySelector<HTMLButtonElement>('[data-challenge-report-submit]')?.click(); });
    await settle();
    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on Escape and restores the opener focus after unmount', () => {
    const opener = document.createElement('button');
    document.body.insertBefore(opener, mount);
    opener.focus();
    const onClose = vi.fn();
    act(() => root.render(createElement(ChallengeReportDialog, { onClose, onSubmit: vi.fn() })));
    expect(document.activeElement).toBe(mount.querySelector('[aria-label="Đóng báo cáo"]'));
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onClose).toHaveBeenCalledOnce();
    act(() => root.unmount());
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

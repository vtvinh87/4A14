import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PinField, sanitizePin } from './PinField';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('PinField', () => {
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

  it('renders one accessible password input with six masked cells', () => {
    act(() => root.render(createElement(PinField, {
      id: 'parent-pin',
      label: 'Mã PIN phụ huynh',
      value: '012',
      onChange: vi.fn(),
      autoComplete: 'current-password',
    })));

    const input = mount.querySelector('input') as HTMLInputElement;
    expect(mount.querySelectorAll('[data-pin-cell]')).toHaveLength(6);
    expect(mount.querySelectorAll('.pin-cell.is-filled')).toHaveLength(3);
    expect(input.type).toBe('password');
    expect(input.inputMode).toBe('numeric');
    expect(input.getAttribute('pattern')).toBe('[0-9]*');
    expect(input.maxLength).toBe(6);
    expect(input.autocomplete).toBe('current-password');
    expect(mount.querySelector('label')?.getAttribute('for')).toBe('parent-pin');
    expect(input.id).toBe('parent-pin');
  });

  it('keeps only six ASCII digits and preserves a leading zero', () => {
    const onChange = vi.fn();
    act(() => root.render(createElement(PinField, {
      id: 'new-pin',
      label: 'Mã PIN mới',
      value: '012345',
      onChange,
      autoComplete: 'new-password',
    })));

    const input = mount.querySelector('input') as HTMLInputElement;
    expect(sanitizePin('12a3456')).toBe('123456');
    expect(mount.querySelector('[data-pin-cell="1"]')?.classList.contains('is-filled')).toBe(true);
    act(() => {
      const nativeValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      nativeValueSetter?.call(input, '12a3456');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith('123456');
  });
});

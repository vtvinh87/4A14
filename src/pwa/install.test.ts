import { describe, expect, it, vi } from 'vitest';
import { isIosDevice, isStandaloneDisplay } from './install';

describe('PWA install detection', () => {
  it('detects standalone display mode from the browser media query', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(isStandaloneDisplay({ matchMedia } as unknown as Window, { userAgent: '' })).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(display-mode: standalone)');
  });

  it('recognizes iPhone and touch-enabled iPadOS without misclassifying desktop Chrome', () => {
    expect(isIosDevice({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 })).toBe(true);
    expect(isIosDevice({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true);
    expect(isIosDevice({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36', platform: 'Linux x86_64', maxTouchPoints: 0 })).toBe(false);
  });
});

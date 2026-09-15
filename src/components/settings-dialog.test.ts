import { describe, expect, it } from 'vitest';
import { getFocusableElements, getNextFocusIndex } from './SettingsDialog';

describe('settings dialog focus helpers', () => {
  it('returns only visible, keyboard-reachable controls', () => {
    const container = document.createElement('div');
    container.innerHTML = '<button>One</button><a href="#two">Two</a><button disabled>Disabled</button><div tabindex="-1">Ignored</div><button hidden>Hidden</button>';

    expect(getFocusableElements(container).map((element) => element.textContent)).toEqual(['One', 'Two']);
  });

  it('wraps focus in either direction', () => {
    expect(getNextFocusIndex(0, 3, true)).toBe(2);
    expect(getNextFocusIndex(2, 3, false)).toBe(0);
  });
});

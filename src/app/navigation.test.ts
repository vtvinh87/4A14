import { describe, expect, it } from 'vitest';
import { PRIMARY_VIEWS, getViewLabel } from './navigation';

describe('Học Vui primary navigation', () => {
  it('exposes exactly seven product screens and keeps settings as an overlay', () => {
    expect(PRIMARY_VIEWS).toHaveLength(7);
    expect(PRIMARY_VIEWS.map((view) => view.id)).toEqual([
      'journey',
      'lessons',
      'lesson',
      'reward',
      'pet',
      'collection',
      'parent',
    ]);
    expect(getViewLabel('settings')).toBe('Cài đặt');
  });

  it('returns a human label for every screen id', () => {
    expect(PRIMARY_VIEWS.every((view) => getViewLabel(view.id).length > 0)).toBe(true);
  });
});

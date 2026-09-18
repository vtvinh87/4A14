import { describe, expect, it } from 'vitest';
import { getProgressMapLandmarkDetail } from './progressMapLandmarkDetails';

const landmarkIds = [
  'lung-cu',
  'khue-van-cac',
  'hoa-lu',
  'kim-lien',
  'hue',
  'hoi-an',
  'tay-nguyen-rong-house',
  'mekong-floating-market',
] as const;

describe('progress map landmark detail data', () => {
  it.each(landmarkIds)('has source-backed detail data for %s', (id) => {
    const detail = getProgressMapLandmarkDetail(id);

    expect(detail.id).toBe(id);
    expect(detail.lead.length).toBeGreaterThan(40);
    expect(detail.facts.length).toBeGreaterThanOrEqual(2);
    expect(detail.sourceUrls.length).toBeGreaterThanOrEqual(1);
  });

  it('keeps Kim Lien fact wording geographically precise', () => {
    const detail = getProgressMapLandmarkDetail('kim-lien');
    const copy = [detail.lead, ...detail.facts].join(' ');

    expect(copy).toContain('quê hương');
    expect(copy).toContain('1901–1906');
    expect(copy).toContain('Hoàng Trù');
  });
});

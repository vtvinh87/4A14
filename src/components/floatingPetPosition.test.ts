import { describe, expect, it } from 'vitest';
import {
  FLOATING_PET_EDGE_GAP,
  FLOATING_PET_DRAG_THRESHOLD,
  FLOATING_PET_TOP_THIRD,
  clampFloatingPetPosition,
  getInitialFloatingPetPosition,
  isFloatingPetDrag,
  moveFloatingPetPosition,
  type FloatingPetSize,
  type FloatingViewport,
} from './floatingPetPosition';

const viewport: FloatingViewport = { width: 390, height: 844 };
const size: FloatingPetSize = { width: 300, height: 84 };

describe('floating compact Pet position', () => {
  it('clamps the complete widget inside the viewport', () => {
    expect(clampFloatingPetPosition({ x: 380, y: 800 }, viewport, size)).toEqual({ x: 78, y: 748 });
    expect(clampFloatingPetPosition({ x: -40, y: -20 }, viewport, size)).toEqual({ x: 12, y: 12 });
  });

  it('starts with the widget center at one third of the viewport height on the left', () => {
    const position = getInitialFloatingPetPosition(viewport, size);

    expect(position.x).toBe(FLOATING_PET_EDGE_GAP);
    expect(position.y).toBeCloseTo(viewport.height * FLOATING_PET_TOP_THIRD - size.height / 2, 5);
    expect(position.y + size.height / 2).toBeCloseTo(viewport.height / 3, 5);
  });

  it('distinguishes a tap from a finger or mouse drag', () => {
    expect(isFloatingPetDrag({ x: 100, y: 200 }, { x: 100 + FLOATING_PET_DRAG_THRESHOLD - 1, y: 200 })).toBe(false);
    expect(isFloatingPetDrag({ x: 100, y: 200 }, { x: 100 + FLOATING_PET_DRAG_THRESHOLD, y: 200 })).toBe(true);
  });

  it('clamps drag and resize results using the complete widget size', () => {
    const moved = moveFloatingPetPosition({ x: 78, y: 656 }, { x: -120, y: 140 }, viewport, size);
    expect(moved).toEqual({ x: 12, y: 748 });

    const resized: FloatingViewport = { width: 320, height: 568 };
    expect(clampFloatingPetPosition(moved, resized, size)).toEqual({ x: 12, y: 472 });
  });
});

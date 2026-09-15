export type FloatingPetPosition = {
  x: number;
  y: number;
};

export type FloatingPetSize = {
  width: number;
  height: number;
};

export type FloatingViewport = {
  width: number;
  height: number;
};

export const FLOATING_PET_EDGE_GAP = 12;
export const FLOATING_PET_TOP_THIRD = 1 / 3;
export const FLOATING_PET_DRAG_THRESHOLD = 6;
export const FLOATING_PET_KEYBOARD_STEP = 24;
export const DEFAULT_FLOATING_PET_SIZE: FloatingPetSize = { width: 320, height: 88 };

function clamp(value: number, min: number, max: number): number {
  const finiteValue = Number.isFinite(value) ? value : min;
  return Math.min(Math.max(finiteValue, min), max);
}

export function clampFloatingPetPosition(
  position: FloatingPetPosition,
  viewport: FloatingViewport,
  size: FloatingPetSize,
  edgeGap = FLOATING_PET_EDGE_GAP,
): FloatingPetPosition {
  const maxX = Math.max(edgeGap, viewport.width - size.width - edgeGap);
  const maxY = Math.max(edgeGap, viewport.height - size.height - edgeGap);
  return {
    x: clamp(position.x, edgeGap, maxX),
    y: clamp(position.y, edgeGap, maxY),
  };
}

export function getInitialFloatingPetPosition(
  viewport: FloatingViewport,
  size: FloatingPetSize,
  verticalFraction = FLOATING_PET_TOP_THIRD,
): FloatingPetPosition {
  return clampFloatingPetPosition(
    { x: FLOATING_PET_EDGE_GAP, y: viewport.height * verticalFraction - size.height / 2 },
    viewport,
    size,
  );
}

export function isFloatingPetDrag(
  start: FloatingPetPosition,
  current: FloatingPetPosition,
  threshold = FLOATING_PET_DRAG_THRESHOLD,
): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) >= threshold;
}

export function moveFloatingPetPosition(
  start: FloatingPetPosition,
  delta: FloatingPetPosition,
  viewport: FloatingViewport,
  size: FloatingPetSize,
): FloatingPetPosition {
  return clampFloatingPetPosition({ x: start.x + delta.x, y: start.y + delta.y }, viewport, size);
}

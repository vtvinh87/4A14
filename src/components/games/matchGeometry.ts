export type MatchPoint = { x: number; y: number };

type RectLike = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;

export type CoordinateOffsets = {
  scrollLeft?: number;
  scrollTop?: number;
  borderLeft?: number;
  borderTop?: number;
};

function roundCoordinate(value: number): number {
  return Number(value.toFixed(2));
}

/**
 * Convert a port's viewport rectangle into the coordinate space of the
 * absolutely positioned SVG that lives inside the board surface.
 *
 * The border and scroll offsets are explicit because a lesson panel can be
 * nested inside a scrolling shell. Keeping this calculation in one place
 * prevents the route from drifting away from the visible port.
 */
export function getRelativeCenter(
  elementRect: RectLike,
  containerRect: RectLike,
  offsets: CoordinateOffsets = {},
): MatchPoint {
  const scrollLeft = offsets.scrollLeft ?? 0;
  const scrollTop = offsets.scrollTop ?? 0;
  const borderLeft = offsets.borderLeft ?? 0;
  const borderTop = offsets.borderTop ?? 0;

  return {
    x: roundCoordinate(elementRect.left - containerRect.left + elementRect.width / 2 + scrollLeft - borderLeft),
    y: roundCoordinate(elementRect.top - containerRect.top + elementRect.height / 2 + scrollTop - borderTop),
  };
}

/** Build a smooth horizontal cubic route between the two measured ports. */
export function buildBezierPath(from: MatchPoint, to: MatchPoint): string {
  const horizontalDistance = Math.abs(to.x - from.x);
  const handle = Math.max(48, horizontalDistance * 0.3);
  const controlFrom = { x: from.x + handle, y: from.y };
  const controlTo = { x: to.x - handle, y: to.y };

  return `M ${from.x} ${from.y} C ${roundCoordinate(controlFrom.x)} ${controlFrom.y}, ${roundCoordinate(controlTo.x)} ${controlTo.y}, ${to.x} ${to.y}`;
}

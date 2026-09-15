import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { Match } from '../../content/types';
import { buildBezierPath, getRelativeCenter, type MatchPoint } from './matchGeometry';
import './MatchBoard.css';

const ROUTE_COLORS = ['#D16645', '#3D8295', '#9A5AA7', '#BD8A25', '#3A936F', '#6B6BC2'];

export type MatchBoardProps = {
  activity: Match;
  pairs: [string, string][];
  selectedLeft: string | null;
  selectedRight: string | null;
  onLeft: (id: string) => void;
  onRight: (id: string) => void;
  onConnect?: (leftId: string, rightId: string) => void;
};

type MatchSide = 'left' | 'right';

type BoardGeometry = {
  width: number;
  height: number;
  points: Record<string, MatchPoint>;
};

type DragState = {
  pointerId: number;
  side: MatchSide;
  id: string;
  origin: HTMLButtonElement;
  startX: number;
  startY: number;
  active: boolean;
};

type MatchRoute = {
  id: string;
  from: MatchPoint;
  to: MatchPoint;
  index: number;
  leftId: string;
  rightId: string;
  state: 'connected' | 'preview' | 'dragging';
  showEndpoints: boolean;
};

const EMPTY_GEOMETRY: BoardGeometry = { width: 0, height: 0, points: {} };

function portKey(side: MatchSide, id: string): string {
  return `${side}:${id}`;
}

function routeColor(index: number): string {
  return ROUTE_COLORS[index % ROUTE_COLORS.length];
}

function pairIndexFor(pairs: [string, string][], side: MatchSide, id: string): number {
  return pairs.findIndex(([left, right]) => (side === 'left' ? left : right) === id);
}

function sameGeometry(previous: BoardGeometry, next: BoardGeometry): boolean {
  if (previous.width !== next.width || previous.height !== next.height) return false;
  const previousKeys = Object.keys(previous.points);
  const nextKeys = Object.keys(next.points);
  if (previousKeys.length !== nextKeys.length || previousKeys.some((key) => !next.points[key])) return false;
  return previousKeys.every((key) => {
    const before = previous.points[key];
    const after = next.points[key];
    return before.x === after.x && before.y === after.y;
  });
}

function isOppositeSide(source: MatchSide, target: MatchSide): boolean {
  return source !== target;
}

function getDropCard(event: ReactPointerEvent<HTMLButtonElement>): HTMLElement | null {
  const pointTarget = typeof document.elementFromPoint === 'function'
    ? document.elementFromPoint(event.clientX, event.clientY)
    : null;
  const target = pointTarget ?? (event.target instanceof Element ? event.target : null);
  return target?.closest<HTMLElement>('[data-match-side][data-match-id]') ?? null;
}

function cardStatus(side: MatchSide, id: string, pairs: [string, string][], selected: boolean): string {
  if (pairIndexFor(pairs, side, id) >= 0) return `Đã nối · tuyến ${pairIndexFor(pairs, side, id) + 1}`;
  if (selected) return 'Đang chọn';
  return 'Chạm để nối';
}

export function MatchBoard({ activity, pairs, selectedLeft, selectedRight, onLeft, onRight, onConnect }: MatchBoardProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const portRefs = useRef(new Map<string, HTMLElement>());
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const [geometry, setGeometry] = useState<BoardGeometry>(EMPTY_GEOMETRY);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dragPoint, setDragPoint] = useState<MatchPoint | null>(null);

  const rightPairs = useMemo(() => {
    if (activity.pairs.length < 2) return [...activity.pairs];
    return [...activity.pairs.slice(1), activity.pairs[0]];
  }, [activity.pairs]);

  const registerPort = useCallback((key: string, element: HTMLElement | null) => {
    if (element) portRefs.current.set(key, element);
    else portRefs.current.delete(key);
  }, []);

  const measure = useCallback(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const surfaceRect = surface.getBoundingClientRect();
    const width = surface.clientWidth || surfaceRect.width;
    const height = surface.clientHeight || surfaceRect.height;
    const points: Record<string, MatchPoint> = {};
    portRefs.current.forEach((element, key) => {
      points[key] = getRelativeCenter(element.getBoundingClientRect(), surfaceRect, {
        scrollLeft: surface.scrollLeft,
        scrollTop: surface.scrollTop,
        borderLeft: surface.clientLeft,
        borderTop: surface.clientTop,
      });
    });

    const next: BoardGeometry = {
      width: Number(width.toFixed(2)),
      height: Number(height.toFixed(2)),
      points,
    };
    setGeometry((previous) => sameGeometry(previous, next) ? previous : next);
  }, []);

  const layoutKey = useMemo(() => [
    activity.id,
    ...activity.pairs.flatMap((pair) => [pair.leftId, pair.left, pair.rightId, pair.right]),
    ...pairs.flat(),
    selectedLeft ?? '',
    selectedRight ?? '',
  ].join('|'), [activity, pairs, selectedLeft, selectedRight]);

  useLayoutEffect(() => {
    measure();
  }, [layoutKey, measure]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return undefined;

    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(surface);
    portRefs.current.forEach((element) => observer?.observe(element));
    window.addEventListener('resize', measure);

    const fontSet = typeof document !== 'undefined' ? document.fonts : undefined;
    fontSet?.addEventListener('loadingdone', measure);
    void fontSet?.ready?.then(() => measure());

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      fontSet?.removeEventListener('loadingdone', measure);
    };
  }, [layoutKey, measure]);

  const handleCardClick = (side: MatchSide, id: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      return;
    }
    if (side === 'left') onLeft(id);
    else onRight(id);
  };

  const handlePointerDown = (side: MatchSide, id: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || event.pointerType === 'touch') return;
    suppressClickRef.current = false;
    setDragPoint(null);
    dragRef.current = {
      pointerId: event.pointerId,
      side,
      id,
      origin: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is not available in a few embedded webviews. Tap still works.
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.active && distance > 8) {
      drag.active = true;
      setDraggingKey(portKey(drag.side, drag.id));
    }
    if (drag.active) {
      event.preventDefault();
      const surface = surfaceRef.current;
      if (surface) {
        const surfaceRect = surface.getBoundingClientRect();
        setDragPoint(getRelativeCenter(
          { left: event.clientX, top: event.clientY, width: 0, height: 0 },
          surfaceRect,
          {
            scrollLeft: surface.scrollLeft,
            scrollTop: surface.scrollTop,
            borderLeft: surface.clientLeft,
            borderTop: surface.clientTop,
          },
        ));
      }
    }
  };

  const finishPointer = (event: ReactPointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (drag.active) {
      suppressClickRef.current = true;
      if (!cancelled && onConnect) {
        const target = getDropCard(event);
        const targetSide = target?.dataset.matchSide as MatchSide | undefined;
        const targetId = target?.dataset.matchId;
        if (targetSide && targetId && isOppositeSide(drag.side, targetSide)) {
          const leftId = drag.side === 'left' ? drag.id : targetId;
          const rightId = drag.side === 'right' ? drag.id : targetId;
          onConnect(leftId, rightId);
        }
      }
    } else if (cancelled) {
      suppressClickRef.current = true;
    }

    try {
      if (drag.origin.hasPointerCapture(event.pointerId)) drag.origin.releasePointerCapture(event.pointerId);
    } catch {
      // See the pointer-capture note in handlePointerDown.
    }
    dragRef.current = null;
    setDraggingKey(null);
    setDragPoint(null);
  };

  const renderCard = (side: MatchSide, id: string, label: string, index: number) => {
    const selected = side === 'left' ? selectedLeft === id : selectedRight === id;
    const pairIndex = pairIndexFor(pairs, side, id);
    const key = portKey(side, id);
    const color = pairIndex >= 0 ? routeColor(pairIndex) : undefined;
    const style = color ? { '--match-route-color': color } as CSSProperties : undefined;

    return (
      <button
        className={`match-board-v2__card${selected ? ' is-selected' : ''}${pairIndex >= 0 ? ' is-paired' : ''}${draggingKey === key ? ' is-dragging' : ''}`}
        type="button"
        key={id}
        data-match-card={`${side}:${id}`}
        data-match-side={side}
        data-match-id={id}
        data-match-pair-index={pairIndex >= 0 ? pairIndex : undefined}
        aria-pressed={selected}
        aria-label={`${side === 'left' ? 'Thẻ bên trái' : 'Thẻ bên phải'}: ${label}`}
        style={style}
        onClick={(event) => handleCardClick(side, id, event)}
        onPointerDown={(event) => handlePointerDown(side, id, event)}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => finishPointer(event, false)}
        onPointerCancel={(event) => finishPointer(event, true)}
        onLostPointerCapture={(event) => finishPointer(event, true)}
      >
        <span className="match-board-v2__card-topline">
          <span className="match-board-v2__card-number">{String(index + 1).padStart(2, '0')}</span>
          <span className="match-board-v2__card-side">{side === 'left' ? 'Mảnh bản đồ' : 'Điểm đến'}</span>
        </span>
        <strong className="match-board-v2__card-copy">{label}</strong>
        <span className="match-board-v2__card-status">{cardStatus(side, id, pairs, selected)}</span>
        <span
          className="match-board-v2__port"
          ref={(element) => registerPort(key, element)}
          data-match-port={key}
          data-match-port-side={side}
          data-match-port-id={id}
          aria-hidden="true"
        />
      </button>
    );
  };

  const routes: MatchRoute[] = pairs.flatMap(([leftId, rightId], index) => {
    const from = geometry.points[portKey('left', leftId)];
    const to = geometry.points[portKey('right', rightId)];
    if (!from || !to) return [];
    return [{ id: String(index), from, to, index, leftId, rightId, state: 'connected' as const, showEndpoints: true }];
  });

  const drag = dragRef.current;
  if (drag?.active && dragPoint && draggingKey === portKey(drag.side, drag.id)) {
    const source = geometry.points[portKey(drag.side, drag.id)];
    if (source) {
      routes.push({
        id: 'dragging',
        from: drag.side === 'left' ? source : dragPoint,
        to: drag.side === 'left' ? dragPoint : source,
        index: pairs.length,
        leftId: drag.side === 'left' ? drag.id : 'pointer',
        rightId: drag.side === 'right' ? drag.id : 'pointer',
        state: 'dragging',
        showEndpoints: false,
      });
    }
  }

  const hasPreview = selectedLeft !== null && selectedRight !== null
    && !pairs.some(([leftId, rightId]) => leftId === selectedLeft && rightId === selectedRight);
  if (hasPreview) {
    const from = geometry.points[portKey('left', selectedLeft)];
    const to = geometry.points[portKey('right', selectedRight)];
    if (from && to) routes.push({ id: 'preview', from, to, index: pairs.length, leftId: selectedLeft, rightId: selectedRight, state: 'preview', showEndpoints: true });
  }

  return (
    <div className="match-board-v2" data-match-board role="group" aria-label="Bảng ghép cặp trên đường thám hiểm">
      <div className="match-board-v2__intro">
        <div>
          <span className="match-board-v2__eyebrow">BẢN ĐỒ KẾT NỐI</span>
          <h3>Chọn một thẻ ở mỗi phía để nối tuyến</h3>
        </div>
        <span className="match-board-v2__progress" aria-live="polite">{pairs.length}/{activity.pairs.length} tuyến</span>
      </div>

      <div className="match-board-v2__surface" ref={surfaceRef} data-match-board-surface>
        <svg
          className="match-board-v2__routes"
          aria-hidden="true"
          focusable="false"
          viewBox={`0 0 ${Math.max(geometry.width, 1)} ${Math.max(geometry.height, 1)}`}
          preserveAspectRatio="none"
        >
          {routes.map((route) => {
            const path = buildBezierPath(route.from, route.to);
            const color = route.state === 'dragging' ? '#277F80' : routeColor(route.index);
            const endpointLabel = route.state === 'preview' ? 'P' : String(route.index + 1);
            return (
              <g key={route.id} className={`match-board-v2__route-group is-${route.state}`} data-match-route={route.id}>
                <path
                  className="match-board-v2__line"
                  d={path}
                  data-match-line={route.id}
                  data-match-line-state={route.state}
                  data-match-pair-index={route.state === 'connected' ? route.index : undefined}
                  stroke={color}
                />
                {route.showEndpoints && (
                  <>
                    <g className="match-board-v2__endpoint" data-match-endpoint={`left:${route.leftId}:${route.index}`}>
                      <circle cx={route.from.x} cy={route.from.y} r="13" fill={color} />
                      <text x={route.from.x} y={route.from.y + 4.5}>{endpointLabel}</text>
                    </g>
                    <g className="match-board-v2__endpoint" data-match-endpoint={`right:${route.rightId}:${route.index}`}>
                      <circle cx={route.to.x} cy={route.to.y} r="13" fill={color} />
                      <text x={route.to.x} y={route.to.y + 4.5}>{endpointLabel}</text>
                    </g>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        <section className="match-board-v2__column" aria-labelledby="match-left-heading">
          <h4 id="match-left-heading" className="match-board-v2__column-heading">Điểm xuất phát <span>A</span></h4>
          {activity.pairs.map((pair, index) => renderCard('left', pair.leftId, pair.left, index))}
        </section>

        <div className="match-board-v2__lane" aria-hidden="true">
          <span className="match-board-v2__lane-icon">↔</span>
          <span className="match-board-v2__lane-copy">Nối tuyến</span>
        </div>

        <section className="match-board-v2__column" aria-labelledby="match-right-heading">
          <h4 id="match-right-heading" className="match-board-v2__column-heading">Điểm đến <span>B</span></h4>
          {rightPairs.map((pair, index) => renderCard('right', pair.rightId, pair.right, index))}
        </section>
      </div>

      <p className="match-board-v2__helper">Chạm lại tuyến đã nối để bỏ ghép. Có thể kéo từ một thẻ sang thẻ ở phía đối diện.</p>
    </div>
  );
}

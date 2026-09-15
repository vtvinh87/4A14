import { createPortal } from 'react-dom';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { petMessage, type PetMood } from '../motion/pet';
import { Pet } from './Pet';
import {
  DEFAULT_FLOATING_PET_SIZE,
  FLOATING_PET_KEYBOARD_STEP,
  clampFloatingPetPosition,
  getInitialFloatingPetPosition,
  isFloatingPetDrag,
  moveFloatingPetPosition,
  type FloatingPetPosition,
  type FloatingPetSize,
  type FloatingViewport,
} from './floatingPetPosition';

type FloatingPetProps = {
  mood: PetMood;
  reducedMotion: boolean;
  onTap: () => void;
  message?: string;
  followUpMessage?: string;
  tapMessage?: string;
};

type DragState = {
  pointerId: number;
  start: FloatingPetPosition;
  startPosition: FloatingPetPosition;
  captureTarget: HTMLElement;
  moved: boolean;
};

function readViewport(): FloatingViewport {
  if (typeof window === 'undefined') return { width: 320, height: 640 };
  const visualViewport = window.visualViewport;
  return {
    width: Math.max(visualViewport?.width ?? window.innerWidth, 1),
    height: Math.max(visualViewport?.height ?? window.innerHeight, 1),
  };
}

function readWidgetSize(element: HTMLDivElement | null, fallback: FloatingPetSize): FloatingPetSize {
  const rect = element?.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return fallback;
  return { width: rect.width, height: rect.height };
}

function getPortalTarget(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>('.world-overlay') ?? document.body;
}

const PET_MESSAGE_MIN_DURATION_MS = 8000;
const TAP_CUE_DURATION_MS = PET_MESSAGE_MIN_DURATION_MS;
const AUTO_FOLLOW_UP_INTERVAL_MS = PET_MESSAGE_MIN_DURATION_MS;

export function FloatingPet({ mood, reducedMotion, onTap, message, followUpMessage, tapMessage }: FloatingPetProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState<FloatingPetPosition | null>(null);
  const [isTapCueActive, setIsTapCueActive] = useState(false);
  const [autoMessageIndex, setAutoMessageIndex] = useState(0);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<FloatingViewport>(readViewport());
  const widgetSizeRef = useRef<FloatingPetSize>(DEFAULT_FLOATING_PET_SIZE);
  const positionRef = useRef<FloatingPetPosition | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressNextClickRef = useRef(false);
  const tapCueTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setPortalTarget(getPortalTarget());
  }, []);

  const measureWidget = useCallback(() => {
    const nextSize = readWidgetSize(widgetRef.current, widgetSizeRef.current);
    widgetSizeRef.current = nextSize;
    const nextViewport = viewportRef.current;
    setPosition((current) => {
      const next = current
        ? clampFloatingPetPosition(current, nextViewport, nextSize)
        : getInitialFloatingPetPosition(nextViewport, nextSize);
      positionRef.current = next;
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    if (!portalTarget) return;
    measureWidget();
  }, [measureWidget, mood, portalTarget, reducedMotion]);

  useEffect(() => {
    if (!portalTarget) return;

    const handleResize = () => {
      viewportRef.current = readViewport();
      measureWidget();
    };
    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);

    const element = widgetRef.current;
    const observer = typeof ResizeObserver === 'undefined' || !element
      ? null
      : new ResizeObserver(() => measureWidget());
    if (observer && element) observer.observe(element);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
      observer?.disconnect();
    };
  }, [measureWidget, portalTarget]);

  useEffect(() => () => {
    if (tapCueTimerRef.current !== null) window.clearTimeout(tapCueTimerRef.current);
  }, []);

  useEffect(() => {
    setAutoMessageIndex(0);
    if (!followUpMessage || isTapCueActive) return;

    const timer = window.setInterval(() => {
      setAutoMessageIndex((current) => current === 0 ? 1 : 0);
    }, AUTO_FOLLOW_UP_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [followUpMessage, isTapCueActive, message]);

  const handlePetTap = () => {
    if (tapCueTimerRef.current !== null) window.clearTimeout(tapCueTimerRef.current);
    setAutoMessageIndex(0);
    setIsTapCueActive(true);
    onTap();
    tapCueTimerRef.current = window.setTimeout(() => {
      tapCueTimerRef.current = null;
      setIsTapCueActive(false);
    }, TAP_CUE_DURATION_MS);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const currentPosition = positionRef.current;
    if (!currentPosition) return;

    suppressNextClickRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      startPosition: currentPosition,
      captureTarget: event.target instanceof HTMLElement ? event.target.closest('button') ?? event.currentTarget : event.currentTarget,
      moved: false,
    };
    dragRef.current.captureTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const currentPoint = { x: event.clientX, y: event.clientY };
    if (!drag.moved && !isFloatingPetDrag(drag.start, currentPoint)) return;
    drag.moved = true;
    event.preventDefault();
    setPosition((current) => {
      if (!current) return current;
      const next = moveFloatingPetPosition(
        drag.startPosition,
        { x: currentPoint.x - drag.start.x, y: currentPoint.y - drag.start.y },
        viewportRef.current,
        widgetSizeRef.current,
      );
      positionRef.current = next;
      return next;
    });
  };

  const releasePointerCapture = (target: HTMLElement, pointerId: number) => {
    if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture?.(pointerId);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    suppressNextClickRef.current = drag.moved;
    releasePointerCapture(drag.captureTarget, event.pointerId);
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    suppressNextClickRef.current = false;
    releasePointerCapture(drag.captureTarget, event.pointerId);
  };

  const handleLostPointerCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    suppressNextClickRef.current = drag.moved;
  };

  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressNextClickRef.current) return;
    suppressNextClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      suppressNextClickRef.current = false;
      return;
    }
    const delta = event.key === 'ArrowLeft'
      ? { x: -FLOATING_PET_KEYBOARD_STEP, y: 0 }
      : event.key === 'ArrowRight'
        ? { x: FLOATING_PET_KEYBOARD_STEP, y: 0 }
        : event.key === 'ArrowUp'
          ? { x: 0, y: -FLOATING_PET_KEYBOARD_STEP }
          : event.key === 'ArrowDown'
            ? { x: 0, y: FLOATING_PET_KEYBOARD_STEP }
            : null;
    if (!delta) return;

    event.preventDefault();
    setPosition((current) => {
      if (!current) return current;
      const next = moveFloatingPetPosition(current, delta, viewportRef.current, widgetSizeRef.current);
      positionRef.current = next;
      return next;
    });
  };

  if (!portalTarget) return null;

  const widgetStyle: CSSProperties = position
    ? { left: `${position.x}px`, top: `${position.y}px` }
    : { left: '0px', top: '0px', visibility: 'hidden' };
  const automaticMessage = autoMessageIndex === 1 && followUpMessage ? followUpMessage : message;

  return createPortal(
    <div className="floating-pet-layer" data-floating-pet-layer>
      <div
        ref={widgetRef}
        className="floating-pet-widget"
        data-floating-pet-widget
        style={widgetStyle}
        role="group"
        tabIndex={0}
        aria-label="Vùng kéo Cáo Nhỏ"
        aria-describedby="floating-pet-instructions"
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handleLostPointerCapture}
        onClickCapture={handleClickCapture}
        onKeyDown={handleKeyDown}
      >
        <Pet
          mood={isTapCueActive ? 'greet' : mood}
          reducedMotion={reducedMotion}
          onTap={handlePetTap}
          message={isTapCueActive ? tapMessage ?? petMessage('greet') : automaticMessage}
          size="compact"
        />
        <span id="floating-pet-instructions" className="visually-hidden">Dùng ngón tay hoặc chuột để kéo Cáo Nhỏ. Dùng phím mũi tên khi vùng này được chọn để di chuyển.</span>
      </div>
    </div>,
    portalTarget,
  );
}

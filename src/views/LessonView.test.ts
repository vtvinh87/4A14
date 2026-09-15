import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LessonView } from './LessonView';
import { getLessonPackage } from '../content/packages';
import type { Session } from '../content/types';
import { createSession, transition } from '../game/session';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('LessonView compact expedition header', () => {
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

  it('replaces the oversized navigation/status strip with compact lesson artwork', () => {
    act(() => {
      root.render(createElement(LessonView, {
        lessonId: 'lesson-02',
        session: null,
        completedMissions: [],
        reducedMotion: false,
        onSessionEvent: vi.fn(),
        onBack: vi.fn(),
        onPetThink: vi.fn(),
        onPetCelebrate: vi.fn(),
      }));
    });

    expect(mount.querySelector('.lesson-topline')).toBeNull();
    expect(mount.querySelector('.back-button')).toBeNull();
    expect(mount.textContent).not.toContain('Danh mục bài học');
    expect(mount.textContent).not.toContain('Sẵn sàng bắt đầu');

    const heading = mount.querySelector<HTMLHeadingElement>('#lesson-title');
    expect(heading?.textContent).toBe('Địa phương em');
    expect(heading?.getAttribute('aria-label')).toBe('Thiên nhiên và con người ở địa phương em');

    const artwork = mount.querySelector<HTMLImageElement>('[data-lesson-hero-art]');
    expect(artwork?.getAttribute('src')).toBe('/art/lessons/lesson-02.png');
    expect(artwork?.alt).toBe('Cảnh quan địa phương với ghim bản đồ và nhóm cộng đồng');
    expect(artwork?.closest('[aria-hidden="true"]')).toBeNull();
    expect(mount.querySelector('[data-lesson-hero-number]')?.textContent).toBe('02');
    expect(mount.querySelector('.lesson-hero-emblem')).toBeNull();
  });

  it('labels every rendered book reference as SGK for the learner', () => {
    const lesson = getLessonPackage('lesson-01');
    let session = createSession(lesson, 'sgk-reference-test');
    session = transition(session, { type: 'DISCOVERY_DONE' }, lesson);
    act(() => {
      root.render(createElement(LessonView, {
        lessonId: 'lesson-01',
        session,
        completedMissions: [],
        reducedMotion: false,
        onSessionEvent: vi.fn(),
        onBack: vi.fn(),
        onPetThink: vi.fn(),
        onPetCelebrate: vi.fn(),
      }));
    });

    expect(mount.querySelector('.source-reference summary')?.textContent).toContain('Xem trong SGK');
    expect(mount.querySelector('.source-reference-list small')?.getAttribute('data-source-id')).toBe('sgk-lsdl4-sample');
    expect(mount.textContent).not.toContain('Xem trong VBT');
  });

  it('keeps the same SGK cue for generated lessons while retaining provenance metadata', () => {
    const lesson = getLessonPackage('lesson-02');
    let session = createSession(lesson, 'generated-sgk-reference-test');
    session = transition(session, { type: 'DISCOVERY_DONE' }, lesson);
    act(() => {
      root.render(createElement(LessonView, {
        lessonId: 'lesson-02',
        session,
        completedMissions: [],
        reducedMotion: false,
        onSessionEvent: vi.fn(),
        onBack: vi.fn(),
        onPetThink: vi.fn(),
        onPetCelebrate: vi.fn(),
      }));
    });

    expect(mount.querySelector('.source-reference summary')?.textContent).toContain('Xem trong SGK');
    expect(mount.querySelector('.source-reference-list small')?.getAttribute('data-source-id')).toBe('vbt-lsdl4-2026');
    expect(mount.textContent).not.toContain('Xem trong VBT');
  });

  it('starts an order route empty and enables checking only after every tile is placed', () => {
    const lesson = getLessonPackage('lesson-01');
    const activity = lesson.missions[1].activities[0];
    if (activity.type !== 'order') throw new Error('lesson-01 mission 2 should start with an order activity');
    const session = { ...createSession(lesson, 'order-route-test'), missionIndex: 1, stage: 'answer' as const };
    act(() => {
      root.render(createElement(LessonView, {
        lessonId: 'lesson-01',
        session,
        completedMissions: [],
        reducedMotion: false,
        onSessionEvent: vi.fn(),
        onBack: vi.fn(),
        onPetThink: vi.fn(),
        onPetCelebrate: vi.fn(),
      }));
    });

    const check = mount.querySelector<HTMLButtonElement>('[data-check-answer]');
    expect(mount.querySelectorAll('[data-route-placed]')).toHaveLength(0);
    expect(check?.disabled).toBe(true);
    act(() => mount.querySelector<HTMLButtonElement>(`[data-route-bank="${activity.items[0].id}"]`)?.click());
    expect(check?.disabled).toBe(true);
    act(() => mount.querySelector<HTMLButtonElement>(`[data-route-bank="${activity.items[1].id}"]`)?.click());
    act(() => mount.querySelector<HTMLButtonElement>(`[data-route-bank="${activity.items[2].id}"]`)?.click());
    expect(mount.querySelectorAll('[data-route-placed]')).toHaveLength(activity.items.length);
    expect(mount.querySelector<HTMLButtonElement>('[data-check-answer]')?.disabled).toBe(false);
    act(() => mount.querySelector<HTMLButtonElement>('[data-route-undo]')?.click());
    expect(mount.querySelector<HTMLButtonElement>('[data-check-answer]')?.disabled).toBe(true);
  });

  it('keeps the select check closed until the satchel has the target number of clues', () => {
    const lesson = getLessonPackage('lesson-01');
    const activity = lesson.missions[3].activities[1];
    if (activity.type !== 'select') throw new Error('lesson-01 mission 4 should end with a select activity');
    const session = { ...createSession(lesson, 'satchel-count-test'), missionIndex: 3, activityIndex: 1, stage: 'answer' as const };
    act(() => {
      root.render(createElement(LessonView, {
        lessonId: 'lesson-01',
        session,
        completedMissions: [],
        reducedMotion: false,
        onSessionEvent: vi.fn(),
        onBack: vi.fn(),
        onPetThink: vi.fn(),
        onPetCelebrate: vi.fn(),
      }));
    });

    const check = () => mount.querySelector<HTMLButtonElement>('[data-check-answer]');
    expect(check()?.disabled).toBe(true);
    act(() => mount.querySelector<HTMLButtonElement>(`[data-satchel-option="${activity.options[0].id}"]`)?.click());
    expect(check()?.disabled).toBe(true);
    act(() => mount.querySelector<HTMLButtonElement>(`[data-satchel-option="${activity.options[1].id}"]`)?.click());
    expect(check()?.disabled).toBe(false);
    act(() => mount.querySelector<HTMLButtonElement>(`[data-satchel-remove="${activity.options[0].id}"]`)?.click());
    expect(check()?.disabled).toBe(true);
  });

  it('restores the interactive fox and speech in a reserved space', () => {
    const lesson = getLessonPackage('lesson-01');
    let session = createSession(lesson, 'in-flow-guide-test');
    session = transition(session, { type: 'DISCOVERY_DONE' }, lesson);
    act(() => {
      root.render(createElement(LessonView, {
        lessonId: 'lesson-01',
        session,
        completedMissions: [],
        reducedMotion: false,
        onSessionEvent: vi.fn(),
        onBack: vi.fn(),
        onPetThink: vi.fn(),
        onPetCelebrate: vi.fn(),
      }));
    });

    expect(mount.querySelector('[data-lesson-pet]')).not.toBeNull();
    expect(mount.textContent).not.toContain('LỜI NHẮC TRÊN ĐƯỜNG');
    const petButton = mount.querySelector<HTMLButtonElement>('[data-lesson-pet] button')!;
    const before = mount.querySelector('[data-lesson-pet] .pet-bubble')?.textContent;
    act(() => petButton.click());
    expect(mount.querySelector('[data-lesson-pet] .pet-bubble')?.textContent).not.toBe(before);
    expect(mount.querySelector('[data-testid="floating-pet"]')).toBeNull();
  });

  it('renders the current generic m5 answer while keeping persisted explanation text unchanged', () => {
    const lesson = getLessonPackage('lesson-02');
    const activity = lesson.missions[4].activities[0];
    if (activity.type !== 'choice') throw new Error('lesson-02 mission 5 should start with a choice activity');
    const correctOption = activity.options.find((option) => option.id === activity.correctId);
    if (!correctOption) throw new Error('generic choice should have a correct option');
    const persistedExplanation = activity.explanation;
    let session: Session = { ...createSession(lesson, 'generic-feedback-test'), missionIndex: 4, stage: 'answer' };
    session = transition(session, { type: 'ANSWER', response: { type: 'choice', optionId: activity.correctId } }, lesson);

    expect(session.lastEvaluation?.explanation).toBe(persistedExplanation);
    act(() => {
      root.render(createElement(LessonView, {
        lessonId: 'lesson-02',
        session,
        completedMissions: [],
        reducedMotion: false,
        onSessionEvent: vi.fn(),
        onBack: vi.fn(),
        onPetThink: vi.fn(),
        onPetCelebrate: vi.fn(),
      }));
    });

    expect(mount.querySelector('[data-feedback-answer]')?.textContent).toContain(correctOption.text);
    expect(mount.querySelector('.success-mark')).toBeNull();
    expect(mount.textContent).toContain('Dữ kiện cần nhớ là');
    expect(mount.textContent).not.toContain('Theo tư liệu của bài, đáp án đúng là');
  });

  it('leaves reviewed m5 feedback copy unchanged', () => {
    const lesson = getLessonPackage('lesson-01');
    const activity = lesson.missions[4].activities[0];
    if (activity.type !== 'choice') throw new Error('lesson-01 mission 5 should start with a choice activity');
    let session: Session = { ...createSession(lesson, 'reviewed-feedback-test'), missionIndex: 4, stage: 'answer' };
    session = transition(session, { type: 'ANSWER', response: { type: 'choice', optionId: activity.correctId } }, lesson);

    act(() => {
      root.render(createElement(LessonView, {
        lessonId: 'lesson-01',
        session,
        completedMissions: [],
        reducedMotion: false,
        onSessionEvent: vi.fn(),
        onBack: vi.fn(),
        onPetThink: vi.fn(),
        onPetCelebrate: vi.fn(),
      }));
    });

    expect(mount.querySelector('[data-feedback-answer]')).toBeNull();
    expect(mount.textContent).toContain('Theo sách, mũi tên đồng Cổ Loa là một hiện vật lịch sử.');
  });
});

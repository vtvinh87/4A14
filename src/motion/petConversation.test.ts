import { describe, expect, it } from 'vitest';
import { getLessonPackage } from '../content/packages';
import type { Activity, Mission, SourceRef } from '../content/types';
import { getLessonPetCue, getPetTapCue, type LessonPetContext } from './petConversation';

const lesson = getLessonPackage('lesson-01');
const mission = lesson.missions[0];
const choice = mission.activities[0];
const match = mission.activities[1];
const order = lesson.missions[1].activities[0];
const vbtLesson = getLessonPackage('lesson-02');

function context(overrides: Partial<LessonPetContext> = {}): LessonPetContext {
  return {
    stage: 'answer',
    mission,
    activity: match,
    activityIndex: 1,
    activityTotal: 2,
    hintUsed: false,
    selectedChoiceText: null,
    matchPairCount: 0,
    matchPairTotal: 3,
    hasMatchSelection: false,
    orderTouched: false,
    ...overrides,
  };
}

function formatSource(reference: SourceRef): string {
  return `SGK Lịch sử và Địa lí 4 · trang ${reference.printedPage} · ${reference.locator}`;
}

function sourceText(activity: Activity): string[] {
  return (activity.sourceRefs ?? [activity.source]).map(formatSource);
}

describe('lesson Pet conversation cues', () => {
  it('uses the exact reviewed source locations for discovery and activities', () => {
    const discovery = getLessonPetCue({ stage: 'discover', mission, activity: null });
    const answer = getLessonPetCue(context());

    expect(discovery.message).toContain('manh mối');
    expect(discovery.followUpMessage).toContain(formatSource(mission.discovery[0].source));
    expect(discovery.followUpMessage).not.toContain('PDF');
    expect(discovery.followUpMessage).not.toContain('trang in');
    expect(answer.followUpMessage).toContain(sourceText(match)[0]);
    expect(answer.followUpMessage).toContain(sourceText(match)[1]);
  });

  it('labels every learner-facing source guide as SGK', () => {
    const vbtMission = vbtLesson.missions[0];
    const cue = getLessonPetCue({ stage: 'discover', mission: vbtMission, activity: null });

    expect(cue.followUpMessage).toContain('SGK Lịch sử và Địa lí 4');
    expect(cue.followUpMessage).not.toContain('VBT Lịch sử và Địa lí 4');
    expect(cue.followUpMessage).toContain('Xem trong SGK');
  });

  it('guides a choice activity before and after the child selects an option', () => {
    const before = getLessonPetCue(context({ activity: choice, activityIndex: 0, selectedChoiceText: null }));
    const after = getLessonPetCue(context({ activity: choice, activityIndex: 0, selectedChoiceText: 'Bản đồ' }));

    expect(before.message).toContain('manh mối');
    expect(before.followUpMessage).toContain(sourceText(choice)[0]);
    expect(after.message).toContain('Bản đồ');
    expect(after.message).toContain('Kiểm tra');
  });

  it('reports match progress, hint state, and order progress', () => {
    expect(getLessonPetCue(context({ matchPairCount: 1, matchPairTotal: 3 })).message).toContain('1/3');
    expect(getLessonPetCue(context({ matchPairCount: 3, matchPairTotal: 3 })).message).toContain('Ghép đủ 3 cặp');
    expect(getLessonPetCue(context({ hintUsed: true })).message).toContain(match.hint);
    expect(getLessonPetCue(context({ hintUsed: true })).followUpMessage).toContain(sourceText(match)[0]);
    expect(getLessonPetCue(context({ activity: order, activityIndex: 0, orderTouched: true })).message).toContain('Kiểm tra');
  });

  it('gives a distinct cue for the multi-select clue hunt', () => {
    const select = lesson.missions[3].activities[1];
    expect(select.type).toBe('select');
    const cue = getLessonPetCue(context({ activity: select, activityIndex: 1 }));
    expect(cue.message).toContain('manh mối');
    expect(cue.followUpMessage).toContain('SGK Lịch sử và Địa lí 4');
    expect(getPetTapCue(context({ activity: select, activityIndex: 1 })).message).toContain('manh mối');
  });

  it('handles correct, retry, mission-complete, and lesson-complete states', () => {
    expect(getLessonPetCue(context({ stage: 'feedback', evaluation: { correct: true, invalid: false, explanation: '' } })).mood).toBe('celebrate');
    expect(getLessonPetCue(context({ stage: 'feedback', evaluation: { correct: true, invalid: false, explanation: '' } })).message).toContain('Sang bước tiếp');
    expect(getLessonPetCue(context({ stage: 'feedback', evaluation: { correct: true, invalid: false, explanation: '' } })).followUpMessage).toContain(sourceText(match)[0]);
    expect(getLessonPetCue(context({ stage: 'feedback', evaluation: { correct: false, invalid: false, explanation: '' } })).message).toContain('lần nữa');
    expect(getLessonPetCue(context({ stage: 'missionComplete' })).message).toContain('đi tiếp');
    expect(getLessonPetCue(context({ stage: 'lessonComplete' })).message).toContain('hoàn thành cả chặng');
  });

  it('returns a warm and playful tap cue for the current activity', () => {
    const cue = getPetTapCue(context());

    expect(cue.mood).toBe('greet');
    expect(cue.message.toLowerCase()).toContain('ghép');
    expect(cue.message).toContain('đồng đội');
  });

  it('uses only the tớ-cậu relationship in Pet-authored copy', () => {
    const cues = [
      getLessonPetCue({ stage: 'idle' }),
      getLessonPetCue({ stage: 'discover', mission, activity: null }),
      getLessonPetCue(context()),
      getLessonPetCue(context({ stage: 'feedback', evaluation: { correct: true, invalid: false, explanation: '' } })),
      getLessonPetCue(context({ stage: 'missionComplete' })),
      getLessonPetCue(context({ stage: 'lessonComplete' })),
      getPetTapCue(context()),
    ];
    const copy = cues.flatMap((item) => [item.message, item.followUpMessage ?? '']).join(' ');

    expect(copy).not.toMatch(/\bcon\b/iu);
    expect(copy).not.toMatch(/\bmình\b/iu);
    expect(copy).toMatch(/tớ/i);
    expect(copy).toMatch(/cậu/i);
  });

  it('uses more human, emotionally varied lines for the learner journey', () => {
    const empty = getLessonPetCue(context());
    const progress = getLessonPetCue(context({ matchPairCount: 1, matchPairTotal: 3 }));
    const complete = getLessonPetCue(context({ matchPairCount: 3, matchPairTotal: 3 }));
    const tap = getPetTapCue(context({ activity: match }));

    expect(empty.message).toContain('nào');
    expect(progress.message).not.toBe(empty.message);
    expect(complete.mood).toBe('think');
    expect(complete.message).not.toContain('đúng chỗ');
    expect(tap.message).toContain('đồng đội');
    expect([empty.message, progress.message, complete.message, tap.message].join(' ')).not.toMatch(/\b(mình|con|bạn)\b/iu);
  });
});

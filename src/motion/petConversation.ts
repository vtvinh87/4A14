import type { Activity, Evaluation, Mission, Session, SourceRef } from '../content/types';
import type { PetMood } from './pet';
import { formatTextbookReference } from '../content/textbookGuide';

export type LessonPetStage = 'idle' | Session['stage'];

export type LessonPetContext = {
  stage: LessonPetStage;
  mission?: Mission | null;
  activity?: Activity | null;
  activityIndex?: number;
  activityTotal?: number;
  hintUsed?: boolean;
  evaluation?: Evaluation | null;
  selectedChoiceText?: string | null;
  matchPairCount?: number;
  matchPairTotal?: number;
  hasMatchSelection?: boolean;
  orderTouched?: boolean;
  isLastMission?: boolean;
};

export type PetCue = {
  key: string;
  mood: PetMood;
  message: string;
  followUpMessage?: string;
};

function formatSource(reference: SourceRef): string {
  return formatTextbookReference(reference);
}

function uniqueSources(references: SourceRef[]): SourceRef[] {
  return references.filter((reference, index) => references.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(reference)) === index);
}

function activitySources(activity: Activity): SourceRef[] {
  return uniqueSources(activity.sourceRefs?.length ? activity.sourceRefs : [activity.source]);
}

function sourceGuide(references: SourceRef[]): string {
  const formatted = [...new Set(uniqueSources(references).map(formatSource))].join('; ');
  return `Muốn xem đúng chỗ trong sách giáo khoa, chạm “Xem trong SGK”: ${formatted}.`;
}

function activityGuide(activity: Activity): string {
  return sourceGuide(activitySources(activity));
}

function cue(key: string, mood: PetMood, message: string, followUpMessage?: string): PetCue {
  return { key, mood, message, followUpMessage };
}

function chooseLine(lines: readonly string[], seed = 0): string {
  return lines[Math.abs(seed) % lines.length];
}

function contextSeed(context: LessonPetContext): number {
  return (context.activityIndex ?? 0) + (context.matchPairCount ?? 0) + (context.hasMatchSelection ? 1 : 0);
}

function lineCue(key: string, mood: PetMood, lines: readonly string[], seed: number, followUpMessage?: string): PetCue {
  return cue(key, mood, chooseLine(lines, seed), followUpMessage);
}

export function getLessonPetCue(context: LessonPetContext): PetCue {
  const { stage, mission, activity } = context;
  const activityKey = activity?.id ?? mission?.id ?? 'lesson';
  const seed = contextSeed(context);

  if (stage === 'idle') return cue('idle', 'idle', 'Tớ ở đây nè. Cậu muốn mở ba lô khám phá không?');

  if (stage === 'discover') {
    const references = mission?.discovery.map((item) => item.source) ?? [];
    return lineCue(`discover:${mission?.id ?? 'lesson'}`, 'think', [
      `Tớ đọc mẩu này trước với cậu nhé — trong đó có manh mối hay lắm!`,
      `Cậu đọc chậm thôi, tớ sẽ đợi. Manh mối đang nằm trong mẩu tư liệu đấy!`,
    ], seed, sourceGuide(references));
  }

  if (stage === 'answer' && activity) {
    if (context.hintUsed) {
      return lineCue(`hint:${activityKey}`, 'think', [
        `Tớ có một gợi ý nhỏ đây: ${activity.hint}`,
        `Bí mật nằm ở chỗ này nè: ${activity.hint}`,
      ], seed, activityGuide(activity));
    }

    if (activity.type === 'choice') {
      if (context.selectedChoiceText) {
        return lineCue(`choice-selected:${activityKey}:${context.selectedChoiceText}`, 'think', [
          `À, cậu đang nghiêng về “${context.selectedChoiceText}”. Đọc lại câu hỏi một lần nữa rồi bấm “Kiểm tra” nhé!`,
          `Tớ thấy cậu đã có lựa chọn rồi. Soi lại từ khóa cuối cùng rồi kiểm tra nha!`,
        ], seed, activityGuide(activity));
      }
      return lineCue(`choice:${activityKey}`, 'think', [
        'Cậu đọc câu hỏi một lượt nữa nhé. Tớ tin cậu sẽ bắt được manh mối!',
        'Đừng vội chọn nha — tìm từ khóa trong câu hỏi trước nào.',
      ], seed, activityGuide(activity));
    }

    if (activity.type === 'match') {
      const total = context.matchPairTotal ?? activity.pairs.length;
      const count = context.matchPairCount ?? 0;
      if (count >= total) return lineCue(`match-complete:${activityKey}`, 'think', [
        `Ghép đủ ${total} cặp rồi! Nhìn lại các đường nối rồi bấm “Kiểm tra” nhé!`,
        `Đã có đủ ${total} cặp. Cậu có muốn đổi đường nối nào trước khi “Kiểm tra” không?`,
      ], seed, activityGuide(activity));
      if (count > 0) return lineCue(`match-progress:${activityKey}:${count}`, 'greet', [
        `Đã có ${count}/${total} cặp rồi! Cậu đang vào guồng đấy, ghép tiếp nào!`,
        'Một cặp nữa đã vào chỗ! Tớ với cậu tìm tiếp những chiếc thẻ còn lại nhé.',
      ], seed, activityGuide(activity));
      if (context.hasMatchSelection) return lineCue(`match-selected:${activityKey}`, 'think', [
        'Cậu đã giữ một thẻ rồi. Tìm “người đồng đội” của nó ở cột bên kia nhé!',
        'Thẻ này đang chờ đồng đội đấy — chạm thẻ bên kia nào!',
      ], seed, activityGuide(activity));
      return lineCue(`match:${activityKey}`, 'think', [
        'Mỗi cột chọn một thẻ, rồi để tớ xem chúng có thành đôi không nhé.',
        'Bắt đầu bằng một thẻ bên trái và một thẻ bên phải nào!',
      ], seed, activityGuide(activity));
    }

    if (activity.type === 'select') {
      return lineCue(`select:${activityKey}`, 'think', [
        'Săn đủ manh mối đúng rồi bấm “Kiểm tra” nhé!',
        'Chạm những thẻ manh mối thật sự thuộc chặng này — tớ sẽ canh giúp cậu.',
      ], seed, activityGuide(activity));
    }

    if (context.orderTouched) return lineCue(`order-progress:${activityKey}`, 'greet', [
      'Cậu vừa đổi chỗ rồi đó. Xếp đến khi thấy đúng như sách, rồi bấm “Kiểm tra” nhé.',
      'Cậu đã đặt thêm bước vào lộ trình. So lại thứ tự với tư liệu trước khi kiểm tra nha.',
    ], seed, activityGuide(activity));
    return lineCue(`order:${activityKey}`, 'think', [
      'Chọn bước đầu tiên để mở lộ trình, rồi thêm từng bước tiếp theo nhé.',
      'Các bước đang chờ cậu sắp xếp — chọn bước đầu tiên nào!',
    ], seed, activityGuide(activity));
  }

  if (stage === 'feedback' && activity) {
    const correct = Boolean(context.evaluation?.correct && !context.evaluation.invalid);
    if (correct) return lineCue(`feedback-correct:${activityKey}`, 'celebrate', [
      'Yes! Cậu làm đúng rồi! Bấm “Sang bước tiếp”, tớ còn một chặng nhỏ muốn khám phá cùng cậu.',
      'Chuẩn luôn! Tớ vui lây với cậu đó. Cùng bấm “Sang bước tiếp” nhé!',
    ], seed, activityGuide(activity));
    return lineCue(`feedback-retry:${activityKey}`, 'think', [
      'Chưa sao đâu, thám tử nào cũng có lúc thử lại. Đọc lời giải thích rồi làm lại nhé.',
      'Gần đúng rồi đó! Tớ cùng cậu soi lại manh mối, rồi thử thêm lần nữa nha.',
    ], seed, activityGuide(activity));
  }

  if (stage === 'missionComplete') {
    const nextAction = context.isLastMission ? 'Xem hoàn thành bài' : 'Mở nhiệm vụ tiếp theo';
    return lineCue(`mission-complete:${mission?.id ?? 'lesson'}`, 'celebrate', [
      `Nhiệm vụ “${mission?.title ?? 'này'}” về đích rồi! Tớ thấy đuôi tớ sắp quạt bay luôn 😄 Bấm “${nextAction}” nhé.`,
      `Cậu vừa mở khóa xong một chặng! Tớ với cậu đi tiếp thôi — bấm “${nextAction}” nhé.`,
    ], seed);
  }

  if (stage === 'lessonComplete') return cue('lesson-complete', 'celebrate', 'Cậu hoàn thành cả chặng rồi! Tớ tự hào quá, mở hộ chiếu xem dấu cùng tớ nhé.');

  return cue('fallback', 'idle', 'Tớ vẫn ở đây nè — cậu cần tớ cổ vũ hay cùng soi manh mối?');
}

export function getPetTapCue(context: LessonPetContext): PetCue {
  if (context.stage === 'discover') return cue('tap:discover', 'greet', 'Tớ ở đây! Cậu đọc mẩu tư liệu, tớ canh manh mối cùng cậu nhé.');

  if (context.stage === 'answer' && context.activity) {
    if (context.activity.type === 'choice') return cue(`tap:choice:${context.activity.id}`, 'greet', context.selectedChoiceText ? 'Cậu chọn rồi à? Tớ đang hồi hộp muốn biết đáp án quá!' : 'Tớ đang hóng đáp án của cậu đấy 😄');
    if (context.activity.type === 'match') return cue(`tap:match:${context.activity.id}`, 'greet', 'Tớ vẫy tay cổ vũ! Tìm người đồng đội ở đầu kia, rồi ghép thôi nào!');
    if (context.activity.type === 'select') return cue(`tap:select:${context.activity.id}`, 'greet', 'Tớ vẫy đuôi cổ vũ! Săn đủ manh mối đúng rồi kiểm tra nhé!');
    return cue(`tap:order:${context.activity.id}`, 'greet', 'Khoan vội! Tớ làm đồng đội, cậu xếp từng bước nhé.');
  }

  if (context.stage === 'feedback') {
    const correct = Boolean(context.evaluation?.correct && !context.evaluation.invalid);
    return correct
      ? cue('tap:feedback-correct', 'greet', 'Tớ muốn đập tay với cậu quá! Cậu làm chuẩn rồi, bấm “Sang bước tiếp” nhé.')
      : cue('tap:feedback-retry', 'greet', 'Không sao, sai một chút mới biết đường đúng mà. Tớ cùng cậu soi lại nhé.');
  }

  if (context.stage === 'missionComplete') return cue('tap:mission-complete', 'greet', 'Đuôi tớ quẫy tung rồi! Mở nhiệm vụ tiếp theo nào!');
  if (context.stage === 'lessonComplete') return cue('tap:lesson-complete', 'greet', 'Tớ muốn ăn mừng một vòng quanh bản đồ! Cậu hoàn thành cả chặng rồi!');
  return cue('tap:idle', 'greet', 'Tớ nghe đây! Cậu muốn bắt đầu từ đâu?');
}

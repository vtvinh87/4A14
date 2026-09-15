import { describe, expect, it } from 'vitest';
import { evaluate } from './evaluate';
import type { Activity, Select, SourceRef } from '../content/types';

const source: SourceRef = {
  sourceId: 'sgk-lsdl4-sample',
  pdfPage: 1,
  printedPage: 1,
  locator: 'Test fixture',
};

const choice: Activity = {
  id: 'choice-1',
  objectiveId: 'objective-1',
  type: 'choice',
  prompt: 'Chọn đáp án',
  hint: 'Đọc lại câu hỏi.',
  explanation: 'Đáp án đúng đã được nêu trong phần khám phá.',
  source,
  reviewStatus: 'verified',
  options: [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
  ],
  correctId: 'b',
};

const match: Activity = {
  id: 'match-1',
  objectiveId: 'objective-1',
  type: 'match',
  prompt: 'Ghép cặp',
  hint: 'Mỗi thẻ chỉ ghép một lần.',
  explanation: 'Mỗi khái niệm có một mô tả tương ứng.',
  source,
  reviewStatus: 'verified',
  pairs: [
    { leftId: 'map', left: 'Bản đồ', rightId: 'scale', right: 'Thu nhỏ theo tỉ lệ' },
    { leftId: 'chart', left: 'Biểu đồ', rightId: 'visual', right: 'Thể hiện số liệu trực quan' },
  ],
};

const order: Activity = {
  id: 'order-1',
  objectiveId: 'objective-1',
  type: 'order',
  prompt: 'Xếp theo thứ tự',
  hint: 'Tìm bước bắt đầu bằng việc đọc tên.',
  explanation: 'Đây là thứ tự đầy đủ của các bước.',
  source,
  reviewStatus: 'verified',
  items: [
    { id: 'one', text: 'Một' },
    { id: 'two', text: 'Hai' },
    { id: 'three', text: 'Ba' },
  ],
  correctOrder: ['one', 'two', 'three'],
};

const select: Select = {
  id: 'select-1',
  objectiveId: 'objective-1',
  type: 'select',
  prompt: 'Chọn các manh mối đúng',
  hint: 'Có hai thẻ cùng nói về dấu hiệu trong tư liệu.',
  explanation: 'Hai thẻ được chọn đều có trong tư liệu.',
  source,
  reviewStatus: 'verified',
  options: [
    { id: 'map', text: 'Bản đồ' },
    { id: 'legend', text: 'Chú giải' },
    { id: 'drum', text: 'Trống hội' },
  ],
  correctIds: ['map', 'legend'],
};

describe('evaluate', () => {
  it('evaluates choice answers as correct or wrong', () => {
    expect(evaluate(choice, { type: 'choice', optionId: 'b' })).toEqual({
      correct: true,
      explanation: choice.explanation,
      invalid: false,
    });
    expect(evaluate(choice, { type: 'choice', optionId: 'a' })).toEqual({
      correct: false,
      explanation: choice.explanation,
      invalid: false,
    });
  });

  it('rejects mismatched or unknown choice ids', () => {
    expect(evaluate(choice, { type: 'order', ids: ['b'] })).toMatchObject({ invalid: true, correct: false });
    expect(evaluate(choice, { type: 'choice', optionId: 'missing' })).toMatchObject({ invalid: true, correct: false });
  });

  it('matches by ids independent of pair order', () => {
    expect(evaluate(match, { type: 'match', pairs: [['chart', 'visual'], ['map', 'scale']] })).toEqual({
      correct: true,
      explanation: match.explanation,
      invalid: false,
    });
  });

  it('rejects duplicate or missing match cards as invalid', () => {
    expect(evaluate(match, { type: 'match', pairs: [['map', 'scale'], ['map', 'visual']] })).toMatchObject({ invalid: true, correct: false });
    expect(evaluate(match, { type: 'match', pairs: [['map', 'scale']] })).toMatchObject({ invalid: true, correct: false });
  });

  it('rejects duplicate or missing order ids as invalid', () => {
    expect(evaluate(order, { type: 'order', ids: ['one', 'one', 'three'] })).toMatchObject({ invalid: true, correct: false });
    expect(evaluate(order, { type: 'order', ids: ['one', 'two'] })).toMatchObject({ invalid: true, correct: false });
    expect(evaluate(order, { type: 'order', ids: ['three', 'two', 'one'] })).toMatchObject({ invalid: false, correct: false });
  });

  it('evaluates a multi-select activity by exact set, independent of option order', () => {
    expect(evaluate(select, { type: 'select', optionIds: ['legend', 'map'] })).toMatchObject({
      correct: true,
      invalid: false,
    });
    expect(evaluate(select, { type: 'select', optionIds: ['map', 'drum'] })).toMatchObject({
      correct: false,
      invalid: false,
    });
  });

  it('rejects duplicate, missing or unknown multi-select option ids', () => {
    expect(evaluate(select, { type: 'select', optionIds: ['map', 'map'] })).toMatchObject({ invalid: true, correct: false });
    expect(evaluate(select, { type: 'select', optionIds: ['map'] })).toMatchObject({ invalid: true, correct: false });
    expect(evaluate(select, { type: 'select', optionIds: ['map', 'missing'] })).toMatchObject({ invalid: true, correct: false });
  });

  it('does not mutate the activity or response', () => {
    const activityBefore = JSON.stringify(match);
    const response = { type: 'match' as const, pairs: [['chart', 'visual'] as [string, string], ['map', 'scale'] as [string, string]] };
    const responseBefore = JSON.stringify(response);
    evaluate(match, response);
    expect(JSON.stringify(match)).toBe(activityBefore);
    expect(JSON.stringify(response)).toBe(responseBefore);
  });
});

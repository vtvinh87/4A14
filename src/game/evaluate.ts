import type { Activity, Choice, Match, Order, Response, Select, Evaluation } from '../content/types';

const INVALID_EXPLANATION = 'Câu trả lời chưa đủ thẻ hoặc có thẻ không hợp lệ. Hãy thử lại nhé.';

function invalidEvaluation(): Evaluation {
  return { correct: false, explanation: INVALID_EXPLANATION, invalid: true };
}

function hasUniqueStrings(values: unknown): values is string[] {
  return Array.isArray(values)
    && values.every((value) => typeof value === 'string')
    && new Set(values).size === values.length;
}

function evaluateChoice(activity: Choice, response: Response): Evaluation {
  const optionIds = activity.options.map((option) => option.id);
  if (!activity.options.length || !hasUniqueStrings(optionIds) || !optionIds.includes(activity.correctId)) {
    return invalidEvaluation();
  }
  if (response.type !== 'choice') return invalidEvaluation();

  const optionId = (response as { optionId?: unknown }).optionId;
  if (typeof optionId !== 'string' || !optionIds.includes(optionId)) return invalidEvaluation();
  return { correct: optionId === activity.correctId, explanation: activity.explanation, invalid: false };
}

function evaluateMatch(activity: Match, response: Response): Evaluation {
  const leftIds = activity.pairs.map((pair) => pair.leftId);
  const rightIds = activity.pairs.map((pair) => pair.rightId);
  if (!activity.pairs.length || !hasUniqueStrings(leftIds) || !hasUniqueStrings(rightIds)) return invalidEvaluation();
  if (response.type !== 'match') return invalidEvaluation();

  const pairs = (response as { pairs?: unknown }).pairs;
  if (!Array.isArray(pairs) || pairs.length !== activity.pairs.length) return invalidEvaluation();
  const seenLeft = new Set<string>();
  const seenRight = new Set<string>();
  let correct = true;

  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' || typeof pair[1] !== 'string') return invalidEvaluation();
    const [leftId, rightId] = pair;
    if (!leftIds.includes(leftId) || !rightIds.includes(rightId) || seenLeft.has(leftId) || seenRight.has(rightId)) return invalidEvaluation();
    seenLeft.add(leftId);
    seenRight.add(rightId);
    const expected = activity.pairs.find((candidate) => candidate.leftId === leftId);
    if (!expected || expected.rightId !== rightId) correct = false;
  }

  if (seenLeft.size !== leftIds.length || seenRight.size !== rightIds.length) return invalidEvaluation();
  return { correct, explanation: activity.explanation, invalid: false };
}

function evaluateOrder(activity: Order, response: Response): Evaluation {
  const itemIds = activity.items.map((item) => item.id);
  if (!itemIds.length || !hasUniqueStrings(itemIds) || !hasUniqueStrings(activity.correctOrder)) return invalidEvaluation();
  if (activity.correctOrder.length !== itemIds.length || !activity.correctOrder.every((id) => itemIds.includes(id))) return invalidEvaluation();
  if (response.type !== 'order') return invalidEvaluation();

  const ids = (response as { ids?: unknown }).ids;
  if (!hasUniqueStrings(ids) || ids.length !== itemIds.length || !ids.every((id) => itemIds.includes(id))) return invalidEvaluation();
  const correct = ids.every((id, index) => id === activity.correctOrder[index]);
  return { correct, explanation: activity.explanation, invalid: false };
}

function evaluateSelect(activity: Select, response: Response): Evaluation {
  const optionIds = activity.options.map((option) => option.id);
  const correctIds = activity.correctIds;
  if (!activity.options.length || !hasUniqueStrings(optionIds) || !hasUniqueStrings(correctIds) || !correctIds.length || !correctIds.every((id) => optionIds.includes(id))) {
    return invalidEvaluation();
  }
  if (response.type !== 'select') return invalidEvaluation();

  const selectedIds = (response as { optionIds?: unknown }).optionIds;
  if (!hasUniqueStrings(selectedIds) || !selectedIds.length || selectedIds.length !== correctIds.length || !selectedIds.every((id) => optionIds.includes(id))) {
    return invalidEvaluation();
  }
  const correctSet = new Set(correctIds);
  const correct = selectedIds.every((id) => correctSet.has(id));
  return { correct, explanation: activity.explanation, invalid: false };
}

/** Purely evaluates a response. It never mutates either input. */
export function evaluate(activity: Activity, response: Response): Evaluation {
  if (activity.type === 'choice') return evaluateChoice(activity, response);
  if (activity.type === 'match') return evaluateMatch(activity, response);
  if (activity.type === 'order') return evaluateOrder(activity, response);
  return evaluateSelect(activity, response);
}

/** Stable, non-random rotation keeps the first puzzle state unsolved and repeatable. */
export function scrambleSequence<T>(items: readonly T[]): T[] {
  if (items.length < 2) return [...items];
  return [...items.slice(1), items[0]];
}

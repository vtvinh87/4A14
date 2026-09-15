import { describe, expect, it } from 'vitest';
import { scrambleSequence } from './interaction';

describe('interaction presentation order', () => {
  it('starts order and match columns in a stable non-solved rotation', () => {
    const ids = ['one', 'two', 'three'];
    expect(scrambleSequence(ids)).toEqual(['two', 'three', 'one']);
    expect(scrambleSequence(ids)).not.toEqual(ids);
    expect(scrambleSequence(['only'])).toEqual(['only']);
  });
});

import { describe, expect, it } from 'vitest';
import {
  p95,
  parseServerTiming,
  redactSensitiveText,
  validateLocalBaseUrl,
} from '../../scripts/measure-load-performance.mjs';

type SyntheticReadFixture = {
  peers: Array<{ id: string; displayName: string; active: boolean; role: 'student' }>;
  featuredQuestions: Array<{ id: string; authorId: string; status: 'approved' }>;
  round: { roundDate: string; status: 'open'; itemIds: string[] };
  week: Array<{ date: string; roundItemIds: string[] }>;
};

function createSyntheticReadFixture(): SyntheticReadFixture {
  const peers = Array.from({ length: 30 }, (_, index) => ({
    id: `peer-${String(index + 1).padStart(2, '0')}`,
    displayName: `Synthetic peer ${String(index + 1).padStart(2, '0')}`,
    active: true,
    role: 'student' as const,
  }));
  const featuredQuestions = Array.from({ length: 5 }, (_, index) => ({
    id: `question-${index + 1}`,
    authorId: peers[index]!.id,
    status: 'approved' as const,
  }));
  const round = {
    roundDate: '2026-09-17',
    status: 'open' as const,
    itemIds: featuredQuestions.map((question) => `item-${question.id}`),
  };
  const week = Array.from({ length: 7 }, (_, index) => ({
    date: `2026-09-${String(index + 11).padStart(2, '0')}`,
    roundItemIds: Array.from({ length: 5 }, (_, itemIndex) => `week-${index + 1}-item-${itemIndex + 1}`),
  }));
  return { peers, featuredQuestions, round, week };
}

function createStatementCounter() {
  let repositoryCalls = 0;
  let sqlStatements = 0;
  let transactionStatements = 0;
  return {
    recordRepositoryCall() { repositoryCalls += 1; },
    recordStatement(inTransaction = false) {
      sqlStatements += 1;
      if (inTransaction) transactionStatements += 1;
    },
    snapshot() {
      return { repositoryCalls, sqlStatements, transactionStatements };
    },
  };
}

describe('load performance measurement helpers', () => {
  it('computes nearest-rank p95 for small and 100-sample inputs', () => {
    expect(p95([100, 200, 300, 400, 500])).toBe(500);
    expect(p95(Array.from({ length: 100 }, (_, index) => index + 1))).toBe(95);
  });

  it('parses finite Server-Timing durations and ignores malformed entries', () => {
    expect(parseServerTiming('auth;dur=12.5, data;dur=0, total;dur=31.25, token;desc=x')).toEqual({
      auth: 12.5,
      data: 0,
      total: 31.25,
    });
  });

  it('accepts localhost benchmark targets and rejects external targets', () => {
    expect(validateLocalBaseUrl('http://127.0.0.1:8888').hostname).toBe('127.0.0.1');
    expect(validateLocalBaseUrl('http://localhost:4173').hostname).toBe('localhost');
    expect(() => validateLocalBaseUrl('https://example.invalid')).toThrow('localhost');
  });

  it('redacts tokens and response bodies from benchmark error text', () => {
    expect(redactSensitiveText('token=secret-token body={"studentId":"child-1"}', 'secret-token')).toBe('token=[REDACTED] body=[REDACTED]');
  });
});

describe('synthetic read-budget fixture boundary', () => {
  it('keeps the deterministic roster, daily round and weekly dataset shape', () => {
    const fixture = createSyntheticReadFixture();

    expect(fixture.peers).toHaveLength(30);
    expect(fixture.featuredQuestions).toHaveLength(5);
    expect(new Set(fixture.featuredQuestions.map((question) => question.authorId)).size).toBe(5);
    expect(fixture.round).toEqual({
      roundDate: '2026-09-17',
      status: 'open',
      itemIds: ['item-question-1', 'item-question-2', 'item-question-3', 'item-question-4', 'item-question-5'],
    });
    expect(fixture.week).toHaveLength(7);
    expect(fixture.week.every((day) => day.roundItemIds)).toBe(true);
  });

  it('keeps repository-call counts separate from SQL statements including transaction work', () => {
    const counter = createStatementCounter();
    counter.recordRepositoryCall();
    counter.recordStatement();
    counter.recordStatement(true);

    expect(counter.snapshot()).toEqual({ repositoryCalls: 1, sqlStatements: 2, transactionStatements: 1 });
  });
});

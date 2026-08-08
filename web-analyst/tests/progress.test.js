import { describe, it, expect } from 'vitest';
import { applyResults, frequentWrongIds, unseenCount, buildSession } from '../src/domain/progress';

const res = (questionId, correct, over = {}) => ({
  questionId, correct,
  selectedAnswers: [0],
  domain: 'metrics', module: 'ch1', difficulty: 'beginner',
  ...over,
});

const state = (over = {}) => ({ wrongIds: new Set(), wrongCounts: {}, lastSeen: {}, ...over });

describe('applyResults — 昇華処理（要件 L-3）', () => {
  it('正解すると wrongIds と wrongCounts の両方から消える', () => {
    const prev = state({ wrongIds: new Set([7]), wrongCounts: { 7: 3 } });
    const next = applyResults(prev, [res(7, true)], 1000);
    expect(next.wrongIds.has(7)).toBe(false);
    expect(next.wrongCounts[7]).toBeUndefined();
  });

  it('3 回間違えた問題でも 1 回正解すれば要注意問題を卒業する（減算ではなく削除）', () => {
    const prev = state({ wrongIds: new Set([7]), wrongCounts: { 7: 3 } });
    const next = applyResults(prev, [res(7, true)], 1000);
    expect(frequentWrongIds(next.wrongCounts)).toEqual([]);
  });

  it('誤答すると wrongIds に追加され wrongCounts が 1 増える', () => {
    const prev = state({ wrongCounts: { 7: 1 } });
    const next = applyResults(prev, [res(7, false)], 1000);
    expect(next.wrongIds.has(7)).toBe(true);
    expect(next.wrongCounts[7]).toBe(2);
  });

  it('昇華数は「更新前」の wrongIds / wrongCounts を参照して算出される', () => {
    // 更新後の値を見てしまうと、正解した問題は既にリストから消えており常に 0 になる
    const prev = state({ wrongIds: new Set([1, 2]), wrongCounts: { 1: 2, 2: 1 } });
    const next = applyResults(prev, [res(1, true), res(2, true), res(3, true)], 1000);
    expect(next.promotedCount).toBe(2); // 3 は元々苦手ではないので昇華に数えない
  });

  it('苦手リストにないが累積誤答が残っている問題も昇華に数える', () => {
    const prev = state({ wrongIds: new Set(), wrongCounts: { 5: 2 } });
    expect(applyResults(prev, [res(5, true)], 1000).promotedCount).toBe(1);
  });

  it('lastSeen が全ての解答済み問題に対して更新される', () => {
    const prev = state({ lastSeen: { 1: 100 } });
    const next = applyResults(prev, [res(1, true), res(2, false)], 5000);
    expect(next.lastSeen).toEqual({ 1: 5000, 2: 5000 });
  });

  it('元の state を破壊しない', () => {
    const prev = state({ wrongIds: new Set([1]), wrongCounts: { 1: 1 }, lastSeen: { 1: 10 } });
    applyResults(prev, [res(1, true), res(2, false)], 5000);
    expect([...prev.wrongIds]).toEqual([1]);
    expect(prev.wrongCounts).toEqual({ 1: 1 });
    expect(prev.lastSeen).toEqual({ 1: 10 });
  });
});

describe('frequentWrongIds — 要注意問題', () => {
  it('累積誤答 2 回以上のみを返す', () => {
    expect(frequentWrongIds({ 1: 1, 2: 2, 3: 5 }).sort((a, b) => a - b)).toEqual([2, 3]);
  });
  it('数値の ID を返す（localStorage 復元後の文字列キー対策）', () => {
    expect(frequentWrongIds({ 42: 2 })).toEqual([42]);
  });
});

describe('unseenCount — seenIds を廃止し lastSeen のキーで代替（改善 I-8）', () => {
  it('lastSeen にキーがない問題を未出題として数える', () => {
    const qs = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(unseenCount(qs, { 1: 100 })).toBe(2);
  });
  it('lastSeen が 0 でも「出題済み」として扱う', () => {
    expect(unseenCount([{ id: 1 }], { 1: 0 })).toBe(0);
  });
});

describe('buildSession', () => {
  const results = [
    res(1, true, { domain: 'metrics', module: 'ch1', difficulty: 'beginner' }),
    res(2, false, { domain: 'metrics', module: 'ch1', difficulty: 'advanced' }),
    res(3, true, { domain: 'strategy', module: 'ch2', difficulty: 'beginner' }),
  ];

  it('正答率を四捨五入した整数で持つ', () => {
    expect(buildSession(results, {}, 1000).accuracy).toBe(67);
  });

  it('章別集計 byModule を記録する（改善 I-3）', () => {
    expect(buildSession(results, {}, 1000).byModule).toEqual({
      ch1: { correct: 1, total: 2 },
      ch2: { correct: 1, total: 1 },
    });
  });

  it('領域別・難易度別・領域×難易度の集計を持つ', () => {
    const s = buildSession(results, {}, 1000);
    expect(s.byDomain).toEqual({ metrics: { correct: 1, total: 2 }, strategy: { correct: 1, total: 1 } });
    expect(s.byDifficulty.beginner).toEqual({ correct: 2, total: 2 });
    expect(s.byDomainDiff['metrics_advanced']).toEqual({ correct: 0, total: 1 });
  });

  it('0 問のセッションでも正答率が NaN にならない', () => {
    expect(buildSession([], {}, 1000).accuracy).toBe(0);
  });
});

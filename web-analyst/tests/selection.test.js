import { describe, it, expect } from 'vitest';
import { matchesFilter, byRecency, shuffleOptions, selectQuestions, selectFromIds } from '../src/domain/selection';

const q = (id, over = {}) => ({
  id,
  domain: 'metrics',
  module: 'ch1',
  difficulty: 'beginner',
  question: `Q${id}`,
  options: [`${id}-a`, `${id}-b`, `${id}-c`, `${id}-d`],
  correctAnswers: [0],
  multiSelect: false,
  explanation: '',
  ...over,
});

const ALL = 'all';
const cfg = over => ({ difficulty: ALL, domain: ALL, module: ALL, filterType: 'domain', count: 10, ...over });

describe('matchesFilter', () => {
  it('難易度は常に適用される', () => {
    expect(matchesFilter(q(1, { difficulty: 'advanced' }), cfg({ difficulty: 'beginner' }))).toBe(false);
    expect(matchesFilter(q(1, { difficulty: 'advanced' }), cfg({ difficulty: 'advanced' }))).toBe(true);
  });

  it('filterType=domain のときモジュール指定は無視される', () => {
    const target = q(1, { domain: 'strategy', module: 'ch2' });
    expect(matchesFilter(target, cfg({ filterType: 'domain', domain: 'strategy', module: 'ch8' }))).toBe(true);
    expect(matchesFilter(target, cfg({ filterType: 'domain', domain: 'design' }))).toBe(false);
  });

  it('filterType=module のとき領域指定は無視される', () => {
    const target = q(1, { domain: 'strategy', module: 'ch2' });
    expect(matchesFilter(target, cfg({ filterType: 'module', module: 'ch2', domain: 'design' }))).toBe(true);
    expect(matchesFilter(target, cfg({ filterType: 'module', module: 'ch5' }))).toBe(false);
  });
});

describe('byRecency（要件 L-1）', () => {
  it('未出題が最優先になる', () => {
    const items = [q(1), q(2), q(3)];
    const lastSeen = { 1: 5000, 3: 9000 }; // 2 は未出題
    const ordered = byRecency(items, lastSeen);
    expect(ordered[0].id).toBe(2);
    expect(ordered.map(x => x.id)).toEqual([2, 1, 3]);
  });

  it('経過が長い順に並ぶ（直近に解いた問題ほど後ろ）', () => {
    const items = [q(1), q(2), q(3)];
    const lastSeen = { 1: 300, 2: 100, 3: 200 };
    expect(byRecency(items, lastSeen).map(x => x.id)).toEqual([2, 3, 1]);
  });

  it('同一タイムスタンプの問題群は順序がランダム化される', () => {
    const items = Array.from({ length: 12 }, (_, i) => q(i + 1));
    const lastSeen = Object.fromEntries(items.map(x => [x.id, 1000])); // 全部同時刻
    const seen = new Set();
    for (let i = 0; i < 40; i++) seen.add(byRecency(items, lastSeen).map(x => x.id).join(','));
    expect(seen.size).toBeGreaterThan(1);
  });

  it('元の配列を破壊しない', () => {
    const items = [q(3), q(1), q(2)];
    byRecency(items, { 1: 1, 2: 2, 3: 3 });
    expect(items.map(x => x.id)).toEqual([3, 1, 2]);
  });
});

describe('selectQuestions（要件 L-1 / L-2）', () => {
  const pool = Array.from({ length: 10 }, (_, i) => q(i + 1));

  it('直前のセッションで解いた問題は再選択されない', () => {
    // 1〜5 を直前のセッションで解いた想定。未出題の 6〜10 が優先される
    const lastSeen = { 1: 9999, 2: 9999, 3: 9999, 4: 9999, 5: 9999 };
    const picked = selectQuestions(pool, cfg({ count: 5 }), new Set(), lastSeen);
    expect(picked.map(x => x.id).sort((a, b) => a - b)).toEqual([6, 7, 8, 9, 10]);
  });

  it('苦手問題は通常出題では後回しになる', () => {
    const wrongIds = new Set([1, 2, 3]);
    const picked = selectQuestions(pool, cfg({ count: 5 }), wrongIds, {});
    expect(picked.some(x => wrongIds.has(x.id))).toBe(false);
  });

  it('通常プールで足りない場合のみ苦手問題で補充される', () => {
    const wrongIds = new Set([1, 2, 3, 4, 5, 6, 7, 8]); // 通常プールは 9, 10 のみ
    const picked = selectQuestions(pool, cfg({ count: 5 }), wrongIds, {});
    expect(picked).toHaveLength(5);
    expect(picked.map(x => x.id)).toEqual(expect.arrayContaining([9, 10]));
    expect(picked.filter(x => wrongIds.has(x.id))).toHaveLength(3);
  });

  it('条件に合う問題数より多い count を指定しても溢れない', () => {
    const picked = selectQuestions(pool, cfg({ count: 20 }), new Set(), {});
    expect(picked).toHaveLength(10);
  });

  it('絞り込み条件が適用される', () => {
    const mixed = [q(1, { domain: 'metrics' }), q(2, { domain: 'strategy' }), q(3, { domain: 'strategy' })];
    const picked = selectQuestions(mixed, cfg({ domain: 'strategy', count: 10 }), new Set(), {});
    expect(picked.map(x => x.id).sort()).toEqual([2, 3]);
  });
});

describe('selectFromIds（要件 F-1 / F-2）', () => {
  it('絞り込みも問題数指定も適用せず該当する全問を出題する', () => {
    const pool = Array.from({ length: 10 }, (_, i) => q(i + 1, { difficulty: i % 2 ? 'advanced' : 'beginner' }));
    const picked = selectFromIds(pool, new Set([1, 4, 7, 9]));
    expect(picked.map(x => x.id).sort((a, b) => a - b)).toEqual([1, 4, 7, 9]);
  });
});

describe('shuffleOptions（要件 Q-7）', () => {
  it('シャッフル後も correctAnswers が正解テキストを指し続ける', () => {
    const src = q(1, { correctAnswers: [2] });
    const correctText = src.options[2];
    for (let i = 0; i < 50; i++) {
      const [out] = shuffleOptions([src]);
      expect(out.options[out.correctAnswers[0]]).toBe(correctText);
      expect([...out.options].sort()).toEqual([...src.options].sort());
    }
  });

  it('複数選択でも全ての正解テキストを指し続け、昇順に整列される', () => {
    const src = q(1, { correctAnswers: [0, 3], multiSelect: true });
    const texts = [src.options[0], src.options[3]];
    for (let i = 0; i < 50; i++) {
      const [out] = shuffleOptions([src]);
      expect(out.correctAnswers.map(i2 => out.options[i2]).sort()).toEqual([...texts].sort());
      expect(out.correctAnswers).toEqual([...out.correctAnswers].sort((a, b) => a - b));
    }
  });

  it('元の問題オブジェクトを書き換えない', () => {
    const src = q(1, { correctAnswers: [2] });
    const before = JSON.stringify(src);
    shuffleOptions([src]);
    expect(JSON.stringify(src)).toBe(before);
  });
});

import { describe, it, expect } from 'vitest';
import {
  summarize, accuracyTrend, domainStats, moduleStats,
  difficultyStats, heatmap, dailyCounts, goalRate, timeSlotStats, domainGrowth,
} from '../src/screens/HistoryScreen/analytics';

const session = (over = {}) => ({
  id: 1, date: '2026-08-01T12:00:00.000Z', config: {},
  total: 10, correct: 7, accuracy: 70,
  byDomain: { metrics: { correct: 7, total: 10 } },
  byDifficulty: { beginner: { correct: 7, total: 10 } },
  byModule: { ch1: { correct: 7, total: 10 } },
  byDomainDiff: { metrics_beginner: { correct: 7, total: 10 } },
  ...over,
});

describe('summarize', () => {
  it('平均正答率は総正解数 ÷ 総解答数で求める（セッション平均ではない）', () => {
    const h = [session({ total: 20, correct: 20, accuracy: 100 }), session({ total: 5, correct: 0, accuracy: 0 })];
    expect(summarize(h).overallAccuracy).toBe(80);
  });

  it('連続達成は末尾から遡って合格ライン未満で止まる', () => {
    const h = [session({ accuracy: 90 }), session({ accuracy: 50 }), session({ accuracy: 80 }), session({ accuracy: 70 })];
    expect(summarize(h).streak).toBe(2);
  });

  it('空の履歴でも壊れない', () => {
    expect(summarize([])).toMatchObject({ totalQuizzes: 0, overallAccuracy: 0, bestScore: 0, streak: 0 });
  });
});

describe('accuracyTrend（要件 RP-1: 全履歴）', () => {
  it('全件を返す（直近 N 件に切り詰めない）', () => {
    const h = Array.from({ length: 40 }, (_, i) => session({ accuracy: i }));
    expect(accuracyTrend(h)).toHaveLength(40);
  });

  it('avg3 は自身を含む直近 3 件の平均で、先頭付近は存在する件数で平均する', () => {
    const h = [session({ accuracy: 60 }), session({ accuracy: 90 }), session({ accuracy: 30 })];
    expect(accuracyTrend(h).map(p => p.avg3)).toEqual([60, 75, 60]);
  });
});

describe('章別・領域別・難易度別の集計', () => {
  const h = [
    session({ byModule: { ch1: { correct: 3, total: 5 }, ch5: { correct: 5, total: 5 } } }),
    session({ byModule: { ch1: { correct: 5, total: 5 } } }),
  ];

  it('moduleStats は章をまたいで合算する（改善 I-3）', () => {
    const stats = moduleStats(h);
    expect(stats.find(s => s.key === 'ch1')).toMatchObject({ correct: 8, total: 10, accuracy: 80 });
    expect(stats.find(s => s.key === 'ch5')).toMatchObject({ correct: 5, total: 5, accuracy: 100 });
  });

  it('moduleStats は公式テキストの章順で並ぶ', () => {
    const stats = moduleStats([session({ byModule: { ch8: { correct: 1, total: 1 }, ch2: { correct: 1, total: 1 } } })]);
    expect(stats.map(s => s.key)).toEqual(['ch2', 'ch8']);
  });

  it('byModule を持たない古い履歴が混ざっても落ちない', () => {
    const legacy = session();
    delete legacy.byModule;
    expect(() => moduleStats([legacy, session()])).not.toThrow();
    expect(moduleStats([legacy, session()])).toHaveLength(1);
  });

  it('domainStats は初回→直近の増減を持つ', () => {
    const hh = [
      session({ byDomain: { metrics: { correct: 5, total: 10 } } }),
      session({ byDomain: { metrics: { correct: 9, total: 10 } } }),
    ];
    expect(domainStats(hh)[0]).toMatchObject({ key: 'metrics', accuracy: 70, growth: 40 });
  });

  it('difficultyStats は初級→中級→上級の順で返す', () => {
    const hh = [session({ byDifficulty: {
      advanced: { correct: 1, total: 2 },
      beginner: { correct: 2, total: 2 },
    } })];
    expect(difficultyStats(hh).map(s => s.key)).toEqual(['beginner', 'advanced']);
  });

  it('heatmap は領域×難易度で合算する', () => {
    expect(heatmap([session(), session()])['metrics_beginner']).toEqual({ c: 14, t: 20 });
  });
});

describe('dailyCounts', () => {
  it('初回記録日から今日まで全日付を生成し、記録のない日は 0 で埋める', () => {
    const h = [session({ date: '2026-08-01T03:00:00.000Z', total: 10 })];
    const days = dailyCounts(h, new Date('2026-08-05T03:00:00.000Z'));
    expect(days).toHaveLength(5);
    expect(days[0].total).toBe(10);
    expect(days.slice(1).every(d => d.total === 0)).toBe(true);
  });

  it('空の履歴では空配列', () => {
    expect(dailyCounts([])).toEqual([]);
  });
});

describe('goalRate / timeSlotStats / domainGrowth', () => {
  it('goalRate は合格ライン以上のセッション割合', () => {
    expect(goalRate([session({ accuracy: 70 }), session({ accuracy: 69 })])).toBe(50);
    expect(goalRate([])).toBe(0);
  });

  it('timeSlotStats は記録のある時間帯だけを返す', () => {
    const slots = timeSlotStats([session()]);
    expect(slots).toHaveLength(1);
    expect(slots[0].accuracy).toBe(70);
  });

  it('domainGrowth は履歴が 1 件だと比較しない', () => {
    expect(domainGrowth([session()])).toEqual([]);
  });

  it('domainGrowth は初回 vs 直近 5 件平均を比較する', () => {
    const h = [
      session({ byDomain: { metrics: { correct: 2, total: 10 } } }),
      session({ byDomain: { metrics: { correct: 8, total: 10 } } }),
    ];
    expect(domainGrowth(h)[0]).toMatchObject({ key: 'metrics', before: 20, after: 50, diff: 30 });
  });
});

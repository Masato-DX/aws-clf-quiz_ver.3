// src/screens/HistoryScreen/analytics.js
// 学習レポートの集計ロジック。React に依存しない純粋関数として実装し、単体テストの対象とする。
// すべて history（Session[]）のみから導出する。

import { EXAM } from '../../config';
import { DOMAINS, DIFFICULTIES, MODULES, DIFFICULTY_KEYS, DOMAIN_KEYS, CHAPTER_KEYS } from '../../data/taxonomy';

const PASS = EXAM.passLine;

/** サマリ 4 指標 ＋ 連続達成回数 */
export function summarize(history) {
  const totalQuestions = history.reduce((s, h) => s + h.total, 0);
  const totalCorrect = history.reduce((s, h) => s + h.correct, 0);
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].accuracy >= PASS) streak++;
    else break;
  }
  return {
    totalQuizzes: history.length,
    totalQuestions,
    totalCorrect,
    overallAccuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
    bestScore: history.length > 0 ? Math.max(...history.map(h => h.accuracy)) : 0,
    streak,
  };
}

/**
 * 正答率の推移（要件 RP-1: 直近 N 件ではなく全履歴）。
 * avg3 は自身を含む直近 3 件の平均（先頭付近は存在する件数で平均する）。
 */
export function accuracyTrend(history) {
  return history.map((h, i) => {
    const w = history.slice(Math.max(0, i - 2), i + 1);
    return {
      idx: i + 1,
      accuracy: h.accuracy,
      avg3: Math.round(w.reduce((s, x) => s + x.accuracy, 0) / w.length),
      date: new Date(h.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
    };
  });
}

/** 履歴中の by* 集計を横断合算する */
function accumulate(history, field) {
  const m = {};
  history.forEach(h => {
    const src = h[field];
    if (!src) return;
    Object.entries(src).forEach(([k, s]) => {
      if (!m[k]) m[k] = { c: 0, t: 0, sessions: [] };
      m[k].c += s.correct;
      m[k].t += s.total;
      m[k].sessions.push(Math.round((s.correct / s.total) * 100));
    });
  });
  return m;
}

/** 領域別の累計成績（初回→直近の増減つき） */
export function domainStats(history) {
  const m = accumulate(history, 'byDomain');
  return Object.entries(m)
    .filter(([k]) => DOMAINS[k])
    .map(([k, s]) => ({
      key: k,
      ...DOMAINS[k],
      accuracy: Math.round((s.c / s.t) * 100),
      growth: s.sessions[s.sessions.length - 1] - s.sessions[0],
      total: s.t,
    }))
    .sort((a, b) => b.total - a.total);
}

/** 章（モジュール）別の累計成績。移植元では記録されておらず分析できなかった軸（改善 I-3） */
export function moduleStats(history) {
  const m = accumulate(history, 'byModule');
  return CHAPTER_KEYS
    .filter(k => m[k])
    .map(k => ({
      key: k,
      ...MODULES[k],
      accuracy: Math.round((m[k].c / m[k].t) * 100),
      correct: m[k].c,
      total: m[k].t,
    }));
}

/** 難易度別の累計成績 */
export function difficultyStats(history) {
  const m = accumulate(history, 'byDifficulty');
  return DIFFICULTY_KEYS
    .filter(k => m[k])
    .map(k => ({
      key: k,
      ...DIFFICULTIES[k],
      accuracy: Math.round((m[k].c / m[k].t) * 100),
      correct: m[k].c,
      total: m[k].t,
    }));
}

/** 難易度 × 領域ヒートマップ用の合算 */
export function heatmap(history) {
  const m = accumulate(history, 'byDomainDiff');
  const out = {};
  Object.entries(m).forEach(([k, s]) => { out[k] = { c: s.c, t: s.t }; });
  return out;
}

/** 日別の解答数。初回記録日から今日まで全日付を生成し、記録のない日は 0 で埋める */
export function dailyCounts(history, today = new Date()) {
  if (history.length === 0) return [];
  const fmt = d => d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
  const m = {};
  history.forEach(h => {
    const key = fmt(new Date(h.date));
    if (!m[key]) m[key] = { date: key, total: 0, correct: 0 };
    m[key].total += h.total;
    m[key].correct += h.correct;
  });
  const start = new Date(history[0].date); start.setHours(0, 0, 0, 0);
  const end = new Date(today); end.setHours(0, 0, 0, 0);
  const days = [];
  for (let t = new Date(start); t <= end; t.setDate(t.getDate() + 1)) {
    const key = fmt(t);
    days.push(m[key] || { date: key, total: 0, correct: 0 });
  }
  return days;
}

/** 合格ライン以上のセッションの割合 */
export function goalRate(history) {
  if (history.length === 0) return 0;
  return Math.round((history.filter(h => h.accuracy >= PASS).length / history.length) * 100);
}

/** 時間帯別の正答率（朝／昼／夕／夜） */
export function timeSlotStats(history) {
  const slots = { 朝: { c: 0, t: 0 }, 昼: { c: 0, t: 0 }, 夕: { c: 0, t: 0 }, 夜: { c: 0, t: 0 } };
  history.forEach(h => {
    const hr = new Date(h.date).getHours();
    const s = hr < 10 ? '朝' : hr < 14 ? '昼' : hr < 18 ? '夕' : '夜';
    slots[s].c += h.correct;
    slots[s].t += h.total;
  });
  return Object.entries(slots)
    .filter(([, s]) => s.t > 0)
    .map(([label, s]) => ({ label, accuracy: Math.round((s.c / s.t) * 100), total: s.t }));
}

/** 領域別の成長：初回 1 件 vs 直近 5 件平均 */
export function domainGrowth(history) {
  if (history.length < 2) return [];
  const calc = hs => {
    const m = {};
    hs.forEach(h => Object.entries(h.byDomain || {}).forEach(([d, s]) => {
      if (!m[d]) m[d] = { c: 0, t: 0 };
      m[d].c += s.correct;
      m[d].t += s.total;
    }));
    return m;
  };
  const first = calc([history[0]]);
  const last = calc(history.slice(-Math.min(5, history.length)));
  return DOMAIN_KEYS.filter(k => last[k]).map(k => {
    const after = Math.round((last[k].c / last[k].t) * 100);
    const before = first[k] ? Math.round((first[k].c / first[k].t) * 100) : null;
    return { key: k, ...DOMAINS[k], before, after, diff: before === null ? null : after - before };
  });
}

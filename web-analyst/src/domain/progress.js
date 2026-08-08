// src/domain/progress.js
// 学習の進捗（苦手問題の追跡・昇華処理）とセッション集計。
//
// 【重要】昇華処理は要件 L-3 の仕様であり、変更しないこと。
//   - 正解したら wrongIds から除外する
//   - 正解したら wrongCounts も「削除」する（減算ではない）
//     → 3 回間違えた問題でも 1 回正解すれば「要注意問題」を卒業する
//
// 移植元では「昇華数の算出を wrongIds / wrongCounts の更新より前に行う」という
// 実行順序に依存していた。本実装では更新前の状態を引数で受け取る純粋関数にして、
// 順序を間違えて昇華数が常に 0 になる事故を構造的に防いでいる。

/** 累積誤答が 2 回以上の問題 ID（＝要注意問題）を返す */
export function frequentWrongIds(wrongCounts) {
  return Object.keys(wrongCounts).filter(id => wrongCounts[id] >= 2).map(Number);
}

/**
 * セッションの解答結果から、追跡データの次の状態と昇華数を計算する。
 *
 * @param {object} prev    { wrongIds: Set<number>, wrongCounts: object, lastSeen: object }
 * @param {object[]} results makeResult() で作った解答結果の配列
 * @param {number} now     epoch ms（テストのため注入可能にしている）
 * @returns {{ wrongIds: Set<number>, wrongCounts: object, lastSeen: object, promotedCount: number }}
 */
export function applyResults(prev, results, now = Date.now()) {
  // ① 昇華数は「更新前」の状態に対して評価する。
  //    正解した かつ（苦手リストにある または 累積誤答が 1 回以上ある）問題が昇華対象。
  const promotedCount = results.filter(
    r => r.correct && (prev.wrongIds.has(r.questionId) || (prev.wrongCounts[r.questionId] || 0) > 0)
  ).length;

  // ② 苦手問題：正解で除外、誤答で追加
  const wrongIds = new Set(prev.wrongIds);
  results.forEach(r => {
    if (r.correct) wrongIds.delete(r.questionId);
    else wrongIds.add(r.questionId);
  });

  // ③ 累積誤答回数：正解で削除（＝要注意問題から卒業）、誤答で +1
  const wrongCounts = { ...prev.wrongCounts };
  results.forEach(r => {
    if (r.correct) delete wrongCounts[r.questionId];
    else wrongCounts[r.questionId] = (wrongCounts[r.questionId] || 0) + 1;
  });

  // ④ 最終出題日時を更新（要件 L-1 の判定材料）。
  //    キーの有無がそのまま「出題済みかどうか」を表すため、seenIds は保持しない。
  const lastSeen = { ...prev.lastSeen };
  results.forEach(r => { lastSeen[r.questionId] = now; });

  return { wrongIds, wrongCounts, lastSeen, promotedCount };
}

/** 未出題の問題数を数える（lastSeen のキー有無で判定する） */
export function unseenCount(questions, lastSeen) {
  return questions.filter(q => !(q.id in lastSeen)).length;
}

/** results から {キー: {correct, total}} 形式の集計を作る */
function tally(results, keyOf) {
  const m = {};
  results.forEach(r => {
    const k = keyOf(r);
    if (!m[k]) m[k] = { correct: 0, total: 0 };
    m[k].total++;
    if (r.correct) m[k].correct++;
  });
  return m;
}

/**
 * 1 セッション分の履歴レコードを作る。
 * byModule を含めることで、レポートで章別分析ができる。
 */
export function buildSession(results, config, now = Date.now()) {
  const total = results.length;
  const correct = results.filter(r => r.correct).length;
  return {
    id: now,
    date: new Date(now).toISOString(),
    config: { ...config },
    total,
    correct,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    byDomain: tally(results, r => r.domain),
    byDifficulty: tally(results, r => r.difficulty),
    byModule: tally(results, r => r.module),
    byDomainDiff: tally(results, r => `${r.domain}_${r.difficulty}`),
  };
}

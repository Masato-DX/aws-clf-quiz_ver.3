// src/domain/selection.js
// 出題選択アルゴリズム。React に依存しない純粋関数として実装する。
//
// 【重要】このファイルの仕様は移植元アプリ（AWS CLF-C02 版）で実運用しながら
// 3 回改善した結果であり、本アプリの中核価値である。仕様を変更しないこと。

/** Fisher-Yates シャッフル。元配列は破壊しない */
export function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/**
 * 難易度・領域（またはモジュール）の絞り込み条件に問題が合致するか判定する。
 * 難易度は常に適用し、領域とモジュールは filterType により排他で適用する。
 */
export function matchesFilter(q, config) {
  if (config.difficulty !== 'all' && q.difficulty !== config.difficulty) return false;
  if (config.filterType === 'module') return config.module === 'all' || q.module === config.module;
  return config.domain === 'all' || q.domain === config.domain;
}

/**
 * 「最後に出題してからの経過が長い順」に並べ替える（要件 L-1）。
 * lastSeen を持たない未出題の問題は 0 として扱われ、最優先になる。
 *
 * 先に shuffle しておくことで、同一タイムスタンプを持つ問題群
 * （＝同じセッションで解いた問題）の順序がランダム化される。
 * Array.prototype.sort は安定ソートのため、この前処理が意図どおり効く。
 */
export function byRecency(arr, lastSeenMap) {
  return shuffle(arr).sort((a, b) => (lastSeenMap[a.id] || 0) - (lastSeenMap[b.id] || 0));
}

/**
 * 選択肢をシャッフルし、正解インデックスを新しい位置へ追随させる（要件 Q-7）。
 * 正解を「テキスト」で退避してから引き直すため、選択肢に完全に同一の文字列が
 * 含まれてはならない（tests/questions.test.js で検証している）。
 */
export function shuffleOptions(picked) {
  return picked.map(q => {
    const correctTexts = q.correctAnswers.map(i => q.options[i]);
    const newOpts = shuffle([...q.options]);
    const newCorrectAnswers = correctTexts.map(t => newOpts.indexOf(t)).sort((a, b) => a - b);
    return { ...q, options: newOpts, correctAnswers: newCorrectAnswers };
  });
}

/**
 * 通常出題の問題選択（要件 L-1 / L-2）。
 *
 * 優先順位:
 *   1. 未出題の問題（lastSeen なし）
 *   2. 最後に出題してから最も時間が経った問題
 *   3. 苦手問題（1・2 で問題数を満たせない場合のみ補充）
 *
 * @param {object[]} allQuestions 全問題
 * @param {object} config         出題条件
 * @param {Set<number>} wrongIds  現在「間違えたまま」の問題 ID
 * @param {object} lastSeenMap    { [id]: epochMs }
 * @returns {object[]} 出題順にシャッフルし、選択肢もシャッフル済みの問題配列
 */
export function selectQuestions(allQuestions, config, wrongIds, lastSeenMap) {
  const filtered = allQuestions.filter(q => matchesFilter(q, config));
  const notWrong = filtered.filter(q => !wrongIds.has(q.id));
  const wrongOnes = filtered.filter(q => wrongIds.has(q.id));
  const need = Math.min(config.count, filtered.length);

  const fromNotWrong = byRecency(notWrong, lastSeenMap).slice(0, need);
  // 通常プールで足りない分だけ苦手プールから補充する
  const fromWrong = byRecency(wrongOnes, lastSeenMap).slice(0, need - fromNotWrong.length);

  return shuffleOptions(shuffle([...fromNotWrong, ...fromWrong]));
}

/**
 * 復習モードの問題選択（要件 F-1 / F-2）。
 * 絞り込みも問題数の指定も適用せず、該当する全問を出題する。
 */
export function selectFromIds(allQuestions, ids) {
  return shuffleOptions(shuffle(allQuestions.filter(q => ids.has(q.id))));
}

// src/domain/grading.js
// 正誤判定。部分点なし（要件 Q-8）。

/** 集合として一致するか判定する。複数選択の部分一致は不正解 */
export function arraysEqual(a, b) {
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
}

/** 解答が正解かどうか */
export function isCorrect(selectedAnswers, question) {
  return arraysEqual(selectedAnswers, question.correctAnswers);
}

/** 1 問分の解答結果レコードを作る */
export function makeResult(question, selectedAnswers) {
  return {
    questionId: question.id,
    selectedAnswers: [...selectedAnswers],
    correct: isCorrect(selectedAnswers, question),
    domain: question.domain,
    module: question.module,
    difficulty: question.difficulty,
  };
}

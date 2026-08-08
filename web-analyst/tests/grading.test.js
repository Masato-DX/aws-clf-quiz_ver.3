import { describe, it, expect } from 'vitest';
import { arraysEqual, isCorrect, makeResult } from '../src/domain/grading';

describe('arraysEqual（要件 Q-8: 部分点なし）', () => {
  it('順序が違っても集合として一致すれば true', () => {
    expect(arraysEqual([2, 0], [0, 2])).toBe(true);
  });
  it('複数選択の部分一致は不正解', () => {
    expect(arraysEqual([0], [0, 2])).toBe(false);
  });
  it('余分に選んだ場合も不正解', () => {
    expect(arraysEqual([0, 1, 2], [0, 2])).toBe(false);
  });
  it('空の解答は不正解', () => {
    expect(arraysEqual([], [1])).toBe(false);
  });
});

describe('makeResult', () => {
  const question = {
    id: 42, domain: 'design', module: 'ch4', difficulty: 'intermediate',
    options: ['a', 'b', 'c', 'd'], correctAnswers: [1, 3], multiSelect: true,
  };

  it('正誤と分類（領域・章・難易度）を記録する', () => {
    const r = makeResult(question, [3, 1]);
    expect(r).toEqual({
      questionId: 42, selectedAnswers: [3, 1], correct: true,
      domain: 'design', module: 'ch4', difficulty: 'intermediate',
    });
  });

  it('選択配列をコピーして保持する（後続の変更に引きずられない）', () => {
    const selected = [1, 3];
    const r = makeResult(question, selected);
    selected.push(0);
    expect(r.selectedAnswers).toEqual([1, 3]);
  });

  it('isCorrect は完全一致のみ true', () => {
    expect(isCorrect([1], question)).toBe(false);
    expect(isCorrect([1, 3], question)).toBe(true);
  });
});

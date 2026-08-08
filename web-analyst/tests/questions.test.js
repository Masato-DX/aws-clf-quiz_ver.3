import { describe, it, expect } from 'vitest';
import { QUESTIONS } from '../src/data/questions';
import { DOMAINS, DIFFICULTIES, MODULES } from '../src/data/taxonomy';

/** サロゲートペアを 1 文字として数える */
const len = s => [...s].length;

const label = q => `Q${q.id}(${q.module}/${q.domain}/${q.difficulty})`;

describe('問題データの構造', () => {
  it('ID が一意である', () => {
    const ids = QUESTIONS.map(q => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ID が昇順に採番されている', () => {
    const ids = QUESTIONS.map(q => q.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });

  it('領域・章・難易度がマスタに存在する', () => {
    QUESTIONS.forEach(q => {
      expect(DOMAINS[q.domain], `${label(q)} の domain が不正`).toBeDefined();
      expect(q.domain).not.toBe('all');
      expect(MODULES[q.module], `${label(q)} の module が不正`).toBeDefined();
      expect(q.module).not.toBe('all');
      expect(DIFFICULTIES[q.difficulty], `${label(q)} の difficulty が不正`).toBeDefined();
      expect(q.difficulty).not.toBe('all');
    });
  });

  it('選択肢は 4〜5 個で、同一問題内に完全に同じ文字列を含まない', () => {
    // shuffleOptions は正解をテキストで引き直すため、重複があると位置が壊れる
    QUESTIONS.forEach(q => {
      expect(q.options.length, `${label(q)} の選択肢数`).toBeGreaterThanOrEqual(4);
      expect(q.options.length, `${label(q)} の選択肢数`).toBeLessThanOrEqual(5);
      expect(new Set(q.options).size, `${label(q)} に重複した選択肢がある`).toBe(q.options.length);
    });
  });

  it('正解インデックスが選択肢の範囲内で、昇順かつ重複なし', () => {
    QUESTIONS.forEach(q => {
      expect(q.correctAnswers.length, `${label(q)} に正解がない`).toBeGreaterThan(0);
      expect(q.correctAnswers.length, `${label(q)} の正解数が選択肢数以上`).toBeLessThan(q.options.length);
      expect(new Set(q.correctAnswers).size).toBe(q.correctAnswers.length);
      expect(q.correctAnswers).toEqual([...q.correctAnswers].sort((a, b) => a - b));
      q.correctAnswers.forEach(i => {
        expect(i, `${label(q)} の正解インデックスが範囲外`).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(q.options.length);
      });
    });
  });

  it('multiSelect が正解数から正しく導出されている', () => {
    QUESTIONS.forEach(q => {
      expect(q.multiSelect, `${label(q)} の multiSelect`).toBe(q.correctAnswers.length > 1);
    });
  });

  it('複数選択の問題は問題文にその旨を明記している（要件 Q-2）', () => {
    QUESTIONS.filter(q => q.multiSelect).forEach(q => {
      expect(q.question, `${label(q)} に複数選択の明記がない`).toMatch(/選んでください|複数選択/);
    });
  });

  it('単一選択の問題文に「2つ選んで」などの複数選択表現を含まない', () => {
    QUESTIONS.filter(q => !q.multiSelect).forEach(q => {
      expect(q.question, `${label(q)} は単一選択なのに複数選択の表現がある`).not.toMatch(/つ選んでください/);
    });
  });

  it('日本語以外の文字体系（キリル・ハングル等）が混入していない', () => {
    const stray = /[Ѐ-ӿ가-힯฀-๿؀-ۿ]/;
    QUESTIONS.forEach(q => {
      [q.question, q.explanation, ...q.options].forEach(text => {
        expect(stray.test(text), `${label(q)} に日本語以外の文字が混入: ${text}`).toBe(false);
      });
    });
  });

  it('解説が十分な長さで記述されている（要件 QD-4）', () => {
    QUESTIONS.forEach(q => {
      expect(len(q.explanation), `${label(q)} の解説が短すぎる`).toBeGreaterThanOrEqual(40);
    });
  });
});

describe('選択肢の文字数バランス（要件 QD-1 / 7.1）', () => {
  /**
   * 比率 = max(正解選択肢の文字数) / max(誤答選択肢の文字数)
   *   比率 >= 1.6        重度（必ず修正）
   *   1.3 <= 比率 < 1.6  中度（修正推奨）
   *   比率 < 1.3         許容
   * 「正解だけが極端に短い」場合も同じく手がかりになるため、逆方向も同じ閾値で判定する。
   */
  const RATIO_LIMIT = 1.3;

  const ratioOf = q => {
    const correct = q.correctAnswers.map(i => len(q.options[i]));
    const wrong = q.options.filter((_, i) => !q.correctAnswers.includes(i)).map(len);
    return Math.max(...correct) / Math.max(...wrong);
  };

  it('正解が誤答より極端に長い問題がない', () => {
    const bad = QUESTIONS
      .map(q => ({ q, r: ratioOf(q) }))
      .filter(({ r }) => r >= RATIO_LIMIT)
      .map(({ q, r }) => `${label(q)} 比率=${r.toFixed(2)}`);
    expect(bad, `文字数バランス違反:\n${bad.join('\n')}`).toEqual([]);
  });

  it('正解が誤答より極端に短い問題がない', () => {
    const bad = QUESTIONS
      .map(q => ({ q, r: ratioOf(q) }))
      .filter(({ r }) => r <= 1 / RATIO_LIMIT)
      .map(({ q, r }) => `${label(q)} 比率=${r.toFixed(2)}`);
    expect(bad, `文字数バランス違反:\n${bad.join('\n')}`).toEqual([]);
  });
});

describe('配分バランス', () => {
  it('すべての章に問題が存在する', () => {
    const chapters = Object.keys(MODULES).filter(k => k !== 'all');
    const counts = QUESTIONS.reduce((a, q) => ({ ...a, [q.module]: (a[q.module] || 0) + 1 }), {});
    chapters.forEach(ch => {
      expect(counts[ch] ?? 0, `${ch} に問題がない`).toBeGreaterThan(0);
    });
  });

  it('すべての領域に問題が存在する', () => {
    const domains = Object.keys(DOMAINS).filter(k => k !== 'all');
    const counts = QUESTIONS.reduce((a, q) => ({ ...a, [q.domain]: (a[q.domain] || 0) + 1 }), {});
    domains.forEach(d => {
      expect(counts[d] ?? 0, `${d} に問題がない`).toBeGreaterThan(0);
    });
  });

  it('すべての難易度に問題が存在する', () => {
    ['beginner', 'intermediate', 'advanced'].forEach(d => {
      expect(QUESTIONS.filter(q => q.difficulty === d).length, `${d} に問題がない`).toBeGreaterThan(0);
    });
  });
});

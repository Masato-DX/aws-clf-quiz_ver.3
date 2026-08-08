// src/data/taxonomy.js
// 分類マスタ。React に依存しない（icon は App 側で後付けする）。

/**
 * 領域（ドメイン）— 公式テキストの章をまたぐ実務テーマ軸。
 * 「どのスキル領域が弱いか」を見るために使う。
 */
export const DOMAINS = {
  all:         { label: 'すべての領域',            short: '全領域',   color: '#38BDF8', bg: 'rgba(56,189,248,0.12)' },
  metrics:     { label: 'ウェブ解析の基礎と指標',   short: '基礎・指標', color: '#38BDF8', bg: 'rgba(56,189,248,0.12)' },
  strategy:    { label: '事業戦略とマーケティング', short: '戦略',     color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  design:      { label: '解析設計と計測環境',       short: '解析設計', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  acquisition: { label: '集客・広告・エンゲージメント', short: '集客解析', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  improvement: { label: '改善提案とレポーティング', short: '改善・報告', color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
};

/** 絞り込み用の擬似エントリ 'all' を除いた領域キー */
export const DOMAIN_KEYS = Object.keys(DOMAINS).filter(k => k !== 'all');

export const DIFFICULTIES = {
  all:          { label: 'すべて', stars: '★★★', desc: '全難易度ミックス' },
  beginner:     { label: '初級',   stars: '★',   desc: '用語・定義・基本の計算式' },
  intermediate: { label: '中級',   stars: '★★',  desc: '指標の比較・複数手順の計算' },
  advanced:     { label: '上級',   stars: '★★★', desc: '実務ケース判断・複合計算' },
};

export const DIFFICULTY_KEYS = ['beginner', 'intermediate', 'advanced'];

/**
 * モジュール — 公式テキスト2026（第17版）の全8章と 1:1 で対応する。
 * 本試験は章ごとにランダム出題されるため、章単位の弱点把握が実利になる。
 */
export const MODULES = {
  all: { order: 0, label: 'すべての章',                     short: '全章',       color: '#38BDF8', bg: 'rgba(56,189,248,0.12)' },
  ch1: { order: 1, label: '第1章 ウェブ解析と基本的な指標',   short: '1. 指標',    color: '#38BDF8', bg: 'rgba(56,189,248,0.12)' },
  ch2: { order: 2, label: '第2章 事業戦略とマーケティング解析', short: '2. 事業戦略', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  ch3: { order: 3, label: '第3章 デジタル化戦略と計画立案',   short: '3. 計画立案', color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  ch4: { order: 4, label: '第4章 ウェブ解析の設計',          short: '4. 解析設計', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  ch5: { order: 5, label: '第5章 インプレッションの解析',     short: '5. 集客',    color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  ch6: { order: 6, label: '第6章 エンゲージメントと間接効果', short: '6. 接点',    color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  ch7: { order: 7, label: '第7章 オウンドメディアの解析と改善', short: '7. 改善',   color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
  ch8: { order: 8, label: '第8章 ウェブ解析士のレポーティング', short: '8. 報告',   color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

/** 表示順（order 昇順）。'all' を含む */
export const MODULE_KEYS = Object.entries(MODULES)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([k]) => k);

/** 'all' を除いた章キー */
export const CHAPTER_KEYS = MODULE_KEYS.filter(k => k !== 'all');

export const QUESTION_COUNTS = [5, 10, 15, 20];

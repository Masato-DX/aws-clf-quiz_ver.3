// src/config.js
// 試験に依存する設定はすべてこのファイルに集約する。
// 別の資格試験へ移植する際は、まずここと src/data/ を差し替える。

export const EXAM = {
  /** 正式名称 */
  name: 'ウェブ解析士認定試験',
  /** アプリの表示名 */
  appName: 'ウェブ解析士 認定試験 対策クイズ',
  /** ホーム画面（PWA）での短縮名。12文字以内 */
  shortName: 'ウェブ解析士対策',
  /** 見出しに使う2行分割 */
  heroTitle: 'ウェブ解析士 認定試験',
  heroSubtitle: '練習問題集',
  /** 準拠する教材 */
  syllabus: '公式テキスト2026（第17版）準拠',
  /** 合格ライン（%）。協会は公式に点数を公表していないため通説値を採用する */
  passLine: 70,
  /** 合格ラインの注記（結果画面に表示） */
  passLineNote: '合格ラインは協会非公表のため、通説の 70% を基準としています',
  /** 「合格圏内」と判定する正答率 */
  excellentLine: 85,
  /** 本試験の形式（設定画面の注記） */
  format: '本試験は 60分・60問・四肢択一',
};

/** テーマカラー。ダークテーマ固定の背景 #0a0e1a 上での発色を前提にしている */
export const THEME = {
  accent: '#38BDF8',
  accentLight: '#7DD3FC',
  gradient: 'linear-gradient(90deg,#38BDF8,#7DD3FC)',
  accentBg: 'rgba(56,189,248,0.12)',
  accentBorder: 'rgba(56,189,248,0.3)',
  glow: '0 8px 24px rgba(56,189,248,0.3)',
  bg: 'linear-gradient(180deg,#0a0e1a 0%,#131829 100%)',
  bgSolid: '#0a0e1a',
  card: 'rgba(255,255,255,0.04)',
  cardBorder: '1px solid rgba(255,255,255,0.08)',
  good: '#10b981',
  warn: '#f59e0b',
  bad: '#ef4444',
  sub: '#a78bfa',
  info: '#60a5fa',
};

/** localStorage キーの接頭辞。同一ドメインに他の試験アプリを載せる場合は必ず変えること */
export const STORAGE_PREFIX = 'webanalyst_';

/** Gist に保存するファイル名 */
export const GIST_FILENAME = 'webanalyst_history.json';

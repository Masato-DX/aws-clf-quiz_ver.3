# CLAUDE.md — ウェブ解析士 認定試験 対策クイズ

## プロジェクト概要

ウェブ解析士認定試験（初級）対策クイズアプリ。
React + Vite 製の SPA（PWA）で、**間違えた問題を自動追跡して復習に誘導する**学習アプリ。

AWS CLF-C02 対策アプリ（実運用で合格実績あり）の学習アルゴリズムを、仕様を変えずに移植している。

> 一般社団法人ウェブ解析士協会とは無関係の**非公式**の学習ツール。
> 問題は公開されている出題範囲に基づくオリジナルであり、実際の試験問題の複製ではない。

## 設計ドキュメント

作り替え・リファクタリング時は、まず以下を読むこと。

| ドキュメント | 内容 |
|---|---|
| `docs/requirements.md` | 要件定義書。機能要件・学習アルゴリズム要件・問題データの品質要件 |
| `docs/design.md` | 詳細設計書。データ構造・アルゴリズム実装・ファイル構成・テスト方針 |

## 作業ルール

- **push 前に `npm run build` が通ることを必ず確認する**（問題データの自動検証を含む）
- 学習アルゴリズム（`src/domain/`）の仕様は変更しない。requirements.md「4. 学習アルゴリズム要件」を参照
- 問題を追加する際は **既存の最大 ID の続き**から採番する（現在最大: 320）
- 選択肢は文字数を揃える。正解だけが長い／短い状態を作らない（自動検証で落ちる）
- コミットメッセージは日本語で簡潔に書く
- PAT・Gist ID などの機密情報はコードやコミットに含めない

## 技術スタック

| カテゴリ | 採用技術 |
|---|---|
| フレームワーク | React 19 + Vite 8 |
| スタイリング | Tailwind CSS 3.4 |
| グラフ | Recharts 3 |
| アイコン | Lucide React |
| テスト | Vitest |
| デプロイ | GitHub Actions → GitHub Pages |
| データ同期 | GitHub Gist API（任意） |

## ディレクトリ構成

```
src/
├── config.js              # 試験メタ情報・テーマ色・localStorage 接頭辞
├── App.jsx                # 画面切替と状態のオーナー
├── data/
│   ├── questions.js       # 問題データ（320問）
│   └── taxonomy.js        # DOMAINS / DIFFICULTIES / MODULES
├── domain/                # ★ React 非依存。単体テストの対象
│   ├── selection.js       # 出題選択アルゴリズム（中核）
│   ├── grading.js         # 正誤判定
│   └── progress.js        # 昇華判定・セッション集計
├── storage/
│   ├── local.js           # localStorage（キー接頭辞を一元管理）
│   └── gistApi.js         # Gist 同期
├── hooks/
│   └── useLearningState.js
└── screens/
    ├── AuthScreen.jsx / SetupScreen.jsx / QuizScreen.jsx / ResultScreen.jsx
    └── HistoryScreen/
        ├── index.jsx
        ├── charts.jsx
        └── analytics.js   # ★ 集計ロジック。単体テストの対象
tests/                     # Vitest（75件）
```

**分割の要点**：`domain/` と `analytics.js` を React から切り離している。
この2つが本アプリの価値の中心であり、最もテストが必要な箇所。

## 問題データのフォーマット（src/data/questions.js）

### 単一選択

```js
Q(id, 'ドメイン', 'モジュール', '難易度', '問題文', ['選択肢0','選択肢1','選択肢2','選択肢3'], 正解インデックス, '解説'),
```

### 複数選択

```js
Q(id, 'ドメイン', 'モジュール', '難易度', '問題文（2つ選んでください）', [...], [正解1, 正解2], '解説'),
```

| 引数 | 値 |
|---|---|
| ドメイン | `metrics` / `strategy` / `design` / `acquisition` / `improvement` |
| モジュール | `ch1`〜`ch8`（公式テキスト2026 第17版の章） |
| 難易度 | `beginner` / `intermediate` / `advanced` |
| 正解インデックス | 単一: `2`、複数: `[0, 2]`（0始まり） |

> モジュールは `Q()` の引数で受け取る。移植元のような**配列インデックス依存の紐付けはしない**。

## 問題データの自動検証

`npm run build` は `tests/questions.test.js` を先に実行する。以下を満たさないとビルドが失敗する。

| 検証項目 | 基準 |
|---|---|
| ID | 一意かつ昇順 |
| 分類 | `domain` / `module` / `difficulty` がマスタに存在（`all` は不可） |
| 選択肢 | 4〜5個・同一問題内に完全に同じ文字列がないこと |
| 正解 | 範囲内・昇順・重複なし・全選択が正解ではないこと |
| `multiSelect` | 正解数から正しく導出されていること |
| 複数選択の問題文 | 「2つ選んでください」等の明記があること |
| 解説 | 40文字以上 |
| 文字数 | 日本語以外の文字体系が混入していないこと |
| **文字数バランス** | **max(正解) / max(誤答) が 0.77〜1.30 の範囲** |
| 配分 | すべての章・領域・難易度に問題が存在すること |

## localStorage のキー

接頭辞は `webanalyst_`（`src/config.js` の `STORAGE_PREFIX` で一元管理）。

| キー | 内容 |
|---|---|
| `webanalyst_history` | 学習セッション履歴 |
| `webanalyst_wrong_questions` | 直近で間違えた問題 ID 一覧（正解すると除外） |
| `webanalyst_wrong_counts` | 問題 ID ごとの累積間違い回数（正解すると削除） |
| `webanalyst_last_seen` | 問題 ID ごとの最終出題日時（**出題済み判定も兼ねる**） |
| `webanalyst_sync_config` | Gist 同期設定（PAT・Gist ID） |
| `webanalyst_auth_dismissed` | 同期設定画面を通過済みか |

> 移植元にあった `seen_questions` は廃止した。`last_seen` のキー有無が出題済みを表す。

## 開発コマンド

```bash
npm run dev      # 開発サーバー起動（http://localhost:5173）
npm test         # 単体テスト（75件）
npm run build    # 本番ビルド（問題データ検証を含む。push前に必ず実行）
npm run preview  # ビルド結果の確認
npm run icons    # PWA アイコンの再生成
node scripts/stats.mjs  # 問題数の配分を確認
```

# ウェブ解析士 認定試験 対策クイズ

ウェブ解析士認定試験（初級）の対策クイズアプリ。
React + Vite 製の SPA（PWA）で、**間違えた問題を自動追跡して復習に誘導する**学習アプリです。

> 本アプリは一般社団法人ウェブ解析士協会とは無関係の**非公式**の学習ツールです。
> 問題は公開されている出題範囲（公式テキストの章立て）に基づくオリジナルであり、実際の試験問題の複製ではありません。

## 特徴

- 公式テキスト2026（第17版）の**全8章**、および章をまたぐ**5領域**の2軸で絞り込み出題
- 難易度3段階（初級／中級／上級）。計算問題を重点的に収録
- **未出題の問題を優先し、直近に解いた問題を再出題しない**出題制御
- **苦手問題の自動追跡と昇華**（正解すると通常の問題プールへ戻る）
- 学習レポート（正答率推移・領域別・**章別**・難易度×領域ヒートマップ・日別解答数 ほか）
- GitHub Gist による学習記録のクラウド同期（任意）
- PWA 対応（ホーム画面に追加してオフライン利用）

## 開発

```bash
npm install
npm run dev      # 開発サーバー（http://localhost:5173）
npm test         # 単体テスト（vitest）
npm run build    # 本番ビルド（問題データの検証を含む）
npm run preview  # ビルド結果の確認
npm run icons    # PWA アイコンの再生成
```

`npm run build` は問題データの検証（ID重複・選択肢重複・**選択肢の文字数バランス**）を先に実行し、
基準を満たさない問題があるとビルドが失敗します。

## ディレクトリ構成

```
src/
├── config.js              # 試験メタ情報・テーマ色・localStorage 接頭辞
├── App.jsx                # 画面切替と状態のオーナー
├── data/
│   ├── questions.js       # 問題データ
│   └── taxonomy.js        # DOMAINS / DIFFICULTIES / MODULES
├── domain/                # ★ React 非依存。単体テストの対象
│   ├── selection.js       # 出題選択アルゴリズム
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
```

## セキュリティ

GitHub PAT と Gist ID は**画面から入力し、localStorage にのみ保持**します。
ソースコードやコミットには含めないでください。

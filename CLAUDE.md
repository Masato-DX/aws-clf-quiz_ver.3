# CLAUDE.md — AWS CLF-C02 クイズアプリ

## プロジェクト概要

AWS Cloud Practitioner（CLF-C02）対策クイズアプリ。  
React + Vite 製の SPA で、GitHub Pages で公開。

## 作業ルール

- **作業は必ずローカル環境で行う**
- push 前に `npm run build` でビルドが通ることを確認する
- main ブランチへの push で GitHub Actions が自動デプロイする
- コミットメッセージは日本語で簡潔に書く
- PAT・Gist ID などの機密情報はコードやコミットに含めない

## 技術スタック

| カテゴリ | 採用技術 |
|---|---|
| フレームワーク | React 19 + Vite |
| スタイリング | Tailwind CSS |
| グラフ | Recharts |
| アイコン | Lucide React |
| デプロイ | GitHub Actions → GitHub Pages |
| データ同期 | GitHub Gist API（任意） |

## ディレクトリ構成

```
src/
├── App.jsx        # UI・ロジック全体
├── questions.js   # クイズ問題データ（354問）
├── gistApi.js     # Gist 同期処理
└── main.jsx       # エントリーポイント
```

## 問題データのフォーマット（src/questions.js）

### 単一選択

```js
Q(id, 'ドメイン', '難易度', '問題文', ['選択肢0', '選択肢1', '選択肢2', '選択肢3'], 正解インデックス, '解説'),
```

### 複数選択

```js
Q(id, 'ドメイン', '難易度', '問題文（複数選択）', ['選択肢0', '選択肢1', '選択肢2', '選択肢3'], [正解1, 正解2], '解説'),
```

| 引数 | 値 |
|---|---|
| ドメイン | `concepts` / `security` / `technology` / `billing` |
| 難易度 | `beginner` / `intermediate` / `advanced` |
| 正解インデックス | 単一: `2`、複数: `[0, 2]`（0始まり） |

問題を追加する際は **既存の採番の続き** から ID を振る（現在最大: 354）。

## localStorage のキー

| キー | 内容 |
|---|---|
| `aws_clf_history` | 学習セッション履歴 |
| `aws_clf_seen_questions` | 解いた問題 ID 一覧（未出題優先機能） |
| `aws_clf_sync_config` | Gist 同期設定（PAT・Gist ID） |

## 開発コマンド

```bash
npm run dev      # 開発サーバー起動（http://localhost:5173）
npm run build    # 本番ビルド（push前に必ず実行）
npm run preview  # ビルド結果の確認
```

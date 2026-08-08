# AWS CLF-C02 対策クイズアプリ

AWS Cloud Practitioner（CLF-C02）の試験対策用クイズアプリです。  
React + Vite で構築し、GitHub Pages で公開しています。

## 機能

- **354問** の選択式クイズ（4ドメイン × 3難易度、複数選択問題を含む）
- ドメイン・難易度・問題数を選んでスタート
- **未出題問題を優先出題**（解いたことのない問題から先に出る）
- 回答後に解説を表示
- 学習履歴のローカル保存
- **GitHub Gist による学習履歴のクラウド同期**（任意）
- 学習レポート
  - 領域別・難易度別の累計正答率
  - 難易度 × 領域のヒートマップ
  - 日別回答問題数（全期間）
  - 目標達成率（正答率70%以上セッションの割合）
  - 時間帯別正答率（朝／昼／夕／夜）
  - 領域別の成長推移
- PWA 対応（ホーム画面への追加・オフライン利用）

## 問題構成

| ドメイン | 問題数 |
|---|---|
| クラウドの概念（Concepts） | 88問 |
| セキュリティとコンプライアンス（Security） | 88問 |
| クラウドテクノロジーとサービス（Technology） | 90問 |
| 請求・価格・サポート（Billing） | 88問 |
| **合計** | **354問** |

各ドメイン：初級 / 中級 / 上級 の3難易度で構成

## 技術スタック

| カテゴリ | 採用技術 |
|---|---|
| フレームワーク | React 19 + Vite |
| スタイリング | Tailwind CSS |
| グラフ | Recharts |
| アイコン | Lucide React |
| デプロイ | GitHub Actions → GitHub Pages |
| データ同期 | GitHub Gist API（任意設定） |

## ローカル開発

**前提条件：** Node.js 18以上

```bash
# リポジトリをクローン
git clone https://github.com/Masato-DX/aws-clf-quiz_ver.3.git
cd aws-clf-quiz_ver.3

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:5173` を開く。

## ビルド & デプロイ

```bash
# 本番ビルド
npm run build

# ビルド結果をプレビュー
npm run preview
```

`main` ブランチへの push で GitHub Actions が自動的にビルド・デプロイします。

### GitHub Pages の初期設定（初回のみ）

1. リポジトリの **Settings** → **Pages** を開く
2. **Source** を `GitHub Actions` に設定
3. 以降は `main` への push で自動デプロイ

## 学習履歴のクラウド同期（任意）

GitHub Gist を使って複数デバイス間で学習履歴を同期できます。

### 必要なもの

- GitHub Personal Access Token（`gist` スコープのみ）
- GitHub Gist ID（同期先の Gist）

### 設定手順

1. GitHub で PAT を発行（`gist` スコープのみ付与）
2. 空の Gist を作成して Gist ID を控える
3. アプリ内の「設定」画面で PAT と Gist ID を入力

> ⚠️ PAT はアプリ内の localStorage にのみ保存されます。リポジトリや他の場所には保存しないでください。

## 問題の追加方法

`src/questions.js` に以下のフォーマットで追記します。

### 単一選択問題

```js
Q(id, 'ドメイン', '難易度', '問題文', ['選択肢0', '選択肢1', '選択肢2', '選択肢3'], 正解インデックス, '解説'),
```

### 複数選択問題

```js
Q(id, 'ドメイン', '難易度', '問題文（複数選択）', ['選択肢0', '選択肢1', '選択肢2', '選択肢3'], [正解1, 正解2], '解説'),
```

| 引数 | 値の例 |
|---|---|
| ドメイン | `concepts` / `security` / `technology` / `billing` |
| 難易度 | `beginner` / `intermediate` / `advanced` |
| 正解インデックス | 単一: `2`、複数: `[0, 2]`（0始まり） |

## ディレクトリ構成

```
aws-clf-quiz_ver.3/
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Pages 自動デプロイ
├── public/
│   ├── manifest.json         # PWA 設定
│   └── *.png / *.svg         # アイコン類
├── src/
│   ├── App.jsx               # メインアプリケーション（UI・ロジック）
│   ├── gistApi.js            # Gist 同期処理
│   ├── questions.js          # クイズ問題データ（354問）
│   └── main.jsx              # エントリーポイント
├── index.html
├── vite.config.js
└── package.json
```

## ローカルストレージのキー

| キー | 内容 |
|---|---|
| `aws_clf_history` | 学習セッション履歴（JSON配列） |
| `aws_clf_seen_questions` | 解いた問題ID一覧（未出題優先機能用） |
| `aws_clf_sync_config` | Gist同期設定（PAT・Gist ID） |

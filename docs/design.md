# 詳細設計書 — 資格試験対策クイズアプリ

> **このドキュメントの目的**
> 現行実装の構造・データ構造・アルゴリズムを、再実装可能な精度で記述する。
> 「何を作るか」は `docs/requirements.md`、「どう作られているか」が本書。
> 要件 ID（R-x / L-x / Q-x など）は要件定義書の項番に対応する。

---

## 1. 技術スタック

| 分類 | 採用技術 | バージョン | 備考 |
|---|---|---|---|
| UI フレームワーク | React | 19 | 状態管理は `useState` のみ。外部ストア不使用 |
| ビルド | Vite | 8 | |
| スタイリング | Tailwind CSS | 3.4 | 動的な色はインライン `style` を併用 |
| グラフ | Recharts | 3.8 | 折れ線・棒グラフ |
| アイコン | lucide-react | 1.16 | |
| 永続化 | localStorage + GitHub Gist API | — | サーバレス |
| ホスティング | GitHub Pages | — | GitHub Actions で手動トリガーデプロイ |

**採用しなかったもの**：ルーター（画面数が少なく状態変数で足りる）、状態管理ライブラリ（単一コンポーネントに状態が集約されているため）、テストランナー（→ 改善候補 I-5）。

---

## 2. ファイル構成

```
├── index.html              # PWA メタタグ（テーマ色・apple-touch-icon 等）
├── vite.config.js          # Vite 既定設定 + React プラグインのみ
├── package.json
├── public/
│   ├── manifest.json       # PWA マニフェスト
│   ├── icon-192.png        # PWA アイコン
│   ├── icon-512.png        # PWA アイコン（maskable 兼用）
│   ├── apple-touch-icon.png
│   └── favicon.svg
├── src/
│   ├── main.jsx            # エントリポイント（createRoot のみ）
│   ├── App.jsx             # 全画面のコンポーネントとロジック（約 690 行）
│   ├── questions.js        # 問題データ + 分類マスタ（約 470 行）
│   ├── gistApi.js          # Gist 読み書き（約 58 行）
│   └── index.css           # Tailwind ディレクティブ
├── docs/
│   ├── requirements.md
│   └── design.md
└── .github/workflows/deploy.yml
```

### 2.1 `App.jsx` の内部構成

単一ファイル内に以下を順に定義している（→ 分割が改善候補 I-1）。

| 位置 | 要素 | 責務 |
|---|---|---|
| 冒頭 | アイコン割当・`MODULE_ENTRIES` | マスタへの UI 情報の後付け |
| 冒頭 | `matchesFilter()` / `shuffle()` | 純粋関数ユーティリティ |
| `App` | 全状態・全ビジネスロジック | 状態のオーナー。子はすべて presentational |
| `SetupScreen` | 出題条件 UI・復習モード入口 | |
| `QuizScreen` | 出題・解答 UI | |
| `ResultScreen` | セッション結果 | |
| `HistoryScreen` | 学習レポート（分析ロジックを内包） | |
| `HeatmapTable` | 難易度 × 領域の表 | |
| `AuthScreen` | Gist 設定入力 | |

---

## 3. データ構造

### 3.1 問題（Question）

`questions.js` のファクトリ関数で生成する。

```js
export const Q = (id, domain, diff, q, opts, ans, exp) => {
  const correctAnswers = (Array.isArray(ans) ? ans : [ans]).slice().sort((a,b)=>a-b);
  return {
    id, domain,
    difficulty: diff,
    question: q,
    options: opts,
    correctAnswers,                       // 常に配列・昇順
    multiSelect: correctAnswers.length > 1, // 正解数から自動判定
    explanation: exp
  };
};
```

**記述形式**

```js
// 単一選択（第6引数は数値）
Q(1, 'concepts', 'beginner', '問題文', ['選択肢0','選択肢1','選択肢2','選択肢3'], 1, '解説'),

// 複数選択（第6引数は配列。問題文に「複数選択」と明記する）
Q(2, 'security', 'advanced', '問題文（2つ選んでください）', [...], [0, 2], '解説'),
```

**確定後のスキーマ**

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | number | 一意。1 始まりの連番 |
| `domain` | string | `DOMAINS` のキー |
| `difficulty` | string | `beginner` / `intermediate` / `advanced` |
| `question` | string | 問題文 |
| `options` | string[] | 選択肢。現行は 4 択が 337 問、5 択が 17 問（複数選択の一部） |
| `correctAnswers` | number[] | 正解インデックスの昇順配列 |
| `multiSelect` | boolean | 自動導出 |
| `explanation` | string | 解説 |
| `module` | string | `MODULES` のキー。**後述の方法で後付け** |

### 3.2 分類マスタ

```js
export const DOMAINS = {
  all:        { label: 'すべての領域', short: '全領域', color: '#FF9900', bg: 'rgba(255,153,0,0.1)' },
  concepts:   { label: 'クラウドの概念', short: 'クラウド概念', color: '#60a5fa', bg: '...' },
  security:   { ... },
  technology: { ... },
  billing:    { ... },
};

export const DIFFICULTIES = {
  all:          { label: 'すべて', stars: '★★★', desc: '全難易度ミックス' },
  beginner:     { label: '初級',   stars: '★',   desc: '基礎知識' },
  intermediate: { label: '中級',   stars: '★★',  desc: '比較・実践' },
  advanced:     { label: '上級',   stars: '★★★', desc: '応用・詳細' },
};

export const MODULES = {
  all:        { order: 0,  label: 'すべてのモジュール', short: '全モジュール', color, bg },
  intro:      { order: 1,  label: 'Module 1: クラウド入門', ... },
  // ... 全 13 モジュール。order で表示順を制御
};

export const QUESTION_COUNTS = [5, 10, 15, 20];
```

- `all` キーは「絞り込みなし」を表す擬似エントリで、両マスタに含まれる。
- `icon` フィールドは `App.jsx` 側で後から代入する（`questions.js` を React 非依存に保つため）。

### 3.3 問題とモジュールの紐付け（要注意箇所）

現行実装は**配列の並び順に依存**している。

```js
// questions.js 末尾
export const QUESTION_MODULES = ['intro','global','global','intro', /* ... 354 要素 */];
QUESTIONS.forEach((q, i) => { q.module = QUESTION_MODULES[i]; });
```

> ⚠️ **`QUESTIONS` の途中に問題を挿入すると、以降すべてのモジュール割当がずれる。**
> 再実装時は `{ questionId: moduleKey }` のオブジェクト、または `Q()` の引数にモジュールを含める形へ変更すること（改善候補 I-2）。

### 3.4 セッション（Session）

1 回のクイズ完了ごとに 1 件生成し、履歴配列へ追加する。

```js
{
  id: 1735689600000,                    // Date.now()
  date: "2026-01-01T00:00:00.000Z",     // ISO 8601
  config: { difficulty, domain, module, filterType, count },
  total: 10,
  correct: 8,
  accuracy: 80,                          // 0-100 の整数（四捨五入）
  byDomain:     { concepts: { correct: 3, total: 4 }, ... },
  byDifficulty: { beginner: { correct: 5, total: 5 }, ... },
  byDomainDiff: { "concepts_beginner": { correct: 3, total: 3 }, ... }  // キーは `${domain}_${difficulty}`
}
```

> モジュール別の集計（`byModule`）は**記録していない**。レポートでモジュール別分析ができない原因（改善候補 I-3）。

### 3.5 解答結果（Result、セッション中のみ保持）

```js
{ questionId, selectedAnswers: number[], correct: boolean, domain, difficulty }
```

---

## 4. 状態設計

すべて `App` コンポーネントが保持する。

### 4.1 状態一覧

| 状態 | 型 | 初期値 | 永続化 |
|---|---|---|---|
| `screen` | string | `'setup'` | ✗ |
| `config` | object | `{difficulty:'all', domain:'all', module:'all', filterType:'domain', count:10}` | ✗ |
| `questions` | Question[] | `[]` | ✗ セッション中のみ |
| `currentIdx` | number | `0` | ✗ |
| `selectedAnswers` | number[] | `[]` | ✗ |
| `showFeedback` | boolean | `false` | ✗ |
| `results` | Result[] | `[]` | ✗ |
| `history` | Session[] | `[]` | ✓ |
| `seenIds` | Set\<number\> | localStorage から復元 | ✓ |
| `wrongIds` | Set\<number\> | localStorage から復元 | ✓ |
| `wrongCounts` | `{[id]: number}` | localStorage から復元 | ✓ |
| `lastSeenMap` | `{[id]: epochMs}` | localStorage から復元 | ✓ |
| `promotedCount` | number | `0` | ✗ 結果画面の表示用 |
| `syncConfig` | `{pat, gistId}` \| null | `null` | ✓ |
| `isSyncing` / `authError` | boolean / string | — | ✗ |

> **Set と オブジェクトの使い分け**：所属判定のみのものは `Set`、値を持つものはプレーンオブジェクト。
> localStorage へは `Set` を配列化して保存する。

### 4.2 派生値（`useMemo`）

| 名称 | 定義 |
|---|---|
| `availableCount` | 現在の絞り込み条件に合致する問題数 |
| `unseenCount` | うち未出題の問題数 |
| `frequentWrongIds` | `wrongCounts[id] >= 2` を満たす ID 配列（= 要注意問題） |

---

## 5. 出題選択アルゴリズム（中核）

### 5.1 絞り込み判定

```js
function matchesFilter(q, config) {
  if (config.difficulty !== 'all' && q.difficulty !== config.difficulty) return false;
  if (config.filterType === 'module') return config.module === 'all' || q.module === config.module;
  return config.domain === 'all' || q.domain === config.domain;
}
```

難易度は常に適用。領域とモジュールは `filterType` により**排他**で適用する。

### 5.2 通常出題（`startQuiz`）— 要件 L-1 / L-2

```js
// 経過時間順に並べる。未出題は lastSeen が undefined → 0 として最優先になる。
// 先に shuffle することで、同一タイムスタンプ（同一セッションで解いた問題群）の
// 順序をランダム化する。Array.prototype.sort は安定ソートのため意図通りに働く。
const byRecency = (arr) =>
  shuffle(arr).sort((a, b) => (lastSeenMap[a.id] || 0) - (lastSeenMap[b.id] || 0));

const startQuiz = () => {
  const filtered  = QUESTIONS.filter(q => matchesFilter(q, config));
  const notWrong  = filtered.filter(q => !wrongIds.has(q.id));   // 通常プール
  const wrongOnes = filtered.filter(q =>  wrongIds.has(q.id));   // 苦手プール（後回し）
  const need = Math.min(config.count, filtered.length);

  const fromNotWrong = byRecency(notWrong).slice(0, need);
  // 通常プールで足りない分だけ苦手プールから補充する
  const fromWrong    = byRecency(wrongOnes).slice(0, need - fromNotWrong.length);

  const picked = shuffle([...fromNotWrong, ...fromWrong]);  // 出題順をランダム化
  setQuestions(shuffleOptions(picked));
  // 画面状態をリセットして quiz へ
};
```

**選択の優先順位**

1. 未出題の問題（`lastSeen` なし）
2. 最後に出題してから最も時間が経った問題
3. 苦手問題（1・2 で問題数を満たせない場合のみ）

### 5.3 復習モード（`startFromIds`）— 要件 F-1 / F-2

```js
const startFromIds = (ids) => {
  const picked = QUESTIONS.filter(q => ids.has(q.id));  // 絞り込み・問題数の指定は適用しない
  setQuestions(shuffleOptions(shuffle(picked)));
};

const startWrongOnly     = () => startFromIds(wrongIds);
const startFrequentWrong = () => startFromIds(new Set(frequentWrongIds));
```

### 5.4 選択肢のシャッフル — 要件 Q-7

正解インデックスはシャッフル後の位置へ追随させる必要がある。**テキストを介して再解決する**方式を採る。

```js
const shuffleOptions = (picked) => picked.map(q => {
  const correctTexts = q.correctAnswers.map(i => q.options[i]);       // ① シャッフル前に正解テキストを退避
  const newOpts = shuffle([...q.options]);                            // ② 選択肢をシャッフル
  const newCorrectAnswers = correctTexts
    .map(t => newOpts.indexOf(t))                                     // ③ 新しい位置を引き直す
    .sort((a,b) => a-b);
  return { ...q, options: newOpts, correctAnswers: newCorrectAnswers };
});
```

> ⚠️ 選択肢に**完全に同一の文字列**が含まれると `indexOf` が誤った位置を返す。問題作成時に重複を作らないこと。
> （現行 354 問では重複なしを確認済み。移植時もバリデーションを設けることを推奨）

---

## 6. クイズ進行の制御

### 6.1 解答フロー — 要件 Q-3 / Q-4

```
選択肢クリック → handleSelect()
                  ├─ 複数選択：選択のトグル
                  └─ 単一選択：選択を置換（★正誤判定はしない）
                          ↓
        「確認する」ボタン（selectedAnswers.length > 0 のとき表示）
                          ↓
                 handleConfirm()
                  ├─ 完全一致で正誤判定
                  ├─ showFeedback = true（色分け・解説を表示）
                  └─ results に追記
                          ↓
        「次の問題へ」／「結果を見る」→ handleNext()
                  ├─ 最終問題なら saveSession() → result 画面
                  └─ それ以外は currentIdx++ して状態リセット
```

```js
const handleSelect = (idx) => {
  if (showFeedback) return;                    // 要件 Q-6: 確定後は変更不可
  const q = questions[currentIdx];
  if (q.multiSelect) {
    setSelectedAnswers(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  } else {
    setSelectedAnswers([idx]);                 // 単一選択もここでは判定しない（要件 Q-3）
  }
};

const handleConfirm = () => {
  if (selectedAnswers.length === 0) return;
  const q = questions[currentIdx];
  const isCorrect = arraysEqual(selectedAnswers, q.correctAnswers);   // 部分点なし（要件 Q-8）
  setShowFeedback(true);
  setResults(r => [...r, { questionId: q.id, selectedAnswers: [...selectedAnswers],
                           correct: isCorrect, domain: q.domain, difficulty: q.difficulty }]);
};
```

`arraysEqual` は両辺を昇順ソートして比較する集合一致判定。

---

## 7. セッション保存と昇華処理

`saveSession()` は最終問題の「結果を見る」押下時に実行される。**7 段階の副作用**を持つ。

```js
const saveSession = async () => {
  // ── 集計 ─────────────────────────────────
  // results を走査し byDomain / byDifficulty / byDomainDiff を作る
  const session = { id: Date.now(), date: new Date().toISOString(), config: {...config},
                    total, correct, accuracy, byDomain, byDifficulty, byDomainDiff };
  const nh = [...history, session];
  setHistory(nh);

  // ① 履歴を保存
  localStorage.setItem('aws_clf_history', JSON.stringify(nh));

  // ② 出題済み ID を追加（削除はしない）
  const newSeenIds = new Set([...seenIds, ...results.map(r => r.questionId)]);

  // ③ 昇華した問題数を算出（★保存前の wrongIds / wrongCounts と比較する必要があるため、④⑤より先に評価）
  const promoted = results.filter(r =>
    r.correct && (wrongIds.has(r.questionId) || wrongCounts[r.questionId] > 0));
  setPromotedCount(promoted.length);

  // ④ 苦手問題：正解で除外、誤答で追加
  const newWrongIds = new Set(wrongIds);
  results.forEach(r => r.correct ? newWrongIds.delete(r.questionId)
                                 : newWrongIds.add(r.questionId));

  // ⑤ 累積誤答回数：正解で削除（＝要注意問題から卒業）、誤答で +1  ← 要件 L-3
  const newWrongCounts = { ...wrongCounts };
  results.forEach(r => {
    if (r.correct) delete newWrongCounts[r.questionId];
    else newWrongCounts[r.questionId] = (newWrongCounts[r.questionId] || 0) + 1;
  });

  // ⑥ 最終出題日時を更新（要件 L-1 の判定材料）
  const now = Date.now();
  const newLastSeenMap = { ...lastSeenMap };
  results.forEach(r => { newLastSeenMap[r.questionId] = now; });

  // …各 state と localStorage へ反映…

  // ⑦ Gist へ非同期保存（失敗してもローカルは保存済みなので握りつぶす）
  if (syncConfig) {
    try {
      await saveDataToGist(syncConfig.pat, syncConfig.gistId,
        { history: nh, seenIds: [...newSeenIds], wrongIds: [...newWrongIds],
          wrongCounts: newWrongCounts, lastSeen: newLastSeenMap });
    } catch (e) { console.error('Gistへの保存に失敗しました', e); }
  }
};
```

> **③ の順序が重要**：`wrongIds` / `wrongCounts` を更新する前に昇華判定を行う必要がある。
> ④⑤ の後では、正解した問題は既にリストから消えており、昇華数が常に 0 になる。

**昇華の判定条件**：正解した かつ（現在の苦手リストにある **または** 累積誤答が 1 回以上ある）。

---

## 8. 永続化仕様

### 8.1 localStorage キー

| キー | 型（JSON） | 内容 |
|---|---|---|
| `aws_clf_history` | `Session[]` | 学習セッション履歴 |
| `aws_clf_seen_questions` | `number[]` | 出題済み問題 ID |
| `aws_clf_wrong_questions` | `number[]` | 苦手問題 ID（正解で除外） |
| `aws_clf_wrong_counts` | `{[id]: number}` | 累積誤答回数（正解で削除） |
| `aws_clf_last_seen` | `{[id]: epochMs}` | 最終出題日時 |
| `aws_clf_sync_config` | `{pat, gistId}` | Gist 同期設定 |

> 移植時は接頭辞 `aws_clf_` を試験ごとに変更すること（要件 R-6）。

### 8.2 Gist 同期（`gistApi.js`）

- 保存先ファイル名：`aws_clf_history.json`（単一 Gist 内の 1 ファイル）
- API：`GET /gists/{id}` で取得、`PATCH /gists/{id}` で保存
- 認証：`Authorization: token {PAT}` ヘッダ

**保存フォーマット**

```json
{
  "history":     [ /* Session[] */ ],
  "seenIds":     [1, 2, 3],
  "wrongIds":    [7, 42],
  "wrongCounts": { "7": 2, "42": 1 },
  "lastSeen":    { "1": 1735689600000 }
}
```

**後方互換の実装（要件 D-6）**

```js
const EMPTY_DATA = { history: [], seenIds: [], wrongIds: [], wrongCounts: {}, lastSeen: {} };

const parsed = JSON.parse(file.content);
if (Array.isArray(parsed)) return { ...EMPTY_DATA, history: parsed };  // 旧形式（履歴配列のみ）
return { ...EMPTY_DATA, ...parsed };                                   // 新形式。欠損キーは既定値で補完
```

> `EMPTY_DATA` を土台に展開することで、将来キーを追加しても古い Gist を読み続けられる。

### 8.3 同期のタイミングと競合

| 契機 | 動作 |
|---|---|
| 起動時 | Gist から取得 → 全 state と localStorage へ上書き反映 |
| 起動時（失敗） | ローカルの履歴で継続（要件 D-4） |
| セッション終了時 | ローカル保存 → Gist へ保存 |
| 履歴クリア時 | ローカル削除 → Gist を空データで上書き |

> 競合解決は last-write-wins。マージは行わない（改善候補 I-4）。

---

## 9. 学習レポートの算出ロジック

`HistoryScreen` 内の `useMemo` 群。すべて `history` のみから導出する。

| 指標 | 算出方法 |
|---|---|
| 平均正答率 | `Σcorrect / Σtotal` |
| 連続達成 | 履歴末尾から遡り、`accuracy >= 70` が途切れるまで数える |
| 推移グラフ | 全履歴を写像。`avg3` は自身を含む直近 3 件の平均（先頭付近は存在する件数で平均） |
| X 軸目盛り | `length <= 15` なら全件、超える場合は `Math.ceil(length/8)-1` 件おき |
| 線の太さ・点 | `length > 20` で細線・小点、`length > 30` で点を非表示 |
| 領域別成長 | `最新セッションの正答率 − 最初のセッションの正答率` |
| ヒートマップ | 全履歴の `byDomainDiff` を領域×難易度で合算 |
| 日別解答数 | 初回記録日から今日まで**全日付を生成**し、記録のない日は 0 で埋める |
| 目標達成率 | `accuracy >= 70` のセッション数 ÷ 全セッション数 |
| 時間帯別 | `date` の時刻から 朝(<10) / 昼(<14) / 夕(<18) / 夜 に分類し合算 |
| 領域別の成長比較 | 初回 1 件 vs 直近 5 件平均。差 `> +5` で「伸びている」、`< -5` で「要注意」 |

### 9.1 グラフの配色規則

| 種別 | 色 |
|---|---|
| 正答率（実測） | `#FF9900`（テーマ色） |
| 3 回移動平均 | `#60a5fa`（青） |
| 85% 以上 | `#10b981`（緑） |
| 70〜84% | `#FF9900`（橙） |
| 70% 未満 | `#ef4444`（赤） |

---

## 10. UI 設計

### 10.1 テーマ

| 要素 | 値 |
|---|---|
| 背景 | `linear-gradient(180deg, #0a0e1a 0%, #131829 100%)` |
| アクセント | `#FF9900` → `#FFB84D`（グラデーション） |
| カード背景 | `rgba(255,255,255,0.04)` |
| カード枠線 | `rgba(255,255,255,0.08)` |
| 本文フォント | Zen Kaku Gothic New / Noto Sans JP |
| 数値フォント | JetBrains Mono（`.mono` クラス） |
| 最大幅 | `max-w-2xl`（モバイル最適・PC でも中央寄せ） |

### 10.2 アニメーション

`App.jsx` 内の `<style>` に定義。

| クラス | 用途 |
|---|---|
| `.fade-up` | 画面切替（下から 8px フェードイン） |
| `.scale-in` | 問題の切替（`key={question.id}` で再生をトリガー） |
| `.slide-in` | 解答フィードバックの出現 |

### 10.3 色による状態表現

| 状態 | 背景 / 枠線 |
|---|---|
| 未選択 | `rgba(255,255,255,0.03)` / `rgba(255,255,255,0.08)` |
| 選択中 | `rgba(255,153,0,0.1)` / `#FF9900` |
| 正解（確定後） | `rgba(16,185,129,0.12)` / `#10b981` |
| 誤答（自分の選択） | `rgba(239,68,68,0.12)` / `#ef4444` |
| 要注意問題カード | `rgba(251,146,60,0.12)` / `rgba(251,146,60,0.4)` |
| 苦手問題カード | `rgba(239,68,68,0.1)` / `rgba(239,68,68,0.35)` |
| 昇華バナー | `rgba(16,185,129,0.1)` / `rgba(16,185,129,0.4)` |

---

## 11. PWA 設定

### 11.1 `public/manifest.json`

```json
{
  "name": "AWS CLF-C02 対策クイズ",
  "short_name": "AWS CLF対策",
  "lang": "ja",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0a0e1a",
  "theme_color": "#0a0e1a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 11.2 iOS 対応（`index.html`）

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black" />
<meta name="apple-mobile-web-app-title" content="AWS CLF対策" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

### 11.3 運用上の落とし穴

> **iOS の PWA はアイコンと静的アセットを OS レベルでキャッシュする。**
> アイコンを更新しても、ホーム画面のアプリを**削除して再追加**するまで反映されない。
> さらに再インストール時に **localStorage が消去される**ため、
> Gist 同期を設定していないと学習履歴と出題追跡データが全て失われる。
>
> → 対策：初回起動時に Gist 同期の設定を促す設計にしている（`auth` 画面を最初に出す）。

---

## 12. デプロイ

### 12.1 `.github/workflows/deploy.yml`

```yaml
on: workflow_dispatch          # 手動トリガーのみ（push では動かない）
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }

jobs:
  build:   # checkout@v4 → setup-node@v4(node 20, npm キャッシュ) → npm ci
           # → npm run build → upload-pages-artifact@v3(path: dist)
  deploy:  # needs: build → deploy-pages@v4（environment: github-pages）
```

### 12.2 手順と制約

```bash
npm run build                      # ① ビルドが通ることを必ず確認
git push origin <feature-branch>   # ② 作業ブランチへ push
# ③ main へマージして push
# ④ GitHub Actions の deploy.yml を main ブランチ指定で手動実行
```

> ⚠️ **GitHub Pages 環境の保護により、`main` 以外のブランチからはデプロイが失敗する**
> （build ジョブは成功し、deploy ジョブだけが落ちる）。必ず main へマージしてから実行すること。

---

## 13. 再実装時の推奨構成

現行の構造をそのまま移植するのではなく、以下の改善を織り込むことを推奨する。

### 13.1 ファイル分割案

```
src/
├── main.jsx
├── App.jsx                    # 画面切替と状態のオーナーのみ（100 行程度）
├── data/
│   ├── questions.js           # 問題データのみ
│   └── taxonomy.js            # DOMAINS / DIFFICULTIES / MODULES / QUESTION_COUNTS
├── domain/                    # ★ React 非依存。単体テストの対象
│   ├── selection.js           # matchesFilter / byRecency / startQuiz の選択ロジック
│   ├── grading.js             # 正誤判定 / shuffleOptions
│   └── progress.js            # 昇華判定 / wrongIds・wrongCounts の遷移
├── storage/
│   ├── local.js               # localStorage の読み書き（キー接頭辞を一元管理）
│   └── gistApi.js
├── hooks/
│   └── useLearningState.js    # 永続化を伴う状態をまとめたカスタムフック
└── screens/
    ├── AuthScreen.jsx
    ├── SetupScreen.jsx
    ├── QuizScreen.jsx
    ├── ResultScreen.jsx
    └── HistoryScreen/
        ├── index.jsx
        ├── charts.jsx
        └── analytics.js       # ★ 集計ロジック。単体テストの対象
```

**分割の要点**：`domain/` と `analytics.js` を React から切り離すこと。
この 2 つが本アプリの価値の中心であり、かつ最もテストが必要な箇所である。

### 13.2 優先的に書くべきテスト

| 対象 | 検証内容 |
|---|---|
| `byRecency` | 未出題が最優先になること／同一タイムスタンプ群がランダム化されること |
| `startQuiz` の選択 | 直前セッションの問題が再選択されないこと／苦手問題が後回しになること／プール不足時に苦手問題で補充されること |
| 昇華判定 | 正解で `wrongIds`・`wrongCounts` の両方から消えること／判定が更新前の値を参照していること |
| `shuffleOptions` | シャッフル後も `correctAnswers` が正解テキストを指し続けること |
| `arraysEqual` | 複数選択の部分一致が不正解と判定されること |
| Gist 後方互換 | 旧形式（配列）と欠損キーを含む新形式の両方を読めること |

### 13.3 併せて解決すべき事項

| # | 内容 |
|---|---|
| I-2 | モジュール割当を ID キーの写像に変更する（配列インデックス依存の解消） |
| I-3 | セッションに `byModule` を追加し、レポートにモジュール別分析を加える |
| I-6 | 問題数の表示を `QUESTIONS.length` から算出する（固定文字列をやめる） |
| I-8 | `seenIds` を廃止し、`lastSeen` のキー有無で代替する |
| I-9 | Service Worker を導入し、更新検知とキャッシュ制御を行う |

---

## 14. 移植チェックリスト

新しい試験向けにアプリを作る際の手順。

- [ ] **1.** 試験のシラバスから領域（`DOMAINS`）を定義する
- [ ] **2.** 公式教材の章立てからモジュール（`MODULES`）を定義する（不要なら `filterType` ごと削除）
- [ ] **3.** 合格ライン（現行 70%）を試験の基準に合わせて変更する
- [ ] **4.** localStorage キーの接頭辞を変更する（`aws_clf_` → 新しい試験の識別子）
- [ ] **5.** 問題データを作成する。**§7 の文字数バランス基準を初期段階から適用する**
- [ ] **6.** アプリ名・アイコン・テーマカラーを差し替える（`index.html` / `manifest.json` / `public/*`）
- [ ] **7.** 出題選択アルゴリズム（§5）と昇華処理（§7）は**変更せずそのまま移植する**
- [ ] **8.** §13.2 のテストを実装する
- [ ] **9.** `npm run build` の成功を確認してからデプロイする

---

## 15. 現行実装の既知の制約（再掲・サマリ）

| # | 制約 | 影響 |
|---|---|---|
| I-1 | `App.jsx` が単一ファイルで約 690 行 | 保守性 |
| I-2 | モジュール割当が配列インデックス依存 | **問題の途中挿入で全件破損** |
| I-3 | `byModule` 未記録 | モジュール別分析ができない |
| I-4 | Gist 同期が last-write-wins | 複数端末の同時利用で更新が失われる |
| I-5 | 自動テストなし | リグレッション検知不能 |
| I-6 | 問題数の表示が固定文字列（180問と表示、実際は 354 問） | 表示不整合 |
| I-7 | 履歴が無制限に増加 | 長期利用で肥大化 |
| I-8 | `seenIds` と `lastSeen` が冗長 | データ重複 |
| I-9 | Service Worker 未導入 | 更新反映を制御できない |

# 詳細設計書 — ウェブ解析士 認定試験 対策クイズ

> **このドキュメントの目的**
> 実装の構造・データ構造・アルゴリズムを、再実装可能な精度で記述する。
> 「何を作るか」は `docs/requirements.md`、「どう作られているか」が本書。
> 要件 ID（L-x / Q-x / D-x など）は要件定義書の項番に対応する。

---

## 1. 技術スタック

| 分類 | 採用技術 | 備考 |
|---|---|---|
| UI フレームワーク | React 19 | 状態管理は `useState` + カスタムフックのみ。外部ストア不使用 |
| ビルド | Vite 8 | `base: './'` でサブパス配信にも対応 |
| スタイリング | Tailwind CSS 3.4 | 動的な色はインライン `style` を併用 |
| グラフ | Recharts 3 | 折れ線・棒グラフ |
| アイコン | lucide-react | |
| テスト | Vitest | 75 件。`domain/` と `analytics.js` と問題データが対象 |
| 永続化 | localStorage + GitHub Gist API | サーバレス |
| ホスティング | GitHub Pages | GitHub Actions でデプロイ |

**採用しなかったもの**：ルーター（画面数が少なく状態変数で足りる）、状態管理ライブラリ（学習状態はカスタムフックに集約）。

---

## 2. ファイル構成

```
├── index.html              # PWA メタタグ（テーマ色・apple-touch-icon・OGP）
├── vite.config.js          # base: './' + Vitest 設定
├── package.json            # build は問題データ検証を先に実行する
├── public/
│   ├── manifest.json       # PWA マニフェスト（相対パス）
│   ├── icon-192.png / icon-512.png / apple-touch-icon.png
│   └── favicon.svg
├── scripts/
│   ├── generate-icons.mjs  # 外部ライブラリ不要の PNG 生成
│   └── stats.mjs           # 問題数の配分確認
├── src/
│   ├── main.jsx
│   ├── config.js           # ★ 試験依存の設定を集約
│   ├── App.jsx             # 画面切替と状態のオーナー
│   ├── index.css
│   ├── data/
│   │   ├── questions.js    # 問題データ（320問）
│   │   └── taxonomy.js     # DOMAINS / DIFFICULTIES / MODULES / QUESTION_COUNTS
│   ├── domain/             # ★ React 非依存
│   │   ├── selection.js
│   │   ├── grading.js
│   │   └── progress.js
│   ├── storage/
│   │   ├── local.js
│   │   └── gistApi.js
│   ├── hooks/
│   │   └── useLearningState.js
│   └── screens/
│       ├── AuthScreen.jsx / SetupScreen.jsx / QuizScreen.jsx / ResultScreen.jsx
│       └── HistoryScreen/
│           ├── index.jsx
│           ├── charts.jsx
│           └── analytics.js  # ★ React 非依存
├── tests/                  # selection / grading / progress / analytics / gist / questions
└── docs/
    ├── requirements.md
    └── design.md
```

### 2.1 分割の意図

移植元は `App.jsx` 1 ファイル約 690 行にすべてが入っていた。本アプリでは以下を分離している。

| 層 | 責務 | React 依存 | テスト |
|---|---|---|---|
| `config.js` | 試験名・合格ライン・テーマ色・キー接頭辞 | なし | — |
| `data/` | 問題データと分類マスタ | なし | あり（データ検証） |
| `domain/` | 出題選択・正誤判定・昇華・集計 | **なし** | **あり** |
| `storage/` | localStorage / Gist の読み書き | なし | あり（Gist 互換） |
| `hooks/` | 状態と永続化の配線 | あり | — |
| `screens/` | 表示。ロジックは持たない | あり | — |
| `screens/HistoryScreen/analytics.js` | レポートの集計 | **なし** | **あり** |

`domain/` と `analytics.js` が本アプリの価値の中心であり、かつ最もテストが必要な箇所である。

---

## 3. データ構造

### 3.1 問題（Question）

```js
export const Q = (id, domain, module, diff, q, opts, ans, exp) => {
  const correctAnswers = (Array.isArray(ans) ? ans : [ans]).slice().sort((a, b) => a - b);
  return {
    id, domain, module,
    difficulty: diff,
    question: q,
    options: opts,
    correctAnswers,                         // 常に配列・昇順
    multiSelect: correctAnswers.length > 1, // 正解数から自動判定
    explanation: exp,
  };
};
```

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | number | 一意。1 始まりの連番 |
| `domain` | string | `DOMAINS` のキー |
| `module` | string | `MODULES` のキー（公式テキストの章） |
| `difficulty` | string | `beginner` / `intermediate` / `advanced` |
| `question` | string | 問題文 |
| `options` | string[] | 選択肢（4〜5個） |
| `correctAnswers` | number[] | 正解インデックスの昇順配列 |
| `multiSelect` | boolean | 自動導出 |
| `explanation` | string | 解説 |

> **移植元との違い**：移植元は `QUESTION_MODULES` という別配列を用意し、`QUESTIONS` の**並び順**でモジュールを割り当てていた。
> 途中に問題を挿入すると以降すべての割当がずれる構造だったため、`Q()` の引数へ移した。

### 3.2 分類マスタ（`data/taxonomy.js`）

`DOMAINS` / `DIFFICULTIES` / `MODULES` / `QUESTION_COUNTS` を定義する。
`all` キーは「絞り込みなし」を表す擬似エントリで、`DOMAIN_KEYS` / `CHAPTER_KEYS` / `DIFFICULTY_KEYS` は `all` を除いた配列を返す。

`icon` フィールドは `App.jsx` 側で後から代入する（`data/` を React 非依存に保つため）。

### 3.3 セッション（Session）

```js
{
  id: 1735689600000,                    // Date.now()
  date: "2026-08-08T00:00:00.000Z",     // ISO 8601
  config: { difficulty, domain, module, filterType, count },
  total: 10,
  correct: 8,
  accuracy: 80,                          // 0-100 の整数（四捨五入）
  byDomain:     { metrics: { correct: 3, total: 4 }, ... },
  byDifficulty: { beginner: { correct: 5, total: 5 }, ... },
  byModule:     { ch1: { correct: 3, total: 4 }, ... },   // ★ 移植元には無かった
  byDomainDiff: { "metrics_beginner": { correct: 3, total: 3 }, ... }
}
```

### 3.4 解答結果（Result、セッション中のみ保持）

```js
{ questionId, selectedAnswers: number[], correct: boolean, domain, module, difficulty }
```

---

## 4. 状態設計

### 4.1 学習状態（`hooks/useLearningState.js`）

| 状態 | 型 | 永続化 |
|---|---|---|
| `history` | Session[] | ✓ |
| `wrongIds` | Set\<number\> | ✓ |
| `wrongCounts` | `{[id]: number}` | ✓ |
| `lastSeen` | `{[id]: epochMs}` | ✓ |
| `promotedCount` | number | ✗ 結果画面の表示用 |
| `syncConfig` | `{pat, gistId}` \| null | ✓ |
| `isSyncing` / `authError` / `booted` / `needsAuth` | — | ✗ |

> **Set と オブジェクトの使い分け**：所属判定のみのものは `Set`、値を持つものはプレーンオブジェクト。
> localStorage へは `Set` を配列化して保存する。

### 4.2 セッション状態（`App.jsx`）

`screen` / `config` / `questions` / `currentIdx` / `selectedAnswers` / `showFeedback` / `results`。いずれも永続化しない。

### 4.3 派生値（`useMemo`）

| 名称 | 定義 |
|---|---|
| `filtered` | 現在の絞り込み条件に合致する問題配列 |
| `availableCount` | `filtered.length` |
| `unseen` | `filtered` のうち `lastSeen` にキーがない問題数 |
| `frequentWrong` | `wrongCounts[id] >= 2` を満たす ID 配列（= 要注意問題） |

---

## 5. 出題選択アルゴリズム（中核・`domain/selection.js`）

### 5.1 絞り込み判定

```js
export function matchesFilter(q, config) {
  if (config.difficulty !== 'all' && q.difficulty !== config.difficulty) return false;
  if (config.filterType === 'module') return config.module === 'all' || q.module === config.module;
  return config.domain === 'all' || q.domain === config.domain;
}
```

難易度は常に適用。領域とモジュールは `filterType` により**排他**で適用する。

### 5.2 経過時間順の並べ替え — 要件 L-1

```js
export function byRecency(arr, lastSeenMap) {
  return shuffle(arr).sort((a, b) => (lastSeenMap[a.id] || 0) - (lastSeenMap[b.id] || 0));
}
```

- 未出題は `lastSeen` が `undefined` → `0` として最優先になる。
- **先に `shuffle` することが重要**。同一タイムスタンプ（同じセッションで解いた問題群）の順序をランダム化する。
  `Array.prototype.sort` は安定ソートのため、この前処理が意図どおり働く。

### 5.3 通常出題 — 要件 L-1 / L-2

```js
export function selectQuestions(allQuestions, config, wrongIds, lastSeenMap) {
  const filtered  = allQuestions.filter(q => matchesFilter(q, config));
  const notWrong  = filtered.filter(q => !wrongIds.has(q.id));   // 通常プール
  const wrongOnes = filtered.filter(q =>  wrongIds.has(q.id));   // 苦手プール（後回し）
  const need = Math.min(config.count, filtered.length);

  const fromNotWrong = byRecency(notWrong, lastSeenMap).slice(0, need);
  // 通常プールで足りない分だけ苦手プールから補充する
  const fromWrong    = byRecency(wrongOnes, lastSeenMap).slice(0, need - fromNotWrong.length);

  return shuffleOptions(shuffle([...fromNotWrong, ...fromWrong]));
}
```

**選択の優先順位**

1. 未出題の問題（`lastSeen` なし）
2. 最後に出題してから最も時間が経った問題
3. 苦手問題（1・2 で問題数を満たせない場合のみ）

### 5.4 復習モード — 要件 F-1 / F-2

```js
export function selectFromIds(allQuestions, ids) {
  return shuffleOptions(shuffle(allQuestions.filter(q => ids.has(q.id))));
}
```

絞り込み・問題数の指定は適用しない。

### 5.5 選択肢のシャッフル — 要件 Q-7

正解インデックスをシャッフル後の位置へ追随させる。**テキストを介して再解決する**方式。

```js
export function shuffleOptions(picked) {
  return picked.map(q => {
    const correctTexts = q.correctAnswers.map(i => q.options[i]);   // ① 正解テキストを退避
    const newOpts = shuffle([...q.options]);                        // ② シャッフル
    const newCorrectAnswers = correctTexts
      .map(t => newOpts.indexOf(t))                                 // ③ 新しい位置を引き直す
      .sort((a, b) => a - b);
    return { ...q, options: newOpts, correctAnswers: newCorrectAnswers };
  });
}
```

> ⚠️ 選択肢に**完全に同一の文字列**が含まれると `indexOf` が誤った位置を返す。
> `tests/questions.test.js` が全問について重複がないことを検証している。

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
                  ├─ makeResult() で完全一致判定（部分点なし）
                  ├─ showFeedback = true（色分け・解説を表示）
                  └─ results に追記
                          ↓
        「次の問題へ」／「結果を見る」→ handleNext()
                  ├─ 最終問題なら commitSession() → result 画面
                  └─ それ以外は currentIdx++ して状態リセット
```

### 6.2 正誤判定（`domain/grading.js`）

```js
export function arraysEqual(a, b) {
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
}
```

集合として一致するかを判定する。複数選択の部分一致は不正解（要件 Q-8）。

---

## 7. 昇華処理とセッション保存（`domain/progress.js`）

### 7.1 `applyResults` — 要件 L-3 / L-4

```js
export function applyResults(prev, results, now = Date.now()) {
  // ① 昇華数は「更新前」の状態に対して評価する
  const promotedCount = results.filter(
    r => r.correct && (prev.wrongIds.has(r.questionId) || (prev.wrongCounts[r.questionId] || 0) > 0)
  ).length;

  // ② 苦手問題：正解で除外、誤答で追加
  const wrongIds = new Set(prev.wrongIds);
  results.forEach(r => r.correct ? wrongIds.delete(r.questionId) : wrongIds.add(r.questionId));

  // ③ 累積誤答回数：正解で削除（＝要注意問題から卒業）、誤答で +1
  const wrongCounts = { ...prev.wrongCounts };
  results.forEach(r => {
    if (r.correct) delete wrongCounts[r.questionId];
    else wrongCounts[r.questionId] = (wrongCounts[r.questionId] || 0) + 1;
  });

  // ④ 最終出題日時を更新（キーの有無が「出題済み」も表す）
  const lastSeen = { ...prev.lastSeen };
  results.forEach(r => { lastSeen[r.questionId] = now; });

  return { wrongIds, wrongCounts, lastSeen, promotedCount };
}
```

> **移植元との違い**：移植元は同一関数内で「昇華数の算出を state 更新より前に書く」という**実行順序への依存**があった。
> 順序を誤ると昇華数が常に 0 になる。本実装は更新前の状態を引数で受け取る純粋関数にして、この事故を構造的に防いでいる。

**昇華の判定条件**：正解した かつ（現在の苦手リストにある **または** 累積誤答が 1 回以上ある）。

### 7.2 セッション保存（`hooks/useLearningState.js`）

```js
const commitSession = async (results, config) => {
  const now = Date.now();
  const next = applyResults({ wrongIds, wrongCounts, lastSeen }, results, now);
  const nextHistory = [...history, buildSession(results, config, now)];
  // …各 state を更新…
  local.saveLearningData(payload);                      // ローカルへ保存
  if (syncConfig) await saveDataToGist(...);            // Gist へ非同期保存（失敗は握りつぶす）
};
```

---

## 8. 永続化仕様

### 8.1 localStorage キー（`storage/local.js`）

接頭辞 `webanalyst_` を `config.js` の `STORAGE_PREFIX` で一元管理する。

| キー | 型（JSON） | 内容 |
|---|---|---|
| `webanalyst_history` | `Session[]` | 学習セッション履歴 |
| `webanalyst_wrong_questions` | `number[]` | 苦手問題 ID（正解で除外） |
| `webanalyst_wrong_counts` | `{[id]: number}` | 累積誤答回数（正解で削除） |
| `webanalyst_last_seen` | `{[id]: epochMs}` | 最終出題日時。キーの有無が出題済みを表す |
| `webanalyst_sync_config` | `{pat, gistId}` | Gist 同期設定 |
| `webanalyst_auth_dismissed` | `boolean` | 同期設定画面を通過済みか |

読み書きは `read` / `write` で `try/catch` を挟み、JSON の破損やストレージ制限で落ちないようにしている。

### 8.2 Gist 同期（`storage/gistApi.js`）

- 保存先ファイル名：`webanalyst_history.json`（`config.js` の `GIST_FILENAME`）
- API：`GET /gists/{id}` で取得、`PATCH /gists/{id}` で保存
- 認証：`Authorization: token {PAT}` ヘッダ

**保存フォーマット**

```json
{
  "history":     [ /* Session[] */ ],
  "wrongIds":    [7, 42],
  "wrongCounts": { "7": 2, "42": 1 },
  "lastSeen":    { "1": 1735689600000 }
}
```

**後方互換（要件 D-6）— `normalizeGistData()`**

| 入力 | 扱い |
|---|---|
| 配列 | 最初期の形式。`history` として取り込む |
| `seenIds` を含むオブジェクト | 旧形式。`lastSeen` に `0` として取り込み、`seenIds` キー自体は落とす |
| 欠損キーを含むオブジェクト | `EMPTY_DATA` を土台に展開して補完 |
| `null` / 文字列など | `EMPTY_DATA` を返す |

`seenIds` を `0` として取り込むのは、「出題済みだが日時不明」を「最も昔に出題した」として扱い、
優先的に再出題させるためである。

### 8.3 同期のタイミングと競合

| 契機 | 動作 |
|---|---|
| 起動時 | Gist から取得 → 全 state と localStorage へ上書き反映 |
| 起動時（失敗） | ローカルの履歴で継続（要件 D-4） |
| セッション終了時 | ローカル保存 → Gist へ保存 |
| 履歴クリア時 | ローカル削除 → Gist を空データで上書き |

> 競合解決は last-write-wins。マージは行わない（改善候補、§12 参照）。

---

## 9. 学習レポートの算出ロジック（`screens/HistoryScreen/analytics.js`）

すべて `history` のみから導出する純粋関数。合格ラインは `EXAM.passLine` を参照する。

| 関数 | 算出方法 |
|---|---|
| `summarize` | 平均正答率は `Σcorrect / Σtotal`。連続達成は末尾から遡り、合格ライン未満で停止 |
| `accuracyTrend` | 全履歴を写像。`avg3` は自身を含む直近 3 件の平均（先頭付近は存在する件数で平均） |
| `domainStats` | 領域ごとに合算し、初回→直近の増減を `growth` として持つ |
| `moduleStats` | 章ごとに合算。`CHAPTER_KEYS` の順（第1章→第8章）で返す |
| `difficultyStats` | 初級→中級→上級の順で返す |
| `heatmap` | 全履歴の `byDomainDiff` を領域×難易度で合算 |
| `dailyCounts` | 初回記録日から今日まで**全日付を生成**し、記録のない日は 0 で埋める |
| `goalRate` | 合格ライン以上のセッション数 ÷ 全セッション数 |
| `timeSlotStats` | `date` の時刻から 朝(<10) / 昼(<14) / 夕(<18) / 夜 に分類し合算 |
| `domainGrowth` | 初回 1 件 vs 直近 5 件平均。差 `> +5` で「伸びている」、`< -5` で「要注意」 |

内部の `accumulate()` は `byModule` を持たない古い履歴が混在しても落ちないよう、欠損をスキップする。

### 9.1 グラフの配色規則

| 種別 | 色 |
|---|---|
| 正答率（実測） | `#38BDF8`（テーマ色） |
| 3 回移動平均 | `#a78bfa`（紫） |
| 85% 以上 | `#10b981`（緑） |
| 70〜84% | `#38BDF8`（テーマ色） |
| 70% 未満 | `#ef4444`（赤） |

`charts.jsx` の `accuracyColor()` に集約している。

---

## 10. UI 設計

### 10.1 テーマ（`config.js` の `THEME`）

| 要素 | 値 |
|---|---|
| 背景 | `linear-gradient(180deg, #0a0e1a 0%, #131829 100%)` |
| アクセント | `#38BDF8` → `#7DD3FC`（グラデーション） |
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
| 選択中 | `rgba(56,189,248,0.12)` / `#38BDF8` |
| 正解（確定後） | `rgba(16,185,129,0.12)` / `#10b981` |
| 誤答（自分の選択） | `rgba(239,68,68,0.12)` / `#ef4444` |
| 要注意問題カード | `rgba(251,146,60,0.12)` / `rgba(251,146,60,0.4)` |
| 苦手問題カード | `rgba(239,68,68,0.1)` / `rgba(239,68,68,0.35)` |
| 昇華バナー | `rgba(16,185,129,0.1)` / `rgba(16,185,129,0.4)` |

---

## 11. PWA・ビルド設定

### 11.1 サブパス対応（要件 N-7）

`vite.config.js` で `base: './'` を指定し、`manifest.json` の `start_url` / `scope` / `icons` もすべて相対パスにしている。
これにより、`https://example.github.io/web-analyst-quiz/` のようなサブパス配信でも、ルート配信でも動作する。

### 11.2 `public/manifest.json`

```json
{
  "name": "ウェブ解析士 認定試験 対策クイズ",
  "short_name": "ウェブ解析士対策",
  "lang": "ja",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0a0e1a",
  "theme_color": "#0a0e1a",
  "icons": [ /* 192 / 512 / 512(maskable) */ ]
}
```

### 11.3 アイコン生成

`scripts/generate-icons.mjs` は Node 標準の `zlib` のみで PNG をエンコードする（外部ライブラリ不要）。
上昇棒グラフ（解析のモチーフ）をスカイブルーで描画し、4x スーパーサンプリングでアンチエイリアスをかけている。
`npm run icons` で `icon-192.png` / `icon-512.png` / `apple-touch-icon.png` を再生成する。

### 11.4 運用上の落とし穴

> **iOS の PWA はアイコンと静的アセットを OS レベルでキャッシュする。**
> アイコンを更新しても、ホーム画面のアプリを**削除して再追加**するまで反映されない。
> さらに再インストール時に **localStorage が消去される**ため、
> Gist 同期を設定していないと学習履歴と出題追跡データが全て失われる。
>
> → 対策：初回起動時に Gist 同期の設定を促す設計にしている（`auth` 画面を最初に出す）。

---

## 12. テスト

`npm test` で 75 件を実行する。`npm run build` は `tests/questions.test.js` のみを先に実行し、
問題データが基準を満たさない場合はビルドを失敗させる。

| ファイル | 対象 | 主な検証内容 |
|---|---|---|
| `selection.test.js` | 出題選択 | 未出題が最優先／同一タイムスタンプ群のランダム化／直前セッションの問題が再選択されない／苦手問題が後回し／プール不足時の補充／選択肢シャッフル後も正解テキストを指す |
| `progress.test.js` | 昇華・集計 | 正解で `wrongIds` と `wrongCounts` の両方から消える／判定が更新前の値を参照している／`byModule` の記録／元の state を破壊しない |
| `grading.test.js` | 正誤判定 | 複数選択の部分一致が不正解／余分な選択も不正解 |
| `analytics.test.js` | レポート集計 | 平均正答率の算出方法／連続達成の停止条件／全履歴の表示／`byModule` 欠損時に落ちない |
| `gist.test.js` | Gist 互換 | 旧形式（配列）／欠損キー／旧 `seenIds` の取り込み／不正値 |
| `questions.test.js` | 問題データ | ID・分類・選択肢重複・正解範囲・複数選択の明記・解説長・**文字数バランス**・文字体系・配分 |

---

## 13. デプロイ

### 13.1 GitHub Actions

```yaml
on: workflow_dispatch          # 手動トリガー
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }

jobs:
  build:   # checkout → setup-node(20, npm キャッシュ) → npm ci
           # → npm run build → upload-pages-artifact
  deploy:  # needs: build → deploy-pages（environment: github-pages）
```

### 13.2 手順と制約

```bash
npm test                           # ① テストが通ることを確認
npm run build                      # ② ビルドが通ることを確認（問題データ検証を含む）
git push -u origin <feature-branch> # ③ 作業ブランチへ push
# ④ main へマージして push
# ⑤ GitHub Actions のデプロイワークフローを main ブランチ指定で手動実行
```

> ⚠️ **GitHub Pages 環境の保護により、`main` 以外のブランチからはデプロイが失敗する**
> （build ジョブは成功し、deploy ジョブだけが落ちる）。必ず main へマージしてから実行すること。

---

## 14. 移植元から解消した制約

| # | 移植元の制約 | 本アプリでの対応 |
|---|---|---|
| I-1 | `App.jsx` が単一ファイルで約 690 行 | `config` / `data` / `domain` / `storage` / `hooks` / `screens` に分割 |
| I-2 | モジュール割当が配列インデックス依存（途中挿入で全件破損） | `Q()` の引数へ移動。テストで `module` の妥当性も検証 |
| I-3 | `byModule` 未記録でモジュール別分析ができない | Session に `byModule` を追加し、レポートに「章別の累計成績」を新設 |
| I-5 | 自動テストなし | Vitest で 75 件。`build` に問題データ検証を組み込み |
| I-6 | 問題数の表示が固定文字列（180問と表示、実際は 354 問） | すべて `QUESTIONS.length` から算出 |
| I-8 | `seenIds` と `lastSeen` が冗長 | `seenIds` を廃止。`lastSeen` のキー有無で代替（旧 Gist は読み込み時に取り込む） |
| — | PAT を設定しないと利用開始できない | 「同期せずに使う」を選択でき、選択を永続化。設定画面へ戻る導線も用意 |
| — | ルート配信前提（`base` 未指定） | `base: './'` と相対パスの manifest でサブパス配信にも対応 |

---

## 15. 残る制約と改善候補

| # | 内容 | 重要度 |
|---|---|---|
| R-1 | Gist 同期が last-write-wins。複数端末で同時利用すると片方が失われる | 中 |
| R-2 | Service Worker 未導入のため、更新反映の制御ができない | 中 |
| R-3 | 履歴が無制限に増加する。上限または集約の仕組みが必要 | 低 |
| R-4 | 画面コンポーネントに対するテストがない（`domain` と `analytics` のみ） | 低 |
| R-5 | バンドルが約 650KB（Recharts が大半）。コード分割の余地がある | 低 |

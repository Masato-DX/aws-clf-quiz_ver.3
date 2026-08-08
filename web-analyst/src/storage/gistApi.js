// src/storage/gistApi.js
// GitHub Gist を保存先とした端末間同期。
//
// セキュリティ要件（SEC-1〜3）:
//   - PAT / Gist ID をソースコードやコミットに含めないこと
//   - 認証情報はユーザーが画面から入力し、localStorage にのみ保持する
//   - PAT は入力欄でマスク表示する

import { GIST_FILENAME } from '../config';

/**
 * 保存フォーマットの土台。欠損キーはここから補完されるため、
 * 将来キーを追加しても古い Gist を読み続けられる（要件 D-6）。
 */
export const EMPTY_DATA = { history: [], wrongIds: [], wrongCounts: {}, lastSeen: {} };

/**
 * Gist の JSON を現行フォーマットへ正規化する。
 * 後方互換のため以下を受け入れる:
 *   - 配列のみ（最初期の形式。履歴だけを保存していた）
 *   - seenIds を含む旧形式（本アプリでは lastSeen のキーに統合したため取り込む）
 */
export function normalizeGistData(parsed) {
  if (Array.isArray(parsed)) return { ...EMPTY_DATA, history: parsed };
  if (!parsed || typeof parsed !== 'object') return { ...EMPTY_DATA };

  const data = { ...EMPTY_DATA, ...parsed };
  const lastSeen = { ...data.lastSeen };
  // 旧形式の seenIds は「出題済みだが日時不明」なので、lastSeen に 0 として取り込む。
  // 0 は「最も昔に出題した」扱いとなり、未出題と同様に優先して再出題される。
  if (Array.isArray(parsed.seenIds)) {
    parsed.seenIds.forEach(id => { if (!(id in lastSeen)) lastSeen[id] = 0; });
  }
  delete data.seenIds;
  return { ...data, lastSeen };
}

export async function fetchDataFromGist(pat, gistId) {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      'Authorization': `token ${pat}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });
  if (!response.ok) throw new Error('Gistの取得に失敗しました');

  const gist = await response.json();
  const file = gist.files?.[GIST_FILENAME];
  if (!file || !file.content) return { ...EMPTY_DATA };

  return normalizeGistData(JSON.parse(file.content));
}

export async function saveDataToGist(pat, gistId, data) {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `token ${pat}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: { [GIST_FILENAME]: { content: JSON.stringify(data, null, 2) } },
    }),
  });
  if (!response.ok) throw new Error('Gistへの保存に失敗しました');
  return response.json();
}

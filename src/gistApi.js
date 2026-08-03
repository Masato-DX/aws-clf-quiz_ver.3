// src/gistApi.js

const GIST_FILENAME = 'aws_clf_history.json';

const EMPTY_DATA = { history: [], seenIds: [], wrongIds: [], wrongCounts: {}, lastSeen: {} };

// Gistからデータ（履歴 + 解いた問題ID + 苦手問題ID + 間違えた回数 + 最終出題日時）を取得する
export async function fetchDataFromGist(pat, gistId) {
  try {
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Authorization': `token ${pat}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) throw new Error('Gistの取得に失敗しました');

    const gist = await response.json();
    const file = gist.files[GIST_FILENAME];

    if (!file || !file.content) return { ...EMPTY_DATA };

    const parsed = JSON.parse(file.content);
    // 旧フォーマット（配列のみ）の後方互換
    if (Array.isArray(parsed)) return { ...EMPTY_DATA, history: parsed };
    return { ...EMPTY_DATA, ...parsed };
  } catch (error) {
    console.error("Gist fetch error:", error);
    throw error;
  }
}

// Gistへデータ（履歴 + 解いた問題ID + 苦手問題ID + 間違えた回数 + 最終出題日時）を保存（上書き）する
export async function saveDataToGist(pat, gistId, data) {
  try {
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${pat}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify(data, null, 2)
          }
        }
      })
    });

    if (!response.ok) throw new Error('Gistへの保存に失敗しました');
    return await response.json();
  } catch (error) {
    console.error("Gist save error:", error);
    throw error;
  }
}

// src/gistApi.js

const GIST_FILENAME = 'aws_clf_history.json';

// Gistからデータ（履歴 + 解いた問題ID + 間違えた問題ID）を取得する
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

    if (!file || !file.content) return { history: [], seenIds: [], wrongIds: [] };

    const parsed = JSON.parse(file.content);
    // 旧フォーマット（配列のみ）の後方互換
    if (Array.isArray(parsed)) return { history: parsed, seenIds: [], wrongIds: [] };
    return { history: parsed.history || [], seenIds: parsed.seenIds || [], wrongIds: parsed.wrongIds || [] };
  } catch (error) {
    console.error("Gist fetch error:", error);
    throw error;
  }
}

// Gistへデータ（履歴 + 解いた問題ID + 間違えた問題ID）を保存（上書き）する
export async function saveDataToGist(pat, gistId, history, seenIds, wrongIds) {
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
            content: JSON.stringify({ history, seenIds, wrongIds }, null, 2)
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

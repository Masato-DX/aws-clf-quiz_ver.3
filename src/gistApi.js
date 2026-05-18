// src/gistApi.js

const GIST_FILENAME = 'aws_clf_history.json';

// Gistから履歴データを取得する
export async function fetchHistoryFromGist(pat, gistId) {
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
    
    if (!file || !file.content) return [];
    
    return JSON.parse(file.content);
  } catch (error) {
    console.error("Gist fetch error:", error);
    throw error;
  }
}

// Gistへ履歴データを保存（上書き）する
export async function saveHistoryToGist(pat, gistId, historyData) {
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
            content: JSON.stringify(historyData, null, 2)
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
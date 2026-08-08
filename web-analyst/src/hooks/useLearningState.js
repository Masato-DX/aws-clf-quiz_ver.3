// src/hooks/useLearningState.js
// 永続化を伴う学習状態（履歴・苦手問題・最終出題日時・同期設定）をまとめたフック。
// ビジネスロジックは src/domain/ 側に置き、ここは「状態と永続化の配線」に徹する。

import { useState, useEffect, useMemo, useCallback } from 'react';
import { applyResults, buildSession, frequentWrongIds } from '../domain/progress';
import * as local from '../storage/local';
import { fetchDataFromGist, saveDataToGist } from '../storage/gistApi';

export function useLearningState() {
  const initial = local.loadLearningData();
  const [history, setHistory] = useState(initial.history);
  const [wrongIds, setWrongIds] = useState(initial.wrongIds);
  const [wrongCounts, setWrongCounts] = useState(initial.wrongCounts);
  const [lastSeen, setLastSeen] = useState(initial.lastSeen);
  const [promotedCount, setPromotedCount] = useState(0);

  const [syncConfig, setSyncConfig] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [authError, setAuthError] = useState('');
  const [booted, setBooted] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);

  /** Gist から取得したデータをローカルへ反映する */
  const adoptRemote = useCallback(remote => {
    const next = {
      history: remote.history,
      wrongIds: new Set(remote.wrongIds),
      wrongCounts: remote.wrongCounts,
      lastSeen: remote.lastSeen,
    };
    setHistory(next.history);
    setWrongIds(next.wrongIds);
    setWrongCounts(next.wrongCounts);
    setLastSeen(next.lastSeen);
    local.saveLearningData(next);
  }, []);

  // 起動時：同期設定があれば Gist から取得。失敗してもローカルで動作する（要件 D-4）
  useEffect(() => {
    (async () => {
      const saved = local.loadSyncConfig();
      if (!saved) {
        // 「同期せずに使う」を選んでいれば、次回以降は設定画面を挟まない
        setNeedsAuth(!local.loadAuthDismissed());
        setBooted(true);
        return;
      }
      setSyncConfig(saved);
      try {
        adoptRemote(await fetchDataFromGist(saved.pat, saved.gistId));
      } catch (e) {
        console.error('Gistからの取得に失敗しました。ローカルデータを使用します', e);
      } finally {
        setBooted(true);
      }
    })();
  }, [adoptRemote]);

  const frequentWrong = useMemo(() => frequentWrongIds(wrongCounts), [wrongCounts]);

  /** 同期設定を保存する。接続テストを兼ねて Gist を読みにいく */
  const saveAuth = async (pat, gistId) => {
    setIsSyncing(true);
    setAuthError('');
    try {
      const remote = await fetchDataFromGist(pat, gistId);
      const config = { pat, gistId };
      local.saveSyncConfig(config);
      local.saveAuthDismissed(true);
      setSyncConfig(config);
      adoptRemote(remote);
      setNeedsAuth(false);
      return true;
    } catch {
      setAuthError('Gistの読み込みに失敗しました。PATとGist IDを確認してください。');
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  /** 同期を設定せずに使い始める（ローカル保存のみ） */
  const skipAuth = () => {
    local.saveAuthDismissed(true);
    setNeedsAuth(false);
  };

  /** 設定画面からいつでも同期設定を開き直せるようにする */
  const openAuth = () => {
    setAuthError('');
    setNeedsAuth(true);
  };

  /** セッション終了時：履歴と追跡データを更新して保存する */
  const commitSession = async (results, config) => {
    const now = Date.now();
    const next = applyResults({ wrongIds, wrongCounts, lastSeen }, results, now);
    const nextHistory = [...history, buildSession(results, config, now)];

    setHistory(nextHistory);
    setWrongIds(next.wrongIds);
    setWrongCounts(next.wrongCounts);
    setLastSeen(next.lastSeen);
    setPromotedCount(next.promotedCount);

    const payload = {
      history: nextHistory,
      wrongIds: next.wrongIds,
      wrongCounts: next.wrongCounts,
      lastSeen: next.lastSeen,
    };
    local.saveLearningData(payload);

    if (syncConfig) {
      try {
        await saveDataToGist(syncConfig.pat, syncConfig.gistId, { ...payload, wrongIds: [...next.wrongIds] });
      } catch (e) {
        console.error('Gistへの保存に失敗しました', e);
      }
    }
  };

  /** 全データの削除（二段確認は UI 側で行う） */
  const clearAll = async () => {
    setHistory([]);
    setWrongIds(new Set());
    setWrongCounts({});
    setLastSeen({});
    local.clearLearningData();
    if (syncConfig) {
      try {
        await saveDataToGist(syncConfig.pat, syncConfig.gistId,
          { history: [], wrongIds: [], wrongCounts: {}, lastSeen: {} });
      } catch (e) {
        console.error('Gistのクリアに失敗しました', e);
      }
    }
  };

  return {
    history, wrongIds, wrongCounts, lastSeen, promotedCount, frequentWrong,
    syncConfig, isSyncing, authError, booted, needsAuth,
    saveAuth, skipAuth, openAuth, commitSession, clearAll,
  };
}

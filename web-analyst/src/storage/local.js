// src/storage/local.js
// localStorage の読み書き。キー接頭辞をここだけで管理する。

import { STORAGE_PREFIX } from '../config';

export const KEYS = {
  history:    `${STORAGE_PREFIX}history`,
  wrongIds:   `${STORAGE_PREFIX}wrong_questions`,
  wrongCounts:`${STORAGE_PREFIX}wrong_counts`,
  lastSeen:   `${STORAGE_PREFIX}last_seen`,
  syncConfig: `${STORAGE_PREFIX}sync_config`,
  authDismissed: `${STORAGE_PREFIX}auth_dismissed`,
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`localStorage への保存に失敗しました: ${key}`, e);
  }
}

/** 起動時に永続化済みの学習データを読み出す */
export function loadLearningData() {
  return {
    history: read(KEYS.history, []),
    wrongIds: new Set(read(KEYS.wrongIds, [])),
    wrongCounts: read(KEYS.wrongCounts, {}),
    lastSeen: read(KEYS.lastSeen, {}),
  };
}

/** 学習データをまとめて保存する */
export function saveLearningData({ history, wrongIds, wrongCounts, lastSeen }) {
  write(KEYS.history, history);
  write(KEYS.wrongIds, [...wrongIds]);
  write(KEYS.wrongCounts, wrongCounts);
  write(KEYS.lastSeen, lastSeen);
}

/** 学習データをすべて削除する（同期設定は残す） */
export function clearLearningData() {
  [KEYS.history, KEYS.wrongIds, KEYS.wrongCounts, KEYS.lastSeen]
    .forEach(k => localStorage.removeItem(k));
}

export function loadSyncConfig() {
  return read(KEYS.syncConfig, null);
}

export function saveSyncConfig(config) {
  write(KEYS.syncConfig, config);
}

/** 「同期せずに使う」を選んだかどうか。毎回の起動で設定画面に戻さないために保持する */
export function loadAuthDismissed() {
  return read(KEYS.authDismissed, false) === true;
}

export function saveAuthDismissed(value) {
  write(KEYS.authDismissed, value);
}

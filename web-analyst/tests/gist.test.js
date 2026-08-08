import { describe, it, expect } from 'vitest';
import { normalizeGistData, EMPTY_DATA } from '../src/storage/gistApi';

describe('normalizeGistData — Gist の後方互換（要件 D-6）', () => {
  it('旧形式（履歴の配列のみ）を読める', () => {
    const out = normalizeGistData([{ id: 1, accuracy: 80 }]);
    expect(out.history).toHaveLength(1);
    expect(out.wrongIds).toEqual([]);
    expect(out.wrongCounts).toEqual({});
    expect(out.lastSeen).toEqual({});
  });

  it('欠損キーを含む新形式は既定値で補完される', () => {
    const out = normalizeGistData({ history: [], wrongIds: [7] });
    expect(out.wrongCounts).toEqual({});
    expect(out.lastSeen).toEqual({});
    expect(out.wrongIds).toEqual([7]);
  });

  it('旧 seenIds は lastSeen に 0 として取り込まれ、キー自体は残さない', () => {
    const out = normalizeGistData({ seenIds: [1, 2], lastSeen: { 2: 500 } });
    expect(out.lastSeen).toEqual({ 1: 0, 2: 500 }); // 既存の lastSeen は上書きしない
    expect(out.seenIds).toBeUndefined();
  });

  it('null や不正な値でも既定値を返す', () => {
    expect(normalizeGistData(null)).toEqual(EMPTY_DATA);
    expect(normalizeGistData('壊れたデータ')).toEqual(EMPTY_DATA);
  });

  it('全キーが揃った新形式はそのまま読める', () => {
    const data = { history: [{ id: 1 }], wrongIds: [3], wrongCounts: { 3: 2 }, lastSeen: { 3: 900 } };
    expect(normalizeGistData(data)).toEqual(data);
  });
});

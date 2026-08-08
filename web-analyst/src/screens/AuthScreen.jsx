import { useState } from 'react';
import { Settings, AlertCircle, Save, Loader2, ChevronRight } from 'lucide-react';
import { EXAM, THEME } from '../config';

/**
 * 初回起動時の同期設定画面。
 * PAT / Gist ID はここで入力し localStorage にのみ保持する（要件 SEC-1〜3）。
 * PWA を入れ直すと localStorage が消えるため、同期の設定を最初に促す設計にしている。
 */
export default function AuthScreen({ onSave, onSkip, isSyncing, error }) {
  const [pat, setPat] = useState('');
  const [gistId, setGistId] = useState('');

  return (
    <div className="fade-up max-w-md mx-auto mt-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center rounded-2xl mb-5"
          style={{ width: 64, height: 64, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}` }}>
          <Settings size={28} style={{ color: THEME.accent }} />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">{EXAM.shortName}</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          学習記録を端末間で同期する場合は、GitHub の<br />PAT と Gist ID を設定してください。
        </p>
      </div>

      <div className="space-y-4 mb-5">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">Personal Access Token (PAT)</label>
          <input
            type="password" value={pat} onChange={e => setPat(e.target.value)} placeholder="ghp_..."
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none mono"
            style={{ borderColor: pat ? THEME.accentBorder : undefined }}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">Gist ID</label>
          <input
            type="text" value={gistId} onChange={e => setGistId(e.target.value)} placeholder="32桁の英数字"
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none mono"
            style={{ borderColor: gistId ? THEME.accentBorder : undefined }}
          />
        </div>
        {error && (
          <div className="flex gap-2 items-start p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-red-400 leading-relaxed">{error}</span>
          </div>
        )}
      </div>

      <button
        onClick={() => onSave(pat, gistId)} disabled={isSyncing || !pat || !gistId}
        className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ background: THEME.gradient, color: THEME.bgSolid }}
      >
        {isSyncing
          ? <><Loader2 size={18} className="animate-spin" /> 接続テスト中...</>
          : <><Save size={18} /> 保存して開始</>}
      </button>

      <button onClick={onSkip} className="w-full mt-3 py-3 rounded-xl text-sm text-slate-400 flex items-center justify-center gap-1.5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        同期せずにこの端末だけで使う <ChevronRight size={15} />
      </button>

      <p className="text-[11px] text-slate-500 leading-relaxed mt-5 px-1">
        同期を設定しない場合、学習記録はこの端末の localStorage にのみ保存されます。
        ホーム画面に追加した PWA を削除・再インストールすると記録は失われます。
      </p>
    </div>
  );
}

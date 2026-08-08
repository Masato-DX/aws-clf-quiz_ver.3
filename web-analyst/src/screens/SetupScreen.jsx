import { ChevronRight, Check, X, Target, BookOpen, BarChart3, Sparkles, History, Flame } from 'lucide-react';
import { EXAM, THEME } from '../config';
import { DOMAINS, DIFFICULTIES, MODULES, QUESTION_COUNTS } from '../data/taxonomy';

export default function SetupScreen({
  config, setConfig, moduleKeys, totalCount, availableCount, unseenCount,
  startQuiz, historyCount, onShowHistory,
  wrongCount, onStartWrongOnly, frequentWrongCount, onStartFrequentWrong, syncEnabled, onOpenAuth,
}) {
  const isModule = config.filterType === 'module';

  return (
    <div className="fade-up">
      <div className="flex justify-end mb-3">
        <button onClick={onShowHistory} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}>
          <History size={13} /><span>学習記録{historyCount > 0 ? ` (${historyCount})` : ''}</span><ChevronRight size={12} />
        </button>
      </div>

      <div className="text-center mb-8">
        {/* 改善 I-6: 問題数は固定文字列ではなく QUESTIONS.length から算出する */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5"
          style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}` }}>
          <Sparkles size={14} style={{ color: THEME.accent }} />
          <span className="text-xs font-medium tracking-wider" style={{ color: THEME.accentLight }}>
            {EXAM.syllabus} · {totalCount}問
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight">
          {EXAM.heroTitle}<br />
          <span style={{ background: THEME.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {EXAM.heroSubtitle}
          </span>
        </h1>
        <p className="text-slate-400 mt-3 text-sm">難易度・{isModule ? '章' : '領域'}・問題数を選んで始めよう</p>
      </div>

      {frequentWrongCount > 0 && (
        <button onClick={onStartFrequentWrong} className="w-full mb-3 rounded-2xl p-4 flex items-center gap-3 text-left"
          style={{ background: 'rgba(251,146,60,0.12)', border: '1.5px solid rgba(251,146,60,0.4)' }}>
          <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 44, height: 44, background: 'rgba(251,146,60,0.18)' }}>
            <Flame size={20} style={{ color: '#fb923c' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-sm">要注意問題（複数回ミス）</div>
            <div className="text-xs text-slate-400 mt-0.5">
              2回以上間違えた <span className="mono font-bold" style={{ color: '#fb923c' }}>{frequentWrongCount}</span> 問を集中出題
            </div>
          </div>
          <ChevronRight size={18} style={{ color: '#fb923c' }} />
        </button>
      )}

      {wrongCount > 0 && (
        <button onClick={onStartWrongOnly} className="w-full mb-6 rounded-2xl p-4 flex items-center gap-3 text-left"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.35)' }}>
          <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 44, height: 44, background: 'rgba(239,68,68,0.15)' }}>
            <X size={20} style={{ color: '#f87171' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-sm">苦手問題に再挑戦</div>
            <div className="text-xs text-slate-400 mt-0.5">
              これまで間違えた <span className="mono font-bold" style={{ color: '#f87171' }}>{wrongCount}</span> 問だけを出題
            </div>
          </div>
          <ChevronRight size={18} style={{ color: '#f87171' }} />
        </button>
      )}

      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} style={{ color: THEME.accent }} />
          <h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">難易度</h2>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {Object.entries(DIFFICULTIES).map(([k, v]) => {
            const active = config.difficulty === k;
            return (
              <button key={k} onClick={() => setConfig({ ...config, difficulty: k })} className="rounded-xl p-3 text-white text-left"
                style={{ background: active ? THEME.accentBg : 'rgba(255,255,255,0.03)', border: `1.5px solid ${active ? THEME.accent : 'rgba(255,255,255,0.08)'}` }}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-sm">{v.label}</span>
                  <span className="text-xs" style={{ color: THEME.accent }}>{v.stars}</span>
                </div>
                <span className="text-xs text-slate-400">{v.desc}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen size={16} style={{ color: THEME.info }} />
            <h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">{isModule ? '章' : '領域'}</h2>
          </div>
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            {[['domain', '領域'], ['module', '章']].map(([key, label]) => (
              <button key={key} onClick={() => setConfig({ ...config, filterType: key })} className="px-2.5 py-1 text-[11px] font-bold"
                style={{ background: config.filterType === key ? THEME.accentBg : 'transparent', color: config.filterType === key ? THEME.accentLight : '#64748b' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {!isModule ? (
          <div className="space-y-2">
            {Object.entries(DOMAINS).map(([k, v]) => {
              const Icon = v.icon;
              const active = config.domain === k;
              return (
                <button key={k} onClick={() => setConfig({ ...config, domain: k })} className="w-full text-left rounded-xl p-3.5 flex items-center gap-3"
                  style={{ background: active ? v.bg : 'rgba(255,255,255,0.03)', border: `1.5px solid ${active ? v.color : 'rgba(255,255,255,0.08)'}` }}>
                  <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 40, height: 40, background: v.bg }}>
                    <Icon size={20} style={{ color: v.color }} />
                  </div>
                  <div className="flex-1 min-w-0"><div className="font-bold text-white text-sm">{v.label}</div></div>
                  {active && <Check size={18} style={{ color: v.color }} />}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <p className="text-[11px] text-slate-500 mb-2.5">
              {EXAM.syllabus}の章立てで出題します。{EXAM.format}で、章ごとにランダム出題されます。
            </p>
            <div className="grid grid-cols-3 gap-2">
              {moduleKeys.map(k => {
                const v = MODULES[k];
                const Icon = v.icon;
                const active = config.module === k;
                return (
                  <button key={k} onClick={() => setConfig({ ...config, module: k })} className="rounded-xl p-2.5 flex flex-col items-center gap-1 text-center"
                    style={{ background: active ? v.bg : 'rgba(255,255,255,0.03)', border: `1.5px solid ${active ? v.color : 'rgba(255,255,255,0.08)'}` }}>
                    <Icon size={16} style={{ color: v.color }} />
                    <span className="text-[10px] font-medium text-white leading-tight">{v.short}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={16} style={{ color: THEME.sub }} />
          <h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">問題数</h2>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {QUESTION_COUNTS.map(n => {
            const active = config.count === n;
            return (
              <button key={n} onClick={() => setConfig({ ...config, count: n })} className="rounded-xl p-3 text-white text-center"
                style={{ background: active ? THEME.accentBg : 'rgba(255,255,255,0.03)', border: `1.5px solid ${active ? THEME.accent : 'rgba(255,255,255,0.08)'}` }}>
                <div className="mono font-bold text-lg">{n}</div>
                <div className="text-xs text-slate-400">問</div>
              </button>
            );
          })}
        </div>
        <div className="mt-3 text-xs text-slate-500 text-center">
          利用可能: <span className="mono" style={{ color: THEME.accentLight }}>{availableCount}</span> 問 /
          出題: <span className="mono" style={{ color: THEME.accentLight }}>{Math.min(config.count, availableCount)}</span> 問
          {unseenCount > 0
            ? <span className="ml-2" style={{ color: '#34d399' }}>（未出題 <span className="mono font-bold">{unseenCount}</span> 問を優先）</span>
            : <span className="ml-2" style={{ color: '#f59e0b' }}>（全問出題済み・出題間隔の長い順）</span>}
        </div>
        {wrongCount > 0 && (
          <div className="mt-1 text-[11px] text-slate-500 text-center">
            苦手問題（{wrongCount}問）は通常出題では後回しになります
          </div>
        )}
        {!syncEnabled && (
          <div className="mt-1 text-[11px] text-center" style={{ color: '#f59e0b' }}>
            同期未設定：学習記録はこの端末にのみ保存されます
            <button onClick={onOpenAuth} className="ml-1 underline" style={{ color: THEME.accentLight }}>設定する</button>
          </div>
        )}
      </section>

      <button onClick={startQuiz} disabled={availableCount === 0}
        className="w-full mt-2 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2"
        style={{
          background: availableCount === 0 ? 'rgba(255,255,255,0.05)' : THEME.gradient,
          color: availableCount === 0 ? '#64748b' : THEME.bgSolid,
          boxShadow: availableCount === 0 ? 'none' : THEME.glow,
        }}>
        スタート <ChevronRight size={18} strokeWidth={3} />
      </button>
    </div>
  );
}

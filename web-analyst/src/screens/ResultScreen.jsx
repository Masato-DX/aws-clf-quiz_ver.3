import { useMemo } from 'react';
import { RotateCcw, Trophy, Check, X, BookOpen, Target, AlertCircle, TrendingUp, Award, Lightbulb, ChevronRight } from 'lucide-react';
import { EXAM, THEME } from '../config';
import { DOMAINS, DIFFICULTIES, DIFFICULTY_KEYS } from '../data/taxonomy';

export default function ResultScreen({ results, questions, onRestart, promotedCount }) {
  const total = results.length;
  const correct = results.filter(r => r.correct).length;
  const acc = total > 0 ? Math.round((correct / total) * 100) : 0;

  const byDomain = useMemo(() => {
    const m = {};
    results.forEach(r => {
      if (!m[r.domain]) m[r.domain] = { correct: 0, total: 0 };
      m[r.domain].total++;
      if (r.correct) m[r.domain].correct++;
    });
    return Object.entries(m)
      .map(([k, v]) => ({ key: k, ...DOMAINS[k], ...v, accuracy: Math.round((v.correct / v.total) * 100) }))
      .sort((a, b) => a.accuracy - b.accuracy);
  }, [results]);

  const byDiff = useMemo(() => {
    const m = {};
    results.forEach(r => {
      if (!m[r.difficulty]) m[r.difficulty] = { correct: 0, total: 0 };
      m[r.difficulty].total++;
      if (r.correct) m[r.difficulty].correct++;
    });
    return DIFFICULTY_KEYS.filter(k => m[k])
      .map(k => ({ key: k, ...DIFFICULTIES[k], ...m[k], accuracy: Math.round((m[k].correct / m[k].total) * 100) }));
  }, [results]);

  const weakest = byDomain.find(d => d.accuracy < 100) || null;

  let verdict, vColor, VIcon;
  if (acc >= EXAM.excellentLine) { verdict = '合格圏内！'; vColor = THEME.good; VIcon = Trophy; }
  else if (acc >= EXAM.passLine) { verdict = 'もう一歩'; vColor = THEME.accent; VIcon = TrendingUp; }
  else { verdict = '要復習'; vColor = THEME.bad; VIcon = Target; }

  // 出題順ではなく questionId で問題を引く（並びのズレに依存しない）
  const questionById = useMemo(() => new Map(questions.map(q => [q.id, q])), [questions]);
  const wrong = results.filter(r => !r.correct).map(r => ({ ...r, q: questionById.get(r.questionId) })).filter(r => r.q);

  return (
    <div className="fade-up">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5" style={{ background: `${vColor}20`, border: `1px solid ${vColor}50` }}>
          <VIcon size={14} style={{ color: vColor }} />
          <span className="text-xs font-bold tracking-wider" style={{ color: vColor }}>{verdict}</span>
        </div>
        <div className="mono font-black text-7xl sm:text-8xl leading-none mb-2"
          style={{ background: `linear-gradient(180deg,${vColor},${vColor}80)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {acc}<span className="text-4xl">%</span>
        </div>
        <p className="text-slate-300 text-sm">
          <span className="mono font-bold text-white">{correct}</span> / <span className="mono">{total}</span> 問正解
        </p>
        <p className="text-xs text-slate-500 mt-1">合格ライン: 約 {EXAM.passLine}%</p>
        <p className="text-[10px] text-slate-600 mt-0.5">{EXAM.passLineNote}</p>
      </div>

      {promotedCount > 0 && (
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: 'rgba(16,185,129,0.1)', border: '1.5px solid rgba(16,185,129,0.4)' }}>
          <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 44, height: 44, background: 'rgba(16,185,129,0.15)' }}>
            <Award size={22} style={{ color: THEME.good }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-sm">苦手を克服しました！</div>
            <div className="text-xs text-slate-400 mt-0.5">
              以前間違えた <span className="mono font-bold" style={{ color: THEME.good }}>{promotedCount}</span> 問に正解し、通常の問題プールに戻りました
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl p-5 mb-4" style={{ background: THEME.card, border: THEME.cardBorder }}>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={16} style={{ color: THEME.info }} />
          <h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">領域別の正答率</h2>
        </div>
        <div className="space-y-3">
          {byDomain.map(d => {
            const Icon = d.icon;
            return (
              <div key={d.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon size={14} style={{ color: d.color }} />
                    <span className="text-sm font-medium text-white truncate">{d.short}</span>
                  </div>
                  <div className="mono text-sm flex items-center gap-2 flex-shrink-0">
                    <span className="text-slate-400">{d.correct}/{d.total}</span>
                    <span className="font-bold" style={{ color: d.color }}>{d.accuracy}%</span>
                  </div>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full" style={{ width: `${d.accuracy}%`, background: d.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {byDiff.length > 1 && (
        <div className="rounded-2xl p-5 mb-4" style={{ background: THEME.card, border: THEME.cardBorder }}>
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} style={{ color: THEME.accent }} />
            <h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">難易度別の正答率</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {byDiff.map(d => (
              <div key={d.key} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-xs text-slate-400 mb-1">{d.label}</div>
                <div className="text-xs mb-1.5" style={{ color: THEME.accent }}>{d.stars}</div>
                <div className="mono font-bold text-lg text-white">{d.accuracy}<span className="text-xs text-slate-400">%</span></div>
                <div className="mono text-[10px] text-slate-500">{d.correct}/{d.total}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {weakest && (
        <div className="rounded-2xl p-5 mb-4" style={{ background: `${weakest.color}10`, border: `1.5px solid ${weakest.color}40` }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} style={{ color: weakest.color }} />
            <h2 className="text-sm font-bold tracking-wider uppercase" style={{ color: weakest.color }}>あなたの弱点</h2>
          </div>
          <p className="text-white font-bold mb-1">{weakest.label}</p>
          <p className="text-slate-300 text-sm leading-relaxed">
            この領域の正答率は <span className="mono font-bold" style={{ color: weakest.color }}>{weakest.accuracy}%</span> でした。
            次回はこの領域を集中的に復習することをおすすめします。
          </p>
        </div>
      )}

      {acc === 100 && (
        <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1.5px solid rgba(16,185,129,0.4)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Award size={16} style={{ color: THEME.good }} />
            <h2 className="text-sm font-bold tracking-wider uppercase" style={{ color: THEME.good }}>完璧です！</h2>
          </div>
          <p className="text-slate-300 text-sm">全問正解です。より高い難易度や別の章にもチャレンジしてみましょう。</p>
        </div>
      )}

      {wrong.length > 0 && (
        <details className="rounded-2xl p-5 mb-4 group" style={{ background: THEME.card, border: THEME.cardBorder }}>
          <summary className="flex items-center justify-between cursor-pointer list-none">
            <div className="flex items-center gap-2">
              <X size={16} style={{ color: THEME.bad }} />
              <h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">間違えた問題 ({wrong.length})</h2>
            </div>
            <ChevronRight size={16} className="text-slate-500 transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-4 space-y-4">
            {wrong.map((r, i) => (
              <div key={i} className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-sm text-white font-medium mb-2 leading-relaxed">{r.q.question}</p>
                <div className="text-xs space-y-1 mb-2">
                  <div>
                    <span className="text-slate-500">あなたの回答: </span>
                    <span style={{ color: THEME.bad }}>
                      {r.selectedAnswers.map((idx, j) => (
                        <span key={j}>{j > 0 ? '、' : ''}{String.fromCharCode(65 + idx)}. {r.q.options[idx]}</span>
                      ))}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">正解: </span>
                    <span style={{ color: THEME.good }}>
                      {r.q.correctAnswers.map((idx, j) => (
                        <span key={j}>{j > 0 ? '、' : ''}{String.fromCharCode(65 + idx)}. {r.q.options[idx]}</span>
                      ))}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg p-2.5 flex gap-2" style={{ background: 'rgba(125,211,252,0.08)' }}>
                  <Lightbulb size={14} style={{ color: THEME.accentLight }} className="flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-relaxed">{r.q.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      <button onClick={onRestart} className="w-full mt-4 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2"
        style={{ background: THEME.gradient, color: THEME.bgSolid, boxShadow: THEME.glow }}>
        <RotateCcw size={18} strokeWidth={3} /> もう一度挑戦
      </button>
    </div>
  );
}

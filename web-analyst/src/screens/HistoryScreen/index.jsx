import { useState, useMemo } from 'react';
import {
  ChevronRight, Trophy, BookOpen, Target, TrendingUp, History, ArrowLeft,
  Trash2, Calendar, Activity, Flame, Layers,
} from 'lucide-react';
import { EXAM, THEME } from '../../config';
import { DOMAINS, DIFFICULTIES } from '../../data/taxonomy';
import {
  summarize, accuracyTrend, domainStats, moduleStats, difficultyStats,
  heatmap, dailyCounts, goalRate, timeSlotStats, domainGrowth,
} from './analytics';
import { AccuracyTrendChart, DailyCountsChart, HeatmapTable, accuracyColor } from './charts';

const Card = ({ children, className = '' }) => (
  <div className={`rounded-2xl p-5 mb-4 ${className}`} style={{ background: THEME.card, border: THEME.cardBorder }}>
    {children}
  </div>
);

const SectionTitle = ({ icon: Icon, color, children }) => (
  <div className="flex items-center gap-2 mb-4">
    <Icon size={16} style={{ color }} />
    <h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">{children}</h2>
  </div>
);

export default function HistoryScreen({ history, onBack, onClear }) {
  const [confirmClear, setConfirmClear] = useState(false);

  const stats = useMemo(() => summarize(history), [history]);
  const trend = useMemo(() => accuracyTrend(history), [history]);
  const domains = useMemo(() => domainStats(history), [history]);
  const modules = useMemo(() => moduleStats(history), [history]);
  const diffs = useMemo(() => difficultyStats(history), [history]);
  const heat = useMemo(() => heatmap(history), [history]);
  const daily = useMemo(() => dailyCounts(history), [history]);
  const goal = useMemo(() => goalRate(history), [history]);
  const slots = useMemo(() => timeSlotStats(history), [history]);
  const growth = useMemo(() => domainGrowth(history), [history]);

  if (history.length === 0) {
    return (
      <div className="fade-up">
        <button onClick={onBack} className="flex items-center gap-1.5 mb-6 text-slate-400 text-sm">
          <ArrowLeft size={16} /> 戻る
        </button>
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center rounded-2xl mb-5"
            style={{ width: 72, height: 72, background: THEME.card, border: THEME.cardBorder }}>
            <History size={32} style={{ color: '#475569' }} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">まだ学習記録がありません</h2>
          <p className="text-slate-400 text-sm leading-relaxed px-4">
            クイズを完了すると、ここに成長の軌跡が<br />記録されていきます。
          </p>
        </div>
      </div>
    );
  }

  const firstAcc = history[0].accuracy;
  const latestAcc = history[history.length - 1].accuracy;
  const delta = latestAcc - firstAcc;
  const recent = [...history].reverse().slice(0, 10);

  return (
    <div className="fade-up">
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-300 text-sm">
          <ArrowLeft size={16} /> 戻る
        </button>
        {!confirmClear ? (
          <button onClick={() => setConfirmClear(true)} className="flex items-center gap-1 text-slate-500 text-xs">
            <Trash2 size={12} /> クリア
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">本当に削除？</span>
            <button onClick={() => { onClear(); setConfirmClear(false); }} className="px-2.5 py-1 rounded-md font-bold"
              style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid #ef444460' }}>削除</button>
            <button onClick={() => setConfirmClear(false)} className="px-2.5 py-1 rounded-md text-slate-400">キャンセル</button>
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3"
          style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}` }}>
          <Activity size={12} style={{ color: THEME.accent }} />
          <span className="text-xs font-medium" style={{ color: THEME.accentLight }}>学習レポート</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">あなたの学習の歩み</h1>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {[
          { icon: Activity, label: '受験回数', value: stats.totalQuizzes, unit: '回', color: THEME.accent },
          { icon: BookOpen, label: '累計解答', value: stats.totalQuestions, unit: '問', color: THEME.info },
          { icon: Target, label: '平均正答率', value: stats.overallAccuracy, unit: '%', color: THEME.sub },
          { icon: Trophy, label: 'ベストスコア', value: stats.bestScore, unit: '%', color: '#34d399' },
        ].map(({ icon: Icon, label, value, unit, color }) => (
          <div key={label} className="rounded-xl p-3.5" style={{ background: THEME.card, border: THEME.cardBorder }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon size={12} style={{ color }} />
              <span className="text-[11px] text-slate-400 font-medium">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="mono font-black text-2xl text-white leading-none">{value}</span>
              <span className="text-xs text-slate-400">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {stats.streak >= 2 && (
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-3"
          style={{ background: 'linear-gradient(90deg,rgba(56,189,248,0.12),rgba(167,139,250,0.06))', border: `1px solid ${THEME.accentBorder}` }}>
          <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 44, height: 44, background: THEME.accentBg }}>
            <Flame size={22} style={{ color: THEME.accent }} />
          </div>
          <div>
            <div className="text-xs text-slate-400">合格ライン ({EXAM.passLine}%) 連続達成</div>
            <div className="font-black text-white text-lg leading-tight">
              <span className="mono" style={{ color: THEME.accent }}>{stats.streak}</span>
              <span className="text-sm text-slate-300 ml-1">回連続 🔥</span>
            </div>
          </div>
        </div>
      )}

      {history.length >= 2 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} style={{ color: THEME.accent }} />
              <h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">正答率の推移</h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs mono">
              <span className="text-slate-500">{firstAcc}%</span>
              <ChevronRight size={11} className="text-slate-600" />
              <span className="font-bold" style={{ color: delta > 0 ? '#34d399' : delta < 0 ? '#f87171' : THEME.accent }}>{latestAcc}%</span>
              {delta !== 0 && (
                <span className="ml-1 font-bold" style={{ color: delta > 0 ? '#34d399' : '#f87171' }}>
                  {delta > 0 ? '+' : ''}{delta}
                </span>
              )}
            </div>
          </div>
          <AccuracyTrendChart data={trend} />
        </Card>
      )}

      <Card>
        <SectionTitle icon={BookOpen} color={THEME.info}>領域別の累計成績</SectionTitle>
        <div className="space-y-3">
          {domains.map(d => {
            const Icon = d.icon;
            return (
              <div key={d.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {Icon && <Icon size={14} style={{ color: d.color }} />}
                    <span className="text-sm font-medium text-white truncate">{d.short}</span>
                    {d.growth !== 0 && (
                      <span className="mono text-[10px] font-bold flex-shrink-0" style={{ color: d.growth > 0 ? '#34d399' : '#f87171' }}>
                        {d.growth > 0 ? '↑' : '↓'}{Math.abs(d.growth)}
                      </span>
                    )}
                  </div>
                  <div className="mono text-xs flex items-center gap-2 flex-shrink-0">
                    <span className="text-slate-500">{d.total}問</span>
                    <span className="font-bold text-sm" style={{ color: d.color }}>{d.accuracy}%</span>
                  </div>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full" style={{ width: `${d.accuracy}%`, background: d.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 章別の累計成績。移植元では記録されておらず分析できなかった軸（改善 I-3） */}
      {modules.length > 0 && (
        <Card>
          <SectionTitle icon={Layers} color={THEME.sub}>章別の累計成績</SectionTitle>
          <div className="space-y-2.5">
            {modules.map(m => (
              <div key={m.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-white truncate pr-2">{m.label}</span>
                  <div className="mono text-[11px] flex items-center gap-2 flex-shrink-0">
                    <span className="text-slate-500">{m.correct}/{m.total}</span>
                    <span className="font-bold text-sm" style={{ color: accuracyColor(m.accuracy) }}>{m.accuracy}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full" style={{ width: `${m.accuracy}%`, background: m.color }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {diffs.length > 0 && (
        <Card>
          <SectionTitle icon={Target} color={THEME.accent}>難易度別の累計成績</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {diffs.map(d => (
              <div key={d.key} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-xs text-slate-400 mb-1">{d.label}</div>
                <div className="text-xs mb-1.5" style={{ color: THEME.accent }}>{DIFFICULTIES[d.key].stars}</div>
                <div className="mono font-bold text-2xl text-white">{d.accuracy}<span className="text-sm text-slate-400">%</span></div>
                <div className="mono text-[10px] text-slate-500 mt-0.5">{d.correct}/{d.total}問</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {Object.keys(heat).length > 0 && <HeatmapTable heatmap={heat} />}

      {daily.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} style={{ color: '#34d399' }} />
              <h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">日別 解答問題数</h2>
            </div>
            <span className="mono text-[11px] text-slate-500">{daily.length}日間</span>
          </div>
          <DailyCountsChart data={daily} />
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="rounded-2xl p-4" style={{ background: THEME.card, border: THEME.cardBorder }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy size={13} style={{ color: '#34d399' }} />
            <span className="text-[11px] text-slate-400 font-medium">目標達成率</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="mono font-black text-3xl text-white leading-none">{goal}</span>
            <span className="text-xs text-slate-400">%</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">{EXAM.passLine}%以上のセッション割合</div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
            <div className="h-full rounded-full" style={{ width: `${goal}%`, background: 'linear-gradient(90deg,#34d399,#10b981)' }} />
          </div>
        </div>
        {slots.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: THEME.card, border: THEME.cardBorder }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Activity size={13} style={{ color: THEME.info }} />
              <span className="text-[11px] text-slate-400 font-medium">時間帯別正答率</span>
            </div>
            <div className="space-y-1">
              {slots.map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 w-4">{s.label}</span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${s.accuracy}%`, background: s.accuracy >= EXAM.passLine ? THEME.info : '#475569' }} />
                  </div>
                  <span className="mono text-[10px] text-white font-bold w-8 text-right">{s.accuracy}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {growth.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} style={{ color: THEME.sub }} />
            <h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">領域別の成長</h2>
          </div>
          <p className="text-[11px] text-slate-500 mb-4">初回の記録 と 直近5回の平均 を比較しています</p>
          <div className="space-y-3">
            {growth.map(d => {
              const Icon = d.icon;
              const label = d.diff === null ? '📊 初回データなし'
                : d.diff > 5 ? '📈 伸びている'
                : d.diff < -5 ? '📉 要注意'
                : d.diff === 0 ? '➡️ 変化なし' : '📊 ほぼ横ばい';
              const diffCol = d.diff === null ? '#94a3b8' : d.diff > 5 ? '#34d399' : d.diff < -5 ? '#f87171' : '#94a3b8';
              return (
                <div key={d.key} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {Icon && <Icon size={13} style={{ color: d.color }} />}
                      <span className="text-xs font-medium text-white">{d.short}</span>
                    </div>
                    <span className="text-[11px]">{label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 mb-0.5">初回</div>
                      <div className="mono font-bold text-base text-slate-300">{d.before !== null ? `${d.before}%` : '-'}</div>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${d.after}%`, background: accuracyColor(d.after) }} />
                      </div>
                      {d.diff !== null
                        ? <span className="mono text-[11px] font-bold" style={{ color: diffCol }}>
                            {d.diff > 0 ? '▲' : d.diff < 0 ? '▼' : '─'} {d.diff > 0 ? '+' : ''}{d.diff}ポイント
                          </span>
                        : <span className="text-[10px] text-slate-600">比較データなし</span>}
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-500 mb-0.5">直近5回</div>
                      <div className="mono font-bold text-base" style={{ color: accuracyColor(d.after) }}>{d.after}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle icon={Calendar} color={THEME.sub}>最近の受験</SectionTitle>
        <div className="space-y-2">
          {recent.map(h => {
            const d = new Date(h.date);
            const isModule = h.config?.filterType === 'module';
            const scope = isModule ? '章別' : (DOMAINS[h.config?.domain] || DOMAINS.all).short;
            const diff = DIFFICULTIES[h.config?.difficulty] || DIFFICULTIES.all;
            return (
              <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex-shrink-0 mono text-center" style={{ minWidth: 44 }}>
                  <div className="text-xs text-slate-400 font-bold">{d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}</div>
                  <div className="text-[10px] text-slate-600">{d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-300 truncate">
                    {scope} <span className="text-slate-600">·</span> <span style={{ color: THEME.accent }}>{diff.stars}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mono">{h.correct}/{h.total} 正解</div>
                </div>
                <div className="mono font-bold text-lg flex-shrink-0" style={{ color: accuracyColor(h.accuracy) }}>
                  {h.accuracy}<span className="text-xs">%</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <button onClick={onBack} className="w-full mt-2 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2"
        style={{ background: THEME.gradient, color: THEME.bgSolid, boxShadow: THEME.glow }}>
        新しいクイズを始める <ChevronRight size={18} strokeWidth={3} />
      </button>
    </div>
  );
}

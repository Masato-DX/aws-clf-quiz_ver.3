import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { EXAM, THEME } from '../../config';
import { DOMAINS, DIFFICULTIES, DOMAIN_KEYS, DIFFICULTY_KEYS } from '../../data/taxonomy';

const tooltipStyle = { background: THEME.bgSolid, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, fontSize: 12 };

/** 正答率の色分け（85%以上=緑 / 合格ライン以上=テーマ色 / 未満=赤） */
export function accuracyColor(acc) {
  if (acc >= EXAM.excellentLine) return THEME.good;
  if (acc >= EXAM.passLine) return THEME.accent;
  return THEME.bad;
}

/** 正答率の推移。件数に応じて軸目盛りとマーカー密度を自動調整する */
export function AccuracyTrendChart({ data }) {
  const n = data.length;
  return (
    <>
      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -22 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="idx" interval={n <= 15 ? 0 : Math.ceil(n / 8) - 1}
              tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#cbd5e1' }}
              formatter={(v, name) => [`${v}%`, name === 'avg3' ? '3回平均' : '正答率']}
              labelFormatter={l => `${l}回目`} />
            <Line type="monotone" dataKey="accuracy" stroke={THEME.accent} strokeWidth={n > 20 ? 1 : 2}
              dot={n <= 30 ? { fill: THEME.accent, r: n > 20 ? 1.5 : 3, strokeWidth: 0 } : false}
              activeDot={{ fill: THEME.accentLight, r: 5, strokeWidth: 2, stroke: THEME.bgSolid }} />
            {n >= 5 && (
              <Line type="monotone" dataKey="avg3" stroke={THEME.sub} strokeWidth={2} dot={false}
                activeDot={{ fill: '#c4b5fd', r: 4, strokeWidth: 0 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-[10px] text-slate-500 text-center flex items-center justify-center gap-3">
        <span>全 {n} 回</span>
        {n >= 5 && (
          <span className="flex items-center gap-1">
            <span style={{ display: 'inline-block', width: 16, height: 2, background: THEME.sub, borderRadius: 1 }} /> 3回移動平均
          </span>
        )}
      </div>
    </>
  );
}

/** 日別の解答数。0 の日も棒として描き、学習の継続性を可視化する */
export function DailyCountsChart({ data }) {
  const width = Math.max(data.length * 28, 300);
  return (
    <>
      <div className="overflow-x-auto">
        <div style={{ width, height: 140 }}>
          <BarChart width={width} height={140} data={data} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false}
              interval={data.length > 30 ? Math.floor(data.length / 15) : 0} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#cbd5e1' }} formatter={v => [`${v}問`, '解答数']} />
            <Bar dataKey="total" radius={[3, 3, 0, 0]} maxBarSize={20}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.total === 0 ? 'rgba(255,255,255,0.06)' : d.total >= 10 ? THEME.accent : THEME.info} />
              ))}
            </Bar>
          </BarChart>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-2 justify-center">
        {[[THEME.accent, '10問以上'], [THEME.info, '1〜9問'], ['rgba(255,255,255,0.06)', '0問']].map(([c, label]) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
            <span className="text-[10px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/** 難易度 × 領域のヒートマップ */
export function HeatmapTable({ heatmap }) {
  return (
    <div className="rounded-2xl p-5 mb-4" style={{ background: THEME.card, border: THEME.cardBorder }}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={16} style={{ color: THEME.sub }} />
        <h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">難易度 × 領域 ヒートマップ</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <td className="pb-2 pr-2 w-16" />
              {DIFFICULTY_KEYS.map(d => (
                <th key={d} className="pb-2 text-center font-medium text-[10px] text-slate-400 px-1">
                  {DIFFICULTIES[d].label}<br />
                  <span style={{ color: THEME.accent }}>{DIFFICULTIES[d].stars}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DOMAIN_KEYS.map(dom => {
              const Icon = DOMAINS[dom].icon;
              return (
                <tr key={dom}>
                  <td className="py-1 pr-2">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      {Icon && <Icon size={11} style={{ color: DOMAINS[dom].color }} />}
                      <span className="text-[10px] text-slate-400">{DOMAINS[dom].short}</span>
                    </div>
                  </td>
                  {DIFFICULTY_KEYS.map(diff => {
                    const v = heatmap[`${dom}_${diff}`];
                    if (!v) {
                      return (
                        <td key={diff} className="py-1 px-1">
                          <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <span className="text-slate-600 text-[10px]">-</span>
                          </div>
                        </td>
                      );
                    }
                    const acc = Math.round((v.c / v.t) * 100);
                    const col = accuracyColor(acc);
                    return (
                      <td key={diff} className="py-1 px-1">
                        <div className="rounded-lg p-2 text-center" style={{ background: `${col}26`, border: `1px solid ${col}40` }}>
                          <div className="mono font-bold text-sm" style={{ color: col }}>{acc}%</div>
                          <div className="text-[9px] text-slate-500 mt-0.5">{v.t}問</div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 mt-3 justify-end">
        {[[THEME.good, `${EXAM.excellentLine}%+`], [THEME.accent, `${EXAM.passLine}-${EXAM.excellentLine - 1}%`], [THEME.bad, `${EXAM.passLine}%未満`]].map(([c, label]) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: `${c}4d` }} />
            <span className="text-[10px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

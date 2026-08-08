import { ChevronRight, Check, X, AlertCircle, Lightbulb } from 'lucide-react';
import { THEME } from '../config';
import { DOMAINS, DIFFICULTIES, MODULES } from '../data/taxonomy';
import { isCorrect as gradeIsCorrect } from '../domain/grading';

export default function QuizScreen({ question, index, total, selectedAnswers, showFeedback, onSelect, onConfirm, onNext }) {
  if (!question) return null;

  const domain = DOMAINS[question.domain];
  const module = MODULES[question.module];
  const diff = DIFFICULTIES[question.difficulty];
  const DomainIcon = domain.icon;
  const progress = ((index + 1) / total) * 100;
  const correct = gradeIsCorrect(selectedAnswers, question);

  return (
    <div key={question.id} className="scale-in">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full min-w-0"
          style={{ background: domain.bg, border: `1px solid ${domain.color}40` }}>
          <DomainIcon size={14} style={{ color: domain.color }} className="flex-shrink-0" />
          <span className="text-xs font-medium truncate" style={{ color: domain.color }}>{domain.short}</span>
          <span className="text-xs flex-shrink-0" style={{ color: domain.color, opacity: .5 }}>·</span>
          <span className="text-xs text-slate-400 flex-shrink-0">{module.short}</span>
          <span className="text-xs font-bold flex-shrink-0" style={{ color: THEME.accent }}>{diff.stars}</span>
        </div>
        <div className="mono text-sm font-bold text-white flex-shrink-0">
          <span style={{ color: THEME.accent }}>{index + 1}</span><span className="text-slate-500"> / {total}</span>
        </div>
      </div>

      <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-6">
        <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: THEME.gradient }} />
      </div>

      <div className="rounded-2xl p-5 sm:p-6 mb-4" style={{ background: THEME.card, border: THEME.cardBorder }}>
        {question.multiSelect && (
          <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mb-2.5"
            style={{ background: `${domain.color}20`, color: domain.color }}>複数選択</span>
        )}
        <p className="text-white text-base sm:text-lg font-medium leading-relaxed">{question.question}</p>
      </div>

      <div className="space-y-2.5 mb-4">
        {question.options.map((opt, i) => {
          const isSel = selectedAnswers.includes(i);
          const isCorr = question.correctAnswers.includes(i);
          let bg = 'rgba(255,255,255,0.03)', border = 'rgba(255,255,255,0.08)', lc = THEME.accent;
          if (showFeedback) {
            if (isCorr) { bg = 'rgba(16,185,129,0.12)'; border = THEME.good; lc = THEME.good; }
            else if (isSel) { bg = 'rgba(239,68,68,0.12)'; border = THEME.bad; lc = THEME.bad; }
          } else if (isSel) {
            bg = THEME.accentBg; border = THEME.accent;
          }
          return (
            <button key={i} onClick={() => onSelect(i)} disabled={showFeedback}
              className="w-full text-left rounded-xl p-4 flex items-start gap-3"
              style={{ background: bg, border: `1.5px solid ${border}`, cursor: showFeedback ? 'default' : 'pointer' }}>
              {question.multiSelect ? (
                <input type="checkbox" checked={isSel} readOnly disabled className="flex-shrink-0 mt-1"
                  style={{ width: 18, height: 18, accentColor: THEME.accent }} />
              ) : (
                <div className="flex items-center justify-center rounded-lg flex-shrink-0 mono font-bold text-sm"
                  style={{ width: 28, height: 28, background: `${lc}20`, color: lc }}>
                  {String.fromCharCode(65 + i)}
                </div>
              )}
              <span className="text-white text-sm sm:text-base leading-relaxed flex-1">{opt}</span>
              {showFeedback && isCorr && <Check size={20} style={{ color: THEME.good }} className="flex-shrink-0 mt-0.5" />}
              {showFeedback && isSel && !isCorr && <X size={20} style={{ color: THEME.bad }} className="flex-shrink-0 mt-0.5" />}
            </button>
          );
        })}
      </div>

      {/* 要件 Q-4: 未選択では確認ボタンを出さない */}
      {!showFeedback && selectedAnswers.length > 0 && (
        <button onClick={onConfirm} className="w-full mb-4 py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2"
          style={{ background: THEME.gradient, color: THEME.bgSolid, boxShadow: THEME.glow }}>
          確認する <ChevronRight size={18} strokeWidth={3} />
        </button>
      )}

      {showFeedback && (
        <div className="slide-in">
          <div className="rounded-2xl p-5 mb-4"
            style={{ background: correct ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1.5px solid ${correct ? THEME.good : THEME.bad}40` }}>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {correct ? <Check size={20} style={{ color: THEME.good }} /> : <AlertCircle size={20} style={{ color: THEME.bad }} />}
              <span className="font-bold text-sm" style={{ color: correct ? THEME.good : THEME.bad }}>{correct ? '正解！' : '不正解'}</span>
              {!correct && (
                <span className="text-xs text-slate-400 ml-1">正解:
                  {question.correctAnswers.map((idx, i) => (
                    <span key={i}>{i > 0 ? '、' : ' '}
                      <span className="mono font-bold" style={{ color: THEME.good }}>{String.fromCharCode(65 + idx)}</span>
                    </span>
                  ))}
                </span>
              )}
            </div>
            <div className="flex gap-2.5">
              <Lightbulb size={16} style={{ color: THEME.accentLight }} className="flex-shrink-0 mt-0.5" />
              <p className="text-slate-200 text-sm leading-relaxed">{question.explanation}</p>
            </div>
          </div>
          <button onClick={onNext} className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2"
            style={{ background: THEME.gradient, color: THEME.bgSolid, boxShadow: THEME.glow }}>
            {index + 1 >= total ? '結果を見る' : '次の問題へ'} <ChevronRight size={18} strokeWidth={3} />
          </button>
        </div>
      )}
    </div>
  );
}

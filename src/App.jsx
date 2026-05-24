import { useState, useMemo, useEffect } from 'react';
import { Cloud, Shield, Server, DollarSign, ChevronRight, RotateCcw, Trophy, Check, X, BarChart3, Target, BookOpen, AlertCircle, TrendingUp, Award, Lightbulb, Sparkles, History, ArrowLeft, Trash2, Calendar, Activity, Flame, Settings, Save, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

// 分離したデータとAPIをインポート
import { QUESTIONS, DOMAINS, DIFFICULTIES, QUESTION_COUNTS } from './questions';
import { fetchHistoryFromGist, saveHistoryToGist } from './gistApi';

DOMAINS.all.icon = BarChart3;
DOMAINS.concepts.icon = Cloud;
DOMAINS.security.icon = Shield;
DOMAINS.technology.icon = Server;
DOMAINS.billing.icon = DollarSign;

// 配列をシャッフルするための関数
function shuffle(a) { 
  const b = [...a]; 
  for(let i = b.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  } 
  return b; 
}

export default function App() {
  const [screen, setScreen] = useState('setup');
  const [config, setConfig] = useState({ difficulty: 'all', domain: 'all', count: 10 });
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [syncConfig, setSyncConfig] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // --- 初期化処理 (localStorage + Gist) ---
  useEffect(() => {
    (async () => {
      const savedConfig = localStorage.getItem('aws_clf_sync_config');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setSyncConfig(parsedConfig);
        setScreen('setup'); // PATがあればSetup画面へ
        
        // 非同期でGistから最新データを取得してマージ
        try {
          const remoteHistory = await fetchHistoryFromGist(parsedConfig.pat, parsedConfig.gistId);
          setHistory(remoteHistory);
          localStorage.setItem('aws_clf_history', JSON.stringify(remoteHistory));
        } catch (e) {
          console.error('Gistからの取得に失敗、ローカルデータを使用します', e);
          const localHistory = localStorage.getItem('aws_clf_history');
          if (localHistory) setHistory(JSON.parse(localHistory));
        }
      } else {
        setScreen('auth'); // PATがなければ初期設定画面へ
      }
    })();
  }, []);

  const availableCount = useMemo(() =>
    QUESTIONS.filter(q => (config.domain==='all'||q.domain===config.domain)&&(config.difficulty==='all'||q.difficulty===config.difficulty)).length
  , [config.domain, config.difficulty]);

  // --- 追加: 初期設定画面からの保存処理 ---
  const handleAuthSave = async (pat, gistId) => {
    setIsSyncing(true);
    setAuthError('');
    try {
      const data = await fetchHistoryFromGist(pat, gistId);
      const newConfig = { pat, gistId };
      
      localStorage.setItem('aws_clf_sync_config', JSON.stringify(newConfig));
      setSyncConfig(newConfig);
      setHistory(data);
      localStorage.setItem('aws_clf_history', JSON.stringify(data));
      setScreen('setup');
    } catch (e) {
      setAuthError('Gistの読み込みに失敗しました。PATとGist IDを確認してください。');
    } finally {
      setIsSyncing(false);
    }
  };

  const startQuiz = () => {
    const filtered = QUESTIONS.filter(q => (config.domain==='all'||q.domain===config.domain)&&(config.difficulty==='all'||q.difficulty===config.difficulty));
    const picked = shuffle(filtered).slice(0, Math.min(config.count, filtered.length));
    const shuffled = picked.map(q => {
      const correctTexts = q.correctAnswers.map(i => q.options[i]);
      const newOpts = shuffle([...q.options]);
      const newCorrectAnswers = correctTexts.map(t => newOpts.indexOf(t)).sort((a,b)=>a-b);
      return { ...q, options: newOpts, correctAnswers: newCorrectAnswers };
    });
    setQuestions(shuffled); setCurrentIdx(0); setSelectedAnswers([]); setShowFeedback(false); setResults([]); setScreen('quiz');
  };

  const arraysEqual = (a, b) => {
    const sorted_a = [...a].sort((x,y)=>x-y);
    const sorted_b = [...b].sort((x,y)=>x-y);
    return sorted_a.length === sorted_b.length && sorted_a.every((v, i) => v === sorted_b[i]);
  };

  const handleSelect = (idx) => {
    if (showFeedback) return;
    const q = questions[currentIdx];
    if (q.multiSelect) {
      setSelectedAnswers(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
    } else {
      setSelectedAnswers([idx]);
      setShowFeedback(true);
      const isCorrect = arraysEqual([idx], q.correctAnswers);
      setResults(r => [...r, { questionId: q.id, selectedAnswers: [idx], correct: isCorrect, domain: q.domain, difficulty: q.difficulty }]);
    }
  };

  const handleConfirm = () => {
    const q = questions[currentIdx];
    if (!q.multiSelect) return;
    const isCorrect = arraysEqual(selectedAnswers, q.correctAnswers);
    setShowFeedback(true);
    setResults(r => [...r, { questionId: q.id, selectedAnswers: [...selectedAnswers], correct: isCorrect, domain: q.domain, difficulty: q.difficulty }]);
  };

  const handleNext = () => {
    if (currentIdx+1>=questions.length) { saveSession(); setScreen('result'); }
    else { setCurrentIdx(currentIdx+1); setSelectedAnswers([]); setShowFeedback(false); }
  };

  const restart = () => { setScreen('setup'); setResults([]); setQuestions([]); };

  // --- 修正: 学習履歴の保存処理 (localStorage + Gist) ---
  const saveSession = async () => {
    const total = results.length; const correct = results.filter(r=>r.correct).length;
    const byDomain={}; const byDiff={};
    results.forEach(r => {
      if(!byDomain[r.domain]) byDomain[r.domain]={correct:0,total:0}; byDomain[r.domain].total++; if(r.correct) byDomain[r.domain].correct++;
      if(!byDiff[r.difficulty]) byDiff[r.difficulty]={correct:0,total:0}; byDiff[r.difficulty].total++; if(r.correct) byDiff[r.difficulty].correct++;
    });
    const session = { id: Date.now(), date: new Date().toISOString(), config:{...config}, total, correct, accuracy: total>0?Math.round((correct/total)*100):0, byDomain, byDifficulty: byDiff };
    
    const nh = [...history, session]; 
    setHistory(nh);
    
    // 1. ローカルに保存
    localStorage.setItem('aws_clf_history', JSON.stringify(nh));

    // 2. Gistへ非同期保存
    if (syncConfig) {
      try {
        await saveHistoryToGist(syncConfig.pat, syncConfig.gistId, nh);
      } catch (e) {
        console.error('Gistへの保存に失敗しました', e);
      }
    }
  };

  // --- 修正: 履歴のクリア処理 (localStorage + Gist) ---
  const clearHistory = async () => {
    setHistory([]); 
    localStorage.removeItem('aws_clf_history');
    if (syncConfig) {
      try {
        await saveHistoryToGist(syncConfig.pat, syncConfig.gistId, []);
      } catch(e) {
        console.error('Gistのクリアに失敗', e);
      }
    }
  };

  return (
    <div className="min-h-screen w-full" style={{background:'linear-gradient(180deg,#0a0e1a 0%,#131829 100%)',fontFamily:'"Zen Kaku Gothic New","Noto Sans JP",sans-serif'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;700;900&family=JetBrains+Mono:wght@600;700&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        .fade-up{animation:fadeUp .4s ease-out forwards}.scale-in{animation:scaleIn .3s ease-out forwards}.slide-in{animation:slideIn .3s ease-out forwards}
        .mono{font-family:'JetBrains Mono',monospace}
      `}</style>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        {screen === 'auth' && (
          <AuthScreen 
            onSave={handleAuthSave} 
            isSyncing={isSyncing} 
            error={authError} 
          />
        )}
        {screen === 'setup' && <SetupScreen config={config} setConfig={setConfig} availableCount={availableCount} startQuiz={startQuiz} historyCount={history.length} onShowHistory={() => setScreen('history')} />}
        {screen === 'quiz' && <QuizScreen question={questions[currentIdx]} index={currentIdx} total={questions.length} selectedAnswers={selectedAnswers} showFeedback={showFeedback} onSelect={handleSelect} onConfirm={handleConfirm} onNext={handleNext} />}
        {screen === 'result' && <ResultScreen results={results} questions={questions} onRestart={restart} />}
        {screen === 'history' && <HistoryScreen history={history} onBack={() => setScreen('setup')} onClear={clearHistory} />}
      </div>
    </div>
  );
}

function SetupScreen({config,setConfig,availableCount,startQuiz,historyCount,onShowHistory}) {
  return (
    <div className="fade-up">
      <div className="flex justify-end mb-3">
        <button onClick={onShowHistory} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'#cbd5e1'}}>
          <History size={13}/><span>学習記録{historyCount>0?` (${historyCount})`:''}</span><ChevronRight size={12}/>
        </button>
      </div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5" style={{background:'rgba(255,153,0,0.12)',border:'1px solid rgba(255,153,0,0.3)'}}>
          <Sparkles size={14} style={{color:'#FF9900'}}/><span className="text-xs font-medium tracking-wider" style={{color:'#FFB84D'}}>CLF-C02 対応 · 180問</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight">AWS Cloud Practitioner<br/><span style={{background:'linear-gradient(90deg,#FF9900,#FFB84D)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>練習問題集</span></h1>
        <p className="text-slate-400 mt-3 text-sm">難易度・領域・問題数を選んで始めよう</p>
      </div>
      <div className="mb-6"><div className="flex items-center gap-2 mb-3"><Target size={16} style={{color:'#FF9900'}}/><h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">難易度</h2></div>
        <div className="grid grid-cols-2 gap-2.5">{Object.entries(DIFFICULTIES).map(([k,v])=>(
          <button key={k} onClick={()=>setConfig({...config,difficulty:k})} className="rounded-xl p-3 text-white" style={{background:config.difficulty===k?'rgba(255,153,0,0.12)':'rgba(255,255,255,0.03)',border:`1.5px solid ${config.difficulty===k?'#FF9900':'rgba(255,255,255,0.08)'}`}}>
            <div className="flex flex-col items-start"><div className="flex items-center gap-2 mb-0.5"><span className="font-bold text-sm">{v.label}</span><span className="text-xs" style={{color:'#FF9900'}}>{v.stars}</span></div><span className="text-xs text-slate-400">{v.desc}</span></div>
          </button>
        ))}</div>
      </div>
      <div className="mb-6"><div className="flex items-center gap-2 mb-3"><BookOpen size={16} style={{color:'#60a5fa'}}/><h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">領域</h2></div>
        <div className="space-y-2">{Object.entries(DOMAINS).map(([k,v])=>{const Icon=v.icon;const a=config.domain===k;return(
          <button key={k} onClick={()=>setConfig({...config,domain:k})} className="w-full text-left rounded-xl p-3.5 flex items-center gap-3" style={{background:a?v.bg:'rgba(255,255,255,0.03)',border:`1.5px solid ${a?v.color:'rgba(255,255,255,0.08)'}`}}>
            <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{width:40,height:40,background:v.bg}}><Icon size={20} style={{color:v.color}}/></div>
            <div className="flex-1 min-w-0"><div className="font-bold text-white text-sm">{v.label}</div></div>{a&&<Check size={18} style={{color:v.color}}/>}
          </button>
        );})}</div>
      </div>
      <div className="mb-6"><div className="flex items-center gap-2 mb-3"><BarChart3 size={16} style={{color:'#a78bfa'}}/><h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">問題数</h2></div>
        <div className="grid grid-cols-4 gap-2">{QUESTION_COUNTS.map(n=>(
          <button key={n} onClick={()=>setConfig({...config,count:n})} className="rounded-xl p-3 text-white" style={{background:config.count===n?'rgba(255,153,0,0.12)':'rgba(255,255,255,0.03)',border:`1.5px solid ${config.count===n?'#FF9900':'rgba(255,255,255,0.08)'}`}}>
            <div className="text-center"><div className="mono font-bold text-lg">{n}</div><div className="text-xs text-slate-400">問</div></div>
          </button>
        ))}</div>
        <div className="mt-3 text-xs text-slate-500 text-center">利用可能: <span className="mono" style={{color:'#FFB84D'}}>{availableCount}</span> 問 / 出題: <span className="mono" style={{color:'#FFB84D'}}>{Math.min(config.count,availableCount)}</span> 問</div>
      </div>
      <button onClick={startQuiz} disabled={availableCount===0} className="w-full mt-2 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2" style={{background:availableCount===0?'rgba(255,255,255,0.05)':'linear-gradient(90deg,#FF9900,#FFB84D)',color:availableCount===0?'#64748b':'#0a0e1a',boxShadow:availableCount===0?'none':'0 8px 24px rgba(255,153,0,0.3)'}}>スタート <ChevronRight size={18} strokeWidth={3}/></button>
    </div>
  );
}

function QuizScreen({question,index,total,selectedAnswers,showFeedback,onSelect,onConfirm,onNext}) {
  const domain=DOMAINS[question.domain];const diff=DIFFICULTIES[question.difficulty];const DomainIcon=domain.icon;
  const progress=((index+1)/total)*100;
  const arraysEqual = (a, b) => {
    const sorted_a = [...a].sort((x,y)=>x-y);
    const sorted_b = [...b].sort((x,y)=>x-y);
    return sorted_a.length === sorted_b.length && sorted_a.every((v, i) => v === sorted_b[i]);
  };
  const isCorrect = arraysEqual(selectedAnswers, question.correctAnswers);
  return (
    <div key={question.id} className="scale-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{background:domain.bg,border:`1px solid ${domain.color}40`}}>
          <DomainIcon size={14} style={{color:domain.color}}/><span className="text-xs font-medium" style={{color:domain.color}}>{domain.short}</span><span className="text-xs" style={{color:domain.color,opacity:.6}}>·</span><span className="text-xs font-bold" style={{color:'#FF9900'}}>{diff.stars}</span>
          {question.multiSelect&&<span className="text-xs ml-2 px-2 py-0.5 rounded-full" style={{background:`${domain.color}20`,color:domain.color}}>複数選択</span>}
        </div>
        <div className="mono text-sm font-bold text-white"><span style={{color:'#FF9900'}}>{index+1}</span><span className="text-slate-500"> / {total}</span></div>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-6"><div className="h-full transition-all duration-500" style={{width:`${progress}%`,background:'linear-gradient(90deg,#FF9900,#FFB84D)'}}/></div>
      <div className="rounded-2xl p-5 sm:p-6 mb-4" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}><p className="text-white text-base sm:text-lg font-medium leading-relaxed">{question.question}</p></div>
      <div className="space-y-2.5 mb-4">{question.options.map((opt,i)=>{
        const isSel=selectedAnswers.includes(i);const isCorr=question.correctAnswers.includes(i);
        let bg='rgba(255,255,255,0.03)',border='rgba(255,255,255,0.08)',lc='#FF9900';
        if(showFeedback){if(isCorr){bg='rgba(16,185,129,0.12)';border='#10b981';lc='#10b981';}else if(isSel){bg='rgba(239,68,68,0.12)';border='#ef4444';lc='#ef4444';}}else if(isSel){bg='rgba(255,153,0,0.1)';border='#FF9900';}
        return(
          <button key={i} onClick={()=>onSelect(i)} disabled={showFeedback} className="w-full text-left rounded-xl p-4 flex items-start gap-3" style={{background:bg,border:`1.5px solid ${border}`,cursor:showFeedback?'default':'pointer'}}>
            {question.multiSelect?(
              <input type="checkbox" checked={isSel} disabled={true} className="flex-shrink-0 mt-1" style={{width:18,height:18,accentColor:'#FF9900'}}/>
            ):(
              <div className="flex items-center justify-center rounded-lg flex-shrink-0 mono font-bold text-sm" style={{width:28,height:28,background:`${lc}20`,color:lc}}>{String.fromCharCode(65+i)}</div>
            )}
            <span className="text-white text-sm sm:text-base leading-relaxed flex-1">{opt}</span>
            {showFeedback&&isCorr&&<Check size={20} style={{color:'#10b981'}} className="flex-shrink-0 mt-0.5"/>}
            {showFeedback&&isSel&&!isCorr&&<X size={20} style={{color:'#ef4444'}} className="flex-shrink-0 mt-0.5"/>}
          </button>
        );
      })}</div>
      {!showFeedback&&question.multiSelect&&selectedAnswers.length>0&&(
        <button onClick={onConfirm} className="w-full mb-4 py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2" style={{background:'linear-gradient(90deg,#FF9900,#FFB84D)',color:'#0a0e1a',boxShadow:'0 8px 24px rgba(255,153,0,0.3)'}}>確認する <ChevronRight size={18} strokeWidth={3}/></button>
      )}
      {showFeedback&&(
        <div className="slide-in">
          <div className="rounded-2xl p-5 mb-4" style={{background:isCorrect?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)',border:`1.5px solid ${isCorrect?'#10b981':'#ef4444'}40`}}>
            <div className="flex items-center gap-2 mb-3">
              {isCorrect?<Check size={20} style={{color:'#10b981'}}/>:<AlertCircle size={20} style={{color:'#ef4444'}}/>}
              <span className="font-bold text-sm" style={{color:isCorrect?'#10b981':'#ef4444'}}>{isCorrect?'正解！':'不正解'}</span>
              {!isCorrect&&(
                <span className="text-xs text-slate-400 ml-2">正解:
                  {question.correctAnswers.map((idx,i)=>(
                    <span key={i}>{i>0?'、':''}<span className="mono font-bold" style={{color:'#10b981'}}>{String.fromCharCode(65+idx)}</span></span>
                  ))}
                </span>
              )}
            </div>
            <div className="flex gap-2.5"><Lightbulb size={16} style={{color:'#FFB84D'}} className="flex-shrink-0 mt-0.5"/><p className="text-slate-200 text-sm leading-relaxed">{question.explanation}</p></div>
          </div>
          <button onClick={onNext} className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2" style={{background:'linear-gradient(90deg,#FF9900,#FFB84D)',color:'#0a0e1a',boxShadow:'0 8px 24px rgba(255,153,0,0.3)'}}>{index+1>=total?'結果を見る':'次の問題へ'} <ChevronRight size={18} strokeWidth={3}/></button>
        </div>
      )}
    </div>
  );
}

function ResultScreen({results,questions,onRestart}) {
  const correct=results.filter(r=>r.correct).length;const total=results.length;const acc=Math.round((correct/total)*100);
  const byDomain=useMemo(()=>{const m={};results.forEach(r=>{if(!m[r.domain])m[r.domain]={correct:0,total:0};m[r.domain].total++;if(r.correct)m[r.domain].correct++;});return Object.entries(m).map(([k,v])=>({key:k,...DOMAINS[k],...v,accuracy:Math.round((v.correct/v.total)*100)})).sort((a,b)=>a.accuracy-b.accuracy);},[results]);
  const byDiff=useMemo(()=>{const m={};results.forEach(r=>{if(!m[r.difficulty])m[r.difficulty]={correct:0,total:0};m[r.difficulty].total++;if(r.correct)m[r.difficulty].correct++;});return['beginner','intermediate','advanced'].filter(k=>m[k]).map(k=>({key:k,...DIFFICULTIES[k],...m[k],accuracy:Math.round((m[k].correct/m[k].total)*100)}));},[results]);
  const weakest=byDomain.find(d=>d.accuracy<100)||null;
  let verdict,vColor,VIcon;
  if(acc>=85){verdict='合格圏内！';vColor='#10b981';VIcon=Trophy;}else if(acc>=70){verdict='もう一歩';vColor='#FF9900';VIcon=TrendingUp;}else{verdict='要復習';vColor='#ef4444';VIcon=Target;}
  const wrong=results.map((r,i)=>({...r,q:questions[i]})).filter(r=>!r.correct);
  return (
    <div className="fade-up">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5" style={{background:`${vColor}20`,border:`1px solid ${vColor}50`}}><VIcon size={14} style={{color:vColor}}/><span className="text-xs font-bold tracking-wider" style={{color:vColor}}>{verdict}</span></div>
        <div className="mono font-black text-7xl sm:text-8xl leading-none mb-2" style={{background:`linear-gradient(180deg,${vColor},${vColor}80)`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{acc}<span className="text-4xl">%</span></div>
        <p className="text-slate-300 text-sm"><span className="mono font-bold text-white">{correct}</span> / <span className="mono">{total}</span> 問正解</p>
        <p className="text-xs text-slate-500 mt-1">CLF-C02 合格ライン: 700/1000 (約70%)</p>
      </div>
      <div className="rounded-2xl p-5 mb-4" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
        <div className="flex items-center gap-2 mb-4"><BookOpen size={16} style={{color:'#60a5fa'}}/><h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">領域別の正答率</h2></div>
        <div className="space-y-3">{byDomain.map(d=>{const Icon=d.icon;return(<div key={d.key}><div className="flex items-center justify-between mb-1.5"><div className="flex items-center gap-2 min-w-0"><Icon size={14} style={{color:d.color}}/><span className="text-sm font-medium text-white truncate">{d.short}</span></div><div className="mono text-sm flex items-center gap-2 flex-shrink-0"><span className="text-slate-400">{d.correct}/{d.total}</span><span className="font-bold" style={{color:d.color}}>{d.accuracy}%</span></div></div><div className="h-2 bg-white/5 rounded-full overflow-hidden"><div className="h-full" style={{width:`${d.accuracy}%`,background:d.color}}/></div></div>);})}</div>
      </div>
      {byDiff.length>1&&<div className="rounded-2xl p-5 mb-4" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
        <div className="flex items-center gap-2 mb-4"><Target size={16} style={{color:'#FF9900'}}/><h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">難易度別の正答率</h2></div>
        <div className="grid grid-cols-3 gap-2">{byDiff.map(d=>(<div key={d.key} className="rounded-xl p-3 text-center" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}><div className="text-xs text-slate-400 mb-1">{d.label}</div><div className="text-xs mb-1.5" style={{color:'#FF9900'}}>{d.stars}</div><div className="mono font-bold text-lg text-white">{d.accuracy}<span className="text-xs text-slate-400">%</span></div><div className="mono text-[10px] text-slate-500">{d.correct}/{d.total}</div></div>))}</div>
      </div>}
      {weakest&&<div className="rounded-2xl p-5 mb-4" style={{background:`${weakest.color}10`,border:`1.5px solid ${weakest.color}40`}}>
        <div className="flex items-center gap-2 mb-3"><AlertCircle size={16} style={{color:weakest.color}}/><h2 className="text-sm font-bold tracking-wider uppercase" style={{color:weakest.color}}>あなたの弱点</h2></div>
        <p className="text-white font-bold mb-1">{weakest.label}</p><p className="text-slate-300 text-sm leading-relaxed">この領域の正答率は <span className="mono font-bold" style={{color:weakest.color}}>{weakest.accuracy}%</span> でした。次回はこの領域を集中的に復習することをおすすめします。</p>
      </div>}
      {acc===100&&<div className="rounded-2xl p-5 mb-4" style={{background:'rgba(16,185,129,0.08)',border:'1.5px solid rgba(16,185,129,0.4)'}}><div className="flex items-center gap-2 mb-2"><Award size={16} style={{color:'#10b981'}}/><h2 className="text-sm font-bold tracking-wider uppercase" style={{color:'#10b981'}}>完璧です！</h2></div><p className="text-slate-300 text-sm">全問正解です。より高い難易度や別の領域にもチャレンジしてみましょう。</p></div>}
      {wrong.length>0&&<details className="rounded-2xl p-5 mb-4 group" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
        <summary className="flex items-center justify-between cursor-pointer list-none"><div className="flex items-center gap-2"><X size={16} style={{color:'#ef4444'}}/><h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">間違えた問題 ({wrong.length})</h2></div><ChevronRight size={16} className="text-slate-500 transition-transform group-open:rotate-90"/></summary>
        <div className="mt-4 space-y-4">{wrong.map((r,i)=>(<div key={i} className="pt-3" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <p className="text-sm text-white font-medium mb-2 leading-relaxed">{r.q.question}</p>
          <div className="text-xs space-y-1 mb-2">
            <div>
              <span className="text-slate-500">あなたの回答: </span>
              <span style={{color:'#ef4444'}}>
                {r.selectedAnswers.map((idx,j)=>(
                  <span key={j}>{j>0?'、':''}{String.fromCharCode(65+idx)}. {r.q.options[idx]}</span>
                ))}
              </span>
            </div>
            <div>
              <span className="text-slate-500">正解: </span>
              <span style={{color:'#10b981'}}>
                {r.q.correctAnswers.map((idx,j)=>(
                  <span key={j}>{j>0?'、':''}{String.fromCharCode(65+idx)}. {r.q.options[idx]}</span>
                ))}
              </span>
            </div>
          </div>
          <div className="rounded-lg p-2.5 flex gap-2" style={{background:'rgba(255,184,77,0.08)'}}><Lightbulb size={14} style={{color:'#FFB84D'}} className="flex-shrink-0 mt-0.5"/><p className="text-xs text-slate-300 leading-relaxed">{r.q.explanation}</p></div>
        </div>))}</div>
      </details>}
      <button onClick={onRestart} className="w-full mt-4 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2" style={{background:'linear-gradient(90deg,#FF9900,#FFB84D)',color:'#0a0e1a',boxShadow:'0 8px 24px rgba(255,153,0,0.3)'}}><RotateCcw size={18} strokeWidth={3}/> もう一度挑戦</button>
    </div>
  );
}

function HistoryScreen({history,onBack,onClear}) {
  const [confirmClear,setConfirmClear]=useState(false);
  if(history.length===0) return(
    <div className="fade-up">
      <button onClick={onBack} className="flex items-center gap-1.5 mb-6 text-slate-400 text-sm"><ArrowLeft size={16}/> 戻る</button>
      <div className="text-center py-16"><div className="inline-flex items-center justify-center rounded-2xl mb-5" style={{width:72,height:72,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}><History size={32} style={{color:'#475569'}}/></div><h2 className="text-xl font-bold text-white mb-2">まだ学習記録がありません</h2><p className="text-slate-400 text-sm leading-relaxed px-4">クイズを完了すると、ここに成長の軌跡が<br/>記録されていきます。</p></div>
    </div>
  );
  const stats=useMemo(()=>{
    const tQ=history.length,tq=history.reduce((s,h)=>s+h.total,0),tc=history.reduce((s,h)=>s+h.correct,0);
    let streak=0;for(let i=history.length-1;i>=0;i--){if(history[i].accuracy>=70)streak++;else break;}
    return{totalQuizzes:tQ,totalQuestions:tq,totalCorrect:tc,overallAccuracy:tq>0?Math.round((tc/tq)*100):0,bestScore:Math.max(...history.map(h=>h.accuracy)),streak};
  },[history]);
  const chartData=useMemo(()=>history.slice(-15).map((h,i)=>({idx:i+1,accuracy:h.accuracy,date:new Date(h.date).toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'})})),[history]);
  const domainStats=useMemo(()=>{
    const m={};history.forEach(h=>{Object.entries(h.byDomain).forEach(([d,s])=>{if(!m[d])m[d]={c:0,t:0,ss:[]};m[d].c+=s.correct;m[d].t+=s.total;m[d].ss.push(Math.round((s.correct/s.total)*100));});});
    return Object.entries(m).map(([d,s])=>({key:d,...DOMAINS[d],accuracy:Math.round((s.c/s.t)*100),growth:s.ss[s.ss.length-1]-s.ss[0],total:s.t})).sort((a,b)=>b.total-a.total);
  },[history]);
  const firstAcc=history[0].accuracy,latestAcc=history[history.length-1].accuracy,growth=latestAcc-firstAcc;
  const recent=[...history].reverse().slice(0,10);
  return(
    <div className="fade-up">
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-300 text-sm"><ArrowLeft size={16}/> 戻る</button>
        {!confirmClear?<button onClick={()=>setConfirmClear(true)} className="flex items-center gap-1 text-slate-500 text-xs"><Trash2 size={12}/> クリア</button>
        :<div className="flex items-center gap-2 text-xs"><span className="text-slate-400">本当に削除？</span><button onClick={()=>{onClear();setConfirmClear(false);}} className="px-2.5 py-1 rounded-md font-bold" style={{background:'rgba(239,68,68,0.2)',color:'#f87171',border:'1px solid #ef444460'}}>削除</button><button onClick={()=>setConfirmClear(false)} className="px-2.5 py-1 rounded-md text-slate-400">キャンセル</button></div>}
      </div>
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3" style={{background:'rgba(96,165,250,0.12)',border:'1px solid rgba(96,165,250,0.3)'}}><Activity size={12} style={{color:'#60a5fa'}}/><span className="text-xs font-medium" style={{color:'#93c5fd'}}>学習レポート</span></div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">あなたの学習の歩み</h1>
      </div>
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {[{icon:Activity,label:'受験回数',value:stats.totalQuizzes,unit:'回',color:'#FF9900'},{icon:BookOpen,label:'累計解答',value:stats.totalQuestions,unit:'問',color:'#60a5fa'},{icon:Target,label:'平均正答率',value:stats.overallAccuracy,unit:'%',color:'#a78bfa'},{icon:Trophy,label:'ベストスコア',value:stats.bestScore,unit:'%',color:'#34d399'}].map(({icon:Icon,label,value,unit,color})=>(
          <div key={label} className="rounded-xl p-3.5" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
            <div className="flex items-center gap-1.5 mb-1.5"><Icon size={12} style={{color}}/><span className="text-[11px] text-slate-400 font-medium">{label}</span></div>
            <div className="flex items-baseline gap-1"><span className="mono font-black text-2xl text-white leading-none">{value}</span><span className="text-xs text-slate-400">{unit}</span></div>
          </div>
        ))}
      </div>
      {stats.streak>=2&&<div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{background:'linear-gradient(90deg,rgba(255,153,0,0.12),rgba(248,113,113,0.06))',border:'1px solid rgba(255,153,0,0.3)'}}>
        <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{width:44,height:44,background:'rgba(255,153,0,0.15)'}}><Flame size={22} style={{color:'#FF9900'}}/></div>
        <div><div className="text-xs text-slate-400">合格ライン (70%) 連続達成</div><div className="font-black text-white text-lg leading-tight"><span className="mono" style={{color:'#FF9900'}}>{stats.streak}</span><span className="text-sm text-slate-300 ml-1">回連続 🔥</span></div></div>
      </div>}
      {history.length>=2&&<div className="rounded-2xl p-5 mb-4" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><TrendingUp size={16} style={{color:'#FF9900'}}/><h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">正答率の推移</h2></div>
          <div className="flex items-center gap-1.5 text-xs mono"><span className="text-slate-500">{firstAcc}%</span><ChevronRight size={11} className="text-slate-600"/><span className="font-bold" style={{color:growth>0?'#34d399':growth<0?'#f87171':'#FF9900'}}>{latestAcc}%</span>{growth!==0&&<span className="ml-1 font-bold" style={{color:growth>0?'#34d399':'#f87171'}}>{growth>0?'+':''}{growth}</span>}</div>
        </div>
        <div style={{width:'100%',height:180}}>
          <ResponsiveContainer><LineChart data={chartData} margin={{top:10,right:10,bottom:0,left:-22}}>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)"/>
            <XAxis dataKey="idx" tick={{fill:'#64748b',fontSize:11}} axisLine={{stroke:'rgba(255,255,255,0.1)'}} tickLine={false}/>
            <YAxis domain={[0,100]} tick={{fill:'#64748b',fontSize:11}} axisLine={{stroke:'rgba(255,255,255,0.1)'}} tickLine={false}/>
            <Tooltip contentStyle={{background:'#0a0e1a',border:'1px solid rgba(255,255,255,0.15)',borderRadius:8,fontSize:12}} labelStyle={{color:'#cbd5e1'}} formatter={(v)=>[`${v}%`,'正答率']} labelFormatter={(l)=>`${l}回目`}/>
            <Line type="monotone" dataKey="accuracy" stroke="#FF9900" strokeWidth={2.5} dot={{fill:'#FF9900',r:3,strokeWidth:0}} activeDot={{fill:'#FFB84D',r:5,strokeWidth:2,stroke:'#0a0e1a'}}/>
          </LineChart></ResponsiveContainer>
        </div>
        <div className="mt-2 text-[10px] text-slate-500 text-center">直近 {chartData.length} 回</div>
      </div>}
      <div className="rounded-2xl p-5 mb-4" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
        <div className="flex items-center gap-2 mb-4"><BookOpen size={16} style={{color:'#60a5fa'}}/><h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">領域別の累計成績</h2></div>
        <div className="space-y-3">{domainStats.map(d=>{const Icon=d.icon;return(<div key={d.key}><div className="flex items-center justify-between mb-1.5"><div className="flex items-center gap-2 min-w-0"><Icon size={14} style={{color:d.color}}/><span className="text-sm font-medium text-white truncate">{d.short}</span>{d.growth!==0&&<span className="mono text-[10px] font-bold flex-shrink-0" style={{color:d.growth>0?'#34d399':'#f87171'}}>{d.growth>0?'↑':'↓'}{Math.abs(d.growth)}</span>}</div><div className="mono text-xs flex items-center gap-2 flex-shrink-0"><span className="text-slate-500">{d.total}問</span><span className="font-bold text-sm" style={{color:d.color}}>{d.accuracy}%</span></div></div><div className="h-2 bg-white/5 rounded-full overflow-hidden"><div className="h-full" style={{width:`${d.accuracy}%`,background:d.color}}/></div></div>);})}</div>
      </div>
      <div className="rounded-2xl p-5 mb-4" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
        <div className="flex items-center gap-2 mb-4"><Calendar size={16} style={{color:'#a78bfa'}}/><h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase">最近の受験</h2></div>
        <div className="space-y-2">{recent.map(h=>{
          const d=new Date(h.date);const dom=DOMAINS[h.config.domain]||DOMAINS.all;const diff=DIFFICULTIES[h.config.difficulty]||DIFFICULTIES.all;
          const ac=h.accuracy>=85?'#34d399':h.accuracy>=70?'#FF9900':'#f87171';
          return(<div key={h.id} className="flex items-center gap-3 p-3 rounded-xl" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.05)'}}>
            <div className="flex-shrink-0 mono text-center" style={{minWidth:44}}><div className="text-xs text-slate-400 font-bold">{d.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'})}</div><div className="text-[10px] text-slate-600">{d.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}</div></div>
            <div className="flex-1 min-w-0"><div className="text-xs text-slate-300 truncate">{dom.short} <span className="text-slate-600">·</span> <span style={{color:'#FF9900'}}>{diff.stars}</span></div><div className="text-[11px] text-slate-500 mono">{h.correct}/{h.total} 正解</div></div>
            <div className="mono font-bold text-lg flex-shrink-0" style={{color:ac}}>{h.accuracy}<span className="text-xs">%</span></div>
          </div>);
        })}</div>
      </div>
      <button onClick={onBack} className="w-full mt-2 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2" style={{background:'linear-gradient(90deg,#FF9900,#FFB84D)',color:'#0a0e1a',boxShadow:'0 8px 24px rgba(255,153,0,0.3)'}}>新しいクイズを始める <ChevronRight size={18} strokeWidth={3}/></button>
    </div>
  );
}

function AuthScreen({ onSave, isSyncing, error }) {
  const [pat, setPat] = useState('');
  const [gistId, setGistId] = useState('');

  return (
    <div className="fade-up max-w-md mx-auto mt-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center rounded-2xl mb-5" style={{ width: 64, height: 64, background: 'rgba(255,153,0,0.12)', border: '1px solid rgba(255,153,0,0.3)' }}>
          <Settings size={28} style={{ color: '#FF9900' }} />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">初期設定</h1>
        <p className="text-sm text-slate-400 leading-relaxed">学習記録を同期するために、GitHubの<br />PATとGist IDを設定してください。</p>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">Personal Access Token (PAT)</label>
          <input type="password" value={pat} onChange={(e) => setPat(e.target.value)} placeholder="ghp_..." className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF9900]/50 transition-colors mono" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">Gist ID</label>
          <input type="text" value={gistId} onChange={(e) => setGistId(e.target.value)} placeholder="32桁の英数字" className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF9900]/50 transition-colors mono" />
        </div>
        {error && (
          <div className="flex gap-2 items-start p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-red-400 leading-relaxed">{error}</span>
          </div>
        )}
      </div>

      <button onClick={() => onSave(pat, gistId)} disabled={isSyncing || !pat || !gistId} className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50" style={{ background: 'linear-gradient(90deg,#FF9900,#FFB84D)', color: '#0a0e1a' }}>
        {isSyncing ? <><Loader2 size={18} className="animate-spin" /> 接続テスト中...</> : <><Save size={18} /> 保存して開始</>}
      </button>
    </div>
  );
}
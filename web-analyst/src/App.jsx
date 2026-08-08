import { useState, useMemo } from 'react';
import {
  BarChart3, Gauge, Target, SlidersHorizontal, Megaphone, FileText,
  Briefcase, Route, Wrench, MousePointerClick, Users, ClipboardList, Presentation,
} from 'lucide-react';

import { EXAM, THEME } from './config';
import { QUESTIONS } from './data/questions';
import { DOMAINS, MODULES, MODULE_KEYS } from './data/taxonomy';
import { matchesFilter, selectQuestions, selectFromIds } from './domain/selection';
import { makeResult } from './domain/grading';
import { unseenCount } from './domain/progress';
import { useLearningState } from './hooks/useLearningState';

import AuthScreen from './screens/AuthScreen';
import SetupScreen from './screens/SetupScreen';
import QuizScreen from './screens/QuizScreen';
import ResultScreen from './screens/ResultScreen';
import HistoryScreen from './screens/HistoryScreen';

// アイコンはここで後付けする（data/ を React 非依存に保つため）
DOMAINS.all.icon = BarChart3;
DOMAINS.metrics.icon = Gauge;
DOMAINS.strategy.icon = Target;
DOMAINS.design.icon = SlidersHorizontal;
DOMAINS.acquisition.icon = Megaphone;
DOMAINS.improvement.icon = FileText;

MODULES.all.icon = BarChart3;
MODULES.ch1.icon = Gauge;
MODULES.ch2.icon = Briefcase;
MODULES.ch3.icon = Route;
MODULES.ch4.icon = Wrench;
MODULES.ch5.icon = MousePointerClick;
MODULES.ch6.icon = Users;
MODULES.ch7.icon = ClipboardList;
MODULES.ch8.icon = Presentation;

const INITIAL_CONFIG = { difficulty: 'all', domain: 'all', module: 'all', filterType: 'domain', count: 10 };

export default function App() {
  const learning = useLearningState();
  const [screen, setScreen] = useState('setup');
  const [config, setConfig] = useState(INITIAL_CONFIG);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [results, setResults] = useState([]);

  const filtered = useMemo(() => QUESTIONS.filter(q => matchesFilter(q, config)), [config]);
  const availableCount = filtered.length;
  const unseen = useMemo(() => unseenCount(filtered, learning.lastSeen), [filtered, learning.lastSeen]);

  const beginWith = picked => {
    setQuestions(picked);
    setCurrentIdx(0);
    setSelectedAnswers([]);
    setShowFeedback(false);
    setResults([]);
    setScreen('quiz');
  };

  const startQuiz = () =>
    beginWith(selectQuestions(QUESTIONS, config, learning.wrongIds, learning.lastSeen));
  const startWrongOnly = () => beginWith(selectFromIds(QUESTIONS, learning.wrongIds));
  const startFrequentWrong = () => beginWith(selectFromIds(QUESTIONS, new Set(learning.frequentWrong)));

  // 要件 Q-3: 選択しただけでは判定しない。確認ボタンで初めて答え合わせを行う
  const handleSelect = idx => {
    if (showFeedback) return; // 要件 Q-6: 確定後は変更不可
    const q = questions[currentIdx];
    if (q.multiSelect) {
      setSelectedAnswers(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
    } else {
      setSelectedAnswers([idx]);
    }
  };

  const handleConfirm = () => {
    if (selectedAnswers.length === 0) return;
    setShowFeedback(true);
    setResults(r => [...r, makeResult(questions[currentIdx], selectedAnswers)]);
  };

  const handleNext = () => {
    if (currentIdx + 1 >= questions.length) {
      learning.commitSession(results, config);
      setScreen('result');
    } else {
      setCurrentIdx(currentIdx + 1);
      setSelectedAnswers([]);
      setShowFeedback(false);
    }
  };

  const restart = () => {
    setScreen('setup');
    setResults([]);
    setQuestions([]);
  };

  return (
    <div className="min-h-screen w-full" style={{ background: THEME.bg, fontFamily: '"Zen Kaku Gothic New","Noto Sans JP",sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;700;900&family=JetBrains+Mono:wght@600;700&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        .fade-up{animation:fadeUp .4s ease-out forwards}
        .scale-in{animation:scaleIn .3s ease-out forwards}
        .slide-in{animation:slideIn .3s ease-out forwards}
        .mono{font-family:'JetBrains Mono',monospace}
      `}</style>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        {learning.needsAuth && (
          <AuthScreen
            onSave={learning.saveAuth}
            onSkip={learning.skipAuth}
            isSyncing={learning.isSyncing}
            error={learning.authError}
          />
        )}
        {!learning.needsAuth && screen === 'setup' && (
          <SetupScreen
            config={config}
            setConfig={setConfig}
            moduleKeys={MODULE_KEYS}
            totalCount={QUESTIONS.length}
            availableCount={availableCount}
            unseenCount={unseen}
            startQuiz={startQuiz}
            historyCount={learning.history.length}
            onShowHistory={() => setScreen('history')}
            wrongCount={learning.wrongIds.size}
            onStartWrongOnly={startWrongOnly}
            frequentWrongCount={learning.frequentWrong.length}
            onStartFrequentWrong={startFrequentWrong}
            syncEnabled={!!learning.syncConfig}
            onOpenAuth={learning.openAuth}
          />
        )}
        {!learning.needsAuth && screen === 'quiz' && (
          <QuizScreen
            question={questions[currentIdx]}
            index={currentIdx}
            total={questions.length}
            selectedAnswers={selectedAnswers}
            showFeedback={showFeedback}
            onSelect={handleSelect}
            onConfirm={handleConfirm}
            onNext={handleNext}
          />
        )}
        {!learning.needsAuth && screen === 'result' && (
          <ResultScreen
            results={results}
            questions={questions}
            onRestart={restart}
            promotedCount={learning.promotedCount}
          />
        )}
        {!learning.needsAuth && screen === 'history' && (
          <HistoryScreen
            history={learning.history}
            onBack={() => setScreen('setup')}
            onClear={learning.clearAll}
          />
        )}
        {!learning.needsAuth && screen === 'setup' && (
          <p className="text-center text-[10px] text-slate-600 mt-8 leading-relaxed">
            {EXAM.syllabus}・全 {QUESTIONS.length} 問<br />
            本アプリは非公式の学習ツールです。問題は公開されている出題範囲に基づくオリジナルです。
          </p>
        )}
      </div>
    </div>
  );
}

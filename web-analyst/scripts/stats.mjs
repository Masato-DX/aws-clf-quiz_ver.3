// 問題データの配分を表示する（作業用）。実行: node scripts/stats.mjs
import { QUESTIONS } from '../src/data/questions.js';
import { CHAPTER_KEYS, DOMAIN_KEYS, DIFFICULTY_KEYS, MODULES } from '../src/data/taxonomy.js';

const count = (pred) => QUESTIONS.filter(pred).length;
console.log(`合計: ${QUESTIONS.length} 問\n`);
console.log('章 \\ 難易度   初級  中級  上級   計   目標');
const TARGET = { ch1: 48, ch2: 36, ch3: 36, ch4: 40, ch5: 44, ch6: 40, ch7: 40, ch8: 36 };
CHAPTER_KEYS.forEach(ch => {
  const row = DIFFICULTY_KEYS.map(d => String(count(q => q.module === ch && q.difficulty === d)).padStart(4));
  const total = count(q => q.module === ch);
  console.log(`${MODULES[ch].short.padEnd(10)} ${row.join('  ')}  ${String(total).padStart(4)}  ${String(TARGET[ch]).padStart(4)}`);
});
console.log('\n領域:', DOMAIN_KEYS.map(d => `${d}=${count(q => q.domain === d)}`).join(' '));
console.log('難易度:', DIFFICULTY_KEYS.map(d => `${d}=${count(q => q.difficulty === d)}`).join(' '));
console.log('複数選択:', count(q => q.multiSelect), '問');

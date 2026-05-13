import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// 從 markdown 直接解析 <Quiz :questions='[...]' /> 的 answer 索引
// 然後 Playwright 對應點擊、submit、確認得分 = 總題數
// 這個 probe 同時驗證：
//   (a) 19 個 Quiz 區塊全部 render
//   (b) ch02 / ch03 / ch05 補題後達到 ≥ 6 題
//   (c) 全部 answer 索引在 0~options.length-1 範圍內、無 off-by-one

const ROOT = process.cwd();
const TARGETS = [
  // (chapter route, expected min question count, label)
  ['/part-0/intro', 3, 'p0-intro'],
  ['/part-0/metrics', 5, 'p0-metrics'],
  ['/part-0/sql', 4, 'p0-sql'],
  ['/part-0/os', 3, 'p0-os'],
  ['/part-0/network', 3, 'p0-net'],
  ['/part-0/data-structures', 3, 'p0-ds'],
  ['/part-0/concurrency', 3, 'p0-concur'],
  ['/part-1/ch01-reliable', 5, 'ch01'],
  ['/part-1/ch02-data-models', 6, 'ch02'],    // 補題後
  ['/part-1/ch03-storage', 6, 'ch03'],         // 補題後
  ['/part-1/ch04-encoding', 3, 'ch04'],
  ['/part-2/ch05-replication', 6, 'ch05'],     // 補題後
  ['/part-2/ch06-partitioning', 3, 'ch06'],
  ['/part-2/ch07-transactions', 4, 'ch07'],
  ['/part-2/ch08-trouble', 4, 'ch08'],
  ['/part-2/ch09-consistency', 5, 'ch09'],
  ['/part-3/ch10-batch', 3, 'ch10'],
  ['/part-3/ch11-streams', 4, 'ch11'],
  ['/part-3/ch12-future', 3, 'ch12'],
];

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

let totalQs = 0, passedAll = 0, failed = [];

for (const [route, minQ, label] of TARGETS) {
  try {
    await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle', timeout: 30000 });

    // 抓本頁的 questions JSON（從 <Quiz> render 出來的 DOM 讀）
    const quiz = await page.evaluate(() => {
      const quizEl = document.querySelector('.ddia-quiz');
      if (!quizEl) return null;
      const qBlocks = quizEl.querySelectorAll('.ddia-quiz-question');
      const labels = quizEl.querySelectorAll('.ddia-quiz-option');
      // 每題的選項按順序、group by parent
      const optionsByQ = [];
      labels.forEach(label => {
        const radio = label.querySelector('input[type=radio]');
        const name = radio?.getAttribute('name') || '';
        const value = parseInt(radio?.getAttribute('value') || '0', 10);
        const text = label.textContent.trim();
        let arr = optionsByQ.find(x => x.name === name);
        if (!arr) {
          arr = { name, options: [] };
          optionsByQ.push(arr);
        }
        arr.options.push({ value, text });
      });
      return { qCount: qBlocks.length, qGroups: optionsByQ };
    });

    if (!quiz || quiz.qCount === 0) {
      failed.push({ label, route, reason: 'no quiz rendered' });
      continue;
    }
    if (quiz.qCount < minQ) {
      failed.push({ label, route, reason: `題數 ${quiz.qCount} < 期望 ${minQ}` });
      continue;
    }

    // 從原始 markdown 抓 answer 陣列
    const mdPath = resolve(ROOT, 'docs/' + route.replace(/^\//, '') + '.md');
    const md = await readFile(mdPath, 'utf-8');
    const quizMatch = md.match(/<Quiz[\s\S]*?:questions='\[([\s\S]*?)\]'\s*\/>/);
    if (!quizMatch) {
      failed.push({ label, route, reason: 'markdown 抓不到 Quiz block' });
      continue;
    }
    const blockText = quizMatch[1];
    // 抓所有 `answer: <n>,` 出現順序就是題目順序
    // 主章用 answer: 1,  Part 0 用 "answer": 1, —— 兩種都要匹配
    const answers = [...blockText.matchAll(/"?answer"?:\s*(\d+)/g)].map(m => parseInt(m[1], 10));
    if (answers.length !== quiz.qCount) {
      failed.push({ label, route, reason: `markdown answer 數 ${answers.length} ≠ DOM 題數 ${quiz.qCount}` });
      continue;
    }

    // 點擊正確答案
    for (let qIdx = 0; qIdx < quiz.qCount; qIdx++) {
      const group = quiz.qGroups[qIdx];
      const correctValue = answers[qIdx];
      // 範圍檢查
      if (correctValue < 0 || correctValue >= group.options.length) {
        failed.push({ label, route, reason: `Q${qIdx+1} answer=${correctValue} 超出 options.length=${group.options.length}` });
        throw new Error('out-of-range answer');
      }
      // 點擊
      await page.locator(`input[name="${group.name}"][value="${correctValue}"]`).click();
    }

    // submit
    await page.locator('.ddia-quiz button.ddia-btn.primary').click();
    await page.waitForTimeout(500);

    const scoreText = await page.locator('.ddia-quiz-score').textContent();
    const [score, total] = scoreText.split('/').map(s => parseInt(s.trim(), 10));
    if (score !== total) {
      failed.push({ label, route, reason: `分數 ${score}/${total} 不滿分 — 表示 answer 索引可能對不上正解` });
      continue;
    }
    totalQs += total;
    passedAll++;
    console.log(`✓ ${label.padEnd(12)} ${quiz.qCount} 題  ${score}/${total}  ${route}`);
  } catch (e) {
    failed.push({ label, route, reason: e.message });
  }
}

console.log(`\n📊 全 ${TARGETS.length} 章：${passedAll} 通過、${failed.length} 失敗、總計 ${totalQs} 題`);
if (failed.length > 0) {
  console.log('\n❌ 失敗清單：');
  for (const f of failed) {
    console.log(`  · ${f.label} (${f.route}): ${f.reason}`);
  }
  process.exitCode = 1;
}

await browser.close();

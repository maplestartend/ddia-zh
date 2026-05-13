import { chromium } from 'playwright';

// 模擬已有進度的 user 狀態：標已讀 2 章 + Quiz 答對通關 1 章、不通關 1 章
// 驗證 Dashboard 4 stat cards 渲染 + ChapterCard 三態徽章 + chapter loop pass pill
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

// 預先 seed localStorage 透過 init script — Playwright 對 dev server 子頁面也會帶
await ctx.addInitScript(() => {
  localStorage.setItem('ddia-progress', JSON.stringify({
    'ch01': { done: true, at: '2026/5/13' },
    'ch02': { done: true, at: '2026/5/13' }
  }));
  // ch01: 首次 4/5 = 80% → 通關
  // ch02: 首次 2/5 = 40% → 不通關
  // ch03: 首次 3/5 = 60% → 剛通關（邊界測試）
  const now = Date.now();
  localStorage.setItem('ddia-quiz-index-v2', JSON.stringify([
    { chapterId: 'ch01', score: 4, total: 5, ts: now, firstAttemptScore: 4, attemptCount: 1 },
    { chapterId: 'ch02', score: 5, total: 5, ts: now, firstAttemptScore: 2, attemptCount: 2 },
    { chapterId: 'ch03', score: 3, total: 5, ts: now, firstAttemptScore: 3, attemptCount: 1 }
  ]));
  // 也 seed 每章詳細 entry（Progress.vue 的 chapter loop 用 loadQuiz 讀這個）
  const mkEntry = (score, fas, ac) => JSON.stringify({
    answers: [0,1,2,3,0].slice(0, 5),
    submitted: true,
    score, total: 5, timestamp: now,
    firstAttemptScore: fas, firstAttemptAt: now, attemptCount: ac
  });
  localStorage.setItem('ddia-quiz-ch01', mkEntry(4, 4, 1));
  localStorage.setItem('ddia-quiz-ch02', mkEntry(5, 2, 2));
  localStorage.setItem('ddia-quiz-ch03', mkEntry(3, 3, 1));
});

// progress.md 才會展示 4 stat cards（home 通常進 isFresh / resume / complete state）
await page.goto('http://localhost:5173/progress', { waitUntil: 'networkidle' });

const dashboard = await page.$('.ddia-dashboard');
if (!dashboard) {
  console.log('❌ Dashboard 不可見（可能仍是 fresh 狀態）');
} else {
  const cards = await page.$$eval('.ddia-stat-card', els => els.map(el => ({
    label: el.querySelector('.ddia-stat-label')?.textContent?.replace(/\s+/g, ' ').trim() || '',
    value: el.querySelector('.ddia-stat-value')?.textContent?.replace(/\s+/g, ' ').trim() || '',
    hasProgressBar: !!el.querySelector('.ddia-progress-bar')
  })));
  console.log('📊 Dashboard stat cards:');
  for (const c of cards) {
    console.log(`  · ${c.label}`);
    console.log(`    value=${c.value}${c.hasProgressBar ? '  [progress bar]' : ''}`);
  }
}

const cardStates = await page.$$eval('.ddia-chapter-card', els => els.slice(0, 4).map(el => ({
  num: el.querySelector('.ddia-chapter-card-num')?.textContent?.trim() || '',
  classes: Array.from(el.classList).filter(c => c !== 'ddia-chapter-card').join(','),
  statusLabel: el.querySelectorAll('.ddia-chapter-card-status-tag')[0]?.textContent?.replace(/\s+/g, ' ').trim() || ''
})));
console.log('\n🎴 ChapterCard 狀態（前 4 章）:');
for (const c of cardStates) {
  console.log(`  · ${c.num} | classes=[${c.classes}] | status=${c.statusLabel}`);
}

// 也 screenshot Dashboard 區段
await page.locator('.ddia-dashboard').first().screenshot({ path: 'scripts/screenshots/probe-dashboard.png' });
await page.locator('.ddia-chapter-grid').first().screenshot({ path: 'scripts/screenshots/probe-cards.png' });
console.log('\n💾 已存：probe-dashboard.png / probe-cards.png');

// 進 ch01 看 chapter loop pass pill
await page.goto('http://localhost:5173/part-1/ch01-reliable', { waitUntil: 'networkidle' });
const pillState = await page.$eval('.ddia-pass-pill', el => ({
  text: el.textContent?.replace(/\s+/g, ' ').trim(),
  passed: el.classList.contains('is-passed')
})).catch(() => null);
console.log('\n🏅 Ch01 pass pill:', pillState);
await page.locator('.ddia-chapter-loop').screenshot({ path: 'scripts/screenshots/probe-ch01-loop.png' });
console.log('💾 已存：probe-ch01-loop.png');

await browser.close();

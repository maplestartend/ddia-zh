import { chromium } from 'playwright';

// 探測 `.custom-block.tip` 的實際 computed background-color
// 確認 background-color: transparent 修正是否生效
const URLS = [
  'http://localhost:5173/part-0/metrics',
  'http://localhost:5173/part-1/ch01-reliable',
  'http://localhost:5173/part-2/ch05-replication',
];

const browser = await chromium.launch();
for (const url of URLS) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const tips = await page.$$eval('.custom-block.tip', els =>
    els.slice(0, 3).map(el => {
      const cs = getComputedStyle(el);
      return {
        title: el.querySelector('.custom-block-title')?.textContent?.trim() || '(no title)',
        bg: cs.backgroundColor,
        borderLeft: cs.borderLeftColor,
      };
    })
  );
  console.log(`\n${url}`);
  if (tips.length === 0) console.log('  (no :::tip on this page)');
  for (const t of tips) console.log(`  · ${t.title} | bg=${t.bg} | border-left=${t.borderLeft}`);
  await page.close();
}
await browser.close();

// 補拍 GlossaryTerm tooltip — class 名是 .ddia-g
import { chromium } from "playwright";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "visual-interaction");
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// 試 metrics.md (最多 G 元件示範)
await page.goto("http://localhost:5173/part-0/metrics", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const el = document.querySelector('.ddia-g');
  if (el) el.scrollIntoView({ block: 'center' });
});
await page.waitForTimeout(400);
await page.screenshot({ path: join(OUT, "14b-glossary-default-light.png"), fullPage: false });
console.log("14b ok");

const g = await page.$('.ddia-g');
if (!g) { console.log("no .ddia-g — try other selector"); }
else {
  await g.hover();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, "15b-glossary-tooltip-light.png"), fullPage: false });
  console.log("15b ok");
}

// 順便補拍：mobile viewport search modal
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const mp = await mctx.newPage();
await mp.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await mp.waitForTimeout(1500);
await mp.screenshot({ path: join(OUT, "29-mobile-home-light.png"), fullPage: false });
// 開 search
const sb = await mp.$('button#local-search, .VPNavBarSearch button, button[aria-label*="搜尋" i], button[aria-label*="search" i], .VPNavBarHamburger');
if (sb) {
  await sb.click();
  await mp.waitForTimeout(500);
  await mp.screenshot({ path: join(OUT, "30-mobile-nav-open.png"), fullPage: false });
}

// 順便拍：Quiz reveal CLS 對照（捲到固定位置、reveal 前後對照）
const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p3 = await ctx3.newPage();
await p3.goto("http://localhost:5173/part-1/ch01-reliable", { waitUntil: "networkidle" });
await p3.waitForTimeout(1500);
// 清掉並重 setup
await p3.evaluate(() => {
  Object.keys(localStorage).forEach(k => { if (k.includes('quiz')) localStorage.removeItem(k); });
});
await p3.reload({ waitUntil: "networkidle" });
await p3.waitForTimeout(1500);
// 捲到 quiz 第一題上方某位置（fixed scroll）
await p3.evaluate(() => {
  const q = document.querySelector('.ddia-quiz-question');
  if (q) {
    const rect = q.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + rect.top - 100, behavior: 'instant' });
  }
});
await p3.waitForTimeout(300);
await p3.screenshot({ path: join(OUT, "31-quiz-before-reveal-fixedScroll.png"), fullPage: false });
// 全選 + 交卷
await p3.evaluate(() => {
  document.querySelectorAll('.ddia-quiz-question').forEach((qEl, qIdx) => {
    const radios = document.querySelectorAll(`input[type="radio"][name="q-ch01-${qIdx}"]`);
    if (radios && radios.length > 0) radios[0].click();
  });
});
await p3.waitForTimeout(200);
const sb2 = await p3.$('.ddia-quiz-actions button.primary');
if (sb2) {
  await sb2.click();
  await p3.waitForTimeout(400);
  // 不要重 scroll！看 reveal 後同一個 scroll 位置變什麼
  await p3.screenshot({ path: join(OUT, "32-quiz-after-reveal-sameScroll.png"), fullPage: false });
}

await browser.close();
console.log("done");

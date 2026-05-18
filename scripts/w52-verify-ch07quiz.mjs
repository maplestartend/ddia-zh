// 精準定位 Ch7 Quiz 區段
import { chromium } from "playwright";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots");

const browser = await chromium.launch();
try {
  for (const theme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    const page = await ctx.newPage();
    await page.goto("http://localhost:5173/part-2/ch07-transactions", { waitUntil: "networkidle" });
    await page.waitForSelector('.vp-doc', { timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.evaluate((t) => {
      document.documentElement.classList.toggle("dark", t === "dark");
      document.documentElement.setAttribute("data-theme", t);
      localStorage.setItem("vitepress-theme-appearance", t);
    }, theme);
    await page.waitForTimeout(220);

    // 用 anchor 跳到 quiz / 章末練習
    await page.evaluate(() => {
      // 找 quiz 元件或 #章末練習 anchor
      const targets = [
        document.querySelector('#章末練習'),
        document.querySelector('[id*="quiz"]'),
        document.querySelector('.ddia-quiz, .ddia-quiz-editorial'),
        document.querySelector('.ddia-interview-block, .ddia-chapter-note, .ddia-progress'),
      ].filter(Boolean);
      if (targets.length) {
        const t = targets[0];
        const r = t.getBoundingClientRect();
        window.scrollTo({ top: window.scrollY + r.top - 120, behavior: 'instant' });
        return t.tagName + ' / ' + (t.id || t.className);
      }
      window.scrollTo({ top: document.body.scrollHeight * 0.85, behavior: 'instant' });
      return 'fallback 85%';
    }).then(info => console.log(`[${theme}] scrolled to:`, info));
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, `ch07quiz-${theme}.png`), fullPage: false });
    console.log(`[ok] ch07quiz-${theme}.png`);

    await ctx.close();
  }
} finally {
  await browser.close();
}

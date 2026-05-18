// 補拍 Ch7 章末區段（Quiz / Interview / Note / NextChapterBridge）— viewport 拍法解析高
import { chromium } from "playwright";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots");
const DEV_URL = "http://localhost:5173";

const setTheme = async (page, theme) => {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("vitepress-theme-appearance", t);
  }, theme);
  await page.waitForTimeout(220);
};

const browser = await chromium.launch();
try {
  for (const theme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
    const page = await ctx.newPage();
    await page.goto(`${DEV_URL}/part-2/ch07-transactions`, { waitUntil: "networkidle" });
    await page.waitForSelector('.vp-doc', { timeout: 8000 });
    await page.waitForTimeout(1500);
    await setTheme(page, theme);
    await page.waitForTimeout(220);

    // Quiz 區段（章末練習）
    const quizScroll = await page.evaluate(() => {
      const q = document.querySelector('.ddia-quiz-editorial, .ddia-quiz, [class*="quiz"]');
      if (q) {
        const r = q.getBoundingClientRect();
        const target = window.scrollY + r.top - 80;
        window.scrollTo({ top: target, behavior: 'instant' });
        return target;
      }
      const total = document.body.scrollHeight;
      window.scrollTo({ top: total * 0.78, behavior: 'instant' });
      return total * 0.78;
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, `ch07tail-quiz-${theme}.png`), fullPage: false });
    console.log(`[ok] ch07tail-quiz-${theme}.png  (scrolled to ${Math.round(quizScroll)})`);

    // NextChapterBridge / Progress 區段
    await page.evaluate(() => {
      const b = document.querySelector('.ddia-next-chapter-bridge, .ddia-chapter-note, footer, .vp-doc-footer');
      if (b) {
        const r = b.getBoundingClientRect();
        window.scrollTo({ top: window.scrollY + r.top - 200, behavior: 'instant' });
      } else {
        window.scrollTo({ top: document.body.scrollHeight - 900, behavior: 'instant' });
      }
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, `ch07tail-bridge-${theme}.png`), fullPage: false });
    console.log(`[ok] ch07tail-bridge-${theme}.png`);

    await ctx.close();
  }
} finally {
  await browser.close();
}

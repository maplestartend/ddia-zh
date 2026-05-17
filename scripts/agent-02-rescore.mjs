// Agent #02 大二資工生「重評」拍圖 — W46 後對比痛點解決情況
// 5 頁：home / paths / 30-day-beginner / part-0 / glossary、各 light + 重點區段 crop
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-02-rescore");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`status ${res.status}`);
} catch (err) {
  console.error(`[fatal] dev server 沒在 ${DEV_URL} 回應（${err.message}）`);
  process.exit(2);
}

const setTheme = async (page, theme) => {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("vitepress-theme-appearance", t);
  }, theme);
  await page.waitForTimeout(200);
};

// 重評 5 頁、各拍 full + 痛點區段 crop
const PAGES = [
  { name: "01-home",       url: "/",                       focus: ".ddia-persona-router" },
  { name: "02-paths",      url: "/paths/",                 focus: ".ddia-path-decision" },
  { name: "03-30day-beg",  url: "/paths/30-day-beginner",  focus: ".custom-block.info, .custom-block.tip" },
  { name: "04-part0",      url: "/part-0/",                focus: ".ddia-self-assess" },
  { name: "05-glossary",   url: "/glossary/",              focus: "main" },
];

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => console.error("[pageerror]", err.message));

  for (const p of PAGES) {
    await page.goto(`${DEV_URL}${p.url}`, { waitUntil: "networkidle" });
    try {
      await page.waitForSelector('.vp-doc, .ddia-hero', { timeout: 8000 });
    } catch {
      console.warn(`[warn] ${p.name} 無 .vp-doc`);
    }
    await page.waitForTimeout(1200);

    await setTheme(page, "light");
    await page.screenshot({ path: `${OUT}/${p.name}-full.png`, fullPage: true });

    // 對焦痛點區段（若找得到）
    if (p.focus) {
      try {
        const loc = page.locator(p.focus).first();
        if (await loc.count() > 0) {
          await loc.scrollIntoViewIfNeeded();
          await page.waitForTimeout(300);
          await loc.screenshot({ path: `${OUT}/${p.name}-focus.png` });
        }
      } catch (e) {
        console.warn(`[warn] ${p.name} focus 抓不到: ${e.message}`);
      }
    }
    console.log(`[ok] ${p.name}`);
  }
} finally {
  await browser.close();
}

console.log(`\n[done] 輸出於 ${OUT}`);

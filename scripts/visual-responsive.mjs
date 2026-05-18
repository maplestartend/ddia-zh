// Responsive QA — 5 viewport × 7 page 跨螢幕一致性檢查
// 用法： node scripts/visual-responsive.mjs
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "visual-responsive");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error(`status ${res.status}`);
} catch (err) {
  console.error(`dev server 沒在 ${DEV_URL} 回應（${err.message}）`);
  process.exit(2);
}

// 5 viewport：1440 desktop / 1024 small-desktop / 768 tablet / 480 mobile / 380 super-narrow
const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 768 },
  { name: "768",  width: 768,  height: 1024 },
  { name: "480",  width: 480,  height: 800 },
  { name: "380",  width: 380,  height: 720 },
];

// 7 個有代表性的頁面
const PAGES = [
  { name: "home",        url: "/",                              scroll: 0   }, // hero + persona router + chapter cards
  { name: "home-deep",   url: "/",                              scroll: 800 }, // 滾到 chapter cards 區
  { name: "ch05",        url: "/part-2/ch05-replication",       scroll: 0   }, // ChapterOpener + ChapterMeta
  { name: "ch05-deep",   url: "/part-2/ch05-replication",       scroll: 1600 }, // 三家落差表（W47 加）
  { name: "ch09",        url: "/part-2/ch09-consistency",       scroll: 0   },
  { name: "ch09-deep",   url: "/part-2/ch09-consistency",       scroll: 2400 }, // SequenceFlow
  { name: "glossary",    url: "/glossary/",                     scroll: 0   }, // A-Z + starter 8
  { name: "path30",      url: "/paths/30-day-beginner",         scroll: 600 }, // Week 顆粒
  { name: "paths-idx",   url: "/paths/",                        scroll: 0   }, // 決策卡 + 6 路徑卡
  { name: "progress",    url: "/progress",                      scroll: 0   }, // Dashboard stat 卡
];

const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    page.on("pageerror", (err) => console.error(`[pageerror][${vp.name}]`, err.message));

    for (const p of PAGES) {
      const url = `${DEV_URL}${p.url}`;
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      } catch (e) {
        console.warn(`[warn] ${vp.name}/${p.name} goto failed: ${e.message}`);
        continue;
      }
      try {
        await page.waitForSelector('.vp-doc, .ddia-hero, [class^="ddia-"]', { timeout: 8000 });
      } catch {
        console.warn(`[warn] ${vp.name}/${p.name} no .vp-doc within 8s`);
      }
      await page.waitForTimeout(1000);
      if (p.scroll > 0) {
        await page.evaluate((px) => window.scrollTo({ top: px, behavior: 'instant' }), p.scroll);
        await page.waitForTimeout(300);
      }
      // light 模式單張，避免 viewport × page × theme = 100 張過多
      await page.evaluate(() => {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("vitepress-theme-appearance", "light");
      });
      await page.waitForTimeout(200);

      const out = `${OUT}/v${vp.name}-${p.name}.png`;
      // mobile / tablet 全頁；desktop 大頁只拍 viewport（拉開很長）
      const fullPage = vp.width <= 768 || p.scroll === 0;
      await page.screenshot({ path: out, fullPage: p.scroll === 0 });
      console.log(`[ok] ${vp.name} / ${p.name}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}

console.log(`\n截圖輸出於 scripts/screenshots/visual-responsive/`);

// Agent #04 重評：3 年 React 升 senior + fullstack 跨後端視角
// W46 修了：floating chip 右上→右下 + transform 反向、首頁 persona router、
// /paths/ 兩問題卡、Part 0 拆兩階。
//
// 這支腳本拍重點 5 頁（首頁、Ch7 scroll600、Ch5 scroll600、Part 0、30 天計畫），
// 並在 Ch7/Ch5 兩頁特別捲動 600px 驗證右下 floating chip 與 VitePress aside TOC
// 的位置關係（aside 是右上角的章內目錄，chip 改右下後應與 TOC 物理分離）
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-04-rescore");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error(`status ${res.status}`);
} catch (err) {
  console.error(`x dev server not responding at ${DEV_URL}: ${err.message}`);
  process.exit(2);
}

const setTheme = async (page, theme) => {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("vitepress-theme-appearance", t);
  }, theme);
  await page.waitForTimeout(300);
};

// 重評核心 5 頁：home / ch07 scroll / ch05 scroll / part 0 / 30-day plan
const PAGES = [
  { name: "01-home",            url: "/",                              scroll: 0 },
  { name: "02-ch07-scroll600",  url: "/part-2/ch07-transactions",      scroll: 600 },
  { name: "03-ch05-scroll600",  url: "/part-2/ch05-replication",       scroll: 600 },
  { name: "04-part0-index",     url: "/part-0/",                       scroll: 0 },
  { name: "05-30day-summer",    url: "/paths/30-day-summer-plan",      scroll: 0 },
];

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => console.error("[pageerror]", err.message));

  for (const p of PAGES) {
    const url = `${DEV_URL}${p.url}`;
    await page.goto(url, { waitUntil: "networkidle" });
    try {
      await page.waitForSelector('.vp-doc, .ddia-hero, [class^="ddia-"]', { timeout: 8000 });
    } catch {
      console.warn(`[warn] ${p.name} no main selector within 8s`);
    }
    // Fraunces 字型 swap + hydrate settle
    await page.waitForTimeout(1500);

    // Light
    await setTheme(page, "light");
    if (p.scroll > 0) {
      await page.evaluate((px) => window.scrollTo({ top: px, behavior: "instant" }), p.scroll);
      await page.waitForTimeout(500);
      // 捲動頁面只拍 viewport（fullPage 看不到 fixed positioned chip）
      await page.screenshot({ path: `${OUT}/${p.name}-light.png`, fullPage: false });
    } else {
      await page.screenshot({ path: `${OUT}/${p.name}-light.png`, fullPage: true });
    }

    // Dark
    await setTheme(page, "dark");
    if (p.scroll > 0) {
      await page.evaluate((px) => window.scrollTo({ top: px, behavior: "instant" }), p.scroll);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/${p.name}-dark.png`, fullPage: false });
    } else {
      await page.screenshot({ path: `${OUT}/${p.name}-dark.png`, fullPage: true });
    }

    console.log(`[ok] ${p.name}${p.scroll ? ` (scroll ${p.scroll}px)` : ""}`);
  }
} finally {
  await browser.close();
}

console.log(`\n截圖輸出於 scripts/screenshots/agent-04-rescore/`);

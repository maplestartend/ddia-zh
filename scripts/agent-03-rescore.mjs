// Agent #03 重評（Bootcamp 轉職 5 個月、找 junior 工作）
// 任務：拍首頁 persona router / /paths/ 兩問題決策卡 / interview-cheatsheet / glossary starter 8
// 對應 W46 已修改項：persona chip 含「轉職 / 面試」、兩問題 Q2 直導 cheatsheet、glossary starter 8

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-03-rescore");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error(`status ${res.status}`);
} catch (err) {
  console.error(`dev server 沒在 ${DEV_URL} 回應（${err.message}）`);
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

const PAGES = [
  { name: "01-home-top",             url: "/",                            scroll: 0 },
  { name: "02-home-persona",         url: "/",                            scroll: 380 },
  { name: "03-paths-decision",       url: "/paths/",                      scroll: 0 },
  { name: "04-paths-cards",          url: "/paths/",                      scroll: 700 },
  { name: "05-interview-top",        url: "/paths/interview-cheatsheet",  scroll: 0 },
  { name: "06-interview-mid",        url: "/paths/interview-cheatsheet",  scroll: 1500 },
  { name: "07-glossary-top",         url: "/glossary/",                   scroll: 0 },
  { name: "08-glossary-starter8",    url: "/glossary/",                   scroll: 460 },
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
      console.warn(`[warn] ${p.name} no .vp-doc found within 8s`);
    }
    await page.waitForTimeout(800);
    if (p.scroll > 0) {
      await page.evaluate((y) => window.scrollTo(0, y), p.scroll);
      await page.waitForTimeout(400);
    }

    await setTheme(page, "light");
    await page.screenshot({ path: `${OUT}/${p.name}-light.png`, fullPage: false });
    console.log(`[ok] ${p.name}`);
  }
} finally {
  await browser.close();
}

console.log(`\n截圖輸出於 ${OUT}`);

// Agent #09 重評（W46）：42 歲 PM、不寫 code
// 驗證 W46 三件改動：
//  (a) 首頁 persona router 是否含「PM / 非技術」chip 且明顯
//  (b) /paths/ 兩問題決策卡 Q2 是否點到 PM 入口
//  (c) Ch5 TLDR 第 5 條 quorum 系列是否真的白話化（每個術語加白話括註）
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-09-rescore");
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
  await page.waitForTimeout(250);
};

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => console.error("[pageerror]", err.message));

  // -------- 1. 首頁 persona router 區（PM chip 必須明顯） --------
  await page.goto(`${DEV_URL}/`, { waitUntil: "networkidle" });
  await page.waitForSelector(".ddia-hero, .vp-doc", { timeout: 8000 });
  await page.waitForTimeout(1200);
  await setTheme(page, "light");
  // 捲到 persona router 露出位置（hero 之後 ~ 600px）
  await page.evaluate(() => {
    const el = document.querySelector(".ddia-persona-router");
    if (el) el.scrollIntoView({ block: "center", behavior: "instant" });
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/01-home-persona-router-light.png`, fullPage: false });
  console.log("[ok] 01-home-persona-router");

  // -------- 2. /paths/ 兩問題決策卡（Q2 → PM 路徑） --------
  await page.goto(`${DEV_URL}/paths/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await setTheme(page, "light");
  // viewport 首屏 — 兩問題決策卡通常在頁面最上方
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/02-paths-decision-top-light.png`, fullPage: false });
  // fullPage 看完整六張路徑卡
  await page.screenshot({ path: `${OUT}/03-paths-full-light.png`, fullPage: true });
  console.log("[ok] 02-paths");

  // -------- 3. Ch5 TLDR（看新白話化是否真的好讀） --------
  await page.goto(`${DEV_URL}/part-2/ch05-replication`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await setTheme(page, "light");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(200);
  // viewport（首屏 — PM 第一眼看到的 TLDR）
  await page.screenshot({ path: `${OUT}/04-ch05-tldr-viewport-light.png`, fullPage: false });
  // 再對焦 TLDR 區（捲到 TLDR 中央、放大第 5 條）
  await page.evaluate(() => {
    const el = document.querySelector(".ddia-tldr, [class*='tldr']");
    if (el) el.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/05-ch05-tldr-focus-light.png`, fullPage: false });
  console.log("[ok] 03-ch05-tldr");

  // -------- 4. dark 模式抽一張（暗色 readability 驗收） --------
  await setTheme(page, "dark");
  await page.screenshot({ path: `${OUT}/06-ch05-tldr-focus-dark.png`, fullPage: false });
  console.log("[ok] 04-ch05-dark");

} finally {
  await browser.close();
}

console.log(`\n截圖輸出於 scripts/screenshots/agent-09-rescore/`);

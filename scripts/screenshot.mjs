// 拍快照驗證視覺改動。對應 stock 專案 web/scripts/screenshot.mjs 的設計。
// 用法：
//   node scripts/screenshot.mjs [tag]              預設 tag = "snapshot"
//   node scripts/screenshot.mjs [tag] --scroll=600 進頁後捲到 600px 再拍（驗 sticky 元件）
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const tag = (args.find(a => !a.startsWith("--")) || "snapshot");
const scrollArg = args.find(a => a.startsWith("--scroll="));
const scrollPx = scrollArg ? Number(scrollArg.split("=")[1]) : 0;
// 用腳本所在位置推導 ROOT、不靠 process.cwd()——讓從任何目錄跑都能工作
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots");
await mkdir(OUT, { recursive: true });

// 預檢 dev server 是否在線；不在線就早早給友善訊息退出，避免 Playwright 亂噴 stack trace
const DEV_URL = "http://localhost:5173";
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error(`status ${res.status}`);
} catch (err) {
  console.error(`✗ dev server 沒在 ${DEV_URL} 回應（${err.message}）`);
  console.error(`  請先在另一個終端跑 npm run dev、確認 Local 顯示 ${DEV_URL} 後再跑此腳本`);
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
  { name: "home",       url: "/" },
  { name: "part0",      url: "/part-0/" },
  { name: "p0-basics",  url: "/part-0/basics" },    // 新加：0.0 三分鐘看懂後端
  { name: "p0-intro",   url: "/part-0/intro" },
  { name: "p0-metrics", url: "/part-0/metrics" },   // G 元件示範最完整的一章
  { name: "part1",      url: "/part-1/" },
  { name: "ch01",       url: "/part-1/ch01-reliable" },
  { name: "ch02",       url: "/part-1/ch02-data-models" },     // 含前端 Firestore 對照 tip
  { name: "ch05",       url: "/part-2/ch05-replication" },     // 含前端樂觀更新 tip
  { name: "ch07",       url: "/part-2/ch07-transactions" },    // 含 A/B/C 三情境
  { name: "ch11",       url: "/part-3/ch11-streams" },         // 含 stream consumer 對照表
  { name: "glossary",   url: "/glossary/" },
  { name: "paths",      url: "/paths/" },
];

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => console.error("[pageerror]", err.message));

  for (const p of PAGES) {
    const url = `http://localhost:5173${p.url}`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(400); // 字型 + 元件 hydrate
    if (scrollPx > 0) {
      // 捲到指定位置再拍 —— 用於驗 sticky 元件（GlossaryIndex 等）的浮層樣式
      await page.evaluate((px) => window.scrollTo({ top: px, behavior: 'instant' }), scrollPx);
      await page.waitForTimeout(200);
    }
    const suffix = scrollPx > 0 ? `-scroll${scrollPx}` : "";

    await setTheme(page, "light");
    await page.screenshot({ path: `${OUT}/${tag}-${p.name}${suffix}-light.png`, fullPage: scrollPx === 0 });

    await setTheme(page, "dark");
    await page.screenshot({ path: `${OUT}/${tag}-${p.name}${suffix}-dark.png`, fullPage: scrollPx === 0 });

    console.log(`[ok] ${p.name}${suffix}`);
  }
} finally {
  await browser.close();
}

console.log(`\n截圖輸出於 scripts/screenshots/，前綴 = ${tag}`);

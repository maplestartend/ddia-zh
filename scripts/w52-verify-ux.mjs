// W52 驗收 #3：整體 UX 與拒絕清單一致性 verifier
// 拍 4 個關鍵頁桌面 + 4 個暗色 + 1024 viewport 對照、回填 W52 拒絕 10 條是否反悔
// 用法：node scripts/w52-verify-ux.mjs [tag]
//        預設 tag = "w52-verify"
// 需求：dev server 已在 http://localhost:5173

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const tag = args.find(a => !a.startsWith("--")) || "w52-verify";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(2500) });
  if (!res.ok) throw new Error(`status ${res.status}`);
} catch (err) {
  console.error(`✗ dev server 沒在 ${DEV_URL} 回應（${err.message}）`);
  console.error(`  請先 npm run dev`);
  process.exit(2);
}

const setTheme = async (page, theme) => {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("vitepress-theme-appearance", t);
  }, theme);
  await page.waitForTimeout(220);
};

// 核心 4 頁（task spec 指定）
const CORE_PAGES = [
  { name: "home",  url: "/" },
  { name: "ch05",  url: "/part-2/ch05-replication" },        // 章節整體閱讀流
  { name: "ch07-full", url: "/part-2/ch07-transactions" }, // 章末 Quiz/Interview/Note/Bridge — fullPage 一次拍齊
  { name: "paths", url: "/paths/" },                          // path-divider 位置
];

// 暗色 4 頁（task spec）
const DARK_PAGES = [
  { name: "home-dark",      url: "/" },
  { name: "ch05-dark",      url: "/part-2/ch05-replication" },
  { name: "ch07-full-dark", url: "/part-2/ch07-transactions" },
  { name: "paths-dark",     url: "/paths/" },
];

// 1024 viewport（拒絕清單：1024 三欄 18 字/行 — 看是否真不痛）
const VP_1024_PAGES = [
  { name: "home-1024",  url: "/" },
  { name: "ch05-1024",  url: "/part-2/ch05-replication" },
  { name: "paths-1024", url: "/paths/" },
];

const browser = await chromium.launch();
const screenshots = [];

async function shootPage(ctx, p, theme = "light", viewportLabel = "") {
  const page = await ctx.newPage();
  page.on("pageerror", (err) => console.error(`[pageerror] ${p.name}`, err.message));
  const url = `${DEV_URL}${p.url}`;
  await page.goto(url, { waitUntil: "networkidle" });
  try {
    await page.waitForSelector('.vp-doc, .ddia-hero, [class^="ddia-"]', { timeout: 8000 });
  } catch {
    console.warn(`[warn] ${p.name} 未見預期 selector`);
  }
  // 等 Fraunces 字型 swap、async chunk hydrate
  await page.waitForTimeout(1300);
  await setTheme(page, theme);
  await page.waitForTimeout(180);

  // 章末 scroll：scroll to bottom * 0.95 — 看 Quiz/Interview/Note/Bridge
  if (p.scroll && p.scroll > 0) {
    await page.evaluate((ratio) => {
      const h = document.body.scrollHeight;
      window.scrollTo({ top: Math.floor(h * ratio), behavior: 'instant' });
    }, p.scroll);
    await page.waitForTimeout(280);
  }

  const fullPage = !p.scroll || p.scroll === 0;
  const themeSuffix = theme === "dark" ? "-dark" : "-light";
  const fileName = `${tag}-${p.name}${viewportLabel ? "-" + viewportLabel : ""}${themeSuffix}.png`;
  const path = join(OUT, fileName);
  await page.screenshot({ path, fullPage });
  screenshots.push({ name: p.name, theme, path: fileName, fullPage });
  console.log(`[ok] ${fileName}  (full=${fullPage}, theme=${theme})`);
  await page.close();
}

try {
  // === 1440 桌面、light ===
  const ctx1440 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  for (const p of CORE_PAGES) await shootPage(ctx1440, p, "light");
  await ctx1440.close();

  // === 1440 桌面、dark ===
  const ctx1440Dark = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  for (const p of DARK_PAGES) await shootPage(ctx1440Dark, { ...p, name: p.name.replace("-dark", "") }, "dark", "");
  await ctx1440Dark.close();

  // === 1024 中間斷點（拒絕#4 1024 三欄行寬問題）===
  const ctx1024 = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  for (const p of VP_1024_PAGES) await shootPage(ctx1024, { ...p, name: p.name.replace("-1024", "") }, "light", "vp1024");
  await ctx1024.close();
} finally {
  await browser.close();
}

console.log(`\n===  W52 verify 截圖完成 ===`);
console.log(`  輸出目錄: scripts/screenshots/`);
console.log(`  前綴: ${tag}-`);
console.log(`  共 ${screenshots.length} 張`);

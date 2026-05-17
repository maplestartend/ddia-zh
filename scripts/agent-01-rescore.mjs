// Agent #01 高中生視角 — W46 修正後重評截圖
// 複用 agent-01-tour.mjs 結構、只改 outDir + 聚焦 5 個關鍵頁
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-01-rescore");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error(`status ${res.status}`);
} catch (err) {
  console.error(`dev server not responding at ${DEV_URL}: ${err.message}`);
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

// W46 痛點 5 大檢驗頁（首頁、paths、30 天初學者、詞彙表、Ch1）
const PAGES = [
  { name: "01-home",            url: "/" },
  { name: "02-paths",           url: "/paths/" },
  { name: "03-30day-beginner",  url: "/paths/30-day-beginner" },
  { name: "04-glossary",        url: "/glossary/" },
  { name: "05-ch01",            url: "/part-1/ch01-reliable" },
];

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => console.error("[pageerror]", err.message));

  // --- Phase 1: 巡覽 5 個頁面，明暗各拍一張 fullPage ---
  for (const p of PAGES) {
    await page.goto(`${DEV_URL}${p.url}`, { waitUntil: "networkidle" });
    try {
      await page.waitForSelector('.vp-doc, .ddia-hero, [class^="ddia-"]', { timeout: 8000 });
    } catch {
      console.warn(`[warn] ${p.name} no main content within 8s`);
    }
    await page.waitForTimeout(1200);

    await setTheme(page, "light");
    await page.screenshot({ path: `${OUT}/${p.name}-light.png`, fullPage: true });

    await setTheme(page, "dark");
    await page.screenshot({ path: `${OUT}/${p.name}-dark.png`, fullPage: true });

    console.log(`[ok] ${p.name}`);
  }

  // --- Phase 2: 痛點對焦截圖（viewport） ---
  await setTheme(page, "light");

  // 2a. 首頁 hero — 看 persona router 4 chip 是否在第一屏
  await page.goto(`${DEV_URL}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/i01-home-hero-viewport.png`, fullPage: false });

  // 2b. /paths/ 開頭 — 看「兩問題決策卡」
  await page.goto(`${DEV_URL}/paths/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/i02-paths-top-viewport.png`, fullPage: false });

  // 2c. 30 天初學者 — 看「彈性 30-45 天」+ 卡關預警
  await page.goto(`${DEV_URL}/paths/30-day-beginner`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/i03-30day-top-viewport.png`, fullPage: false });

  // 2d. 詞彙表頂 — 看「starter card 8 個」
  await page.goto(`${DEV_URL}/glossary/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/i04-glossary-top-viewport.png`, fullPage: false });

  // 2e. Ch1 章首 — 看 ChapterMeta tag 是否有連結 + ? icon
  await page.goto(`${DEV_URL}/part-1/ch01-reliable`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/i05-ch01-top-viewport.png`, fullPage: false });

  // 2f. Ch1 Quiz 區 — 看英文海是否變白話
  try {
    const quiz = await page.$('.ddia-quiz, [class*="quiz"]');
    if (quiz) {
      await quiz.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/i06-ch01-quiz-viewport.png`, fullPage: false });
    } else {
      console.log("[warn] quiz section not found");
    }
  } catch (e) {
    console.log("[warn] quiz scroll:", e.message);
  }

  // 2g. floating progress chip — 捲過章首後看右下角是否浮現
  await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/i07-ch01-floating-chip.png`, fullPage: false });

  console.log(`\n截圖輸出於 ${OUT}`);
} finally {
  await browser.close();
}

// Agent #01 高中生視角實際操作 tour
// 拍站台關鍵頁 + 互動（Quiz / Progress / Glossary tooltip / 捲動 / 暗色切換）前後
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-01");
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

const PAGES = [
  { name: "01-home",            url: "/" },
  { name: "02-paths",           url: "/paths/" },
  { name: "03-30day-beginner",  url: "/paths/30-day-beginner" },
  { name: "04-progress",        url: "/progress" },
  { name: "05-glossary",        url: "/glossary/" },
  { name: "06-part0",           url: "/part-0/" },
  { name: "07-p0-basics",       url: "/part-0/basics" },
  { name: "08-ch01",            url: "/part-1/ch01-reliable" },
];

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => console.error("[pageerror]", err.message));

  // --- Phase 1: 巡覽 8 個頁面，明暗各拍一張 fullPage ---
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

  // --- Phase 2: 互動操作 ---
  await setTheme(page, "light");

  // 2a. 首頁暗色切換 (viewport only)
  await page.goto(`${DEV_URL}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await setTheme(page, "light");
  await page.screenshot({ path: `${OUT}/i01-home-viewport-light.png`, fullPage: false });
  await setTheme(page, "dark");
  await page.screenshot({ path: `${OUT}/i02-home-viewport-dark.png`, fullPage: false });
  await setTheme(page, "light");

  // 2b. Ch1 章節：捲動到 quiz、互動
  await page.goto(`${DEV_URL}/part-1/ch01-reliable`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // 章首
  await page.screenshot({ path: `${OUT}/i03-ch01-top-viewport.png`, fullPage: false });

  // 捲到中段
  await page.evaluate(() => window.scrollTo({ top: 1600, behavior: 'instant' }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/i04-ch01-mid-viewport.png`, fullPage: false });

  // 捲到 Quiz 區（章末）— 用 selector 對齊
  const quizSelector = '.ddia-quiz, [class*="quiz"]';
  try {
    const quiz = await page.$(quizSelector);
    if (quiz) {
      await quiz.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/i05-ch01-quiz-before.png`, fullPage: false });

      // 點第一題的第一個選項
      const firstOption = await page.$('.ddia-quiz button, .ddia-quiz [role="radio"], .ddia-quiz label');
      if (firstOption) {
        await firstOption.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${OUT}/i06-ch01-quiz-option-clicked.png`, fullPage: false });
      } else {
        console.log("[warn] quiz option element not found via generic selector");
      }
    } else {
      console.log("[warn] quiz section not found");
    }
  } catch (e) {
    console.log("[warn] quiz interaction:", e.message);
  }

  // 2c. Progress 已讀按鈕
  try {
    const progressBtn = await page.$('.ddia-progress button, button[class*="progress"], button:has-text("標記")');
    if (progressBtn) {
      await progressBtn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/i07-progress-before.png`, fullPage: false });
      await progressBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/i08-progress-after-click.png`, fullPage: false });
    } else {
      console.log("[warn] progress button not found");
    }
  } catch (e) {
    console.log("[warn] progress interaction:", e.message);
  }

  // 2d. Glossary tooltip — Part 0 metrics 頁有最多 G 元件
  await page.goto(`${DEV_URL}/part-0/metrics`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await setTheme(page, "light");

  // 找第一個 G tooltip target
  try {
    const gTerm = await page.$('.g-term, [class*="glossary-term"], .ddia-g, [data-glossary]');
    if (gTerm) {
      await gTerm.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/i09-glossary-term-before-hover.png`, fullPage: false });
      const box = await gTerm.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(800);
        await page.screenshot({ path: `${OUT}/i10-glossary-term-hover-tooltip.png`, fullPage: false });
      }
    } else {
      console.log("[warn] glossary term element not found via selector");
      // fallback：拍頁面看有沒有 inline 標記
      await page.screenshot({ path: `${OUT}/i09-glossary-page-fallback.png`, fullPage: false });
    }
  } catch (e) {
    console.log("[warn] glossary interaction:", e.message);
  }

  // 2e. 詞彙表頁 A-Z 索引
  await page.goto(`${DEV_URL}/glossary/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await setTheme(page, "light");
  await page.screenshot({ path: `${OUT}/i11-glossary-index-light.png`, fullPage: false });
  await setTheme(page, "dark");
  await page.screenshot({ path: `${OUT}/i12-glossary-index-dark.png`, fullPage: false });

  console.log(`\n截圖輸出於 ${OUT}`);
} finally {
  await browser.close();
}

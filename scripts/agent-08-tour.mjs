// Agent #08 視角：32 歲機械工程師想轉行、freeCodeCamp 自學 1 年 JS、最遠 Todo App + Auth
// 重點：Part 0 全部 8 頁、做 self-assessment、看結果 banner、評估能否銜接 Part 1
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-08");
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

// Part 0 全 8 頁 + 首頁 / paths / 30 天 / progress / glossary / ch1
const PAGES = [
  { name: "01-home",            url: "/" },
  { name: "02-paths",           url: "/paths/" },
  { name: "03-30day-beginner",  url: "/paths/30-day-beginner" },
  { name: "04-progress",        url: "/progress" },
  { name: "05-glossary",        url: "/glossary/" },
  { name: "06-part0-index",     url: "/part-0/" },
  { name: "07-p0-basics",       url: "/part-0/basics" },
  { name: "08-p0-intro",        url: "/part-0/intro" },
  { name: "09-p0-data-structures", url: "/part-0/data-structures" },
  { name: "10-p0-os",           url: "/part-0/os" },
  { name: "11-p0-network",      url: "/part-0/network" },
  { name: "12-p0-sql",          url: "/part-0/sql" },
  { name: "13-p0-concurrency",  url: "/part-0/concurrency" },
  { name: "14-p0-metrics",      url: "/part-0/metrics" },
  { name: "15-ch01-reliable",   url: "/part-1/ch01-reliable" },
];

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => console.error("[pageerror]", err.message));

  // Phase 1: 巡 15 頁 light + dark fullpage
  for (const p of PAGES) {
    await page.goto(`${DEV_URL}${p.url}`, { waitUntil: "networkidle" });
    try {
      await page.waitForSelector('.vp-doc, .ddia-hero, [class^="ddia-"]', { timeout: 8000 });
    } catch {
      console.warn(`[warn] ${p.name} no main content within 8s`);
    }
    await page.waitForTimeout(1000);

    await setTheme(page, "light");
    await page.screenshot({ path: `${OUT}/${p.name}-light.png`, fullPage: true });
    await setTheme(page, "dark");
    await page.screenshot({ path: `${OUT}/${p.name}-dark.png`, fullPage: true });
    console.log(`[ok] ${p.name}`);
  }

  // Phase 2: Part 0 self-assessment 互動
  await setTheme(page, "light");
  await page.goto(`${DEV_URL}/part-0/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // 找 self-assessment 區，捲過去拍 before
  const assessmentSelector = '.ddia-self-assess';
  try {
    const assess = await page.$(assessmentSelector);
    if (assess) {
      await assess.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/i01-assessment-before.png`, fullPage: false });

      // 模擬「最弱讀者」：7 題只勾 1 題（q1 stateless，從 freeCodeCamp Auth 課略懂）
      const checkboxes = await page.$$(`${assessmentSelector} input[type="checkbox"]`);
      console.log(`[info] found ${checkboxes.length} checkboxes`);
      if (checkboxes.length >= 1) {
        await checkboxes[0].click();
        await page.waitForTimeout(400);
      }
      await assess.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${OUT}/i02-assessment-1of7-result.png`, fullPage: false });
      await page.screenshot({ path: `${OUT}/i03-assessment-fullpage-1of7.png`, fullPage: true });

      // 再勾 3/7 看 banner 變化
      if (checkboxes.length >= 3) {
        await checkboxes[1].click();
        await checkboxes[2].click();
        await page.waitForTimeout(400);
      }
      await assess.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${OUT}/i02b-assessment-3of7-result.png`, fullPage: false });

      // 再勾全 7 看 pass banner
      for (let i = 3; i < checkboxes.length; i++) {
        await checkboxes[i].click();
        await page.waitForTimeout(100);
      }
      await page.waitForTimeout(400);
      await assess.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${OUT}/i02c-assessment-7of7-pass.png`, fullPage: false });
    } else {
      console.log("[warn] self-assessment not found via selector, fullpage fallback");
      await page.screenshot({ path: `${OUT}/i01-part0-fallback.png`, fullPage: true });
    }
  } catch (e) {
    console.log("[warn] assessment interaction:", e.message);
  }

  // Phase 3: 0.0 basics 頁深入看（最關鍵：天書還是親切）
  await page.goto(`${DEV_URL}/part-0/basics`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await setTheme(page, "light");
  await page.screenshot({ path: `${OUT}/i04-basics-top.png`, fullPage: false });
  await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/i05-basics-mid.png`, fullPage: false });
  await page.evaluate(() => window.scrollTo({ top: 3000, behavior: 'instant' }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/i06-basics-deep.png`, fullPage: false });

  // Phase 4: 詞彙表 — 弱讀者打開第一眼
  await page.goto(`${DEV_URL}/glossary/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await setTheme(page, "light");
  await page.screenshot({ path: `${OUT}/i07-glossary-first-view.png`, fullPage: false });
  await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/i08-glossary-mid.png`, fullPage: false });

  // Phase 5: 30 天初學者路徑 — 撐得下去嗎
  await page.goto(`${DEV_URL}/paths/30-day-beginner`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/i09-30day-top.png`, fullPage: false });
  await page.evaluate(() => window.scrollTo({ top: 2000, behavior: 'instant' }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/i10-30day-mid.png`, fullPage: false });

  // Phase 6: Ch1 看一眼有沒有信心進去
  await page.goto(`${DEV_URL}/part-1/ch01-reliable`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/i11-ch01-top.png`, fullPage: false });

  console.log(`\n截圖輸出於 ${OUT}`);
} finally {
  await browser.close();
}

// W52 verify P1 + regression — visual QA
// 5 個 P1 改動驗證：
//   1. 30 天計畫 H2「｜」斷行 — base.css word-break: keep-all（拍 1440 + 1024）
//   2. Chapter card 可點性 — chapter-cards.css cursor pointer + ::before opacity 0.25
//   3. ChapterMeta tag-link hover — border-bottom-width 2px
//   4. Floating chip 1024 顯示 — max-width: 1023（拍 Ch7 1024 viewport）
//   5. CH 編號 eyebrow 間距 — margin-bottom var(--space-2) = 8px
//
// 回歸測試：章節頁、首頁、/paths/、/progress 各頁 light + dark
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "w52-verify-p1");
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

const goReady = async (page, url) => {
  await page.goto(`${DEV_URL}${url}`, { waitUntil: "networkidle" });
  try {
    await page.waitForSelector('.vp-doc, .ddia-hero, [class^="ddia-"]', { timeout: 8000 });
  } catch {
    console.warn(`[warn] no main selector at ${url}`);
  }
  await page.waitForTimeout(1100);
};

const shoot = async (page, name, opts = {}) => {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: opts.fullPage ?? false });
  console.log(`  [ok] ${name}.png`);
};

const browser = await chromium.launch();
try {
  // ---------- P1-1：30 天計畫 H2 斷行（1440 + 1024 兩個 viewport）----------
  console.log("\n[P1-1] 30 天計畫 H2「｜」斷行");
  for (const vp of [
    { w: 1440, h: 900, label: "1440" },
    { w: 1024, h: 768, label: "1024" },
  ]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    page.on("pageerror", (err) => console.error("[pageerror]", err.message));

    await goReady(page, "/paths/30-day-summer-plan");
    // 捲到第 2 週標頭附近、能看 H2 斷行情況
    await page.evaluate(() => {
      const h = Array.from(document.querySelectorAll('.vp-doc h2'))
        .find(el => el.textContent && el.textContent.includes('第 2 週'));
      if (h) h.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await page.waitForTimeout(300);

    await setTheme(page, "light");
    await shoot(page, `p1-1-30day-${vp.label}-light`);
    await setTheme(page, "dark");
    await shoot(page, `p1-1-30day-${vp.label}-dark`);

    await ctx.close();
  }

  // ---------- P1-2：首頁 chapter card hover state + default ----------
  console.log("\n[P1-2] 首頁 chapter card hover state");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on("pageerror", (err) => console.error("[pageerror]", err.message));

    await goReady(page, "/");
    // 捲到 chapter cards grid
    await page.evaluate(() => {
      const grid = document.querySelector('.ddia-chapter-grid, [class*="chapter-grid"]');
      if (grid) grid.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await page.waitForTimeout(400);

    await setTheme(page, "light");
    await shoot(page, `p1-2-cards-default-light`);

    // Hover 第一張 card
    const firstCard = page.locator('.ddia-chapter-card').first();
    if (await firstCard.count() > 0) {
      await firstCard.hover();
      await page.waitForTimeout(300);
      await shoot(page, `p1-2-cards-hover-light`);
    }

    await setTheme(page, "dark");
    await page.mouse.move(0, 0);  // unhover
    await page.waitForTimeout(200);
    await shoot(page, `p1-2-cards-default-dark`);
    if (await firstCard.count() > 0) {
      await firstCard.hover();
      await page.waitForTimeout(300);
      await shoot(page, `p1-2-cards-hover-dark`);
    }

    await ctx.close();
  }

  // ---------- P1-3：ChapterMeta tag-link hover（章節頁）----------
  console.log("\n[P1-3] ChapterMeta tag-link hover");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on("pageerror", (err) => console.error("[pageerror]", err.message));

    await goReady(page, "/part-1/ch01-reliable");
    // ChapterMeta 在章首 — 捲到頂
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(200);

    await setTheme(page, "light");
    await shoot(page, `p1-3-chaptermeta-default-light`);

    const tagLink = page.locator('.ddia-badge-link').first();
    if (await tagLink.count() > 0) {
      await tagLink.hover();
      await page.waitForTimeout(300);
      await shoot(page, `p1-3-chaptermeta-hover-light`);
    } else {
      console.warn("  [warn] no .ddia-badge-link found on ch01");
    }

    await setTheme(page, "dark");
    await page.mouse.move(0, 0);
    await page.waitForTimeout(200);
    if (await tagLink.count() > 0) {
      await tagLink.hover();
      await page.waitForTimeout(300);
      await shoot(page, `p1-3-chaptermeta-hover-dark`);
    }

    await ctx.close();
  }

  // ---------- P1-4：Floating chip 1024 viewport 顯示測試 ----------
  console.log("\n[P1-4] Ch7 floating chip 1024 viewport");
  for (const vp of [
    { w: 1024, h: 768, label: "1024" },
    { w: 1023, h: 768, label: "1023-hidden" },
    { w: 1440, h: 900, label: "1440" },
  ]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    page.on("pageerror", (err) => console.error("[pageerror]", err.message));

    await goReady(page, "/part-2/ch07-transactions");
    // 捲過章首 280px 觸發 floating chip
    await page.evaluate(() => window.scrollTo({ top: 800, behavior: 'instant' }));
    await page.waitForTimeout(500);

    await setTheme(page, "light");
    await shoot(page, `p1-4-floating-ch07-${vp.label}-light`);

    await ctx.close();
  }

  // ---------- P1-5：CH 編號 eyebrow 間距（首頁 chapter card 細節 + part-1 index）----------
  console.log("\n[P1-5] CH 編號 eyebrow 間距（chapter card head）");
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on("pageerror", (err) => console.error("[pageerror]", err.message));

    await goReady(page, "/part-1/");
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
    await page.waitForTimeout(400);

    await setTheme(page, "light");
    await shoot(page, `p1-5-card-head-spacing-light`);
    await setTheme(page, "dark");
    await shoot(page, `p1-5-card-head-spacing-dark`);

    await ctx.close();
  }

  // ---------- 回歸測試：章節頁、首頁、/paths/、/progress 整體 ----------
  console.log("\n[regression] 章節頁 / 首頁 / paths / progress 整體");
  const REGRESSION = [
    { name: "reg-home",        url: "/" },
    { name: "reg-ch01",        url: "/part-1/ch01-reliable" },
    { name: "reg-ch07",        url: "/part-2/ch07-transactions" },
    { name: "reg-paths",       url: "/paths/" },
    { name: "reg-progress",    url: "/progress" },
  ];
  for (const p of REGRESSION) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    page.on("pageerror", (err) => console.error("[pageerror]", err.message));

    await goReady(page, p.url);

    await setTheme(page, "light");
    await shoot(page, `${p.name}-light`, { fullPage: true });
    await setTheme(page, "dark");
    await shoot(page, `${p.name}-dark`, { fullPage: true });

    await ctx.close();
  }
} finally {
  await browser.close();
}

console.log(`\n[done] 截圖輸出於 scripts/screenshots/w52-verify-p1/`);

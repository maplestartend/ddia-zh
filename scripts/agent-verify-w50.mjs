// W50 verify — A11y/UX visual QA
// 拍 W50 改動後的截圖、確認沒視覺回歸
// W50 動了：
//   1. 拔 VP default Inter 字型（VP chrome 改 fallback 到 Noto Sans TC）
//   2. font preload URL 改一致（FOUT 應改善）
//   3. mermaid CSS 130 行刪
//   4. CSS 8 子檔語意化重切（純檔案重排）
//   5. icon-hide 10 處清
//   6. search-index 排除 modulepreload
//
// 重點驗：nav / sidebar / outline TOC / search box 字型 fallback 後是否仍 Editorial
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-verify-w50");
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

// 核心驗證 5 頁
const PAGES = [
  { name: "01-home",      url: "/",                          scroll: 0 },
  { name: "02-ch01",      url: "/part-1/ch01-reliable",      scroll: 0 },
  { name: "03-ch05",      url: "/part-2/ch05-replication",   scroll: 0 },
  { name: "04-glossary",  url: "/glossary/",                 scroll: 0 },
  { name: "05-ch01-quiz", url: "/part-1/ch01-reliable",      scroll: 4200 }, // 章末 Quiz
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
    await page.waitForTimeout(1500);

    // Light
    await setTheme(page, "light");
    if (p.scroll > 0) {
      await page.evaluate((px) => window.scrollTo({ top: px, behavior: "instant" }), p.scroll);
      await page.waitForTimeout(500);
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

  // ---- 6. 搜尋 box hover + 開啟 ----
  console.log("\n[step] 搜尋 box hover + 開啟");
  await page.goto(`${DEV_URL}/`, { waitUntil: "networkidle" });
  await page.waitForSelector('.vp-doc, .ddia-hero', { timeout: 8000 });
  await page.waitForTimeout(1500);
  await setTheme(page, "light");

  // 拍 VP nav chrome 完整（含 search button）light
  const navHandle = await page.$('.VPNav, .VPNavBar');
  if (navHandle) {
    await navHandle.screenshot({ path: `${OUT}/06-vp-nav-chrome-light.png` });
    console.log("[ok] 06-vp-nav-chrome-light");
  }

  // hover search button
  const searchBtn = await page.$('.VPNavBarSearch button, button.DocSearch-Button');
  if (searchBtn) {
    await searchBtn.hover();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/07-search-hover-light.png`, fullPage: false, clip: { x: 800, y: 0, width: 640, height: 200 } });
    console.log("[ok] 07-search-hover-light");

    // click search button → 開啟 modal
    await searchBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/08-search-open-light.png`, fullPage: false });
    console.log("[ok] 08-search-open-light");

    // 輸入查詢字（看 results 字型）
    await page.keyboard.type("複製", { delay: 50 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/09-search-results-light.png`, fullPage: false });
    console.log("[ok] 09-search-results-light");

    // 關閉 modal
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  } else {
    console.warn("[warn] search button not found");
  }

  // dark mode 同樣拍 nav + search
  await setTheme(page, "dark");
  await page.waitForTimeout(400);
  if (navHandle) {
    await navHandle.screenshot({ path: `${OUT}/10-vp-nav-chrome-dark.png` });
    console.log("[ok] 10-vp-nav-chrome-dark");
  }
  const searchBtnDark = await page.$('.VPNavBarSearch button, button.DocSearch-Button');
  if (searchBtnDark) {
    await searchBtnDark.click();
    await page.waitForTimeout(800);
    await page.keyboard.type("索引", { delay: 50 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/11-search-results-dark.png`, fullPage: false });
    console.log("[ok] 11-search-results-dark");
    await page.keyboard.press("Escape");
  }

  // ---- 12. sidebar / outline TOC 字型驗證（章節頁有 sidebar + outline）----
  console.log("\n[step] sidebar / outline TOC 字型");
  await page.goto(`${DEV_URL}/part-2/ch05-replication`, { waitUntil: "networkidle" });
  await page.waitForSelector('.vp-doc', { timeout: 8000 });
  await page.waitForTimeout(1500);
  await setTheme(page, "light");
  // 直接拍 viewport（含 sidebar + outline）
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/12-ch05-sidebar-outline-light.png`, fullPage: false });
  console.log("[ok] 12-ch05-sidebar-outline-light");

  await setTheme(page, "dark");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/13-ch05-sidebar-outline-dark.png`, fullPage: false });
  console.log("[ok] 13-ch05-sidebar-outline-dark");

  // ---- 14-16. FOUT 冷載 timing（清 cache 後 50/300/1000ms）----
  console.log("\n[step] FOUT 冷載 timing (50/300/1000ms)");
  const ctxCold = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    // 清掉所有 cache + storage
  });
  await ctxCold.clearCookies();
  const pageCold = await ctxCold.newPage();
  pageCold.on("pageerror", (err) => console.error("[pageerror-cold]", err.message));

  // 強制不用 cache（disableCache）
  await pageCold.route("**/*", route => {
    const headers = { ...route.request().headers(), "Cache-Control": "no-cache" };
    route.continue({ headers });
  });

  const timings = [50, 300, 1000];
  // 開新 page 先 navigate 到 about:blank，然後 race timing
  for (const t of timings) {
    const pageT = await ctxCold.newPage();
    // 一次性拍：navigate 後立即 setTimeout(t) 拍
    const navP = pageT.goto(`${DEV_URL}/`, { waitUntil: "commit" });
    await navP;
    // wait body 出現
    await pageT.waitForSelector('body', { timeout: 5000 });
    await pageT.waitForTimeout(t);
    await pageT.screenshot({ path: `${OUT}/14-fout-${t}ms.png`, fullPage: false });
    console.log(`[ok] 14-fout-${t}ms`);
    await pageT.close();
  }

  // ---- 17. DecisionTree / SequenceFlow 視覺驗證 ----
  console.log("\n[step] DecisionTree / SequenceFlow 視覺驗證");
  // Ch7 含 DecisionTree（事務隔離選擇）
  await page.goto(`${DEV_URL}/part-2/ch07-transactions`, { waitUntil: "networkidle" });
  await page.waitForSelector('.vp-doc', { timeout: 8000 });
  await page.waitForTimeout(1500);
  await setTheme(page, "light");

  // 找 DecisionTree 元件
  const dtree = await page.$('.ddia-decision-tree');
  if (dtree) {
    await dtree.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await dtree.screenshot({ path: `${OUT}/15-decision-tree-light.png` });
    console.log("[ok] 15-decision-tree-light");
  } else {
    console.warn("[warn] DecisionTree not found in ch07");
  }

  // 找 SequenceFlow（多半在 ch08/ch11）
  await page.goto(`${DEV_URL}/part-3/ch11-streams`, { waitUntil: "networkidle" });
  await page.waitForSelector('.vp-doc', { timeout: 8000 });
  await page.waitForTimeout(1500);
  const seqflow = await page.$('.ddia-sequence-flow');
  if (seqflow) {
    await seqflow.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await seqflow.screenshot({ path: `${OUT}/16-sequence-flow-light.png` });
    console.log("[ok] 16-sequence-flow-light");
  } else {
    console.warn("[warn] SequenceFlow not found in ch11");
  }
} finally {
  await browser.close();
}

console.log(`\n截圖輸出於 scripts/screenshots/agent-verify-w50/`);

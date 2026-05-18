// W52 verify #1 — A11y + 視覺 P0 拍圖驗證
// 拍 6+ 張 PNG 給 verifier Read 看實際視覺
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error(`status ${res.status}`);
} catch (err) {
  console.error(`dev server not up at ${DEV_URL}: ${err.message}`);
  process.exit(2);
}

const TAG = "w52-p0";
const browser = await chromium.launch();

// 子函數：拿 element 局部裁切（用 boundingBox + page.screenshot clip）
async function shotClip(page, selector, outName, opts = {}) {
  const el = await page.$(selector);
  if (!el) {
    console.warn(`[warn] selector ${selector} not found for ${outName}`);
    // 拍 viewport 退回
    await page.screenshot({ path: `${OUT}/${outName}` });
    return;
  }
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const box = await el.boundingBox();
  if (!box) {
    await page.screenshot({ path: `${OUT}/${outName}` });
    return;
  }
  const pad = opts.pad ?? 12;
  await page.screenshot({
    path: `${OUT}/${outName}`,
    clip: {
      x: Math.max(0, box.x - pad),
      y: Math.max(0, box.y - pad),
      width: Math.min(page.viewportSize().width - Math.max(0, box.x - pad), box.width + pad * 2),
      height: box.height + pad * 2,
    },
  });
}

async function gotoAndWait(page, url) {
  await page.goto(`${DEV_URL}${url}`, { waitUntil: "networkidle" });
  try {
    await page.waitForSelector('.vp-doc, .ddia-hero, [class^="ddia-"]', { timeout: 8000 });
  } catch {}
  await page.waitForTimeout(1500);
}

try {
  // ============================================================
  // P0-1: FirstReadShortcut raw render — paths/30-day-beginner.md
  //   驗證頁面內第 15 行附近的「第一次讀建議路徑」是純文字、不是 <FirstReadShortcut> 字面
  // ============================================================
  {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => console.error("[pageerror]", e.message));
    await gotoAndWait(page, "/paths/30-day-beginner");
    // 整頁拍以便看到開頭內容
    await page.screenshot({ path: `${OUT}/${TAG}-01a-30day-beginner-top.png`, fullPage: false });
    // 額外滾到「計畫前提」tip 區域看「第一次讀建議路徑」連結是否純文字
    await page.evaluate(() => window.scrollTo({ top: 250, behavior: "instant" }));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${TAG}-01b-30day-beginner-tip.png`, fullPage: false });
    await ctx.close();
    console.log("[ok] P0-1 30-day-beginner shots");
  }

  // ============================================================
  // P0-4: v380 表格 reflow — Ch5 三家落差表
  // ============================================================
  {
    const ctx = await browser.newContext({ viewport: { width: 380, height: 900 } });
    const page = await ctx.newPage();
    await gotoAndWait(page, "/part-2/ch05-replication");
    // 嘗試找 ch05 中文中第一個含「PostgreSQL」「MySQL」「Oracle」的表
    const tableIdx = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll(".vp-doc table"));
      for (let i = 0; i < tables.length; i++) {
        const t = tables[i].innerText;
        if (/PostgreSQL|MySQL|Oracle|MongoDB|Cassandra|Redis|Riak/.test(t)) {
          tables[i].scrollIntoView({ block: "center" });
          return i;
        }
      }
      return -1;
    });
    console.log(`[info] v380 ch05 vendor table idx = ${tableIdx}`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${TAG}-04-ch05-vendor-table-v380.png`, fullPage: false });
    // 另拍整頁 viewport 確認 reflow 樣態
    await ctx.close();
    console.log("[ok] P0-4 Ch5 v380 table shot");
  }

  // ============================================================
  // P0-3: Quiz CLS — Ch7 章末 Quiz 答完前後
  // ============================================================
  {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const page = await ctx.newPage();
    await gotoAndWait(page, "/part-2/ch07-transactions");
    // 滾到 Quiz 區
    const quizExists = await page.evaluate(() => {
      const q = document.querySelector(".ddia-quiz");
      if (!q) return false;
      q.scrollIntoView({ block: "start" });
      return true;
    });
    console.log(`[info] ch07 quiz exists = ${quizExists}`);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/${TAG}-03a-ch07-quiz-before.png`, fullPage: false });

    // 答完所有題（每題挑第一個 option 點下、再點 submit）
    await page.evaluate(() => {
      const options = document.querySelectorAll(".ddia-quiz-option");
      // 每題只挑該題第一個 option（每題第一個 input radio）
      const seen = new Set();
      options.forEach((opt) => {
        const input = opt.querySelector("input[type=radio]");
        if (input && !seen.has(input.name)) {
          seen.add(input.name);
          input.click();
        }
      });
    });
    await page.waitForTimeout(300);
    // 找 submit 按鈕
    const submitted = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll(".ddia-quiz button"));
      const submit = buttons.find((b) => /提交|對答|送出|submit/i.test(b.innerText));
      if (submit) {
        submit.click();
        return submit.innerText;
      }
      return null;
    });
    console.log(`[info] ch07 submit button = ${submitted}`);
    await page.waitForTimeout(800);
    // 答完應該 scroll back 到 quiz header
    await page.screenshot({ path: `${OUT}/${TAG}-03b-ch07-quiz-after.png`, fullPage: false });
    await ctx.close();
    console.log("[ok] P0-3 Ch7 Quiz before/after shots");
  }

  // ============================================================
  // P0-2: Ch1 v480 ChapterMeta tag 列
  // ============================================================
  {
    const ctx = await browser.newContext({ viewport: { width: 480, height: 900 } });
    const page = await ctx.newPage();
    await gotoAndWait(page, "/part-1/ch01-reliable");
    // 確保 ChapterMeta 在 view
    await page.evaluate(() => {
      const m = document.querySelector(".ddia-meta");
      if (m) m.scrollIntoView({ block: "start" });
    });
    await page.waitForTimeout(500);
    // 局部 clip ChapterMeta
    await shotClip(page, ".ddia-meta", `${TAG}-02-ch01-chaptermeta-v480.png`, { pad: 16 });
    // 另拍 viewport 寬樣態
    await page.screenshot({ path: `${OUT}/${TAG}-02b-ch01-v480-viewport.png`, fullPage: false });
    await ctx.close();
    console.log("[ok] P0-2 Ch1 v480 ChapterMeta shots");
  }

  // ============================================================
  // P0-5: GlossaryTerm 視覺差異 — Ch1 文中 G 詞彙
  // ============================================================
  {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const page = await ctx.newPage();
    await gotoAndWait(page, "/part-1/ch01-reliable");
    // 抓首個 .ddia-g 元素位置
    const gFound = await page.evaluate(() => {
      const g = document.querySelector(".ddia-g");
      if (!g) return false;
      g.scrollIntoView({ block: "center" });
      return true;
    });
    console.log(`[info] ch01 .ddia-g exists = ${gFound}`);
    await page.waitForTimeout(500);
    // 局部裁切第一個 G 詞彙周邊段落
    await shotClip(page, ".ddia-g", `${TAG}-05a-ch01-glossary-g-closeup.png`, { pad: 60 });
    // 另拍 viewport 看周圍上下文
    await page.screenshot({ path: `${OUT}/${TAG}-05b-ch01-glossary-context.png`, fullPage: false });
    await ctx.close();
    console.log("[ok] P0-5 Ch1 GlossaryTerm shots");
  }

  console.log(`\n[done] PNGs in ${OUT} prefix=${TAG}`);
} finally {
  await browser.close();
}

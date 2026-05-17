// Agent re-audit 5（A11y / UX Visual QA）— W48+W49 視覺/a11y 回歸驗證
// 拍 8 個關鍵頁 + 額外觀察 (async hydration / Fraunces SOFT / FOUT / focus-visible)
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-rescore-w49");
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
  { name: "01-home",                  url: "/" },
  { name: "02-ch01",                  url: "/part-1/ch01-reliable" },
  { name: "03-ch05",                  url: "/part-2/ch05-replication" },
  { name: "04-ch09",                  url: "/part-2/ch09-consistency" },
  { name: "05-part0-index",           url: "/part-0/" },
  { name: "06-part0-self-assessment", url: "/part-0/" },
  { name: "07-glossary",              url: "/glossary/" },
  { name: "08-30day",                 url: "/paths/30-day-beginner" },
];

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => console.error("[pageerror]", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.warn("[console.error]", msg.text());
  });

  // Phase 1: 8 個關鍵頁 fullPage light
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
    console.log(`[ok] ${p.name}-light`);
  }

  // Phase 2: async hydration 觀察 — Ch1 章末 Quiz 首次 cold load
  // 用全新 context 模擬第一次冷開
  const coldCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const coldPage = await coldCtx.newPage();
  coldPage.on("pageerror", (err) => console.error("[cold pageerror]", err.message));

  // 拍 Ch1 quiz 區段的 hydration 過程
  const ch1Url = `${DEV_URL}/part-1/ch01-reliable`;
  await coldPage.goto(ch1Url, { waitUntil: "domcontentloaded" });
  // 立刻捲到章末（quiz 區），看 async 是否 SSG 出來的 HTML 立刻可見
  await coldPage.evaluate(() => window.scrollTo({ top: document.body.scrollHeight - 1200, behavior: 'instant' }));
  await coldPage.waitForTimeout(100);
  await coldPage.screenshot({ path: `${OUT}/i01-ch01-quiz-100ms.png`, fullPage: false });
  await coldPage.waitForTimeout(400);
  await coldPage.screenshot({ path: `${OUT}/i02-ch01-quiz-500ms.png`, fullPage: false });
  await coldPage.waitForTimeout(1500);
  await coldPage.screenshot({ path: `${OUT}/i03-ch01-quiz-2000ms.png`, fullPage: false });

  // Phase 3: Ch9 quiz hydration（async component）
  const ch9Url = `${DEV_URL}/part-2/ch09-consistency`;
  await coldPage.goto(ch9Url, { waitUntil: "domcontentloaded" });
  await coldPage.evaluate(() => window.scrollTo({ top: document.body.scrollHeight - 1200, behavior: 'instant' }));
  await coldPage.waitForTimeout(150);
  await coldPage.screenshot({ path: `${OUT}/i04-ch09-quiz-150ms.png`, fullPage: false });
  await coldPage.waitForTimeout(1500);
  await coldPage.screenshot({ path: `${OUT}/i05-ch09-quiz-2000ms.png`, fullPage: false });

  // Phase 4: FOUT 觀察 — 首頁 hero 大字、極短間隔
  const fontCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const fontPage = await fontCtx.newPage();
  await fontPage.goto(`${DEV_URL}/`, { waitUntil: "domcontentloaded" });
  await fontPage.waitForTimeout(50);
  await fontPage.screenshot({ path: `${OUT}/i06-home-fout-50ms.png`, fullPage: false });
  await fontPage.waitForTimeout(200);
  await fontPage.screenshot({ path: `${OUT}/i07-home-fout-300ms.png`, fullPage: false });
  await fontPage.waitForTimeout(700);
  await fontPage.screenshot({ path: `${OUT}/i08-home-fout-1000ms.png`, fullPage: false });

  // 印出 fonts-loaded class 時間（如果 theme/index.ts 有掛 hook）
  const fontsLoaded = await fontPage.evaluate(() => {
    return {
      hasClass: document.documentElement.classList.contains("fonts-loaded"),
      fontFaceSize: document.fonts.size,
      ready: document.fonts.status,
    };
  });
  console.log("[fonts]", JSON.stringify(fontsLoaded));

  // Phase 5: focus-visible 觀察
  await fontPage.goto(`${DEV_URL}/`, { waitUntil: "networkidle" });
  await fontPage.waitForTimeout(800);
  // tab 3 次看 focus ring
  await fontPage.keyboard.press("Tab");
  await fontPage.waitForTimeout(200);
  await fontPage.screenshot({ path: `${OUT}/i09-home-focus-tab1.png`, fullPage: false });
  await fontPage.keyboard.press("Tab");
  await fontPage.waitForTimeout(200);
  await fontPage.screenshot({ path: `${OUT}/i10-home-focus-tab2.png`, fullPage: false });
  await fontPage.keyboard.press("Tab");
  await fontPage.waitForTimeout(200);
  await fontPage.screenshot({ path: `${OUT}/i11-home-focus-tab3.png`, fullPage: false });

  // Phase 6: Part 0 self-assessment 0/7 reframing banner
  await fontPage.goto(`${DEV_URL}/part-0/`, { waitUntil: "networkidle" });
  await fontPage.waitForTimeout(1200);
  // 捲到 Part0SelfAssessment 元件位置
  const found = await fontPage.evaluate(() => {
    const el = document.querySelector('[class*="self-assess"], [class*="SelfAssessment"], [class*="part0"]');
    if (el) { el.scrollIntoView({ behavior: 'instant', block: 'start' }); return true; }
    // fallback: 捲到中段
    window.scrollTo({ top: document.body.scrollHeight * 0.5, behavior: 'instant' });
    return false;
  });
  await fontPage.waitForTimeout(400);
  await fontPage.screenshot({ path: `${OUT}/i12-part0-self-assess.png`, fullPage: false });
  console.log(`[part0 self-assess element found] ${found}`);

  // Phase 7: Ch1 ChapterMeta tag 連結觀察
  await fontPage.goto(`${DEV_URL}/part-1/ch01-reliable`, { waitUntil: "networkidle" });
  await fontPage.waitForTimeout(1000);
  await fontPage.screenshot({ path: `${OUT}/i13-ch01-top-meta.png`, fullPage: false });

  // Phase 8: Ch5 PG/MySQL/Redis 落差表
  await fontPage.goto(`${DEV_URL}/part-2/ch05-replication`, { waitUntil: "networkidle" });
  await fontPage.waitForTimeout(1200);
  // 嘗試捲到該表
  const matched = await fontPage.evaluate(() => {
    const tables = document.querySelectorAll(".vp-doc table");
    for (const t of tables) {
      if (/PostgreSQL|MySQL|Redis|Postgres/i.test(t.innerText)) {
        t.scrollIntoView({ behavior: "instant", block: "center" });
        return true;
      }
    }
    return false;
  });
  await fontPage.waitForTimeout(400);
  await fontPage.screenshot({ path: `${OUT}/i14-ch05-pg-mysql-redis.png`, fullPage: false });
  console.log(`[ch05 table found] ${matched}`);

  console.log(`\n截圖輸出於 ${OUT}`);
} finally {
  await browser.close();
}

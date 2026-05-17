// Agent #09 巡禮：42 歲 PM、不寫 code、只想補可靠/可擴/一致性常識
// 重點：拍 TLDR 區塊（章首）+ ADR / postmortem / capacity-planning + 詞彙表面試 ★
// 章節頁額外拍「章首 viewport」（只看 TLDR 區、模擬 PM 沒時間細讀的場景）
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-09");
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

// Phase 1：fullPage 巡禮
const PAGES = [
  { name: "01-home",            url: "/" },
  { name: "02-paths-index",     url: "/paths/" },
  { name: "03-adr-template",    url: "/paths/adr-template" },
  { name: "04-postmortems",     url: "/paths/incident-postmortems" },
  { name: "05-capacity-plan",   url: "/paths/capacity-planning" },
  { name: "06-ch01-reliable",   url: "/part-1/ch01-reliable" },
  { name: "07-ch05-replication",url: "/part-2/ch05-replication" },
  { name: "08-ch06-partition",  url: "/part-2/ch06-partitioning" },
  { name: "09-glossary",        url: "/glossary/" },
  { name: "10-progress",        url: "/progress" },
];

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => console.error("[pageerror]", err.message));

  // -------- Phase 1：全頁巡禮 --------
  for (const p of PAGES) {
    const url = `${DEV_URL}${p.url}`;
    await page.goto(url, { waitUntil: "networkidle" });
    try {
      await page.waitForSelector('.vp-doc, .ddia-hero, [class^="ddia-"]', { timeout: 8000 });
    } catch {
      console.warn(`[warn] ${p.name} no main selector within 8s`);
    }
    await page.waitForTimeout(1200);

    await setTheme(page, "light");
    await page.screenshot({ path: `${OUT}/${p.name}-light.png`, fullPage: true });
    await setTheme(page, "dark");
    await page.screenshot({ path: `${OUT}/${p.name}-dark.png`, fullPage: true });
    console.log(`[ok] ${p.name}`);
  }

  // -------- Phase 2：PM「只看 TLDR」模擬 --------
  // 章節頁不捲動、只截首屏 — 模擬 PM 進來只掃 TLDR 就走
  const TLDR_ONLY = [
    { name: "11-ch01-tldr-only", url: "/part-1/ch01-reliable" },
    { name: "12-ch05-tldr-only", url: "/part-2/ch05-replication" },
    { name: "13-ch06-tldr-only", url: "/part-2/ch06-partitioning" },
  ];
  for (const p of TLDR_ONLY) {
    await page.goto(`${DEV_URL}${p.url}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await setTheme(page, "light");
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(200);
    // viewport-only（fullPage: false）= PM 第一眼看到的內容
    await page.screenshot({ path: `${OUT}/${p.name}-light.png`, fullPage: false });
    await setTheme(page, "dark");
    await page.screenshot({ path: `${OUT}/${p.name}-dark.png`, fullPage: false });
    console.log(`[ok] ${p.name}`);
  }

  // -------- Phase 3：詞彙表面試 ★ 區（PM 想速查術語） --------
  await page.goto(`${DEV_URL}/glossary/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await setTheme(page, "light");
  // 捲到面試 ★ 區（約 400-700px）
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: "instant" }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/14-glossary-interview-star-light.png`, fullPage: false });
  await setTheme(page, "dark");
  await page.screenshot({ path: `${OUT}/14-glossary-interview-star-dark.png`, fullPage: false });
  console.log("[ok] 14-glossary-interview-star");

} finally {
  await browser.close();
}

console.log(`\n截圖輸出於 scripts/screenshots/agent-09/`);

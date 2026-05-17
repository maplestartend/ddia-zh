// Agent #08 非本科自學者（32 歲機械工程師轉職、freeCodeCamp 1 年）— W46 修正後重評
// 聚焦：首頁 persona router（學生 / 自學 chip）、Part 0 概覽（兩階分組）、
//       詞彙表頂部（starter 8）、30 天初學者版（必讀→可選 + 卡關預警）
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-08-rescore");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`status ${res.status}`);
} catch (err) {
  console.error(`[fatal] dev server 沒在 ${DEV_URL} 回應（${err.message}）`);
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

// 4 個 W46 解救點對應頁面
const PAGES = [
  { name: "01-home",            url: "/" },
  { name: "02-part0",           url: "/part-0/" },
  { name: "03-glossary",        url: "/glossary/" },
  { name: "04-30day-beginner",  url: "/paths/30-day-beginner" },
];

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => console.error("[pageerror]", err.message));

  // Phase 1: 全頁 light 截圖
  for (const p of PAGES) {
    await page.goto(`${DEV_URL}${p.url}`, { waitUntil: "networkidle" });
    try {
      await page.waitForSelector('.vp-doc, .ddia-hero, [class^="ddia-"]', { timeout: 8000 });
    } catch {
      console.warn(`[warn] ${p.name} 無 .vp-doc`);
    }
    await page.waitForTimeout(1100);
    await setTheme(page, "light");
    await page.screenshot({ path: `${OUT}/${p.name}-light.png`, fullPage: true });
    console.log(`[ok] ${p.name} fullpage`);
  }

  // Phase 2: 對焦截圖
  await setTheme(page, "light");

  // 2a. 首頁 hero — persona router 是否含「學生 / 自學」chip
  await page.goto(`${DEV_URL}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/i01-home-hero.png`, fullPage: false });

  // 2b. Part 0 概覽 — 兩階分組（階段 A 破冰 vs 階段 B CS 速覽）
  await page.goto(`${DEV_URL}/part-0/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  // 捲到「Part 0 章節地圖（兩階）」標題位置
  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll("h2, h3"));
    const target = headings.find((h) => (h.textContent || "").includes("章節地圖"));
    if (target) target.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/i02-part0-two-stages.png`, fullPage: false });

  // 2c. Part 0 階段 B「沒念 CS 可以先跳」明示
  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll("h2, h3"));
    const target = headings.find((h) => (h.textContent || "").includes("CS 速覽"));
    if (target) target.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/i03-part0-stage-b-skip.png`, fullPage: false });

  // 2d. 詞彙表頂部 — starter 8 card（HTTP / RPC / Latency / Fault / Replication / Sharding / EC / Idempotent）
  await page.goto(`${DEV_URL}/glossary/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/i04-glossary-starter8.png`, fullPage: false });

  // 2e. 30 天初學者頂部 — 「必讀」→「可選、卡了先跳」+「30 天讀超是正常」
  await page.goto(`${DEV_URL}/paths/30-day-beginner`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/i05-30day-top.png`, fullPage: false });

  // 2f. 30 天 Ch11 段 — 「卡關預警 box」與「可選」字樣
  await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("h2, h3, h4, p, strong"));
    const target = all.find((el) => (el.textContent || "").includes("Ch11"));
    if (target) target.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/i06-30day-ch11-optional.png`, fullPage: false });

  // 2g. 偵測各頁是否存在關鍵字串（不只看圖、用 DOM 確認）
  const checks = [
    { url: "/", needle: "自學", label: "首頁含「自學」chip" },
    { url: "/", needle: "學生", label: "首頁含「學生」chip" },
    { url: "/part-0/", needle: "非本科破冰", label: "Part 0 含「非本科破冰」標籤" },
    { url: "/part-0/", needle: "CS 速覽", label: "Part 0 含「CS 速覽」標籤" },
    { url: "/part-0/", needle: "可以先跳", label: "Part 0 含「可以先跳」明示" },
    { url: "/glossary/", needle: "HTTP", label: "詞彙表頂部含 HTTP" },
    { url: "/glossary/", needle: "Idempotent", label: "詞彙表頂部含 Idempotent" },
    { url: "/paths/30-day-beginner", needle: "可選", label: "30 天含「可選」字樣" },
    { url: "/paths/30-day-beginner", needle: "讀超", label: "30 天含「讀超是正常」" },
    { url: "/paths/30-day-beginner", needle: "卡關", label: "30 天含「卡關預警」" },
  ];
  console.log("\n--- 關鍵字串 DOM 驗證 ---");
  for (const c of checks) {
    await page.goto(`${DEV_URL}${c.url}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const found = await page.evaluate((n) => document.body.innerText.includes(n), c.needle);
    console.log(`  ${found ? "✓" : "✗"}  ${c.label}（「${c.needle}」）`);
  }

  console.log(`\n[done] 輸出於 ${OUT}`);
} finally {
  await browser.close();
}

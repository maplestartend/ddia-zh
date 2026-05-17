// Agent #06 DA→DE 視角 — W46 修正後重評截圖
// 聚焦：首頁 persona router、詞彙表 starter card、bridges/oltp-de、/paths/ 兩問題卡
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-06-rescore");
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

// W46 DA→DE 關鍵 4 頁
const PAGES = [
  { name: "01-home",       url: "/" },
  { name: "02-glossary",   url: "/glossary/" },
  { name: "03-oltp-de",    url: "/bridges/oltp-de" },
  { name: "04-paths",      url: "/paths/" },
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
    await page.waitForTimeout(1000);
    await setTheme(page, "light");
    await page.screenshot({ path: `${OUT}/${p.name}-light.png`, fullPage: true });
    console.log(`[ok] ${p.name} fullpage`);
  }

  // Phase 2: 對焦截圖
  await setTheme(page, "light");

  // 2a. 首頁 hero — persona router 是否含 DA 行
  await page.goto(`${DEV_URL}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/i01-home-hero.png`, fullPage: false });

  // 2b. 詞彙表頂部 — starter 8 card 有沒有 DE 詞
  await page.goto(`${DEV_URL}/glossary/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/i02-glossary-starter.png`, fullPage: false });

  // 2c. /paths/ 兩問題卡
  await page.goto(`${DEV_URL}/paths/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/i03-paths-top.png`, fullPage: false });

  // 2d. oltp-de 對應表
  await page.goto(`${DEV_URL}/bridges/oltp-de`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const t = document.querySelector("table");
    if (t) t.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/i04-oltp-de-table.png`, fullPage: false });

  // 2e. 詞彙表搜尋 ETL / Kafka / OLAP / 欄式 / Iceberg / Parquet / dbt / Kimball
  for (const term of ["ETL", "OLAP", "Kafka", "欄式", "Iceberg", "Parquet", "dbt", "Kimball", "Lakehouse"]) {
    await page.goto(`${DEV_URL}/glossary/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const found = await page.evaluate((t) => {
      const elements = Array.from(document.querySelectorAll("h2, h3, dt, strong, .ddia-glossary-term, [class*=glossary]"));
      const hit = elements.find((el) => (el.textContent || "").includes(t));
      if (hit) {
        hit.scrollIntoView({ behavior: "instant", block: "center" });
        return true;
      }
      return false;
    }, term);
    console.log(`  詞「${term}」: ${found ? "找到" : "未找到"}`);
  }

  console.log(`\n[done] 輸出於 ${OUT}`);
} finally {
  await browser.close();
}

// Agent #10 巡迴拍圖：美國 CS 碩士台灣留學生
// 焦點：翻譯流暢度、台灣化用語落實、與英文原書對齊
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-10");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`status ${res.status}`);
} catch (err) {
  console.error(`dev server 沒在 ${DEV_URL} 回應（${err.message}）`);
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

const PAGES = [
  { name: "01-home",                 url: "/" },
  { name: "02-part0-index",          url: "/part-0/" },
  { name: "03-part1-index",          url: "/part-1/" },
  { name: "04-part2-index",          url: "/part-2/" },
  { name: "05-part3-index",          url: "/part-3/" },
  { name: "06-ch02-data-models",     url: "/part-1/ch02-data-models" },
  { name: "07-ch03-storage",         url: "/part-1/ch03-storage" },
  { name: "08-ch05-replication",     url: "/part-2/ch05-replication" },
  { name: "09-ch07-transactions",    url: "/part-2/ch07-transactions" },
  { name: "10-ch09-consistency",     url: "/part-2/ch09-consistency" },
  { name: "11-ch11-streams",         url: "/part-3/ch11-streams" },
  { name: "12-glossary",             url: "/glossary/" },
  { name: "13-paths-index",          url: "/paths/" },
  { name: "14-paths-30day-beginner", url: "/paths/30-day-beginner" },
  { name: "15-paths-30day-summer",   url: "/paths/30-day-summer-plan" },
  { name: "16-paths-interview",      url: "/paths/interview-cheatsheet" },
  { name: "17-paths-adr",            url: "/paths/adr-template" },
  { name: "18-paths-capacity",       url: "/paths/capacity-planning" },
  { name: "19-paths-postmortems",    url: "/paths/incident-postmortems" },
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
      console.warn(`[warn] ${p.name} no .vp-doc found within 8s`);
    }
    await page.waitForTimeout(700);
    await setTheme(page, "light");
    await page.screenshot({ path: `${OUT}/${p.name}-light.png`, fullPage: true });
    console.log(`[ok] ${p.name}`);
  }
} finally {
  await browser.close();
}

console.log(`\n截圖輸出於 ${OUT}`);

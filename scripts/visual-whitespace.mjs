// Visual Audit #2 · Whitespace / Density 檢查
// 拍：首頁 / Ch7 / 進度頁 / 詞彙表（每頁含完整 fullPage 與「2 段捲動 viewport」抓區塊轉場）
// 用法：node scripts/visual-whitespace.mjs
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "visual-whitespace");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error(`status ${res.status}`);
} catch (err) {
  console.error(`✗ dev server 沒在 ${DEV_URL} 回應（${err.message}）`);
  process.exit(2);
}

const PAGES = [
  {
    name: "home",
    url: "/",
    sections: [
      { tag: "hero",       scrollTo: 0    },
      { tag: "persona",    scrollTo: 700  },
      { tag: "dashboard",  scrollTo: 1400 },
      { tag: "chapters",   scrollTo: 2300 },
      { tag: "footer",     scrollTo: 3200 },
    ],
  },
  {
    name: "ch07",
    url: "/part-2/ch07-transactions",
    sections: [
      { tag: "opener",     scrollTo: 0     },
      { tag: "tldr",       scrollTo: 800   },
      { tag: "mid-body",   scrollTo: 3200  },
      { tag: "quiz",       scrollTo: 9800  },  // 章末區（會在 fullPage 拍時看完整）
    ],
  },
  {
    name: "progress",
    url: "/progress",
    sections: [
      { tag: "head",       scrollTo: 0    },
      { tag: "mid",        scrollTo: 900  },
      { tag: "tail",       scrollTo: 1800 },
    ],
  },
  {
    name: "glossary",
    url: "/glossary/",
    sections: [
      { tag: "head",       scrollTo: 0    },
      { tag: "tail",       scrollTo: 4500 }, // 詞彙表很長
    ],
  },
];

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => console.error("[pageerror]", err.message));

  for (const p of PAGES) {
    const url = `${DEV_URL}${p.url}`;
    await page.goto(url, { waitUntil: "networkidle" });
    try {
      await page.waitForSelector('.vp-doc, .ddia-hero, [class^="ddia-"]', { timeout: 8000 });
    } catch {
      console.warn(`[warn] ${p.name} no .vp-doc within 8s`);
    }
    await page.waitForTimeout(1400); // 字型 swap + hydrate ripple

    // 強制 light（whitespace 不分明暗、只看 light、減少噪音）
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("vitepress-theme-appearance", "light");
    });
    await page.waitForTimeout(300);

    // 1. fullPage 完整捲動
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(200);
    await page.screenshot({
      path: `${OUT}/${p.name}-full.png`,
      fullPage: true,
    });
    console.log(`[ok] ${p.name}-full`);

    // 2. 區塊轉場 viewport 截圖（每段一張 900px 視窗）
    for (const sec of p.sections) {
      await page.evaluate((px) => window.scrollTo({ top: px, behavior: 'instant' }), sec.scrollTo);
      await page.waitForTimeout(250);
      await page.screenshot({
        path: `${OUT}/${p.name}-${sec.tag}.png`,
        fullPage: false,
      });
      console.log(`[ok] ${p.name}-${sec.tag} @ ${sec.scrollTo}px`);
    }
  }
} finally {
  await browser.close();
}

console.log(`\n截圖輸出於 scripts/screenshots/visual-whitespace/`);

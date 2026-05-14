// 拍每一張 <DecisionTree> / <SequenceFlow> 元件渲染、桌機/手機 × light/dark = 4 場景。
// Wave 38 起這兩個元件取代了所有 mermaid 圖、後續維護視覺改動時用這支腳本回測。
// dev server 必須先啟動（npm run dev），預設打 http://localhost:5173
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "figures");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";

// 全 18 圖 by page，每頁拍所有 .ddia-dtree-figure / .ddia-seq-figure
const PAGES = [
  { url: "/part-1/",                  prefix: "p1idx" },
  { url: "/part-1/ch03-storage",      prefix: "ch03"  },
  { url: "/part-2/",                  prefix: "p2idx" },
  { url: "/part-2/ch05-replication",  prefix: "ch05"  },
  { url: "/part-2/ch07-transactions", prefix: "ch07"  },
  { url: "/part-2/ch09-consistency",  prefix: "ch09"  },
  { url: "/part-3/",                  prefix: "p3idx" },
  { url: "/part-3/ch11-streams",      prefix: "ch11"  },
];

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile",  width: 375,  height: 800 },
];

const browser = await chromium.launch();
for (const p of PAGES) {
  for (const vp of VIEWPORTS) {
    for (const theme of ["light", "dark"]) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: theme === "dark" ? "dark" : "light",
      });
      const page = await ctx.newPage();
      await page.goto(`${DEV_URL}${p.url}`, { waitUntil: "networkidle" });
      await page.evaluate((th) => {
        document.documentElement.classList.toggle("dark", th === "dark");
        localStorage.setItem("vitepress-theme-appearance", th);
      }, theme);
      await page.waitForTimeout(400);
      const els = await page.$$(".ddia-dtree-figure, .ddia-seq-figure");
      for (let i = 0; i < els.length; i++) {
        const fname = `${p.prefix}-${i + 1}-${vp.name}-${theme}.png`;
        try {
          await els[i].scrollIntoViewIfNeeded();
          await page.waitForTimeout(150);
          await els[i].screenshot({ path: join(OUT, fname) });
        } catch (e) {
          console.error(`[err] ${fname}: ${e.message}`);
        }
      }
      console.log(`[ok] ${p.prefix} ${vp.name} ${theme}: ${els.length} figures`);
      await ctx.close();
    }
  }
}
await browser.close();
console.log(`\n✓ 全套截圖完成、輸出於 ${OUT}`);

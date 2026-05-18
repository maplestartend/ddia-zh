// 補拍：targeted scroll positions to see SequenceFlow / 三家對照表 / glossary A-Z bar 在各 viewport 真實樣子
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "visual-responsive");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "768",  width: 768,  height: 1024 },
  { name: "480",  width: 480,  height: 800 },
  { name: "380",  width: 380,  height: 720 },
];

// 用 selector 直接 scrollIntoView、確保拍到目標元件、不靠 px
const TARGETS = [
  { name: "ch05-table",    url: "/part-2/ch05-replication", sel: "table" },              // 三家對照表 (W47)
  { name: "ch09-seq",      url: "/part-2/ch09-consistency", sel: ".ddia-sequence" },     // SequenceFlow
  { name: "ch09-dt",       url: "/part-2/ch09-consistency", sel: ".ddia-decision-tree" }, // DecisionTree
  { name: "glossary-az",   url: "/glossary/",               sel: ".glossary-index, .glossary-az, [class*=glossary]" }, // A-Z bar
  { name: "paths-cards",   url: "/paths/",                  sel: ".ddia-path-cards, [class*=path-card]" }, // 6 路徑卡
  { name: "progress-dash", url: "/progress",                sel: ".ddia-dashboard" },     // Dashboard stat 卡
];

const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    for (const t of TARGETS) {
      try {
        await page.goto(`${DEV_URL}${t.url}`, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(1000);
        // 嘗試找目標 selector、scroll 到視野中央
        const handle = await page.$(t.sel.split(",")[0].trim()).catch(() => null);
        if (handle) {
          await handle.scrollIntoViewIfNeeded();
          await page.waitForTimeout(400);
        } else {
          // fallback: 試其他 selector
          for (const sel of t.sel.split(",").map(s => s.trim())) {
            const h = await page.$(sel).catch(() => null);
            if (h) { await h.scrollIntoViewIfNeeded(); break; }
          }
        }
        const out = `${OUT}/crop-v${vp.name}-${t.name}.png`;
        // 只拍 viewport，看當前視窗內容
        await page.screenshot({ path: out, fullPage: false });
        console.log(`[ok] ${vp.name} / ${t.name} ${handle ? '(found)' : '(no-sel)'}`);
      } catch (e) {
        console.warn(`[warn] ${vp.name}/${t.name} ${e.message}`);
      }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}

// 全站 12 張 Mermaid 圖視覺驗收 — Wave 35c 修法後驗收
// 桌機 1280×800 + 手機 375×800、light + dark
// 對每個圖 element 直接截圖（boundingBox 不準時退回頁面截圖）

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "mermaid-verify");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";

// 全站 12 張 Mermaid 圖（依 Wave 35c 盤點順序）
const TARGETS = [
  { id: "p1-index",    url: "/part-1/",                index: 0, label: "part-1/index.md flowchart TD（3 段獨立樹）" },
  { id: "p1-ch03",     url: "/part-1/ch03-storage",    index: 0, label: "ch03 §3.7 儲存引擎選型決策樹（graph TD）" },
  { id: "p2-index",    url: "/part-2/",                index: 0, label: "part-2/index.md flowchart TD（4 段水平樹）" },
  { id: "ch05-fig1",   url: "/part-2/ch05-replication", index: 0, label: "ch05 §5.2 同步 vs 非同步複製（sequenceDiagram）" },
  { id: "ch05-fig2",   url: "/part-2/ch05-replication", index: 1, label: "ch05 §5.6 複製拓樸決策樹（graph TD）" },
  { id: "ch07",        url: "/part-2/ch07-transactions", index: 0, label: "ch07 lost update 決策樹（graph TD）" },
  { id: "ch09-fig1",   url: "/part-2/ch09-consistency", index: 0, label: "ch09 §9.1 ABD 演算法（sequenceDiagram）" },
  { id: "ch09-fig2",   url: "/part-2/ch09-consistency", index: 1, label: "ch09 §9.4 2PC（sequenceDiagram）" },
  { id: "ch09-fig3",   url: "/part-2/ch09-consistency", index: 2, label: "ch09 §9.5 Raft state（stateDiagram-v2）" },
  { id: "ch09-fig4",   url: "/part-2/ch09-consistency", index: 3, label: "ch09 §9.7 共識選型決策樹（graph TD）" },
  { id: "p3-index",    url: "/part-3/",                index: 0, label: "part-3/index.md flowchart TD（7 子樹）" },
  { id: "ch11",        url: "/part-3/ch11-streams",    index: 0, label: "ch11 §11.4 watermark sequenceDiagram" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile",  width: 375,  height: 800 },
];

const THEMES = ["light", "dark"];

const browser = await chromium.launch();
const report = [];

for (const target of TARGETS) {
  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: theme === "dark" ? "dark" : "light",
      });
      const page = await ctx.newPage();
      await page.goto(`${DEV_URL}${target.url}`, { waitUntil: "networkidle" });

      // 切 theme（VitePress 用 localStorage + html class）
      if (theme === "dark") {
        await page.evaluate(() => {
          localStorage.setItem("vitepress-theme-appearance", "dark");
          document.documentElement.classList.add("dark");
        });
      } else {
        await page.evaluate(() => {
          localStorage.setItem("vitepress-theme-appearance", "light");
          document.documentElement.classList.remove("dark");
        });
      }
      await page.waitForTimeout(500);

      // 找到第 N 張 mermaid SVG
      const svgs = page.locator('div[class*="mermaid"] svg, .mermaid svg, svg[id*="mermaid"]');
      const count = await svgs.count();
      if (count <= target.index) {
        console.warn(`[skip] ${target.id} ${vp.name} ${theme}: only ${count} svgs, want index ${target.index}`);
        await ctx.close();
        continue;
      }

      const el = svgs.nth(target.index);
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      // 量測
      const bbox = await el.boundingBox();
      const containerInfo = await el.evaluate((svg) => {
        const container = svg.closest('div[class*="mermaid"], .mermaid');
        return {
          containerWidth: container?.getBoundingClientRect().width,
          containerScrollWidth: container?.scrollWidth,
          containerHasScrollX: container ? container.scrollWidth > container.clientWidth + 1 : false,
          svgViewBox: svg.getAttribute("viewBox"),
          svgWidth: svg.getBoundingClientRect().width,
          svgHeight: svg.getBoundingClientRect().height,
        };
      });

      // element screenshot
      const fname = `${target.id}-${vp.name}-${theme}.png`;
      try {
        await el.screenshot({ path: join(OUT, fname) });
      } catch (e) {
        // 太寬時 element.screenshot 可能失敗、退回頁面截圖（scroll 過去抓 viewport）
        await page.screenshot({ path: join(OUT, fname.replace(".png", "-fallback.png")), fullPage: false });
      }

      report.push({
        id: target.id,
        viewport: vp.name,
        theme,
        bbox: bbox ? { w: Math.round(bbox.width), h: Math.round(bbox.height) } : null,
        container: containerInfo,
      });

      await ctx.close();
    }
  }
}

await browser.close();

// 輸出總結報告
await writeFile(join(OUT, "verify-report.json"), JSON.stringify(report, null, 2));

console.log(`\n✓ 驗收完成、輸出 ${report.length} 張 PNG 到 ${OUT}`);
console.log(`\n關鍵指標（桌機 light）：`);
for (const r of report.filter(x => x.viewport === "desktop" && x.theme === "light")) {
  const c = r.container;
  const ratio = c.svgWidth && c.containerWidth ? (c.svgWidth / c.containerWidth).toFixed(2) : "?";
  const scroll = c.containerHasScrollX ? "✓ scroll" : "✗ no scroll";
  console.log(`  ${r.id.padEnd(12)}  SVG ${String(Math.round(c.svgWidth)).padStart(4)} / container ${String(Math.round(c.containerWidth)).padStart(4)}px (${ratio}×)  ${scroll}  viewBox=${c.svgViewBox}`);
}

// Visual Audit #1 — Typography / Reading Flow
// 拍關鍵頁 × 3 viewport（1440 / 1024 / 768）審：字型、行高、中文斷行、字密度
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "visual-typography");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error(`status ${res.status}`);
} catch (err) {
  console.error(`dev server not responding at ${DEV_URL}: ${err.message}`);
  process.exit(2);
}

// 6 個目標頁：覆蓋 hero / 章中 prose / 演算法表 / 詞彙表 A-Z / 30 day 計畫 / oltp-de 表格
const PAGES = [
  { name: "01-home-hero",      url: "/",                        scroll: 0    },
  { name: "02-ch05-sync",      url: "/part-2/ch05-replication", scroll: 2400 },  // §5.2 同步/非同步
  { name: "03-ch09-algo",      url: "/part-2/ch09-consistency", scroll: 7000 },  // §9.5 演算法表
  { name: "04-glossary-az",    url: "/glossary/",               scroll: 600  },  // A-Z 分組
  { name: "05-30day-week",     url: "/paths/30-day-beginner",   scroll: 1200 },  // Week 顆粒
  { name: "06-oltp-de-table",  url: "/bridges/oltp-de",         scroll: 1600 },  // 對照表
];

const VIEWPORTS = [
  { label: "1440", width: 1440, height: 900 },
  { label: "1024", width: 1024, height: 768 },
  { label: "0768", width: 768,  height: 1024 },
];

// 量測中文 prose 的 typography metrics（line-height、font-size、字數/行）
const measureTypography = async (page) => {
  return await page.evaluate(() => {
    const sample = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const s = getComputedStyle(el);
      const txt = (el.textContent || "").replace(/\s+/g, " ").trim();
      return {
        selector: sel,
        fontFamily: s.fontFamily,
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
        letterSpacing: s.letterSpacing,
        fontWeight: s.fontWeight,
        textLen: txt.length,
        firstChars: txt.slice(0, 60),
        rectW: Math.round(el.getBoundingClientRect().width),
      };
    };
    // 估每行中文字數：用內文寬 / 字級 ≈ 字數
    const proseSample = sample(".vp-doc p");
    const charsPerLine = proseSample ?
      Math.round(proseSample.rectW / parseFloat(proseSample.fontSize)) : null;
    return {
      heroH1:   sample(".VPHero h1, .ddia-hero h1, .ddia-hero__title, .name"),
      h2:       sample(".vp-doc h2"),
      h3:       sample(".vp-doc h3"),
      body:     proseSample,
      code:     sample(".vp-doc code, .vp-doc pre code"),
      tableCell: sample(".vp-doc td, .vp-doc table td"),
      charsPerLine,
    };
  });
};

const browser = await chromium.launch();
const report = [];
try {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on("pageerror", (err) => console.error("[pageerror]", err.message));

    for (const p of PAGES) {
      try {
        await page.goto(`${DEV_URL}${p.url}`, { waitUntil: "networkidle", timeout: 15000 });
      } catch (err) {
        console.warn(`[skip] ${p.name} @ ${vp.label}: ${err.message}`);
        continue;
      }
      try {
        await page.waitForSelector('.vp-doc, .ddia-hero, .VPHero, [class^="ddia-"]', { timeout: 6000 });
      } catch {
        console.warn(`[warn] ${p.name} @ ${vp.label} no main content`);
      }
      // 等字型 + LCP 穩
      await page.waitForTimeout(1500);

      if (p.scroll) {
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), p.scroll);
        await page.waitForTimeout(500);
      }

      const file = `${OUT}/${p.name}-${vp.label}.png`;
      await page.screenshot({ path: file, fullPage: false });

      // 量測（只在 1440 量、避免重複）
      if (vp.label === "1440") {
        const metrics = await measureTypography(page);
        report.push({ page: p.name, url: p.url, scroll: p.scroll, metrics });
      }
      console.log(`[ok] ${p.name} @ ${vp.label} → ${file}`);
    }
    await ctx.close();
  }

  // 寫 metrics report.json
  const fsp = await import("node:fs/promises");
  await fsp.writeFile(`${OUT}/_metrics.json`, JSON.stringify(report, null, 2), "utf8");
  console.log(`\n截圖 + metrics 輸出於 ${OUT}`);
  console.log(`metrics: ${OUT}/_metrics.json`);
} finally {
  await browser.close();
}

// Visual Audit #5 · Hierarchy / Boundary 檢查
// 拍：首頁完整 / Ch1 / paths/index / glossary / InterviewBlock 摺疊 vs 展開
// 用法：node scripts/visual-hierarchy.mjs
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "visual-hierarchy");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error(`status ${res.status}`);
} catch (err) {
  console.error(`dev server not responding at ${DEV_URL}: ${err.message}`);
  process.exit(2);
}

// 量測階層 metrics（h1/h2/h3/h4 字級、字重、上方留白；連結 vs 一般文字對比）
const measureHierarchy = async (page) => {
  return await page.evaluate(() => {
    const sample = (sel, idx = 0) => {
      const els = document.querySelectorAll(sel);
      const el = els[idx];
      if (!el) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const txt = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 50);
      return {
        sel: `${sel}[${idx}]`,
        text: txt,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        lineHeight: s.lineHeight,
        marginTop: s.marginTop,
        marginBottom: s.marginBottom,
        letterSpacing: s.letterSpacing,
        color: s.color,
        fontFamily: s.fontFamily.split(",")[0].replace(/['"]/g, "").trim(),
        rectW: Math.round(r.width),
      };
    };
    const sampleLink = (sel, idx = 0) => {
      const a = document.querySelectorAll(sel)[idx];
      if (!a) return null;
      const s = getComputedStyle(a);
      return {
        sel: `${sel}[${idx}]`,
        text: (a.textContent || "").trim().slice(0, 30),
        color: s.color,
        textDecoration: s.textDecoration,
        cursor: s.cursor,
        background: s.backgroundColor,
        borderBottom: s.borderBottom,
      };
    };
    return {
      h1: sample(".vp-doc h1") || sample("h1"),
      h2_first: sample(".vp-doc h2"),
      h2_second: sample(".vp-doc h2", 1),
      h3_first: sample(".vp-doc h3"),
      h3_second: sample(".vp-doc h3", 1),
      h4_first: sample(".vp-doc h4"),
      body: sample(".vp-doc p"),
      link_inline: sampleLink(".vp-doc p a"),
      link_chapterCard: sampleLink(".ddia-chapter-card a") || sampleLink("a.ddia-chapter-card"),
    };
  });
};

const PAGES = [
  // 1. 首頁完整：hero / persona router / Dashboard / chapter cards 三 Part
  {
    name: "01-home-full",
    url: "/",
    fullPage: true,
    measure: true,
    afterLoad: async (page) => {
      await page.waitForTimeout(1800);
    },
  },
  // 2. Ch1 完整：h1/h2/h3/h4 階層
  {
    name: "02-ch01-full",
    url: "/part-1/ch01-reliable",
    fullPage: true,
    measure: true,
  },
  {
    name: "02-ch01-hero",
    url: "/part-1/ch01-reliable",
    fullPage: false,
    scrollTo: 0,
  },
  {
    name: "02-ch01-mid",
    url: "/part-1/ch01-reliable",
    fullPage: false,
    scrollTo: 2400,
  },
  {
    name: "02-ch01-end",
    url: "/part-1/ch01-reliable",
    fullPage: false,
    scrollTo: 7000,
  },
  // 3. paths/index.md：兩問題決策卡 + 6 路徑卡 + 角色路徑表格
  {
    name: "03-paths-full",
    url: "/paths/",
    fullPage: true,
    measure: true,
  },
  {
    name: "03-paths-decision",
    url: "/paths/",
    fullPage: false,
    scrollTo: 0,
  },
  {
    name: "03-paths-cards",
    url: "/paths/",
    fullPage: false,
    scrollTo: 1400,
  },
  // 4. 詞彙表：A-Z 字母分組 + starter 8 + DE 8 + 詞條 h3 階層
  {
    name: "04-glossary-full",
    url: "/glossary/",
    fullPage: true,
    measure: true,
  },
  {
    name: "04-glossary-head",
    url: "/glossary/",
    fullPage: false,
    scrollTo: 0,
  },
  {
    name: "04-glossary-terms",
    url: "/glossary/",
    fullPage: false,
    scrollTo: 1800,
  },
  // 5. InterviewBlock 摺疊 vs 展開（章末面試題）
  {
    name: "05-interview-collapsed",
    url: "/part-1/ch01-reliable",
    fullPage: false,
    afterLoad: async (page) => {
      // 捲到章末附近找到 InterviewBlock（details 預設摺疊）
      await page.evaluate(() => {
        const details = document.querySelectorAll('details');
        for (const d of details) {
          if (d.textContent && (d.textContent.includes('面試') || d.textContent.includes('面試題'))) {
            d.scrollIntoView({ block: 'center', behavior: 'instant' });
            return;
          }
        }
        // fallback：找最後一個 details
        const last = details[details.length - 1];
        if (last) last.scrollIntoView({ block: 'center', behavior: 'instant' });
      });
      await page.waitForTimeout(500);
    },
  },
  {
    name: "05-interview-expanded",
    url: "/part-1/ch01-reliable",
    fullPage: false,
    afterLoad: async (page) => {
      await page.evaluate(() => {
        const details = document.querySelectorAll('details');
        for (const d of details) {
          if (d.textContent && (d.textContent.includes('面試') || d.textContent.includes('面試題'))) {
            d.open = true;
            d.scrollIntoView({ block: 'center', behavior: 'instant' });
            return;
          }
        }
        const last = details[details.length - 1];
        if (last) {
          last.open = true;
          last.scrollIntoView({ block: 'center', behavior: 'instant' });
        }
      });
      await page.waitForTimeout(700);
    },
  },
  // bonus: ChapterMeta tag link 變 glossary（看 Ch1 頭部 meta 列）
  {
    name: "06-chaptermeta-tags",
    url: "/part-1/ch01-reliable",
    fullPage: false,
    scrollTo: 0,
  },
];

const browser = await chromium.launch();
const report = [];
try {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => console.error("[pageerror]", err.message));

  for (const p of PAGES) {
    try {
      await page.goto(`${DEV_URL}${p.url}`, { waitUntil: "networkidle", timeout: 15000 });
    } catch (err) {
      console.warn(`[skip] ${p.name}: ${err.message}`);
      continue;
    }
    try {
      await page.waitForSelector('.vp-doc, .ddia-hero, .VPHero, [class^="ddia-"]', { timeout: 6000 });
    } catch {
      console.warn(`[warn] ${p.name} no main content`);
    }
    // 強制 light mode（hierarchy 不分明暗、減少噪音）
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("vitepress-theme-appearance", "light");
    });
    await page.waitForTimeout(1200);

    if (p.afterLoad) {
      await p.afterLoad(page);
    } else if (p.scrollTo !== undefined) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), p.scrollTo);
      await page.waitForTimeout(400);
    }

    const file = `${OUT}/${p.name}.png`;
    await page.screenshot({ path: file, fullPage: !!p.fullPage });

    if (p.measure) {
      const metrics = await measureHierarchy(page);
      report.push({ page: p.name, url: p.url, metrics });
    }
    console.log(`[ok] ${p.name} → ${file}`);
  }

  const fsp = await import("node:fs/promises");
  await fsp.writeFile(`${OUT}/_metrics.json`, JSON.stringify(report, null, 2), "utf8");
  console.log(`\n截圖 + metrics 輸出於 ${OUT}`);
} finally {
  await browser.close();
}

// 拍局部高解析度截圖，看中文斷行細節（不是 fullPage）
// 用法：node scripts/screenshot-wrap-check.mjs [tag]
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const tag = args[0] || "wrap";
const OUT = resolve("scripts/screenshots");
await mkdir(OUT, { recursive: true });

const PAGES = [
  { name: "ch07-lost-update", url: "/part-2/ch07-transactions", waitSelector: "h3:has-text(\"Lost Update\")", scrollSelector: "h3:has-text(\"Lost Update 問題\")" },
  { name: "ch09-consensus",    url: "/part-2/ch09-consistency", waitSelector: "h2:has-text(\"9.5\")", scrollSelector: "h3:has-text(\"共識問題\")" },
  { name: "glossary-top",      url: "/glossary/", waitSelector: ".vp-doc", scrollSelector: ".vp-doc > p" },
  { name: "home-disclaimer",   url: "/", waitSelector: ".ddia-hero-disclaimer", scrollSelector: ".ddia-hero-disclaimer" },
];

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
  const page = await ctx.newPage();
  for (const p of PAGES) {
    await page.goto(`http://localhost:5173${p.url}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    try {
      const el = page.locator(p.scrollSelector).first();
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
    } catch (e) {
      console.warn(`[warn] could not scroll to ${p.scrollSelector}: ${e.message}`);
    }
    await page.screenshot({ path: `${OUT}/${tag}-${p.name}.png`, fullPage: false });
    console.log(`[ok] ${p.name}`);
  }
} finally {
  await browser.close();
}

// 1024 viewport 細部測：Ch5 內文行寬實測 + home Part II 三欄密度
import { chromium } from "playwright";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots");

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 800 } });
  const page = await ctx.newPage();

  // Ch5 行寬 — scroll 到 TLDR 之後
  await page.goto("http://localhost:5173/part-2/ch05-replication", { waitUntil: "networkidle" });
  await page.waitForSelector('.vp-doc', { timeout: 8000 });
  await page.waitForTimeout(1500);

  // 量測 .vp-doc 內第一個 p 的寬度與每行字數
  const dims = await page.evaluate(() => {
    const docs = document.querySelectorAll('.vp-doc');
    const r = {};
    for (const d of docs) {
      const ps = d.querySelectorAll('p');
      for (const p of ps) {
        if (p.innerText && p.innerText.length > 50) {
          const rect = p.getBoundingClientRect();
          r.docWidth = d.getBoundingClientRect().width;
          r.pWidth = rect.width;
          r.fontSize = window.getComputedStyle(p).fontSize;
          r.firstParaSample = p.innerText.slice(0, 80);
          // 估每行字數：用 canvas 量中文「測」的寬度
          const ctx = document.createElement('canvas').getContext('2d');
          ctx.font = window.getComputedStyle(p).font;
          const charW = ctx.measureText('測').width;
          r.charWidth = charW;
          r.charsPerLine = Math.floor(rect.width / charW);
          break;
        }
      }
      if (r.pWidth) break;
    }
    return r;
  });
  console.log("Ch5 @1024:", JSON.stringify(dims, null, 2));

  await page.screenshot({ path: join(OUT, "ch05-1024-viewport.png"), fullPage: false });

  // scroll 到 TLDR 後第一段內文
  await page.evaluate(() => {
    const tldr = document.querySelector('.ddia-tldr');
    if (tldr) {
      const r = tldr.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + r.bottom - 100, behavior: 'instant' });
    } else {
      window.scrollTo({ top: 600, behavior: 'instant' });
    }
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(OUT, "ch05-1024-content.png"), fullPage: false });

  // home Part II 3 欄區
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.waitForSelector('.ddia-hero', { timeout: 8000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const parts = document.querySelectorAll('.ddia-part-header, .ddia-chapter-grid');
    let target = null;
    for (const el of parts) {
      const t = el.innerText || el.textContent || '';
      if (t.includes('分散式') || t.includes('PART II')) { target = el; break; }
    }
    if (target) {
      const r = target.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + r.top - 100, behavior: 'instant' });
    } else {
      window.scrollTo({ top: 1400, behavior: 'instant' });
    }
  });
  await page.waitForTimeout(220);
  await page.screenshot({ path: join(OUT, "home-1024-partII.png"), fullPage: false });

  await ctx.close();
} finally {
  await browser.close();
}

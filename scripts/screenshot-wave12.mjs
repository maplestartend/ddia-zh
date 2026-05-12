// Wave 12 視覺驗證：拍 sidebar Part 分組 + 章末學習循環 block
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const tag = process.argv[2] || "wave12";
const OUT = resolve("scripts/screenshots");
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // 1. ch01 sidebar 全 Part 分組（左側 sidebar 應顯示 Part 0/I/II/III、I expand 其他 collapsed）
  await page.goto("http://localhost:5173/part-1/ch01-reliable", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${tag}-ch01-sidebar.png`, fullPage: false });
  console.log("[ok] ch01-sidebar");

  // 2. ch05 章末學習循環 block + sidebar Part II expanded
  await page.goto("http://localhost:5173/part-2/ch05-replication", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const el = document.querySelector(".ddia-chapter-loop");
    if (el) el.scrollIntoView({ block: "center", behavior: "instant" });
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${tag}-ch05-loop.png`, fullPage: false });
  console.log("[ok] ch05-loop");

  // 3. Part 0 ch (p0-basics) sidebar 應顯示 Part 0 expanded
  await page.goto("http://localhost:5173/part-0/basics", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${tag}-p0-sidebar.png`, fullPage: false });
  console.log("[ok] p0-sidebar");

  // 4. ch12 (最後一章) 學習循環 block 應沒有「下一章」按鈕
  await page.goto("http://localhost:5173/part-3/ch12-future", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const el = document.querySelector(".ddia-chapter-loop");
    if (el) el.scrollIntoView({ block: "center", behavior: "instant" });
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${tag}-ch12-loop.png`, fullPage: false });
  console.log("[ok] ch12-loop");
} finally {
  await browser.close();
}

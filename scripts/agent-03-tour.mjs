// Agent #03 巡迴拍圖：Bootcamp 轉職者視角
// 目標頁清單對齊任務 brief；額外做 Quiz / InterviewBlock / Glossary A-Z 互動
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-03");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(2000) });
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
  await page.waitForTimeout(200);
};

const PAGES = [
  { name: "01-home",                 url: "/" },
  { name: "02-paths",                url: "/paths/" },
  { name: "03-interview-cheatsheet", url: "/paths/interview-cheatsheet" },
  { name: "04-progress",             url: "/progress" },
  { name: "05-glossary",             url: "/glossary/" },
  { name: "06-ch01-reliable",        url: "/part-1/ch01-reliable" },
  { name: "07-ch02-data-models",     url: "/part-1/ch02-data-models" },
  { name: "08-ch03-storage",         url: "/part-1/ch03-storage" },
  { name: "09-ch05-replication",     url: "/part-2/ch05-replication" },
  { name: "10-ch06-partitioning",    url: "/part-2/ch06-partitioning" },
  { name: "11-adr-template",         url: "/paths/adr-template" },
  { name: "12-incident-postmortems", url: "/paths/incident-postmortems" },
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
    await page.waitForTimeout(1000);

    await setTheme(page, "light");
    await page.screenshot({ path: `${OUT}/${p.name}-light.png`, fullPage: true });
    await setTheme(page, "dark");
    await page.screenshot({ path: `${OUT}/${p.name}-dark.png`, fullPage: true });
    console.log(`[ok] ${p.name}`);
  }

  // ====== 互動 1：Quiz on ch01 ======
  console.log("\n[interaction] Quiz on ch01");
  await page.goto(`${DEV_URL}/part-1/ch01-reliable`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await setTheme(page, "light");
  // 滾到頁面後段找 Quiz
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight - 2400));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/13-ch01-quiz-before.png`, fullPage: false });
  // 嘗試點第一題的第一個選項
  const firstOption = await page.$('.ddia-quiz input[type="radio"], .ddia-quiz button[role="radio"], .ddia-quiz label');
  if (firstOption) {
    await firstOption.click().catch(() => {});
    await page.waitForTimeout(300);
    // 找 submit / 揭曉答案的 button
    const submitBtn = await page.$('.ddia-quiz button:not([disabled])');
    if (submitBtn) {
      await submitBtn.click().catch(() => {});
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: `${OUT}/14-ch01-quiz-after.png`, fullPage: false });
    console.log("[ok] quiz interaction");
  } else {
    console.warn("[warn] quiz radio not found");
  }

  // ====== 互動 2：InterviewBlock 摺疊 ======
  console.log("\n[interaction] InterviewBlock on ch05");
  await page.goto(`${DEV_URL}/part-2/ch05-replication`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await setTheme(page, "light");
  // 嘗試找 details 元素或 .ddia-interview
  const details = await page.$$('details');
  console.log(`  found ${details.length} <details>`);
  if (details.length > 0) {
    // 滾到第一個 details
    await details[0].scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/15-ch05-interview-closed.png`, fullPage: false });
    await details[0].evaluate((el) => el.setAttribute('open', ''));
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/16-ch05-interview-open.png`, fullPage: false });
    console.log("[ok] interview block toggled");
  }

  // ====== 互動 3：Glossary A-Z sticky ======
  console.log("\n[interaction] Glossary A-Z");
  await page.goto(`${DEV_URL}/glossary/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await setTheme(page, "light");
  await page.screenshot({ path: `${OUT}/17-glossary-top.png`, fullPage: false });
  // 捲到中段看 sticky A-Z 是否常駐
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/18-glossary-scrolled.png`, fullPage: false });
  // 點 A-Z 索引中的一個字母（例如 P/Q/R）
  const azLink = await page.$('a[href*="#partition"], a[href*="#quorum"], a[href*="#replication"]');
  if (azLink) {
    await azLink.click().catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/19-glossary-jumped.png`, fullPage: false });
    console.log("[ok] glossary jump");
  } else {
    console.warn("[warn] no A-Z target link found");
  }

  // ====== 互動 4：interview cheatsheet 細部 ======
  console.log("\n[interaction] interview cheatsheet scroll");
  await page.goto(`${DEV_URL}/paths/interview-cheatsheet`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await setTheme(page, "light");
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/20-cheatsheet-mid.png`, fullPage: false });
  await page.evaluate(() => window.scrollTo(0, 3000));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/21-cheatsheet-bottom.png`, fullPage: false });
  console.log("[ok] cheatsheet scroll");
} finally {
  await browser.close();
}

console.log(`\n截圖輸出於 ${OUT}`);

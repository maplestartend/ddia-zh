// Agent #07 巡迴拍圖：分散式系統實驗室碩二、論文做 consensus protocol
// 焦點：ch8/ch9/ch11 學術正確性、Quiz 共識題、詞彙表 linearizability/serializability/quorum/consensus
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-07");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(3000) });
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
  await page.waitForTimeout(250);
};

const PAGES = [
  { name: "01-home",                 url: "/" },
  { name: "02-ch08-trouble",         url: "/part-2/ch08-trouble" },
  { name: "03-ch09-consistency",     url: "/part-2/ch09-consistency" },
  { name: "04-ch11-streams",         url: "/part-3/ch11-streams" },
  { name: "05-ch02-data-models",     url: "/part-1/ch02-data-models" },
  { name: "06-glossary",             url: "/glossary/" },
  { name: "07-progress",             url: "/progress" },
  { name: "08-bridges-oltp-de",      url: "/bridges/oltp-de" },
  { name: "09-paths",                url: "/paths/" },
  { name: "10-interview-cheatsheet", url: "/paths/interview-cheatsheet" },
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
    await page.waitForTimeout(900);
    await setTheme(page, "light");
    await page.screenshot({ path: `${OUT}/${p.name}-light.png`, fullPage: true });
    await setTheme(page, "dark");
    await page.screenshot({ path: `${OUT}/${p.name}-dark.png`, fullPage: true });
    console.log(`[ok] ${p.name}`);
  }

  // ====== 互動 1：ch9 Quiz — 共識題 ======
  console.log("\n[interaction] Quiz on ch09");
  await page.goto(`${DEV_URL}/part-2/ch09-consistency`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await setTheme(page, "light");
  // 滾到 Quiz 區域
  await page.evaluate(() => {
    const quiz = document.querySelector('.ddia-quiz, [class*="quiz"]');
    if (quiz) quiz.scrollIntoView({ block: "start" });
    else window.scrollTo(0, document.body.scrollHeight - 2400);
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/11-ch09-quiz-overview.png`, fullPage: false });

  // 逐題作答：選每題第一個選項 → 提交 → 截圖
  const options = await page.$$('.ddia-quiz input[type="radio"], .ddia-quiz button[role="radio"], .ddia-quiz label');
  console.log(`  found ${options.length} quiz option(s)`);
  if (options.length > 0) {
    // 點所有第一題的第一個選項（label）
    for (let i = 0; i < Math.min(options.length, 12); i++) {
      try { await options[i].click({ timeout: 800 }); } catch {}
      await page.waitForTimeout(120);
    }
    await page.screenshot({ path: `${OUT}/12-ch09-quiz-selected.png`, fullPage: false });
    // submit
    const submitBtn = await page.$('.ddia-quiz button:not([disabled])');
    if (submitBtn) {
      await submitBtn.click().catch(() => {});
      await page.waitForTimeout(800);
    }
    await page.screenshot({ path: `${OUT}/13-ch09-quiz-result.png`, fullPage: true });
    console.log("[ok] ch09 quiz interaction");
  }

  // ====== 互動 2：詞彙表搜尋 linearizability ======
  console.log("\n[interaction] Glossary search consensus terms");
  await page.goto(`${DEV_URL}/glossary/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await setTheme(page, "light");
  // 截 anchor 跳轉到 linearizability
  for (const slug of ["linearizability", "serializability", "quorum", "consensus"]) {
    const link = await page.$(`a[href*="#${slug}"]`);
    if (link) {
      await link.click().catch(() => {});
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/14-glossary-${slug}.png`, fullPage: false });
      console.log(`[ok] glossary jump ${slug}`);
    } else {
      console.warn(`[warn] no link for #${slug}`);
    }
  }

  // ====== 互動 3：ch8/ch9 中段內容（FLP / Raft / Paxos / linearizability vs serializability）======
  console.log("\n[interaction] ch08 scroll");
  await page.goto(`${DEV_URL}/part-2/ch08-trouble`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await setTheme(page, "light");
  await page.evaluate(() => window.scrollTo(0, 2000));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/15-ch08-mid.png`, fullPage: false });
  await page.evaluate(() => window.scrollTo(0, 4500));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/16-ch08-late.png`, fullPage: false });

  console.log("\n[interaction] ch09 scroll deep");
  await page.goto(`${DEV_URL}/part-2/ch09-consistency`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await setTheme(page, "light");
  for (const [i, y] of [[0, 1200], [1, 2800], [2, 4500], [3, 6500]]) {
    await page.evaluate((Y) => window.scrollTo(0, Y), y);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/17-ch09-scroll-${i}.png`, fullPage: false });
  }
} finally {
  await browser.close();
}

console.log(`\n截圖輸出於 ${OUT}`);

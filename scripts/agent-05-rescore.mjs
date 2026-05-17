// Agent #05 後端新人 — W46 修正後重評截圖
// 聚焦：Ch7 Quiz 難度標記（◆ 面試）/ Ch9 Quiz / 詞彙表 ★ 區
// 第一輪痛點：★ 與面試標記混用 → W46 已把 Quiz 面試 label 加 ◆ prefix
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-05-rescore");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`status ${res.status}`);
} catch (err) {
  console.error(`[fatal] dev server 沒回應 ${DEV_URL}: ${err.message}`);
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

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => console.error("[pageerror]", err.message));

  // --- 1. Ch7 Quiz 區（含難度標記）---
  console.log("\n[1] Ch7 Quiz");
  await page.goto(`${DEV_URL}/part-2/ch07-transactions`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const quiz = document.querySelector(".ddia-quiz");
    if (quiz) quiz.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(500);

  const ch07Diff = await page.evaluate(() => {
    const diffs = Array.from(document.querySelectorAll(".ddia-quiz-difficulty"));
    return diffs.map(d => ({
      text: d.textContent?.trim() || "",
      cls: d.className,
    }));
  });
  console.log("  Ch7 難度 tags:", JSON.stringify(ch07Diff, null, 2));

  await setTheme(page, "light");
  await page.screenshot({ path: `${OUT}/01-ch07-quiz-light.png`, fullPage: false });
  await setTheme(page, "dark");
  await page.screenshot({ path: `${OUT}/01-ch07-quiz-dark.png`, fullPage: false });

  // 拉近看面試 chip（找第一個 is-interview）
  await setTheme(page, "light");
  const ch07HasInterview = await page.evaluate(() => {
    const el = document.querySelector(".ddia-quiz-difficulty.is-interview");
    if (!el) return false;
    el.scrollIntoView({ behavior: "instant", block: "center" });
    return true;
  });
  await page.waitForTimeout(400);
  if (ch07HasInterview) {
    await page.screenshot({ path: `${OUT}/02-ch07-interview-chip-closeup.png`, fullPage: false });
    console.log("  Ch7 interview chip closeup 拍到");
  } else {
    console.log("  Ch7 沒有 is-interview chip");
  }

  // --- 2. Ch9 Quiz 區 ---
  console.log("\n[2] Ch9 Quiz");
  await page.goto(`${DEV_URL}/part-2/ch09-consistency`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const quiz = document.querySelector(".ddia-quiz");
    if (quiz) quiz.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(500);

  const ch09Info = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".ddia-quiz-item, [class*=quiz-item]"));
    const diffs = Array.from(document.querySelectorAll(".ddia-quiz-difficulty"));
    return {
      questionCount: items.length,
      difficultyTags: diffs.map(d => d.textContent?.trim() || ""),
    };
  });
  console.log("  Ch9 題數:", ch09Info.questionCount, "難度 tags:", ch09Info.difficultyTags);

  await setTheme(page, "light");
  await page.screenshot({ path: `${OUT}/03-ch09-quiz-light.png`, fullPage: true });
  await setTheme(page, "dark");
  await page.screenshot({ path: `${OUT}/03-ch09-quiz-dark.png`, fullPage: true });

  // --- 3. 詞彙表 ★ 區（看 ★ 與 ◆ 視覺差異）---
  console.log("\n[3] Glossary ★");
  await page.goto(`${DEV_URL}/glossary/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  await setTheme(page, "light");
  await page.screenshot({ path: `${OUT}/04-glossary-top-light.png`, fullPage: false });

  // 把 ★ 7 條快速跳轉區捲進可視
  const starInfo = await page.evaluate(() => {
    const stars = Array.from(document.querySelectorAll(".ddia-glossary-stars-link, [class*=glossary-stars]"));
    if (stars[0]?.parentElement) {
      stars[0].parentElement.scrollIntoView({ behavior: "instant", block: "center" });
    }
    return {
      count: stars.length,
      samples: stars.slice(0, 8).map(s => s.textContent?.trim().slice(0, 40)),
    };
  });
  console.log("  ★ links count:", starInfo.count, "samples:", starInfo.samples);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/05-glossary-stars-light.png`, fullPage: false });
  await setTheme(page, "dark");
  await page.screenshot({ path: `${OUT}/05-glossary-stars-dark.png`, fullPage: false });

  // 詞彙表 starter 8 card（W46 補入門詞）
  await setTheme(page, "light");
  await page.evaluate(() => {
    const cards = document.querySelector('.ddia-glossary-starter, [class*=starter]');
    if (cards) cards.scrollIntoView({ behavior: "instant", block: "center" });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/06-glossary-starter-cards.png`, fullPage: false });

  console.log(`\n[done] 輸出於 ${OUT}`);
} finally {
  await browser.close();
}

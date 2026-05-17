// Agent #02 操作補拍 — Quiz 全做 + Progress + Glossary star
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-02");
await mkdir(OUT, { recursive: true });
const DEV_URL = "http://localhost:5173";

const setTheme = async (page, theme) => {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("vitepress-theme-appearance", t);
  }, theme);
  await page.waitForTimeout(200);
};

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", e => console.error("[pageerror]", e.message));

  // ─── ch02 Quiz 操作 ───
  console.log("[ops] ch02 Quiz");
  await page.goto(`${DEV_URL}/part-1/ch02-data-models`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await setTheme(page, "light");

  // 捲到 quiz
  await page.evaluate(() => {
    const quiz = document.querySelector(".ddia-quiz");
    if (quiz) quiz.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/op-01-quiz-before.png`, fullPage: false });

  // 故意全選 A 看「答錯」反饋
  const radioCount = await page.evaluate(() => {
    const qs = document.querySelectorAll(".ddia-quiz-question");
    let clicked = 0;
    qs.forEach((q, qi) => {
      const parent = q.parentElement;
      const firstRadio = parent.querySelector('input[type="radio"]');
      if (firstRadio) { firstRadio.click(); clicked++; }
    });
    return clicked;
  });
  console.log(`  全選 A: ${radioCount} 題`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/op-02-quiz-allA.png`, fullPage: false });

  // 交卷
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const sub = btns.find(b => /交卷/.test(b.textContent || ""));
    if (sub) sub.click();
  });
  await page.waitForTimeout(800);
  // 捲到 quiz 頂端拍完整反饋
  await page.evaluate(() => {
    const quiz = document.querySelector(".ddia-quiz");
    if (quiz) quiz.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/op-03-quiz-wrongFeedback.png`, fullPage: true });

  // 重新作答 + 全選正解
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const retry = btns.find(b => /重新作答/.test(b.textContent || ""));
    if (retry) retry.click();
  });
  await page.waitForTimeout(500);

  // 抓每題正解 index 從 vue data 不易取,改 click 答案標記在 explanation 已隱藏 — 改採 click 對應 index
  // 直接從 ddia-quiz-explanation 的 "正解：A/B/C/D" 在 retry 前已消失,我們改從 source 抓
  // 簡單做法: 把全部選最後一個 option 看是否更綠
  await page.evaluate(() => {
    const qs = document.querySelectorAll(".ddia-quiz-question");
    qs.forEach((q) => {
      const parent = q.parentElement;
      const radios = parent.querySelectorAll('input[type="radio"]');
      if (radios.length > 1) radios[radios.length - 1].click();
    });
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const sub = btns.find(b => /交卷/.test(b.textContent || ""));
    if (sub) sub.click();
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector(".ddia-quiz").scrollIntoView({ block: "start" }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/op-04-quiz-secondAttempt.png`, fullPage: true });

  // ─── Progress 標記 ───
  console.log("[ops] Progress 標記");
  await page.evaluate(() => {
    const p = document.querySelector(".ddia-progress, [class*='progress-marker'], [class*='Progress']");
    if (p) p.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/op-05-progress-before.png`, fullPage: false });
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const mark = btns.find(b => /標記.*讀|讀完|完成本章|mark/i.test(b.textContent || ""));
    if (mark) { mark.click(); return mark.textContent.trim(); }
    return "no-mark-btn";
  }).then(r => console.log(`  click: ${r}`));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/op-06-progress-after.png`, fullPage: false });

  // 去 progress 頁看更新
  await page.goto(`${DEV_URL}/progress`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/op-07-progress-page-afterMark.png`, fullPage: true });

  // ─── Glossary ★ ───
  console.log("[ops] Glossary ★");
  await page.goto(`${DEV_URL}/glossary/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/op-08-glossary-top.png`, fullPage: false });

  const starInfo = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll(".ddia-glossary-stars-link"));
    return { count: links.length, samples: links.slice(0, 3).map(a => a.textContent.trim()) };
  });
  console.log(`  ★ links: ${starInfo.count}, samples: ${JSON.stringify(starInfo.samples)}`);

  if (starInfo.count > 0) {
    await page.locator(".ddia-glossary-stars-link").first().hover();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/op-09-glossary-star-hover.png`, fullPage: false });
    await page.locator(".ddia-glossary-stars-link").first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${OUT}/op-10-glossary-star-jumped.png`, fullPage: true });
  }

  // 點 G term hover tooltip — 找一個章節內的 G 元件
  await page.goto(`${DEV_URL}/part-0/metrics`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const gTermInfo = await page.evaluate(() => {
    const terms = document.querySelectorAll(".ddia-glossary-term, [class*='glossary-term']");
    return { count: terms.length, first: terms[0]?.textContent?.slice(0, 30) };
  });
  console.log(`  G term: ${gTermInfo.count}, first=${gTermInfo.first}`);
  if (gTermInfo.count > 0) {
    const t = page.locator(".ddia-glossary-term, [class*='glossary-term']").first();
    await t.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await t.hover();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/op-11-gterm-tooltip.png`, fullPage: false });
  }

} finally {
  await browser.close();
}
console.log("[done]");

// Agent #02 大二資工生 tour — 拍指定頁面 + 實際操作 Quiz / Progress / Glossary
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-02");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`status ${res.status}`);
} catch (err) {
  console.error(`[fatal] dev server 沒在 ${DEV_URL} 回應（${err.message}）`);
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
  { name: "01-home",        url: "/" },
  { name: "02-paths",       url: "/paths/" },
  { name: "03-30day-beg",   url: "/paths/30-day-beginner" },
  { name: "04-progress",    url: "/progress" },
  { name: "05-glossary",    url: "/glossary/" },
  { name: "06-part0",       url: "/part-0/" },
  { name: "07-p0-metrics",  url: "/part-0/metrics" },
  { name: "08-p0-os",       url: "/part-0/os" },
  { name: "09-ch01",        url: "/part-1/ch01-reliable" },
  { name: "10-ch02",        url: "/part-1/ch02-data-models" },
  { name: "11-oltp-de",     url: "/bridges/oltp-de" },
];

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => console.error("[pageerror]", err.message));

  // Pass 1: 拍每頁 light + dark
  for (const p of PAGES) {
    await page.goto(`${DEV_URL}${p.url}`, { waitUntil: "networkidle" });
    try {
      await page.waitForSelector('.vp-doc, .ddia-hero, [class^="ddia-"]', { timeout: 8000 });
    } catch {
      console.warn(`[warn] ${p.name} 無 .vp-doc`);
    }
    await page.waitForTimeout(1200);

    await setTheme(page, "light");
    await page.screenshot({ path: `${OUT}/${p.name}-light.png`, fullPage: true });

    await setTheme(page, "dark");
    await page.screenshot({ path: `${OUT}/${p.name}-dark.png`, fullPage: true });

    console.log(`[ok] ${p.name}`);
  }

  // Pass 2: ch02 實際操作 Quiz 全做完 + 答對答錯
  console.log("\n[ops] ch02 Quiz 操作中...");
  await setTheme(page, "light");
  await page.goto(`${DEV_URL}/part-1/ch02-data-models`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // 捲到 quiz
  await page.evaluate(() => {
    const quiz = document.querySelector(".ddia-quiz, [class*=quiz]");
    if (quiz) quiz.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/op-01-quiz-before.png`, fullPage: false });

  // 隨機點每題第一個選項看回饋（不一定對,測「答錯」反饋）
  const wrongSubmits = await page.evaluate(() => {
    let clicked = 0;
    const questions = document.querySelectorAll(".ddia-quiz .ddia-quiz-question, .quiz-question, [class*=quiz-question]");
    questions.forEach(q => {
      const firstOpt = q.querySelector("button, label, input[type=radio]");
      if (firstOpt) { firstOpt.click(); clicked++; }
    });
    return clicked;
  });
  console.log(`  點了 ${wrongSubmits} 個選項`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/op-02-quiz-firstpick.png`, fullPage: false });

  // 嘗試 submit
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const sub = btns.find(b => /送出|提交|submit|看答案|核對/.test(b.textContent || ""));
    if (sub) sub.click();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/op-03-quiz-submitted.png`, fullPage: true });

  // Pass 3: Progress 標記已讀
  console.log("[ops] 標記已讀");
  await page.evaluate(() => {
    const prog = document.querySelector(".ddia-progress, [class*=progress]");
    if (prog) prog.scrollIntoView({ behavior: "instant", block: "center" });
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const mark = btns.find(b => /標記|已讀|完成|mark|done/i.test(b.textContent || ""));
    if (mark) mark.click();
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/op-04-progress-marked.png`, fullPage: false });

  // Pass 4: Glossary hover ★ 條目
  console.log("[ops] Glossary hover");
  await page.goto(`${DEV_URL}/glossary/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/op-05-glossary-top.png`, fullPage: false });

  // 嘗試找 ★ link 並 hover
  const starInfo = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a, button"));
    const stars = links.filter(a => /★|⭐/.test(a.textContent || ""));
    return { count: stars.length, first: stars[0]?.textContent?.slice(0, 40) };
  });
  console.log(`  找到 ★ 條目: ${starInfo.count} (first=${starInfo.first})`);
  if (starInfo.count > 0) {
    const star = await page.locator("a, button").filter({ hasText: /★|⭐/ }).first();
    await star.hover();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/op-06-glossary-star-hover.png`, fullPage: false });
    await star.click().catch(() => {});
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/op-07-glossary-star-jumped.png`, fullPage: true });
  }

} finally {
  await browser.close();
}

console.log(`\n[done] 輸出於 ${OUT}`);

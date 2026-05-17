// Agent #06 DA→DE 視角 tour — 拍 OLTP↔DE bridge + Part 3 + ch3 + glossary，並操作 ch11 Quiz
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-06");
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
  { name: "01-home",       url: "/" },
  { name: "02-oltp-de",    url: "/bridges/oltp-de" },
  { name: "03-part3",      url: "/part-3/" },
  { name: "04-ch10-batch", url: "/part-3/ch10-batch" },
  { name: "05-ch11-stream",url: "/part-3/ch11-streams" },
  { name: "06-ch12-future",url: "/part-3/ch12-future" },
  { name: "07-ch03-store", url: "/part-1/ch03-storage" },
  { name: "08-glossary",   url: "/glossary/" },
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
    await page.waitForTimeout(1000);

    await setTheme(page, "light");
    await page.screenshot({ path: `${OUT}/${p.name}-light.png`, fullPage: true });

    await setTheme(page, "dark");
    await page.screenshot({ path: `${OUT}/${p.name}-dark.png`, fullPage: true });

    console.log(`[ok] ${p.name}`);
  }

  // Pass 2: oltp-de 對應表特寫
  console.log("\n[ops] oltp-de 對應表特寫");
  await setTheme(page, "light");
  await page.goto(`${DEV_URL}/bridges/oltp-de`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const t = document.querySelector("table");
    if (t) t.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/op-01-bridge-table.png`, fullPage: false });

  // Pass 3: ch3 列存 vs 欄存區塊截圖
  console.log("[ops] ch3 列存 vs 欄存");
  await page.goto(`${DEV_URL}/part-1/ch03-storage#_3-6-oltp-vs-olap`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/op-02-ch03-row-vs-col.png`, fullPage: false });

  // Pass 4: ch11 Quiz 操作
  console.log("[ops] ch11 stream Quiz 操作");
  await page.goto(`${DEV_URL}/part-3/ch11-streams`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const quiz = document.querySelector(".ddia-quiz, [class*=quiz]");
    if (quiz) quiz.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/op-03-ch11-quiz-before.png`, fullPage: false });

  const picked = await page.evaluate(() => {
    let clicked = 0;
    const questions = document.querySelectorAll(".ddia-quiz .ddia-quiz-question, .quiz-question, [class*=quiz-question]");
    questions.forEach((q) => {
      const opts = q.querySelectorAll("button, label, input[type=radio]");
      // 故意選最後一個（更可能答錯）
      const last = opts[opts.length - 1];
      if (last) { last.click(); clicked++; }
    });
    return clicked;
  });
  console.log(`  點了 ${picked} 個選項（故意選最後一個）`);
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const sub = btns.find((b) => /送出|提交|submit|看答案|核對/.test(b.textContent || ""));
    if (sub) sub.click();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/op-04-ch11-quiz-submitted.png`, fullPage: true });

  // Pass 5: glossary 搜尋 DE 詞 — ETL / OLAP / Kafka / 欄式
  console.log("[ops] glossary ETL/OLAP/Kafka/欄式 出現位置");
  await page.goto(`${DEV_URL}/glossary/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  for (const term of ["ETL", "OLAP", "Kafka", "欄式", "Lambda", "CDC"]) {
    const found = await page.evaluate((t) => {
      const elements = Array.from(document.querySelectorAll("h2, h3, dt, strong"));
      const hit = elements.find((el) => (el.textContent || "").includes(t));
      if (hit) {
        hit.scrollIntoView({ behavior: "instant", block: "center" });
        return true;
      }
      return false;
    }, term);
    console.log(`  詞「${term}」: ${found ? "找到" : "未直接找到"}`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/op-05-glossary-${term}.png`, fullPage: false });
  }

  // Pass 6: ch10 batch — MapReduce / Spark / Reduce-side join 等區塊
  console.log("[ops] ch10 batch 結構掃描");
  await page.goto(`${DEV_URL}/part-3/ch10-batch`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const h2s = Array.from(document.querySelectorAll("h2"));
    console.log("[ch10 h2s]", h2s.map((h) => h.textContent).join(" | "));
  });
  await page.screenshot({ path: `${OUT}/op-06-ch10-top.png`, fullPage: false });

} finally {
  await browser.close();
}

console.log(`\n[done] 輸出於 ${OUT}`);

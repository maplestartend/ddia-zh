// Agent #05 後端新人 (1 yr Node.js + Postgres + Redis) tour
// — 拍 Part 2 ch5-9 重點 + ch7/ch9 Quiz 全做完 + Progress 標記 ch7
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-05");
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
  { name: "01-home",          url: "/" },
  { name: "02-paths",         url: "/paths/" },
  { name: "03-interview",     url: "/paths/interview-cheatsheet" },
  { name: "04-ch03-storage",  url: "/part-1/ch03-storage" },
  { name: "05-ch05-replic",   url: "/part-2/ch05-replication" },
  { name: "06-ch06-partit",   url: "/part-2/ch06-partitioning" },
  { name: "07-ch07-tx",       url: "/part-2/ch07-transactions" },
  { name: "08-ch08-trouble",  url: "/part-2/ch08-trouble" },
  { name: "09-ch09-consist",  url: "/part-2/ch09-consistency" },
  { name: "10-glossary",      url: "/glossary/" },
  { name: "11-oltp-de",       url: "/bridges/oltp-de" },
  { name: "12-progress",      url: "/progress" },
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
    await page.waitForTimeout(900);

    await setTheme(page, "light");
    await page.screenshot({ path: `${OUT}/${p.name}-light.png`, fullPage: true });

    await setTheme(page, "dark");
    await page.screenshot({ path: `${OUT}/${p.name}-dark.png`, fullPage: true });

    console.log(`[ok] ${p.name}`);
  }

  // Pass 2: ch05 SequenceFlow / DecisionTree close-ups
  await setTheme(page, "light");
  for (const ch of [
    { name: "ch05", url: "/part-2/ch05-replication" },
    { name: "ch07", url: "/part-2/ch07-transactions" },
    { name: "ch09", url: "/part-2/ch09-consistency" },
  ]) {
    await page.goto(`${DEV_URL}${ch.url}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    const found = await page.evaluate(() => {
      const sf = document.querySelector('.ddia-seq-figure');
      const dt = document.querySelector('.ddia-decision-tree, [class*=decision-tree]');
      const target = sf || dt;
      if (target) { target.scrollIntoView({ behavior: "instant", block: "center" }); return true; }
      return false;
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/viz-${ch.name}-seqflow.png`, fullPage: false });
    console.log(`[viz] ${ch.name} sequenceflow_found=${found}`);
  }

  // Pass 3: ch07 Quiz 整題做完
  console.log("\n[ops] ch07 Quiz 全做完");
  await page.goto(`${DEV_URL}/part-2/ch07-transactions`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const quiz = document.querySelector(".ddia-quiz");
    if (quiz) quiz.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(500);

  // 收集難度標示
  const ch07Diff = await page.evaluate(() => {
    const diffs = Array.from(document.querySelectorAll(".ddia-quiz-difficulty"));
    return diffs.map(d => d.textContent?.trim() || "");
  });
  console.log("  ch07 難度 tags:", ch07Diff);

  await page.screenshot({ path: `${OUT}/op-01-ch07-quiz-before.png`, fullPage: false });

  // 點每題第一個選項（用 radio name 分組）
  const ch07Click = await page.evaluate(() => {
    const radios = document.querySelectorAll('.ddia-quiz input[type=radio]');
    const seen = new Set();
    let n = 0;
    radios.forEach(r => {
      if (seen.has(r.name)) return;
      seen.add(r.name);
      r.click();
      r.dispatchEvent(new Event('change', { bubbles: true }));
      n++;
    });
    return n;
  });
  console.log(`  ch07 點了 ${ch07Click} 題`);
  await page.waitForTimeout(400);

  // 送出
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll(".ddia-quiz-actions .ddia-btn.primary, button"));
    const sub = btns.find(b => /送出|核對|看答案|submit/i.test(b.textContent || ""));
    if (sub) sub.click();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/op-02-ch07-quiz-submitted.png`, fullPage: true });

  // Progress 標記 ch07 已讀
  await page.evaluate(() => {
    const prog = document.querySelector(".ddia-progress");
    if (prog) prog.scrollIntoView({ behavior: "instant", block: "center" });
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const mark = btns.find(b => /標記|已讀|完成|mark/i.test(b.textContent || ""));
    if (mark) mark.click();
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/op-03-ch07-progress-marked.png`, fullPage: false });

  // Dashboard 看是否更新
  await page.goto(`${DEV_URL}/progress`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/op-04-dashboard-after-ch07.png`, fullPage: true });

  // Pass 4: ch09 Quiz 整題做完
  console.log("\n[ops] ch09 Quiz 全做完");
  await page.goto(`${DEV_URL}/part-2/ch09-consistency`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const quiz = document.querySelector(".ddia-quiz");
    if (quiz) quiz.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(400);

  const ch09Diff = await page.evaluate(() => {
    const diffs = Array.from(document.querySelectorAll(".ddia-quiz-difficulty"));
    return diffs.map(d => d.textContent?.trim() || "");
  });
  console.log("  ch09 難度 tags:", ch09Diff);

  await page.screenshot({ path: `${OUT}/op-05-ch09-quiz-before.png`, fullPage: false });

  const ch09Click = await page.evaluate(() => {
    const radios = Array.from(document.querySelectorAll('.ddia-quiz input[type=radio]'));
    const groups = new Map();
    radios.forEach(r => {
      if (!groups.has(r.name)) groups.set(r.name, []);
      groups.get(r.name).push(r);
    });
    let n = 0;
    groups.forEach(rs => {
      const last = rs[rs.length - 1];
      last.click();
      last.dispatchEvent(new Event('change', { bubbles: true }));
      n++;
    });
    return n;
  });
  console.log(`  ch09 點了 ${ch09Click} 題`);
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll(".ddia-quiz-actions .ddia-btn.primary, button"));
    const sub = btns.find(b => /送出|核對|看答案|submit/i.test(b.textContent || ""));
    if (sub) sub.click();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/op-06-ch09-quiz-submitted.png`, fullPage: true });

  // Pass 5: Glossary ★ 7 條 hover
  await page.goto(`${DEV_URL}/glossary/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const starInfo = await page.evaluate(() => {
    const stars = Array.from(document.querySelectorAll(".ddia-glossary-stars-link"));
    return { count: stars.length, samples: stars.slice(0, 7).map(s => s.textContent?.trim().slice(0, 40)) };
  });
  console.log(`\n[glossary] ★ 條目: ${starInfo.count}`, starInfo.samples);
  await page.screenshot({ path: `${OUT}/op-07-glossary-stars.png`, fullPage: false });

} finally {
  await browser.close();
}

console.log(`\n[done] 輸出於 ${OUT}`);

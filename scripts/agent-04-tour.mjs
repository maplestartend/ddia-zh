// Agent #04 巡禮：前端轉後端 senior 視角
// 拍：首頁、學習路徑、30 天完整版、Part 1 ch1/2/3、Part 2 ch5/6/7/9、
//     Part 0 0.4 OS / 0.5 網路 / 0.6 雜湊、容量規劃、ADR 模板
// 額外：ch5 Quiz 全做完、暗色模式、floating progress chip 浮現驗證
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-04");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error(`status ${res.status}`);
} catch (err) {
  console.error(`x dev server not responding at ${DEV_URL}: ${err.message}`);
  process.exit(2);
}

const setTheme = async (page, theme) => {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("vitepress-theme-appearance", t);
  }, theme);
  await page.waitForTimeout(300);
};

const PAGES = [
  { name: "01-home",                 url: "/" },
  { name: "02-paths",                url: "/paths/" },
  { name: "03-30day-summer",         url: "/paths/30-day-summer-plan" },
  { name: "04-part1-ch01",           url: "/part-1/ch01-reliable" },
  { name: "05-part1-ch02",           url: "/part-1/ch02-data-models" },
  { name: "06-part1-ch03-storage",   url: "/part-1/ch03-storage" },
  { name: "07-part2-ch05-replication", url: "/part-2/ch05-replication" },
  { name: "08-part2-ch06-partitioning", url: "/part-2/ch06-partitioning" },
  { name: "09-part2-ch07-transactions", url: "/part-2/ch07-transactions" },
  { name: "10-part2-ch09-consistency",  url: "/part-2/ch09-consistency" },
  { name: "11-p0-os",                url: "/part-0/os" },
  { name: "12-p0-network",           url: "/part-0/network" },
  { name: "13-p0-datastruct",        url: "/part-0/data-structures" },
  { name: "14-capacity-planning",    url: "/paths/capacity-planning" },
  { name: "15-adr-template",         url: "/paths/adr-template" },
];

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => console.error("[pageerror]", err.message));

  // -------- Phase 1：靜態巡禮（each page light + dark, fullPage） --------
  for (const p of PAGES) {
    const url = `${DEV_URL}${p.url}`;
    await page.goto(url, { waitUntil: "networkidle" });
    try {
      await page.waitForSelector('.vp-doc, .ddia-hero, [class^="ddia-"]', { timeout: 8000 });
    } catch {
      console.warn(`[warn] ${p.name} no main selector within 8s`);
    }
    await page.waitForTimeout(1200);

    await setTheme(page, "light");
    await page.screenshot({ path: `${OUT}/${p.name}-light.png`, fullPage: true });

    await setTheme(page, "dark");
    await page.screenshot({ path: `${OUT}/${p.name}-dark.png`, fullPage: true });

    console.log(`[ok] ${p.name}`);
  }

  // -------- Phase 2：ch5 floating progress chip 驗證 --------
  // 章節頁捲過 280px 後章首 floating progress chip 應出現（桌面 >= 1024px）
  await page.goto(`${DEV_URL}/part-2/ch05-replication`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await setTheme(page, "light");
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/16-ch05-floating-chip-scroll600-light.png`, fullPage: false });
  await setTheme(page, "dark");
  await page.screenshot({ path: `${OUT}/16-ch05-floating-chip-scroll600-dark.png`, fullPage: false });
  console.log("[ok] 16-ch05 floating chip");

  // -------- Phase 3：ch5 Quiz 全做完 --------
  await page.goto(`${DEV_URL}/part-2/ch05-replication`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await setTheme(page, "light");
  // 捲到頁尾 Quiz 區
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/17-ch05-quiz-before-light.png`, fullPage: false });

  // 嘗試點選 Quiz 所有題目的第一個選項並按提交（探查 DOM 結構）
  // Quiz.vue 結構推斷：每題有 .ddia-quiz__option 或類似按鈕
  const quizInteraction = await page.evaluate(() => {
    // 抓所有 quiz 容器
    const quizzes = document.querySelectorAll(".ddia-quiz, [class*='quiz']");
    const summary = { quizCount: quizzes.length, questionCount: 0, clicked: 0 };
    // 嘗試常見的 quiz 選項 class
    const optionSelectors = [
      ".ddia-quiz__option",
      ".ddia-quiz-option",
      "label.ddia-quiz__choice",
      "[class*='quiz__option']",
      "[class*='quiz-option']",
    ];
    for (const sel of optionSelectors) {
      const nodes = document.querySelectorAll(sel);
      if (nodes.length > 0) {
        summary.optionSelector = sel;
        summary.totalOptions = nodes.length;
        break;
      }
    }
    return summary;
  });
  console.log("[quiz probe]", JSON.stringify(quizInteraction));

  // Quiz 結構：<label class="ddia-quiz-option"><input type=radio name="q-{chapter}-{idx}">
  // 每題第一個 option 點選、按 .ddia-btn.primary 交卷
  const radioClicks = await page.evaluate(() => {
    const quiz = document.querySelector(".ddia-quiz");
    if (!quiz) return { ok: false, reason: "no .ddia-quiz container" };
    const radios = quiz.querySelectorAll("input[type='radio']");
    // 用 name 分組（每題一個 name="q-{chapter}-{idx}"），每組選第一顆
    const byName = new Map();
    radios.forEach((r) => {
      if (!byName.has(r.name)) byName.set(r.name, []);
      byName.get(r.name).push(r);
    });
    let clicked = 0;
    byName.forEach((group) => {
      group[0].click();
      clicked++;
    });
    // 提交（交卷）
    const submit = quiz.querySelector(".ddia-btn.primary");
    if (submit) submit.click();
    return { ok: true, questionGroups: byName.size, clicked, submitFound: !!submit };
  });
  console.log("[quiz answer]", JSON.stringify(radioClicks));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/18-ch05-quiz-after-light.png`, fullPage: false });

  // Dark mode quiz 截圖
  await setTheme(page, "dark");
  await page.screenshot({ path: `${OUT}/18-ch05-quiz-after-dark.png`, fullPage: false });
  console.log("[ok] 17/18-ch05 quiz");

} finally {
  await browser.close();
}

console.log(`\n截圖輸出於 scripts/screenshots/agent-04/`);

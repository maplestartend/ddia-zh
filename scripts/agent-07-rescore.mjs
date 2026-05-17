// Agent #07 學術正確性視角 — W46 修正後重評截圖
// 焦點：Ch5 新 TLDR（quorum 白話括註）、Ch9 §9.5 共識家族、glossary（Consensus / Linearizability / Quorum / PACELC）
// + 順手檢查 Wave 43 六條修正：Riak LWW 預設、Ch11 Line 比喻、Hopping 表頭、暗色 hairline、章首 floating chip、TLDR 書腰
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "agent-07-rescore");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(2500) });
  if (!res.ok) throw new Error(`status ${res.status}`);
} catch (err) {
  console.error(`dev server not responding at ${DEV_URL}: ${err.message}`);
  process.exit(2);
}

const setTheme = async (page, theme) => {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("vitepress-theme-appearance", t);
  }, theme);
  await page.waitForTimeout(280);
};

const PAGES = [
  { name: "01-ch05-top",     url: "/part-2/ch05-replication" },  // 新 TLDR quorum 白話括註
  { name: "02-ch09-top",     url: "/part-2/ch09-consistency" }, // PACELC 補完 + §9.5 共識
  { name: "03-glossary",     url: "/glossary/" },                // Consensus / Linearizability / Quorum / PACELC
  { name: "04-ch11-top",     url: "/part-3/ch11-streams" },     // Wave 43 Line 比喻、Hopping 表頭
  { name: "05-ch01-top",     url: "/part-1/ch01-reliable" },    // ChapterMeta tag 變連結（SLA/SLO/P99）
];

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => console.error("[pageerror]", err.message));

  // --- Phase 1: 巡覽 5 頁、明暗各拍一張 fullPage ---
  for (const p of PAGES) {
    await page.goto(`${DEV_URL}${p.url}`, { waitUntil: "networkidle" });
    try {
      await page.waitForSelector('.vp-doc, .ddia-hero, [class^="ddia-"]', { timeout: 8000 });
    } catch {
      console.warn(`[warn] ${p.name} no main content within 8s`);
    }
    await page.waitForTimeout(1000);

    await setTheme(page, "light");
    await page.screenshot({ path: `${OUT}/${p.name}-light.png`, fullPage: true });

    await setTheme(page, "dark");
    await page.screenshot({ path: `${OUT}/${p.name}-dark.png`, fullPage: true });

    console.log(`[ok] ${p.name}`);
  }

  // --- Phase 2: 學術對焦截圖 ---
  await setTheme(page, "light");

  // 2a. Ch5 TLDR — 新加白話括註（quorum=法定人數 / sloppy quorum=鬆散法定人數 / version vector）
  await page.goto(`${DEV_URL}/part-2/ch05-replication`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${OUT}/i01-ch05-tldr-viewport.png`, fullPage: false });

  // 2b. Ch5 ChapterMeta tag 行（Leader/Follower / Quorum / CRDT — 看是否變連結 + ? icon）
  await page.evaluate(() => {
    const meta = document.querySelector('.ddia-meta');
    if (meta) meta.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/i02-ch05-meta-tags.png`, fullPage: false });

  // 2c. Ch9 §9.2 — PACELC 補完 callout
  await page.goto(`${DEV_URL}/part-2/ch09-consistency`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1100);
  await page.evaluate(() => {
    const h2 = [...document.querySelectorAll('h2')].find(el => el.textContent.includes('9.2'));
    if (h2) h2.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/i03-ch09-pacelc.png`, fullPage: false });

  // 2d. Ch9 §9.5 — 共識家族表（看是否補 Flexible Paxos 列）
  await page.evaluate(() => {
    const h2 = [...document.querySelectorAll('h2')].find(el => el.textContent.includes('9.5'));
    if (h2) h2.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/i04-ch09-consensus-family.png`, fullPage: false });

  // 滾深一點看演算法家族表整體
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/i05-ch09-algorithms-table.png`, fullPage: false });

  // 2e. Glossary — 跳轉到 Consensus、看是否仍 1 行
  await page.goto(`${DEV_URL}/glossary/#consensus`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/i06-glossary-consensus.png`, fullPage: false });

  // 2f. Glossary — PACELC
  await page.goto(`${DEV_URL}/glossary/#pacelc`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/i07-glossary-pacelc.png`, fullPage: false });

  // 2g. Glossary — Linearizability
  await page.goto(`${DEV_URL}/glossary/#linearizability`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/i08-glossary-linearizability.png`, fullPage: false });

  // 2h. Glossary — Quorum
  await page.goto(`${DEV_URL}/glossary/#quorum`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/i09-glossary-quorum.png`, fullPage: false });

  // --- Phase 3: Wave 43 六條修正回訪 ---

  // 3a. Ch5 §5.5 — Riak 預設 LWW（看 §5.5 是否有 Riak 預設說明、之前是錯寫成 vector clock 預設）
  await page.goto(`${DEV_URL}/part-2/ch05-replication`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const h2 = [...document.querySelectorAll('h2')].find(el => el.textContent.includes('5.5') || el.textContent.toLowerCase().includes('leaderless'));
    if (h2) h2.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/w43a-ch05-riak.png`, fullPage: false });

  // 3b. Ch11 — Line 比喻是否仍標「概念上類似」（不再說「同一個東西」）
  await page.goto(`${DEV_URL}/part-3/ch11-streams`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const all = [...document.querySelectorAll('*')];
    const target = all.find(el => /Line|line|聊天/.test(el.textContent || '') && el.tagName.match(/^(H2|H3|P)$/));
    if (target) target.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/w43b-ch11-line-analogy.png`, fullPage: false });

  // 3c. Ch11 — Hopping window 表頭（是否仍清掉 sliding 子句）
  await page.evaluate(() => {
    const all = [...document.querySelectorAll('*')];
    const target = all.find(el => (el.textContent || '').match(/Hopping|hopping window/i) && el.tagName.match(/^(H[23]|TR|TD)$/));
    if (target) target.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/w43c-ch11-hopping.png`, fullPage: false });

  // 3d. 暗色 hairline 對比（Ch9 暗色看 hairline）
  await page.goto(`${DEV_URL}/part-2/ch09-consistency`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await setTheme(page, "dark");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/w43d-ch09-dark-hairline.png`, fullPage: false });
  await setTheme(page, "light");

  // 3e. 章首 floating progress chip — 捲過 280px 後右上角浮現
  await page.goto(`${DEV_URL}/part-2/ch09-consistency`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/w43e-ch09-floating-chip.png`, fullPage: false });

  // 3f. TLDR 書腰（Ch5 已截過 i01；補 Ch1 對照）
  await page.goto(`${DEV_URL}/part-1/ch01-reliable`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/w43f-ch01-tldr-band.png`, fullPage: false });

  console.log(`\n截圖輸出於 ${OUT}`);
} finally {
  await browser.close();
}

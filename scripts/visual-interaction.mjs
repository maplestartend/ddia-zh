// Visual Audit #3 — Interaction State Auditor
// 拍各種操作前後的視覺狀態快照，給「點下去之後畫面變什麼」的審視用
// 用法：node scripts/visual-interaction.mjs
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "scripts", "screenshots", "visual-interaction");
await mkdir(OUT, { recursive: true });

const DEV_URL = "http://localhost:5173";
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error(`status ${res.status}`);
} catch (err) {
  console.error(`✗ dev server 沒在 ${DEV_URL} 回應（${err.message}）`);
  process.exit(2);
}

// 共用：等 Vue hydrate + 字型 settle
async function waitReady(page) {
  try {
    await page.waitForSelector('.vp-doc, .ddia-hero, [class^="ddia-"]', { timeout: 8000 });
  } catch { /* page may still be empty — log later */ }
  await page.waitForTimeout(1100);
}

async function setLight(page) {
  await page.evaluate(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("vitepress-theme-appearance", "light");
  });
  await page.waitForTimeout(180);
}
async function setDark(page) {
  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("vitepress-theme-appearance", "dark");
  });
  await page.waitForTimeout(180);
}

async function shoot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`[ok] ${name}`);
}

async function shootFull(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(`[ok-full] ${name}`);
}

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => console.error("[pageerror]", err.message));

  // ============ 1. QUIZ states (ch01) ============
  console.log("\n=== Quiz states ===");
  await page.goto(`${DEV_URL}/part-1/ch01-reliable`, { waitUntil: "networkidle" });
  await waitReady(page);
  // 清空 quiz state，確保 fresh
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => {
      if (k.includes('quiz') || k.includes('progress') || k.includes('review')) localStorage.removeItem(k);
    });
  });
  await page.reload({ waitUntil: "networkidle" });
  await waitReady(page);
  // 捲到 quiz
  await page.evaluate(() => {
    const el = document.querySelector('.ddia-quiz');
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(300);

  await setLight(page);
  await shoot(page, "01-quiz-fresh-light");

  // 點 Q1 第一個選項
  const q1Option = await page.$('.ddia-quiz-option:nth-child(2) input[type="radio"]');
  if (q1Option) {
    await q1Option.click();
    await page.waitForTimeout(200);
    await shoot(page, "02-quiz-q1-selected-light");
  }

  // 全部勾錯（每個 question 的第一個 option 通常不全對、會混合 correct/wrong）
  await page.evaluate(() => {
    document.querySelectorAll('.ddia-quiz-question').forEach((qEl, qIdx) => {
      const radios = qEl.parentElement?.querySelectorAll(`input[type="radio"][name="q-ch01-${qIdx}"]`);
      if (radios && radios.length > 0) {
        radios[0].click();
      }
    });
  });
  await page.waitForTimeout(300);
  await shoot(page, "03-quiz-all-answered-light");

  // 交卷
  const submitBtn = await page.$('.ddia-quiz-actions button.primary');
  if (submitBtn) {
    await submitBtn.click();
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const el = document.querySelector('.ddia-quiz');
      if (el) el.scrollIntoView({ block: 'start' });
    });
    await page.waitForTimeout(300);
    await shoot(page, "04-quiz-submitted-mixed-light");
    await shootFull(page, "04b-quiz-submitted-full-light");
  }

  // hover「重新作答」
  const retryBtn = await page.$('.ddia-quiz-actions button:not(.ddia-btn-ghost-danger)');
  if (retryBtn) {
    await retryBtn.hover();
    await page.waitForTimeout(200);
    await shoot(page, "05-quiz-retry-hover-light");
  }

  // dark mode submitted
  await setDark(page);
  await page.waitForTimeout(200);
  await shoot(page, "06-quiz-submitted-dark");

  // ============ 2. Progress button states (ch01) ============
  console.log("\n=== Progress button states ===");
  await setLight(page);
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => {
      if (k.includes('progress') || k.includes('done') || k.includes('quiz')) localStorage.removeItem(k);
    });
  });
  await page.reload({ waitUntil: "networkidle" });
  await waitReady(page);

  // 捲到 chapter-loop（progress 區）
  await page.evaluate(() => {
    const el = document.querySelector('.ddia-chapter-loop');
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(300);
  await shoot(page, "07-progress-unread-light");

  // hover 標記已讀
  const markBtn = await page.$('.ddia-loop-btn:not(.is-next)');
  if (markBtn) {
    await markBtn.hover();
    await page.waitForTimeout(200);
    await shoot(page, "08-progress-mark-hover-light");
    // 點下去
    await markBtn.click();
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const el = document.querySelector('.ddia-chapter-loop');
      if (el) el.scrollIntoView({ block: 'start' });
    });
    await page.waitForTimeout(200);
    await shoot(page, "09-progress-marked-done-light");
  }

  // ============ 3. ChapterMeta tag hover (ch01 tag = SLA / SLO) ============
  console.log("\n=== ChapterMeta tag hover ===");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(200);
  await shoot(page, "10-chapter-meta-default-light");
  // hover 第一個 badge link
  const tagLink = await page.$('.ddia-meta .ddia-badge-link');
  if (tagLink) {
    await tagLink.hover();
    await page.waitForTimeout(200);
    await shoot(page, "11-chapter-meta-tag-hover-light");
  } else {
    console.log("[warn] no .ddia-badge-link found on ch01");
  }

  // ============ 4. ChapterFloatingProgress (scroll behavior) ============
  console.log("\n=== ChapterFloatingProgress scroll ===");
  // scroll 100px (應不出現)
  await page.evaluate(() => window.scrollTo({ top: 100, behavior: 'instant' }));
  await page.waitForTimeout(300);
  await shoot(page, "12-floating-progress-scroll100-light");
  // scroll 400px (應出現)
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }));
  await page.waitForTimeout(400);
  await shoot(page, "13-floating-progress-scroll400-light");

  // ============ 5. GlossaryTerm tooltip hover ============
  console.log("\n=== GlossaryTerm tooltip ===");
  // 用 ch05 或其他用 <G> 的章，先試 ch05
  await page.goto(`${DEV_URL}/part-2/ch05-replication`, { waitUntil: "networkidle" });
  await waitReady(page);
  // 捲到第一個有 G 元件的位置
  await page.evaluate(() => {
    const el = document.querySelector('.ddia-glossary-term');
    if (el) el.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(300);
  await shoot(page, "14-glossary-term-default-light");
  // hover
  const gTerm = await page.$('.ddia-glossary-term');
  if (gTerm) {
    await gTerm.hover();
    await page.waitForTimeout(400);
    await shoot(page, "15-glossary-term-tooltip-light");
  } else {
    console.log("[warn] no .ddia-glossary-term on ch05");
  }

  // ============ 6. Search box ============
  console.log("\n=== Search box ===");
  await page.goto(`${DEV_URL}/`, { waitUntil: "networkidle" });
  await waitReady(page);
  // hover search button
  const searchBtn = await page.$('button#local-search, .VPNavBarSearch button, button[aria-label*="搜尋" i], button[aria-label*="search" i]');
  if (searchBtn) {
    await searchBtn.hover();
    await page.waitForTimeout(200);
    await shoot(page, "16-search-button-hover-light");
    await searchBtn.click();
    await page.waitForTimeout(500);
    await shoot(page, "17-search-modal-open-light");
    // 輸入「複製」
    await page.keyboard.type('複製', { delay: 50 });
    await page.waitForTimeout(700);
    await shoot(page, "18-search-typed-light");
    // 按 ESC 關掉
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  } else {
    console.log("[warn] no search button found");
  }

  // ============ 7. Dashboard mode switching (/progress) ============
  console.log("\n=== Dashboard mode switching ===");
  // 7a. fresh
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => {
      if (k.includes('progress') || k.includes('done') || k.includes('quiz') || k.includes('last-visit') || k.includes('review') || k.includes('ddia-')) localStorage.removeItem(k);
    });
  });
  await page.goto(`${DEV_URL}/progress`, { waitUntil: "networkidle" });
  await waitReady(page);
  await shoot(page, "19-dashboard-fresh-light");

  // 7b. resume (mark 1 chapter)
  await page.evaluate(() => {
    localStorage.setItem('ddia-progress-v2', JSON.stringify({ 'ch01': { done: true, doneAt: Date.now() } }));
    localStorage.setItem('ddia-last-visited', JSON.stringify({ chapterId: 'ch01', timestamp: Date.now() - 86400000 }));
  });
  await page.reload({ waitUntil: "networkidle" });
  await waitReady(page);
  await shoot(page, "20-dashboard-resume-light");

  // 7c. complete (mark all 12)
  await page.evaluate(() => {
    const ids = ['ch01','ch02','ch03','ch04','ch05','ch06','ch07','ch08','ch09','ch10','ch11','ch12'];
    const data = {};
    ids.forEach(id => { data[id] = { done: true, doneAt: Date.now() }; });
    localStorage.setItem('ddia-progress-v2', JSON.stringify(data));
  });
  await page.reload({ waitUntil: "networkidle" });
  await waitReady(page);
  await shoot(page, "21-dashboard-complete-light");

  // ============ 8. Part0SelfAssessment states ============
  console.log("\n=== Part0SelfAssessment ===");
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => { if (k.includes('assess') || k.includes('part0')) localStorage.removeItem(k); });
  });
  await page.goto(`${DEV_URL}/part-0/`, { waitUntil: "networkidle" });
  await waitReady(page);
  // 捲到 self-assess
  await page.evaluate(() => {
    const el = document.querySelector('.ddia-self-assess');
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(300);
  await shoot(page, "22-part0-assess-zero-light");

  // 勾 3 題
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('.ddia-self-assess-item input[type="checkbox"]');
    [0, 1, 2].forEach(i => { if (inputs[i]) inputs[i].click(); });
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const el = document.querySelector('.ddia-self-assess');
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(200);
  await shoot(page, "23-part0-assess-3of7-light");
  await shootFull(page, "23b-part0-assess-3of7-full-light");

  // 勾 7 題
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('.ddia-self-assess-item input[type="checkbox"]');
    inputs.forEach(inp => { if (!inp.checked) inp.click(); });
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const el = document.querySelector('.ddia-self-assess');
    if (el) el.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(200);
  await shoot(page, "24-part0-assess-pass-light");

  // ============ 9. <details> 摺疊 (InterviewBlock) ============
  console.log("\n=== InterviewBlock details ===");
  await page.goto(`${DEV_URL}/part-1/ch01-reliable`, { waitUntil: "networkidle" });
  await waitReady(page);
  await page.evaluate(() => {
    const det = document.querySelector('details.ddia-interview, details:has(summary)');
    if (det) det.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(300);
  await shoot(page, "25-details-closed-light");

  // open it
  await page.evaluate(() => {
    const det = document.querySelector('details.ddia-interview, details:has(summary)');
    if (det) det.open = true;
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const det = document.querySelector('details.ddia-interview, details:has(summary)');
    if (det) det.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(200);
  await shoot(page, "26-details-open-light");

  // ============ 10. Dark mode toggle (visual transition) ============
  console.log("\n=== Dark mode toggle ===");
  await page.goto(`${DEV_URL}/`, { waitUntil: "networkidle" });
  await waitReady(page);
  await setLight(page);
  await shoot(page, "27-home-light");
  await setDark(page);
  await page.waitForTimeout(300);
  await shoot(page, "28-home-dark");

  console.log("\n所有截圖完成，輸出於 scripts/screenshots/visual-interaction/");
} finally {
  await browser.close();
}

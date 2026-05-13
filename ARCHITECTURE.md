# 架構說明 Architecture

給維護者看的「為什麼這樣設計」「在哪改什麼」。寫作守則請看 [CLAUDE.md](CLAUDE.md)；快速啟動請看 [README.md](README.md)。

---

## 0. 部署管線（重要）

```
git push main
   │
   ▼
.github/workflows/deploy.yml
   ├─ npm ci
   ├─ npm run type-check                       (嚴格、會擋 build)
   ├─ npm run lint:glossary                    (non-blocking)
   ├─ npm run lint:tldr                        (non-blocking、Part 0 預設 ignore forward refs)
   ├─ npm run lint:base                        (BLOCKING、防 hard-coded href Pages 404)
   ├─ npm run lint:dark-patch  --strict        (BLOCKING、Wave 31a alias 機制守門)
   ├─ npm run lint:chapter-sequence  --strict  (BLOCKING、Wave 30e regression 防護)
   ├─ GITHUB_PAGES=true npm run build
   │     → docs/.vitepress/config.mts 觸發 base = '/ddia-zh/'
   └─ deploy to GitHub Pages
         → https://maplestartend.github.io/ddia-zh/
```

PR 端 [.github/workflows/ci.yml](.github/workflows/ci.yml) 跑同一套 lint + build。

**Base path 陷阱**：本地 dev `base = '/'`、Pages `base = '/ddia-zh/'`。
- markdown `[...](/path)` → VitePress 自動加 base ✓
- inline HTML `<a href="/path">` → **不會** 自動加 base，會 404
- 解法：用 `<BaseLink to="/path" variant="..." icon="..." filled>...</BaseLink>` 包 `withBase()`

## 1. 全景

```
┌─────────────────────────────────────────────────────────────┐
│              docs/.vitepress/                                │
│                                                              │
│  config.mts ───┐                                             │
│  ┌─────────────┴──────────────┐                              │
│  │  data/                     │  ◀── 章節 / 詞彙 SSOT       │
│  │   ├─ chapters.ts           │                              │
│  │   └─ glossary.ts           │                              │
│  │                             │                             │
│  │  composables/              │  ◀── localStorage 統一介面  │
│  │   ├─ useStorage.ts         │                              │
│  │   └─ useProgress.ts        │                              │
│  │                             │                             │
│  │  theme/                    │                              │
│  │   ├─ index.ts (註冊元件)   │                              │
│  │   ├─ styles/*.css (4 檔)   │  ◀── tokens/base/comps/layout
│  │   └─ components/           │                              │
│  │       ├─ Icon.vue          │                              │
│  │       ├─ TLDR.vue          │                              │
│  │       ├─ Quiz.vue          │                              │
│  │       ├─ Progress.vue      │                              │
│  │       ├─ Dashboard.vue     │                              │
│  │       ├─ ChapterCard.vue   │                              │
│  │       ├─ ChapterMeta.vue   │                              │
│  │       ├─ NextChapterBridge │                              │
│  │       ├─ GlossaryTerm.vue  │  ◀── <G> 短別名              │
│  │       ├─ GlossaryIndex.vue │  ◀── A-Z sticky 索引條       │
│  │       ├─ SectionDivider    │  ◀── 章內視覺地標            │
│  │       └─ BaseLink.vue      │  ◀── 包 withBase 的連結      │
│  └────────────────────────────┘                              │
│                                                              │
│  docs/{index,part-*,glossary,paths,progress}.md              │
│        ▲                                                     │
│        └── markdown 內可用 Vue 元件 + markdown-it-attrs      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  vitepress build → docs/.vitepress/dist/
```

## 2. 三條 SSOT（Single Source of Truth）

DDIA 中文網站的所有資料都靠三個檔案維護，**禁止散落**：

### 2.1 章節清單 — [docs/.vitepress/data/chapters.ts](docs/.vitepress/data/chapters.ts)

- 12 章主課程 (`CHAPTERS`) + Part 0 前置知識 (`PREREQUISITES`)（具體章數以 `chapters.ts` 為準）
- 任何顯示章節清單的地方（首頁、Dashboard、進度頁、Part 入口）都 `import { CHAPTERS, PREREQUISITES, PARTS, TOTAL_CHAPTERS }`
- **`TOTAL_CHAPTERS` 永遠等於 `CHAPTERS.length`**——Part 0 是選讀補強，不計入主進度
- `chaptersByPart(part)` helper：`part=0` 回 PREREQUISITES、其他回對應的 CHAPTERS
- 註：config.mts 的 sidebar 目前仍寫死，如果未來章節清單頻繁變動，建議改成動態產

### 2.2 詞彙資料 — [docs/.vitepress/data/glossary.ts](docs/.vitepress/data/glossary.ts) + [docs/glossary/index.md](docs/glossary/index.md)

兩個檔分工：
- **`glossary.ts`**：精簡定義（≤80 字，給 `<G>` 元件 hover 用）+ slug + 相關章節。70+ 個 entry。
- **`glossary/index.md`**：長定義（人類閱讀）。每個條目用 `### Term {#slug}`，markdown-it-anchor + markdown-it-attrs 自動產 anchor，讓 `/glossary#slug` 可跳轉。

新增 / 移除詞彙時**兩邊都要同步**；修改長定義只動 markdown。

### 2.3 進度 / 測驗 — localStorage + useProgress composable

- 儲存 key：`ddia-progress`（章節完成度）+ `ddia-quiz-<chId>`（測驗作答）+ `ddia-quiz-index`（已完成測驗清單）
- 所有元件透過 [composables/useProgress.ts](docs/.vitepress/composables/useProgress.ts) 存取
- **嚴禁在 Vue 元件內直寫 `localStorage.getItem/setItem`**（理由：私密模式 / quota / JSON 損毀 / 跨元件 reactivity / 跨分頁同步都要在 composable 統一處理）

---

## 3. 關鍵元件

### 3.1 GlossaryTerm（`<G>` / `<GlossaryTerm>`）

[docs/.vitepress/theme/components/GlossaryTerm.vue](docs/.vitepress/theme/components/GlossaryTerm.vue)

詞彙連結化：`<G term="quorum">法定人數</G>`

- **桌面（hover 能力）**：滑鼠移過顯示 tooltip、點擊跳 `/glossary#<slug>`
- **觸控裝置（`@media (hover: none)`）**：第一次點開 tooltip、第二次點才跳轉、點外部關閉
- **找不到詞**：橘色虛線警示作者（不阻擋頁面 render）
- **資料來源**：`findTerm(term)` 從 `data/glossary.ts` 查（含 alias 支援，例：`p99` → `percentile`）

### 3.2 Quiz

章末測驗。題目 schema：

```ts
{
  question: string,
  options: string[],          // 4 個
  answer: number,             // 正解 index
  explanation: string         // 提交後顯示
}
```

注意：題目改版後若題數變動，已答交卷紀錄會因 schema 不符被丟棄（這是有意設計，避免索引錯位）。

### 3.3 Dashboard

首頁的 4 個指標卡：已讀章節 / 整體進度 % / 已完成測驗 / 測驗平均正確率。
分母都是 `TOTAL_CHAPTERS = 12`（不含 Part 0）。

---

## 4. 樣式系統

CSS 拆 4 檔放在 [docs/.vitepress/theme/styles/](docs/.vitepress/theme/styles/)，採**兩層 token + alias 重綁**：

```
Primitive tokens（brand-500 / accent-500 / neutral-*、type / space 階梯）
        ↓
Semantic tokens（--brand-fg / --mark-fg / --rule-active / --cta-bg / --text-primary / --rule-hairline）
        ↓
Component CSS（.ddia-quiz, .ddia-stat-card, .ddia-chapter-card ...）
```

**Dark mode alias 重綁機制**（Wave 31a）：`.dark` scope 把 `--mark-fg / --rule-active / --cta-bg` 重綁到 `var(--brand-fg)`（=暖橙 `#E3A06A`），元件 CSS 不需要寫 `.dark .xxx { color: ... }` 補釘。違反此機制的 alias-redundant patch 由 `lint:dark-patch --strict` (CI BLOCKING) 守門。

明 / 暗模式：VitePress 預設 `.dark` class on `<html>`。**不要用 `[data-theme]`**（與 stock 專案不同——那是 Next.js 自管）。

**CSS 拆分**：tokens / base / components / layout 四檔由 `theme/index.ts` 按序 import；`components.css` 現約 1800 行（Editorial 改造後最大檔、含 TLDR / Quiz / Hero / Dashboard / ChapterCard / VP chrome override 等多模組）、未來再長可再拆 hero / dashboard / quiz / chapter-card 子檔。

**Token scale 終態**（Wave 33）：
- **Type**：14 階（11 / 11.5 / 12 / 12.5 / 13 / 14 / 14.5 / 15 / 15.5 / 16 / 18 / 20 / 22 / 26 / 28 / 36 / 38 / 42 / 44px、`--type-mini` ~ `--type-display-1`）
- **Letter-spacing**：7 階（`--ls-tight 0.01` / `body-cn 0.02` / `loose 0.04` / `mid 0.08` / `wide 0.16` / `eyebrow 0.18` / `display 0.28`）
- **Spacing**：12 階 numeric（`--space-1` 4 ~ `--space-6` 64 含 0.5 階 + `--space-h2-break` 48）+ 3 語意 alias（`--space-transition` / `half-ritual` / `ritual`）
- **Fraunces fvar 套組**：8 套（display / section / eyebrow / italic-note + warm / tight / mid 變體）
- **lint:typography + allowlist**：raw 全收 + 設計級值用 `/* lint-typography-allow: reason */` 行內白名單放行

---

## 5. 字型 + 圖示

### 字型：三層 stack（Display / Body / Mono）

於 [config.mts](docs/.vitepress/config.mts) `head` 用 `<link rel="stylesheet">` 從 Google Fonts 載入：

- **Display**（標題 / hero / 章節編號 / pull-quote / eyebrow / CTA）：**Fraunces**（可變字型、opsz/SOFT/wght 三軸）+ Noto Serif TC fallback
- **Body**（內文）：Noto Sans TC（CJK 螢幕閱讀 sans 仍最舒服）
- **Mono**（程式碼 / 數字）：JetBrains Mono

`.numeric` class 套用 mono tabular、`.oldstyle` class 套用 Fraunces oldstyle figures。

### 圖示：Editorial 改造後全站隱藏 Material Symbols

Editorial Manuscript 風格不用 icon、改用 typographic mark（`§` section sign / `·` dot / `◆` dinkus / `→` arrow）。實作策略：

- `.material-symbols-rounded { display: none !important }`（[base.css](docs/.vitepress/theme/styles/base.css)）— **全站隱藏**
- 標題 / eyebrow 前綴改用 CSS `::before` 注入 typographic mark（例 `.ddia-tldr-title::before { content: "§" }`）
- [Icon.vue](docs/.vitepress/theme/components/Icon.vue) 元件機制保留、但 render 出來的 span 完全 hide（換回 icon 一行切換）
- Google Fonts stylesheet 已從 [config.mts](docs/.vitepress/config.mts) 移除、不再吃 ~150KB Material Symbols payload

---

## 6. 建構 / SSG 注意事項

VitePress 在 `npm run build` 時會在 Node.js 環境跑每頁 Vue `setup()`。**禁止在 `<script setup>` 頂層存取 `window / document / localStorage`** —— 必須包 `onMounted`。

`useStorage.ts` 已處理這點；自己寫的副作用記得包 `onMounted`。

`theme/index.ts` 的字型偵測也包了 `typeof document !== 'undefined'` 檢查。

---

## 7. 驗收流程

改完內容或元件後，依序跑：

```powershell
npm run type-check        # 型別 OK 嗎
npm run build             # SSG 每頁能 render 嗎
npm run dev               # 開伺服器（另一個 terminal）
npm run screenshot        # Playwright 截關鍵頁 × 明暗模式（頁面清單以 scripts/screenshot.mjs 的 PAGES 為準）
npm run lint:glossary     # 還有沒漏標的詞嗎
```

截圖前綴預設 `snapshot`，要做 before/after 對照可：

```powershell
node scripts/screenshot.mjs before
# 改動
node scripts/screenshot.mjs after
```

---

## 8. 已知技術債

依優先度排序：

1. **config.mts sidebar 已動態化**：Wave 早期已從 `chapters.ts` 動態產（用 `fullSidebar(activePart)` + `chaptersByPart()`）。✅
2. **components.css 約 1800 行**（超過原 500 行單檔上限）：Editorial 改造後最大檔、含 TLDR / Quiz / Hero / Dashboard / ChapterCard / VP chrome override 等多模組；未來再拆 hero / dashboard / quiz / chapter-card 子檔
3. **`vitepress build` chunk size warning**：>500KB chunk，可考慮 dynamic import + manualChunks 切分（影響首屏 FCP，但 CDN cache 後實際影響不大，目前不急）
4. **語意 spacing alias 採用率 ≈ 0%**：Wave 32e 加了 `--space-transition` / `--space-half-ritual` / `--space-ritual` 但 base.css / components.css 仍直呼 numeric `--space-5 / -5-5 / -6`；下一輪可 sweep
5. **CI 已建立**：[deploy.yml](.github/workflows/deploy.yml)（main push）+ [ci.yml](.github/workflows/ci.yml)（PR）跑 type-check + 8 個 lint + build；其中 base / dark-patch / chapter-sequence 三個 lint BLOCKING ✅

---

## 9. 給未來 Claude session 看的

如果你是另一個進來這個 repo 的 Claude session，**先讀 [CLAUDE.md](CLAUDE.md)**——那裡有踩過的地雷與工作守則。本檔是「為什麼」的補充。

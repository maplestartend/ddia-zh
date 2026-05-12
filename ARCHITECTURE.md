# 架構說明 Architecture

給維護者看的「為什麼這樣設計」「在哪改什麼」。寫作守則請看 [CLAUDE.md](CLAUDE.md)；快速啟動請看 [README.md](README.md)。

---

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
│  │   ├─ custom.css (token)    │                              │
│  │   └─ components/           │                              │
│  │       ├─ Icon.vue          │                              │
│  │       ├─ TLDR.vue          │                              │
│  │       ├─ Quiz.vue          │                              │
│  │       ├─ Progress.vue      │                              │
│  │       ├─ Dashboard.vue     │                              │
│  │       ├─ ChapterCard.vue   │                              │
│  │       ├─ ChapterMeta.vue   │                              │
│  │       ├─ NextChapterBridge │                              │
│  │       └─ GlossaryTerm.vue  │  ◀── <G> 短別名              │
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

- 12 章主課程 (`CHAPTERS`) + 7 章前置知識 (`PREREQUISITES`)
- 任何顯示章節清單的地方（首頁、Dashboard、進度頁、Part 入口）都 `import { CHAPTERS, PREREQUISITES, PARTS, TOTAL_CHAPTERS }`
- **`TOTAL_CHAPTERS` 永遠是 12**——Part 0 是選讀補強，不計入主進度
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

[docs/.vitepress/theme/custom.css](docs/.vitepress/theme/custom.css) 目前單檔 ~700 行，採兩層 token：

```
Primitive tokens（色階、間距、字級）
        ↓
Semantic tokens（--brand-500, --text-primary, --border-default）
        ↓
Component CSS（.ddia-card, .ddia-quiz, .ddia-stat-card）
```

明 / 暗模式：VitePress 預設 `.dark` class on `<html>`。**不要用 `[data-theme]`**（與 stock 專案不同——那是 Next.js 自管）。

CSS 拆分上限：單檔 ~500 行。`custom.css` 接近 700 行，未來再長就拆成 `tokens.css` + `base.css` + `components.css` + `layout.css`，在 `theme/index.ts` 多檔 import。

---

## 5. 字型 + 圖示

### 字型：Noto Sans TC + JetBrains Mono

於 [config.mts](docs/.vitepress/config.mts) `head` 用 `<link rel="stylesheet">` 從 Google Fonts 載入。`.numeric` class 套用等寬字。

### 圖示：Material Symbols Rounded

四軸字型（FILL / wght / GRAD / opsz）。元件 [Icon.vue](docs/.vitepress/theme/components/Icon.vue) 包裝。

**地雷**：圖示名稱必須是 [官方 ligature 名](https://fonts.google.com/icons)（例 `menu_book`、`schedule`）。用錯名字會顯示成字面文字。

**FOUT 防護**：在 [theme/index.ts](docs/.vitepress/theme/index.ts) 監聽 `document.fonts.ready` 後加 `.fonts-loaded` class、CSS 在那之前用 `color: transparent` 隱藏 icon span 內的字面 fallback。

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
npm run screenshot        # Playwright 截 9 頁 × 明暗模式 = 18 張
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

1. **config.mts sidebar 硬編碼**：未來如果章節清單頻繁變動，要改成從 `chapters.ts` 動態產（已預留 `chaptersByPart()` helper）
2. **custom.css 接近 700 行**：到 ~500 行該拆檔了，當前可接受
3. **`vitepress build` chunk size warning**：>500KB chunk，可考慮 dynamic import + manualChunks 切分（影響首屏 FCP，但 CDN cache 後實際影響不大，目前不急）
4. **沒有 CI**：依賴開發者自跑 type-check / build；可考慮加 GitHub Actions

---

## 9. 給未來 Claude session 看的

如果你是另一個進來這個 repo 的 Claude session，**先讀 [CLAUDE.md](CLAUDE.md)**——那裡有踩過的地雷與工作守則。本檔是「為什麼」的補充。

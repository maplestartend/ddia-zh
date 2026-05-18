# DDIA 中文學習網站

> ⚠️ **非官方學習筆記**
>
> 本網站**非** Martin Kleppmann 或 O'Reilly Media 官方授權產品，亦未受其背書或審閱。原書著作權完全屬於 **Martin Kleppmann 與 O'Reilly Media**。
>
> 請至 [dataintensive.net](https://dataintensive.net/) 或實體書店支持原作。

🌐 **線上版**：<https://maplestartend.github.io/ddia-zh/>
📦 **原始碼**：<https://github.com/maplestartend/ddia-zh>（push 到 `main` 後 GitHub Actions 自動部署）

把《Designing Data-Intensive Applications》(Martin Kleppmann, O'Reilly Media, 2017) 整理成繁體中文教材。

**教材組成**

- **12 章主課程** — Part I 資料系統基礎 / Part II 分散式資料 / Part III 衍生資料
- **Part 0 前置知識**（選讀）— 作業系統、網路、SQL、資料結構、並行控制
- **詞彙表** — 70+ 名詞，內文 hover tooltip + 完整定義頁；含「面試常考 ★」標記 7 條
- **學習路徑** — 依角色（後端 / DE / 架構師 / 面試 / SRE）+ 30 天計畫雙版本（初學者 / 完整）
- **從學到做的 4 個產出工具** — ADR 模板（7 範例含失敗 ADR）/ 容量規劃工作表 / 真實事故 × DDIA 對照 / Ch9 §9.8 學界證明骨架

**主動學習元件**：TL;DR / FirstReadShortcut（死亡章節最小可用路徑）/ 章末 Quiz（★ 核心 ☆ 進階分級）/ PartCheckpoint（跨章自評）/ 已讀進度（localStorage、無後端帳號）。

**性質**：個人非商業學習筆記。重新整理、改寫、補充原創評論與 Part 0 銜接內容；**不複製原書內文**。詳細版權說明見 [LICENSE](LICENSE) 與 [NOTICE.md](NOTICE.md)。

---

## 🤝 回饋與聯絡

歡迎指出**事實錯誤、翻譯建議、學習回饋**：

| 管道 | 用途 |
|---|---|
| **[GitHub Issues](https://github.com/maplestartend/ddia-zh/issues/new/choose)** | 內容錯誤、翻譯建議、版權 takedown、一般學習建議（四種模板）|
| **電子郵件 `asercv14632@gmail.com`** | 私下溝通（商業合作、版權細節、敏感建議）|

**目前不接受外部 PR**。若有想法，請走 Issue 或寫信給我，由我決定如何納入。

## 快速開始

需求：Node.js 18+、npm。

```powershell
# 1. 安裝依賴（首次）
npm install

# 2. 開發伺服器（背景跑、即改即看）
npm run dev
# → http://localhost:5173

# 3. 製作 production 靜態網站
npm run build
# 輸出於 docs/.vitepress/dist/

# 4. 預覽 production build
npm run preview
```

## 全部指令

| 指令 | 用途 |
|---|---|
| `npm run dev` | 開發伺服器（hot reload） |
| `npm run build` | 產 production SSG，輸出 `docs/.vitepress/dist/` |
| `npm run preview` | 預覽 production build |
| `npm run type-check` | TypeScript + Vue 型別檢查（嚴禁 any、未用變數）|
| `npm run screenshot` | Playwright 截圖驗收（需 dev server 先啟動、預設 `snapshot-*.png`；`before` / `after` 子命令做對照）|
| `npm run lint:glossary` | 掃 markdown 找「詞彙表已收錄但內文未包 `<G>` 的位置」（non-blocking）|
| `npm run lint:tldr` | 偵測「TLDR 用了後續章節才講的詞」（Part 0 預設 ignore；`--strict` 啟用、non-blocking）|
| `npm run lint:base` | 偵測 hard-coded `<a href="/...">` 反模式（Pages 404 風險、**CI BLOCKING**）|
| `npm run lint:typography` | 偵測 raw `font-size` / `letter-spacing`（建議用 var(--type-\*) / var(--ls-\*)，支援 `/* lint-typography-allow: reason */` 行內白名單）|
| `npm run lint:spacing` | 偵測 raw `margin` / `padding`（建議用 var(--space-\*)）|
| `npm run lint:dark-patch` | 偵測 `.dark .xxx { var(--mark-fg\|rule-active\|cta-bg) }` alias-redundant 補釘（Wave 31a alias 機制守門、**CI BLOCKING**）|
| `npm run lint:chapter-sequence` | 驗 docs/part-{0,1,2,3}/\*.md 章末元件序列是否在 5 種已知模式（**CI BLOCKING**、Wave 30e regression 防護）|
| `npm run lint:border-density` | 偵測多重 border 反模式（Wave 44 audit guard、non-blocking）|
| `npm run lint:taiwan-terms` | 對岸用語 / 簡體字混入偵測（W46 新增、BANNED 65 詞、`--strict` 才 BLOCK）|
| `npm run lint:tag-anchors` | ChapterMeta tagAnchors ↔ glossary anchor 對齊驗證（W48 新增、防 glossary 重排無聲 404）|
| `npm test` | Vitest unit test（W51 新增、24 測試含 chapters / glossary SSOT 正確性）|
| `npm run test:watch` | Vitest watch mode 用於開發 |

## 寫作 / 維護快速指引

| 想做的事 | 改哪裡 |
|---|---|
| 改章節清單（新增、刪、改順序） | [docs/.vitepress/data/chapters.ts](docs/.vitepress/data/chapters.ts) — **唯一 SSOT** |
| 加詞彙、改 hover 定義 | [docs/.vitepress/data/glossary.ts](docs/.vitepress/data/glossary.ts) + [docs/glossary/index.md](docs/glossary/index.md) |
| 改 sidebar / nav | [docs/.vitepress/config.mts](docs/.vitepress/config.mts) |
| 改全站樣式 token | [docs/.vitepress/theme/styles/tokens.css](docs/.vitepress/theme/styles/tokens.css)（另有 base / components / layout 三檔） |
| 在內文連結詞彙 | `<G term="quorum">法定人數</G>` |
| 加章首 TL;DR | `<TLDR :points='["...","..."]' />` （每檔僅一個）|
| 加章末測驗 | `<Quiz chapter-id="ch07" :questions='[...]' />` |
| 加章末下一章橋接 | `<NextChapterBridge next-link="..." next-title="...">...</NextChapterBridge>` |
| 加章內視覺地標 | `<SectionDivider icon="bolt" label="關鍵權衡" />` （自動偵測中文不套 uppercase）|
| 加情境 badge | `<span class="ddia-scenario-badge danger\|safe\|warn">A · LABEL</span>` |
| 加 base-aware 連結 | `<BaseLink to="/part-0/basics" variant="primary" icon="..." filled>...</BaseLink>` （部署到 GitHub Pages 子路徑時必須用這個、不要 hard-code `<a href="/...">`）|

詳細寫作守則見 [CLAUDE.md](CLAUDE.md)，架構說明見 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 內容結構

```
docs/
├── index.md                       首頁
├── part-0/                        前置知識（OS / 網路 / SQL / 並行）—— 選讀
├── part-1/                        Part I 資料系統基礎（Ch1-Ch4）
├── part-2/                        Part II 分散式資料（Ch5-Ch9、Ch9 含 §9.8 學界證明骨架）
├── part-3/                        Part III 衍生資料（Ch10-Ch12、Ch11 含 §11.6 Stripe idempotency）
├── glossary/index.md              詞彙表（70+ 詞、7 條「面試常考 ★」標記）
├── paths/                         學習路徑
│   ├── index.md                   依角色入口
│   ├── 30-day-beginner.md         30 天初學者版（高中 / 大二 / bootcamp）
│   ├── 30-day-summer-plan.md      30 天完整版（大三大四 / 工作 1-3 年）
│   ├── interview-cheatsheet.md    面試題 × DDIA 章節對照（8 題 + 20 處本土場景）
│   ├── adr-template.md            ADR 4-Q 模板 + 7 範例（含失敗 ADR）
│   ├── capacity-planning.md       容量規劃工作表（QPS → shard/replica/cache 規格）
│   └── incident-postmortems.md    8 個真實事故 × DDIA 章節對照 + 本土 blameless 範本
├── bridges/oltp-de.md             OLTP ↔ 資料工程視角橋
└── progress.md                    我的進度
```

## 技術棧

- **VitePress 1.6** — 靜態網站生成器（基於 Vite + Vue 3）
- **TypeScript** — strict + noUnusedLocals + noUncheckedIndexedAccess + literal union types（`as const satisfies` 推 ChapterId / GlossarySlug）
- **CSS 拆 3+8 檔** — `tokens / base / layout` + `components/{editorial-marks, home-hero, dashboard, chapter-cards, custom-block, vp-overrides, diagrams, paths-glossary}.css`（W49 拆 6 子檔、W50 再語意化重切為 8 子檔；CLAUDE.md §9 全檔 ≤500 行）
- **自寫視覺化元件** — DecisionTree / SequenceFlow（W38 取代 Mermaid、解 CJK + 624px 容器跑版痼疾；W48 拔除 mermaid plugin 省 3 MB chunks）
- **章末元件 async load** — Quiz / Dashboard / Part0SelfAssessment 等走 `defineAsyncComponent`（W48、app.js 從 605 KB 降到 146 KB）
- **Playwright** — 截圖驗收
- **localStorage** — 進度、測驗紀錄（純前端、無後端、走 `useStorage` 統一介面 + W48 加 object/array T 強制 validate overload）

## 設計慣例（Editorial Manuscript · O'Reilly 紙本書感）

- **Brand**：mahogany clay `#8C3A2A`（紅木陶土、暖含黃）；dark 模式走暖橙 `#E3A06A`（同 `var(--brand-fg)` 替身）
- **Accent**：manuscript orange `#93521A`（連結色、與 brand 拉開 hue 避色盲合流）
- **底色**：cream paper `#F4EFE6`（米黃紙底）；dark 模式 `#1C1714` 暖炭墨
- **字型**：三層 stack
  - **Display**（標題 / hero / 章節編號 / pull-quote）：**Fraunces** + Noto Serif TC（可變字型、opsz/SOFT/wght 三軸調音）
  - **Body**（內文）：Noto Sans TC
  - **Mono**（程式碼 / 數字）：JetBrains Mono
- **元件慣例**：**無圓角** + 髮絲線分隔（不是 1px 全包邊 + 12px radius 卡片）；hover 用左 3px 印記 + 微淡背景、**不用** lift shadow
- **暗色模式**：VitePress 預設 `.dark` class on `<html>`，**不要**用 `[data-theme]`；alias `--mark-fg / --rule-active / --cta-bg` 在 `.dark` scope 自動重綁暖橙
- **章末節奏**：3 階（內容延續 28px / 過場 40px / 儀式封頂 64px）；Bridge 用 `--space-h2-break 48` 章節 chunk
- **台灣化用詞**：process = 行程、cluster = 叢集、ops = 維運、Linearizability = 線性一致、queue = 佇列、variable = 變數
- **全站繁體中文鐵則**：絕對禁止任何簡體字（含 third-party UI 預設字串、見 [CLAUDE.md §8](CLAUDE.md)）
- **內容正確性 = 最高優先**：寧可空著不要寫錯。修改技術描述、測驗答案前對照原書

詳細設計守則（含 fvar 套組、token 兩層架構、儀式 italic 邊界、AI-slop 反指紋清單）見 [CLAUDE.md](CLAUDE.md) 末段「設計慣例」。

## 部署

`main` 分支 push 後，GitHub Actions（[deploy.yml](.github/workflows/deploy.yml)）自動：

1. `npm ci` 安裝依賴
2. `npm run type-check`（嚴格、阻擋 build）
3. **Non-blocking lints**（輸出印到 Actions step summary）：
   - `lint:glossary`、`lint:tldr`、`lint:typography`、`lint:spacing`
4. **BLOCKING lints**（失敗擋部署）：
   - `lint:base` — 防 hard-coded href 在 Pages 404
   - `lint:dark-patch` — Wave 31a alias 機制守門
   - `lint:chapter-sequence` — Wave 30e regression 防護
5. **Non-blocking lints**（W48 新加 2 個 lint summary）：
   - `lint:tag-anchors` — ChapterMeta tagAnchors 對齊 glossary
   - `lint:taiwan-terms` — 對岸用語/簡體字偵測
6. **VitePress cache**（W48）— `actions/cache` 對 `docs/.vitepress/cache + node_modules/.vite` 做 key-based 快取、CI 從 ~90s 降到 ~30s
7. `GITHUB_PAGES=true npm run build`（觸發 base = `/ddia-zh/`）
8. 部署到 GitHub Pages

[ci.yml](.github/workflows/ci.yml) 在 PR 觸發時跑相同 lint + type-check + build 驗證（dependabot 依賴升級 PR、未來外部 PR 等）。

**內部連結注意事項**

因為部署 base 是 `/ddia-zh/` 而非 `/`，必須用**會自動處理 base** 的連結寫法：

- markdown `[文字](/path)` — VitePress 自動加 base ✓
- `<BaseLink to="/path">` 元件 — 包 `withBase()` ✓
- 絕對 URL `https://...` — 不受 base 影響 ✓

**禁止**：hard-code `<a href="/path">`，在 Pages 上會 404。

## 已知限制

- 進度與測驗紀錄都在 **localStorage**，換瀏覽器 / 清快取會遺失（沒有後端帳號）
- 全文搜尋是 VitePress 內建 local search，CJK tokenizer 自訂在 [config.mts](docs/.vitepress/config.mts)
- CI 跑 type-check + 11 個 lint + build + 24 unit test；其中 base / dark-patch / chapter-sequence 三個 lint 是 BLOCKING（失敗擋部署）；W48 拔除 mermaid plugin 後 build time 從 ~14s 降到 ~6s、dist 從 8.2 MB 降到 5.5 MB；W50 進一步拔除 VP default 內建未用 Inter 字型（540 KB）、dist 降到 4.8 MB、woff2 從 642 KB 降到 228 KB；W52 修 5 個 WCAG 違規 + 視覺 audit 共 10 項（v380 表格 reflow / ChapterMeta tap target / Quiz CLS / GlossaryTerm 色差 / chapter card 可點性）

## License

雙授權：

- **程式碼**（Vue 元件、composable、build script、CSS）：[MIT License](LICENSE)
- **學習內容**（markdown 章節、詞彙表、測驗、學習路徑）：[CC BY-NC-SA 4.0](LICENSE-CONTENT.md)
  非商業 · 需署名 · 衍生作需相同條款分享

原書 *Designing Data-Intensive Applications* 著作權屬 **Martin Kleppmann 與 O'Reilly Media**。本網站僅作個人學習筆記的重新整理。完整版權與免責聲明見 [LICENSE-CONTENT.md](LICENSE-CONTENT.md) 與 [NOTICE.md](NOTICE.md)。

## 貢獻與安全議題

- 內容回饋 / 翻譯建議：見 [CONTRIBUTING.md](CONTRIBUTING.md)
- 安全漏洞回報：見 [SECURITY.md](SECURITY.md)

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
- **詞彙表** — 70+ 名詞，內文 hover tooltip + 完整定義頁
- **學習路徑** — 依角色推薦的閱讀順序

**主動學習元件**：TL;DR 章首摘要 / 章末測驗 / 已讀進度追蹤（localStorage，無後端帳號）。

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
| `npm run screenshot` | Playwright 截圖驗收（需 dev server 先啟動）—— 加 `--scroll=600` 拍 sticky 元件 |
| `npm run lint:glossary` | 掃 markdown 找「詞彙表已收錄但內文未包 `<G>` 的位置」 |
| `npm run lint:tldr` | 偵測「TLDR 用了後續章節才講的詞」（Part 0 章預設 ignore；`--strict` 啟用）|

## 寫作 / 維護快速指引

| 想做的事 | 改哪裡 |
|---|---|
| 改章節清單（新增、刪、改順序） | [docs/.vitepress/data/chapters.ts](docs/.vitepress/data/chapters.ts) — **唯一 SSOT** |
| 加詞彙、改 hover 定義 | [docs/.vitepress/data/glossary.ts](docs/.vitepress/data/glossary.ts) + [docs/glossary/index.md](docs/glossary/index.md) |
| 改 sidebar / nav | [docs/.vitepress/config.mts](docs/.vitepress/config.mts) |
| 改全站樣式 token | [docs/.vitepress/theme/custom.css](docs/.vitepress/theme/custom.css) |
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
├── part-2/                        Part II 分散式資料（Ch5-Ch9）
├── part-3/                        Part III 衍生資料（Ch10-Ch12）
├── glossary/index.md              詞彙表（長定義）
├── paths/index.md                 學習路徑（依角色）
└── progress.md                    我的進度
```

## 技術棧

- **VitePress 1.6** — 靜態網站生成器（基於 Vite + Vue 3）
- **TypeScript** — 嚴格模式型別檢查
- **Material Symbols Rounded** — 圖示系統（透過 ligature）
- **Mermaid** — 流程圖
- **Playwright** — 截圖驗收
- **localStorage** — 進度、測驗紀錄（純前端、無後端）

## 設計慣例

- **Brand**：深鋼藍 `#2F4A80`
- **字型**：Noto Sans TC（中文）+ JetBrains Mono（數字/程式碼）
- **元件慣例**：`bg-surface` 卡片 + 1px border + 12px border-radius
- **暗色模式**：VitePress 預設 `.dark` class on `<html>`，不要用 `[data-theme]`
- **台灣化用詞**：process = 行程、cluster = 叢集、ops = 維運、Linearizability = 線性一致
- **內容正確性 = 最高優先**：寧可空著不要寫錯。修改技術描述、測驗答案前對照原書。

## 部署

`main` 分支 push 後，GitHub Actions（[deploy.yml](.github/workflows/deploy.yml)）自動：

1. `npm ci` 安裝依賴
2. `npm run type-check`（嚴格、阻擋 build）
3. `npm run lint:glossary` + `npm run lint:tldr`（non-blocking、輸出印到 Actions step summary）
4. `GITHUB_PAGES=true npm run build`（觸發 base = `/ddia-zh/`）
5. 部署到 GitHub Pages

另有 [ci.yml](.github/workflows/ci.yml) 在 PR 觸發時跑相同驗證（例：dependabot 的依賴升級 PR）。

**內部連結注意事項**

因為部署 base 是 `/ddia-zh/` 而非 `/`，必須用**會自動處理 base** 的連結寫法：

- markdown `[文字](/path)` — VitePress 自動加 base ✓
- `<BaseLink to="/path">` 元件 — 包 `withBase()` ✓
- 絕對 URL `https://...` — 不受 base 影響 ✓

**禁止**：hard-code `<a href="/path">`，在 Pages 上會 404。

## 已知限制

- 進度與測驗紀錄都在 **localStorage**，換瀏覽器 / 清快取會遺失（沒有後端帳號）
- 全文搜尋是 VitePress 內建 local search，CJK tokenizer 自訂在 [config.mts](docs/.vitepress/config.mts)
- CI 只跑 type-check（嚴格）+ build；lint 是 non-blocking 訊號

## License

雙授權：

- **程式碼**（Vue 元件、composable、build script、CSS）：[MIT License](LICENSE)
- **學習內容**（markdown 章節、詞彙表、測驗、學習路徑）：[CC BY-NC-SA 4.0](LICENSE-CONTENT.md)
  非商業 · 需署名 · 衍生作需相同條款分享

原書 *Designing Data-Intensive Applications* 著作權屬 **Martin Kleppmann 與 O'Reilly Media**。本網站僅作個人學習筆記的重新整理。完整版權與免責聲明見 [LICENSE-CONTENT.md](LICENSE-CONTENT.md) 與 [NOTICE.md](NOTICE.md)。

## 貢獻與安全議題

- 內容回饋 / 翻譯建議：見 [CONTRIBUTING.md](CONTRIBUTING.md)
- 安全漏洞回報：見 [SECURITY.md](SECURITY.md)

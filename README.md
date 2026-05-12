# DDIA 中文學習網站

> ⚠️ **非官方學習筆記** — 本網站**非** Martin Kleppmann 或 O'Reilly Media 官方授權產品，亦未受其背書或審閱。
> 原書著作權完全屬於 **Martin Kleppmann 與 O'Reilly Media**。請至 [dataintensive.net](https://dataintensive.net/) 或實體書店支持原作。

把《Designing Data-Intensive Applications》(Martin Kleppmann, O'Reilly Media, 2017) 整理成 12 章 + Part 0 前置知識 + 詞彙表 + 學習路徑的繁體中文教材，配 TL;DR / 章末測驗 / 進度追蹤等主動學習元件。

**性質**：個人非商業學習筆記，重新整理、改寫、補充原創評論與 Part 0 銜接內容；不複製原書內文。詳細版權說明見 [LICENSE](LICENSE)。

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
| `npm run screenshot` | Playwright 截圖驗收（需 dev server 先啟動） |
| `npm run lint:glossary` | 掃 markdown 找「詞彙表已收錄但內文未包 `<G>` 的位置」 |

## 寫作 / 維護快速指引

| 想做的事 | 改哪裡 |
|---|---|
| 改章節清單（新增、刪、改順序） | [docs/.vitepress/data/chapters.ts](docs/.vitepress/data/chapters.ts) — **唯一 SSOT** |
| 加詞彙、改 hover 定義 | [docs/.vitepress/data/glossary.ts](docs/.vitepress/data/glossary.ts) + [docs/glossary/index.md](docs/glossary/index.md) |
| 改 sidebar / nav | [docs/.vitepress/config.mts](docs/.vitepress/config.mts) |
| 改全站樣式 token | [docs/.vitepress/theme/custom.css](docs/.vitepress/theme/custom.css) |
| 在內文連結詞彙 | `<G term="quorum">法定人數</G>` |
| 加章首 TL;DR | `<TLDR :points='["...","..."]' />` |
| 加章末測驗 | `<Quiz chapter-id="ch07" :questions='[...]' />` |
| 加章末下一章橋接 | `<NextChapterBridge next-link="..." next-title="...">...</NextChapterBridge>` |

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

## 已知限制

- 進度與測驗紀錄都在 **localStorage**，換瀏覽器 / 清快取會遺失（沒有後端帳號）
- 全文搜尋是 VitePress 內建 local search，CJK tokenizer 自訂在 [config.mts](docs/.vitepress/config.mts)
- 沒有 CI；commit 前自行跑 type-check + build

## License

- **程式碼**（Vue 元件、composable、build script、CSS）：[MIT License](LICENSE)
- **學習內容**（markdown 章節、詞彙表、測驗、學習路徑）：[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) —— 非商業、需署名、衍生需相同條款分享

原書 *Designing Data-Intensive Applications* 著作權屬 **Martin Kleppmann 與 O'Reilly Media**，本網站僅作個人學習筆記的重新整理。完整版權與免責聲明見 [LICENSE](LICENSE)。

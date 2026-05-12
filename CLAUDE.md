# Claude 工作守則（DDIA 中文學習網站）

> 給未來進來的 Claude session 看的。讀完先動工。

## 專案是什麼

VitePress 個人學習網站，將《Designing Data-Intensive Applications》(Martin Kleppmann) 整理成 12 章 + 詞彙表 + 學習路徑的繁體中文教材，配 TL;DR / 章末測驗 / 進度追蹤等主動學習元件。

設計語言從 [stock 專案](C:\Users\User\Desktop\stock\stock\web) 移植：深鋼藍 brand + Material Symbols Rounded + Primitive→Semantic token 兩層架構。

## 文件入口

- 站台設定：[docs/.vitepress/config.mts](docs/.vitepress/config.mts)
- 主題與元件：[docs/.vitepress/theme/](docs/.vitepress/theme/)
- 章節資料 SSOT：[docs/.vitepress/data/chapters.ts](docs/.vitepress/data/chapters.ts)
- 共用 composable：[docs/.vitepress/composables/](docs/.vitepress/composables/)
- 內容：`docs/part-{1,2,3}/ch*.md`

## 必踩才會記得的地雷

### 1. 內容正確性 = 最高優先級（這是學習網站）

修改任何技術描述、TL;DR、測驗答案、詞彙表時，務必對照原書。**寧可空著也不要寫錯**——學習者第一次學就學歪比沒學還糟。

過去派 review agent 找出的 5 大事實錯誤類型（避免再犯）：
- 因果方向講反（例：「P999 對應大客戶」vs「大客戶通常出現在 P999」）
- 量化資料表格欄位歸錯（例：write amplification 給錯 B-Tree 還 LSM）
- 把不同概念當等價（PG REPEATABLE READ ≠ MySQL REPEATABLE READ ≠ SQL 標準）
- 把絕對保證寫成相對（quorum 不無條件保證讀到最新）
- 把破壞性事實弱化（heuristic decision 是「破壞原子性」不是「可能不一致」）

### 2. 章節資料只在 `data/chapters.ts` 維護，禁止散落

新增 / 修改 / 刪除章節時，**只改一個檔**：[docs/.vitepress/data/chapters.ts](docs/.vitepress/data/chapters.ts)。Dashboard、首頁、進度頁、sidebar 等顯示章節清單的地方一律 `import { CHAPTERS, TOTAL_CHAPTERS } from '../data/chapters'`。

config.mts 的 sidebar 目前還是寫死的，未來如果章節清單頻繁變動，再把 sidebar 也改成從 chapters.ts 動態產生（已在 chapters.ts 預留 `chaptersByPart()` helper）。

### 3. localStorage 一律走 `useStorage` / `useProgress` composable

禁止在 Vue 元件內直寫 `localStorage.getItem / setItem`。理由：
- 私密模式、quota exceeded、JSON 損毀的 fallback 集中處理
- 跨元件 reactivity（Progress 切換已讀後 ChapterCard / Dashboard 即時反映 —— 沒有 composable 會壞掉）
- 跨分頁同步（`storage` event listener 在 composable 中註冊）
- Schema 驗證（舊版資料用新元件不會崩潰）

新增需要 persist 的狀態：在 `docs/.vitepress/composables/` 開新 composable 或擴充 `useProgress.ts`。

### 4. 副作用一律在 `onMounted` 內

VitePress 是 SSG，build 時會在 Node.js 跑 Vue setup() 階段。**禁止在 `<script setup>` 頂層存取 `window / document / localStorage`** —— 會在 `npm run build` 時報錯。

正確：
```ts
onMounted(() => {
  const raw = localStorage.getItem('foo')
  // ...
})
```

錯誤（會炸 build）：
```ts
const data = localStorage.getItem('foo')  // ❌ build 時沒有 window
```

`useStorage` 已處理這點；自己寫的副作用記得包 `onMounted`。

### 5. Material Symbols 圖示要查證名稱

圖示名稱必須是 [Material Symbols 官方 ligature 名](https://fonts.google.com/icons)（例：`menu_book`、`schedule`、`track_changes`）。**用了不存在的名字會顯示成字面文字**（曾犯過 `target` → 字型沒這個 ligature，顯示成「target」三個字）。

新增圖示前可用瀏覽器開 https://fonts.google.com/icons 搜尋，複製官方名稱。

我們有 FOUT 防護（`color: transparent` 直到 `.fonts-loaded` class），所以字型載入前不會看到字面文字 —— 但用錯名字字型載入後還是會顯示成文字。

### 6. UI 改動必須用 Playwright 拍圖驗收

type-check + build 綠燈不代表畫面對。改 `docs/.vitepress/theme/`、`docs/.vitepress/composables/`、`docs/.vitepress/data/`、頂層內容檔的 frontmatter / 元件用法後，必跑：

```powershell
npm run screenshot
```

預設輸出到 `scripts/screenshots/snapshot-*.png`（6 個關鍵頁面 × 明暗模式 = 12 張）。要做 before / after 對照時：

```powershell
node scripts/screenshot.mjs before    # 改動前
# ...做改動...
node scripts/screenshot.mjs after     # 改動後
```

**前提：dev server 必須先啟動**（`npm run dev` 開另一個終端）。screenshot.mjs 預設打 `http://localhost:5173`。

### 7. 跑型別檢查確認改動沒破

```powershell
npm run type-check    # vue-tsc，禁止 any、未用變數
npm run build         # SSG 全頁渲染驗證
```

build 比 type-check 嚴格：會實際 SSR 每頁，Vue 元件的 props 型別不符或元件未註冊都會在這時候浮現。

### 8. 台灣化用詞檢查清單

- `process`（OS 層）→ **行程**，不是程序 / 進程
- cluster → **叢集**，不是集群
- ops / SRE → **維運**，不是運維
- Linearizability → **線性一致**，不是線性化
- 筆電 → **闔上**，不是合上
- VM → **遷移**，不是搬遷
- 但 `procedure` / RPC 的 P 譯「程序」是兩岸通用歷史譯名，可保留

### 9. CSS 拆分上限：單檔 ~500 行

`custom.css` 目前 ~700 行，未來再長就拆成 `tokens.css`、`base.css`、`components.css`、`layout.css`，在 `theme/index.ts` 多檔 import。

---

## 設計慣例（與 stock 專案對齊）

- **Brand**：深鋼藍 `#2F4A80`（brand-500）
- **字型**：Noto Sans TC（中文）+ JetBrains Mono（數字 / 程式碼）
- **圖示**：Material Symbols Rounded，預設 `weight=400`、`filled=false`；active state 才 `filled=true`
- **元件慣例**：`bg-surface` 卡片 + `border 1px var(--border-default)` + `border-radius: 12px`
- **間距**：卡片 padding `18px 20px`、grid gap `16px`
- **數字欄位**：套 `.numeric` class 或 `class="numeric"` + 等寬字
- **暗色模式**：VitePress 預設 `.dark` class on `<html>`，**不要**用 `[data-theme="dark"]`（stock 是 Next.js 自管所以用 data-theme，這裡跟著 VitePress 走）

---

## 跑測試 / 檢查

```powershell
npm run dev           # 開發伺服器（背景跑）
npm run type-check    # TypeScript / Vue 型別檢查
npm run build         # production SSG build
npm run screenshot    # Playwright 截圖（dev server 須先開）
```

改 [docs/.vitepress/data/chapters.ts](docs/.vitepress/data/chapters.ts)、composables、theme 元件 之前先跑過一次 type-check + build 確認綠燈再動。

---

## 已知限制

- 進度與測驗紀錄都在 **localStorage**，換瀏覽器 / 清快取會遺失（沒有後端帳號）
- 全文搜尋是 VitePress 內建 local search，CJK tokenizer 自訂在 `config.mts:106`
- 沒有 CI；commit 前自行跑 type-check + build + screenshot

---

## 結構概覽

```
docs/
├── .vitepress/
│   ├── config.mts                 # 站台設定、sidebar、nav、search
│   ├── types.d.ts                 # CSS / Vue 模組宣告
│   ├── data/
│   │   └── chapters.ts            # 章節 SSOT — 修章節清單只改這檔
│   ├── composables/
│   │   ├── useStorage.ts          # localStorage 統一介面 + 跨元件 reactivity
│   │   └── useProgress.ts         # 進度 / 測驗紀錄的高層 API
│   └── theme/
│       ├── index.ts               # 註冊全域元件、FOUT hook
│       ├── custom.css             # token + 元件樣式（拆 4 份的時機到了再拆）
│       └── components/
│           ├── Icon.vue           # Material Symbols 包裝
│           ├── TLDR.vue           # 章首重點卡片
│           ├── ChapterMeta.vue    # 章首 metadata 列
│           ├── Quiz.vue           # 章末測驗
│           ├── Progress.vue       # 已讀標記按鈕
│           ├── Dashboard.vue      # 進度儀表板
│           └── ChapterCard.vue    # 章節卡片
├── index.md                       # 首頁
├── progress.md                    # 進度頁
├── glossary/index.md              # 詞彙表
├── paths/index.md                 # 學習路徑
└── part-{1,2,3}/
    ├── index.md                   # Part 概覽
    └── ch*.md                     # 章節內容（12 章）

scripts/
├── screenshot.mjs                 # Playwright 截圖工具
└── screenshots/                   # 截圖輸出（gitignored）
```

# Claude 工作守則（DDIA 中文學習網站）

> 給未來進來的 Claude session 看的。讀完先動工。

## 專案是什麼

VitePress 個人學習網站，將《Designing Data-Intensive Applications》(Martin Kleppmann) 整理成 12 章 + Part 0 前置知識 + 詞彙表 + 學習路徑的繁體中文教材，配 TL;DR / 章末測驗 / 進度追蹤等主動學習元件。

**已公開於 GitHub**：<https://github.com/maplestartend/ddia-zh>（public, MIT + CC BY-NC-SA 4.0）
**線上版**：<https://maplestartend.github.io/ddia-zh/>（push 到 `main` 後 GitHub Actions 自動部署）

**設計方向**：Editorial Manuscript（O'Reilly 紙本書感 / 學習筆記隱喻）— mahogany clay 紅木陶土 + 米黃紙底 + Fraunces 襯線顯示字 + Noto Sans TC 內文。已脫離原本「stock 專案深鋼藍 SaaS」風格，往「書本而非文檔」的氣質拉。Primitive→Semantic token 兩層架構保留。

## ⚠️ 公開 repo 重要守則

1. **版權**：原書屬 Martin Kleppmann & O'Reilly Media，本站為**非商業個人學習筆記**。**任何時候改 LICENSE / NOTICE / 首頁 disclaimer / 詞彙表頂部 info 框時要極度小心**——這些是公開 repo 的法律防線
2. **外部回饋管道**：GitHub Issues（4 個 templates：content-error / translation / takedown / general）+ 私下 `asercv14632@gmail.com`。**目前不接受外部 PR**
3. **發布前必跑**：`type-check + build`（GitHub Actions 會擋）+ `lint:glossary + lint:tldr`（non-blocking 訊號）
4. **部署 base path**：local dev `/`、Pages `/ddia-zh/`。內部連結用 markdown `[...](/...)` 或 `<BaseLink to="/...">`、**不要** hard-code `<a href="/...">`（會在 Pages 上 404）

## 文件入口

- 站台設定：[docs/.vitepress/config.mts](docs/.vitepress/config.mts)
- 主題與元件：[docs/.vitepress/theme/](docs/.vitepress/theme/)
- 章節資料 SSOT：[docs/.vitepress/data/chapters.ts](docs/.vitepress/data/chapters.ts)
- 共用 composable：[docs/.vitepress/composables/](docs/.vitepress/composables/)
- 內容：`docs/part-{0,1,2,3}/*.md`（Part 0 = 0.0 basics + 0.1-0.7 前置）
- 工具腳本：[scripts/](scripts/) — lint-glossary / lint-tldr / lint-hardcoded-base / screenshot
- 公開資源：[LICENSE](LICENSE) / [LICENSE-CONTENT.md](LICENSE-CONTENT.md) / [NOTICE.md](NOTICE.md) / [CONTRIBUTING.md](CONTRIBUTING.md) / [SECURITY.md](SECURITY.md) / [.github/ISSUE_TEMPLATE/](.github/ISSUE_TEMPLATE/) / [.github/workflows/](.github/workflows/)
- **待辦清單**：[BACKLOG.md](BACKLOG.md) — Wave 10-21 後剩餘的內容擴充 / 學習產品功能 / 微觀修正 / 長期項目、按來源（5 位專業 agent + 5 位學習者 agent）與優先級分類

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

預設輸出到 `scripts/screenshots/snapshot-*.png`（關鍵頁清單在 `scripts/screenshot.mjs` 的 `PAGES` 常數，每頁明暗模式各一張）。要做 before / after 對照時：

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

### 8. 全站一律繁體中文（台灣用語），**絕對禁止任何簡體字**

**鐵則**：全站每一個中文字 —— markdown 內文、Vue 元件文字、code comment、frontmatter、commit message、PR 描述、issue template、README / CLAUDE.md / BACKLOG.md / NOTICE / SECURITY 等說明檔、GitHub Actions workflow 註解 —— 一律繁體中文。**任何簡體字都不准混入**，包括「複製貼上時不小心帶進來」、「從中國技術部落格抄參考時忘記轉」、「LLM 自動產出夾帶」、「**third-party 套件 UI 預設字串夾帶**」。

理由：學習者主要是台灣讀者，看到簡體字直接破壞「在地化技術書」的信任與閱讀節奏；兩岸技術用語差異大（程式 vs 程序、變數 vs 變量、佇列 vs 队列），混用會讓初學者更混亂；公開 repo 的識別度與一致性。

#### Third-party UI 字串地雷（已踩過、後人避坑）

VitePress 等套件預設 i18n 對「`lang: zh-TW`」會被 prefix-match `:lang(zh)` 命中、結果套用對岸的簡體 default。已知案例：

- **code-copy button 的 toast「已复制」**：VP `node_modules/vitepress/dist/client/theme-default/styles/vars.css` 內 `:lang(zh) { --vp-code-copy-copied-text-content: '已复制' }` —— 我們在 [tokens.css](docs/.vitepress/theme/styles/tokens.css) 尾巴 override 成「已複製」（同 specificity、後載入勝）

未來若發現任何 hover title / aria label / toast 是簡體（VP 升級、新裝 plugin 都可能引入），先到 `node_modules/<套件>/**/*.{css,js,ts}` grep 「`复制`/`确认`/`关闭`/`选择`/`错误`」等簡體字，找到後在我們的 CSS 用 `:lang(zh), :lang(zh-Hant), :lang(zh-TW)` 覆寫 CSS variable，或在 config 對應位置（如 VP `themeConfig.search.options.locales`）顯式設定繁體字串。

#### Self-check 指令

新增 / 修改任何中文內容後，在主目錄跑下列 PowerShell self-check（沒輸出就乾淨）：

```powershell
$banned = '设计应实现时这个们来进让给为从还过当会学习网络备选体间题问发关经单联务数据库处标准类状态错误缓区块链节点队顺异简检测试验证视觉资讯远软连复杂层级传输读写边达迁违适递释钟铁银销锁镜货财责贵赖谁该维护观规则际语键闭载虑报两纯绍计算视频频后台确认选择关闭错误'.ToCharArray()
$exclude = 'node_modules|\.git|dist|\.vitepress\\cache|screenshots'
Get-ChildItem -Recurse -Include *.md,*.ts,*.vue,*.css,*.mts,*.mjs,*.yml,*.json -File |
  Where-Object { $_.FullName -notmatch $exclude } |
  ForEach-Object {
    $file = $_
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    foreach ($c in $banned) {
      if ($content -and $content.Contains($c)) {
        Write-Host "❌ 簡體字「$c」出現於：$($file.FullName)"
      }
    }
  }
```

#### 台灣化用詞（兩岸技術用語差異）

- `process`（OS 層）→ **行程**，不是程序 / 進程
- cluster → **叢集**，不是集群
- ops / SRE → **維運**，不是運維
- Linearizability → **線性一致**，不是線性化
- 筆電 → **闔上**，不是合上
- VM → **遷移**，不是搬遷
- queue → **佇列**，不是队列
- variable → **變數**，不是變量
- 但 `procedure` / RPC 的 P 譯「程序」是兩岸通用歷史譯名，可保留

### 9. CSS 拆分上限：單檔 ~500 行

CSS 已拆 4 檔：`theme/styles/{tokens,base,components,layout}.css`，由 `theme/index.ts` 按序 import。維護規則：
- **`tokens.css`** 只放 CSS 變數（primitive + semantic + VP 對應）
- **`base.css`** 放 html/body/wrap rule、Material Symbols FOUT、prose typography
- **`components.css`** 所有 `.ddia-*` 元件樣式
- **`layout.css`** 響應式 + reduced-motion `@media`

每檔上限 ~500 行；`components.css` 接近此上限，未來再長可再拆 hero / dashboard / quiz / chapter-card 子檔。**所有 CSS 編輯走 Write / Edit 工具（utf-8 安全），禁止用 PowerShell 切檔**（曾因路徑分隔誤判產生 8 個 mojibake 空目錄污染 repo 根、中文註解也曾被 mojibake）。

### 10. 每章 TLDR 只能一個

每個 markdown 檔的章首 `<TLDR :points='[...]' />` **只能有一個**。`lint:tldr` 工具設計上每檔抓所有 TLDR 都驗，但內容結構上一章只該有一個總覽。如要章內小節重點，用 `::: tip` callout 代替。

### 11. 內部連結必須用 base-aware 寫法

部署到 GitHub Pages 時 base = `/ddia-zh/`，**hard-coded inline HTML `<a href="/...">` 不會自動加 base、會 404**。三種正確寫法：

- markdown `[文字](/path)` —— VitePress 自動加 base ✓
- `<BaseLink to="/path" variant="primary|ghost" icon="..." filled>...</BaseLink>` —— Vue 元件、包 `withBase()` ✓
- 絕對 URL `https://...` —— 不受 base 影響 ✓

**禁止**：`<a href="/part-0/...">`。lint 之後可能加 grep 偵測這個 anti-pattern。

### 12. TLDR 用詞檢查（避免「先恐嚇再解釋」）

TLDR 是讀者第一眼看的內容，**禁止用「之後章節才會講的詞」**。例如：
- 0.4 os.md 的 TLDR 不該用 SSTable（Ch3 才講）—— 改用「儲存結構」白話
- Ch1 的 TLDR 不該用 SLO（0.2 才講）—— 改用「品質目標」+ 括號定義

工具：`npm run lint:tldr`（Part 0 預設 ignore forward refs，因 Part 0 設計為暖身；`--strict` 連 Part 0 一起檢查）。Part 1+ 章 TLDR 用 Part 0 詞 OK、用後續 Part 1+ 章詞才是問題。

### 13. 版權標示防線（公開 repo）

修改任何下列檔案前**極度小心**——這些是公開 repo 的法律防線：

- [LICENSE](LICENSE) / [NOTICE.md](NOTICE.md)：MIT for code、CC BY-NC-SA 4.0 for content、disclaimer
- [docs/index.md](docs/index.md) 頂部 hero disclaimer（黃色 warning banner）
- [docs/.vitepress/config.mts](docs/.vitepress/config.mts) footer
- [docs/glossary/index.md](docs/glossary/index.md) 頂部 info box（「定義為作者改寫」）

**規則**：任何時候提到原書 / 作者 / 出版社，必須清楚標示「**非官方**」「**非授權**」「**著作權屬 Martin Kleppmann 與 O'Reilly Media**」。

### 14. 部署管線 / GitHub Actions

push 到 `main` 觸發 [.github/workflows/deploy.yml](.github/workflows/deploy.yml)：
1. `npm ci`
2. `npm run type-check`（嚴格、會擋 build）
3. `npm run lint:glossary` + `npm run lint:tldr`（non-blocking、continue on error）
4. `GITHUB_PAGES=true npm run build` → base 切到 `/ddia-zh/`
5. 部署到 GitHub Pages

**改 deploy.yml 前**要先在本地驗證 `GITHUB_PAGES=true npm run build` 通過、且 `<BaseLink>` / markdown link 都用對。

### 15. Editorial 美學守則（**重要：不要回頭走 SaaS 路線**）

整站視覺已從深鋼藍 SaaS 改造成 Editorial Manuscript（O'Reilly 紙本書感）。新增 / 改任何元件時：

- **新元件預設無圓角** — `border-radius: 0`；要 framing 用 `border-top/bottom: 1px solid var(--rule-hairline)` 把區塊夾起來，而不是 1px 全包邊 + 12px radius 卡片
- **標題 / eyebrow / CTA 用 `var(--font-display)`**（Fraunces + Noto Serif TC），內文用 `var(--font-body)`（Noto Sans TC）
- **大數字用 Fraunces oldstyle figures**（`font-feature-settings: "onum" 1`），不要 mono 大字
- **eyebrow 慣例**：italic + uppercase + letter-spacing `0.22em` + 12px + `text-tertiary` 色，例：`學習循環` `下一步` `章末測驗 · 5 題`
- **避免 Material Symbols 圖示**：新元件若用了 Icon，請在 scoped style 加 `:deep(.material-symbols-rounded) { display: none; }`，並用 `::before` 注入 typographic mark（`§` / `·` / `◆` / `→`）替代
- **callout / admonition** 用左 3px 髮絲線 + italic eyebrow，**不要**用淡黃淡藍 4 色 docusaurus 風 box
- **不要硬加 box-shadow** —— 書頁是平的、不浮起。hover 用「左 3px 印記 + 微淡背景」回饋
- **配色限制**：dominant 色用 mahogany clay `--brand-500`、sharp accent 用 manuscript orange `--accent-500`、語意色（success/warning/error）已調成同色溫和諧色（苔綠 / 焦糖 / 棗紅）；新增色彩請從 semantic token 取，**禁止**新增冷藍 / 紫 / 螢光綠

**參考具體實作**：[Hero](docs/.vitepress/theme/styles/components.css)、[ChapterCard 連體網格](docs/.vitepress/theme/styles/components.css)、[TLDR 書腰](docs/.vitepress/theme/styles/components.css)、[Quiz Editorial](docs/.vitepress/theme/styles/components.css)、[NextChapterBridge](docs/.vitepress/theme/components/NextChapterBridge.vue)、[Progress 連體按鈕](docs/.vitepress/theme/components/Progress.vue)、[Part0SelfAssessment](docs/.vitepress/theme/components/Part0SelfAssessment.vue)。

---

## 設計慣例（Editorial Manuscript — O'Reilly 紙本書感）

### 核心氣質

- **像書、不像 docs**：DDIA 是 O'Reilly 出版的書，這個網站要散發「正在被讀者親手做筆記的技術書」氣質。**避免**走 Stripe Docs / MDN / Notion 路線（規範化、商業、SaaS 罐頭感）
- **節制色彩 + 一個記憶 accent**：mahogany clay 紅木陶土當主色、manuscript orange 當連結 accent；不撒繽紛色票
- **印刷感優先**：襯線標題 + sans 內文 + oldstyle figures + 髮絲線分隔 + ◆ dinkus 取代 `<hr>`

### Brand 配色（兩層 token，semantic 變數見 [tokens.css](docs/.vitepress/theme/styles/tokens.css)）

| Token | Light | Dark | 用途 |
|-------|-------|------|------|
| `--brand-500` | `#8C3A2A` mahogany clay | `#E3A06A` warm orange | 主色（CTA、章號、active state） |
| `--accent-500` | `#C45A1B` manuscript orange | `#E3A06A` | 連結色、sharp accent |
| `--bg-canvas` | `#F4EFE6` 米黃紙 | `#171311` 暖炭墨 | 頁面底色 |
| `--bg-surface` | `#FBF7EF` 略亮米色 | `#1F1A17` | 卡片 / inset 表面 |
| `--text-primary` | `#1C1A17` near-black ink | `#EDE3CE` 米白 | 主文字 |
| `--rule-hairline` | `#1C1A17` | `#E3D9BF` | 髮絲線 / section rule |

### 字型 stack

- **顯示字**（標題 / hero / 章節編號 / pull-quote）：`var(--font-display)` = Fraunces（可變字型，opsz + SOFT + wght 三軸）+ Noto Serif TC fallback。**所有 h1/h2/h3/eyebrow/CTA 都用這套**
- **Body**（內文段落）：`var(--font-body)` = Noto Sans TC（保留 — 中文長文螢幕閱讀 sans 仍最舒服，serif 留給標題）
- **Mono**（程式碼 / 行內 code）：`var(--font-mono)` = JetBrains Mono
- **數字**：標題大數字用 Fraunces oldstyle figures（`font-feature-settings: "onum" 1`、`font-feature-settings: "tnum" 1`）；行內統計用 `.numeric` class

### 元件外觀慣例（**重要：撕掉 SaaS 卡片化**）

- **無圓角**：`border-radius: 0`（Material Symbols 圖示與按鈕除外，全站元件無圓角）
- **髮絲線優先於卡片**：用上下 1px `var(--rule-hairline)` 把區塊「夾」起來，**不要**用 1px 全包邊 + 12px radius 卡片
- **連體網格**：grid 卡片用「外框 top+left + 每張卡 right+bottom」拼成報紙網格（看 [.ddia-chapter-grid](docs/.vitepress/theme/styles/components.css)）
- **hover 用 3px 左印記** + 微淡背景，不要 lift shadow
- **間距**：垂直節奏拉開（h2 上方 `margin-top: 56px`、區塊 padding `22-28px`）
- **letter-spacing**：中文 `0.01-0.015em` 微撐、英文 small caps eyebrow `0.18-0.28em`

### 圖示 / 視覺資產

- **避免 Material Symbols 圖示前綴**：章節 h2、Quiz 標題、eyebrow、按鈕 — 圖示一律改用 typographic mark（`§` section sign / `·` dot / `◆` dinkus / `→` arrow）。Material Symbols 機制保留（Icon.vue 仍可用），但在 Editorial 預設「視覺隱藏」(`display: none`)
- **章末橋接 / Part 區段 / 各種卡的 eyebrow**：統一 italic 小寫小字 + 0.22em letter-spacing + uppercase
- **章節編號**：Fraunces SemiBold + uppercase + 寬字距（例：`CH·01`、`PART I`、`CHAPTER §`）

### 分隔元素

- **`<hr>` 自動變 ◆ ◆ ◆ dinkus**（見 base.css），不要用細灰線
- **`<SectionDivider>`** 元件已對齊 dinkus 風格
- **章節區塊** 用上下髮絲線 + italic eyebrow 框住，不用背景填色

### 暗色模式

- VitePress 預設 `.dark` class on `<html>`，**不要**用 `[data-theme="dark"]`
- **暗色不是 light 反色** — 暗色用獨立美學決定：暖炭墨 + 蠟燭光米白 + 暖橙 accent（主色從 mahogany clay 轉成更亮的 `--info-fg: #E3A06A`），避免「冷藍黑反色 + 同樣藍」的 AI-slop 指紋

### 不要做的事（AI-slop 反指紋清單）

1. **不要圓角 12px 卡片網格**（任何 SaaS 模板都長這樣）
2. **不要置中 hero + 圓 pill eyebrow + 雙 CTA 對稱**（Vercel/Linear/Stripe 標配）
3. **不要白底 + 鋼藍/紫漸層**（ChatGPT 寫前端最愛吐這個）
4. **不要單一字重撐全頁**（要有 serif display / italic / mono 對比）
5. **不要 docusaurus / mkdocs material 四色 callout**（黃藍綠紅 admonition box）
6. **不要 Material Symbols icon 前綴所有區塊標題**（已替換成 typographic marks）
7. **不要 dark = light 反色**（要獨立美學）
8. **不要為元件硬加 box-shadow 浮起感**（書頁是平的、不浮起）

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
- **CI 已啟用**（[deploy.yml](.github/workflows/deploy.yml)）：push 到 `main` 會自動跑 type-check + lint:glossary（non-blocking）+ lint:tldr（non-blocking）+ **lint:base（blocking）** + GITHUB_PAGES build。**lint:base 失敗會擋部署**（防 hard-coded href 在 Pages 上 404）。本地仍建議改完跑 `npm run type-check + build + screenshot` 確認綠燈再 push、減少 CI 來回

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
│       ├── styles/                # CSS 拆 4 檔（tokens / base / components / layout）
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

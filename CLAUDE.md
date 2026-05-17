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
- 工具腳本：[scripts/](scripts/) — lint-glossary / lint-tldr / lint-hardcoded-base / lint-typography / lint-spacing / lint-dark-patch / lint-chapter-sequence / screenshot
- 公開資源：[LICENSE](LICENSE) / [LICENSE-CONTENT.md](LICENSE-CONTENT.md) / [NOTICE.md](NOTICE.md) / [CONTRIBUTING.md](CONTRIBUTING.md) / [SECURITY.md](SECURITY.md) / [.github/ISSUE_TEMPLATE/](.github/ISSUE_TEMPLATE/) / [.github/workflows/](.github/workflows/)

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

#### lint:taiwan-terms 自動偵測（W46 新增）

`npm run lint:taiwan-terms` 掃 `docs/` + `scripts/` 內 `.md/.vue/.ts/.mts/.mjs/.css`、偵測對岸高頻詞（集群/队列/变量/运维 等）與純簡體字混入（设计/实现/数据库/网络/缓存/默认/错误/复制 等）。每處印「位置 + 對岸詞 → 台灣對應」、預設 non-blocking、`--strict` 即 exit 1（接 CI 阻擋）。Wave 46 reviewer agent 在 `docs/part-3/ch12-future.md:215` 抓到「合上」漏改為「闔上」、就是這個 lint 的觸發案例。新增禁詞改 `scripts/lint-taiwan-terms.mjs` 內的 `BANNED` 陣列即可。

**W47 更新**：BANNED 從 28 擴到 **65 詞**（resolution: senior reviewer #5 建議 70-90、但「對象/配置/刷新/菜單」等台灣有合法用法的詞**刻意不入**避免誤殺；歧義詞需 context 白名單機制、暫不實作避免 over-engineering）。`lint-taiwan-terms-allow` 行內 marker 用於 escape（`tokens.css` 對岸 VP override 用此）。

#### lint:tag-anchors（W47 新增）

`npm run lint:tag-anchors` 驗證 `ChapterMeta.vue` 內 `tagAnchors` map 的每個 anchor value 都在 `docs/glossary/index.md` 找得到 `{#xxx}`。預設 non-blocking、`--strict` 即 BLOCK。緣由：W46 把 ChapterMeta tag 變 glossary 連結後、若 glossary 重排或重命名會無聲 404；這個 lint 防回歸。

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

W50 把 W49 的 6 子檔再做語意化重切為 8 子檔，現在的結構：

```
theme/styles/
├── tokens.css                      只放 CSS 變數（primitive + semantic + VP 對應）
├── base.css                        html/body/wrap rule、Material Symbols FOUT、prose typography
├── components/
│   ├── editorial-marks.css       (453 行) TLDR / ChapterMeta / Badge / Quiz / 通用按鈕
│   ├── home-hero.css             (453 行) Hero + disclaimer + persona-router + cta + page-note + scenario
│   ├── dashboard.css             (464 行) Progress / Dashboard / Stats / 錯題本 / resume / ceremony / reading-progress
│   ├── chapter-cards.css         (284 行) Chapter cards + Part header（純化）
│   ├── custom-block.css           (54 行) VP admonition tip/info/warning/danger
│   ├── vp-overrides.css          (320 行) VP nav/sidebar/outline/search/footer（純 .VP* 覆寫）
│   ├── diagrams.css              (441 行) state-figure + DecisionTree + SequenceFlow
│   └── paths-glossary.css        (213 行) path-decision + path-cards + em-mark + recent-update + glossary
└── layout.css                      響應式 + reduced-motion @media
```

維護規則：
- 每檔上限 ~500 行；`chapter-cards.css` / `diagrams-paths.css` / `vp-overrides.css` 已偏上限、再加新規則前先評估拆子家族
- 新元件依視覺家族放入對應子檔；找不到家族就建新子檔（不要往最大檔塞）
- 加新檔記得在 `theme/index.ts` 對應 components/ 區塊 import
- **所有 CSS 編輯走 Write / Edit 工具（utf-8 安全），禁止用 PowerShell 切檔**（曾因路徑分隔誤判產生 8 個 mojibake 空目錄污染 repo 根、中文註解也曾被 mojibake）。
- W49 用 `sed -n 'A,Bp' file` 切檔在 git bash 下 LF/CRLF 自動處理；Git autocrlf 規則接管 commit 時的 normalize

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
npm run dev                    # 開發伺服器（背景跑）
npm run type-check             # TypeScript / Vue 型別檢查
npm run build                  # production SSG build
npm run screenshot             # Playwright 截圖（dev server 須先開）

# Lint 10 個（其中 base / dark-patch / chapter-sequence 三個 CI BLOCKING）
npm run lint:glossary          # 詞彙表內文 <G> 標記檢查（non-blocking）
npm run lint:tldr              # TLDR 用詞檢查（non-blocking）
npm run lint:base              # hard-coded href 偵測（BLOCKING）
npm run lint:typography        # raw font-size / letter-spacing（支援 allowlist 註解）
npm run lint:spacing           # raw margin / padding
npm run lint:dark-patch        # alias-redundant .dark 補釘（BLOCKING）
npm run lint:chapter-sequence  # 章末元件序列驗證（BLOCKING）
npm run lint:border-density    # 多重 border 反模式偵測（non-blocking）
npm run lint:taiwan-terms      # 對岸用語 / 簡體字混入偵測（non-blocking、--strict 才 BLOCK；W47 BANNED 65 詞）
npm run lint:tag-anchors       # ChapterMeta tagAnchors ↔ glossary anchor 對齊（W47 新增、防 glossary 重排無聲 404）
```

## W48 重大優化（5 perf reviewer 共識 P0+P1+P2 全執行）

**收益量化**：
- `app.js` 605 KB → **146 KB**（-76%）— mermaid plugin 拔除 + 章末元件 async
- `dist` 8.2 MB → **5.5 MB**（-33%）— 三大 mermaid chunks (wardley/cytoscape/katex) 完全消失
- `build time` 14.11s → **6.13s**（-56%）— 上述兩項合力
- `CI build time` ~90s → ~30s（actions/cache + 3 倍 dev velocity）

**改動清單**：
- **拔 `vitepress-plugin-mermaid` + `mermaid` 依賴**：[config.mts](docs/.vitepress/config.mts) 改 export default defineConfig、刪 mermaid block；[theme/index.ts](docs/.vitepress/theme/index.ts) 刪 mermaid `<title>` 注入 observer（~60 行）。Wave 38 早已用 DecisionTree / SequenceFlow 取代、plugin 殘留
- **章末元件改 `defineAsyncComponent`**：Quiz / Dashboard / Progress / Part0SelfAssessment / ReviewDue / DecisionTree / SequenceFlow / InterviewBlock / PartCheckpoint / GlossaryIndex 等 16 個元件、首頁不再下載
- **`ChapterFloatingProgress` 換 `useRoute()`**：刪 popstate + MutationObserver hack（~15 行）
- **抽 `useLastVisited` composable**：ChapterOpener / Dashboard 共用、修「上次讀 X 天前」SPA 換頁不更新 bug
- **CHAPTERS / PREREQUISITES / GLOSSARY 改 `as const satisfies`**：推出 `ChapterId` / `PrerequisiteId` / `GlossarySlug` / `GlossaryTerm` literal union type、編譯期擋下 id / slug 漂移
- **字型 preload + Fraunces SOFT 軸 0..100 → 40..80**：LCP -300~500ms、字檔省 ~25%
- **search index manualChunks**：`@localSearchIndexroot` 拆到獨立 `search-index.js` chunk、首屏不阻塞
- **token alias 收斂**：刪 `--rule-major` / `--space-transition` / `--space-half-ritual` / `--space-ritual` / `--ink-strong/mid/soft` 共 8 個 0 引用 alias、減未來決策成本
- **icon-hide 重複規則收斂**：14 處 `:deep(.material-symbols-rounded) { display: none }` 從 .vue 內全刪、靠 base.css 的 global `!important` 規則覆蓋
- **Dashboard mode prop 拆**：progress.md 改用 `<DashboardStats />`、Dashboard 元件純跑 fresh/complete/resume 三態
- **useStorage overload**：object/array T 強制要求 validate（防跨分頁 cast 大門 silent corruption）
- **ChapterMeta props 在 types.d.ts 補精準型別**：讓 vue-tsc 抓 .md 內元件用法 prop 拼錯
- **GitHub Actions cache**：`actions/cache@v4` 對 `docs/.vitepress/cache + node_modules/.vite` 做 key-based 快取
- **CI 補 2 個 lint summary**：lint:tag-anchors + lint:taiwan-terms 進 deploy.yml（continue-on-error、印到 step summary）

**W49 進度**：
- ✅ components.css 2772 行已拆 6 子檔（見 §9）— build / type-check / 全 lint 通過、視覺零變動（純檔案重排）
- ⏸️ 抽 `.editorial-eyebrow` / `.editorial-mark-typo` utility class — 15+ 處替換需配 .vue 元件 template 連動、最小改動原則繼續延後；新 Editorial 元件直接寫 inline 即可（保持目前模式一致）

## W50 清掃輪（5 reviewer re-audit 共識 P0+P1 全做）

W48 / W49 後 5 個 reviewer 重審找出的死碼 + 語意化機會、本輪一次清完。

**量化收益**：
- `dist` 5.5 → **4.8 MB**（−13%）
- `woff2` 642 → **228 KB**（−64%、Inter 14 檔 540 KB 完全沒用）
- `build time` 6.13 → 5.93s
- 0 個 minify warning（原 W46 反引號殘留）
- search-index 683 KB 不再進 modulepreload（VPLocalSearchBox 觸發才下載）

**P0 改動**：
- **拔 Inter 字型**：`import DefaultTheme from 'vitepress/theme-without-fonts'`（取代 `vitepress/theme`）— VP 提供的官方無字型入口；站內 0 處用 Inter（grep 證實）
- **修 font preload URL 與 stylesheet 一致**：W48 兩條 URL 不同（preload 缺 SOFT 軸）= 白做工；W50 同步
- **拔 mermaid dead CSS 130 行**：vp-overrides.css 90 行（mermaid SVG override + dark palette + foreignObject）+ layout.css 40 行（mermaid 容器、SVG max-width、foreignObject overflow）— W48 plugin 拔了但 CSS 沒清
- **修 CSS minify warning**：tokens.css 註解內反引號 `` ` `` 觸發 esbuild minifier、改純文字
- **search-index 排除 modulepreload**：`transformHtml` hook 過濾 `<link rel="modulepreload" ... search-index ...>`、首屏 transfer −683 KB

**P1 改動**：
- **CSS 8 子檔（W49 6 → W50 8）**：vp-overrides 純化（dashboard-resume/ceremony/reading-progress 158 行搬回 dashboard.css）+ 抽 home-hero.css（合 disclaimer-scenario + chapter-cards 內 hero/cta）+ diagrams-paths 對半拆 → diagrams.css + paths-glossary.css + 抽 custom-block.css 獨立
- **Dashboard.vue useLastVisited() L86 → L60**：修 TDZ-like 可讀性問題（原本靠 lazy computed getter 才沒爆）
- **icon-hide 10 處再清**：components/*.css 內 `.ddia-XXX .material-symbols-rounded { display: none }` 全刪、base.css `!important` 已覆蓋

**8 子檔最終分布**：
```
editorial-marks.css   453 行 · TLDR / ChapterMeta / Badge / Quiz / 按鈕
home-hero.css         453 行 · Hero + disclaimer + persona-router + cta + page-note + scenario
dashboard.css         464 行 · Progress / Dashboard / Stats / 錯題本 / resume / ceremony / reading-progress
chapter-cards.css     284 行 · Chapter cards + Part header（W50 純化）
custom-block.css       54 行 · VP admonition tip/info/warning/danger
vp-overrides.css      320 行 · VP nav/sidebar/outline/search/footer（純 .VP* 覆寫）
diagrams.css          441 行 · state-figure + DecisionTree + SequenceFlow
paths-glossary.css    213 行 · path-decision + path-cards + em-mark + recent-update + glossary
─────────────────────────────
TOTAL              2,682 行（W49 後 2,772 行、W50 拔 mermaid 後 −90 行）
```

**W50 未做（backlog 留 W51+）**：
- chapter-cards.css 284 行 + dashboard.css 464 行 + home-hero.css 453 行 仍接近上限、未來新增規則前先評估拆子家族（reviewer 共識：現狀內聚、不必硬拆）

## W51 修死債輪（5 verifier 共識）

W50 之後 5 verifier 重審找出 critical regression + sleeping bug、本輪一次清完。

**P0 修 sleeping bug**：
- **`lint:base` CI 假綠燈** — CLAUDE.md §14 承諾 BLOCKING、但 `npm run lint:base` exit 0 即使有 hits。改預設 BLOCKING（exit 1 on findings）、`--warn` flag 退回 warning-only。CI 不該用 `--warn`。
- **paths/index.md 5 個 hard-coded `<a href="/...">` 修為 markdown `[文字](/path)`**（W47 加的、在 GitHub Pages 會 404）

**P1 polishing**：
- `path-divider` 33 行從 home-hero.css 搬到 paths-glossary.css（concept fit）
- editorial-marks.css 頂部註解更新（W50 後不再含 Hero / Dashboard / ChapterCard）
- 刪 `transformHead({ assets }) { return [] }` no-op（Verify #5 指出）
- ADR template 拆 `<details>` 延後（內容為 markdown code block、`<details>` 對 chunk size 影響不確定）

**P2 小修**：
- **補 unit test 設施 + 24 個測試** ([chapters.test.ts](docs/.vitepress/data/chapters.test.ts) 17 + [glossary.test.ts](docs/.vitepress/data/glossary.test.ts) 7)：裝 vitest、加 `npm test` + `npm run test:watch`、CI deploy.yml 加 unit test 步驟。SSOT 正確性測試（id 唯一、順序、part 對齊、shortDef 長度上限、findTerm 行為）。從 Tech Lead 評 🔴 tests 升 🟡
- **useLastVisited 加 `hasLastVisited` helper** ([useLastVisited.ts](docs/.vitepress/composables/useLastVisited.ts))：消 ChapterOpener / Dashboard 內 2 處 `lastVisited.value!` non-null 斷言
- **router monkey-patch 改 WeakSet** ([theme/index.ts](docs/.vitepress/theme/index.ts))：原 `__ddiaDropCapHooked` flag 屬性 + type cast 噪音消除、改 `const hookedRouters = new WeakSet<object>()`
- Fraunces opsz subset 延後（站內實測仍用 opsz 144、無法縮）

**未做（背景理由）**：
- ADR template chunk 99.9 KB 拆 — Verify 估「-60-70 KB」但內容是 markdown code block、`<details>` 不會降 chunk size、純 UX 改善
- 字型 subset — opsz 144 仍在用、SOFT 30 已在 W50 40..80 之外但視覺正常（fallback OK）、再壓有風險

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
├── glossary/index.md              # 詞彙表（70+ 詞、7 條 ★ 面試常考 Badge）
├── paths/
│   ├── index.md                   # 學習路徑（依角色）
│   ├── 30-day-beginner.md         # 30 天初學者版（高中 / 大二 / bootcamp）
│   ├── 30-day-summer-plan.md      # 30 天完整版（工作 1-3 年）
│   ├── interview-cheatsheet.md    # 面試題 × DDIA 對照（20 處本土場景）
│   ├── adr-template.md            # ADR 4-Q 模板 + 7 範例（含失敗 ADR）
│   ├── capacity-planning.md       # 容量規劃工作表
│   └── incident-postmortems.md    # 8 個真實事故 × DDIA 對照 + 本土範本
├── bridges/oltp-de.md             # OLTP ↔ 資料工程視角橋
└── part-{0,1,2,3}/
    ├── index.md                   # Part 概覽
    └── ch*.md                     # 章節內容（12 章 + Part 0 八個前置）

scripts/
├── screenshot.mjs                 # Playwright 截圖工具（主腳本）
├── lint-*.mjs                     # 7 個 lint
└── screenshots/                   # 截圖輸出（gitignored）

主要 Vue 元件（theme/components/）：
- 章首：ChapterOpener（含整本進度條 + floating progress 觸發點）/ ChapterMeta（read-time + deep-read-range）/ PrereqBox / TLDR / FirstReadShortcut
- 章末：Quiz（★/☆ 分級）/ InterviewBlock（details 摺疊）/ ChapterNote / Progress / NextChapterBridge / PartCheckpoint（Ch4/9/12 跨章自評）
- 視覺化：DecisionTree / SequenceFlow（取代 Mermaid、Wave 38）/ SectionDivider
- 詞彙：GlossaryTerm（G alias，tooltip Teleport 到 body）/ GlossaryIndex（A-Z sticky）/ GlossaryStarLinks（面試 ★ 7 條速跳）/ GlossaryBackButton（referrer 跳回章節）
- 基礎：Icon（Editorial 模式下純 sr-only a11y）/ BaseLink
- 進階：Dashboard（fresh/resume/complete 三態 + 3 步 mini guide）/ DashboardStats（partial）/ ChapterCard / CheatSheetExport / Part0SelfAssessment（含 X/7 總分 banner）/ ReviewDue / ChapterFloatingProgress（章節頁右上角浮現）
```

## Wave 42 / Wave 43 設計收尾（4 位專家 4 輪審視從 B+ 升 A/A+）

整站視覺與互動經四輪審視收斂、目前處於「production-ready Editorial Manuscript」狀態。關鍵改動：

- **章首加整本進度條**（ChapterOpener 內含 Ch X/12 + 整本 N% + ▾ 位置 marker）
- **章節頁 floating progress chip**（捲過章首 280px 後右上角浮現、桌面 ≥ 1024px 才顯示）
- **首頁 hero 改 numeric stats**（40 / 12 / 3 + Fraunces oldstyle figures + 底邊 hairline 與 CTA 分區）
- **路徑卡 ★ 推薦**（PATH·01「兩週速成」brand tint + 左印記、其他 5 卡視覺降一階）
- **詞彙表三件套**：A-Z sticky 索引 + 面試 ★ 7 條 quick links + 跳回章節 referrer button
- **決策樹 leaf 去 pill border**（純文字 + 左 3px tone 印記、edge label inline italic + → mark）
- **暗色 hairline 提到 #C5B89A**（對 #1C1714 bg 對比 3.1:1 達 WCAG UI 3:1）
- **Dashboard 三態**：first-visit 3 步 mini guide / returning「整本 X/12 + 上次讀於 N 天前」frame / complete ceremony
- **inline code**：bg `var(--brand-tint-soft)` + 底線、Editorial 等寬引文質感
- **章節寬度桌面拉到 880-1040px**（避免 1440px 中文 22 字/行豆腐塊）
- **InterviewBlock 改 `<details>` 預設收起**（章末瘦身）+ NextChapterBridge 加 Continue CTA
- **GlossaryTerm tooltip Teleport 到 body**（修 ARIA APG）+ singleton scroll listener
- **Progress 改 reactive quizIndex 取代 setInterval**（多分頁不再多個 timer）
- **Part 0 self-assessment 結果 banner**（X/7 答得出來 + 建議補強清單）
- **內容正確性紅旗修**：Riak 預設不是 LWW、Ch11 Line 比喻降為「概念上類似」、Hopping 表頭去 sliding 子句

最終評等共識：🎨 設計師 **A+** / ⚙️ 前端 **A** / 📚 教材 **A (91)** / 🧭 UX **A**

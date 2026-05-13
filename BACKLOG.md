# Backlog

> **目的**：把目前視覺改造工程的狀態交接給下個 session。
> **最後更新**：Wave 29 commit `c256207` 後（七輪 agent 審視完成）

---

## 當前狀態：整體 grade A-

從 Wave 25 開始的 5 維度視覺改造、跑了 7 輪 multi-agent 審視。當前狀態：

| 維度 | 一輪 | 二輪 | 三輪 | 四輪 | 五輪 | 六輪 | 七輪 |
|---|---|---|---|---|---|---|---|
| **配色 / 暗色** | D | B+ | A- | A | A | A | **A** |
| **互動 / a11y** | D+ | B+ | A- | A- | A | A | **A** |
| **元件相鄰** | D+ | B | C+ | B | A- | A- | **A-** |
| **Typography** | D | D+ | C+ | B- | B | B | **B+** |
| **間距 / 密度** | D | C+ | C+ | B- | B- | B | **B+** |

**平均**：D → A-（兩級跳）

---

## Commit 歷史（Wave 25-29）

| Commit | Wave | 內容 |
|---|---|---|
| `9b5bafd` | **Wave 25** | 暗色 leak + ChapterOpener mark + token 系統建立 + brand-500 4 處 demotion + a11y P0 補丁 |
| `9366076` | Wave 25.1 | NextChapterBridge 拿掉內部 dinkus 避免章末撞兩排 |
| `0a6f37f` | Wave 25.2 | hr 改短髮絲線 + 移除 5 處 SectionDivider 前冗餘 `---` |
| `7c723c4` | Wave 25.3 | 移除 `.claude/` Claude Code 本地設定 + 加 `.gitignore` |
| `b917929` | **Wave 26** | 6-item：letter-spacing/font-size token sweep（78 處）+ 章末 hairline 合併 + Footer 雙線修 + info/error/brand semantic 拆 + --focus-ring + lint:typography/spacing 腳本 |
| `fc05e25` | Wave 26.1 | hotfix：class typo 3 條 + chapter-mark 56→36 + DocSearch outline + var(--info-fg)→var(--brand-fg) 45 處 sweep |
| `fd9f9e0` | **Wave 27** | 5-item：a11y P1（ChapterCard aria-label + textarea focus）+ accent #93521A + ReviewDue dark + 章首/章末節奏 + 章首 :has 合併 + 79 處 token sweep |
| `219d1fe` | **Wave 28** | 6-item：章末 5:1 對比 + btn :focus-visible + :active + accent rgba 同步 + 54 處 fvar sweep + 71 處 spacing sweep + italic 示範 |
| `c256207` | **Wave 29** | 5-item：0.5 階 token (6/12/20/28) + brand-500 alias (mark-fg/rule-active/cta-bg) + type-token h2-tight/body-lg/meta + 章末 3 階節奏 (28/40/64) + tint-soft alpha + mermaid `<title>` + bridge/card :focus-visible |

---

## 關鍵指標

```
token 採用率：Wave 27 124 處 → Wave 29 490 處（4× 翻倍）
lint:spacing：Wave 26 200 → Wave 29 65（68% 砍）
lint:typography：Wave 26 219 → Wave 29 124（43% 砍）
italic eyebrow：Wave 28 30 處 → Wave 29 14 處（53% 砍）
brand-500 直接業務使用：Wave 29 前 ~50 處 → Wave 29 後 6 處（88% 收斂）
```

---

## Wave 30 候選清單（七輪 agent 共識）

從 Wave 29 七輪審視的 5 agent 報告整理。每項 agent 都列為 P0 該做。

### 30a · Typography 補階 + ls token 拆（Typography agent）

**現況**：lint:typography 124 處持平、type token 8 階仍漏 11/11.5/13/15.5/17/26/28/36/38px 等中間值；letter-spacing 只有 `--ls-eyebrow` 1 個 token、0.04/0.06/0.08/0.18/0.28em 全沒名字。

**要做**：
- tokens.css 補：`--type-mini: 11px` / `--type-tiny: 11.5px` / `--type-small-tight: 13px` / `--type-section: 17px` / `--type-feature: 38px`
- tokens.css 拆 ls：`--ls-tight: 0.01em` / `--ls-loose: 0.04em` / `--ls-eyebrow: 0.18em`（重命名）/ `--ls-display: 0.28em`
- PowerShell sweep 對應 raw 值 → 新 token
- 預期：lint:typography 124 → ≤30
- 砍剩 italic 殘留 6 處（InterviewBlock × 3、Part0SelfAssessment × 3）→ italic 達成「儀式專屬」終態

**工作量**：~1 小時

### 30b · spacing 強制 sweep 中間值（間距 agent）

**現況**：lint:spacing 65 處剩餘、其中 14px(14)、10px(10)、18px(7) 共 31 處是「token 階之間設計微調」。

**要做**：強制收斂、**不**加 0.25 階 token（會破壞 scale 心智模型）：
- 14px → 12 or 16（依語境）
- 10px → 8 or 12
- 18px → 16 or 20
- 加 `--space-5-5: 56px` 給「章末→Bridge」儀式間距命名（清 3 處）
- 預期：lint:spacing 65 → ~34（47% 再減）

**工作量**：~30 分鐘

### 30c · 配色尾巴清掃（配色 agent）

**現況**：
- brand-500 業務用量已從 ~50 砍到 6 處，但仍有 5 處 raw 殘留（components.css `.ddia-cta.primary` border / `.ddia-cta.ghost:hover` color / DocSearch hover ×2 / sidebar active）
- 新增的 `--rule-active` token 採用率 **0%**（sweep 漏抓 `border-left-color` 該用 rule-active 卻全去了 mark-fg）
- `--mark-fg` 與 `--ink-mark` 同值同語意重複

**要做**：
- 5 處 raw brand-500 → 對應 alias（cta-bg / mark-fg / rule-active）
- quiz-option `border-left-color` 三處 + sidebar active + ChapterCard top 印記 → `var(--rule-active)`
- 刪 `--ink-mark` 或 `--mark-fg` 二擇一（建議保留 `--mark-fg`、`--ink-mark` 是先前 Wave 25 加的、未廣泛採用）

**工作量**：~30 分鐘

### 30d · 互動 a11y 三修（互動 agent）

**最重要：MutationObserver 重大效能問題**（Wave 29d 引入）：
- 現況：observe 整個 `document.body` 全 subtree、scroll progress bar 寫 width 也觸發 callback、每次微動全 DOM 掃描 `querySelectorAll('svg[id*="mermaid"]')`、route change 不 disconnect、長頁時 callback 觸發數百次/秒
- 修：改 observe `.vp-doc` 而非 body、加 mutations.some 過濾「真的有 SVG 加入」、route change 時 disconnect 重建
- 位置：[theme/index.ts L60-90](docs/.vitepress/theme/index.ts)

**其他**：
- click-flash class 解 Enter 鍵 `:active`（鍵盤 Enter 觸發 click 不會吃 `:active` 視覺、瀏覽器限制）
- mermaid title 過濾 dinkus / 短分隔字符（目前可能朗讀到 `---` / `◆ ◆ ◆` / 純表情）

**工作量**：~1 小時

### 30e · 元件相鄰收尾（元件相鄰 agent）

**現況**：Wave 29e 清掉 28e 4 條死代碼、但**自己又種了 2 條新死代碼**：
- `.ddia-quiz + .ddia-note`（[base.css L223](docs/.vitepress/theme/styles/base.css)）— 章末固定序列 Quiz→Interview→Note、永不匹配
- `.ddia-quiz + .ddia-chapter-loop`（L229）— 同上、永不匹配

**驗證點**：3 階章末節奏（28/40/64）實機視覺感知是否真的可辨識
- agent 報告：總高仍 200px（與 wave28 單一 40px 相等、只是內部重分配）
- 28→40 差 12px、40→64 差 24px、在中間元件本身體積大時被吃掉
- 建議：派 user-pov agent 對比 wave28 vs wave29 章末截圖、若「看不出差別」→ 退回單一 40px 簡化規則；若「真有儀式封頂感」→ 把 Bridge 上方 gap 拉到 80px (`--space-7`) 才能感知

**工作量**：~15 分鐘（刪死代碼）+ 視驗證結果決定後續

---

## 完整 Wave 30 範圍（如果全做）

按 agent 共識 P0 排序：

```
30d 修 MutationObserver（互動）   ~1h    P0 critical（效能 bug）
30a Typography 補階 + ls 拆     ~1h    P0
30b spacing 強制 sweep          ~30m   P0
30c 配色尾巴 + alias 收斂        ~30m   P0
30e 元件相鄰收尾                ~15m   P0
總計：~3.5 小時
```

預期 Wave 30 後：
- lint:typography 124 → ≤30
- lint:spacing 65 → ~34
- brand-500 業務用量 6 → 0（全走 alias）
- italic eyebrow 14 → 8（達成儀式專屬）
- MutationObserver 不再洩漏效能
- 整體 grade：A- → A

---

## 不該做（5 agent 共識）

- ❌ **hover 5 種風格統一** — Editorial 多樣性是特徵不是 bug、SaaS 罐頭感反指紋
- ❌ **左印記 11 種統一** — 同上
- ❌ **再砍 brand-500 為了砍而砍** — 走 alias semantic 才是正解
- ❌ **加 0.25 階 spacing token** — 會破壞 scale 心智模型、token 過細反失語意
- ❌ **章末 margin 再加深超過 40/64** — 會超出 viewport 比例感

---

## 重要檔案位置

| 檔案 | 用途 |
|---|---|
| [docs/.vitepress/theme/styles/tokens.css](docs/.vitepress/theme/styles/tokens.css) | 全部 token 定義（含 spacing / type / fvar / ls / focus-ring / brand-* alias） |
| [docs/.vitepress/theme/styles/base.css](docs/.vitepress/theme/styles/base.css) | prose typography、章首章末 adjacency 規則、a11y skip link |
| [docs/.vitepress/theme/styles/components.css](docs/.vitepress/theme/styles/components.css) | 所有 .ddia-* 元件樣式（最大檔、最多殘留 raw） |
| [docs/.vitepress/theme/index.ts](docs/.vitepress/theme/index.ts) | reading progress + skip link + mermaid title MutationObserver（Wave 29d 引入） |
| [scripts/lint-typography.mjs](scripts/lint-typography.mjs) | 偵測 raw font-size / letter-spacing |
| [scripts/lint-spacing.mjs](scripts/lint-spacing.mjs) | 偵測 raw margin / padding ≥4px |

## 跑驗收的指令

```powershell
npm run type-check       # vue-tsc 型別檢查
npm run build            # SSG build 驗證
npm run lint:typography  # 看 raw font-size + letter-spacing 殘留
npm run lint:spacing     # 看 raw spacing 殘留
npm run lint:base        # hard-coded href 偵測（CI blocking）
npm run lint:glossary    # glossary 一致性
npm run lint:tldr        # TLDR 用詞檢查
npm run screenshot       # Playwright 拍 13 頁 light+dark
```

---

## Wave 30 開工指引（給下個 session）

1. **先讀本 BACKLOG.md + CLAUDE.md** 掌握歷史與設計守則
2. **起 dev server**：`npm run dev`
3. **跑 lint 看當前 baseline**（確認改動空間）
4. **依優先級執行**：建議 30d → 30a → 30b → 30c → 30e（30d critical bug 先修）
5. **每 wave commit 一個**、commit message 仿 Wave 28/29 風格（標明 agent 來源 + 量化指標）
6. **完工後派 5 agent 第 8 輪審視**（仿 Wave 29 後做的格式）
7. **shutdown dev server**

下個 session 開工直接說「跑 Wave 30 全做」即可。

---

*最後更新：Wave 29 commit `c256207`、七輪 agent 審視完成、整體 grade A-*

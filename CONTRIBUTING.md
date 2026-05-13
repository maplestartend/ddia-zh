# Contributing

感謝關注 DDIA 中文學習網站。**目前不接受外部 Pull Request**，但歡迎以下形式的回饋：

## 我可以怎麼幫忙？

### ✅ 歡迎的回饋形式

走 **[GitHub Issues](https://github.com/maplestartend/ddia-zh/issues/new/choose)**，已備四種 template：

| 類型 | 用途 |
|---|---|
| **content-error** | 事實錯誤、技術描述不準、Quiz 答案錯 |
| **translation** | 翻譯建議、台灣化用詞改進 |
| **takedown** | 原作者 / 出版社 / 版權方的下架要求 |
| **general** | 一般學習建議、UX 回饋 |

私下溝通：**asercv14632@gmail.com**（商業合作、版權細節、敏感建議）

### ❌ 為什麼不接受 PR

這是**個人學習筆記**，內容組織、用詞、敘事節奏都是作者學習旅程的一部分。外部 PR 帶來幾個問題：

1. **著作權邊界模糊**：本站內容已是 CC BY-NC-SA 4.0、原書屬 Martin Kleppmann & O'Reilly Media，第三方 PR 會讓「誰是改寫者」變得不清楚
2. **學習一致性**：每章前後語氣 / 用詞 / 跨章銜接需要單一作者把關
3. **正確性責任**：作為公開學習資源，事實錯誤的責任應該由作者承擔、而非分散

如有強烈想參與意願，請走 Issue 提案——作者會評估後納入。

## 如果你發現了內容錯誤

最珍貴的回饋。請開 **content-error** Issue，告訴我：

- **位置**：哪一章 / 哪一節 / 哪段文字（最好附 markdown 行號）
- **問題**：哪裡錯了、為什麼
- **建議**：如果你有更精準的版本，附上來；或附上原書頁碼 / 論文連結讓我查證

事實錯誤的修正會以最高優先級處理（見 [CLAUDE.md](CLAUDE.md) §1「內容正確性 = 最高優先級」）。

## 本地開發

如果你 fork 自己玩、跑本地 dev 環境：

```powershell
# 需要 Node.js 22+（CI 用 22）
npm install
npm run dev      # http://localhost:5173

# 部署前驗證
npm run type-check             # vue-tsc 嚴格、會擋 build
npm run build                  # production SSG
npm run lint:glossary          # 詞彙表內文標記檢查（non-blocking）
npm run lint:tldr              # TLDR 用詞檢查（non-blocking）
npm run lint:base              # hard-coded base path 偵測（CI BLOCKING）
npm run lint:typography        # raw font-size / letter-spacing 偵測
npm run lint:spacing           # raw margin / padding 偵測
npm run lint:dark-patch        # alias-redundant .dark patch 偵測（CI BLOCKING）
npm run lint:chapter-sequence  # 章末元件序列驗證（CI BLOCKING）
npm run screenshot             # Playwright 拍快照（dev server 須先開）
```

詳細寫作守則見 [CLAUDE.md](CLAUDE.md)，架構說明見 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 章末元件序列規約

如果你打算修改章末元件結構（新增章節 / 改順序），下列 5 種序列模式是 [docs/.vitepress/theme/styles/base.css](docs/.vitepress/theme/styles/base.css) adjacency 規則的對應 contract、**新章節必須符合其中一種**，否則 `lint:chapter-sequence --strict` 會擋 PR：

| 模式 | 序列 | 對應章節 |
|---|---|---|
| **A** · Part 0 短序列 | Quiz → Bridge | Part 0 七章（intro/metrics/sql/os/network/data-structures/concurrency） |
| **B** · 主課省 Interview + callout | Quiz → Note → Progress → Bridge | ch02/04/06/08/10/12（6 章） |
| **C** · 主課省 Interview | Quiz → Note → Progress → Callout → Bridge | ch03 |
| **D** · 主課完整 | Quiz → Interview → Note → Progress → Callout → Bridge | ch01/05/07/09/11（5 章） |
| **E** · 暖身導讀（無 Quiz） | Callout → Bridge | Part 0 basics（章首暖身、無測驗） |

**新增第 6 種模式 SOP**：
1. 在 [scripts/lint-chapter-sequence.mjs](scripts/lint-chapter-sequence.mjs) `ALLOWED` 陣列補新模式
2. 在 base.css 章末 adjacency 區補對應 `.foo + .bar` 規則
3. 在本 CONTRIBUTING.md 表格補新模式
4. 跑 `npm run lint:chapter-sequence` 確認所有章節全 match

避免 Wave 30e 那種「憑印象判定死代碼」的 regression。

## 設計級值白名單

整站 [`lint:typography`](scripts/lint-typography.mjs) 偵測 raw `font-size`/`letter-spacing`、`lint:spacing` 偵測 raw `margin`/`padding`。某些印刷設計級值（dinkus 字距、ceremony 寬距、code block 字級、quiz-difficulty tag spacing 等）有意保留為 raw、使用 inline 註解 skip：

```css
.ddia-section-divider::before {
  letter-spacing: 0.8em;  /* lint-typography-allow: section dinkus 印刷寬距 */
}
```

格式：`/* lint-typography-allow: <reason> */`。註解必須在 raw value 同一行。

## 版權與授權

- **程式碼**：[MIT License](LICENSE)
- **學習內容**：[CC BY-NC-SA 4.0](LICENSE-CONTENT.md)

提交 Issue 即視為同意你的回饋以相同條款釋出（內容類回饋 CC BY-NC-SA、程式類 MIT）。

## 安全議題

漏洞回報請走 [SECURITY.md](SECURITY.md) 描述的私下管道、**不要**直接開公開 Issue。

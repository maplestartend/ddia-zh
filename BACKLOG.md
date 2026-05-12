# Backlog

剩餘待辦清單。來自 Wave 10-21 期間 multi-agent review（5 位專業審視 agent + 5 位學習者 agent 二次走讀）的回饋、本人尚未動工或部分完成的項目。

> **狀態**：Wave 21 commit `875ed8e` 為止。後續 Wave 從這份 backlog 挑題。
>
> **優先級規則**：P0 = 多 agent 共識 + 高 ROI；P1 = 單 agent P0 或多 agent P1；P2 = 加分項 / 長期。

---

## A. 內容擴充

### A1. Quiz 題庫擴充 + 標 difficulty（P0、學生 agent）
- **現況**：Quiz.vue 已支援 `difficulty: 'basic' | 'applied' | 'interview'` 與 CSS 樣式、但**所有現有題目都沒填 difficulty**（dead config）
- **要做**：先從 Ch5 / Ch7 / Ch9 / Ch11 四章開始、每章 8-12 題、每題標 difficulty
  - 比例建議：2 basic + 3 applied + 3 interview = 8 題基本盤
- **工作量**：每章 ~30 分鐘、4 章共 2 小時
- **同時做**：擴充過程中再順手補 sectionAnchor（21.3 只補了少數題）

### A2. 每章末「真實系統選型決策樹」mermaid（P0、後端 agent + DBA agent）
- **現況**：Ch7 已有 lost update 決策樹（Wave 21.5b）、Ch3 / Ch5 / Ch9 / Ch11 沒有
- **要做**：每章末加一個 mermaid `graph TD`、入口是「我的場景」、出口是「該選 X 不選 Y」
  - **Ch3**：LSM 派（RocksDB / Cassandra）vs B-Tree 派（PG / MySQL）的選型決策
  - **Ch5**：單 region / 跨 region / sloppy 寬容 三種複製場景的決策
  - **Ch9**：強一致 / 跨多物件 / 跨 region 的共識引擎選型（Raft / Paxos / Spanner / CRDB）
  - **Ch11**：Kafka Streams vs Flink vs Spark Structured Streaming 的選型
- **工作量**：每章 ~1 小時、4 章共 4 小時

### A3. 「DDIA 概念 → 高頻面試題」對應速查表（P0、學生 agent + DBA agent）
- **現況**：`paths/index.md` 面試準備路徑只是「3 週時程表」、沒有具體題目對應
- **要做**：新建 `docs/paths/interview-cheatsheet.md` 或在 `paths/index.md` 末尾加：
  - 系統設計題 ↔ DDIA 章節對應表
  - 例：「設計 News Feed」→ Ch1 §1.3 P99 + Ch5 fan-out write/read + Ch6 分區策略
  - 例：「轉帳系統」→ Ch7 lost update + write skew + Ch9 saga/outbox/TCC
  - 例：「設計即時通訊」→ Ch11 stream join + Ch9 共識 / Kafka KRaft
  - 例：「分散式 KV 選 leader」→ Ch8 fencing token + Ch9 Raft term + vote rule
- **工作量**：~3 小時（題目研究 + 對應整理）

### A4. 分散式 SQL 五家對照表（P1、DBA agent）
- **現況**：Ch7 §7.2「各家 DB 隔離級別」表已涵蓋 9 家。但「**分散式 SQL 五家對照**」（Spanner / CRDB / YugabyteDB / FoundationDB / TiDB）這種**時鐘機制 + 強一致範圍 + commit latency**的橫向比較還沒有
- **要做**：在 Ch9 §9.6 Spanner TrueTime 段落結尾、加一張 5 列 × 4 欄表
- **工作量**：~1 小時

### A5. PrereqBox 延伸到主 12 章（P1、newbie agent）
- **現況**：只有 Part 0.3 / 0.4 有 PrereqBox
- **要做**：Ch1 / Ch7 / Ch9 優先（最容易嚇跑新手的章）。每章寫「需要先會」+「第一次讀預估」+「可跳節」
  - Ch1：先讀 0.1 + 0.2、預估 60-90 分鐘、可跳「Twitter fan-out 詳細數學」
  - Ch7：先讀 0.3 §5 + 0.4 §1、預估 90-120 分鐘、可跳「Phantom 在 SI 下要分兩種看」warning block
  - Ch9：先讀 Ch5 + Ch8、預估 90-120 分鐘、可跳「Paxos 細節」
- **工作量**：每章 ~30 分鐘、優先 3 章共 1.5 小時

### A6. Ch11 stream-stream join 框架對照表深化（P2、DE agent）
- **現況**：Wave 21.5a 已加 watermark 三家對照、但「stream 框架完整對照」（編程模型 / state backend / 容錯機制 / window 類型 / 部署模式）還沒
- **要做**：Ch11 §11.4 後另開「框架選型對照」段、7 維度橫向比較 Kafka Streams / Flink / Spark / Beam
- **工作量**：~2 小時

### A7. Ch10 / Ch11 / Ch12 內容微補（P2）
- **DE agent**：Ch10 §10.5 Dataflow 引擎「lineage 重算 vs checkpoint」對比段
- **DBA agent**：Ch9 補「joint consensus」展開（為什麼動態變更成員麻煩）
- **DBA agent**：Ch11 加「Kafka EOS + 外部 sink 實作 pattern」具體 code 範例（outbox / UUID-based 冪等 INSERT ON CONFLICT）

---

## B. 學習產品功能

### B1. Quiz 簡答模式（P1、學生 agent）
- **現況**：Quiz 是純單選 radio
- **要做**：Question schema 加 `mode?: 'multiple-choice' | 'short-answer'`，short-answer 用 textarea + 對 model answer
  - 不需自動評分、提供「展開參考答案」按鈕
  - 「面試準備」路徑特別有用
- **工作量**：~2 小時（component 升級 + 5 章各補 3 題）

### B2. SRS 整合 Quiz：答錯自動進 ReviewDue（P1、newbie agent）
- **現況**：SRS（useReview）只在「標已讀」時 seed
- **要做**：Quiz 答錯首次 < 80% 時、自動加進 ReviewDue 清單（間隔 1d 重來）
  - 修改 `Progress.vue` 觸發點：seed 改成「標已讀 OR quiz 首次未滿分」雙觸發
  - 或在 `useProgress.saveQuiz` 內直接呼叫 `seedReview(chapterId)`
- **工作量**：~1 小時

### B3. JSON 進度匯出 / 匯入（P1、newbie agent）
- **現況**：CheatSheetExport 只能單向匯出 markdown
- **要做**：在 progress.md 加：
  - 「匯出完整進度（JSON）」：打包所有 `ddia-*` localStorage 成 JSON 檔下載
  - 「匯入進度」：選 JSON 檔、解析後寫回 localStorage、reload
  - 用例：換瀏覽器 / 清快取前備份、跨裝置同步
- **工作量**：~1.5 小時

### B4. SRS 複習積極度三檔開關（P2、學生 agent）
- **現況**：間隔固定 `1d → 3d → 7d → 14d → 30d → 60d → 120d`
- **要做**：加全域設定「寬鬆（3d 起跳）/ 標準（1d 起跳）/ 衝刺（12h 起跳）」三檔
  - 儲存在 `ddia-srs-cadence` localStorage key
  - progress.md 加 select
- **工作量**：~30 分鐘

### B5. Dashboard 學習熱力圖（P2、學生 agent）
- **現況**：Dashboard 只有 4 KPI + 錯題本
- **要做**：類似 GitHub contribution graph、顯示「過去 90 天每天的學習活動」（標已讀 / 做測驗 / 寫筆記 = 點亮一格）
- **工作量**：~3 小時（含 d3 / 自寫 SVG 取捨）

### B6. ChapterNote textarea 範例 placeholder 強化（P2、學生 agent）
- **現況**：placeholder「寫下你對這章的個人理解、自己的例子……」
- **要做**：placeholder 加範例三行：「例：對應 LC 1234 / 公司 X 問過 / 我犯過的錯」
- **工作量**：5 分鐘

---

## C. 新元件 / 新頁面

### C1. SecuritySearch / 全文 search 改進（P2）
- **現況**：VitePress 內建 local search、CJK tokenizer 已調過
- **可能改進**：詞彙表 hover 詞時、自動搜尋對應章內容（cross-link）

### C2. 「我的學習統計」獨立頁（P2、學生 agent）
- **現況**：Dashboard 只在 progress.md
- **要做**：獨立 `/stats/` 頁、顯示更詳細：學習熱力圖 + 各 Part 完成度 + 累積筆記字數 + 答題趨勢
- **依賴**：B5 熱力圖先做

---

## D. 微觀修正

### D1. Ch1 PrereqBox（P1、newbie agent）
- **要做**：Ch1 首頁兩個 CTA 之一是「直接讀 Ch1」、newbie 一進來就遇到滿滿英文詞 TLDR。Ch1 章首補 PrereqBox 寫「沒讀 0.1 + 0.2 建議先回頭、特別是 P99 / SLO 部分」
- **工作量**：5 分鐘

### D2. glossary Serialization Failure 補 SQL Server / Oracle 精準錯誤碼（P2、DBA agent）
- **現況**：Wave 21 已加 40001 條目 + Oracle ORA-08177 + SQL Server 1205/3960
- **可以更精準**：Oracle SERIALIZABLE 對映 SQLSTATE `72000`、不是 `40001`
- **工作量**：~10 分鐘（已部分做完、收尾）

### D3. CheatSheetExport 加「整體統計」段（P2、學生 agent）
- **現況**：匯出按章節列、沒有「總計」
- **要做**：markdown 頂部加「讀了 X 章 / 平均首次答對率 Y% / 累積筆記 Z 字 / 過去 30 天活躍 N 天」
- **工作量**：~30 分鐘

### D4. CheatSheetExport 重設按鈕分離（P2、newbie agent）
- **現況**：「匯出」與「重設我的進度」並排、視覺上易誤觸
- **要做**：「重設」放摺疊區、需先 confirm 兩次
- **工作量**：~15 分鐘

### D5. ChapterMeta 章節說明（P2、學生 agent）
- **現況**：3 週面試路徑「第 3 週塞 Ch9 + Ch11 + Ch12 太重」
- **要做**：調整成 Ch9 + Ch11 一週、Ch12 + 複習一週
- **工作量**：~10 分鐘

---

## E. 大幅擴充（長期）

### E1. 完整 i18n 預留（P2、架構師審視）
- **現況**：config.mts `lang: 'zh-TW'`、UI 字串散在各處
- **要做**：把 UI 字串集中到 `data/i18n.ts`、未來加英文版只改一處
- **工作量**：~4 小時

### E2. ADR（Architecture Decision Records）（P2、架構師審視）
- **要做**：開 `.github/adr/` 或 `docs-internal/adr/`、記 5-10 個關鍵決策
  - 為什麼選 VitePress
  - 為什麼 localStorage 不上後端
  - 為什麼 Quiz schema 對題數變動採丟棄而非 migration
  - 為什麼 CC BY-NC-SA 4.0 不是 MIT
- **工作量**：~2 小時

### E3. 內容品質 lint 擴充（P2、架構師審視）
- **現況**：有 lint:glossary / lint:tldr / lint:base
- **要做**：
  - `lint:links`：掃 markdown link 指向不存在章節
  - `lint:taiwan-terms`：grep 偵測中國譯法漏網（程序 / 集群 / 運維）+ procedure 白名單
  - `lint:icon-name`：對照 Material Symbols ligature 白名單、抓拼錯
- **工作量**：每個 lint ~1 小時、共 ~3 小時

### E4. 內容資料層抽象（P2、架構師審視）
- **現況**：`data/chapters.ts` 與 DDIA 章節耦合
- **要做**：分離 `types/curriculum.ts`（泛用結構）+ `data/ddia-chapters.ts`（instance）、讓 fork 衍生作（如「七週學分散式系統」）只換一檔
- **工作量**：~2 小時

---

## F. 已實作但可補強

### F1. PrereqBox 延伸到 Part 0 其他章（已部分做）
- **現況**：0.3 SQL / 0.4 OS 有
- **建議**：補 0.5 網路 / 0.6 資料結構 / 0.7 並行（這些對 newbie 也卡）

### F2. InterviewBlock 延伸到其他章（已部分做）
- **現況**：Ch1 / Ch5 / Ch7 / Ch9 / Ch11 有
- **建議**：Ch3（儲存）/ Ch6（分區）也加（系統設計面試常考）

### F3. Quiz sectionAnchor 補完（已部分做）
- **現況**：Ch7 / Ch9 / Ch11 各補 1-3 題
- **建議**：Ch1 / Ch5 也補；Quiz 題庫擴充（A1）時同時做

---

## 來源彙整

| Agent | 提出年月 | 我覺得最值得做的 3 件 |
|---|---|---|
| 前端 newbie（二次） | 2026-05 | Quiz 答錯進 ReviewDue（B2）/ PrereqBox 延伸主 12 章（A5）/ JSON 匯出入（B3）|
| 後端 fintech（二次） | 2026-05 | 每章末選型決策樹（A2）/ Ch7 流程圖（已做、Wave 21.5b）/ 「真實系統選型」段 |
| 12 年 DBA（二次） | 2026-05 | 分散式 SQL 五家對照（A4）/「DDIA→面試題」速查（A3）/ glossary 40001 補強（已做、Wave 21.4）|
| CS 大四面試（二次） | 2026-05 | InterviewBlock（已做、Wave 21.2）/ Quiz 擴題 + 簡答模式（A1 + B1）/ Dashboard 接首次答對率（已做、Wave 21.1）|
| 5 年 DE（二次） | 2026-05 | Ch11 watermark 三家對照（已做、Wave 21.5a）/ bridges 修 2 條（已做、Wave 21.4）/ DE 路徑加 bridges 入口（已做、Wave 21.4）|
| 架構師審視（一次） | 2026-05 | ADR（E2）/ 內容 lint 擴充（E3）/ i18n 預留（E1）|

---

## 處理順序建議（如果一次處理）

如果要再做一波、ROI 由高到低：

1. **A1 Quiz 題庫擴充 + difficulty + sectionAnchor 補完**（4 章 ~2-3 小時）
   - 同時解決 A1 + F3 + B1 部分（題目寫好就能加 difficulty 與 sectionAnchor）
2. **B2 Quiz 答錯進 ReviewDue**（~1 小時）
   - 學習閉環、newbie 強烈想要
3. **A5 + D1 PrereqBox 延伸到 Ch1 / Ch7 / Ch9**（~1.5 小時）
   - newbie 痛點、防嚇跑
4. **A3「DDIA → 面試題」速查表**（~3 小時）
   - 學生 + DBA 共識、面試路徑配套
5. **A2 每章末選型決策樹**（~4 小時）
   - 後端 + DBA 共識、實務派最想要

剩下的（A4 / A6 / B1 / B3 / B5 / E1-E4）視時間情況、可分多波。

---

*最後更新：Wave 21 後（commit 875ed8e）*

---
title: ADR 模板 — 從 trade-off 學習到產出決策
---

<ChapterMeta part="學習路徑" :read-time="20" difficulty="實務" :tags="['ADR', 'Architecture', 'Decision Record']" />

# ADR 模板 — 從 trade-off 學習到產出決策

讀完 DDIA 你學到的是「**每個技術選擇都有 trade-off**」——但 trade-off 知識需要落在**可追溯的決策文件**上、否則團隊永遠在重複討論同樣的問題、未來人也不知道為什麼選 X 而不選 Y。

**ADR（Architecture Decision Record）** 是業界事實標準的決策記錄格式。Michael Nygard 2011 年推廣、被 ThoughtWorks Tech Radar 列為「Adopt」、現在 GitHub / Atlassian / Spotify / 各大平台公司都用。

---

## ADR 四問模板（4-Q）

每個 ADR 是一個 markdown 檔（建議放在 `docs/adr/0001-xxx.md`），含四個段落：

### 1. Context（背景）

> 我們現在面對什麼問題？為什麼**現在**要做決定（不是「未來可能」）？

寫法：
- 問題的觸發點（產品需求 / production incident / 合規要求 / 技術債）
- 利害關係人（誰會被影響）
- 約束條件（時間 / 預算 / 法規 / 既有系統相容）

❌ 反例：「我們需要一個訊息佇列」
✅ 正例：「Q3 新功能『訂單通知』要求 99.9% 送達率、99% 在 10 秒內、預計初期 1K msg/min、12 個月後到 10K msg/min；既有 stack 是 AWS、團隊 3 人、沒人有 Kafka 維運經驗」

### 2. Decision（決策）

> 我們選擇怎麼做？

寫法：
- 動詞開頭、明確的「我們將...」（不是「考慮 / 評估 / 探索」）
- 包含具體技術選型 + 部署方式 + 預期生效時間

❌ 反例：「考慮使用 Kafka 或 SQS」
✅ 正例：「**我們將採用 AWS SQS Standard Queue** + Lambda consumer，初期單一 queue 設計，12 個月後若 throughput 接近 10K msg/min 再評估切到 Kafka MSK 或 Kinesis」

### 3. Consequences（後果）

> 這個決定帶來什麼？正面 + 負面**都要寫**。

寫法：
- **正面**：解決了什麼問題、達到什麼能力
- **負面**：放棄了什麼能力、未來想換要付什麼成本
- **中性**：對團隊 / 維運 / 開發流程的影響

❌ 反例：「使用 SQS 簡單可靠」（只寫好的、沒寫壞的）
✅ 正例：
> **正面**：上線快（既有 IAM + Terraform 模組）、無維運（managed service）、單月 $50 以下成本
> **負面**：失去 message ordering（Standard Queue 不保證、需在 consumer 自己處理）、失去 replay 能力（不像 Kafka 可從 offset 重播）、未來想做 event sourcing 必須整套換掉
> **中性**：consumer 寫成 Lambda 後團隊的 debug 流程需要習慣 CloudWatch Logs、不能 ssh 進去看

### 4. Alternatives Considered（替代方案）

> 我們**沒**選什麼？為什麼？

寫法：
- 列出至少 2 個被認真考慮但放棄的選項
- 每個都寫「為什麼不選」（一句話即可）
- 這欄是未來人重新評估的起點

❌ 反例：（跳過這欄）
✅ 正例：
> - **Kafka MSK**：放棄。團隊無 Kafka 維運經驗、初期 1K msg/min 用不到 Kafka 能力、學習曲線吃掉 Q3 進度
> - **RabbitMQ on EC2**：放棄。要自己管 EC2 + 高可用、與 AWS managed 政策不符
> - **Redis Streams**：放棄。Redis 已存在但用作 cache、訊息持久化保證不夠（依賴 RDB / AOF tuning）

---

## 5 個完整範例 ADR（對應 DDIA 章節）

這 5 個範例對應五種最常見的決策場景、可以複製拿去當你公司 ADR 的起點。

### 範例 1：訊息佇列選型 — SQS vs Kafka（對應 Ch11）

```markdown
# ADR-0023: 訂單通知選用 AWS SQS（而非 Kafka）

**Status**: Accepted　**Date**: 2024-09-12　**Authors**: 後端架構小組

## Context
Q3 上線「訂單通知」（push + email + SMS）。預期初期 1K msg/min、12 個月後 10K msg/min；
99.9% 送達率、99% < 10s。既有 stack：AWS + Terraform、團隊 3 人、無 Kafka 經驗。預算 < $200/月。

## Decision
採用 **AWS SQS Standard Queue** + Lambda consumer。單一 queue、consumer 失敗進 DLQ
（max retries=3）。月成本估 $50。12 個月後若接近 10K msg/min 再評估 Kafka MSK / Kinesis。

## Consequences
- ✓ 1 週上線（Terraform 模組已有）、無維運、月 $50 vs 自管 RabbitMQ ≈ $300
- ✗ 失 FIFO ordering（除非用 SQS FIFO、上限 300 msg/sec）、失 replay（須額外存 S3）、未來換 Kafka 需重寫 consumer
- 中性：debug 走 CloudWatch Logs、不用裝 Prometheus

## Alternatives Considered
- **Kafka MSK**：放棄。學習曲線吃掉 Q3 進度、初期吞吐用不到 Kafka 能力
- **RabbitMQ on EC2**：放棄。自管 HA 與 AWS managed 政策衝突
- **Redis Streams**：放棄。Redis 是 cache、持久化保證不夠
```

### 範例 2：資料庫選型 — PostgreSQL vs MongoDB（對應 Ch2 + Ch3）

```markdown
# ADR-0008: 新專案主資料庫選用 PostgreSQL（而非 MongoDB）

**Status**: Accepted　**Date**: 2024-03-04

## Context
B2B SaaS 新專案、預期 3 年內 < 100M 筆訂單。業務模型大量 JOIN（訂單 ↔ 客戶 ↔ 商品 ↔ 出貨）。
團隊 4 人都熟 SQL、無 production NoSQL 經驗。

## Decision
採用 **PostgreSQL 16**（AWS RDS）+ JSONB 處理半結構化欄位（如商品自訂屬性）。

## Consequences
- ✓ 開發速度快、SQL 工具鏈完整、未來可加 read replica
- ✓ JSONB 已能 cover「文件式」需求、不用真的引入 NoSQL
- ✗ 極端水平擴展時 PG 分片比 Mongo 痛（但業務量還很遠）
- 中性：團隊熟悉、招募容易

## Alternatives Considered
- **MongoDB**：放棄。JOIN 模式多、團隊無經驗
- **MySQL**：放棄。PG 的 JSONB / CTE / partial index 在我們用例更靈活
- **CockroachDB**：放棄。我們不需要跨 region 寫一致性、PG 已夠
```

### 範例 3：跨服務交易 — Saga vs 2PC（對應 Ch7 + Ch9）

```markdown
# ADR-0042: 訂單流程採用 Saga Orchestration（不採 2PC）

**Status**: Accepted　**Date**: 2025-02-18

## Context
訂單建立要協調 4 個服務：付款、庫存、物流、通知。服務在不同 VPC、不能用 2PC。
業務允許「最終一致」（卡 30 秒不致命、但**不能丟單**）。

## Decision
採用 **Saga Orchestration（Temporal 框架）**、定義各服務的 compensating action：
- 付款失敗 → 取消訂單
- 庫存不足 → 退款 + 通知客戶
- 物流失敗 → 回補庫存 + 退款

## Consequences
- ✓ 可觀測（Temporal UI 看每步狀態）、可重試、無 coordinator SPOF
- ✓ 補償邏輯與 happy path 並列、不會被遺忘
- ✗ 要寫 compensating handler（5 服務 × 失敗點、最終 8 個 handler）
- ✗ 中間狀態對外可能可見（訂單從「已付款 → 取消中 → 已退款」、UI 要處理）
- ✗ 一旦上 production、流程改動要小心 in-flight transaction

## Alternatives Considered
- **2PC / XA**：放棄。coordinator 失效卡整個流程、跨 VPC 高延遲
- **Choreography Saga**：放棄。流程鏈長、debug 困難、團隊無經驗
- **不做交易、靠 eventually consistent**：放棄。訂單一致性是業務核心
```

### 範例 4：服務架構 — modular monolith vs microservices（對應 Ch1 + Ch4）

```markdown
# ADR-0001: 新產品線採 modular monolith（不立刻拆 microservices）

**Status**: Accepted　**Date**: 2023-11-07

## Context
新產品團隊 6 人、12 個月內要 MVP。業務還在快速迭代、bounded context 不穩（很可能 6 個月後重組）。
沒有需要獨立擴展的元件。

## Decision
採用 **modular monolith**（NestJS + 強制模組邊界 + 內部禁止跨模組直接 import）。
未來撞到擴展或團隊規模門檻、再走 Strangler Fig 抽出 microservice。

## Consequences
- ✓ 開發速度快 2-3×、無分散式 debug、團隊認知負荷低
- ✓ 部署簡單（單一 deploy unit）
- ✗ 未來某模組要獨立擴展、抽出來有成本（但比一開始就拆少）
- 中性：CI/CD pipeline 一條、不用維護多套

## Alternatives Considered
- **從一開始拆 5 個 microservice**：放棄。過早、bounded context 不穩、6 人 cover 不過來
- **完全沒模組邊界的 monolith**：放棄。12 個月後一定耦合到拆不開
- **Service Weaver / Encore**：考慮過、但團隊不熟新框架、風險高
```

### 範例 5：擴展讀流量 — read replica + cache vs sharding（對應 Ch5 + Ch6）

```markdown
# ADR-0015: 擴展讀流量採 read replica + Redis cache（不分片）

**Status**: Accepted　**Date**: 2025-06-23

## Context
寫流量 500 QPS（單機輕鬆）、讀流量 5K QPS 開始撞 PG 單機天花板。業務模型多表 JOIN
（分片會很痛）。預估未來 12 個月讀流量再長 3×。

## Decision
- 加 2 台 PG read replica（async streaming replication、lag 監控 < 5s）
- 加 Redis cache（熱 key + 5 分鐘 TTL、採 **cache-aside / write-invalidate** 模式：write 同步把 cache 對應 key 刪掉、下次讀 cache miss 再回填）
- API gateway 層做 read-write splitting（write → master、read → replica）

## Consequences
- ✓ 開發改動小、cache 砍 60% 讀打到 DB
- ✓ 容易 rollback（不行可以全切回 master）
- ✗ replica lag 帶來 read-your-writes 異常（用 session-sticky 解、user 自己的寫導回 master）
- ✗ cache 一致性要小心（write 同步刪 cache、否則 stale）
- ✗ 跨 region read replica 延遲還是有（不是 multi-leader）

## Alternatives Considered
- **直接 sharding**：放棄。過早、業務模型 JOIN 太多、維運複雜
- **換 Aurora Serverless**：放棄。成本高、垂直擴展上限不夠未來成長
- **CockroachDB 全替換**：放棄。我們不需要跨 region 寫一致性、改造成本太高
```

### 範例 6：ADR 怎麼演進 — Deprecated 與 Superseded（架構文件不是聖經）

ADR 不是寫完就永遠正確——當業務變了、技術成熟了、團隊組成變了、原本對的決策可能變錯。**ADR 的狀態欄要能反映這個演進**，而不是把舊 ADR 偷偷刪掉假裝沒發生過。

**狀態變化規則**：

- **Proposed**：草稿、還在討論
- **Accepted**：定案、團隊已開始實作
- **Deprecated**：仍可用但不建議新用例採用（軟下線、舊系統繼續跑、新功能不再走這條）
- **Superseded by ADR-XXXX**：被另一個 ADR 完全取代（硬下線、有明確接替的決策）

**真實演進範例**：原本範例 1 選了 SQS、18 個月後條件變了、被新 ADR 取代——兩份 ADR **都保留**，形成可追溯的決策歷史。

```markdown
# ADR-0023: 訂單通知選用 AWS SQS（而非 Kafka）

**Status**: Superseded by ADR-0081 (2026-03-10)　**Date**: 2024-09-12

## Context
（原內容保留）...

## Decision
（原內容保留）...

---

**Superseded note**（2026-03-10 補充）：
此 ADR 在 2026 Q1 被 ADR-0081 取代。原因：訂單 throughput 在 2025 Q4 突破 15K msg/min、
SQS Standard 的 best-effort ordering 開始造成客訴（同一訂單的「已建立 → 已付款 → 已出貨」事件
偶爾被消費者亂序處理）、且我們新增 fraud detection 服務需要重播 30 天歷史 event 做模型訓練、
SQS 沒有 replay 能力。已切換到 Confluent Cloud Kafka、見 ADR-0081。
```

```markdown
# ADR-0081: 訂單通知改用 Confluent Cloud Kafka（取代 ADR-0023）

**Status**: Accepted　**Date**: 2026-03-10
**Authors**: 後端架構小組
**Supersedes**: ADR-0023

## Context
ADR-0023（2024-09）選 SQS Standard 的條件已不適用：

- throughput 從 1K msg/min → 15K msg/min（15× 成長）
- 需要 event replay（fraud detection 模型訓練要 30 天歷史 event）
- 訂單事件 ordering 開始成為客訴來源（每月約 200 件「出貨通知比付款通知早到」）

預算上限從 $200/月 → $2000/月可接受。團隊 3 人在 2025 Q2-Q3 已上過 Kafka 課程 + 跑過 PoC。

## Decision
採用 **Confluent Cloud Kafka**（managed、不自管 Broker）。3 個 topic（`order` / `payment` / `shipping`）、
按 `order_id` 分區（同一張訂單事件保證同 partition、保證 ordering）、保留 30 天。

## Consequences
- ✓ event replay 解了 fraud detection 模型訓練的痛點
- ✓ ordering 保證（per partition）解了客訴
- ✗ 成本 10×（$50 → $500/月、含 Confluent 費用）、團隊維運複雜度 +20%
- ✗ ADR-0023 已部署的 SQS infrastructure 要花 1 個月遷移 + 1 個月雙寫觀察期

## Alternatives Considered
- **AWS MSK 自管**：放棄。團隊規模不夠養 Kafka cluster、寧可付 Confluent managed 費用
- **Kinesis Data Streams**：放棄。replay 機制相對弱（**24h 預設保留、2020 後可延長到 365 天但要付每 GB-hour 費用**、且 stream 數 / shard 數有 region 軟上限）、Confluent 生態（Connectors / Schema Registry / Streams DSL）更完整。本案需 30 天 replay 雖然技術上 Kinesis 撐得住、但工具鏈與成本平衡點仍輸 Confluent
- **保留 SQS + 加 EventBridge replay**：放棄。EventBridge 14 天保留期不夠 30 天訓練窗口

## Migration Plan
1. Week 1-2：部署 Confluent Cloud cluster + Schema Registry、3 個 topic 建好
2. Week 3-4：新 producer 雙寫（SQS + Kafka）、consumer 仍只讀 SQS、觀察 Kafka 端資料正確性
3. Week 5-6：consumer 切到 Kafka 為主、SQS 為 fallback（dual consumer 同時跑）
4. Week 7：SQS 進 read-only、確認 30 天無新 in-flight 事件後下線、保留 SQS DLQ 1 個月以備調閱

## Learnings from ADR-0023
- 18 個月前的「先用簡單的 SQS」決定**並沒有錯**——當時 1K msg/min 用 Kafka 是 over-engineering、團隊沒人會養 Kafka、$50/月 vs $500/月的預算現實也擋住
- 真正讓我們撐到能上 Kafka 的、是 ADR-0023 寫得清楚「**12 個月後若接近 10K msg/min 再評估**」+「**未來想換要付什麼成本**」（重寫 consumer）——這兩段就是這次評估的起點
- **ADR 的價值不是「一次選對」、是「讓未來人看得懂為什麼當時這樣選 + 什麼時候該換」**
```

**這個演進範例教什麼**：

1. **ADR 不是一次定終身**——條件變了就要重新評估、原本「對的」決策可能變「不再對」
2. **Superseded note 保留在原 ADR、不刪**——未來人能看到「為什麼當時選 SQS、後來為什麼換」，避免「為什麼前人這樣做？」的考古學
3. **新 ADR 明確引用舊 ADR**（`Supersedes: ADR-0023`）——形成可追溯的決策歷史鏈、ADR repo 是「決策的 git log」
4. **演進原因要寫清楚**——不是「我們想換」、是「條件變了：throughput / replay / ordering 三個觸發點」、新人讀完知道判斷依據
5. **`Learnings from ADR-XXXX` 段是最被低估的價值**——把「為什麼當時選 A 沒錯、但 18 個月後條件變了所以換 B」寫進新 ADR、新人讀一份就懂兩份決策的脈絡

::: tip 為什麼這個範例最重要
前 5 個範例是「**做選擇**」、這個範例是「**演進選擇**」——production 系統的 ADR 不是一次定終身。`Supersedes` / `Deprecated by` 欄位 + `Learnings` 段讓未來的工程師看得到**為什麼當時選 A、為什麼後來換 B、過程中學到什麼**。這正是 Michael Nygard 2011 寫 ADR 文時最強調的價值：「**決策過程的歷史記錄、比決策本身更有價值**」（the record of the decision process is more valuable than the decision itself）。

建議**每季 review 一次所有 Accepted ADR**——看條件還成不成立。Shopify 工程文化推這個做法、把 ADR 從「歷史文件」變「活的決策清單」。台灣公司常見的反模式是「ADR 寫完丟 Confluence 沒人讀」、變成 cargo-cult 動作——**ADR 要被讀、被挑戰、被超越才有價值**。
:::

---

## 連結 DDIA：哪些章該寫 ADR？

DDIA 整本書都在訓練「**識別 trade-off**」的能力。下面 5 個典型場景該寫 ADR：

| 場景 | 對應 DDIA 章節 | ADR 重點 |
|---|---|---|
| **資料庫選型**（PG vs Mongo vs Cassandra） | Ch2 + Ch3 + Ch5 | 資料模型、寫入吞吐、一致性需求 |
| **複製拓樸**（leader / multi-leader / leaderless） | Ch5 | 跨 region 寫入頻率、一致性需求 |
| **交易策略**（Saga vs 2PC vs XA） | Ch7 + Ch9 | 失敗補償成本、跨服務邊界 |
| **訊息系統**（SQS vs Kafka vs Pub/Sub） | Ch11 | 持久化、ordering、replay 需求 |
| **批次 vs 串流**（Lambda vs Kappa） | Ch10 + Ch12 | 資料保留成本、backfill 頻率 |

每個場景都是 DDIA trade-off 知識的實際應用——**讀完一章、馬上寫一份 ADR、把 trade-off 變成可追溯的決策**。

---

## 相關資源

- [Michael Nygard 原始貼文 (2011)](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [Joel Parker Henderson 的 ADR repo](https://github.com/joelparkerhenderson/architecture-decision-record)（500+ 範例）
- [ThoughtWorks Tech Radar - ADRs](https://www.thoughtworks.com/radar/techniques/lightweight-architecture-decision-records)
- [adr-tools](https://github.com/npryce/adr-tools) — 命令列工具自動產生 ADR 範本

::: tip 這頁的用法
讀完 DDIA 任何一章、想練習把 trade-off 內化成可追溯決策時、回來這頁照 4-Q 模板寫一份。**3 個月後重讀自己寫的 ADR、是檢驗 DDIA 知識是否內化的最好方法**。
:::

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

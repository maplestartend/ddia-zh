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

## 完整範例：訊息佇列選型 ADR

```markdown
# ADR-0023: 訂單通知選用 AWS SQS（而非 Kafka）

**Status**: Accepted
**Date**: 2026-05-14
**Authors**: 後端架構小組

## Context

Q3 上線「訂單通知」功能（push notification + email + SMS）。
- 預期初期 1K msg/min、12 個月後 10K msg/min
- 99.9% 送達率、99% < 10s
- 既有 stack：AWS、Terraform、團隊 3 人、無 Kafka 經驗
- 預算：每月 < $200

## Decision

採用 **AWS SQS Standard Queue** + Lambda consumer。

- 單一 queue（不分 priority 等）
- consumer 失敗 → SQS DLQ（max retries=3）
- 每月成本估 $50

12 個月後若接近 10K msg/min、重新評估換 Kafka MSK 或 Kinesis。

## Consequences

**正面**：
- 1 週上線（Terraform 模組已有）
- 無維運（managed）
- 成本 $50/month vs 自管 EC2 + RabbitMQ ≈ $300/month

**負面**：
- 失去 FIFO ordering（除非用 SQS FIFO Queue、有 300 msg/sec 限制）
- 失去 message replay（必須額外存到 S3 才能重播）
- 換 Kafka 需重寫 consumer + 重新訓練團隊

**中性**：
- consumer debug 走 CloudWatch Logs、需要習慣
- 監控用 CloudWatch alarms 即可、不用裝 Prometheus

## Alternatives Considered

- **Kafka MSK**：放棄。學習曲線吃掉 Q3 進度、初期 throughput 用不到 Kafka 能力
- **RabbitMQ on EC2**：放棄。自管 HA 與 AWS managed 政策衝突
- **Redis Streams**：放棄。Redis 是 cache、持久化保證不夠
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

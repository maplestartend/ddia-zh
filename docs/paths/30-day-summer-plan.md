---
title: 30 天暑假計畫 — 初學者完整讀通版
---

<ChapterMeta part="學習路徑" :read-time="20" difficulty="初學者" :tags="['暑假', '高中生', '大二生', '自學']" />

# 30 天暑假計畫 — 初學者完整讀通版

給自學的高中生 / 大學部低年級用——**每天 1-2 小時、30 天讀完 DDIA 中文版的核心**。

這份計畫不假設你會 Linux command line、不要求你寫過 production 系統、只要你會基本 SQL（SELECT / JOIN）+ 看過 Node.js / Python 就能跟。**目標不是「全部讀完」、是「能把 12 章關鍵概念用自己的話講清楚」**。

## 為什麼是 30 天？

- **每天 1-2 小時**：適合暑假早上或晚上其中一段、不會吃掉打工 / 旅行的時間
- **單章拆 2-4 天讀完**：給大腦消化時間、不會囫圇吞棗
- **每週末做章末 Quiz + 寫 1 份 ADR**：把「讀懂」變「會用」

## 進度配置

### 第 1 週：暖身（Day 1-7）

| Day | 內容 | 預計時間 | 該抓的核心 |
|---|---|---|---|
| 1 | [Part 0.0 三分鐘看懂後端](/part-0/basics) + [0.1 為什麼需要資料系統](/part-0/intro) | 50 min | 後端 / API / DB / cache / queue 五個詞 |
| 2 | [0.2 衡量指標](/part-0/metrics) | 60 min | P50/P99/P999、SLO、t-digest |
| 3 | [0.3 SQL 速覽](/part-0/sql) | 90 min | SELECT / JOIN / 索引 / 交易 |
| 4 | [0.4 資料結構](/part-0/data-structures) + [0.5 作業系統](/part-0/os) | 90 min | Hash / B-Tree / fsync / page cache |
| 5 | [0.6 網路](/part-0/network) + [0.7 並行控制](/part-0/concurrency) | 80 min | TCP / RPC / race condition / 隔離 |
| 6 | [Ch1 可靠、可擴展、可維護](/part-1/ch01-reliable) | 100 min | Reliability / Scalability / Maintainability 三軸 + scale up vs out |
| 7 | **週末**：[詞彙表 ★ 7 條](/glossary/) + 自評：能用 5 分鐘講清楚 P50/P99/SLO/scale up vs out 嗎？ | 60 min | 自評 |

### 第 2 週：單機資料系統（Day 8-14）

| Day | 內容 | 預計時間 | 該抓的核心 |
|---|---|---|---|
| 8-9 | [Ch2 資料模型與查詢語言](/part-1/ch02-data-models) | 120 min × 2 | SQL / 文件 / 圖 三種模型何時勝出 |
| 10-11 | [Ch3 儲存與檢索](/part-1/ch03-storage) | 120 min × 2 | B-Tree vs LSM-Tree、OLTP vs OLAP |
| 12-13 | [Ch4 編碼與演進](/part-1/ch04-encoding) | 100 min × 2 | JSON / Protobuf / Avro、§4.X 微服務粒度 |
| 14 | **週末**：[Part I PartCheckpoint](/part-1/ch04-encoding#partcheckpoint) 自評 + 寫 1 份 ADR（[範本](/paths/adr-template)：「我為什麼選 SQLite 不選 PostgreSQL」） | 90 min | ADR 練習 |

### 第 3 週：分散式 — 進入難關（Day 15-22）

| Day | 內容 | 預計時間 | 該抓的核心 |
|---|---|---|---|
| 15-16 | [Ch5 複製](/part-2/ch05-replication) — **走 FirstReadShortcut**（必讀 §5.1-5.4、跳 §5.5 leaderless / §5.6 CRDT 細節） | 60 min × 2 | leader / follower、read replica lag、quorum |
| 17 | [Ch6 分區](/part-2/ch06-partitioning) — **走 FirstReadShortcut**（必讀 §6.1-6.3、跳 secondary index 細節） | 30 min | key range vs hash、hot spot、rebalance |
| 18-19 | [Ch7 交易](/part-2/ch07-transactions) — **走 FirstReadShortcut**（必讀 §7.1-7.2 + §7.3 簡介、跳 §7.2 末 phantom 變形與 §7.3 SSI rw-cycle 細節） | 50 min × 2 | ACID、Snapshot Isolation、lost update vs write skew |
| 20-21 | [Ch8 分散式系統的麻煩](/part-2/ch08-trouble) — **走 FirstReadShortcut**（必讀 §8.1-8.3、跳 §8.4 lease 例子細節 / §8.5 Byzantine） | 50 min × 2 | partial failure、unreliable network、unreliable clock |
| 22 | **週末**：[Part II PartCheckpoint](/part-2/ch09-consistency#partcheckpoint) 前 5 題自評（共識題 9-10 可留到下週） | 60 min | 自評 |

### 第 4 週：共識與衍生資料（Day 23-30）

| Day | 內容 | 預計時間 | 該抓的核心 |
|---|---|---|---|
| 23-24 | [Ch9 一致性與共識](/part-2/ch09-consistency) — **走 FirstReadShortcut**（必讀 §9.0-9.4、跳 §9.5 後半 Paxos 細節 / §9.6 TrueTime 量化推導） | 60 min × 2 | Linearizability、CAP 真實意義、共識三者等價 |
| 25 | [Ch10 批次處理](/part-3/ch10-batch) — **走 FirstReadShortcut**（必讀 §10.1 + §10.2 + §10.4、跳 §10.3 細節 / §10.5 Lambda 歷史） | 35 min | MapReduce、Spark / Flink 為什麼勝出 |
| 26-27 | [Ch11 串流處理](/part-3/ch11-streams) | 80 min × 2 | Kafka log-based broker、event sourcing、exactly-once、Stripe idempotency |
| 28 | [Ch12 資料系統的未來](/part-3/ch12-future) | 60 min | 衍生資料、端到端正確性、倫理 |
| 29 | **複習**：[詞彙表 ★ 7 條](/glossary/) 再過一遍 + [interview-cheatsheet](/paths/interview-cheatsheet) 10 題 | 90 min | 複習 |
| 30 | **完課**：[Part III PartCheckpoint](/part-3/ch12-future#partcheckpoint) 自評 + 寫第 2 份 ADR（針對你 30 天內最有共鳴的章節） | 90 min | ADR 練習 |

## 完課標準

讀完 30 天、你應該能：

1. **用「DDIA 詞彙」描述身邊系統**：例如「蝦皮上架延遲是 read replica lag」「Line 已讀是 stream consumer」「街口轉帳卡 3 秒是 partial failure」
2. **講清楚 ★ 7 條核心詞**：CQRS、Saga、Event-Driven Workflow、Linearizability、Quorum、Idempotent、Exactly-Once
3. **寫過 2 份 ADR**：第 14 天 + 第 30 天各 1 份、3 個月後重讀檢驗自己是否內化
4. **能在面試講 trade-off**：被問「為什麼選 X 不選 Y」時、會列 Alternatives + Consequences，不是只說「X 比較好」

## 不必死守的部分

這個計畫保留 30% 彈性——以下情況**可以跳過、不算放棄**：

- **Ch6 secondary index**（除非你要做搜尋系統）
- **Ch9 §9.5 Paxos 細節**（80% 讀者第一次都跳）
- **Ch9 §9.6 Spanner TrueTime 數學推導**（懂 commit-wait 直覺即可）
- **Ch12 §12.5 倫理**（看完前面再決定有沒有興趣讀 10 頁）

**讀完 70% 內容 + 真的會用 ★ 7 條詞**，比讀完 100% 但用不出來有用 10 倍。

## 下一步

讀完 30 天計畫後、推薦做：

- **挑你最有共鳴的 1-2 章重讀**（例如 Ch7 / Ch11）、這次不跳 FirstReadShortcut 標的「可跳」段落
- **寫第 3 份 ADR**：用你工作 / 學校專案的真實決策、套 4-Q 模板
- **找一個分散式系統的 incident postmortem 看**（Cloudflare / GitHub / AWS 都公開）、看自己能不能用 DDIA 詞彙重述事件

::: tip 這個計畫不是聖經
這只是其中一條讀法。**如果你 20 天就讀完了**、剩 10 天可以做更深的 side project；**如果你 40 天才讀完**也沒關係、自學速度沒有標準答案。重點是讀完後能用、不是讀得快。
:::

---
title: 30 天讀通計畫（完整版）
---

<ChapterMeta part="學習路徑" :read-time="20" difficulty="進階" :tags="['完整讀通', '大三大四', '工作 1-3 年', '暑假 / 假期密集']" />

# 30 天讀通計畫（完整版）

這份計畫是給「**想用 30 天完整吃透 DDIA**」的讀者用的——資工大三 / 大四、工作 1-3 年的後端 / SRE / DE、想升中後端的轉職工程師。**不走 FirstReadShortcut「最小可用版」、把可跳節都讀完**、配章末 Quiz interview 題、寫 3-5 份 ADR。

::: tip 與「初學者 30 天版」的差異
| 維度 | [初學者版](/paths/30-day-beginner) | **本頁（完整版）** |
|---|---|---|
| 目標讀者 | 高中 / 大二 / bootcamp 新手 | 大三大四 / 工作 1-3 年 / 想升中後端 |
| 每天時長 | 1-2 小時 | **2-3 小時** |
| 章節覆蓋 | FRS「必讀核心」、可跳節先放生 | **吃完所有節、含可跳節** |
| Quiz 強度 | ★ 核心題即可 | **★ + ☆ 全做**（含 interview 級） |
| ADR 練習 | Day 30 寫 1 份 | **每週 1 份、共 4 份** |
| 章末練習 | 看情況 | **必做** |
| 延伸閱讀 | 不要求 | **Raft 動畫 / Jepsen / Kafka paper 必看** |
:::

::: tip 計畫前提
- 假設你已熟 SQL + 資料結構 + 基本 OS / 網路（不熟先補 [Part 0](/part-0/)）
- 每天 2-3 小時、共 30 天約 60-90 小時
- **不走 `<FirstReadShortcut>` shortcut**——把章首標的可跳節也讀完
- Quiz **全做**、PartCheckpoint **全答**、答錯標 `TODO` 隔日復習
- 章末練習至少做 1 題、課後寫 ≤ 200 字 summary
:::

## 第 1 週：Part 0 + 單機資料系統基礎（Day 1-7）

| 天數 | 章節 | 重點 + 章末練習 |
|---|---|---|
| Day 1 | [0.0 + 0.1 + 0.2 metrics](/part-0/metrics) | metrics §3 P50/P99/P999 + §5 三個陷阱（HdrHistogram / t-digest / Coordinated Omission）必精讀 |
| Day 2 | [0.3 SQL + 0.4 資料結構](/part-0/sql) | SQL §5 交易與隔離 + 資料結構章末 B-Tree / 外部排序練習 |
| Day 3 | [0.5 OS + 0.6 網路](/part-0/os) | fsync / page cache / TCP 可靠性 / partial failure |
| Day 4 | [0.7 並行控制](/part-0/concurrency) | race condition / lock / 隔離級別暖身 |
| Day 5 | [Ch1 可靠性](/part-1/ch01-reliable) | **全章精讀**、§1.2 Cascading Failure 4 mitigation + §1.3 scale up/out 實務節奏 |
| Day 6 | [Ch2 資料模型](/part-1/ch02-data-models) | SQL / Document / Graph 三選一決策樹、章末 Quiz interview 題全做 |
| Day 7 | [Ch3 儲存與檢索](/part-1/ch03-storage) | LSM vs B-Tree 全節 + OLTP vs OLAP + Bloom filter |

**Week 1 收尾**：寫 1 份 ADR — 主題「我目前 / 上個工作的主資料庫為什麼選 X」、用 [ADR 4-Q 模板](/paths/adr-template)。

## 第 2 週：Part I 收尾 + Part II 進入（Day 8-14）

| 天數 | 章節 | 重點 + 章末練習 |
|---|---|---|
| Day 8 | [Ch4 編碼演進](/part-1/ch04-encoding) §4.1-§4.3 | Protobuf / Avro / GraphQL schema 演進 |
| Day 9 | [Ch4 §4.4.4 服務邊界](/part-1/ch04-encoding) | Bounded Context / Strangler Fig / Pact / BFF 全節 |
| Day 10 | [PartCheckpoint I](/part-1/ch04-encoding#part-i-checkpoint) | 自評 7 題、答錯回去精讀對應節 |
| Day 11 | [Ch5 複製](/part-2/ch05-replication) §5.1-§5.4 | leader-based + 半同步 + read-your-writes / monotonic / consistent prefix 三大問題 |
| Day 12 | [Ch5 §5.5-§5.6](/part-2/ch05-replication) | leaderless / sloppy quorum / version vector / CRDT 全節（**不跳**）|
| Day 13 | [Ch6 分區](/part-2/ch06-partitioning) §6.1-§6.3 | key range / hash / hash + key suffix + 動態分區 |
| Day 14 | [Ch6 §6.4-§6.5](/part-2/ch06-partitioning) | 二級索引 + 路由（**不跳**）+ 台鐵訂票 hot spot 案例 |

**Week 2 收尾**：寫 1 份 ADR — 主題「為什麼我們系統選 single-leader / multi-leader / leaderless 之一」+ 補完 [bridges/oltp-de](/bridges/oltp-de) 視角橋（如果你是 DE）。

## 第 3 週：分散式深水區（Day 15-21、不走 FRS shortcut）

⚠️ **這週每天 2.5-3 小時**。所有 `<FirstReadShortcut>` 標的「**第一次可跳**」節**全部讀完**——這正是「30 天讀通」與「最小可用版」的核心差異。

| 天數 | 章節 | 重點 + 不跳的「FRS 可跳節」 |
|---|---|---|
| Day 15 | [Ch7 §7.1-§7.2 前半](/part-2/ch07-transactions) | ACID 真相 + RC / SI / Lost Update |
| Day 16 | [Ch7 §7.2 末 + §7.3](/part-2/ch07-transactions) | **不跳**：Phantom-based write skew 兩種變形 + SSI rw-antidependency 環細節 |
| Day 17 | [Ch8 §8.1-§8.3](/part-2/ch08-trouble) | partial failure + 不可靠網路 + 網路 8 列故障源 table + TCP keepalive sysctl 三件套 |
| Day 18 | [Ch8 §8.4-§8.5](/part-2/ch08-trouble) | **不跳**：Process pause lease 例子細節 + 拜占庭故障 + Fencing Token |
| Day 19 | [Ch9 §9.0-§9.4](/part-2/ch09-consistency) | Linearizability + ABD 兩階段 + CAP / PACELC + Ordering / 全序廣播 |
| Day 20 | [Ch9 §9.5](/part-2/ch09-consistency) | **不跳**：Paxos / Raft / EPaxos / Flexible Paxos 演算法家族表全節 + 配 [Raft 視覺化動畫](https://raft.github.io/) |
| Day 21 | [Ch9 §9.6](/part-2/ch09-consistency) | **不跳**：Spanner TrueTime ε 數學推導 + commit-wait write-side 機制 |

**Week 3 收尾**：寫 1 份 ADR — 主題「跨服務交易我們選 Saga / 2PC / TCC 哪個」、配 Saga 反 pattern 警告（[glossary Saga](/glossary/#saga)）自我檢查。看 [PartCheckpoint II](/part-2/ch09-consistency#part-ii-checkpoint) 10 題自評（答錯 ≥ 4 標 `TODO` 隔日復習）。

## 第 4 週：衍生資料 + 收束 + 產出（Day 22-30）

| 天數 | 章節 | 重點 |
|---|---|---|
| Day 22 | [Ch10 §10.1-§10.2](/part-3/ch10-batch) | 批次哲學 + MapReduce 模型 |
| Day 23 | [Ch10 §10.3](/part-3/ch10-batch) | **不跳**：HDFS / sort-merge join / map-side join 各種優化細節 |
| Day 24 | [Ch10 §10.4-§10.5](/part-3/ch10-batch) | Dataflow 引擎（Spark / Flink）+ Lambda vs Kappa 歷史討論 |
| Day 25 | [Ch11 §11.1-§11.3](/part-3/ch11-streams) | log-based broker + 三種 stream source + Event Sourcing / CQRS / Stream-Table Duality 三角 |
| Day 26 | [Ch11 §11.4-§11.5](/part-3/ch11-streams) | 時間概念（event time vs processing time）+ watermark + EOS（Flink / Kafka Streams / Spark 三框架對照） |
| Day 27 | [Ch11 §11.6](/part-3/ch11-streams) | Stripe idempotency key 三件套 + dedupe store 三種實作 |
| Day 28 | [Ch12](/part-3/ch12-future) | unbundling + end-to-end argument + 倫理 |
| Day 29 | [PartCheckpoint III](/part-3/ch12-future#part-iii-checkpoint) + [glossary 7 條 ★](/glossary/) | 自評 7 題 + 詞彙表面試常考精讀 |
| Day 30 | 寫第 4 份 ADR + 整理錯題本 | 主題自選（建議：「資料平台核心選什麼」或「微服務拆分粒度」）、把 30 天累積的 PartCheckpoint / Quiz 答錯題整理到 progress 頁 |

**Week 4 收尾**：4 份 ADR 全部寫完（W1-W4 各 1 份）、PartCheckpoint I/II/III 全答、章末 Quiz 至少 70% 正確、glossary 7 條 ★ 能默講。

## 卡關策略（30 天總會撞到 3-5 次）

**不要停在原地**。撞到看不懂的小節：

1. 標 `TODO 隔日復習`、繼續往下推
2. 隔日（或當週週末）回頭、配對應的延伸閱讀重看：
   - Ch5 / Ch9 → [Raft 視覺化動畫](https://raft.github.io/)
   - Ch7 → [Hermitage repo](https://github.com/ept/hermitage)（Kleppmann 的隔離級別實測）
   - Ch9 → [Jepsen analyses](https://jepsen.io/analyses)（etcd / CockroachDB 等的線性一致實測）
   - Ch11 → [Kafka 原 paper](https://www.microsoft.com/en-us/research/wp-content/uploads/2017/09/Kafka.pdf) + [Confluent Streams 文件](https://docs.confluent.io/platform/current/streams/concepts.html)
3. 仍卡 → 寫一段你**理解到哪一步、卡在哪個點**、貼到 [GitHub issue](https://github.com/maplestartend/ddia-zh/issues) 或 Reddit r/distributedsystems

## 與其他學習路徑的關係

| 路徑 | 對象 | 時長 | 強度 |
|---|---|---|---|
| [兩週速成](/paths/) 純後端 CRUD | 沒碰過分散式的 CRUD 後端 | 14 天 × 1.5 小時 | 低（7 章精選）|
| [初學者 30 天](/paths/30-day-beginner) | 高中 / 大二 / bootcamp | 30 天 × 1-2 小時 | 中（FRS 最小可用版）|
| **本頁（30 天讀通）** | 大三大四 / 工作 1-3 年 | 30 天 × 2-3 小時 | **高（完整 + 不跳節 + 4 份 ADR）** |
| [面試準備](/paths/interview-cheatsheet) | 求職前 1-4 週工程師 | 1-4 週 | 中（聚焦面試題型）|
| [系統架構師完整深讀](/paths/) | 想精讀 + 做練習 | 2-3 個月 × 每週 1 章 | 最高（線性深讀 + 重點章節讀兩遍）|

::: tip 完成 30 天讀通版的「最低成功標準」
- **概念**：能用自己的話解釋 [PartCheckpoint I/II/III](/part-3/ch12-future#part-iii-checkpoint) 所有題目、不靠搜尋
- **產出**：4 份 ADR 寫完、每份至少 3 個 alternatives
- **技術正確性**：能抓出「Quorum W+R>N 保證讀到最新值」「Linearizability 是即時且原子」這兩個常見錯誤
- **實務感**：能列出 Ch1 Cascading Failure 4 件套（Circuit Breaker / Bulkhead / Backoff+Jitter / Load Shedding）+ Ch8 網路 8 列故障源中至少 5 列
- **業界接軌**：能解釋 CQRS / Event Sourcing / Saga 三者關係 + Stripe idempotency key 三件套

**完成 ≥ 80% = 你已比 95% 的中文圈後端 / SRE / DE 更懂分散式系統設計取捨**。
:::

::: tip 寫給未來的你
30 天結束時、把這頁印出來、每天打勾 ✓ / 標 `TODO`。**完成 ≥ 80% 後**：拿 4 份 ADR 去公司提 architecture review、或拿去 staff engineer 1-on-1 討論——這些 ADR 比履歷上的「熟悉分散式系統」可信 10 倍。
:::

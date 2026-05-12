---
title: OLTP 概念對應到資料工程場景
description: 把 DDIA Ch5-Ch9 的 OLTP 概念與資料工程（ETL / Kafka / Spark / Flink）場景對應起來
---

# OLTP ↔ 資料工程視角對應

DDIA 大量內容用 **OLTP / DB 內部** 視角寫，對 5 年 ETL / Stream processing 經驗的資料工程師（DE）來說，常見的疑問是：

> 「ACID 我天天聽，但我跑 batch / stream 從來不開 BEGIN/COMMIT，這些到底跟我有什麼關係？」

答案是：**OLTP 章節的核心概念，在 DE 的世界裡都有對應、只是名字不同**。這頁把映射列清楚——讀任何一章前先掃這頁、知道「在我的工作中這對應什麼」、後面整章吸收效率倍增。

::: warning 這頁是隱喻 / 對應、不是定義等價
**對應幫你建立直覺、但 OLTP 概念有精確定義、DE 場景有獨立 trade-off**。例如「Quorum ↔ Kafka ISR」抓住核心精神但不是完全等價（ISR 還有 leader epoch / unclean leader election 等獨立議題）。讀完這頁後對應章節仍要讀——隱喻是地圖、地形得自己走。
:::

---

## 完整對應表

| OLTP 概念（DDIA 章節） | DE 場景對應 | 為什麼是同一件事 |
|---|---|---|
| **Lost update**（Ch7） | **Idempotent consumer** 處理重複事件 | 兩個交易讀同一值、各自加值寫回 → 後寫覆蓋前寫；DE 場景是兩個 consumer 同時處理同一 Kafka message |
| **Write skew**（Ch7） | **跨 partition 的去重**（dedup） | 兩個 SI 交易讀「沒衝突會議」→ 各自寫；DE 場景是兩個 consumer instance 同時讀「24h 內未處理 X」→ 各自插入處理紀錄 |
| **Phantom**（Ch7） | **滑動視窗的邊界事件** | 範圍查詢內出現本不存在的列；視窗 join 邊界跨 watermark 後仍有 late event 改變結果 |
| **Linearizability**（Ch9） | **Kafka 內 partition 全序保證** | linearizable 是「對外觀察像單一副本」；Kafka 單一 partition 內訊息有 total order、但跨 partition 無此保證 |
| **Quorum（W + R > N）**（Ch5） | **Kafka ISR + `min.insync.replicas`** | quorum 是「寫多數 + 讀多數 = 必碰新值」；Kafka 的 ISR 集合 + `acks=all` + `min.insync.replicas=2` 是同一個機制（多數確認才回 ack） |
| **2PC**（Ch9） | **Flink `TwoPhaseCommitSinkFunction`**（Kafka transactional producer 是相關但不同的機制） | Flink 2PC sink 才是 2PC 在 stream 場景的真實化身；Kafka transactional producer 內部用 single transaction coordinator + `__transaction_state` topic、**不是 2PC** —— 兩者常被混為一談 |
| **Sloppy quorum**（Ch5） | **Kafka under-replicated partition** | 寫到非 ISR 節點 = 寫到「替補」；之後背景修復同步回 home replica = anti-entropy |
| **Leader epoch**（Ch5 / Ch9 隱含） | **Kafka producer 的 `leader_epoch`** | Raft term 在 Kafka 的化身；擋住 zombie leader 的寫入 |
| **Causal order**（Ch9.3） | **Kafka partition key 設計** | 因果相關的事件放同 partition、用 key 保證 partition 內順序；跨 partition 用 Lamport / vector clock |
| **Read-your-writes**（Ch5） | **CDC pipeline 的「寫後立刻 GET」場景**（見下方場景 3） | 後端：寫後讀自己的寫；CDC：source DB 寫入後、下游 ES / cache 因 lag 看不到、要 sticky to source 或記 LSN 等同步到才回。`read_committed` 是另一回事（防讀到未 commit transactional record） |
| **Fencing token**（Ch8） | **Kafka leader epoch / Zookeeper ephemeral node** | 過期持有者帶舊 token 寫入會被擋；Kafka broker 的 leader_epoch 就是這作用 |
| **Eventual consistency**（Ch5） | **CDC 下游延遲** | Multi-leader / leaderless 的最終一致；CDC pipeline 從 source DB 到下游 sink 永遠有 lag、但最終會收斂 |

---

## 3 個常見場景對照

### 場景 1：你的 Airflow DAG 寫 `pipeline_run_status` 重複了

**症狀**：兩個 DAG run 並發、status 從 `RUNNING` 改 `SUCCESS` 兩次。資料看起來一樣但 `updated_at` 被覆蓋一次。

**OLTP 視角（Ch7）**：這是 **lost update**。三種解法：
- (a) 原子 `UPDATE status='SUCCESS', updated_at=NOW() WHERE id=X AND status='RUNNING'`（看 affected rows）
- (b) `SELECT ... FOR UPDATE` 顯式鎖
- (c) 升 `REPEATABLE READ` + 接 `40001` retry（PG 才有、MySQL InnoDB 不偵測）

**DE 對應**：在你的 idempotent consumer 設計中，這就是「**重試的事件被處理兩次**」的特例。同樣三種解法、形式略不同：
- (a) `INSERT ... ON CONFLICT DO NOTHING` + 用 event_id 當 unique key（idempotent write）
- (b) Kafka transactional producer + `read_committed` consumer（atomic offset commit）
- (c) Outbox pattern：DB 寫入 + 訊息發送包進同一 local TX，背景 worker 轉發

→ 詳見 [Ch7 lost update](/part-2/ch07-transactions#7-2-弱-isolation-level-與異常)。

---

### 場景 2：跨服務的「最後一張優惠券」

**症狀**：用戶 A、B 同時看到「優惠券剩 1 張」→ 各自 click → 後端不同 instance 處理 → 系統認為兩人都搶到。

**OLTP 視角（Ch7）**：這是 **write skew** 的典型——兩交易讀同前提（剩餘 ≥ 1）、各自寫不同列（user_id=A 的領用紀錄 + user_id=B 的領用紀錄）。SI 擋不住、需 `SERIALIZABLE`（SSI）或 `FOR UPDATE` 把優惠券表鎖起來。

**DE 對應**：場景轉換成「**dedup events with global state**」——兩個 stream consumer instance 同時收到 `claim_coupon(coupon_id=X)` 事件、各自查 cache「coupon_id=X 還沒被領」→ 各自處理。

**修法**：
- **OLTP**：升 `SERIALIZABLE` + catch `40001` retry；或對 coupon row 顯式 lock
- **DE**：把 coupon_id 當 Kafka partition key、單 partition 內單 consumer 處理（自然序列化）；或外掛 distributed lock（Redis SETNX、Zookeeper ephemeral node）

→ 詳見 [Ch7 write skew](/part-2/ch07-transactions#7-2-弱-isolation-level-與異常) 與 [Ch6 分區](/part-2/ch06-partitioning)。

---

### 場景 3：CDC pipeline 的「按下後立刻看不到」

**症狀**：用戶在管理後台改了一筆 user profile（直接寫 source PG）、刷新前台（從 CDC → Kafka → Elasticsearch 索引讀）卻看到舊資料。

**OLTP 視角（Ch5）**：這是 **read-your-writes consistency** 問題。在 single-leader 複製場景下、解法是 sticky to leader 或讀時帶 LSN。

**DE 對應**：你不是 read replica、你是**整條 CDC pipeline**。「sticky to leader」要寫成：寫入後一段時間內、前台讀也從 source PG 走（而非 ES sink）；或記 CDC offset、要求 sink 至少同步到該 offset 才回應。

**真正的修法**：通常 product 接受 1-3 秒延遲、加 toast「資料同步中…」UI 提示就好。**對 DE 來說**：監控 Kafka consumer lag、設 SLA、超過閾值 alert。

→ 詳見 [Ch5 §5.3 複製延遲三個問題](/part-2/ch05-replication#5-3-複製延遲的三個問題) 與 [Ch11 物化視圖](/part-3/ch11-streams#11-3-串流處理應用)。

---

## 「我是 DE、該怎麼讀 DDIA」最短路徑

如果你完全沒做過 OLTP、只想用最短時間補上分散式系統基礎、回到 DE 工作能說「我懂為什麼 ISR 設成 2」：

1. **先讀 [Ch1 §1.3 SLO/P99](/part-1/ch01-reliable)** — 跟你的 stream lag SLA 概念同源
2. **跳 [Ch5 §5.5 Quorum](/part-2/ch05-replication#5-5-leaderless-複製-dynamo-風格)** — `W+R>N` ↔ Kafka ISR `min.insync.replicas`
3. **跳 [Ch7 §7.2 三 scenario badge A/B/C](/part-2/ch07-transactions#7-2-弱-isolation-level-與異常)** — 三 badge 對應你工作上 dedup / idempotent 場景
4. **跳 [Ch8 §8.5 fencing token](/part-2/ch08-trouble#8-5-知識-真相與謊言)** — ↔ Kafka leader epoch
5. **回 [Ch11 §11.5 三框架 EOS 對照](/part-3/ch11-streams#11-5-容錯-exactly-once-的真相)** — 帶著 OLTP 視角看自己每天用的東西

**4 個小時讀完這 5 段**比逐章讀 Ch5-Ch9 快、且 OLTP ↔ DE 對應建立起來後、回頭看其他章吸收效率高很多。

---

::: tip 反向問題：OLTP 後端讀 Part III 怎麼吸收？
如果你是 OLTP 後端、想學 stream processing，反向跳：
1. [Ch11 §11.1-11.3](/part-3/ch11-streams) — 看 stream / topic / consumer group 概念
2. 用 OLTP 視角問：「**partition 內全序 ↔ 我 PG transaction 內的序列化**」「**at-least-once + idempotent ↔ retry 機制**」「**watermark ↔ 我設 timeout 的依據**」
3. 再回 [Ch7](/part-2/ch07-transactions) 看自己熟的東西、對比兩種世界
:::

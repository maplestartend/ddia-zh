---
title: Ch11 串流處理
---

# Ch11 · 串流處理 Stream Processing

<ChapterMeta part="Part III 衍生資料" :read-time="55" difficulty="進階" :tags="['Kafka', 'CDC', 'Event Sourcing']" prereq="Ch10" />

<TLDR :points='[
  "<strong>串流處理 = 持續處理無界資料</strong>（unbounded data）。批次的「資料集」變成「事件流」，但運算原則相通。",
  "<strong>訊息傳遞兩大典範</strong>：傳統 message broker（AMQP/JMS，消費即刪）vs log-based broker（Kafka，持久 + 可重播）。後者啟用了 stream-table duality。",
  "<strong>三種串流來源</strong>：使用者活動事件、系統感測器數據、<strong>Change Data Capture (CDC)</strong>（從 DB binlog 把資料變更串成事件）。",
  "<strong>Event Sourcing = 把「狀態變更」當主資料</strong>，當前狀態是衍生的。可重播、可審計、容易實作時間旅行查詢。",
  "<strong>Exactly-once 不是真的「只執行一次」</strong>，而是「最終效果等同於只執行一次」—— 透過冪等 + transactional write + atomic offset commit 達成。"
]' />

## 11.0 先備白話

::: tip 5 個詞先建立印象，其餘用到再學
| 名詞 | 國中生講法 |
|---|---|
| **事件流（stream）** | 一個會不停長出新項目的清單，永遠不會結束 |
| **Kafka** | 一個「你寫進去就不會被刪掉、可從任意位置重讀」的清單服務 |
| **offset** | 你讀到第幾筆的書籤 |
| **CDC**（Change Data Capture） | 把 DB 的「每筆 INSERT / UPDATE / DELETE」自動變成事件丟到 Kafka |
| **sink** | 事件流的「下游目的地」（如 Elasticsearch、DB、HTTP API） |

本章核心問題：**「資料庫的世界」與「事件流的世界」其實是同一件事，只是觀察角度不同**。看懂這點，整章的 stream-table duality、event sourcing、CDC 都是它的延伸。
:::

::: tip 如果你是前端開發者：你已經是 stream consumer
你可能沒意識到，但下面這些 API **本質上都是訂閱事件流**：

| 你用過的 API | 對應本章哪個概念 |
|---|---|
| `firebase.firestore().collection(...).onSnapshot(...)` | **概念上等同 CDC**（DB 主動推變更給你）—— 但實作是 server 維護的 query subscription / watch token、**不是真的 binlog 解析**；**也不支援 offset replay**：斷線重連靠 watch token 從伺服器目前狀態續訂，中斷期間的中間事件不會逐筆補回（只給你最新 snapshot 差異） |
| `supabase.channel('...').on('postgres_changes', ...).subscribe()` | **真正的 CDC**：走 PostgreSQL logical replication slot 解析 WAL |
| WebSocket subscribe（Pusher、Ably） | 通用 stream consumer |
| Server-Sent Events `EventSource` | 單向 stream，無 ack 機制 |
| RxJS `Observable` / `Subject` | 客戶端內部的 stream 抽象 |

**這些 SDK 幫你做的事**（也是本章在拆解的）：
- **持久 + 重播**：斷線重連、從某 offset / cursor 補回中斷期間的事件
- **exactly-once 對等保證**：你的 `onSnapshot` callback 對同一筆 doc 變更可能觸發 1 次也可能 2 次（重連時）—— 寫的 reducer 要冪等
- **stream-table duality**：你在 `useEffect` 內把 stream 變成 React state 就是把 stream → table；setState 又是反過來把每次變更廣播成 stream

**看完本章，你會理解為什麼**：Firestore offline 模式能 work、Supabase realtime 為什麼選 logical replication、Pusher 為什麼有 message ID + 補洞機制。
:::

---

## 11.1 事件流的傳遞

### 傳統訊息代理（RabbitMQ、ActiveMQ）
- consumer 收到 + ack → broker 刪除
- 不適合「重新處理」歷史事件
- 多個 consumer 通常負載均衡（同訊息只給一個）

### Log-based 訊息代理（Kafka、Pulsar）
- 訊息寫入 append-only log
- consumer 用 offset 標記進度，可任意倒回
- 適合 fan-out（多個下游各自獨立讀整個流）
- 訊息保留時間長（天、週）

::: tip Kafka 的本質
不是「訊息隊列」，而是「分散式 commit log」。這個視角差異解釋了它的所有設計（持久、可重播、partition）。
:::

### 設計動機：為什麼 Kafka 不是 queue？

| 需求 | 傳統 queue（RabbitMQ） | Partitioned log（Kafka） |
|---|---|---|
| 多下游各自衍生（搜尋、快取、倉儲） | 要每個下游一個 queue + broker 重複寫 | 每個 consumer group 一個 offset，**共用同一份 log** |
| 重跑（修 bug、補 backfill） | 訊息已 ack 即刪 → 沒得重跑 | 倒回 offset 即可重播 |
| 分區內順序保證 | 多 consumer 競爭時順序破壞 | 同 partition 同 consumer → 天然順序 |
| 持久性 | 視 broker 實作（RabbitMQ 預設記憶體） | 寫磁碟 + 多副本 |
| 訊息生命週期 | consumer ack 後立即刪 | 按時間或大小保留（天 / 週） |

**代價**：log 永遠保留要耗儲存（用 compaction topic 緩解）、訊息順序只在 partition 內保證、消費端要自管 offset。

對「事件流是事實、下游各自衍生」這個典範來說，partitioned log 是更合適的抽象。

---

## 11.2 資料庫與事件流

### <G term="cdc">Change Data Capture (CDC)</G>
從 DB binlog（PostgreSQL WAL、MySQL binlog）把每筆變更轉成事件，餵到下游：
```
PostgreSQL ─[Debezium]─→ Kafka ─→ Elasticsearch
                              ─→ Cache invalidation
                              ─→ Data warehouse
```
**好處**：DB 仍是 source of truth，下游各自衍生。對主應用零侵入。

### <G term="event-sourcing">Event Sourcing</G>
資料庫不存「當前狀態」，存「事件序列」：
```
[user_registered] [email_changed] [logged_in] [password_changed] ...
```
要查當前狀態 → 重播所有事件 → 算出來。
- 可審計（每個變更都留下）
- 可時間旅行（看任意時刻的狀態）
- 可重建 read model（衍生不同的快取/索引）

### Stream-Table Duality
> 一張表是某個串流在某時刻的「凍結快照」；一個串流是某張表的所有變更歷史。

::: tip 具體例子：users 表 ↔ users_events 流
```
users_events (stream)：
  t=1  INSERT alice email=a@x.com
  t=2  INSERT bob   email=b@x.com
  t=3  UPDATE alice email=alice@new.com
  t=4  DELETE bob

users (table) 現在的內容：
  alice  alice@new.com   ← 從頭播放上面所有事件後的結果
```

「表 = 從頭重播流」、「流 = 表的每一次變更」。兩個視角等價。
:::

::: tip 與 Ch5 複製日誌同源
這個觀念與 [Ch5 複製](/part-2/ch05-replication) 的 replication log 完全同源 —— PostgreSQL 的 WAL、MySQL 的 binlog 本來就是「對表的變更事件流」。CDC 只是把這個本來內部用的 log 接出來，當成下游可訂閱的 Kafka topic。
:::

兩者可以互相轉換 —— 這是 Kafka Streams / ksqlDB 的核心思想。

---

## 11.3 串流處理應用

### 1. Complex Event Processing (CEP)
偵測模式：「五分鐘內登入失敗 5 次」「股價跌破移動平均線」
Esper、Flink CEP。

### 2. 串流分析
滾動視窗統計（每分鐘的點擊量）、Top-N、Approximate count（HyperLogLog）。

### 3. 物化視圖（Materialized View）
主表變了，下游的索引 / 快取 / 聚合表會**非同步**地被更新（延遲通常 ms~s 級，視 consumer lag）。Kafka Streams 的核心場景。

::: warning 「自動更新」≠ 同步即時、也不保證最終一致
- **延遲**：consumer 處理 stream 與真實寫入有 ms~s 級時間差；高負載 / consumer 故障時可達分鐘級
- **失敗模式**：下游 consumer 掛掉 / 處理失敗會讓 view 暫時 stale；若處理**非冪等**（如「+1」而非「set」）、重試會讓 view **永久發散**
- 解法：要求處理冪等（idempotent）+ at-least-once delivery，或走 §11.5 的 exactly-once 機制
:::

### 4. 跨系統搜尋索引同步
DB → Elasticsearch via CDC。

---

## 11.4 串流的 Join

### Stream-Stream Join
兩個事件流（如「點擊事件」JOIN 「曝光事件」）。
- 需要 window（畢竟流是無界的）
- 處理「對方還沒到」的情況

::: tip Window 大小是「準確性 vs 延遲」的取捨
- **Window 太短** → 對方 event 還沒到就關窗、漏 join、結果不準
- **Window 太長** → 結果出得慢、記憶體 buffer 大
- **Watermark** 是 stream 處理框架（Flink、Beam、Kafka Streams）對這個權衡的**明確 API**：宣告「event-time T 之前的資料都到齊了」，框架據此關窗 / 觸發計算。配合 allowed lateness 處理偶發的更晚到事件
- 詳見 <G term="watermark">Watermark</G> 詞彙表
:::

### Stream-Table Join
事件流 JOIN 維度資料表（如「訂單流」JOIN「使用者資料表」）。
- 表通常本地化（用 changelog 維護一份本地副本）
- 重要：用「事件發生時的維度值」還是「處理時的維度值」？

### Table-Table Join
兩個 changelog 的 join（CDC 流 + CDC 流），維護的 materialized view 同步更新。

---

<SectionDivider icon="verified" label="正確性真相" />

## 11.5 容錯：Exactly-Once 的真相

「Exactly-once」實際上是「effectively-once」：
- 處理可能執行多次（重試、故障恢復）
- 但**外部可見效果**只發生一次

### 達成手段
1. **冪等寫入**：用唯一 key 寫 sink，重複寫無副作用
2. **Transactional output**：Kafka exactly-once = atomic 寫多個 topic + atomic commit offset
3. **Checkpoint + replay**：Flink 的兩階段提交快照

::: warning Kafka exactly-once 的範圍
Kafka 提供的 transactional API 只保證**「Kafka 內部」**（讀 Kafka → 處理 → 寫回 Kafka）的 exactly-once 語意。

當 sink 是**外部系統**（DB、Elasticsearch、HTTP API）時，仍須在 sink 端做：
- **冪等寫入**（用 message UUID 當 unique key），或
- **2PC**（將外部寫入與 Kafka offset commit 包進同一個分散式交易，極少數系統能做到）

否則「Kafka 已 commit、外部系統重複寫」或「外部系統已寫、Kafka offset 未 commit」這兩種狀態都會破壞端到端 exactly-once。
:::

### 三大串流框架的 exactly-once 機制對照

選型時最該看的對照表。三家對「exactly-once」的詮釋與實作不同：

| 框架 | 核心機制 | 對 Kafka sink 保證 | 對外部 sink 保證 | 失敗恢復粒度 | 啟用方式 |
|---|---|:---:|:---:|:---:|---|
| **Kafka Streams**（0.11+ EOS v1、3.0+ EOS v2） | Transactional producer + idempotent producer + atomic offset commit（單一 `transactional.id`） | ✓ EOS | ✗ 需 sink 自行冪等 | per-record（每筆 transaction） | `processing.guarantee=exactly_once_v2` |
| **Flink**（DataStream / Table API） | Chandy-Lamport async barrier checkpoint + `TwoPhaseCommitSinkFunction` | ✓ EOS（含 KafkaSink） | ✓ **可達 EOS**（sink 須實作 2PC interface，如 KafkaSink / JDBC `XaSinkFunction`） | per-checkpoint（barrier 之間） | `env.enableCheckpointing(...)` + EXACTLY_ONCE 模式 |
| **Spark Structured Streaming** | Micro-batch + WAL（write-ahead log）+ idempotent sink | ✓ 透過 Kafka sink 的 idempotent producer | ✓ **要 sink 冪等**（用 `foreachBatch` + UPSERT、或 Delta Lake 的 ACID） | per-micro-batch | 預設啟用、要求 sink 支援 |

**閱讀重點**：
- **Kafka Streams 對外部 sink 無法 EOS**——這是常見誤解。EOS 範圍只到「Kafka topic 之間」。寫 PG / ES / Redis 仍需冪等寫法
- **Flink 是唯一原生支援「end-to-end EOS」**的框架（透過 2PC sink interface），但前提是 sink 系統本身支援 transactional API（PG 支援 XA、Kafka 支援 transactional producer）
- **Spark 走「micro-batch + 冪等 sink」路線**——犧牲 per-record 延遲（micro-batch latency 通常 100ms~秒級）換取簡單的 EOS 模型
- **失敗恢復粒度**直接影響「重試後的延遲」：Kafka Streams 重試一筆、Flink 從上一個 checkpoint 重跑、Spark 從上一個 micro-batch 重跑

::: tip Kafka 2.8+ 的 KRaft 對這層有影響嗎
KRaft（Kafka 自管 Raft，4.0 完全移除 ZooKeeper）改變的是 **Kafka 控制平面**（metadata 管理 / leader election），**不影響** producer transaction / EOS 機制——transactional producer 是用 `__transaction_state` topic + transaction coordinator 實作的、跟 ZK/KRaft 無關。詳見 [Ch9 §9.6](/part-2/ch09-consistency)。
:::

---

## 章末練習

::: tip 思考題
1. 用 docker-compose 跑 Kafka + Debezium + PostgreSQL，把一張 `users` 表的變更串到 Kafka topic。
2. 寫一個 Kafka Streams 應用，把使用者註冊事件 join 訂單事件，產生「新使用者首單」報表。
3. 設計題：你的訂單系統用 Event Sourcing，事件 schema 演進時怎麼處理舊事件？（versioning、upcasting）
:::

<Quiz chapter-id="ch11" :questions='[
  {
    question: "Kafka 與傳統 message queue（如 RabbitMQ）的本質差別是？",
    options: [
      "Kafka 速度比較快",
      "Kafka 是 append-only 的分散式 log，訊息持久保留可重播；傳統 queue 訊息被消費後刪除",
      "Kafka 不需要 broker",
      "傳統 queue 不支援多個 consumer"
    ],
    answer: 1,
    explanation: "RabbitMQ：consumer ack 後 broker 刪訊息，只看當前。Kafka：訊息持久存在 partitioned log 中，多個 consumer group 各自用 offset 獨立讀整個流，且可任意倒回重播。"
  },
  {
    question: "Change Data Capture (CDC) 的主要用途是？",
    options: [
      "壓縮資料庫備份",
      "從 DB transaction log 提取變更事件，下游系統可獨立衍生（搜尋索引、快取、數據倉儲）",
      "替代 DB 主鍵",
      "加密敏感資料"
    ],
    answer: 1,
    explanation: "CDC 讀 DB 的 binlog/WAL，把每筆 INSERT/UPDATE/DELETE 變成事件流。下游各自消費、各自衍生，DB 仍是 source of truth —— 比應用層雙寫（DB + Elasticsearch）安全得多。"
  },
  {
    question: "「Exactly-once 處理」的實務意義是？",
    options: [
      "每個訊息真的只被執行一次",
      "處理可能重試多次，但外部可見效果等同於只處理一次（透過冪等寫入或 transactional output）",
      "禁止任何形式的重試",
      "只能用於單機"
    ],
    answer: 1,
    explanation: "純粹「只執行一次」在分散式系統中不可能（失敗時你怎麼知道是否要重做？）。實務的 exactly-once 靠冪等或 atomic commit 確保「重做不會造成額外副作用」。Kafka exactly-once = atomic 寫 + atomic offset commit。"
  },
  {
    question: "Event Sourcing 相對於「只存當前狀態」的主要優勢是？",
    options: [
      "佔的儲存空間較少",
      "可審計、可重播、可時間旅行；隨需衍生不同 read model",
      "查詢一定比較快",
      "不需要備份"
    ],
    answer: 1,
    explanation: "Event Sourcing 把「歷史」當主資料，現狀是衍生的。代價是查詢當前狀態貴（要 replay 或維護快照），但換來完整的審計歷史、bug 回放、隨時衍生新 view 的能力。"
  }
]' />

<Progress chapter-id="ch11" />

::: info 延伸閱讀
- [Kafka: a Distributed Messaging System (Kreps et al.)](https://www.microsoft.com/en-us/research/wp-content/uploads/2017/09/Kafka.pdf) — Kafka 原始論文，把 log 抽象說透
- [Exactly-Once Semantics Are Possible: Here's How Apache Kafka Does It](https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/) — Confluent 官方對 exactly-once 內幕
- [Debezium 文件](https://debezium.io/documentation/) — 最流行的開源 CDC 工具
- [Designing Event-Driven Systems (Ben Stopford, 免費電子書)](https://www.confluent.io/designing-event-driven-systems/)
:::

<NextChapterBridge next-link="/part-3/ch12-future" next-title="Ch12 資料系統的未來">
最後一章把全書整合：怎麼把 OLTP DB + 搜尋索引 + 快取 + 數據倉儲<strong>同步起來</strong>？Lambda / Kappa 架構是什麼？「Unbundling the database」這個資料工程界正在發生的典範轉移在講什麼？以及最後 —— 我們建這些系統，對社會有什麼責任？
</NextChapterBridge>

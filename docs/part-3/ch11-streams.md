---
title: Ch11 串流處理
---

<ChapterOpener chapter-id="ch11" />

<ChapterMeta part="Part III 衍生資料" :read-time="55" difficulty="進階" :tags="['Kafka', 'CDC', 'Event Sourcing']" prereq="Ch10" />

<TLDR :points='[
  "<strong>串流處理 = 持續處理無界資料（unbounded data）</strong>：批次的「資料集」變成「事件流」，但運算原則相通。",
  "<strong>訊息傳遞兩大典範</strong>：傳統 message broker（AMQP / JMS，消費即刪）vs log-based broker（Kafka，持久 + 可重播）—— 後者啟用了 stream-table duality。",
  "<strong>三種串流來源</strong>：使用者活動事件、系統感測器資料、Change Data Capture（CDC，從 DB binlog 把資料變更串成事件）。",
  "<strong>Event Sourcing = 把「狀態變更」當主資料</strong>：當前狀態是衍生的。可重播、可審計、容易實作時間旅行查詢。",
  "<strong>Exactly-once 不是真的「只執行一次」</strong>：而是「最終效果等同於只執行一次」—— 透過冪等 + transactional write + atomic offset commit 達成。"
]' />

<FirstReadShortcut>

這章接 Ch10 批次、把資料系統從「一整批」拉到「連續流」。**第一次讀建議走「概念 + 業務面」路徑**：

- **必讀核心**：§11.0 先備白話（5 詞 + Line event 場景）+ §11.1 兩種 broker（消費即刪 vs log-based）+ §11.2 三種串流來源 + §11.3 stream-table duality / CQRS + §11.6 Stripe idempotency
- **第一次可跳**：§11.4 視窗 / watermark / late event 細節（Flink 進階）+ §11.5 transactional output 數學推導（先抓「最終效果等同只執行一次」直覺即可）

讀完核心五節（約 40 分鐘）你就能：**看懂 Kafka 為什麼是「持久 + 可重播」**、**理解 CDC 如何把 DB 變成 Kafka 上游**、**寫得出 Stripe-style idempotency key 端到端去重**、**判斷 EOS 在 stream processing 內部 vs API 邊界的差異**。

</FirstReadShortcut>

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

::: tip 本土場景：Line 訊息已讀 / 未讀 event 流
你每次傳訊息給朋友、Line 在你裝置與朋友裝置間維護的「**訊息已送達 → 已讀**」狀態、就是一條 event stream：
- **事件不可變**：「Alice 12:34:56 已讀此訊息」是發生過的事實、不能撤回（你的「收回訊息」按鈕是**發另一個 event 蓋過顯示**、不是真的刪原 event）
- **多份 read model**：訊息列表頁、聊天室未讀數 badge、桌機 / 手機 / iPad 各自的 cache——全部從同一條 event 流派生
- **斷線重連補事件**：你手機飛航模式 30 分鐘、開啟後 Line 補回中間漏接的訊息——就是 stream consumer 從上次 offset 繼續消費

DDIA 原書用 Kafka / Twitter 解釋 stream processing、本站讀者熟悉的是 Line / Telegram——但 **stream-table duality / event sourcing / exactly-once** 的概念對所有「即時通訊 / 即時通知」app 都是同一套設計問題。
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

::: tip Consumer Lag — SRE 自學 Kafka 監控起手式
Kafka consumer 落後 producer 多少、是 SRE 第一個要監控的指標。**典型指標命名**：

| 指標 | 來源 | 解讀 |
|---|---|---|
| `kafka.consumer.lag` / `records-lag-max` | JMX exporter（kafka-exporter） | 單一 consumer 落後 producer 的 offset 數、**取 max per partition**（不是 avg） |
| `kafka_consumergroup_lag` | [Burrow](https://github.com/linkedin/Burrow) | LinkedIn 開源的 consumer group 健康監控、有 status state machine（OK / WARNING / ERROR / STOP） |
| `kafka_consumergroup_uncommitted_offsets` | kafka-exporter | 還沒 commit 的 offset 數、衡量 in-flight processing 量 |

**Rebalance Storm**（consumer group 反覆 rebalance、誰都不消費）三大誘因：
- `session.timeout.ms` 太短（預設 10s、heartbeat 沒及時觸發 → 被踢出 group）
- processing 時間超過 `max.poll.interval.ms`（預設 5 min、單條訊息處理太久）
- partition 數變動（partition assignment 改變、觸發全 group rebalance）

**ISR shrink 警示**：當 `kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions` &gt; 0、表示有副本跟不上 leader——可能磁碟 / GC / 網路問題、SRE 必須立刻看。
:::

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

### <G term="stream-table-duality">Stream-Table Duality</G>
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
- 解法：要求處理<G term="idempotent">冪等（idempotent）</G>+ at-least-once delivery，或走 §11.5 的 <G term="exactly-once">exactly-once</G> 機制
:::

::: tip 這就是 CQRS：把 read model 與 write model 分開
**CQRS（Command-Query Responsibility Segregation）= 「事件源（command/write side）」+「物化視圖（query/read side）」的搭檔模式**。
- **write side**：所有變更以事件（command）形式落到 event store / Kafka log、**source of truth**
- **read side**：從事件流派生**多份不同形狀的物化視圖**（給 list 頁面用 Redis、給搜尋用 Elasticsearch、給統計用 ClickHouse）
- **核心好處**：read model 可以多份、隨時可從 source-of-truth 重建、不同查詢負載走不同 storage

這就是為什麼 Event Sourcing 與 CQRS 幾乎總是同時出現——CQRS 是 event sourcing 的 read side、event sourcing 是 CQRS 的 write side。詳見詞彙表 [CQRS](/glossary/#cqrs) 與 [Event Sourcing](/glossary/#event-sourcing)。
:::

::: tip 三角整合：Event Sourcing / CQRS / Stream-Table Duality
這三個概念**講的是同一件事的不同切片**——把它們綁在一起、你會發現現代分散式架構的本質。

| 概念 | 關注的是 | 強調的對偶 |
|---|---|---|
| **Event Sourcing** | **狀態** 怎麼產生 | 狀態 = 事件流的 fold（積分） |
| **CQRS** | **讀寫** 怎麼拆 | command（寫）vs query（讀）分模型、read model 可多份 |
| **Stream-Table Duality** | **資料的兩面** | stream（變化）vs table（當下狀態）可互相轉換 |

**綁起來看的真實架構**：

```
                 ┌──────────────────────────────┐
                 │  事件流（Source of Truth）     │
                 │  Kafka log / Event Store     │
                 └────────────┬─────────────────┘
                              │
              ┌───────────────┼─────────────────┐
              ▼               ▼                 ▼
       [read model A]   [read model B]   [read model C]
       Redis cache      Elasticsearch    ClickHouse
       (給訂單列表用)    (給全文搜尋用)    (給商業分析用)
```

- **Event Sourcing**：上方那條事件流是 source of truth、不可變
- **CQRS**：下方多個 read model 各自最佳化某種查詢負載
- **Stream-Table Duality**：每個 read model 都是「事件流的 fold 結果」、隨時可從 source-of-truth 重建

**這就是現代 event-driven 平台（Uber / Netflix / Shopify）的核心設計**——把三個概念分開講會學散、合起來看會學透。
:::

### 4. 跨系統搜尋索引同步
DB → Elasticsearch via CDC。

---

## 11.4 串流的 Join

### Window 四種類型對照

串流是無界的、但聚合 / join / 統計都需要「**有限的觀察窗**」——window 就是把無界流切成有限的計算單元。四種典型 window 各有不同的「**事件被算進哪個 window**」規則：

| Window 類型 | 規則 | 一個事件落入幾個 window | 典型用例 | 視覺直覺 |
|---|---|---|---|---|
| **Tumbling**（翻滾） | 固定大小、**互不重疊**（如 [10:00-10:05)、[10:05-10:10)、…） | **恰好 1 個** | 「每 5 分鐘總訂單數」、定時聚合 | `[ ][ ][ ][ ]` 連續方塊 |
| **Hopping**（跳躍 / sliding 的離散版） | 固定大小 + **固定 slide step**（如「5 分鐘 window、每 1 分鐘 hop 一次」 → window 重疊）| **N 個**（N = window-size / hop-step） | 「**滾動 5 分鐘**內的平均」、平滑指標 | `[ ]` 上面再疊 `[ ]` |
| **Sliding**（滑動 / 連續版） | 「**這個事件之前 N 分鐘內**」—— 每筆事件觸發各自的 window | **任意數**（取決於 buffer 內事件數） | session 防詐分析、「過去 1 分鐘內 5 次失敗登入」報警 | 每事件自己劃一條 |
| **Session**（會話） | **動態大小**：相同 key 的事件**間隔 < gap** 視為同一 session、間隔 ≥ gap 開新 session | **1 個**（依時間動態決定哪一個） | 使用者瀏覽 session、IoT 設備活躍期 | 不定長方塊、靠空白分界 |

::: tip Tumbling vs Hopping 最容易混淆
- **Tumbling**：每事件只進**一個** window —— 適合「**互斥**」的時段聚合（這 5 分鐘 vs 那 5 分鐘）
- **Hopping**：window 之間**重疊**、每事件可能進**多個** window —— 適合「**滾動指標**」（過去 5 分鐘平均、每分鐘更新一次）
- 數學關係：**Tumbling = Hopping 但 hop-step = window-size**（特例）
:::

::: warning Session window 的特殊性：watermark 不能直接套
Session window 的長度**取決於資料本身**（事件分布決定 gap）—— 不像其他三種「**時間到了就關**」。Flink / Beam / Spark Structured Streaming 對 session window 都有特殊路徑：
- **Flink**：`EventTimeSessionWindows.withGap(...)` —— 動態建立 window、merge 重疊 session
- **Kafka Streams**：`SessionWindows.with(...)` —— 內部用 session-store 管理 session 邊界
- **Spark Structured Streaming 3.2+**：才正式支援 session window（早期版本只能自己手刻）

實務踩坑：**user_id = X 的 session 在 watermark 通過後到了一個 late event** → 是要併入「最近的 session」、開新 session、還是丟掉？各框架預設不同、要在設計時明確選擇。
:::

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

#### Event-time vs Processing-time + Watermark

把 watermark 視覺化最直觀的方式：**event-time 軸**（事件在現實世界發生時間）vs **processing-time 軸**（事件被框架處理的時間）—— 兩條軸理想情況下應該是 y=x 對角線、但實際上有 lag：

<SequenceFlow
  caption="Watermark：framework 對 event-time 進度的保守估計（heuristic、非完備）"
  :actors='["現實 event-time", "框架 processing-time", "Watermark", "Window [10:00-10:05]"]'
  :phases='[
    {
      name: "T=10:00 視窗開始 · 事件陸續到達",
      steps: [
        { from: 0, to: 1, msg: "e1 (event-time 10:01)" },
        { kind: "note", actors: [1, 1], text: "處理時間 10:01:03" },
        { from: 0, to: 1, msg: "e2 (event-time 10:02)" },
        { kind: "note", actors: [1, 1], text: "處理時間 10:02:01" },
        { from: 0, to: 1, msg: "e3 (event-time 10:00、亂序到達)" },
        { kind: "note", actors: [1, 1], text: "處理時間 10:04:00" },
        { kind: "note", actors: [2, 2], text: "Watermark = 10:04（保守估計：所有 ≤ 10:04 都到了）" }
      ]
    },
    {
      name: "T=10:05 視窗結束 · Watermark 跨 10:05 才觸發 close",
      steps: [
        { from: 0, to: 1, msg: "e4 (event-time 10:03)" },
        { kind: "note", actors: [1, 1], text: "處理時間 10:05:30" },
        { kind: "note", actors: [2, 3], tone: "safe", text: "Watermark 推進到 10:05、視窗關閉、輸出結果" },
        { from: 0, to: 1, msg: "e5 (event-time 10:04、late event)" },
        { kind: "note", actors: [1, 1], text: "處理時間 10:06:00" },
        { kind: "note", actors: [3, 3], tone: "warn", text: "⚠ 已關窗、e5 丟棄（除非設 allowed lateness）" },
        { kind: "note", actors: [2, 3], tone: "warn", text: "Watermark 本質是 heuristic、永遠可能有更晚到的 event" }
      ]
    }
  ]'
/>

**重點**：watermark 是框架對「event-time 進度」的**啟發式（heuristic）**保守估計、不是完備保證——**永遠可能有更晚到的 event**（例：手機離線一週後回連、舊事件才送到）。watermark **太激進**（推太快）→ 丟掉很多 late event；**太保守**（推太慢）→ 結果輸出延遲變大。allowed lateness 機制就是為這個本質性的不確定性留的。

### 三大框架的 watermark / late event 機制對照

| 框架 | watermark 機制 | late event 處理 | 配置方式 |
|---|---|---|---|
| **Flink** | `WatermarkStrategy`，可選 `BoundedOutOfOrderness`（允許固定亂序時間）/ `Periodic` / `Punctuated` | `allowedLateness` + `sideOutputLateData`（late event 進 side output 而非丟棄） | DataStream API 上鏈式設定 |
| **Beam / Dataflow** | Watermark 由 source 推、配 **Trigger** 雙層機制 | `withAllowedLateness` + 配合 `Trigger` 重新觸發計算 | pipeline-level、可組合 trigger |
| **Kafka Streams** | **Stream-time**（每個 task 看到的最大 event timestamp，單調遞增）+ **grace period** | grace period 內接受、外丟棄；不像 Flink 有 side output | `Materialized.withGracePeriod(...)` 配在 windowed aggregation |

**選型啟示**：
- 要嚴格 late event 處理（不能丟）→ **Flink + side output**
- 要彈性 trigger（多次觸發、early/late firings）→ **Beam / Dataflow**
- 已用 Kafka Streams、能接受 grace period 內丟棄 → **直接設 grace period 即可**

::: tip Kafka Streams 沒有「watermark」這個 API 名
官方文件用「stream-time」+「grace period」描述、但本質上就是 Flink 那套 watermark + allowed lateness 的簡化版。Confluent 文件刻意避開 watermark 用詞、是為了與 Flink 區分品牌，**底層概念相同**。
:::

### Stream-Table Join
事件流 JOIN 維度資料表（如「訂單流」JOIN「使用者資料表」）。
- 表通常本地化（用 changelog 維護一份本地副本）
- 重要：用「事件發生時的維度值」還是「處理時的維度值」？

### Table-Table Join
兩個 changelog 的 join（CDC 流 + CDC 流），維護的 materialized view 同步更新。

<SectionDivider icon="verified" label="正確性真相" />

## 11.5 容錯：Exactly-Once 的真相 {#exactly-once-section}

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
| **Spark Structured Streaming** | Micro-batch + WAL（write-ahead log）+ idempotent sink | ✓ 需要 **driver-side 的 epoch / batch-id 冪等寫**配合 Kafka idempotent producer | ✓ **要 sink 冪等**（用 `foreachBatch` + UPSERT、或 Delta Lake 的 ACID） | per-micro-batch | **不是預設**：`writeStream` 預設 at-least-once、要達 EOS **必須選冪等 sink**（Delta / Kafka idempotent producer / `foreachBatch + UPSERT`） |

**閱讀重點**：
- **Kafka Streams 對外部 sink 無法 EOS**——這是常見誤解。EOS 範圍只到「Kafka topic 之間」。寫 PG / ES / Redis 仍需冪等寫法
- **Flink 是唯一原生支援「end-to-end EOS」**的框架（透過 2PC sink interface），但前提是 sink 系統本身支援 transactional API（PG 支援 XA、Kafka 支援 transactional producer）
- **Spark 走「micro-batch + 冪等 sink」路線**——犧牲 per-record 延遲（micro-batch latency 通常 100ms~秒級）換取簡單的 EOS 模型
- **Spark 對 Kafka sink 的 EOS 細節**：依賴 **driver-side 的 epoch / batch-id 冪等寫**、不只 Kafka producer 端的 idempotence——Kafka idempotent producer 只擋 broker 重傳、不擋 driver 重啟後的整批 re-emit。driver 失效切換時若 sink 端沒有以 batch-id 為冪等鍵的去重、會出現重複寫入。**真正 end-to-end EOS 仍以 Flink + transactional sink 最直接**
- **失敗恢復粒度**直接影響「重試後的延遲」：Kafka Streams 重試一筆、Flink 從上一個 checkpoint 重跑、Spark 從上一個 micro-batch 重跑

::: tip Kafka 2.8+ 的 KRaft 對這層有影響嗎
KRaft（Kafka 自管 Raft，4.0 完全移除 ZooKeeper）改變的是 **Kafka 控制平面**（metadata 管理 / leader election），**不影響** producer transaction / EOS 機制——transactional producer 是用 `__transaction_state` topic + transaction coordinator 實作的、跟 ZK/KRaft 無關。詳見 [Ch9 §9.6](/part-2/ch09-consistency)。
:::

### Outbox Pattern：DB → Kafka 的三種實作

當應用要「改 DB 同時發 Kafka 事件」、最常見的陷阱是「DB 已 commit 但 Kafka 寫失敗、或反過來」。**outbox pattern** 把 Kafka 事件先寫進 DB 自己的 outbox 表（**與業務 row 同一 transaction**）、再由另一個行程把 outbox 內的事件搬到 Kafka。

三種搬運實作各有取捨：

#### (a) CDC outbox（Debezium）

把 outbox 表設成 CDC source、Debezium 把 INSERT 變成 Kafka 事件：

```sql
-- 應用層在交易內寫業務 row + outbox row（atomic）
BEGIN;
  INSERT INTO orders (id, user_id, amount) VALUES ('o-123', 'u-1', 100);
  INSERT INTO outbox (event_id, topic, payload, created_at)
    VALUES (gen_random_uuid(), 'order.created',
            '{"order_id":"o-123","user_id":"u-1","amount":100}'::jsonb,
            now());
COMMIT;
-- Debezium 讀 PG WAL、把 outbox 表的 INSERT 變成 Kafka 事件
```

- ✓ 延遲 sub-second（直接讀 WAL）
- ✓ 應用層 zero code（只要寫 outbox 表）
- ✗ 要部署 Kafka Connect + Debezium、運維成本高
- ✗ outbox 表會膨脹、需 retention 機制（Debezium router 寫 tombstone 觸發 compaction）

#### (b) 應用層 polling outbox

寫個獨立行程定期 `SELECT ... FROM outbox WHERE published = false`、推到 Kafka、標記 published：

```sql
-- worker 行程的核心 loop
SELECT event_id, topic, payload FROM outbox
  WHERE published = false
  ORDER BY created_at
  LIMIT 100
  FOR UPDATE SKIP LOCKED;  -- PG 9.5+、多 worker 平行不撞同列

-- 對每筆送到 Kafka、成功後：
UPDATE outbox SET published = true, published_at = now()
  WHERE event_id = $1;
```

- ✓ 零外部依賴、純 SQL + Kafka producer
- ✓ 適合不能部署 Debezium 的環境（managed PG 不開 logical replication）
- ✗ 延遲 = polling interval（典型 100ms~秒級）
- ✗ 多 worker 要靠 `SKIP LOCKED` 避免重複送

#### (c) PostgreSQL `LISTEN/NOTIFY` 推送

DB trigger 在 INSERT outbox 時 `NOTIFY`、worker `LISTEN` 收到後立刻送 Kafka：

```sql
-- trigger function（PG 特有）
CREATE OR REPLACE FUNCTION notify_outbox() RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('outbox_channel', NEW.event_id::text);
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER outbox_notify_trigger
  AFTER INSERT ON outbox
  FOR EACH ROW EXECUTE FUNCTION notify_outbox();

-- worker 用 LISTEN outbox_channel; 收事件後抓 outbox row 推 Kafka
```

- ✓ 延遲毫秒級（push 不是 poll）
- ✓ 純 PG 內建、無外部依賴
- ✗ **僅 PG**、且 NOTIFY payload 上限 8KB（要先 SELECT row 拿 payload）
- ✗ 連線數壓力（每個 worker 一個 LISTEN 連線、PG `max_connections` 要夠）
- ✗ NOTIFY 不持久——若 worker 全死、訊息丟失；要 fallback 配 polling

#### 對外部 sink 的冪等寫入：兩種模式

無論用哪種 outbox、**下游 sink 仍要冪等**（exactly-once 不是免費的）：

```sql
-- 模式 1：UUID-based dedup（最通用）
INSERT INTO orders_replica (order_id, user_id, amount, event_uuid)
  VALUES ('o-123', 'u-1', 100, $event_uuid)
  ON CONFLICT (event_uuid) DO NOTHING;
-- 重送同一 event 不會重複寫
```

```sql
-- 模式 2：狀態機冪等（業務邏輯本身擋）
UPDATE orders SET status = 'paid', paid_at = now()
  WHERE id = $order_id AND status = 'pending';
-- 重送 paid 事件不會把已 paid 的 row 又改一次
-- (affected rows = 0 即代表「已被處理過、忽略」)
```

::: tip 三種選哪個
- **預設用 (a) Debezium**——延遲低、應用 code 最少、產業標準
- **沒法部署 Debezium**（managed DB / 受限環境） → **(b) polling outbox + SKIP LOCKED**
- **PG only + 毫秒延遲需求 + 訊息量不大** → **(c) LISTEN/NOTIFY + polling fallback**

**沒有「(a) > (b) > (c)」的絕對排序**——取決於部署環境。但 outbox **三者共同的本質**：「**業務寫與事件寫在同一 DB transaction 內**」是不可妥協的、否則就回到雙寫陷阱。
:::

### 11.6 Stripe-style idempotency key：端到端去重的業界標準 {#stripe-style-idempotency-key}

Exactly-once 在「**消費端 + 對外副作用**」這層通常靠 **idempotency key**——這是 Stripe / Square / Adyen 等支付系統的事實標準，2020 後也擴散到電商 / 票務 / 物流 API。

**運作機制**（以 Stripe API 為例）：

1. **Client 產生 UUID 當 `Idempotency-Key` header**（每次 POST 都生新的、retry 同一個請求用同一把 key）
2. **Server 收到請求先查 dedupe store**（Redis / PostgreSQL，TTL 24 小時）：
   - **Key 不存在** → 正常處理、把 `{key, request fingerprint, response body}` 寫進 store
   - **Key 存在 + fingerprint 相同** → **直接回傳 cached response**（不重複扣款 / 不重複發貨）
   - **Key 存在 + fingerprint 不同**（例如改了金額卻用同一把 key） → 回 `409 Conflict`、拒絕處理
3. **24 小時後 key 過期**——這也是為什麼 Stripe 文件建議 client 端的 retry 視窗不要超過 24 小時

**Schema 設計範例**：
```sql
CREATE TABLE idempotency_keys (
  key VARCHAR(64) PRIMARY KEY,                  -- client 給的 UUID
  request_fingerprint VARCHAR(64) NOT NULL,     -- SHA-256(method + path + body)
  response_status INT NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL               -- 24h TTL
);
CREATE INDEX idx_expires ON idempotency_keys(expires_at);
```

**Trade-off**：
- **24h TTL vs 永久保留**：永久保留可避免「24h 後重試造成重複扣款」、但 dedupe store 會無限長大、變成另一個維運痛點
- **request fingerprint 算到哪一層**：含 body 太嚴（任何空白都算不同請求）、不含 body 太寬鬆（改了金額同 key 過得了）。實務上多半算「**business-level fields**」的 hash（金額、收款帳號、商品 ID）
- **與 Kafka exactly-once 的差異**：Kafka EOS 是 broker-to-consumer 內部、idempotency key 是 client-to-server 外部——**兩個世界、各管一段**

**dedupe store 三種實作選擇**：
- **PostgreSQL `UNIQUE constraint on (api_key, idempotency_key)`**：強一致、ACID 保證、但寫吞吐有限（每秒數千 QPS 級）。適合中低流量金融場景
- **Redis `SETNX` + `EXPIRE`**：原子寫入 + TTL、高吞吐（每秒數十萬 QPS）、但 Redis 失效時可能掉 dedupe state（重試會穿透到下游）
- **PostgreSQL + Redis hybrid**：Redis 當 hot cache（24 小時內熱資料）、PG 當 source of truth（無限保留）——兼顧吞吐與一致性、但兩套維運成本

**為什麼比「在 DB 用 UNIQUE constraint 擋」更好**：
- DB UNIQUE constraint 只擋同一筆 INSERT 重複、但「先扣款 → 寫訂單 → 通知物流」三步操作的中段失敗、UNIQUE 救不了——Idempotency Key 把**整個 endpoint 的副作用當原子單位**
- 第二次重試時 client 拿到的不是 `409 duplicate`、而是**原本第一次成功的 response**（含 `transaction_id` 等欄位），這對 client 整合來說行為自然、不需要特別處理「重複」的 edge case

::: tip 本土場景：街口 / Line Pay / 玉山銀行 / 蝦皮
- **街口 / Line Pay 轉帳 API**：客戶端 SDK 每筆轉帳自動生 idempotency key、網路抖動 SDK 自動重試三次也不會扣兩次
- **玉山銀行 Open API**：`refundOrder` / `transferOut` 等寫操作要求 `X-Request-Id` header、伺服器端 dedupe 保留 7 天（涵蓋客服爭議窗口）
- **蝦皮商品下訂 API**：購物車送出時 SDK 生 idempotency key、即使網路抖動重試三次也只下單一次

**這正是 Ch7 街口轉帳「卡 3 秒被扣兩次」的解法**——但要應用層主動實作、DB 不會自動給。
:::

**進階主題**（本書深度之外、有興趣請查相關文獻）：idempotency key 與分散式 transaction、CAP 取捨、Saga 流程中的多步 idempotency 設計。

**為什麼這比 Ch12 §12.4 端到端正確性的「Client 產生 request_id」更具體**：Stripe 的設計把 dedupe 提升到 API 合約層（header），讓 client SDK 可以無痛內建 retry 邏輯，是「**把 exactly-once 變成可協作的工程默契**」的範本。

::: tip 運維面：Consumer Lag 監控指標命名速查
Kafka 消費端最常見 incident 是 **consumer lag 飆高**（producer 寫得比 consumer 消費得快）、SRE 自學者該認得幾個關鍵 metric 名：

- **`kafka_consumer_lag`** / **`records-lag-max`**（per partition）：partition 最大未消費訊息數——**監控 max、不是 avg**（單一 partition 落後就會拖累整個 consumer group）
- **`records-consumed-rate`**：消費速率（msg/sec）——與 producer 端 `records-produced-rate` 比對、判斷是「producer 暴增」還是「consumer 變慢」
- **[Burrow](https://github.com/linkedin/Burrow)**（LinkedIn 開源）：consumer group 狀態評估、輸出 `OK / WARN / ERR / STALL / STOP` 五級
- **Rebalance storm 警示**：`consumer-coordinator-metrics.rebalance-rate-per-hour` > 1 通常代表 `session.timeout.ms` / `max.poll.interval.ms` 配錯、或 partition 數頻繁變動

**典型 lag 增長 90 秒分流**：
1. Producer 端突增？看 `records-produced-rate` 是否 spike → 是 → 擴 producer 或加 partition
2. Consumer 端 GC？看 consumer pod CPU / GC pause → 調 heap 或換 G1GC
3. 分區傾斜？看每個 partition 的 lag 分布 → 是 → key 設計問題、需要 re-key

**這節是 SRE 自學鋪墊、不取代 Confluent / Burrow 官方文件**。
:::

---

## 章末練習

::: tip 思考題
1. 用 docker-compose 跑 Kafka + Debezium + PostgreSQL，把一張 `users` 表的變更串到 Kafka topic。
2. 寫一個 Kafka Streams 應用，把使用者註冊事件 join 訂單事件，產生「新使用者首單」報表。
3. 設計題：你的訂單系統用 Event Sourcing，事件 schema 演進時怎麼處理舊事件？（versioning、upcasting）
:::

::: tip Quiz 題目分級
- **★ 核心題**（basic / applied）：走 FirstReadShortcut「最小可用版」路徑也應答得出來
- **☆ 進階題**（interview）：通常需要讀過該章「第一次可跳」的小節、面試常考；第一次答不出來沒關係、之後回頭再挑戰
:::

<Quiz chapter-id="ch11" :questions='[
  {
    difficulty: "applied",
    question: "★ Kafka 與傳統 message queue（如 RabbitMQ）的本質差別是？",
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
    difficulty: "basic",
    question: "★ Change Data Capture (CDC) 的主要用途是？",
    options: [
      "壓縮資料庫備份",
      "從 DB transaction log 提取變更事件，下游系統可獨立衍生（搜尋索引、快取、資料倉儲）",
      "替代 DB 主鍵",
      "加密敏感資料"
    ],
    answer: 1,
    explanation: "CDC 讀 DB 的 binlog/WAL，把每筆 INSERT/UPDATE/DELETE 變成事件流。下游各自消費、各自衍生，DB 仍是 source of truth —— 比應用層雙寫（DB + Elasticsearch）安全得多。"
  },
  {
    difficulty: "interview",
    question: "☆ 「Exactly-once 處理」的實務意義是？",
    options: [
      "每個訊息真的只被執行一次",
      "處理可能重試多次，但外部可見效果等同於只處理一次（透過冪等寫入或 transactional output）",
      "禁止任何形式的重試",
      "只能用於單機"
    ],
    answer: 1,
    explanation: "純粹「只執行一次」在分散式系統中不可能（失敗時你怎麼知道是否要重做？）。實務的 exactly-once 靠冪等或 atomic commit 確保「重做不會造成額外副作用」。Kafka exactly-once = atomic 寫 + atomic offset commit。",
    sectionAnchor: "exactly-once-section"
  },
  {
    difficulty: "applied",
    question: "★ Event Sourcing 相對於「只存當前狀態」的主要優勢是？",
    options: [
      "佔的儲存空間較少",
      "可審計、可重播、可時間旅行；隨需衍生不同 read model",
      "查詢一定比較快",
      "不需要備份"
    ],
    answer: 1,
    explanation: "Event Sourcing 把「歷史」當主資料，現狀是衍生的。代價是查詢當前狀態貴（要 replay 或維護快照），但換來完整的審計歷史、bug 回放、隨時衍生新 view 的能力。"
  },
  {
    difficulty: "interview",
    question: "☆ 你用 event time 做 1 小時的 tumbling window 統計、但事件因手機離線排隊偶爾遲到 30 分鐘到達。下列描述何者最準確？",
    options: [
      "只能改用 processing time 開窗、否則無法處理遲到事件",
      "Watermark 機制宣告「event time T 之前的事件大致到齊」、視窗在 watermark 通過後關閉；遲到事件可選擇丟棄、累計到 side output、或觸發 late firing 更新結果",
      "Flink 與 Kafka Streams 在這個場景行為完全相同、無差異",
      "Tumbling window 不支援 event time、必須用 sliding window"
    ],
    answer: 1,
    explanation: "**Watermark** 是 event-time stream processing 的核心抽象：宣告「event time ≤ T 的事件大致到齊」、觸發視窗計算與關閉。遲到事件（watermark 已通過、事件才到）的處理選擇：(1) **丟棄**（最簡單）；(2) **side output**（Flink）路到另一條流另外處理；(3) **late firing**（Beam / Flink）觸發視窗重算並輸出 update。各框架預設策略不同——Flink 給選項、Kafka Streams 在 2.6+ 支援 grace period 後直接丟棄、Spark Structured Streaming 用 watermark + delay。**選型題重點**：「容忍多少遲到」是業務決定、不是框架預設能搞定。",
    sectionAnchor: "windowing-section"
  }
]' />

<InterviewBlock chapter-id="ch11" :questions='[
  { "tag": "Exactly-once", "question": "你公司的 Kafka pipeline 出現「下游 ES 多寫了相同資料」客訴。請說明可能原因 + 至少兩種修法（含適用場景）。" },
  { "tag": "Stream 框架選型", "question": "Kafka Streams / Flink / Spark Structured Streaming 三家的 exactly-once 機制差異？對選型有何影響？「Kafka Streams EOS 包含外部 sink」是對是錯？" },
  { "tag": "KRaft / 演進", "question": "Kafka 4.0 移除 ZooKeeper 對 Kafka 系統有什麼影響？KRaft 與原本 ZAB 的根本差別？Kafka leader epoch 跟 Raft term 是同一回事嗎？" }
]' />

<ChapterNote chapter-id="ch11" />

<Progress chapter-id="ch11" />

::: info 延伸閱讀
- [Kafka: a Distributed Messaging System (Kreps et al.)](https://www.microsoft.com/en-us/research/wp-content/uploads/2017/09/Kafka.pdf) — Kafka 原始論文，把 log 抽象說透
- [Exactly-Once Semantics Are Possible: Here's How Apache Kafka Does It](https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/) — Confluent 官方對 exactly-once 內幕
- [Debezium 文件](https://debezium.io/documentation/) — 最流行的開源 CDC 工具
- [Designing Event-Driven Systems (Ben Stopford, 免費電子書)](https://www.confluent.io/designing-event-driven-systems/)
:::

<NextChapterBridge chapter-id="ch11" />

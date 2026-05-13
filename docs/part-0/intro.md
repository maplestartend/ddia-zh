---
title: 0.1 為什麼需要資料密集系統
description: 從一個簡單後端講起 —— Stateless 服務、典型元件、DDIA 想解決什麼
---

# 0.1 · 為什麼需要資料密集系統

<ChapterMeta part="Part 0 前置知識" :read-time="12" difficulty="入門" :tags="['Stateless', '架構', '元件']" />

<TLDR :points='[
  "<strong>資料密集 ≠ 計算密集</strong>。瓶頸在「資料量、資料複雜度、資料變化速度」而非 CPU——DDIA 整本書都在處理這類系統。",
  "<strong>後端服務通常設計成 <G term=\"stateless\">stateless</G></strong>——應用層不存任何請求間狀態，所有狀態丟給 DB / <G term=\"cache\">Cache</G> / <G term=\"message-queue\">MQ</G>。這讓水平擴展（加機器）變得簡單。",
  "<strong><G term=\"stateful\">Stateful</G> 元件才是真正的難題</strong>。DB、Kafka、Redis cluster 才是 DDIA 的核心戰場。",
  "<strong>典型現代後端 = 五種元件的拼裝</strong>：DB（OLTP）、DB（OLAP / search）、Cache、Message Queue、Stream Processor。會選、會接、會權衡——就是 Ch1 想教的能力。"
]' />

## 1) 「資料密集」是什麼意思？

Kleppmann 在 DDIA 序言定義得很清楚：

> 一個應用是「資料密集」的，當**資料的量、複雜度、或變化速度**是主要挑戰；
> 一個應用是「計算密集」的，當 **CPU 計算速度**是主要挑戰。

絕大多數網路公司的後端都是前者。Netflix 推薦、Twitter timeline、Uber 派單、Shopify 結帳——CPU 都不是瓶頸，**資料怎麼存、怎麼讀、怎麼跨機器一致**才是。

## 2) 典型現代後端的架構（分階段揭露）

第一次看完整架構圖會頭暈。我們**分三階段**蓋這張圖、每階段只加幾個元件。

### 階段 1：最簡單的後端 — 一個資料庫就夠

```
Client（瀏覽器 / App）
      │
      ▼
 應用服務（Stateless）
      │
      ▼
   Database
   (PostgreSQL)
```

最小可行版本。所有讀寫都打 DB、應用服務不存任何狀態。**問題**：使用者多了、DB 撐不住每次都 query 同一張熱門商品。

### 階段 2：加 Cache 與 Message Queue（為什麼需要）

```
Client → API Gateway / LB → 應用服務（多台）
                                  │
                ┌─────────────────┼─────────────────┐
                ▼                 ▼                 ▼
            Database          Cache         Message Queue
            (OLTP)            (Redis)         (Kafka)
```

- **加 Cache（Redis）**：熱門商品的查詢命中 cache、減 DB 負擔 90%
- **加 Message Queue（Kafka）**：寄信、產生報表這種「不必馬上回」的任務丟進 queue、非同步處理
- **加 LB**：應用服務變多台、需要把請求平均分配

**問題**：報表系統現在要跑「上週各商品銷量」要掃 DB 1000 萬筆、會把 OLTP DB 跑垮。

### 階段 3：加 Search、Stream/Batch、Data Warehouse（完整圖）

```
Client → API Gateway / LB → 應用服務（多台、Stateless）
                                  │
       ┌──────────┬───────────────┼───────────────┐
       ▼          ▼               ▼               ▼
   Database    Cache          Search        Message Queue
   (OLTP)     (Redis)        (ES/Solr)       (Kafka)
       │                                          │
       │       ┌──────────────────────────────────┘
       │       ▼
       │   Stream/Batch Processor
       │       │
       ▼       ▼
   Data Warehouse (OLAP)
```

- **加 Search（Elasticsearch）**：全文搜尋從 OLTP DB 抽出來、用倒排索引引擎
- **加 Stream/Batch Processor**：從 Kafka / OLTP 抓資料、彙整、寫進 Data Warehouse
- **加 Data Warehouse（OLAP）**：跑「上週各商品銷量」的地方、跟交易 DB 完全分離

**本書就是教你**：選擇與組合這些元件、知道每個的取捨在哪。

::: tip 為什麼這樣演進
階段 1 → 2 → 3 是真實公司成長的順序：流量大才需要 Cache、跨服務通訊才需要 MQ、報表跑垮 DB 才拉 OLAP。**不是一次設計完整圖**——是隨著痛點演進。
:::

### 五種元件的快速字典

| 元件 | 中文 | 一句話 | 例子 | 對應 DDIA |
|---|---|---|---|---|
| **Database (OLTP)** | 交易資料庫 | 即時的小操作（下訂、改密碼） | PostgreSQL、MySQL | Ch2, Ch3, Ch7 |
| **Cache** | 快取 | 把熱資料放記憶體 | Redis、Memcached | Ch1 |
| **Search** | 搜尋引擎 | 全文搜尋專用 | Elasticsearch、Solr | Ch3 |
| **Message Queue** | 訊息隊列 | 非同步任務、解耦 | Kafka、RabbitMQ | Ch11 |
| **Stream/Batch Processor** | 串流 / 批次處理器 | 把資料從 A 轉到 B | Flink、Spark、Airflow | Ch10, Ch11 |
| **Data Warehouse (OLAP)** | 資料倉儲 | 跑大型分析報表 | BigQuery、Snowflake、Redshift | Ch3, Ch10 |

::: info OLTP vs OLAP 是什麼？
- **OLTP（Online Transaction Processing）**：每秒大量小操作（下訂單、改密碼）—— 你 app 後端的 main DB
- **OLAP（Online Analytical Processing）**：少量大查詢（這個月誰買最多）—— 數據分析師的 BI 工具背後

詳見 [Ch3 儲存與檢索](/part-1/ch03-storage) 與 [0.0 三分鐘看懂後端](/part-0/basics)。
:::

每一條箭頭、每一個元件，都對應 DDIA 的至少一章：
- **DB（OLTP）**：Ch2 資料模型、Ch3 儲存引擎、Ch7 交易
- **Cache**：Ch1 提到的拼裝元件
- **Search**：Ch3 倒排索引
- **MQ**：Ch11 串流處理
- **Stream Processor**：Ch11
- **Data Warehouse（OLAP）**：Ch3 欄式儲存、Ch10 批次

## 3) 為什麼應用服務要設計成 <G term="stateless">stateless</G>？

「Stateless」=「在記憶體裡不保留任何請求之間的狀態」。

**好處**：
- 任何請求可以路由到任何一台應用機器
- 加機器 = 加容量（直接 scale out）
- 一台掛了，其他台無縫接手

**代價**：每個請求都要從 DB / Cache 撈狀態。所以 **DB 變成瓶頸**——這就是 DDIA Part II（複製、分區、共識）要解決的事。

::: tip 一個記憶要點
應用服務無狀態化是「**把難題集中到資料層**」的設計——讓你只需要處理 1 個複雜的 DB 叢集，而不是 100 台應用機器各自的狀態同步。
:::

## 4) <G term="stateful">Stateful</G> 元件難在哪？

DB、Cache、MQ 都有狀態。它們面對的問題：

- **資料要不要複製？** 複製就要同步——同步又會卡延遲（→ Ch5 複製）
- **單台撐不下怎麼辦？** 切分——切分後跨分片查詢變難（→ Ch6 分區）
- **兩個請求同時改同一筆？** 並發控制——隔離級別與鎖（→ Ch7 交易）
- **網路斷一半怎麼辦？** CAP、共識、腦裂（→ Ch8、Ch9）

**這四個難題，DDIA 整個 Part II 就在處理。** 看懂 Part II = 看懂分散式資料系統。

## 5) 與 DDIA 全書的對應

| 你想做的事 | DDIA 第幾章 |
|---|---|
| 選 SQL 還是 NoSQL？文件還是圖？ | Ch2 資料模型 |
| 寫多還是讀多？該用 LSM 還是 B-Tree？ | Ch3 儲存與檢索 |
| API 升版怎麼不打到老客戶？ | Ch4 編碼與演進 |
| 副本資料怎麼最終一致？ | Ch5 複製 |
| 資料量太大要分片？怎麼分？ | Ch6 分區 |
| 並發更新怎麼避免丟錢？ | Ch7 交易 |
| 服務之間網路斷怎麼辦？ | Ch8 麻煩 |
| 怎麼讓 N 台機器達成共識？ | Ch9 一致性與共識 |
| 跑大規模 batch job？ | Ch10 批次 |
| Kafka pipeline 怎麼設計？ | Ch11 串流 |

---

## 想更深入？

| 資源 | 內容 |
|---|---|
| [The Twelve-Factor App](https://12factor.net/) | Stateless 服務的設計指南（其中 IV、VI 直接相關） |
| [Heroku: Architecture of Modern Apps](https://devcenter.heroku.com/articles/architecting-apps) | 雲端時代的後端拼裝慣例 |
| [DDIA Preface](https://dataintensive.net/) | Kleppmann 自己對「資料密集」的定義 |

---

## 章末自評

<Quiz chapter-id="p0-intro" :questions='[
  {
    "difficulty": "basic",
    "question": "下列哪個系統最不像「資料密集型」？",
    "options": [
      "Twitter 推文 timeline 服務（10 億用戶、即時 fan-out）",
      "電商結帳系統（百萬商品、即時庫存扣減）",
      "3D 動畫 ray-tracing 渲染叢集",
      "Uber 派單（即時匹配司機與乘客）"
    ],
    "answer": 2,
    "explanation": "Ray-tracing 渲染是「計算密集」—— 瓶頸是 CPU/GPU。其他三個都是資料量、資料變化速度為主——典型的資料密集，DDIA 全書的目標讀者。"
  },
  {
    "difficulty": "basic",
    "question": "「應用服務設計成 stateless」最直接的好處是？",
    "options": [
      "省記憶體",
      "任何請求可以路由到任何一台機器，加機器就加容量",
      "可以不寫資料庫",
      "比較安全（沒有狀態就沒有資料外洩）"
    ],
    "answer": 1,
    "explanation": "Stateless 的核心好處是「橫向擴展簡單」—— 加機器不用煩惱狀態同步，掛一台不用煩惱資料丟失。代價是把難題集中到資料層（DB/Cache/MQ）。"
  },
  {
    "difficulty": "applied",
    "question": "為什麼 DDIA Part II（複製、分區、交易、共識）會是全書最硬的部分？",
    "options": [
      "因為這部分數學最多",
      "因為這些題目都是「有狀態元件在分散式環境下」的難題，沒有完美解、只有權衡",
      "因為 Kleppmann 寫得最差",
      "因為這部分內容最新"
    ],
    "answer": 1,
    "explanation": "Part II 的 5 章對應 DB / Cache / MQ 等 stateful 元件在分散式環境下會遇到的 4 個根本難題（複製、分區、並發、共識）。每個都有 CAP 式的 trade-off——這就是為什麼分散式系統沒有銀彈、只能權衡。"
  }
]' />

<NextChapterBridge next-link="/part-0/metrics" next-title="0.2 衡量指標素養">
有了「為什麼需要 DDIA」的全景之後，下一步補上 Ch1 第一節就會用到的詞彙：QPS、P99、SLA。
</NextChapterBridge>

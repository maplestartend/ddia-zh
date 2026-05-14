---
title: 面試題速查表 — 系統設計題 ↔ DDIA 章節對應
description: 經典系統設計面試題對映到 DDIA 哪幾章哪幾節，把書當查找索引而不是線性教科書
---

# 面試題速查表 · 系統設計題 ↔ DDIA 章節對應

把 DDIA 當「面試題查找索引」用——拿到一道系統設計題、不用從頭翻書、直接從這張表跳到對應章節。每題列出「**核心考點**」+「**對應 DDIA §**」+「**面試官可能追問的尾刀**」。

::: tip 怎麼用這份速查表
1. 看面試題、對映到下方表格、跳到 DDIA 對應 §
2. 讀完該 § 後、回到本表看「追問」清單、自我問答
3. 不熟的概念回 [學習路徑](./)、走「面試準備 3 週」路徑

**這份速查表不能取代讀書本身**——是「讀過後快速 refresh」的工具。沒讀過對應章節直接背題會被面試官一個 follow-up 問題打穿。
:::

---

## 1. 設計 News Feed / Timeline（Twitter / IG / FB）

| 維度 | 對應 DDIA |
|---|---|
| **負載描述：QPS 不夠、要看粉絲數分布** | Ch1 §1.3 「描述負載：以 Twitter 為例」|
| **延遲指標：P99 而非平均** | Ch1 §1.3 「描述性能：使用 Percentile」|
| **Fan-out on write vs read** | Ch1 §1.3、Ch5 §5.4 multi-leader 衝突 |
| **超級大 V 混合策略** | Ch1 §1.3 結尾 |
| **熱點分區（celebrity user）** | Ch6 §6.3 hot spot |
| **時間軸快取怎麼存** | Ch3 §3.5 Redis 不是「跑得快」、是能做磁碟難做的資料結構 |

**面試官追問**：
- 「你怎麼處理超級大 V 發文時的 fan-out 爆炸？」 → 混合策略：粉絲 > 1M 改 read-time pull
- 「P99 = 2s、P50 = 100ms，怎麼解？」 → Ch1 「頭尾延遲放大」段、看下游 fan-out 數
- 「Timeline cache 跨 region 怎麼同步？」 → Ch5 multi-leader + LWW、Ch9 CAP 取捨

::: tip 本土對應練習：蝦皮雙 11 直播
用**蝦皮雙 11 直播主播點愛心 fan-out** 重講一遍——主播一個動作要 fan-out 到數十萬同時在線觀眾的心跳動畫、商品連結也要即時推送。你會怎麼設計 push / pull / 混合策略？熱點主播（10 萬粉以上）要怎麼避免推送風暴？參考：[Ch1 §1.3 蝦皮負載 callout](/part-1/ch01-reliable#_1-3-描述負載-以-twitter-為例)。
:::

---

## 2. 設計轉帳系統 / 訂單系統（fintech、e-commerce）

| 維度 | 對應 DDIA |
|---|---|
| **ACID 的 A 與 D（DB 真的給）vs C 與 I（你給）** | Ch7 §7.1 「ACID 的真相」|
| **隔離級別選哪個？** | Ch7 §7.2「弱隔離級別與異常」+ 各家 DB 對照 |
| **Lost update（同列）vs Write skew（跨列前提）** | Ch7 §7.2 lost update 段 + write skew 段 + 三情境決策樹 |
| **PG REPEATABLE READ ≠ MySQL InnoDB RR** | Ch7 §7.2 「命名地獄」warning + InnoDB 混合模式段 |
| **Serializable 三種實作（Serial Execution / 2PL / SSI）** | Ch7 §7.3 |
| **跨服務交易 → Saga / Outbox / TCC** | Ch9 §9.4 對照表 + Ch11 outbox 三種實作 |
| **冪等是 retry-safe 的前提** | Ch11 §11.5 outbox 後段「冪等寫入的兩種模式」|

**面試官追問**：
- 「兩個請求同時搶最後一張優惠券、你怎麼擋？」 → 三招：原子 UPDATE / 悲觀鎖 / 樂觀鎖（CAS via version）
- 「微服務 A 扣款、微服務 B 加庫存，A 成功 B 失敗怎麼辦？」 → Saga 補償 / TCC / Outbox + CDC（**不要選 2PC**——跨 process boundary recovery 很痛）
- 「PostgreSQL 跟 MySQL 預設隔離級別誰防 lost update？」 → **都不防**（READ COMMITTED）。要升 REPEATABLE READ + retry on `40001`（**只有 PG 偵測、MySQL InnoDB RR 仍不偵測**）

::: tip 本土對應練習：街口 / Line Pay 轉帳 + 蝦皮訂單流程
**單筆轉帳**用街口或 Line Pay 重講一遍——使用者按下「轉帳 1,000 元」、App 卡住、3 秒後跳「網路錯誤」、使用者重按一次。你怎麼擋重複扣款？idempotency key 怎麼設計（按鈕一次性 token vs 業務 ID）？參考：[Ch11 §11.6 玉山轉帳 idempotency](/part-3/ch11-streams#_11-6-冪等與恰好一次)。

**跨服務訂單流程**用蝦皮重講——「付款 → 扣庫存 → 派物流 → 寄通知」，付款成功但庫存不夠怎麼補償？選 Saga Orchestration（用 Temporal 跑流程）還是 Choreography（每個服務自己訂閱 event）？參考：[Ch9 §9.4 Saga 對照表](/part-2/ch09-consistency#_9-4-分散式交易與共識)。
:::

---

## 3. 設計即時通訊 / 聊天 / Slack

| 維度 | 對應 DDIA |
|---|---|
| **訊息傳遞語意：at-most / at-least / exactly-once** | Ch11 §11.5 容錯：Exactly-Once 的真相 |
| **訊息順序（同房間內單調）** | Ch9 §9.3 因果序 + 全序廣播 |
| **跨 region 訊息收斂** | Ch5 multi-leader + CRDT（Yjs / Automerge 即時協作） |
| **離線重連的事件補洞** | Ch11 §11.0「如果你是前端開發者：你已經是 stream consumer」段 |
| **房間 partition + 訊息流** | Ch6 分區 + Ch11 §11.1 partitioned log |
| **訊息持久 + 重播能力** | Ch11 §11.1 Kafka 本質是「分散式 commit log」|

**面試官追問**：
- 「使用者斷網 10 分鐘、重連時怎麼補中間訊息？」 → consumer offset 機制（Ch11）、Firestore 的 watch token 補洞模型不適合（無 offset replay）、要用 message ID + 補洞 API
- 「群組 100 人同時收訊息、怎麼保證順序一致？」 → 同 partition + 同 consumer、Ch9 全序廣播
- 「兩台用戶同時送訊息、伺服器收到順序不一定是發送順序怎麼辦？」 → vector clock 偵測並發 + 應用層處理

::: tip 本土對應練習：Line 已讀 event 流
用 **Line 群組已讀標記**重講一遍——A 在群組發訊息、群組 50 人陸續看訊息、每個人「已讀」要即時推回給 A 的 UI（從「未讀 50」遞減）。你會怎麼設計 event 流？離線使用者上線後怎麼補「我離線這段時間誰已讀」？已讀數字用 CRDT counter 還是中央計數？參考：[Ch11 §11.5 訊息傳遞語意](/part-3/ch11-streams#_11-5-容錯-exactly-once-的真相)。
:::

---

## 4. 設計分散式 KV / 共識服務（etcd / ZK 級別）

| 維度 | 對應 DDIA |
|---|---|
| **Leader election** | Ch9 §9.5 共識（Raft term + vote rule）|
| **Fencing token（防 zombie leader）** | Ch8 §8.5 fencing token + Ch9 Kafka leader_epoch 對應 |
| **Quorum 為何不夠（要 ABD）** | Ch9 §9.1 線性一致 + quorum 反例 |
| **Linearizable 的代價** | Ch9 §9.1 + Ch9 §9.2 CAP |
| **Split-brain 與 STONITH** | Ch5 §5.2 failover + Ch8 §8.5 |
| **共識引擎選型（Raft / Paxos / Spanner / CRDB）** | Ch9 §9.6 + §9.7 選型決策樹 |

**面試官追問**：
- 「為什麼 W+R>N 不保證讀到最新值？」 → Ch9 §9.1 quorum 反例三步驟（W 寫到 2/3 但 ACK 未回 client → B 讀 → C 讀到舊副本）
- 「Raft 的 term 跟 Paxos 的 ballot number 一樣嗎？」 → 概念相同（單調遞增、leader 標記）、細節差異 Raft 強 leader、Paxos 任意 proposer
- 「Spanner 的 TrueTime 是什麼？commit-wait 為何能達成 external consistency？」 → Ch9 §9.6 完整段（含 ε 不是常數、commit-wait ≈ 2ε）

::: tip 本土對應練習：中華電信 HiNet DNS / 政府憑證管理中心（GCA）
台灣本土少見公開的「自建 etcd / ZK 級別」系統、但 **中華電信 HiNet DNS 主從架構**或**政府憑證管理中心（GCA）的根憑證簽發 leader election** 概念相近——少量寫、極高讀、leader 失效時 split-brain 後果嚴重（DNS 雙主會把流量導向錯誤、GCA 雙主會簽出衝突憑證）。你會用 Raft 還是 Paxos？fencing token 怎麼防 zombie leader（被「短暫網路抖動誤判失效、重連後仍以為自己是 leader」的舊節點繼續寫）？參考：[Ch9 §9.5 共識](/part-2/ch09-consistency#_9-5-分散式共識)。
:::

---

## 5. 設計 URL Shortener / 短連結服務

| 維度 | 對應 DDIA |
|---|---|
| **KV 模型 + hash index** | Ch2 + Ch3 §3.2 |
| **熱門連結快取 + cache invalidation** | Ch11 §11.3 物化視圖 + CDC |
| **發號器（生成短碼）：UUID vs Snowflake** | Ch6 hash partitioning + Ch8 物理時鐘 vs 邏輯時鐘 |
| **點擊統計：批次 vs 串流** | Ch10 批次彙整 + Ch11 即時 dashboard |
| **跨 region 一致 vs 最終一致** | Ch5 + Ch9 §9.2 CAP |

**面試官追問**：
- 「短碼用 UUID 還是 Snowflake、為什麼？」 → UUID 隨機（無熱點但長）、Snowflake 時序（短、partition 友善但 worker_id 衝突風險）、Ch8 §8.4 物理時鐘段
- 「100 億條短連結、單機塞不下怎麼分？」 → Ch6 hash partition by short_code、跨 region 寫只一 region 寫主

::: tip 本土對應練習：PicSee / lihi.io 短網址 + 政府 1968 即時路況
台灣有 **PicSee**、**lihi.io** 等本土短網址服務、特性是「點擊統計即時 dashboard」+「廣告聯播追蹤碼」——你會把點擊事件用批次（每小時 ETL）還是串流（Kafka + Kafka Streams 即時 dashboard）處理？跨 region（北美、東南亞使用者）的點擊統計要不要強一致、還是最終一致即可？參考：[Ch11 §11.3 物化視圖](/part-3/ch11-streams#_11-3-串流處理-stream-processing)。
:::

---

## 6. 設計排行榜 / Leaderboard（遊戲 / 電商熱銷）

| 維度 | 對應 DDIA |
|---|---|
| **Redis sorted set vs SQL ORDER BY** | Ch3 §3.5 「Redis 不是跑得快、是能做磁碟難做的資料結構」|
| **即時更新（每筆寫入觸發排名）** | Ch11 物化視圖 + Kafka Streams |
| **跨 region 加總** | Ch5 multi-leader + CRDT（PNCounter 是 CRDT 計數器）|
| **熱點 key（前 100 名一直被讀寫）** | Ch6 §6.3 hot spot mitigation + Redis cluster |

**面試官追問**：
- 「跨 region 玩家、每個 region 有自己的 Redis、怎麼算全球榜？」 → CRDT PNCounter 收斂（Ch9 §9.2 CRDT tip 段）、或定期批次彙整（Ch10）
- 「前 100 名一直被寫、怎麼防 hot key？」 → Ch6 §6.3 加 random prefix 或讀寫分流

::: tip 本土對應練習：台鐵 / 高鐵連假訂票熱點
用**台鐵連假早上 8 點開賣**重講一遍——熱門車次（北上週五晚、南下週日晚）瞬間湧入 50 萬請求搶 800 個座位。怎麼分區（按車次 ID hash？按出發站？）才不會讓「北上週五」這個 partition 變成熱點？要不要做兩階段：先發號排隊、再進真正下單？參考：[Ch6 §6.3 hot spot mitigation](/part-2/ch06-partitioning#_6-3-分區再平衡)。
:::

---

## 7. 設計新聞 / 文章站（內容驅動 + 高讀低寫）

| 維度 | 對應 DDIA |
|---|---|
| **DB → Search index 同步** | Ch11 §11.2 CDC 經典場景 |
| **B-Tree 派 DB（PG / MySQL）夠用** | Ch3 §3.7 選型決策樹 |
| **CDN + cache TTL + cache invalidation** | Ch5 §5.1 「如果你是前端開發者：你已經踩過這章的痛點」|
| **全文搜尋（Elasticsearch / Lucene）** | Ch3 §3.5 倒排索引 |

**面試官追問**：
- 「文章編輯後、搜尋多久能找到？」 → CDC + ES sink、典型 sub-second（Ch11 §11.2 Debezium）
- 「文章首頁排序怎麼存？」 → Materialized View（Ch11 §11.3）、Kafka Streams 物化視圖

::: tip 本土對應練習：中華電信 MOD 帳號變更 / 蘋果日報（已停刊）級流量新聞站
**replication lag 的應用層感知**用 **MOD 帳號變更** 重講——使用者在客服更改方案、客服系統寫入 master、但使用者打開 App 看到的還是舊方案、5 分鐘後才更新。這是 read replica 的 async lag 經典情境、要怎麼設計（session-sticky 把該使用者的讀導回 master？或 UI 顯示「變更約 5 分鐘後生效」？）參考：[Ch5 §5.2 讀你所寫的一致性](/part-2/ch05-replication#_5-2-讀者自己的寫入)。

**內容站讀寫流量**用台灣級新聞站（東森、自由、中央社）重講——文章 99% 是讀、發稿後 30 秒內要進 CDN + 搜尋索引。CDC 從 PG 流到 Elasticsearch 的延遲容忍度、CDN purge 策略（按 URL 主動 invalidate vs TTL 自然過期）怎麼選？參考：[Ch11 §11.2 CDC](/part-3/ch11-streams#_11-2-change-data-capture)。
:::

---

## 8. 設計支付系統 / 對帳

| 維度 | 對應 DDIA |
|---|---|
| **冪等是核心（重送不能重複扣款）** | Ch11 outbox 結尾「冪等寫入的兩種模式」|
| **Saga 補償交易（refund flow）** | Ch9 §9.4 |
| **Outbox pattern（DB ↔ Kafka）** | Ch11 outbox 三種實作 |
| **對帳：批次 reconcile** | Ch10 批次處理（lineage / checkpoint）|
| **跨 region 強一致需求** | Ch9 §9.6 Spanner / CRDB |

**面試官追問**：
- 「使用者點兩次「付款」按鈕怎麼擋？」 → idempotency key（UUID + `INSERT ON CONFLICT DO NOTHING`）
- 「銀行 API 回傳 timeout、不知道扣款成功沒、怎麼辦？」 → 三選一：(a) 查詢 API 對帳、(b) 等下次對帳批次、(c) 設 idempotency key 安全重送
- 「Saga 補償失敗（refund 也失敗）怎麼辦？」 → DLQ + 人工介入、Ch9 §9.4 補償語意有強弱之分

::: tip 本土對應練習：蝦皮夜間對帳 + 金管會 FISC 跨行清算
**單站對帳**用蝦皮重講——每天凌晨 3 點要對帳「金流方回傳的成功扣款」vs「我們訂單系統記的已付款」、找出落差（金流扣了我們沒收到、或我們記了金流沒扣）。用批次 reconcile 還是串流即時對？lineage / checkpoint 怎麼設計才能 replay 某天的對帳？參考：[Ch10 §10.3 批次處理 lineage](/part-3/ch10-batch#_10-3-mapreduce-之外)。

**跨機構清算**用 **FISC 跨行轉帳**重講——A 銀行扣款、B 銀行入帳、中間經財金資訊（FISC）清算所、整個過程要強一致（不能 A 扣了 B 沒入）。你會用 2PC、Saga、還是清算所當中央 ledger？跨機房延遲影響哪一個選擇？參考：[Ch12 §12.4 跨區域強一致](/part-3/ch12-future#_12-4-端到端正確性)。
:::

---

## 章節快查反向索引

如果你在讀某章、想知道它幫你應付哪些面試題：

| 章節 | 對應面試題 |
|---|---|
| **Ch1** | News Feed / Timeline / 任何「QPS 與 P99」題 |
| **Ch3** | URL shortener / Leaderboard 的儲存層、選 PG vs RocksDB vs Redis |
| **Ch5** | 跨 region 寫、CRDT、replication lag 的應用層感知 |
| **Ch6** | 分片策略、hot key、rebalancing |
| **Ch7** | 任何「並發改同一筆」的題（轉帳、扣庫存、優惠券）|
| **Ch8** | 分散式系統的「為什麼這麼難」的所有題（時鐘、網路、process pause）|
| **Ch9** | etcd / ZK 級別 / 跨機房強一致 / Spanner / CRDB |
| **Ch11** | Kafka pipeline / CDC / outbox / EOS / 即時 dashboard |

---

## 配套：面試準備 3 週路徑

對應到 [學習路徑首頁](./) 的「面試準備」路徑：

- **Week 1**：Ch1 / Ch3 / Ch5（負載 + 儲存 + 複製）
- **Week 2**：Ch6 / Ch7 / Ch8（分區 + 交易 + 分散式麻煩）
- **Week 3**：Ch9 / Ch11（共識 + 串流）+ 用本速查表反向自測

每讀完一章、回本速查表找「該章對應的面試題」、自己對著題目講一遍 5 分鐘——**講不出來代表還沒消化**。

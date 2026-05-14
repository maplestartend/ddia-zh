---
title: Ch6 分區
---

<ChapterOpener chapter-id="ch06" />

<ChapterMeta part="Part II 分散式資料" :read-time="40" difficulty="進階" :tags="['Sharding', 'Hot spot', 'Rebalancing']" prereq="Ch5" />

<TLDR :points='[
  "<strong>分區（Partitioning / Sharding）= 把大資料集切成多塊、分散到多節點</strong>：動機是擴展寫入吞吐與儲存容量。",
  "<strong>兩大分區策略</strong>：Key Range（按 key 範圍切，BigTable）vs Hash of Key（按 hash 切，Cassandra / Dynamo）。前者支援範圍查詢但易熱點、後者均勻但破壞順序。",
  "<strong>熱點（Hot spot）是最大殺手</strong>：Bieber 效應 —— 某個 key 暴紅導致單一分區崩潰。對策是加隨機 prefix、應用層 split。",
  "<strong>二級索引兩種實作</strong>：document-partitioned（每分區自己索引，寫便宜讀貴）vs term-partitioned（全域索引，讀便宜寫貴）。",
  "<strong>Rebalancing 三策略</strong>：fixed number of partitions（最簡單、推薦）、dynamic、proportional to nodes。請求路由由 ZooKeeper 或 gossip 解決。"
]' />

## 6.1 分區與複製

通常**同時**做分區（橫向切）與複製（每塊多份）：
```
Partition 1: [Leader on N1] [Follower on N2]
Partition 2: [Leader on N2] [Follower on N3]
Partition 3: [Leader on N3] [Follower on N1]
```

---

## 6.2 KV 資料的分區策略

### 1. Key Range 分區
按 key 的字典序切（A-F, G-M, N-S, T-Z）。
- ✓ 範圍查詢友善（`SELECT * WHERE date BETWEEN ...`）
- ✗ 易熱點（按時間戳分區 → 寫入永遠打到最新分區）

### 2. Hash of Key 分區
`partition = hash(key) mod N`
- ✓ 均勻分布
- ✗ 範圍查詢要打**所有**分區
- ✗ N 變動時大量資料要搬（→ **一致性雜湊** 改善）

### 3. 折衷：複合主鍵
`(user_id, timestamp)`：按 user_id 雜湊分區，timestamp 在分區內排序 → 兼顧均勻 + 單一使用者範圍查詢。

---

## 6.3 熱點問題

即使用 hash 分區，若 80% 流量都壓在一個 key（例如 Justin Bieber 的推文），單一分區還是會爆。

**對策**：
- 應用層加隨機前綴：`bieber_001`, `bieber_002`...（讀時要併 N 次查詢，貴）
- 動態 split：偵測熱 key 主動拆出去

::: tip 本土場景：台鐵 / 高鐵訂票分區
**台鐵連假訂票尖峰**是經典的 partition hot spot 場景：
- **按出發站分區（key range）**：台北、台中、高雄三大站佔 70%+ 訂單 → 這幾個分區 CPU 爆滿、其他分區（瑞芳、苗栗）閒置
- **按車次 ID hash 分區**：負載均勻、但「查所有班次」變成跨分區廣播查詢
- **按日期分區**：連假當天那一片爆炸（hot spot in time）、平日分區完全沒流量

實際解法是混合策略 + 動態擴容：尖峰前把熱門出發站的分區再切細（或加 secondary index）、平日合併回來。**這就是 Ch6 §6.3 動態分區（dynamic partitioning）在解的問題**——DynamoDB / Cassandra 都用類似機制。

如果你只能記一件事：**沒有完美的分區鍵、只有「對你的查詢負載最少撞牆」的分區鍵**。
:::

---

## 6.4 二級索引的分區

主鍵分區好處理；**二級索引**才是難題。

### Document-Partitioned（Local Index）
每個分區維護自己分區內的索引。
- 寫：本地索引更新即可 → **便宜**
- 讀：要 scatter-gather（查所有分區再聚合）→ **貴**
- 例：Elasticsearch、MongoDB

### Term-Partitioned（Global Index）
索引本身也按 term 分區，跨節點維護全域索引。
- 寫：要更新可能在其他節點的索引 → **昂貴**（常需非同步）
- 讀：直接查索引分區 → **便宜**
- 例：DynamoDB Global Secondary Index

### 兩種次級索引的一致性權衡

DDIA 在這節埋的關鍵 caveat（讀者最易漏）：**全域索引的更新通常是非同步的**——主資料寫入成功 → **索引更新晚一拍** → 讀者用索引查可能讀到**舊 state**（甚至查不到剛寫入的列）。

| 一致性面向 | Document-partitioned（local） | Term-partitioned（global） |
|---|---|---|
| **同分區內** | 主資料 + local index 在**同一個寫入交易**裡 → 一致 | N/A |
| **跨分區** | scatter-gather 讀時各分區內各自一致 → 整體呈現一致 | 索引可能落後主資料數十毫秒到秒級（async update） |
| **讀寫競態** | 寫成功立刻 query → 自己分區能讀到（強一致） | 寫成功立刻 query → 索引可能還沒更新（讀不到剛寫的）|
| **要做強一致全域索引** | N/A | 需 2PC 或同步 quorum write → 寫延遲極高，DynamoDB / Cassandra 都選擇放棄 |

::: warning DynamoDB GSI 的 eventual consistency 陷阱
DynamoDB 的 Global Secondary Index 預設**最終一致**——寫入 base table 成功後，GSI 可能延遲 ~100ms 到數秒才更新。實務踩坑：
1. 表單送出 → API 寫 user 成功 → 立刻 redirect 到「user 列表（用 GSI 查）」→ 看不到剛建的 user
2. 解法：**強制查 base table**（用 primary key）、或在 client 端 optimistic update

LSI（Local Secondary Index）能強一致但限制多（partition key 必須相同）。**設計時要把這個非同步當前提、不要事後補救**。
:::

---

## 6.5 Rebalancing 策略

當節點加入/移除，資料如何重新分配？

### 1. Hash mod N（千萬不要）
N 變了，所有資料都要重新計算位置 → 災難。

### 2. Fixed number of partitions
建立時就決定 10,000 個分區，每個節點分到一些。加節點 → 從每個節點偷幾個分區過去。
- ✓ 簡單可預測
- ✗ 分區數要預估好（太多 = 額外 overhead，太少 = 將來無法擴展）
- 例：Riak、ElasticSearch

### 3. Dynamic Partitioning
分區太大就 split，太小就 merge。BigTable / HBase 的做法。

### 4. Proportional to Nodes（**注意 Cassandra 不是這類**）
分區數 = 節點數 × 固定倍數——意指「**節點加入時自動拆出新分區**」的設計。原書範例是 **Couchbase**：節點數從 4 加到 5、總分區數同步從 4×N 變 5×N。

::: warning Cassandra vnodes 不是「proportional to nodes」
讀者常把 Cassandra 歸這類、其實**錯了**。Cassandra 用 **fixed vnodes per node**（每個實體節點預先配給固定數量 token、預設 256 個 vnode）——加節點時是「**從現有節點偷一部分 vnode 過來**」、總分區數**並不隨節點數線性增加**。

從分類角度：Cassandra 比較接近 **fixed number of partitions**（只是分區單位 = vnode、不是固定整數）+ consistent hashing。**這個誤分類在中英文教材中非常普遍、DDIA 原書第 3 印才修正措辭**。
:::

### 一致性雜湊（Consistent Hashing）
節點和 key 都映射到雜湊環上，每個 key 由「順時針第一個節點」負責。加減節點只影響相鄰節點。

Karger 1997 原始版本有負載不均問題（key 分布看運氣）、實務系統一律加 **virtual nodes / vnodes**：每個實體節點對應雜湊環上**多個虛擬點**（Cassandra 預設 256、Dynamo 數十、Riak 64）→ 拉平負載 + 加減節點時影響更分散。

代表系統：Dynamo、Cassandra、ScyllaDB、Discord 後端、CDN edge routing、memcached client、L7 load balancer。範圍查詢友善度差是它的真實限制（hash 後 key 順序被打亂）。

---

## 6.6 請求路由

Client 怎麼知道某 key 該打哪個節點？這個看似小問題、決定整個 cluster 的**運維複雜度**與**failure mode**：

### 三種模型對照

| 模型 | 怎麼運作 | 代表系統 | 路由表更新傳播 | Failure mode |
|---|---|---|---|---|
| **1. 任意節點接收、內部轉發** | Client 隨便打哪台、節點收到後自己決定要不要轉給對的 owner | Cassandra、ScyllaDB | **Gossip protocol**（節點間互傳成員狀態，最終一致） | 路由短暫過時 → 多一跳轉發、極端 case 轉錯後 client retry |
| **2. 獨立路由層** | 前面架一層 router / coordinator、它知道 ownership map | MongoDB（mongos）、Kafka（Controller）、Vitess、HBase（HMaster） | Router 監看**外部 coordinator**（ZooKeeper / etcd）變化 | Coordinator 失聯時 router 用舊 map；新增分區需 coordinator |
| **3. Client 自己查 metadata** | Client library 啟動時拿一份路由表、之後直接打對的節點 | DynamoDB SDK、Riak、新版 Cassandra Java driver | Client **訂閱 metadata change**（push）或定期 poll | Client 端 cache 過時 → 打錯節點 → 收到 redirect 後更新 |

### 三種模型背後的取捨

- **模型 1**：運維最簡單（沒有 router 也沒有 ZooKeeper 依賴）、代價是節點負擔 gossip 流量、極大叢集 gossip 收斂變慢
- **模型 2**：路由邏輯集中、易監控與升級、代價是 router 是新的 single point of failure（需自己做 HA）
- **模型 3**：路徑最短（無中介轉發）、效能最佳、代價是 client library 變胖、版本升級擴散到所有 service

::: tip ZooKeeper 在分散式系統中的角色
模型 2 的標配。它不存業務資料、專門維護**少量**元資料 + 提供強一致的觀察介面：節點清單、分區歸屬、leader 選舉、設定變更。**Kafka 2.8+ 推出 KRaft 模式**（用 Raft 取代 ZooKeeper），是「**少一個依賴**」的趨勢一部分——但 ZooKeeper 仍是 HBase、Solr、Druid、Pinot、傳統 Hadoop 生態的底座。
:::

---

## 章末練習

::: tip 思考題
1. 用 Python 實作一個一致性雜湊環，加入 / 移除節點時印出受影響的 key。
2. 比較「hash mod N」與「fixed 1000 partitions」在加一個節點時的資料遷移量。
3. 設計一個寫熱點偵測機制：怎麼識別「Bieber key」並動態 split？
:::

<Quiz chapter-id="ch06" :questions='[
  {
    difficulty: "applied",
    question: "為什麼「Hash mod N」是糟糕的分區策略？",
    options: [
      "雜湊函式太慢",
      "節點數 N 變動時，幾乎所有 key 的歸屬都改變，重平衡代價極大",
      "Hash 衝突太頻繁",
      "無法跨資料中心"
    ],
    answer: 1,
    explanation: "若 N 從 10 變 11，hash(key) mod 10 與 hash(key) mod 11 的結果對大部分 key 不同，導致大規模資料遷移。fixed partitions 與一致性雜湊都是為了避開這個問題。"
  },
  {
    difficulty: "applied",
    question: "Term-partitioned secondary index 的最大缺點是？",
    options: [
      "查詢慢",
      "寫入時需要更新可能在其他節點的索引分區，寫入成本高且常需非同步處理",
      "不支援範圍查詢",
      "佔太多記憶體"
    ],
    answer: 1,
    explanation: "全域索引讓讀變便宜（直接查），但寫一筆資料可能要更新多個跨節點的索引項。許多系統採非同步更新，因此索引可能短暫不一致。"
  },
  {
    difficulty: "applied",
    question: "「按時間戳做 key-range 分區」最容易產生什麼問題？",
    options: [
      "查詢效能太好",
      "新資料永遠寫入同一個分區，造成寫入熱點",
      "舊資料被自動刪除",
      "需要太多記憶體"
    ],
    answer: 1,
    explanation: "時間戳是單調遞增的，永遠寫入「最新」那個分區。其他分區只有舊資料的零星更新。對策：複合 key（先 hash user_id，再 timestamp）。"
  },
  {
    difficulty: "interview",
    question: "你用 DynamoDB 寫一筆 user 到 base table、立刻 query GSI 想查剛建的 user——結果查不到。最可能的原因是？",
    options: [
      "GSI 索引設定錯誤",
      "DynamoDB 預設 GSI 是 eventually consistent——base table 寫入成功不保證 GSI 同時更新，需數十毫秒到秒級延遲",
      "需要 DynamoDB Stream 才能看到新資料",
      "base table 寫入失敗、只是沒回報錯誤"
    ],
    answer: 1,
    explanation: "Global Secondary Index 的本質是 term-partitioned index——索引項可能在**另一個分區/節點**上，DynamoDB 為了寫入效能選擇**非同步更新 GSI**（也是 Cassandra global index、Elasticsearch refresh 都做的事）。讀剛寫入的資料時要**直接查 base table**（用 primary key、是 local index 的強一致路徑），或在 client 端做 optimistic update。這是 DDIA Ch6 §6.3 埋的關鍵 caveat、實務踩坑率極高。"
  },
  {
    difficulty: "interview",
    question: "下列哪個敘述「最精確」描述 Cassandra 的分區/rebalancing 策略？",
    options: [
      "Proportional to nodes——分區總數隨節點數線性成長",
      "Fixed vnodes per node + consistent hashing——每節點固定 token 數（預設 256 vnodes），加節點時從現有節點偷 vnode 過來",
      "Dynamic partitioning——分區太大會自動 split，類似 HBase",
      "Hash mod N——靠 partition key 雜湊後對節點數取餘數"
    ],
    answer: 1,
    explanation: "Cassandra 是 **fixed vnodes per node + consistent hashing on token ring**：每節點預設 256 個 vnode（也可手動配 token）、key 用 partitioner（Murmur3、預設）映射到 token ring 上、由「順時針第一個 vnode owner」負責。加節點時新節點認領 token、現有節點把對應 vnode 的資料移過去、總分區數**並不隨節點數線性增加**。選項 A 是普遍誤解（中英文教材都常錯）、選項 C 是 HBase 風格、選項 D 是「絕對不能用」的策略。"
  }
]' />

<ChapterNote chapter-id="ch06" />

<Progress chapter-id="ch06" />

<NextChapterBridge chapter-id="ch06" />

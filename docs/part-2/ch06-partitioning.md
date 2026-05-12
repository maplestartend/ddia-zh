---
title: Ch6 分區
---

# Ch6 · 分區 Partitioning

<ChapterMeta part="Part II 分散式資料" :read-time="40" difficulty="進階" :tags="['Sharding', 'Hot spot', 'Rebalancing']" prereq="Ch5" />

<TLDR :points='[
  "<strong>分區（Partitioning / Sharding）= 把大資料集切成多塊，分散到多個節點</strong>。動機是擴展寫入吞吐與儲存容量。",
  "<strong>兩大分區策略</strong>：Key Range（按 key 範圍切，BigTable）vs Hash of Key（按 hash 切，Cassandra/Dynamo）。前者支援範圍查詢但易熱點，後者均勻但破壞順序。",
  "<strong>熱點 (Hot spot) 是最大殺手</strong>：Bieber 效應 —— 某個 key 暴紅導致單一分區崩潰。對策：加隨機 prefix、應用層 split。",
  "<strong>二級索引兩種實作</strong>：document-partitioned（每分區自己索引，寫便宜讀貴）vs term-partitioned（全域索引，讀便宜寫貴）。",
  "<strong>Rebalancing 三策略</strong>：fixed number of partitions（最簡單推薦）、dynamic、proportional to nodes。請求路由由 ZooKeeper 或 gossip 解決。"
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

### 4. Proportional to Nodes
分區數 = 節點數 × 固定倍數。Cassandra 預設。

### 一致性雜湊（Consistent Hashing）
節點和 key 都映射到雜湊環上，每個 key 由「順時針第一個節點」負責。加減節點只影響相鄰節點。

Karger 原始版本確實有負載不均勻的問題，但加上 **virtual nodes**（每個實體節點對應雜湊環上多個虛擬點）後，至今仍是 Dynamo、Cassandra、ScyllaDB、Discord 後端、CDN、memcached client、L7 load balancer 等大量系統的基礎方案。範圍查詢友善度差是它真正的限制。

---

## 6.6 請求路由

Client 怎麼知道某 key 該打哪個節點？

1. **任意節點接收，內部轉發**（Cassandra）
2. **路由層（routing tier）**（很多 DB 用 ZooKeeper 維護映射）
3. **Client 自己查 metadata**

::: tip ZooKeeper 在分散式系統中的角色
不存業務資料，專門維護**少量**元資料 + 提供強一致的觀察介面：節點清單、分區歸屬、leader 選舉、設定變更。
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
    question: "為什麼「Hash mod N」是糟糕的分區策略？",
    options: [
      "雜湊函式太慢",
      "節點數 N 變動時，幾乎所有 key 的歸屬都改變，重平衡代價極大",
      "Hash 衝突太頻繁",
      "無法跨資料中心"
    ],
    answer: 1,
    explanation: "若 N 從 10 變 11，hash(key) mod 10 與 hash(key) mod 11 的結果對大部分 key 不同，導致大規模資料搬遷。fixed partitions 與一致性雜湊都是為了避開這個問題。"
  },
  {
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
    question: "「按時間戳做 key-range 分區」最容易產生什麼問題？",
    options: [
      "查詢效能太好",
      "新資料永遠寫入同一個分區，造成寫入熱點",
      "舊資料被自動刪除",
      "需要太多記憶體"
    ],
    answer: 1,
    explanation: "時間戳是單調遞增的，永遠寫入「最新」那個分區。其他分區只有舊資料的零星更新。對策：複合 key（先 hash user_id，再 timestamp）。"
  }
]' />

<ChapterNote chapter-id="ch06" />

<Progress chapter-id="ch06" />

<NextChapterBridge next-link="/part-2/ch07-transactions" next-title="Ch7 交易 Transactions">
資料一旦跨多列、跨多表、跨多節點，就會碰到「一個操作失敗如何回滾」「並發讀寫如何互不干擾」的問題。Ch7 講<strong>單機交易</strong>的隔離級別與並發異常（Read Committed / Snapshot Isolation / Serializable），這是後續理解分散式交易（Ch9）的必經之路。
</NextChapterBridge>

---
title: 0.6 資料結構地基
description: Hash table、B-Tree、外部排序、Big-O —— Ch3 直接會用到
---

# 0.6 · 資料結構地基

<ChapterMeta part="Part 0 前置知識" :read-time="25" difficulty="入門" :tags="['B-Tree', 'Hash', 'Big-O']" />

<TLDR :points='[
  "<strong><G term=\"big-o\">Big-O</G> 給上界，不給常數</strong>。O(log n) 通常比 O(n) 好，但 n 小時常數可以反轉勝負——這是為什麼小資料量用陣列線性搜尋反而比 hash table 快。",
  "<strong><G term=\"hash-table\">Hash table</G></strong>：O(1) 平均存取，靠雜湊函式把 key 映射到桶。記憶體內 KV 的基礎—— Redis、Memcached、磁碟上的 Bitcask。",
  "<strong><G term=\"b-tree\">B-Tree</G></strong>：n 路平衡樹，每個節點是磁碟頁大小。寫入要原地更新（要 <G term=\"wal\">WAL</G> 保 crash recovery），讀快。傳統關聯式 DB 的索引結構。",
  "<strong>外部排序</strong>（external sort）：資料大於 RAM 時，分段排序 + 合併。MapReduce 的 shuffle、SSTable 的合併、Spark sort-merge join 全都用這個。",
  "Ch3 整章在比較 B-Tree vs <G term=\"lsm-tree\">LSM-Tree</G> 的儲存引擎—— 沒有這章的基礎會卡。"
]' />

::: warning 這章是骨架
完整深入請走 CLRS（演算法經典書）第 6, 11, 18 章，或 [VisuAlgo](https://visualgo.net/en/bst) 的互動式視覺化。
:::

## 1) <G term="big-o">Big-O</G> 的直覺

描述「輸入 n 變大時，時間/空間如何成長」的上界。

| Big-O | 名稱 | n=10 | n=1000 | n=10⁶ | 典型例子 |
|---|---|---|---|---|---|
| O(1) | 常數 | 1 | 1 | 1 | Hash table 查 |
| O(log n) | 對數 | 3 | 10 | 20 | B-Tree 查 |
| O(n) | 線性 | 10 | 1000 | 10⁶ | 陣列線性搜尋 |
| O(n log n) | 線性對數 | 30 | 10⁴ | 2×10⁷ | 排序 |
| O(n²) | 平方 | 100 | 10⁶ | 10¹² | 巢狀循環 |

::: tip Big-O 不是常數
O(1) 的 hash table 查可能比 O(log n) 的 B-Tree 查**慢**——如果常數因子大、或 cache miss 多。實務上要看 benchmark，不能只看漸進複雜度。
:::

## 2) <G term="hash-table">Hash Table</G>：O(1) 的代價

### 核心想法

```
key  ── hash function ──▶ bucket index
"alice"             ──▶  bucket 7
"bob"               ──▶  bucket 3
"carol"             ──▶  bucket 7   ← 衝突！
```

衝突處理：chaining（同 bucket 接 linked list）或 open addressing（往下一個空 bucket 找）。

### 為什麼磁碟上不常用純 hash index

- Hash 結構**沒有順序**——範圍查詢 `WHERE age BETWEEN 20 AND 30` 必須掃整張表
- 衝突太多時退化成 O(n)
- 不適合 cache（隨機 bucket 跳）

但**記憶體內**完美：Redis、Memcached 核心、Bitcask 磁碟 KV 都用 hash。

## 3) <G term="b-tree">B-Tree</G>：n 路平衡樹

```
                  [10 | 20]
                 /    |    \
             [3,7] [12,15] [25,30]
```

### 為什麼是 n 路而不是 2 路

磁碟讀取是「以 page 為單位」（典型 4KB / 16KB）。一次讀進來上百個 key——所以節點分支因子 = 一頁能塞的 key 數，通常 100–1000 路。

樹高 = log₁₀₀(n)：10 億筆資料樹高 ~5。**讀一筆 = 5 次磁碟 I/O**。

### 原地更新的代價

UPDATE 直接改頁、寫回磁碟——但寫到一半斷電會留下半壞的頁。所以需要 **WAL**：先寫 log，crash 後 replay。

::: tip Ch3 的主軸
B-Tree（原地更新、隨機寫）vs LSM-Tree（追加寫、批次合併）——這是 DDIA Ch3 整章的對比。寫密集場景 LSM 勝、讀密集場景 B-Tree 勝。
:::

## 4) 外部排序：資料 > RAM 時的排序

```
場景：10TB 資料要排序，RAM 64GB

Step 1: 把資料切成 64GB 片段
Step 2: 每片段在 RAM 內快速排序，寫回磁碟成「已排序檔」
Step 3: 多路合併—— 每個檔讀一個元素到 RAM、選最小、寫出、讀下一個

最終得到一個全域排序的大檔。
```

這是 MapReduce shuffle、LSM-Tree compaction、Spark sort-merge join 的共同骨架。**理解外部排序 = 理解大數據處理的核心機制**。

## 5) 與 DDIA 章節的對應

| DDIA 章節 | 用到的資料結構 |
|---|---|
| Ch3 儲存引擎 | Hash table、B-Tree、LSM-Tree、Bloom filter、SSTable |
| Ch6 分區 | Consistent hashing |
| Ch10 批次處理 | 外部排序（MapReduce shuffle）、sort-merge join |
| Ch11 串流 | Log-structured storage、hash join in streaming |

---

## 想更深入？

| 資源 | 內容 |
|---|---|
| [CLRS 第 6, 11, 18 章](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/) | 演算法經典—— 排序、hash、B-Tree |
| [VisuAlgo B-Tree](https://visualgo.net/en/bst) | 互動式 B-Tree 視覺化 |
| [Database Internals by Alex Petrov](https://www.databass.dev/) | DB 內部資料結構深入 |
| [The Log-Structured Merge-Tree (O\'Neil 1996)](https://www.cs.umb.edu/~poneil/lsmtree.pdf) | LSM 原始論文 |

---

## 章末自評

<Quiz chapter-id="p0-ds" :questions='[
  {
    "difficulty": "applied",
    "question": "為什麼磁碟上的索引很少用純 hash table、而傾向用 B-Tree？",
    "options": [
      "Hash table 太老",
      "Hash table 沒有順序，無法支援範圍查詢；且隨機 bucket 跳對磁碟 cache 不友善",
      "Hash table 衝突解決太複雜",
      "B-Tree 寫入比較快"
    ],
    "answer": 1,
    "explanation": "DDIA Ch3 的論點：Hash 在記憶體完美，但磁碟上的 KV 通常要支援「給我 key 在 X 和 Y 之間的所有列」—— Hash 必須掃全表，B-Tree 直接走葉節點鏈。加上磁碟讀以 page 為單位，B-Tree 的「一次讀進一整頁多個 key」剛好對齊。"
  },
  {
    "difficulty": "applied",
    "question": "你要排序 1TB 的資料，但只有 32GB RAM。下列哪個策略可行？",
    "options": [
      "不可能—— RAM 不夠就無法排序",
      "外部排序：分段 in-memory sort 寫回磁碟、再多路合併",
      "把資料壓縮到 32GB 以下",
      "用 hash table 取代排序"
    ],
    "answer": 1,
    "explanation": "外部排序就是為了「資料 > RAM」設計的。MapReduce shuffle、LSM compaction、Spark sort-merge join 全部用這個骨架。DDIA Ch10 用一整節在拆解外部排序的細節。"
  },
  {
    "difficulty": "applied",
    "question": "B-Tree 與 LSM-Tree 的根本差異是？",
    "options": [
      "B-Tree 比較老、LSM 比較新",
      "B-Tree 原地更新（隨機寫）；LSM 追加寫 + 背景合併（順序寫）—— 真正優勢是「順序寫吞吐量高」，寫放大誰高誰低**依 compaction 策略而定**（leveled LSM 反而可能更高）",
      "B-Tree 用於 OLTP、LSM 用於 OLAP",
      "B-Tree 寫入快、LSM 讀取快"
    ],
    "answer": 1,
    "explanation": "DDIA Ch3 整章在拆這個。LSM 真正的優勢是**順序寫**（B-Tree 是隨機原地更新），但「寫放大 LSM 比較低」是過度簡化—— B-Tree 約 3-10×（含 InnoDB doublewrite buffer）、leveled LSM 實測 10-30×。寫密集（Cassandra、RocksDB）用 LSM 是看上順序寫吞吐，不是寫放大。讀密集且 ACID 用 B-Tree。"
  }
]' />

<NextChapterBridge next-link="/part-0/concurrency" next-title="0.7 並行控制直覺">
資料結構之後，最後一個前置主題：並行—— 兩個執行緒同時改一筆資料會發生什麼事，是 Ch7 與 Ch9 整章的前提。
</NextChapterBridge>

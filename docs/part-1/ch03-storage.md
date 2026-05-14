---
title: Ch3 儲存與檢索
---

<ChapterOpener chapter-id="ch03" />

<ChapterMeta part="Part I 資料系統基礎" :read-time="45" difficulty="中等" :tags="['LSM-Tree', 'B-Tree', 'OLAP']" prereq="Ch2" />

<TLDR :points='[
  "<strong>儲存引擎兩大家族</strong>：log-structured（LSM-Tree，如 LevelDB / RocksDB / Cassandra）vs page-oriented（B-Tree，如 PostgreSQL / MySQL / SQLite）。",
  "<strong>LSM-Tree 寫快讀慢</strong>：寫入只追加、背景做 compaction（合併壓實 — 把多層 SSTable 合併去重、回收空間）；讀取可能要查多層 SSTable。B-Tree 反之 —— 原地更新、讀取快。",
  "<strong>Write amplification 與 Read amplification</strong>：兩種引擎在這兩個維度做不同權衡。SSD 上 LSM 的優勢更明顯（避免隨機寫）。",
  "<strong>OLTP vs OLAP 走向不同儲存格式</strong>：OLTP 用列式（row-oriented）、OLAP 用欄式（column-oriented）；欄式可達 10x 量級壓縮 + 向量化執行。",
  "<strong>索引是讀寫之間的權衡</strong>：每加一個索引都讓寫變慢、佔更多空間，但讓特定查詢變快。沒有「萬能索引」。"
]' />

## 3.1 最簡單的資料庫

兩個 bash 函式就能做出一個 KV store：
```bash
db_set() { echo "$1,$2" >> database; }
db_get() { grep "^$1," database | sed -e "s/^$1,//" | tail -n 1; }
```
- 寫：O(1) append → **極快**
- 讀：O(N) 全檔掃描 → **極慢**

加上**索引**就能加速讀取，但代價是寫入變慢、佔額外空間。

---

## 3.2 Hash Index

把 key → 檔案 offset 存在記憶體 hash table（Bitcask 的設計）。

| 優點 | 缺點 |
|---|---|
| 讀寫都 O(1) | 索引必須完整放進 RAM |
| 實作極簡單 | 範圍查詢困難 |

解決日誌無限長：分段（segment）+ compaction（合併重複 key）。

---

## 3.3 <G term="sstable">SSTable</G> & <G term="lsm-tree">LSM-Tree</G>

**<G term="sstable">SSTable（Sorted String Table）</G>**：segment 內按 key 排序的檔案。

優勢：
1. Merge 多個 SSTable 像 merge sort，O(N)
2. 索引可稀疏（每幾 KB 一個 entry）
3. 區塊可壓縮

**LSM-Tree** 流程：
```
寫入 → memtable（記憶體表 — 寫入先進的 RAM 結構、滿了再 flush 為 SSTable，多用紅黑樹或 skiplist）
   ↓ flush（滿時）
SSTable L0 → L1 → L2 → ...（背景 compaction）
```
- **寫入**：只寫 memtable + <G term="wal">WAL（Write-Ahead Log，預寫日誌——先寫日誌再改資料，crash 時可重放）</G>，極快
- **讀取**：查 memtable → L0 → L1 → ... → 用 <G term="bloom-filter">Bloom filter</G> 快速跳過不存在的層

::: tip 用到的兩個資料結構
- **紅黑樹**：一種自平衡的二元搜尋樹，這裡就當作「一個排好序的記憶體結構」即可——重點是 O(log n) 插入與範圍掃描。
- **Bloom filter**：一種**機率資料結構**，能高效回答「key **絕對不在**這個集合裡」（無 false negative），但「在」會有少量誤報（false positive）。LSM-Tree 每層配一個 Bloom filter，讀取時若 filter 說「不在」就直接跳過該層、不用真的去翻 SSTable。
:::

::: tip 如果你是前端開發者：你瀏覽器裡也有一個儲存引擎
**IndexedDB** 是你瀏覽器內建的 KV + 索引資料庫，PWA / Dexie.js / RxDB 都建立在它上面。**對外暴露的是 B-Tree 風味的 ordered index 語意**（key 有序、`IDBKeyRange` 走有序遍歷），但**底層實作各家瀏覽器不同**：

| 瀏覽器 | IndexedDB 底層 | 派別 |
|---|---|---|
| **Chrome / Edge** | LevelDB | **LSM-Tree 派**（與 RocksDB 同源）|
| **Firefox** | SQLite | B-Tree 派 |
| **Safari** | 客製 KV（早期 SQLite） | 視版本而定 |

也就是說：**規範看起來像 B-Tree，但 Chromium 系列下其實是 LSM**。對應到本章：

| IndexedDB 行為 | 對應本章哪個概念 |
|---|---|
| `objectStore` 的 keyPath → 自動有序 primary index | primary index（B-Tree 或 LSM 視瀏覽器）|
| `createIndex(name, keyPath)` 加欄位索引 | 次級索引（secondary index） |
| 跨多欄位查要先 `createIndex(['a','b'])` | **composite index 預建**（與 Firestore 同樣的痛點） |
| Dexie `.filter(fn)` 在 callback 端走 JS、不能被索引利用 | partial scan（前段 `.where` 已收斂候選集、`.filter` 在那基礎上線性掃）|

看完本章你會理解：**Dexie 為什麼 `.where('a').equals(1).filter(x => x.b > 5)` 慢** —— `.filter` 是 JS 層、`.b` 沒 index、要靠 IndexedDB cursor 一筆筆拉出來再過濾。要快就 `db.version().stores({ items: '++id, a, b, [a+b]' })` **預建 composite index**（且**順序很重要**：`[a+b]` 不能用來查「只給 b」，跟 PG 多欄位索引同樣道理）。
:::

---

## 3.4 <G term="b-tree">B-Tree</G>

主宰關聯型 DB 數十年。資料分頁（page，通常 4KB），樹狀組織。

```
       [10|20|30]
      /    |    \
   [3,7] [11,15] [25,28,29]
```

- 查找：log_B(N)
- 寫入：原地更新（in-place update）→ 需 **WAL** 保證 crash 安全
- 葉節點分裂 / 合併：頁面操作需小心並發

### 設計動機：為什麼 LSM 用「順序寫」?

讀者讀到這通常會卡：「順序寫 vs 隨機寫」差很多嗎？答案是 **差很多，特別在 SSD 上**。

**SSD 的物理限制**：
- 一個 **page**（通常 4–16 KB）寫滿後不能直接覆蓋，要先 erase
- erase 的最小單位是 **block**（通常 128 KB ~ 數 MB），包含很多 page
- 改一個 page = 「read 整個 block → erase block → 重寫所有 pages 回去」

```
B-Tree 改一筆 row（隨機寫）：
  → 改一個 4KB page
  → 觸發整個 block 的 read-erase-write 循環
  → 「寫放大」由 SSD 韌體層產生（讀者看不到，但 SSD 壽命被吃）

LSM 寫入（順序寫）：
  → append 到 memtable
  → 滿了 flush 整批寫一個新 SSTable 檔（連續 pages）
  → SSD 順序寫，幾乎不觸發 erase 浪費
```

這就是為什麼 **RocksDB / Cassandra / ScyllaDB**（寫密集場景）幾乎都選 LSM。讀慢的代價可以靠 Bloom filter + block cache + compaction 策略攤平。

---

### B-Tree vs LSM-Tree 對比

| 維度 | B-Tree | LSM-Tree |
|---|---|---|
| 寫入速度 | 中（每次寫 1–2 page） | 快（只追加，順序寫） |
| 讀取速度 | 快（一次找到） | 中（多層查找） |
| 空間 | 有碎片 | compaction 期間 ~2× |
| Write amplification | **2–3×**：每次改幾 byte 仍要寫整個 page + WAL（InnoDB doublewrite buffer 額外 +1× 左右、MySQL 8.0 後並行 doublewrite 已有優化；典型總計 ~3–5×） | **2–5×（size-tiered）/ 10–30×（leveled）**：視 compaction 策略而定（size-tiered WA 低但 SA / RA 較高、leveled WA 高但讀寫與空間平衡） |
| 範圍查詢 | 快 | 快（key 已排序） |
| 適用 | 讀多寫少 | 寫多讀少、SSD |

::: warning 寫放大別只看 LSM
讀者常以為「LSM 寫快 = 寫放大低」，這是錯的。**LSM 的寫放大反而可能更高**（compaction 一輪要把舊資料重寫到新層）。LSM 真正的優勢是「順序寫」對 SSD/HDD 都遠快於 B-Tree 的隨機原地更新；而高寫放大會吃 SSD 壽命。
:::

---

## 3.5 其他索引結構

- **次級索引（Secondary Index）**：值可重複，常見實作是 key → list of primary keys
- **Clustered Index vs Heap File**：把資料直接放在索引葉節點 vs 只放指標
- **Multi-column Index**：複合索引、地理空間（R-Tree）
- **全文索引**：倒排索引（inverted index），Lucene/Elasticsearch
- **記憶體 DB**：Redis、Memcached —— 不是因為「跑得快」（OS page cache 已經很好用），而是因為可以實現磁碟上難做的資料結構（如 sorted set）

<SectionDivider icon="compare_arrows" label="兩種世界" />

## 3.6 OLTP vs OLAP

| 特徵 | OLTP | OLAP |
|---|---|---|
| 模式 | 每次少量列、隨機讀寫 | 每次百萬列、大量聚合 |
| 使用者 | 線上應用 | 分析師、BI |
| 資料量 | GB ~ TB | TB ~ PB |
| 範例 | MySQL、PostgreSQL | Redshift、BigQuery、Snowflake |

### 欄式儲存（Column-Oriented）

OLTP 把同一列的所有欄位存在一起（row-oriented）：
```
[Alice|25|Taipei] [Bob|30|Tokyo] [Carol|35|NYC]
```

OLAP 把同一欄的所有值存在一起（column-oriented）：
```
name: [Alice, Bob, Carol]
age:  [25, 30, 35]
city: [Taipei, Tokyo, NYC]
```

**為什麼快**：
1. 查詢只讀需要的欄（節省 I/O）
2. 同類型資料壓縮率高（age 欄全是小整數 → 典型可達 **10× 以上**，重複度高時更多）
3. 向量化執行（SIMD）+ CPU cache 友善

---

## 3.7 儲存引擎選型決策樹

把整章的取捨壓成一張決策圖，實際做工程選型時可照走：

<DecisionTree caption="儲存引擎選型決策樹（Ch3 §3.1-3.6 整章壓縮）" :root='{
  q: "讀寫比例？",
  branches: [
    {
      label: "讀遠多於寫",
      child: {
        kind: "leaf",
        tone: "safe",
        text: "B-Tree 派 — PG / MySQL / SQLite，多數 web app 預設適用"
      }
    },
    {
      label: "寫遠多於讀",
      child: {
        q: "需要範圍查詢？",
        branches: [
          {
            label: "是 / 純 KV",
            child: {
              kind: "leaf",
              tone: "neutral",
              text: "LSM 派 — RocksDB / Cassandra / ScyllaDB（寫密集 / 大量 ingest / 時序 IoT）"
            }
          },
          {
            label: "純點查",
            child: {
              q: "需要持久化？",
              branches: [
                {
                  label: "全在記憶體",
                  child: {
                    kind: "leaf",
                    tone: "neutral",
                    text: "Redis 系 — Redis / Memcached（純點查 / 全在記憶體）"
                  }
                },
                {
                  label: "要持久",
                  child: {
                    kind: "leaf",
                    tone: "neutral",
                    text: "Bitcask 系 — Bitcask / LevelDB 早期（純 KV / 要持久 / 單機極快）"
                  }
                }
              ]
            }
          }
        ]
      }
    },
    {
      label: "讀寫接近",
      child: {
        q: "資料量 vs RAM？",
        branches: [
          {
            label: "塞得進 RAM",
            child: {
              kind: "leaf",
              tone: "neutral",
              text: "Redis / VoltDB 等 in-memory store（DDIA §3.2 路徑）"
            }
          },
          {
            label: "塞不進",
            child: {
              q: "OLTP 還是 OLAP？",
              branches: [
                {
                  label: "OLTP",
                  child: {
                    kind: "leaf",
                    tone: "neutral",
                    text: "LSM 派"
                  }
                },
                {
                  label: "OLAP",
                  child: {
                    kind: "leaf",
                    tone: "warn",
                    text: "欄式儲存 — Parquet on S3 + DuckDB / ClickHouse / Redshift / BigQuery（OLAP / 多欄少列 / 聚合）"
                  }
                }
              ]
            }
          }
        ]
      }
    }
  ]
}' />

**決策樹快速結論 + 工具對應**：
- **B-Tree 派**（讀遠多於寫 / 每筆改少 / 查詢多）→ PG / MySQL / SQLite，多數 web app 預設適用
- **LSM 派**（寫遠多於讀 / 大量 ingest / 時序 / IoT）→ RocksDB / Cassandra / ScyllaDB
- **Redis 系**（純點查 / 全在記憶體）→ Redis / Memcached
- **Bitcask 系**（純 KV / 要持久 / 單機極快）→ Bitcask、LevelDB 早期
- **欄式儲存**（OLAP / 多欄少列 / 聚合）→ Parquet on S3 + DuckDB / ClickHouse / Redshift / BigQuery

::: warning 多數應用不在這個樹的決策節點上
**實務上 90% 工程師「選什麼 DB」的決策權都不在他手上**——公司有的就用、團隊熟的就用。這張樹的價值是**讓你判斷「現有 DB 對我的負載合不合適」**，而不是「在白紙上挑」。看到效能問題時，回頭看樹判斷：是不是用 B-Tree 跑了 LSM 該跑的負載？
:::

---

## 章末練習

::: tip 思考題
1. 設計一個簡易 LSM-Tree：用 Python/Go 實作 memtable + flush + 二層 compaction。
2. 在你的實作中，加入 Bloom filter 並測量讀取速度提升。
3. 比較插入 1M 隨機 key 與 1M 連續 key 的吞吐量差異，解釋為什麼。
:::

<Quiz chapter-id="ch03" :questions='[
  {
    difficulty: "applied",
    question: "LSM-Tree 相對於 B-Tree 的主要寫入優勢來源於？",
    options: [
      "資料結構天生較小",
      "只做追加寫入（sequential write），避免隨機 I/O，且寫放大可控",
      "不需要任何索引",
      "壓縮比天生較高"
    ],
    answer: 1,
    explanation: "LSM 寫入只 append 到 memtable 與 WAL，背景做 compaction。順序寫對 SSD 和 HDD 都遠快於 B-Tree 的隨機原地更新。"
  },
  {
    difficulty: "applied",
    question: "為什麼 OLAP 系統普遍採用欄式儲存？",
    options: [
      "因為列式儲存無法存浮點數",
      "因為分析查詢通常只讀少數欄但聚合大量列，欄式可避免讀無關欄、壓縮率高、向量化執行",
      "因為欄式儲存比較容易實作 ACID",
      "因為 OLAP 不需要寫入"
    ],
    answer: 1,
    explanation: "OLAP 典型查詢是「SELECT SUM(amount) GROUP BY year」這種少欄多列。欄式儲存讓你只讀 amount 和 year 兩欄，加上類型一致的壓縮（RLE、bitpacking），效能差距可達 100 倍。"
  },
  {
    difficulty: "applied",
    question: "B-Tree 為什麼需要 WAL（Write-Ahead Log）？",
    options: [
      "為了壓縮資料",
      "因為原地更新若中途崩潰會破壞 page 結構，WAL 提供 crash recovery",
      "為了支援 schema migration",
      "為了避免索引太大"
    ],
    answer: 1,
    explanation: "B-Tree 在 page 上原地修改，page 寫到一半當機就會留下半新半舊狀態。WAL 先把變更記到日誌，恢復時 redo 即可保證一致性。"
  },
  {
    difficulty: "basic",
    question: "Bloom filter 在 LSM-Tree 中的用途是？",
    options: [
      "確保 SSTable 之間不會有重複 key",
      "判斷 key「絕對不在」某層 SSTable，避免無謂的磁碟讀取",
      "在記憶體中維護所有 SSTable 的完整索引",
      "減少 compaction 時需要合併的 SSTable 數量"
    ],
    answer: 1,
    explanation: "Bloom filter 可能誤判「在」（false positive）但不會誤判「不在」（無 false negative）。LSM 點查詢可能要掃多層 SSTable，先用 Bloom filter 在記憶體中快速判定「絕不在」、可大幅減少磁碟 I/O。重複 key 由 compaction 處理（不是 Bloom filter）、完整索引由 SSTable 的 index block 處理、compaction 計畫由 leveled / tiered 策略決定。"
  },
  {
    difficulty: "applied",
    question: "你的 OLTP 表上有 5 個欄位、每個都加了索引。下列哪個是這個選擇的主要代價？",
    options: [
      "查詢一定變慢",
      "每次 INSERT / UPDATE 要同時更新所有相關索引，寫入吞吐下降；磁碟用量可能是表本身的數倍",
      "DB 會自動降級為 KV store",
      "資料一致性會被破壞"
    ],
    answer: 1,
    explanation: "索引是「為特定查詢預排序的副本」—— 加速這個查詢但拖慢寫（所有索引都要更新）+ 佔磁碟。實務上每張表 5+ 索引很常見，但要監控 INSERT 延遲與磁碟用量。DDIA Ch3 反覆強調「索引是讀寫之間的權衡，沒有萬能索引」。"
  },
  {
    difficulty: "interview",
    question: "Kafka 的 partition log 與 LSM-Tree 在「儲存哲學」上有什麼共通點？",
    options: [
      "兩者都用 B-Tree 加速隨機讀",
      "兩者都把寫入當成 append-only sequence、避開隨機寫；讀取靠順序掃 + 預先建立的索引 / Bloom filter 加速",
      "兩者都不允許刪除資料、只能追加",
      "兩者都需要 fsync 每筆寫入才回 ACK"
    ],
    answer: 1,
    explanation: "Kafka partition = append-only log + 順序消費；LSM = append memtable + flush SSTable + background compaction —— 共通點是「順序寫優於隨機寫」（特別在 SSD 之前的時代）。差異：LSM 對外是 KV、Kafka 對外是 ordered stream；LSM 有 compaction 合併重複 key、Kafka 用 retention 過期 + 可選 compaction topic。DDIA Ch11 對 log abstraction 的論述把這兩家放在同一個家族 —— 讀完 Ch11 回來看本題會更有體會。"
  }
]' />

<ChapterNote chapter-id="ch03" />

<Progress chapter-id="ch03" />

::: info 延伸閱讀
- [google/leveldb](https://github.com/google/leveldb) — LSM 的 C++ 經典實作；`db_bench` 可直接測寫吞吐
- [cockroachdb/pebble](https://github.com/cockroachdb/pebble) — Go 版 LSM，README 對演算法解釋很細
- [The Log-Structured Merge-Tree](https://www.cs.umb.edu/~poneil/lsmtree.pdf) — 原始 LSM 論文 (O'Neil, 1996)
:::

<NextChapterBridge chapter-id="ch03" />

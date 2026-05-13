---
title: Ch10 批次處理
---

<ChapterOpener chapter-id="ch10" />

<ChapterMeta part="Part III 衍生資料" :read-time="55" difficulty="中等" :tags="['MapReduce', 'Spark', 'Hadoop']" prereq="Ch3, Ch5" />

<TLDR :points='[
  "<strong>批次處理三種典範</strong>：(1) Unix 哲學（小工具用 pipe 串接）(2) MapReduce（HDFS + map / reduce）(3) Dataflow 引擎（Spark / Flink，DAG 而非僵硬兩階段）。",
  "<strong>MapReduce 的關鍵不在 map / reduce、而在 shuffle</strong>（洗牌 — 把同 key 聚到同一 reducer 的跨網路階段）：Shuffle 跨網路寫磁碟，是效能瓶頸與容錯重點。",
  "<strong>Join 策略三種</strong>：sort-merge join（大表 vs 大表）、broadcast hash join（小表廣播）、partitioned hash join（兩邊同樣分區）。",
  "<strong>Dataflow 引擎勝出原因</strong>：把中間結果留在記憶體不寫磁碟、用 DAG 排程允許運算融合（pipelining）、提供更高層 API（DataFrame / SQL）。",
  "<strong>批次輸出應是不可變（immutable）的衍生資料</strong>：可重複執行、可回溯、可平行驗證 —— Lambda 架構的基礎。"
]' />

## 10.1 批次 vs 線上 vs 串流

| 類型 | 範例 | 延遲 | 用途 |
|---|---|---|---|
| 線上 (online) | Web 服務 | ms | 互動式 |
| 串流 (stream) | Kafka 消費者 | 秒 | 近即時分析 |
| 批次 (batch) | nightly job | 小時～天 | 報表、ETL、機器學習訓練 |

::: tip 如果你是前端開發者：Next.js SSG / ISR 就是 web 版的批次處理
看似遙遠的「批次處理 MapReduce」其實**換個視角就是你天天用的東西**：

| 你用過的 | 對應本章哪個概念 |
|---|---|
| `next build` SSG（Static Site Generation） | **批次處理**：build time 把資料庫 → HTML（衍生資料）；輸出**不可變**（可平行驗證、可回滾） |
| **ISR**（Incremental Static Regeneration） | 批次的「**增量重算**」：不重做全站、只重做變動的 page |
| **GitHub Actions / CI build** | 批次 job scheduler：定時跑、輸出產物 immutable |
| `next-sitemap` / `next-mdx-remote` | 應用層的 ETL：input markdown → output HTML/JSON sitemap |

**Lambda 架構**（10.5 會講）的「批次 + 速度」雙層概念跟你做的「SSG 預先建好 + client-side fetch 補實時」**有共通精神（靜態 base layer + 動態增量補丁）**，但嚴格說不一樣：Lambda 是「**伺服器端兩層各自完整處理同份資料、最後合併**」，SSG + CSR 是「**靜態 + 動態混合**」、沒有「兩層處理同份資料再合併」這層。理解 Lambda 動機就好、別把 SSG 當 Lambda 來架構。

讀完本章你會理解：**為什麼 Vercel/Netlify 的 build 時間敏感**（批次 shuffle 的代價）、**為什麼 ISR revalidate window 要設好**（衍生資料的新鮮度 vs 重算成本權衡）。
:::

---

## 10.2 Unix 哲學

```bash
cat access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head
```
- 每個工具做一件事做好
- 用文字（stdout）作為通用介面
- pipe 串接，組合勝過繼承

這是 **MapReduce 的祖先**：把資料當輸入流，用「映射 + 聚合」處理。

---

## 10.3 MapReduce

### 流程
```
HDFS 輸入檔（分塊）
    ↓
Map：每塊輸出 (key, value) 對
    ↓ shuffle（按 key 跨網路重分布）
Reduce：每個 key 的所有 value 一起處理
    ↓
HDFS 輸出檔
```

### WordCount 範例
```python
def map(line):
    for word in line.split():
        emit(word, 1)

def reduce(word, counts):
    emit(word, sum(counts))
```

### 容錯
任務掛了就重做（idempotent）。Mapper / Reducer 必須是純函式 —— 重做必須得到相同結果。

### Reduce-side Join 範例
要 join 「使用者表 + 活動表」：
- Mapper 1：讀活動表，輸出 (user_id, activity)
- Mapper 2：讀使用者表，輸出 (user_id, user_record)
- Reducer：收到同一 user_id 的全部，做 join

::: tip 實務細節：secondary sort 是 reduce-side join 的關鍵
若不額外處理，reducer 收到的 `(activity, user_record)` 順序**不保證 user_record 先到**——這時 reducer 必須先把整批 activity 全部 buffer 進記憶體、等到 user_record 終於出現再 join，**大 user 容易 OOM**（一個熱門 user 的 activity 可能上百萬筆）。

實務做法：用 **secondary sort**（次級排序）讓 shuffle 階段把 `(user_id, type_tag)` 的 `type_tag` 排成「user_record 永遠先於 activity」。reducer 一進來就先取 user_record、再 streaming 處理每筆 activity，記憶體只持有一份 user_record（DDIA p.405）。
:::

---

## 10.4 Join 策略

| 策略 | 條件 | 機制 |
|---|---|---|
| **Sort-Merge Join** | 大表 vs 大表 | 兩邊各 sort，merge |
| **Broadcast Hash Join** | 小表（< RAM）vs 大表 | 小表廣播到所有 mapper，記憶體 hash 查 |
| **Partitioned Hash Join** | 兩邊都按相同 key 分區 | 同分區內 local join |

::: tip 實務細節：Spark 場景下三件每個 DE 都會踩的事
**(1) Broadcast 閾值與 driver OOM**
- Spark 預設 `spark.sql.autoBroadcastJoinThreshold = 10MB`，小表 ≤ 10MB 自動 broadcast、超過 fallback 到 sort-merge
- **driver OOM 警報**：broadcast 階段小表會先 collect 回 driver 再廣播 → 一張 200MB 的「小表」設 broadcast 會炸 driver。實務上閾值不要拉太大、寧可走 sort-merge
- 強制 broadcast：`SELECT /*+ BROADCAST(small_table) */ ...` hint

**(2) Skew join（熱 key）—— 日常痛點**
- 場景：99% 的 user 各有 < 100 event，但 top 1% user 有 100k+ event → 對 `user_id` 做 join 時、熱 user 的 reducer 跑很久、其他 reducer 早就完成在等
- **Spark 3 的 AQE（Adaptive Query Execution）skew join**：執行時偵測 skew partition、自動拆成多個小 partition + 對另一邊 replicate；啟用方式 `spark.sql.adaptive.enabled=true` + `spark.sql.adaptive.skewJoin.enabled=true`
- **手動 salting**：對熱 key 加 `_0` ~ `_N` 後綴拆成 N 份、另一邊 explode 對應 N 份；可控但難維護

**(3) Partitioned hash join 的前提：bucketing**
- 「兩邊都按相同 key 分區」不是天生有、要先 bucket 過。Hive `CLUSTERED BY` / Spark `bucketBy` 都是這個用途
- 一旦 bucket 對齊，後續 join 不必 shuffle → 大表 join 變得便宜很多。但 bucket 數要規劃好、改 schema 成本高
:::

---

## 10.5 Dataflow 引擎（Spark, Flink, Tez）

MapReduce 強迫每階段都寫 HDFS → 多階段管線極慢。
Dataflow 引擎把整個工作流看成 **DAG**：
- 中間結果可留記憶體
- 連續的 map 可融合（pipelining）
- 失敗時的恢復策略**因引擎而異**（見下方對照）

::: warning 失敗恢復：lineage vs distributed checkpoint
不同引擎走兩條完全不同的恢復路線、不要混為一談：

| 引擎 | 恢復機制 | 代價 |
|---|---|---|
| **Spark RDD** | **Lineage**（記住怎麼算出來的）→ 失敗時從上游 partition 重算 | 確定性運算才可行；非確定性（含 random / current_time）會失準。寬依賴 shuffle 失敗仍需重算前一階段 |
| **Flink** | **Chandy-Lamport distributed checkpoint**（barrier 在資料流中傳播、定期儲存 operator state） | 引入 checkpoint overhead；但天生支援有狀態運算、exactly-once、event-time window |
| **Tez** | 中間階段可選擇 checkpoint 或重算 | 通常被 Spark / Flink 取代 |

DDIA Ch10 描述以 Spark / MapReduce 視角為主；Ch11 stream processing 會詳述 Flink checkpoint。
:::

### Spark RDD 範例
```scala
sc.textFile("hdfs://logs")
  .map(_.split(","))
  .filter(_(3) == "ERROR")
  .map(line => (line(1), 1))
  .reduceByKey(_ + _)
  .saveAsTextFile("hdfs://errors")
```

---

## 10.6 批次處理的輸出

批次工作的輸出通常是：
- **搜尋索引**（Lucene / Solr / Elasticsearch index files）
- **KV store** dump（餵到 Voldemort / Redis）
- **訓練好的 ML 模型**

**核心想法**：輸出是不可變的衍生資料。你保留原始資料，可以重跑得到一樣結果 → 復原 bug、做 A/B 測試、做歷史回放都變得簡單。

---

## 章末練習

::: tip 思考題
1. 用 PySpark 寫 WordCount 與 Top-N 查詢，比較與 SQL 寫法的差別。
2. 設計一個批次 ETL：把每日交易 log 聚合成每個使用者的月度報表。考慮：怎麼處理「跨日的交易」？
3. 比較 Spark 與 MapReduce 在「五階段管線」工作流上的效能差距，解釋來源。
:::

<Quiz chapter-id="ch10" :questions='[
  {
    difficulty: "basic",
    question: "MapReduce 工作流中，「Shuffle」階段做的是？",
    options: [
      "把資料隨機排列以避免熱點",
      "把所有 mapper 輸出按 key 重新分配，確保同 key 的記錄都送到同一個 reducer",
      "壓縮資料以節省儲存",
      "對結果做加密"
    ],
    answer: 1,
    explanation: "Shuffle 是 MapReduce 的核心（也是最貴的部分）：跨網路傳輸所有 mapper 輸出，按 key 分組送到對應 reducer。優化 shuffle（combiner、partitioner）是 MapReduce 調優的關鍵。"
  },
  {
    difficulty: "applied",
    question: "Spark / Flink 等 Dataflow 引擎相對於 MapReduce 的主要效能優勢來自於？",
    options: [
      "用更新的程式語言",
      "中間結果留在記憶體不寫 HDFS、用 DAG 排程支援運算融合（pipelining）",
      "不需要 cluster 即可運行",
      "自動把 Java 改寫成 C++"
    ],
    answer: 1,
    explanation: "MapReduce 每階段都 materialize 到磁碟。Dataflow 引擎用 DAG + 記憶體中間結果，能融合連續運算、避免無謂 I/O。在**迭代式運算（如 ML 訓練）或多階段管線**上可快 10-100 倍（這是 Spark 早期主打的場景）；單純的 map-only 工作負載則差距不大。"
  },
  {
    difficulty: "applied",
    question: "Broadcast Hash Join 適合什麼情境？",
    options: [
      "兩個大表都無法放入記憶體",
      "一個表很小（能放入單機記憶體），另一個很大；把小表廣播到所有 mapper 做本地 hash 查找",
      "資料按時間排序",
      "只需要做計數"
    ],
    answer: 1,
    explanation: "若小表足以放入每個 worker 的 RAM，廣播後本地查 hash 表極快 —— 完全避開 shuffle。實務上「事實表 JOIN 維度表」常用此法。"
  },
  {
    difficulty: "applied",
    question: "兩個大表（事實 + 事實）做 JOIN、且兩邊都已按 join key 預先分區（bucketed by key）。最合理的 join 策略是？",
    options: [
      "Broadcast hash join——把一邊全部廣播",
      "Partitioned hash join——同分區 hash 對 hash 直接 join、完全避免 shuffle，前提是兩邊**按相同 key + 相同分區數** bucket 過",
      "Sort-merge join——必須先全域排序再 merge",
      "Reduce-side join——先 shuffle 全部資料再 reducer 處理"
    ],
    answer: 1,
    explanation: "**Partitioned hash join**（Hive 的 bucketed join、Spark 的 bucketBy）的前提是「兩邊都已**按相同 join key + 相同 bucket 數**事先分區」——這在初次插入時付出成本、但後續所有 join 都不必 shuffle（同 bucket 對同 bucket 做本地 hash join）。比 broadcast hash join 更適合「兩邊都大」、比 reduce-side join 快數倍。代價：bucket schema 改變成本高（要重寫資料）、bucket 數要預估好。DDIA Ch10 §10.4 把這個策略列為 batch join 的最佳實踐。"
  },
  {
    difficulty: "interview",
    question: "Spark RDD 與 Flink 在「失敗恢復」上是兩種完全不同的策略。下列描述何者正確？",
    options: [
      "兩者都用 lineage（記住計算 DAG）重算失敗的 partition",
      "兩者都用 Chandy-Lamport distributed checkpoint",
      "Spark 用 lineage（從上游 partition 重算）、Flink 用 Chandy-Lamport distributed checkpoint（barrier 在資料流中傳播、定期儲存 operator state）",
      "Spark 不支援失敗恢復、必須完全重跑整個 job"
    ],
    answer: 2,
    explanation: "**Spark RDD = lineage**（記住 DAG、失敗時從上游重算）—— 適合**確定性**運算、寬依賴 shuffle 失敗仍需重算前一階段；**Flink = Chandy-Lamport distributed checkpoint**（barrier 在資料流中傳播、定期儲存 operator state）—— 引入 checkpoint overhead 但**天生支援有狀態 + exactly-once + event-time window**。兩種策略各自決定了 Spark / Flink 的長處：Spark 適合 batch + 偶爾 stream、Flink 適合 true streaming + 大型 stateful job。Ch11 streams 章會深入講 Flink checkpoint。"
  }
]' />

<ChapterNote chapter-id="ch10" />

<Progress chapter-id="ch10" />

<NextChapterBridge chapter-id="ch10" />

---
title: Ch2 資料模型與查詢語言
---

# Ch2 · 資料模型與查詢語言

<ChapterMeta part="Part I 資料系統基礎" :read-time="40" difficulty="入門" :tags="['SQL', 'NoSQL', 'Graph']" />

<TLDR :points='[
  "<strong>三大資料模型</strong>：關聯模型（SQL）、文件模型（document）、圖模型（graph）。沒有最好，只有最適合特定資料形狀。",
  "<strong>文件 vs 關聯的本質差異</strong>：當資料天然是樹狀、且整份文件常被一起讀寫時，文件模型有「局部性」優勢（單次 I/O 取整棵子樹）；多對多關係、跨實體查詢時，關聯模型壓倒性勝出。注意「一對多」兩者都能做，差別在「整棵樹原子讀寫」的便利度。",
  "<strong>Schema-on-read vs Schema-on-write</strong>：類似動態 vs 靜態型別 —— 文件 DB 把 schema 推到應用層讀取時處理。",
  "<strong>宣告式查詢（SQL、Cypher）優於命令式</strong>：DB 引擎可自由優化執行計畫、可平行化、隱藏儲存細節。",
  "<strong>圖模型勝出的場景</strong>：當「多對多關係本身是查詢主體」時（社交網路、知識圖譜、路徑搜尋）。Cypher、SPARQL、Datalog 是三種圖查詢語言。"
]' />

## 2.1 關聯模型 vs 文件模型

### 關聯模型（1970, Edgar Codd）
資料以**關聯（relation）= 表（table）**呈現，每列是一個 tuple。經過五十年仍主宰商業應用，因為它把「儲存細節」與「查詢介面」乾淨分離。

### 文件模型復興（2010 年代 NoSQL 浪潮）
驅動力：
1. 更好的 schema 彈性（schemaless / schema-on-read）
2. 局部性（locality）：一份文件 = 一次磁碟讀取
3. 對某些應用更接近資料結構（避免「**物件關聯阻抗失配**」impedance mismatch ——指物件導向語言的「物件」與關聯式 DB 的「表格」之間的結構摩擦，**就是 ORM 想解決的那個問題**：物件有巢狀關聯，表格只能扁平，每次儲存與讀取都要在兩種模型間翻譯）

### 關鍵權衡：JOIN 與多對多

```
文件模型：強在一對多、樹狀資料
{ user: "alice", positions: [{title: "PM"}, {title: "VP"}] }

關聯模型：強在多對多、跨實體關聯
users ↔ jobs ↔ companies（雇傭關係表）
```

> **重點**：履歷的「職位」如果是字串欄位 → 文件 OK；如果要連結到「公司實體」並查詢「同一家公司歷年所有員工」→ 關聯模型壓倒性勝出。

::: tip 如果你是前端開發者：Firestore vs SQL 的選型鴻溝
你習慣的設計大概是：

```
/users/{userId}/orders/{orderId}/items/{itemId}
```

每位使用者的 orders、每筆 order 的 items 都是 sub-collection。這套設計的**勝場**：
- 讀「使用者所有訂單」 = 一次 collection query、O(訂單數)
- 寫入時 atomic（同一文件樹的更新）

**輸場**（也是讀者轉 SQL 的真正原因）：
- 「**過去 30 天所有使用者的訂單**」要 `collection group query` + 預建 composite index、且 ad-hoc 條件改一個欄位就要再建一次 index
- 「**訂單 → 商品 → 庫存**」這種多層關聯，Firestore 沒有 JOIN、要用 client-side fan-out 撈三次（或 [`getDocs` 加上 in 限制 10 筆](https://firebase.google.com/docs/firestore/query-data/queries#in_not-in_and_array-contains-any)）
- 報表類查詢效能與 ad-hoc 能力是關聯式 DB 的 home turf

**選型決策**：你的查詢模式有多少是「**事先想得到、按 user / 樹狀讀**」？vs 多少是「**事後想到、跨 user / 跨時段分析**」？前者多 → 文件勝；後者多 → SQL 勝；都有 → 兩個並存（OLTP Firestore + OLAP BigQuery）也是常見做法。
:::

---

## 2.2 查詢語言：宣告式 vs 命令式

**命令式（imperative）**：告訴電腦「怎麼做」（for loop、逐筆操作）
**宣告式（declarative）**：告訴電腦「要什麼」（SQL、CSS 選擇器）

宣告式的優勢：
- DB 引擎自由選擇執行計畫（索引、JOIN 演算法）
- 平行化更容易（無控制流相依性）
- 抽象遮蔽儲存細節 → schema 變動不破壞查詢

### MapReduce：介於兩者之間
**<G term="mapreduce">MapReduce</G>** 是 Google 2004 提出的批次處理典範：把工作切成 `map`（對每筆資料各自處理）+ `reduce`（彙整結果）兩階段，框架自動切片、平行執行、處理失敗重試（詳見 [Ch10](/part-3/ch10-batch)）。

定位上：`map` + `reduce` 函式本身是**命令式**的程式碼片段，但被**宣告式**框架調度。MongoDB 後來推出純宣告式的 **Aggregation Pipeline** 替代 MapReduce。

---

## 2.3 圖資料模型

### 屬性圖（Property Graph，如 Neo4j）
- 節點（Vertex）：有 ID、標籤、屬性
- 邊（Edge）：有 ID、起點、終點、類型、屬性

### Triple-Store / RDF（Subject-Predicate-Object）
資料以「**三元組**」表達：每筆 = `主詞 → 述詞 → 受詞`。常用 Turtle 語法（W3C 標準），每個 `:xxx` 是一個資源識別子（namespace 內的 URI 簡寫），三個一組讀作一個事實：

```turtle
:alice :worksAt :acme        # 「Alice 任職於 Acme」
:acme  :locatedIn :taiwan    # 「Acme 位於台灣」
```

兩筆 triple 隱含「Alice 任職的公司在台灣」這個傳遞推論。搭配查詢語言 **SPARQL** 做模式比對。

### Cypher 範例（找「移民」：在 USA 出生、現居 EU 的人）

先看 Cypher 的最小單元：`(節點)-[:邊類型]->(節點)`。例如要找 Alice 的朋友：

```cypher
MATCH (a {name:'Alice'})-[:FRIEND]->(friend)
RETURN friend.name
```

進階用法 `*0..` 是**傳遞閉包**：表示「沿著這種邊走任意跳數」—— `[:WITHIN*0..]` 意思是「在同一地理位置或其任意上層位置（國家、洲、…）」。

```cypher
MATCH (person)-[:BORN_IN]->()-[:WITHIN*0..]->(us:Location {name:'USA'}),
      (person)-[:LIVES_IN]->()-[:WITHIN*0..]->(eu:Location {name:'Europe'})
RETURN person.name
```

意思：「找出有 `BORN_IN` 邊指向 USA 或 USA 任何下層地點（州、城市、…）、且有 `LIVES_IN` 邊指向 EU 任何地點的人」。

這在 SQL 寫成多層遞迴 CTE，極為痛苦。**「關係本身就是主查詢對象」時，圖模型壓倒性勝出**。

---

## 章末練習

::: tip 思考題
為一個電商網站，分別用關聯、文件、圖三種模型設計「商品分類樹」：
1. 寫出每種模型的 schema
2. 比較「查詢某商品的所有上層分類」的複雜度
3. 比較「移動整個子樹到別處」的成本
4. 你會選哪一種？為什麼？
:::

<Quiz chapter-id="ch02" :questions='[
  {
    question: "下列哪種情境最適合使用文件模型而非關聯模型？",
    options: [
      "兩個實體之間有頻繁需要 JOIN 的多對多關係",
      "資料結構天然是樹狀、且整份文件常被一起讀取",
      "需要嚴格的資料完整性約束（如外鍵）",
      "需要跨多表的 ad-hoc 分析查詢"
    ],
    answer: 1,
    explanation: "文件模型的優勢是「局部性」—— 樹狀資料能一次讀取完成。多對多、強約束、跨表分析都是關聯模型的強項。"
  },
  {
    question: "「宣告式查詢語言」相對於命令式的最大優勢是？",
    options: [
      "執行速度一定更快",
      "查詢與儲存實作解耦，引擎可自由選擇執行計畫並進行優化、平行化",
      "語法一定更簡潔",
      "不需要寫測試"
    ],
    answer: 1,
    explanation: "宣告式描述「要什麼」而非「怎麼做」，給 query planner 最大彈性 —— 加索引、改 JOIN 演算法、平行執行都不需改查詢。"
  },
  {
    question: "對於「找出 Alice 朋友的朋友的朋友」這類查詢，哪種模型最自然？",
    options: [
      "關聯模型 + 三次 self-join",
      "文件模型 + 巢狀陣列",
      "圖模型 + 路徑查詢",
      "Key-Value Store"
    ],
    answer: 2,
    explanation: "多層次的「多對多關係遍歷」正是圖模型的甜蜜點。SQL 需要遞迴 CTE 或多次 JOIN，圖查詢語言（Cypher）一行就能寫完。"
  }
]' />

<ChapterNote chapter-id="ch02" />

<Progress chapter-id="ch02" />

<NextChapterBridge next-link="/part-1/ch03-storage" next-title="Ch3 儲存與檢索">
選好資料模型，下一步是「實際存到磁碟」的問題：怎麼存讓寫快？怎麼建索引讓讀快？Ch3 會看到 LSM-Tree 與 B-Tree 兩種主流引擎截然不同的權衡 —— 也解釋了為什麼 Cassandra 與 PostgreSQL 在寫密集 vs 讀密集場景表現差這麼多。
</NextChapterBridge>

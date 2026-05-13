---
title: 0.3 SQL 與關聯模型 30 分鐘速覽
description: SELECT、JOIN、索引、交易直覺 —— Kleppmann 序言列為硬需求
---

# 0.3 · SQL 與關聯模型 30 分鐘速覽

<ChapterMeta part="Part 0 前置知識" :read-time="30" difficulty="入門" :tags="['SQL', 'JOIN', '索引']" />

<PrereqBox
  :prereq="['基本的程式設計概念（變數、條件、迴圈）', '會看簡單 JSON 結構']"
  first-read-hint="**完全沒寫過 SQL 的讀者請預估 1-2 小時、不是標題的 30 分鐘**——光標的 30 分鐘是給有 SQL 經驗的人快速 refresh 用。建議搭配 [SQLBolt](https://sqlbolt.com/) 或 [Mode SQL Tutorial](https://mode.com/sql-tutorial) 動手練 30 分鐘再回來"
  :skippable="['§5 進階：CTE 與視窗函式（一般 CRUD 用不到，Ch10 OLAP 才會回頭）']"
/>

<TLDR :points='[
  "<strong><G term=\"sql\">SQL</G> 是宣告式語言</strong>——你說「要什麼」，不說「怎麼拿」。「怎麼拿」由 query planner 決定，看資料量挑演算法。",
  "<strong><G term=\"join\">JOIN</G> 是把多張表依關聯欄位合併</strong>——關聯模型最強大也最被誤解的部分。Inner / Left / Right / Full 各有用途。",
  "<strong>索引是「為查詢預先排好順序的副本」</strong>——加速讀，但拖慢寫；要付儲存成本。沒索引的查詢叫 full table scan。",
  "<strong>交易 = 多個操作的「全有或全無」</strong>。ACID 是它的四大保證；隔離級別決定並發交易彼此能看見多少。",
  "Ch2 整章在問「為什麼有 SQL / 文件 / 圖三種模型」、Ch7 整章在拆 ACID 的 I——這章先讓你看得懂 SQL，回頭讀那兩章才不會卡。"
]' />

::: warning 這章是「快速暖身」，不是「完整 SQL 教學」
真正完整的 SQL 學習，請走 [PostgreSQL Tutorial](https://www.postgresql.org/docs/current/tutorial.html) 或 [Mode SQL Tutorial](https://mode.com/sql-tutorial)。這章只教「讀 DDIA 必須懂的 SQL 子集」。
:::

::: tip 如果你是前端開發者
你習慣的 Firebase / Supabase / Firestore **不是 SQL 派**（除了 Supabase 底下其實是 Postgres）—— 那種「巢狀文件」「JS 物件直接存」的世界，本章對應的關聯式 DB 思維**剛好相反**：把資料攤平成多張表、靠 `user_id` 這種外鍵互相指。

最大鴻溝在「**為什麼要拆兩張表，不能塞在一份 user 文件裡？**」——因為攤平後才能跨使用者查詢（例：「某時段所有訂單的營業額」）。文件式 DB 要算這個會痛。Ch2 完整討論這個選型。
:::

## 1) 關聯模型的核心：表、列、欄、鍵

關聯式資料庫把資料組織成**表（table）**：

```
users 表
┌────┬─────────┬─────────────────┐
│ id │ name    │ email           │
├────┼─────────┼─────────────────┤
│  1 │ Alice   │ alice@x.com     │
│  2 │ Bob     │ bob@y.com       │
└────┴─────────┴─────────────────┘

orders 表
┌────┬──────────┬────────┬──────────┐
│ id │ user_id  │ amount │ status   │
├────┼──────────┼────────┼──────────┤
│ 10 │ 1        │ 100    │ paid     │
│ 11 │ 1        │ 200    │ pending  │
│ 12 │ 2        │ 50     │ paid     │
└────┴──────────┴────────┴──────────┘
```

- **主鍵（primary key）**：`users.id`、`orders.id`——唯一識別一列。
- **外鍵（foreign key）**：`orders.user_id` 指向 `users.id`——表達「這筆訂單屬於哪個使用者」。

::: info Firestore 派的話會怎麼設計？
你大概會把 orders 寫成 user 的 **sub-collection**：

```
/users/{userId}/orders/{orderId}
```

這個結構**讀 user 的全部訂單**很快——但要做「**所有 user 在某時段的總營業額**」就需要 collection group query + **預先建好的 composite index**（每組查詢條件都要事先宣告），且每查仍受 1 MiB 上限與 read cost 計費限制。ad-hoc 分析（「上次老闆問的這條件再加一個欄位」）會痛。

SQL 把 orders 拆成獨立表、靠 `user_id` 連回去，**犧牲了「一次讀完 user 全部資料」的便利，換來「ad-hoc 跨 user 跨時間查詢」的能力**。哪邊重要？看你的查詢模式。Ch2 整章在拆這個權衡。
:::

## 2) SELECT 基本骨架

```sql
SELECT 欄位... FROM 表 WHERE 條件 GROUP BY ... ORDER BY ... LIMIT ...
```

例：
```sql
SELECT name, email
FROM users
WHERE id = 1;
```
→ 拿 Alice 的 name 和 email。

```sql
SELECT status, COUNT(*) AS cnt
FROM orders
GROUP BY status;
```
→ 統計每個狀態各幾筆：`paid: 2, pending: 1`。

## 3) <G term="join">JOIN</G>：DDIA Ch2 反覆強調的核心

JOIN 把兩張表「依關聯欄位」合起來。

### Inner Join：只保留兩邊都有的

```sql
SELECT u.name, o.amount
FROM users u
INNER JOIN orders o ON o.user_id = u.id;
```

→
```
Alice | 100
Alice | 200
Bob   | 50
```

### Left Join：保留左邊全部，右邊沒對應就是 NULL

```sql
SELECT u.name, o.amount
FROM users u
LEFT JOIN orders o ON o.user_id = u.id;
```

如果有 Carol 但她沒訂單，會出現 `Carol | NULL`。

### Aggregation + Join：DDIA Ch1 Twitter 例子的核心

```sql
SELECT u.name, COUNT(o.id) AS order_count, SUM(o.amount) AS total
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name;
```

→
```
Alice | 2 | 300
Bob   | 1 | 50
```

::: tip 為什麼 DDIA Ch1 用 SQL 講 Twitter 例子
Ch1 用 SQL 描述「家庭時間軸怎麼查」——同一個邏輯可以用 **fan-out on read（每次刷新都跑這個 JOIN）** 或 **fan-out on write（推文一發出就先計算好）**。讀懂 SQL 才能看懂這個權衡。
:::

::: warning Fan-out 在 DDIA 有兩種意義，別混淆
這個詞在書中**兩個地方都會出現，意思不同**：

| 用法 | 意思 | 出現章節 |
|---|---|---|
| **資料 fan-out**（fan-out on read / write） | 「一筆寫入散播到多個目的地」或「一次讀取從多個來源組合」 | Ch1 Twitter timeline、Ch11 串流 |
| **請求 fan-out** | 「一個前端請求觸發多個下游微服務呼叫」 | Ch1 tail latency 放大 |

兩者用同一個字 fan-out，但問題不一樣——前者是**資料模型**權衡（讀貴 vs 寫貴），後者是**延遲**問題（最慢的下游決定整體延遲）。看到 fan-out 先停一秒判斷上下文。
:::

## 4) 索引：讀快、寫慢、佔空間

### 沒索引時

```sql
SELECT * FROM users WHERE email = 'alice@x.com';
```

DB 必須 **掃描整張表**（full table scan），逐行比對 email——表 1 億筆就是 1 億次比對。

### 加索引

```sql
CREATE INDEX idx_users_email ON users(email);
```

DB 在背景多維護一個排序好的副本（B-Tree 或 Hash）：

```
email                  → row pointer
alice@x.com           → row 1
bob@y.com             → row 2
...
```

現在同樣的查詢可以用二分查找，O(log n) 完成。

### 代價

- **寫變慢**：每次 INSERT / UPDATE 都要更新索引。
- **空間變大**：索引本身也佔磁碟。
- **不是萬靈丹**：欄位選擇性低（如 `status` 只有 3 種值）加索引收益小。

DDIA Ch3 整章拆解這個權衡——B-Tree、LSM-Tree、Hash index 各自的取捨。

## 5) 交易（Transaction）：全有或全無

### 經典銀行轉帳例子

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

兩個 UPDATE 必須**一起成功或一起失敗**——否則錢會憑空消失或增加。

### <G term="acid">ACID</G> 四大保證

| 字母 | 中文 | 意思 |
|---|---|---|
| **A** | <G term="acid">原子性</G> | 全部成功或全部回滾——沒有「做一半」 |
| **C** | 一致性 | 滿足應用層約束（注意：這個字在分散式系統中又是另一個意思！）|
| **I** | 隔離性 | 並發交易彼此「看不到」對方的中間狀態 |
| **D** | 持久性 | commit 後不會丟失（除非天災） |

### <G term="isolation-level">隔離級別</G>：DDIA Ch7 整章在拆

```
Read Uncommitted < Read Committed < Repeatable Read
                                  < Snapshot Isolation < Serializable
```

越往右越嚴格、越往右越慢。**各家 DB 對同名級別實作不同**——PG 的 Repeatable Read 跟 MySQL 的 Repeatable Read 不一樣，這是 Ch7 反覆強調的坑。

::: warning 一個容易踩的坑
你以為 SQL 標準的 "Repeatable Read" 是同一個東西——其實 PostgreSQL 的 Repeatable Read = Snapshot Isolation，MySQL InnoDB 的 Repeatable Read 是另一種東西。讀 DB 文件、不要假設。
:::

## 6) 與 DDIA 章節的對應

| 你會在 DDIA 看到的 SQL 概念 | 哪一章 |
|---|---|
| 關聯 vs 文件 vs 圖模型的選擇 | Ch2 |
| EXPLAIN 在說什麼、索引怎麼選 | Ch3 |
| Schema 演進（ALTER TABLE 的代價）| Ch4 |
| Read replica 的延遲 | Ch5 |
| Sharding：依 user_id 拆 orders 表 | Ch6 |
| ACID 的 I 到底有幾種、有什麼坑 | Ch7（**重頭戲**） |

---

## 想更深入？

| 資源 | 內容 |
|---|---|
| [PostgreSQL Tutorial](https://www.postgresql.org/docs/current/tutorial.html) | 官方教學，30 頁可學完核心 |
| [Mode SQL Tutorial](https://mode.com/sql-tutorial) | 互動式線上 SQL 練習 |
| [Use The Index, Luke!](https://use-the-index-luke.com/) | SQL 索引深入指南（免費） |
| [Markus Winand: SQL Performance Explained](https://sql-performance-explained.com/) | 進階：執行計畫怎麼讀 |

---

## 章末自評

<Quiz chapter-id="p0-sql" :questions='[
  {
    "difficulty": "applied",
    "question": "下列哪個 SQL 查詢，會回傳「所有使用者，連同他們的訂單數量（沒訂單的人顯示 0）」？",
    "options": [
      "SELECT u.name, COUNT(o.id) FROM users u INNER JOIN orders o ON o.user_id = u.id GROUP BY u.id",
      "SELECT u.name, COUNT(o.id) FROM users u LEFT JOIN orders o ON o.user_id = u.id GROUP BY u.id",
      "SELECT u.name, COUNT(*) FROM users u, orders o GROUP BY u.id",
      "SELECT name, orders FROM users"
    ],
    "answer": 1,
    "explanation": "LEFT JOIN 保留左邊（users）全部，右邊沒對應就是 NULL；COUNT(o.id) 只算非 NULL 的，所以沒訂單的人顯示 0。INNER JOIN 會把沒訂單的人整列濾掉。"
  },
  {
    "difficulty": "applied",
    "question": "你在 `users.email` 上建了索引，下列哪個敘述最準確？",
    "options": [
      "所有查詢都會變快",
      "依 email 查詢變快（O(log n)）、但 INSERT 與 UPDATE email 的成本增加、額外佔磁碟空間",
      "INSERT 變快、SELECT 變慢",
      "完全沒有副作用"
    ],
    "answer": 1,
    "explanation": "索引是「為查詢預排序的副本」—— 加速讀、拖慢寫（每次寫都要更新索引）、佔額外空間。DDIA Ch3 整章在拆 B-Tree、LSM-Tree、Hash index 在這三個維度上的權衡。"
  },
  {
    "difficulty": "basic",
    "question": "ACID 中的「Atomicity（原子性）」最準確的意思是？",
    "options": [
      "資料庫每筆寫入是不可分割的原子操作",
      "交易中的多個操作「全部成功或全部回滾」，沒有中間狀態",
      "資料像原子一樣小",
      "資料庫只能同時處理一筆寫入"
    ],
    "answer": 1,
    "explanation": "Atomicity 指交易層級——多個 SQL 操作打包成一個邏輯單元，commit 全部生效、rollback 全部撤銷。它和 CPU 的 atomic instruction 不是同一個層次。DDIA Ch7 強調這個詞在不同情境下容易混淆。"
  },
  {
    "difficulty": "interview",
    "question": "為什麼 PostgreSQL 的 Repeatable Read 和 MySQL InnoDB 的 Repeatable Read 不能假設一樣？",
    "options": [
      "因為兩家公司不和",
      "SQL 標準只規範了「不允許」什麼異常、沒規範實作；各家 DB 用不同機制達成，連同名級別的實際保證都可能不同",
      "因為 PostgreSQL 比 MySQL 嚴格",
      "因為它們在不同年份推出"
    ],
    "answer": 1,
    "explanation": "SQL 標準的 isolation level 只列舉「不可以發生哪些 anomaly」—— PG 用 Snapshot Isolation 實作 RR、MySQL InnoDB 用 next-key locking 實作 RR，兩者在邊界 case 行為不同。DDIA Ch7 對這個議題有完整討論—— 學界與業界各有不同詮釋。"
  }
]' />

<NextChapterBridge next-link="/part-0/os" next-title="0.4 作業系統地基">
SQL 看懂了，接下來補 OS 層的概念—— page cache、fsync、行程暫停—— Ch3 storage engine 和 Ch7 並發都會用到。
</NextChapterBridge>

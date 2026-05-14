---
title: Part I 資料系統基礎
---

# Part I · 資料系統基礎

> 從單機開始：可靠性、資料模型、儲存引擎、編碼格式

這四章建立全書的基礎詞彙與心智模型。即使你只關心分散式系統，**這部分也不能跳** —— Part II/III 的所有討論都假設你理解這裡的概念。

## 學習目標

讀完 Part I，你應該能回答：
- 什麼讓一個系統「可靠」？「擴展」是要擴展什麼？
- 為什麼有 SQL、文件 DB、圖 DB 三種模型？分別何時用？
- 為什麼 LSM-Tree 與 B-Tree 在不同負載下勝負互換？
- OLTP 與 OLAP 為什麼走向不同的儲存格式？
- JSON 與 Protobuf 在 schema 演進時各有什麼坑？

## 章節地圖

```
Ch1 可靠/可擴展/可維護（理論基礎）
   ├─ Ch2 資料模型（SQL/Document/Graph）
   ├─ Ch3 儲存與檢索（LSM/B-Tree/Column）
   └─ Ch4 編碼與演進（Protobuf/Avro）

依賴關係：Ch1 → 其他三章
建議順序：Ch1 → Ch2 → Ch3 → Ch4（線性）
```

<div class="ddia-chapter-grid">
  <ChapterCard id="ch01" num="CH 01" title="可靠、可擴展、可維護" summary="Reliability、Scalability、Maintainability 三大目標，P99 延遲、Twitter 案例" link="/part-1/ch01-reliable" :read-time="35" />
  <ChapterCard id="ch02" num="CH 02" title="資料模型與查詢語言" summary="關聯 vs 文件 vs 圖；宣告式查詢；Cypher、SPARQL、Datalog" link="/part-1/ch02-data-models" :read-time="40" />
  <ChapterCard id="ch03" num="CH 03" title="儲存與檢索" summary="LSM-Tree、B-Tree、欄式儲存；OLTP vs OLAP 引擎" link="/part-1/ch03-storage" :read-time="45" />
  <ChapterCard id="ch04" num="CH 04" title="編碼與演進" summary="Protobuf/Avro 二進位編碼；向前向後相容；RPC 與訊息" link="/part-1/ch04-encoding" :read-time="35" />
</div>

::: tip 預估時間
四章合計約 **155 分鐘**（純閱讀）。加上練習與測驗，建議排 **10–15 小時**。
:::

## 讀完這部分，你應該能做的決策 {.role-h2 .icon-account_tree}

Part I 四章對應三類「**該怎麼選**」的決策。下面 3 棵獨立決策樹分別對應——

### 1. 新專案要選什麼 DB?（Ch2）

<DecisionTree :root='{
  q: "資料是樹狀且整份讀寫？",
  branches: [
    {
      label: "是",
      child: {
        kind: "leaf",
        tone: "neutral",
        text: "Document DB — MongoDB / CouchDB；DynamoDB 也算（KV + document 混合）"
      }
    },
    {
      label: "否",
      child: {
        q: "多對多關係多？",
        branches: [
          {
            label: "是",
            child: {
              kind: "leaf",
              tone: "safe",
              text: "Relational DB — PostgreSQL / MySQL"
            }
          },
          {
            label: "否",
            child: {
              q: "關係是查詢主體？",
              hint: "如社交圖譜",
              branches: [
                {
                  label: "是",
                  child: {
                    kind: "leaf",
                    tone: "neutral",
                    text: "Graph DB — Neo4j / TigerGraph"
                  }
                },
                {
                  label: "否",
                  child: {
                    kind: "leaf",
                    tone: "safe",
                    text: "Relational DB — PostgreSQL / MySQL（多數場景的預設選擇）"
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

### 2. 新表很大時要選什麼儲存引擎?（Ch3）

<DecisionTree :root='{
  q: "寫多 or 讀多？",
  branches: [
    {
      label: "寫密集",
      child: {
        kind: "leaf",
        tone: "neutral",
        text: "LSM-Tree — RocksDB / Cassandra / ScyllaDB"
      }
    },
    {
      label: "讀密集",
      child: {
        kind: "leaf",
        tone: "safe",
        text: "B-Tree — PostgreSQL / MySQL / SQLite"
      }
    }
  ]
}' />

### 3. 要做分析報表?（Ch3）

<DecisionTree :root='{
  q: "要做分析報表？",
  branches: [
    {
      label: "是",
      child: {
        kind: "leaf",
        tone: "warn",
        text: "列轉欄式儲存 — Redshift / BigQuery / ClickHouse / DuckDB"
      }
    }
  ]
}' />

Part I 的核心訓練是**「在資料層做出有依據的決策」**。Part II 開始我們會把這些單機決策放到多機環境，看會發生什麼。

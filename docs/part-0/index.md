---
title: Part 0 前置知識
description: 進入 DDIA 第 1 章前的暖身——作業系統、網路、SQL、資料結構、並行控制
---

# Part 0 · 前置知識

> 這部分**不在原書中**，是為了補上 DDIA 假設讀者已具備、但新手未必有的基礎。

Kleppmann 在原書序言寫：

> *You should have some experience building web-based applications or network services, and you should be familiar with relational databases and SQL.*

但實際讀第 1 章後就會發現，書內還假設你懂：作業系統的 page cache、TCP 連線行為、B-Tree 與 Hash table、race condition、隔離級別……這些散落在計算機科學各領域。Part 0 把它們收攏成 **7 個 12–30 分鐘的小章**，沒讀過或忘了的人可以快速暖身。

## 完全零基礎？先讀 0.0

如果你**沒寫過後端**、看到 stateless / DB / API / 佇列這些詞會卡——這頁不該是你的起點。先讀 **[0.0 三分鐘看懂後端世界](/part-0/basics)**，看完再回來自評。

## 我需要讀 Part 0 嗎？快速自評

回答以下 7 題。**任一題答不出來**，建議先讀對應的 Part 0 章節：

| # | 自評題 | 答不出來 → 先讀 |
|---|---|---|
| 1 | 後端服務的「無狀態（stateless）」是什麼意思？為什麼設計成這樣？ | [0.1 為什麼需要資料密集系統](/part-0/intro) |
| 2 | 為什麼 P99 延遲比平均延遲更能反映使用者體驗？ | [0.2 衡量指標素養](/part-0/metrics) |
| 3 | `SELECT u.name, COUNT(o.id) FROM users u LEFT JOIN orders o ON o.user_id = u.id GROUP BY u.id` 這個查詢做什麼？ | [0.3 SQL 速覽](/part-0/sql) |
| 4 | 行程（process）與執行緒（thread）的差別是什麼？fsync 為什麼存在？ | [0.4 作業系統地基](/part-0/os) |
| 5 | TCP 三次握手中如果第二個 SYN-ACK 丟了會怎樣？HTTP 與 RPC 的本質差異？ | [0.5 網路地基](/part-0/network) |
| 6 | B-Tree 為什麼平衡？Hash table 衝突怎麼處理？外部排序為什麼能用？ | [0.6 資料結構地基](/part-0/data-structures) |
| 7 | 兩個執行緒同時對銀行帳戶 +100 為什麼會丟錢？什麼是隔離級別？ | [0.7 並行控制直覺](/part-0/concurrency) |

::: tip 都答得出來？
直接跳到 [Ch1 可靠、可擴展、可維護](/part-1/ch01-reliable)。Part 0 隨時可以回頭翻當參考。
:::

## Part 0 章節地圖

<div class="ddia-chapter-grid">
  <ChapterCard id="p0-basics" num="0.0" title="三分鐘看懂後端世界" summary="給沒寫過後端的人：一張全景圖 + 10 個最基本的詞" link="/part-0/basics" :read-time="3" />
  <ChapterCard id="p0-intro" num="0.1" title="為什麼需要資料密集系統" summary="從一個簡單後端講起：stateless、典型元件、為什麼需要 DDIA" link="/part-0/intro" :read-time="12" />
  <ChapterCard id="p0-metrics" num="0.2" title="衡量指標素養" summary="QPS / Latency / P99 / Tail Latency / SLA/SLO —— Ch1 的銜接點" link="/part-0/metrics" :read-time="18" />
  <ChapterCard id="p0-sql" num="0.3" title="SQL 與關聯模型速覽" summary="SELECT / JOIN / 索引 / 交易直覺" link="/part-0/sql" :read-time="30" />
  <ChapterCard id="p0-os" num="0.4" title="作業系統地基" summary="行程、執行緒、虛擬記憶體、page cache、fsync" link="/part-0/os" :read-time="25" />
  <ChapterCard id="p0-net" num="0.5" title="網路地基" summary="TCP/IP、HTTP、RPC、延遲 vs 頻寬、partial failure" link="/part-0/network" :read-time="22" />
  <ChapterCard id="p0-ds" num="0.6" title="資料結構地基" summary="Hash、B-Tree、外部排序、Big-O" link="/part-0/data-structures" :read-time="25" />
  <ChapterCard id="p0-concur" num="0.7" title="並行控制直覺" summary="Race condition、lock、原子性、隔離級別" link="/part-0/concurrency" :read-time="20" />
</div>

::: info Part 0 與 12 章主進度的關係
Part 0 是**選讀補強**，**不計入** 12 章的整體進度（Dashboard 顯示「X / 12」永遠指主章節）。你可以在 Part 0 各章末單獨標記已讀，但它們不會拉高你的「整體進度 %」。
:::

## 設計原則

- **不重寫別人的內容**：每章末尾用「想更深入？」框連結到 OSTEP、Beej's Guide、Postgres Tutorial 等優質免費資源，這裡只給「DDIA 視角下你必須懂的部分」。
- **直接綁定 DDIA 章節**：每個概念都附「Ch X 哪一段會用到」，避免知識懸空。
- **可跳讀**：7 章之間沒有依賴關係，按需要挑著看。

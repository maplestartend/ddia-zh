---
layout: page
title: 首頁
---

<div class="ddia-hero">
  <h1>Designing Data-Intensive Applications</h1>
  <div class="ddia-hero-subtitle">設計資料密集型應用 · 一個人讀完整本書的筆記</div>
  <div class="ddia-hero-meta">十二章 &nbsp;·&nbsp; Part I / II / III &nbsp;·&nbsp; 約 40 小時</div>
  <div class="ddia-cta-row">
    <BaseLink to="/part-0/basics" variant="primary">新手起步 · 0.0 三分鐘看懂後端</BaseLink>
    <BaseLink to="/part-1/ch01-reliable" variant="ghost">已熟悉 SQL／後端 · 直接讀 Ch 1 →</BaseLink>
  </div>
  <div class="ddia-hero-disclaimer">
    本網站<strong>非</strong> Martin Kleppmann 或 O'Reilly Media 官方授權產品。原書著作權屬原作者與出版社；本站為個人非商業學習筆記，請至 <a href="https://dataintensive.net/" target="_blank" rel="noopener">dataintensive.net</a> 支持原作。
  </div>
</div>

<div style="max-width: 1100px; margin: 0 auto; padding: 0 24px;">

<Dashboard />

::: tip 第一次接觸資料系統？
DDIA 假設讀者已熟悉 SQL、後端服務、作業系統與網路基礎。如果你對「P99 延遲、JOIN、fsync、TCP partial failure、race condition」**其中任兩個以上**感到陌生，建議先看 **[Part 0 前置知識](/part-0/)**（選讀，但能省下後續每章 30% 的卡關時間）。**完全沒寫過後端？** 直接從 [**0.0 三分鐘看懂後端**](/part-0/basics) 起步、不會卡住。

已熟悉？直接從下方 Ch1 開始。
:::

<div class="ddia-part-header">
  <div class="ddia-part-header-title">
    <div>
      <h2 data-eyebrow="Part I">資料系統基礎</h2>
      <p>單機資料系統的核心概念：可靠性、資料模型、儲存引擎、編碼格式</p>
    </div>
  </div>
</div>

<div class="ddia-chapter-grid">
  <ChapterCard id="ch01" num="CH 01" title="可靠、可擴展、可維護的應用" summary="什麼讓系統「可靠」？「擴展」是要擴展什麼？為什麼平均延遲是騙人指標？" link="/part-1/ch01-reliable" :read-time="35" />
  <ChapterCard id="ch02" num="CH 02" title="資料模型與查詢語言" summary="為什麼有 SQL、文件、圖三種模型？什麼時候各自勝出？" link="/part-1/ch02-data-models" :read-time="40" />
  <ChapterCard id="ch03" num="CH 03" title="儲存與檢索" summary="為什麼 LSM-Tree 與 B-Tree 在不同負載下勝負互換？OLTP 與 OLAP 為何走向不同引擎？" link="/part-1/ch03-storage" :read-time="45" />
  <ChapterCard id="ch04" num="CH 04" title="編碼與演進" summary="API 升版怎麼不打到舊客戶？JSON / Protobuf / GraphQL / tRPC 各有什麼坑？" link="/part-1/ch04-encoding" :read-time="35" />
</div>

<div class="ddia-part-header">
  <div class="ddia-part-header-title">
    <div>
      <h2 data-eyebrow="Part II">分散式資料</h2>
      <p>跨機器的資料分布：複製、分區、交易、共識——分散式系統的核心難題</p>
    </div>
  </div>
</div>

<div class="ddia-chapter-grid">
  <ChapterCard id="ch05" num="CH 05" title="複製 Replication" summary="為什麼 read replica 有時讀到舊資料？多副本怎麼最終一致？" link="/part-2/ch05-replication" :read-time="55" />
  <ChapterCard id="ch06" num="CH 06" title="分區 Partitioning" summary="資料量大到單機撐不下怎麼辦？分片後跨分片查詢怎麼處理？" link="/part-2/ch06-partitioning" :read-time="40" />
  <ChapterCard id="ch07" num="CH 07" title="交易 Transactions" summary="並發改同一筆資料怎麼避免丟錢？ACID 各家 DB 到底實作多少？" link="/part-2/ch07-transactions" :read-time="60" />
  <ChapterCard id="ch08" num="CH 08" title="分散式系統的麻煩" summary="服務之間網路斷一半怎麼辦？為什麼不能信任時鐘？" link="/part-2/ch08-trouble" :read-time="50" />
  <ChapterCard id="ch09" num="CH 09" title="一致性與共識" summary="怎麼讓 N 台機器對一個值達成共識？線性一致到底有多貴？" link="/part-2/ch09-consistency" :read-time="65" />
</div>

<div class="ddia-part-header">
  <div class="ddia-part-header-title">
    <div>
      <h2 data-eyebrow="Part III">衍生資料</h2>
      <p>批次與串流處理：從原始資料導出新資料的兩種典範</p>
    </div>
  </div>
</div>

<div class="ddia-chapter-grid">
  <ChapterCard id="ch10" num="CH 10" title="批次處理 Batch" summary="怎麼一夜跑完 1 億筆交易？MapReduce 與 Spark / Flink 怎麼運作？" link="/part-3/ch10-batch" :read-time="55" />
  <ChapterCard id="ch11" num="CH 11" title="串流處理 Stream" summary="Kafka pipeline 怎麼設計？即時計算怎麼做到 exactly-once？" link="/part-3/ch11-streams" :read-time="55" />
  <ChapterCard id="ch12" num="CH 12" title="資料系統的未來" summary="未來的資料系統長什麼樣？端到端正確性與倫理該怎麼設計？" link="/part-3/ch12-future" :read-time="40" />
</div>

</div>

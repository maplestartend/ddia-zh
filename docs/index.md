---
layout: page
title: 首頁
---

<div class="ddia-hero">
  <h1>Designing Data-Intensive Applications</h1>
  <div class="ddia-hero-subtitle">設計資料密集型應用 · 一個人讀完整本書的筆記</div>
  <div class="ddia-hero-stats">
    <div class="ddia-hero-stat">
      <span class="ddia-hero-stat-num">40</span>
      <span class="ddia-hero-stat-label">小時讀完</span>
    </div>
    <div class="ddia-hero-stat-sep" aria-hidden="true">·</div>
    <div class="ddia-hero-stat">
      <span class="ddia-hero-stat-num">12</span>
      <span class="ddia-hero-stat-label">章</span>
    </div>
    <div class="ddia-hero-stat-sep" aria-hidden="true">·</div>
    <div class="ddia-hero-stat">
      <span class="ddia-hero-stat-num">3</span>
      <span class="ddia-hero-stat-label">Part</span>
    </div>
  </div>
  <div class="ddia-cta-row">
    <BaseLink to="/part-0/basics" variant="primary">新手起步 · 0.0 三分鐘看懂後端</BaseLink>
    <BaseLink to="/part-1/ch01-reliable" variant="ghost">已熟悉 SQL／後端 · 直接讀 Ch 1 →</BaseLink>
  </div>
  <p class="ddia-hero-colophon">
    <em>非官方個人學習筆記 · 非商業用途 · 原書著作權屬 <a href="https://www.kleppmann.com/">Martin Kleppmann</a> 與 <a href="https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/">O'Reilly</a>。詳見 <a href="https://github.com/maplestartend/ddia-zh/blob/main/LICENSE">LICENSE</a> / <a href="https://github.com/maplestartend/ddia-zh/blob/main/NOTICE.md">NOTICE</a>。</em>
  </p>
</div>

<div style="max-width: 1100px; margin: 0 auto; padding: 0 24px;">

<Dashboard />

<div class="ddia-page-note">
  <div class="ddia-page-note-eyebrow">不確定從哪起步</div>
  <p class="ddia-page-note-text">
    對「P99 延遲、JOIN、fsync、TCP partial failure、race condition」<strong>任兩個以上</strong>感到陌生 → 先讀 <BaseLink to="/part-0/"><strong>Part 0 前置知識</strong></BaseLink>（選讀、能省下後續每章 30% 的卡關時間）。<strong>完全沒寫過後端</strong>就點上面 0.0；<strong>有 SQL/後端經驗</strong>直接從下方 Ch 1 開始。
  </p>
</div>

<div class="ddia-part-header">
  <div class="ddia-part-header-title">
    <div>
      <h2 data-eyebrow="Part I">資料系統基礎</h2>
      <p>單機資料系統的核心概念：可靠性、資料模型、儲存引擎、編碼格式</p>
    </div>
  </div>
  <BaseLink to="/part-1/" extra-class="ddia-part-header-link">Part I 概覽 →</BaseLink>
</div>

<div class="ddia-chapter-grid">
  <ChapterCard id="ch01" num="CH 01" title="可靠、可擴展、可維護的應用" summary="三大設計目標的權衡：什麼是「可靠」、「擴展」要擴展什麼、為什麼平均延遲是騙人指標。" link="/part-1/ch01-reliable" :read-time="35" />
  <ChapterCard id="ch02" num="CH 02" title="資料模型與查詢語言" summary="SQL、文件、圖三種模型何時各自勝出？選錯模型撞牆的真實案例。" link="/part-1/ch02-data-models" :read-time="40" />
  <ChapterCard id="ch03" num="CH 03" title="儲存與檢索" summary="LSM-Tree 與 B-Tree 在不同負載下勝負互換；OLTP 與 OLAP 為何走向不同引擎。" link="/part-1/ch03-storage" :read-time="45" />
  <ChapterCard id="ch04" num="CH 04" title="編碼與演進" summary="API 升版不打到舊客戶的技藝——JSON / Protobuf / GraphQL / tRPC 各自的坑。" link="/part-1/ch04-encoding" :read-time="35" />
</div>

<div class="ddia-part-header">
  <div class="ddia-part-header-title">
    <div>
      <h2 data-eyebrow="Part II">分散式資料</h2>
      <p>跨機器的資料分布：複製、分區、交易、共識——分散式系統的核心難題</p>
    </div>
  </div>
  <BaseLink to="/part-2/" extra-class="ddia-part-header-link">Part II 概覽 →</BaseLink>
</div>

<div class="ddia-chapter-grid">
  <ChapterCard id="ch05" num="CH 05" title="複製 Replication" summary="read replica 有時讀到舊資料的原因；多副本最終一致的三種典範。" link="/part-2/ch05-replication" :read-time="55" />
  <ChapterCard id="ch06" num="CH 06" title="分區 Partitioning" summary="單機撐不下時的分片策略，以及跨分片查詢的常見坑。" link="/part-2/ch06-partitioning" :read-time="40" />
  <ChapterCard id="ch07" num="CH 07" title="交易 Transactions" summary="並發改同一筆資料怎麼避免丟錢——ACID 各家 DB 真實實作的差距全書最大。" link="/part-2/ch07-transactions" :read-time="60" />
  <ChapterCard id="ch08" num="CH 08" title="分散式系統的麻煩" summary="網路斷一半、時鐘會偏、節點會說謊——分散式系統的三大不可信問題。" link="/part-2/ch08-trouble" :read-time="50" />
  <ChapterCard id="ch09" num="CH 09" title="一致性與共識" summary="N 台機器對一個值達成共識的方法；線性一致的代價與必要性。" link="/part-2/ch09-consistency" :read-time="65" />
</div>

<div class="ddia-part-header">
  <div class="ddia-part-header-title">
    <div>
      <h2 data-eyebrow="Part III">衍生資料</h2>
      <p>批次與串流處理：從原始資料導出新資料的兩種典範</p>
    </div>
  </div>
  <BaseLink to="/part-3/" extra-class="ddia-part-header-link">Part III 概覽 →</BaseLink>
</div>

<div class="ddia-chapter-grid">
  <ChapterCard id="ch10" num="CH 10" title="批次處理 Batch" summary="一夜跑完 1 億筆交易的優雅——MapReduce、Spark、Flink 的運作邏輯。" link="/part-3/ch10-batch" :read-time="55" />
  <ChapterCard id="ch11" num="CH 11" title="串流處理 Stream" summary="Kafka pipeline 的設計典範；即時計算如何做到 exactly-once。" link="/part-3/ch11-streams" :read-time="55" />
  <ChapterCard id="ch12" num="CH 12" title="資料系統的未來" summary="Kleppmann 對下一代資料系統的觀察——端到端正確性與倫理的設計問題。" link="/part-3/ch12-future" :read-time="40" />
</div>

<!-- 站台 active 訊號 — 「最近更新」回訪鉤子，讀者語言、不暴露內部 review 流程 -->
<div class="ddia-recent-update">
  <div class="ddia-recent-update-eyebrow">最近更新 · 2026-05</div>
  <p class="ddia-recent-update-text">
    新增：詞彙表 ★ 7 條面試常考速跳、章首整本進度條、章末面試題改摺疊預設、首頁路徑入口卡與 PATH·01 推薦。詳見 <a href="https://github.com/maplestartend/ddia-zh/commits/main">GitHub commits</a>。
  </p>
</div>

</div>

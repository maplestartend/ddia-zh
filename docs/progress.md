---
title: 我的學習進度
---

# 我的學習進度

<Dashboard />

## 章節清單

<div class="ddia-chapter-grid">
  <ChapterCard id="ch01" num="CH 01" title="可靠、可擴展、可維護" summary="Reliability、Scalability、Maintainability" link="/part-1/ch01-reliable" :read-time="35" />
  <ChapterCard id="ch02" num="CH 02" title="資料模型與查詢語言" summary="關聯/文件/圖模型；宣告式 vs 命令式" link="/part-1/ch02-data-models" :read-time="40" />
  <ChapterCard id="ch03" num="CH 03" title="儲存與檢索" summary="LSM-Tree、B-Tree、欄式儲存" link="/part-1/ch03-storage" :read-time="45" />
  <ChapterCard id="ch04" num="CH 04" title="編碼與演進" summary="Protobuf/Avro；向前向後相容" link="/part-1/ch04-encoding" :read-time="35" />
  <ChapterCard id="ch05" num="CH 05" title="複製 Replication" summary="Leader/Follower、Multi-Leader、Leaderless" link="/part-2/ch05-replication" :read-time="55" />
  <ChapterCard id="ch06" num="CH 06" title="分區 Partitioning" summary="Sharding、二級索引、Rebalancing" link="/part-2/ch06-partitioning" :read-time="40" />
  <ChapterCard id="ch07" num="CH 07" title="交易 Transactions" summary="ACID、隔離級別、Snapshot Isolation" link="/part-2/ch07-transactions" :read-time="60" />
  <ChapterCard id="ch08" num="CH 08" title="分散式系統的麻煩" summary="網路、時鐘、Process Pause" link="/part-2/ch08-trouble" :read-time="50" />
  <ChapterCard id="ch09" num="CH 09" title="一致性與共識" summary="Linearizability、2PC、Raft" link="/part-2/ch09-consistency" :read-time="65" />
  <ChapterCard id="ch10" num="CH 10" title="批次處理 Batch" summary="MapReduce、Spark、Join 策略" link="/part-3/ch10-batch" :read-time="55" />
  <ChapterCard id="ch11" num="CH 11" title="串流處理 Stream" summary="Kafka、CDC、Event Sourcing" link="/part-3/ch11-streams" :read-time="55" />
  <ChapterCard id="ch12" num="CH 12" title="資料系統的未來" summary="Lambda/Kappa、Unbundling、倫理" link="/part-3/ch12-future" :read-time="40" />
</div>

::: tip 進度怎麼運作
- 你的進度與測驗紀錄都存在**瀏覽器的 localStorage**（不上傳任何資料）
- 換瀏覽器或清快取會遺失，必要時可手動備份
- 每章底部的「標記為已讀完」按鈕會更新此頁的儀表板
:::

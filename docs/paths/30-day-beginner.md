---
title: 初學者 30 天暑假計畫
---

<ChapterMeta part="學習路徑" :read-time="15" difficulty="入門" :tags="['初學者', '高中生', '大二生', '自學']" />

# 初學者 30 天暑假計畫

這份計畫是給「**第一次學分散式系統**」的讀者用的——高中自學、大學資工大二、bootcamp 學員、轉職新手都適用。**30 天每天 1-2 小時、能讀完 Part 0 + 主課程的「最小可用版」**。

::: tip 計畫前提
- 假設你已熟 SQL 基礎（不熟先看 [0.3 SQL 速覽](/part-0/sql)）
- 每天 1-2 小時、共 30 天約 35-50 小時
- 走 [`<FirstReadShortcut>`](/part-2/ch07-transactions) 標的「**必讀核心**」路徑、第一次可跳節先放生
- 答錯 Quiz / PartCheckpoint 不重要、**目的是建立 mental map、不是考過**
:::

## 第 1 週：暖身 + 入口（Part 0 + Ch1-Ch2）

| 天數 | 章節 | 重點 |
|---|---|---|
| Day 1-2 | [0.0 三分鐘看懂後端](/part-0/basics) + [0.1 為什麼需要資料密集](/part-0/intro) | 建立後端世界觀 |
| Day 3 | [0.2 衡量指標](/part-0/metrics) | P50/P99/SLO 必精讀 |
| Day 4-5 | [0.3 SQL 速覽](/part-0/sql) + [0.4 資料結構](/part-0/data-structures) | 補底子 |
| Day 6 | [0.5 OS](/part-0/os) + [0.6 網路](/part-0/network) + [0.7 並行](/part-0/concurrency) | 快速掃過、用到再回頭 |
| Day 7 | [Ch1 可靠 / 可擴展 / 可維護](/part-1/ch01-reliable) | 全書三軸、必精讀 |

## 第 2 週：單機資料系統（Ch2-Ch4）

| 天數 | 章節 | 重點 |
|---|---|---|
| Day 8-9 | [Ch2 資料模型](/part-1/ch02-data-models) | SQL vs 文件 vs 圖 |
| Day 10-11 | [Ch3 儲存](/part-1/ch03-storage) | B-Tree vs LSM-Tree（蝦皮搜尋會用） |
| Day 12-13 | [Ch4 編碼](/part-1/ch04-encoding) + §4.4.4 服務邊界 | Protobuf 演進、微服務粒度 |
| Day 14 | [PartCheckpoint I](/part-1/ch04-encoding#part-i-checkpoint) | 自評是否能進 Part II |

## 第 3 週：分散式資料 — 死亡三章（Ch5-Ch9 走 FRS 路徑）

⚠️ **這週是全書最硬**。請務必走 `<FirstReadShortcut>` 的「**必讀核心**」、不要硬啃可跳節。

| 天數 | 章節 | 路徑 |
|---|---|---|
| Day 15-16 | [Ch5 複製](/part-2/ch05-replication) | FRS 路徑、§5.5 leaderless 細節可跳 |
| Day 17 | [Ch6 分區](/part-2/ch06-partitioning) | FRS 路徑、台鐵訂票場景 |
| Day 18-19 | [Ch7 交易](/part-2/ch07-transactions) | FRS 路徑、§7.2 末 phantom + §7.3 SSI 環細節可跳 |
| Day 20 | [Ch8 麻煩](/part-2/ch08-trouble) | FRS 路徑、§8.4 lease 細節 + §8.5 拜占庭可跳 |
| Day 21 | [Ch9 一致性](/part-2/ch09-consistency) | FRS 路徑、80% 讀者首次跳 §9.5 後半 + §9.6 |

## 第 4 週：衍生資料 + 收束（Ch10-Ch12）

| 天數 | 章節 | 重點 |
|---|---|---|
| Day 22-23 | [Ch10 批次](/part-3/ch10-batch) | FRS 路徑、§10.3 MapReduce 細節可跳 |
| Day 24-25 | [Ch11 串流](/part-3/ch11-streams) | §11.6 Stripe idempotency 必讀（面試常考） |
| Day 26-27 | [Ch12 未來](/part-3/ch12-future) | unbundling + 倫理 |
| Day 28 | [PartCheckpoint III](/part-3/ch12-future#part-iii-checkpoint) | 自評 |
| Day 29 | 詞彙表掃 [7 條面試常考 ★](/glossary/) | CQRS / Saga / Linearizability / Quorum / Idempotent / Exactly-Once / EDW |
| Day 30 | 寫一份 [ADR](/paths/adr-template) | 把學到的 trade-off 落到一份決策文件 |

## 卡關時的「擱置 → 後續」策略

**讀不下去**很正常。把卡住的章節先**標 `TODO 後續再讀`**、繼續往下推、不要停在原地。Ch7-9 是 80% 讀者首次跳細節的章節、不需要一次吃透。

**最低成功標準**（30 天結束時）：
- 能用「Reliability / Scalability / Maintainability」三軸描述任何系統
- 能說清「為什麼 LSM-Tree 寫快、B-Tree 讀快」
- 能解釋「Quorum W+R>N 在多 writer 下為什麼還不保證讀到最新」
- 能寫一份 ADR、列出至少 3 個 alternatives
- 看 [glossary 7 條 ★](/glossary/) 不會卡

**超出版本**（30 天有餘力）：
- 把 Ch7 / Ch8 / Ch9 的可跳節回頭吃完
- 做完所有章末 Quiz interview 級題目
- 對應自己工作 / 學校作業寫 3-5 份 ADR

## 與其他學習路徑的關係

| 路徑 | 對象 | 時長 |
|---|---|---|
| **本頁（30 天初學者版）** | 高中 / 大二 / bootcamp 新手 | 30 天 × 1-2 小時 |
| [面試準備](/paths/interview-cheatsheet) | 求職前 1-4 週工程師 | 1-4 週 |
| [完整自學進度](/paths/) | 想精讀全書 12 章 | 2-3 個月 |

::: tip 寫給未來的你
30 天後回頭看這頁、把「真的有跑完」打勾 ✓、「擱置」改成 `TODO`。**完成 ≥ 80% = 你已經比 90% 工程師更懂分散式系統的設計取捨**。
:::

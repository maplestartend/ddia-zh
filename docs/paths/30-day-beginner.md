---
title: 初學者 30 天暑假計畫
---

<ChapterMeta part="學習路徑" :read-time="15" difficulty="入門" :tags="['初學者', '高中生', '大二生', '自學']" />

# 初學者 30 天暑假計畫

這份計畫是給「**第一次學分散式系統**」的讀者用的——高中自學、大學資工大二、bootcamp 學員、轉職新手都適用。**建議節奏：每天 1-2 小時、彈性 30-45 天讀完 Part 0 + 主課程的「最小可用版」**——讀超過 30 天是正常的、走不下去先跳是設計。

::: tip 計畫前提（讀之前先看這段）
- **每天能投入時間**：1-2 小時最舒服、能擠到 2-3 小時可走快版。**完全沒時間？直接看 [兩週速成](/paths/#path-2week)**
- **彈性節奏**：30 天是「比較快的版本」、**多花到 45 天甚至 60 天也是正常的**——只要每週能往前推 2-3 章就 OK
- **SQL 基礎**：若還不熟 `SELECT/JOIN/INDEX` 先看 [0.3 SQL 速覽](/part-0/sql)、其他 Part 0 章節「卡了就跳」
- **走章首 [「第一次讀建議路徑」](/part-2/ch07-transactions) 框的「必讀核心」**、可跳節（如 §5.5 leaderless 細節、Ch9 後半 §9.5 §9.6）**第一次直接放生**
- **Quiz / PartCheckpoint 答錯沒關係**——目的是建立 mental map、不是考過。**答錯題卡 1 分鐘就跳、Quiz 結束才看正解**
:::

::: info 卡關預警：60% 讀者會在 Ch5-Ch9 跌一跤
**Part 2（Ch5-Ch9）公認是全書最硬的一段**——複製、分區、交易、分散式麻煩、共識五座大山連發。**如果讀到一半放棄整本書、80% 是在這 5 章其中一章**。本計畫第 3 週用每章章首的「第一次讀建議路徑」把每章砍到「必讀核心」、就是為了讓你能撐過去。**卡關時用下方「擱置策略」、不要在原地耗**。
:::

> **W47 改 Week 顆粒**：原版列「Day 1 / Day 2 / Day 3...」會被讀者當截止日（anchoring bias）、跟「彈性節奏」自相矛盾。現在改成週進度 + 預期區間、拿掉 Day 字。

## 第 1 週 · 暖身 + 入口（Part 0 階段 A + Ch1-Ch2）｜預期 5-10 天

順序依序推進、卡了跳：

1. [0.0 三分鐘看懂後端](/part-0/basics) + [0.1 為什麼需要資料密集](/part-0/intro)（建立後端世界觀）
2. [0.2 衡量指標](/part-0/metrics)（P50/P99/SLO 必精讀）
3. [0.3 SQL 速覽](/part-0/sql)（補底子）
4. [Part 0 階段 B（0.4-0.7）](/part-0/) — **沒念過 CS 可整段先跳、進 Ch1 卡再回**
5. [Ch1 可靠 / 可擴展 / 可維護](/part-1/ch01-reliable) — 全書三軸、必精讀

## 第 2 週 · 單機資料系統（Ch2-Ch4）｜預期 5-10 天

1. [Ch2 資料模型](/part-1/ch02-data-models)（SQL vs 文件 vs 圖）
2. [Ch3 儲存](/part-1/ch03-storage)（B-Tree vs LSM-Tree、蝦皮搜尋會用）
3. [Ch4 編碼](/part-1/ch04-encoding) + §4.4.4 服務邊界（Protobuf 演進、微服務粒度）
4. [PartCheckpoint I](/part-1/ch04-encoding#part-i-checkpoint) — 自評是否能進 Part II

## 第 3 週 · 分散式資料 — 死亡五章（Ch5-Ch9 走 FRS 路徑）｜預期 10-15 天

⚠️ **這週是全書最硬**。請務必走章首「第一次讀建議路徑」框的「**必讀核心**」、不要硬啃可跳節。**這週讀超過 15 天是常態、不是落後**。

1. [Ch5 複製](/part-2/ch05-replication) — FRS 路徑、§5.5 leaderless 細節可跳
2. [Ch6 分區](/part-2/ch06-partitioning) — FRS 路徑、台鐵訂票場景
3. [Ch7 交易](/part-2/ch07-transactions) — FRS 路徑、§7.2 末 phantom + §7.3 SSI 環細節可跳
4. [Ch8 麻煩](/part-2/ch08-trouble) — FRS 路徑、§8.4 lease 細節 + §8.5 拜占庭可跳
5. [Ch9 一致性](/part-2/ch09-consistency) — FRS 路徑、80% 讀者首次跳 §9.5 後半 + §9.6

## 第 4 週 · 衍生資料 + 收束（Ch10-Ch12）｜預期 5-10 天

1. [Ch10 批次](/part-3/ch10-batch) — FRS 路徑、§10.3 MapReduce 細節可跳
2. [Ch11 串流](/part-3/ch11-streams) — §11.6 Stripe idempotency 可選（卡了先跳）
3. [Ch12 未來](/part-3/ch12-future) — unbundling + 倫理
4. [PartCheckpoint III](/part-3/ch12-future#part-iii-checkpoint) — 自評
5. 詞彙表掃 [7 條面試常考 ★](/glossary/) — CQRS / Saga / Linearizability / Quorum / Idempotent / Exactly-Once / EDW
6. 寫一份 [ADR](/paths/adr-template) — 把學到的 trade-off 落到一份決策文件

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

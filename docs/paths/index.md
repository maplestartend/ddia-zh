---
title: 學習路徑
---

# 學習路徑 Learning Paths

不同角色 / 不同目標的人，閱讀順序與重點不同。下面這些路徑都是經過設計、可以省下你 30% 時間的閱讀地圖。**第一次來的多數讀者** —— 從下方「兩週速成」的「純後端 CRUD 經驗」路徑開始即可，不必硬挑角色版。

::: tip 開始之前：先做 10 秒自評
**對下列任一題目答不出來嗎？** 建議先讀 [Part 0 前置知識](/part-0/)，省下後續每章 30% 的卡關時間。

- 為什麼 P99 延遲比平均延遲更能反映使用者體驗？
- `SELECT u.name, COUNT(o.id) FROM users u LEFT JOIN orders o ON o.user_id = u.id GROUP BY u.id` 這個查詢做什麼？
- 行程（process）與執行緒（thread）的差別？fsync 為什麼存在？
- TCP「可靠」是什麼意思？網路 partial failure 有哪些情境？
- 兩個執行緒同時對銀行帳戶 +100 為什麼會丟錢？
- B-Tree 與 LSM-Tree 的根本差異？

完整自評題與對應章節 → [Part 0 入口](/part-0/)。**全部都不熟也沒關係 —— 大多數讀者第一次來都不熟、所以才有 Part 0**。
:::

---

## 兩週速成：先把這條當預設 {.role-h2 .icon-bolt}

如果你只有兩週（或還在猶豫要不要讀完），**先確認你是否屬於下列其中一群**：

### 純後端 CRUD 經驗、沒碰過分散式（多數讀者落在這）

```
Ch1 → Ch2 → Ch3 → Ch7 → Ch5 → Ch8 → Ch11（淺讀）
```

七章覆蓋全書 80% 的洞見 —— **不必逼自己讀 12 章才開始有收穫**。

- **Ch9 標為「進階追加」**：它是全書最硬的章，沒有 Ch5 / Ch7 / Ch8 紮實底子很容易在這裡放棄。建議讀完 Part II 其他章 + 配 [Raft 視覺化動畫](https://raft.github.io/)再回頭。
- Ch11 若沒實際用過 Kafka，建議只讀 11.1 與 11.2，其餘等用到再回頭。

::: tip 為何順序這樣排
Ch7（交易）排在 Ch5（複製）之前 —— 因為「ACID、隔離級別」對 CRUD 後端的日常更貼近；複製延遲與 quorum 概念在你需要時自然會回來補。
:::

Ch2/4/6/10/12 之後行有餘力再補。

### 已有分散式系統基礎（讀過 Raft 動畫、用過 Kafka）

```
Ch1 → Ch3 → Ch5 → Ch7 → Ch8 → Ch9 → Ch11
```

七章覆蓋全書 80% 的洞見。

---

## 後端工程師：聚焦交易與一致性 {.role-h2 .icon-code}

**目標**：把 ORM/DB 的黑盒打開，理解你每天寫的 query 背後發生什麼。

```
Ch1 → Ch2 → Ch3 → Ch7 → Ch5 → Ch6 → Ch4 → Ch8 → Ch9 → Ch11
```

| 順序 | 章節 | 為什麼這時候 |
|---|---|---|
| 1 | [Ch1 可靠性](/part-1/ch01-reliable) | 基礎詞彙 |
| 2 | [Ch2 資料模型](/part-1/ch02-data-models) | 你每天在做的事 |
| 3 | [Ch3 儲存與檢索](/part-1/ch03-storage) | 理解 EXPLAIN 在說什麼 |
| 4 | [Ch7 交易](/part-2/ch07-transactions) | **最該優先讀的章節** |
| 5 | [Ch5 複製](/part-2/ch05-replication) | 為什麼 read replica 有時讀到舊資料 |
| 6 | [Ch6 分區](/part-2/ch06-partitioning) | 大規模系統的必修 |
| 7 | [Ch4 編碼](/part-1/ch04-encoding) | API 設計與版本演進 |
| 8 | [Ch8 分散式麻煩](/part-2/ch08-trouble) | 拓寬視野 |
| 9 | [Ch9 一致性與共識](/part-2/ch09-consistency) | 如果你會碰到 etcd / ZK |
| 10 | [Ch11 串流](/part-3/ch11-streams) | 如果用 Kafka |

**可跳讀**：Ch10（除非碰大資料 / 海量資料處理）、Ch12

::: warning Ch9 是全書最硬的章——後端路徑可選後置
Ch9（共識、線性一致、FLP、Paxos / Raft）公認是 DDIA 最難啃的章——沒有 Ch5 / Ch7 / Ch8 紮實底子的人容易在這放棄。**建議**：(1) 先讀 Ch5 → Ch7 → Ch8 三章紮實後再回頭、(2) 配 [Raft 視覺化動畫](https://raft.github.io/) 看完一遍再讀文字、(3) 若日常工作不直接碰 etcd / ZooKeeper / Spanner 可先**淺讀** §9.1 線性一致與 §9.4 共識的等價洞見、跳過 Paxos 細節。
:::

**預估時間**：約 25–30 小時

---

## 資料工程師：聚焦資料流與批/串流 {.role-h2 .icon-analytics}

**目標**：能設計現代資料平台（DWH、CDC pipeline、即時分析）。

::: tip 第 0 步：先讀 [OLTP↔DE 視角橋](/bridges/oltp-de)
**還沒看過這頁的 DE 強烈建議先讀**——用 4 小時建立 OLTP 概念到 DE 場景的對應（lost update ↔ idempotent consumer、quorum ↔ Kafka ISR 等 11 條），後續每章節省 30% 卡關時間。
:::

```
Ch1 → Ch3 → Ch4 → Ch10 → Ch11 → Ch5 → Ch6 → Ch2 → Ch12
```

| 順序 | 章節 | 為什麼這時候 |
|---|---|---|
| 1 | [Ch1 可靠性](/part-1/ch01-reliable) | 基礎 |
| 2 | [Ch3 儲存與檢索](/part-1/ch03-storage) | OLTP vs OLAP 是你的工作 |
| 3 | [Ch4 編碼](/part-1/ch04-encoding) | Schema 演進是日常 |
| 4 | [Ch10 批次處理](/part-3/ch10-batch) | Spark/Hadoop 的核心 |
| 5 | [Ch11 串流處理](/part-3/ch11-streams) | Kafka/Flink 的核心 |
| 6 | [Ch5 複製](/part-2/ch05-replication) | DWH 副本與 CDC 來源 |
| 7 | [Ch6 分區](/part-2/ch06-partitioning) | 分區設計影響效能 |
| 8 | [Ch2 資料模型](/part-1/ch02-data-models) | 補強 |
| 9 | [Ch12 未來](/part-3/ch12-future) | Lambda/Kappa/Unbundling 是你的世界 |

**可跳讀（選讀）**：Ch7（除非碰 OLTP）、Ch8、Ch9

**預估時間**：約 25–30 小時

---

## 系統架構師：完整深讀 {.role-h2 .icon-account_tree}

**目標**：能就任何資料系統做出有依據的架構決策。

```
線性順序：Ch1 → Ch2 → Ch3 → Ch4 → Ch5 → Ch6 → Ch7 → Ch8 → Ch9 → Ch10 → Ch11 → Ch12
```

**重點章節**（值得讀兩遍 + 做練習）：
- [Ch7 交易](/part-2/ch07-transactions)
- [Ch8 分散式系統的麻煩](/part-2/ch08-trouble)
- [Ch9 一致性與共識](/part-2/ch09-consistency)
- [Ch12 未來](/part-3/ch12-future)

::: warning Ch9 是全書最硬的章——預期會卡關
Ch9 用線性順序時間落在第 9 步、底子最足、但仍是公認最難啃的章（共識、FLP、Paxos / Raft 對沒接觸過分散式背景的讀者極度抽象）。架構師路徑**接受**這個學習曲線、但建議配套：(1) 配 [Raft 視覺化動畫](https://raft.github.io/) 看完一遍再讀文字、(2) §9.1 線性一致與 §9.3 共識的「**全序廣播 ≡ 線性一致儲存 ≡ 共識**」等價洞見**讀兩遍以上**、(3) Paxos 細節不必第一遍就懂、等實作時回查即可。
:::

**預估時間**：40–50 小時，建議拉成 **8–12 週**消化（每週 1 章）。

---

## 面試準備：3 週系統設計面試衝刺 {.role-h2 .icon-rocket_launch}

**目標**：在白板前能回答後端 / SRE 系統設計面試題、能列出常見題目背後對應的 DDIA 章節。

**為什麼這條路徑單獨拉出來**：上面三條目標是「理解系統」，這條目標是「**面試官問到能講清楚**」。閱讀策略不同——你會跳讀概念、強化測驗、重複錯題本。

```
Ch1（基礎詞彙）→ Ch2 + Ch6（資料模型 + 分區，常考系統設計）→ Ch5（複製，consistency 模型）
→ Ch7（交易，ACID/隔離級別，必問）→ Ch9（共識，Raft/Paxos 常考）
→ Ch11（Kafka + EOS，現代系統題型）→ Ch12（架構演進）
```

| 週次 | 章 | 面試考點對應 |
|---|---|---|
| 第 1 週 | Ch1 + Ch2 + Ch6 | 「設計一個短網址服務 / Twitter feed」題型基底（負載描述、資料模型選型、分區策略） |
| 第 2 週 | Ch5 + Ch7 | 「跨 DC 的按讚計數」題（consistency 模型）+「轉帳系統」題（隔離級別、lost update）|
| 第 3 週 | Ch9 + Ch11 + Ch12 | 「分散式 KV 怎麼選 leader」「設計即時通訊」「Lambda vs Kappa」題型 |

::: warning Ch9 面試準備策略：抓「等價洞見 + Raft 動畫」、不必啃 Paxos 證明
Ch9 雖列為第 3 週重點、但**面試準備不必啃 Paxos 嚴謹證明**——時間有限、性價比低。面試官常考的 Ch9 概念集中在：(1) **線性一致 vs 序列化** 差異（用「Spanner 提供強保證、Cassandra 是 eventual」這種對比舉例）、(2) **CAP 三選二是迷思**、實際是 CP vs AP、(3) **Raft 選舉與 log replication** 的高層流程（看 [Raft 動畫](https://raft.github.io/) 比讀文字快 5 倍）。**先把這三點吃透、Paxos 細節等真的被追問 split brain 再回頭補**。
:::

**並行做**（每天 30 分鐘）：
- **每章必做 Quiz、把答錯題標進「錯題本」**（progress 頁可看）
- **章末「我的筆記」記下**：「這章 → 對應面試題 X」「公司 Y 問過」
- **匯出 Cheat Sheet**（progress 頁底部）：面試前一晚印出帶去複習
- **SRS 複習提醒**：progress 頁的「該複習的章節」每 1d/3d/7d 自動把舊章拉回來

**配套資源**：
- 系統設計面試題庫：[System Design Interview - Alex Xu](https://www.amazon.com/dp/B08CMF2CQF)（Vol. 1 / 2）
- 「DDIA 章節 → 面試題」對應表：手繪「我看完 Ch7 能回答的問題清單」放筆記、考前掃過

**預估時間**：每天 1.5 小時 × 21 天 = 30 小時左右。比「系統架構師路徑」短、但 Quiz / 筆記 / 重複頻率更高。

---

## 配套資源 {.role-h2 .icon-library_books}

::: tip 面試準備路徑專用
[**面試題速查表 · 系統設計題 ↔ DDIA 章節對應**](/paths/interview-cheatsheet) ——News Feed、轉帳、即時通訊、分散式 KV 等 8 道經典系統設計面試題對映到 DDIA 哪幾章哪幾節、配「面試官可能追問的尾刀」。讀完每章後回來自測 5 分鐘、講不出來就回去再讀。
:::

| 資源 | 用途 |
|---|---|
| [Raft 視覺化](https://raft.github.io/) | 配 Ch9 |
| [How NOT to Measure Latency (Gil Tene)](https://www.youtube.com/watch?v=lJ8ydIuPFeU) | 配 Ch1 |
| [Aphyr's Jepsen analyses](https://jepsen.io/analyses) | 配 Ch5/7/9 |
| [Kafka: a Distributed Messaging System](https://www.microsoft.com/en-us/research/wp-content/uploads/2017/09/Kafka.pdf) | 配 Ch11 |
| [Awesome DDIA References](https://github.com/ept/ddia-references) | 全書引用列表（作者整理） |

---

## 學習方法建議

::: tip 主動學習 > 被動閱讀
1. **讀前看 TL;DR**：建立預期框架，閱讀效率倍增
2. **每章必做測驗**：5 題能讓 1 個月後仍記得 60% 以上（測試效應）
3. **手做一個練習**：選一個章末練習實際動手，比讀十遍還深刻
4. **寫成自己的話**：每讀完一章，用 200 字總結給「你的同事」聽 —— 不能解釋的就是還沒懂
:::

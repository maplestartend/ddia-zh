---
title: Ch1 可靠、可擴展、可維護的應用
description: DDIA 第 1 章 — Reliability、Scalability、Maintainability 三大設計目標
---

<ChapterOpener chapter-id="ch01" />

<ChapterMeta part="Part I 資料系統基礎" :read-time="35" deep-read-range="60-90" difficulty="入門" :tags="['SLA', 'P99', '負載']" />

<PrereqBox
  :prereq="['基本網頁服務概念（HTTP、QPS）', '若完全沒接觸過 P99 / SLO 概念、建議先讀 [Part 0.2 度量與分布](/part-0/metrics)']"
  first-read-hint="**60-90 分鐘**——這章是全書世界觀的基底，多花時間吃透 P99 / fan-out / fault vs failure 三組詞會讓後續所有章節讀起來省一半力氣"
  :skippable="['§1.3 Twitter fan-out on write 詳細數學（記得結論：寫時放大讀時節省、超級大 V 改成讀時 query 混合策略即可）']"
/>

<TLDR :points='[
  "<strong>三大設計目標</strong>：Reliability（可靠）、Scalability（可擴展）、Maintainability（可維護）—— 不是非黑即白的指標，而是需要持續權衡的方向。",
  "<strong>故障 ≠ 失效</strong>：Fault（單元故障）必然發生，目標是讓系統整體不失效（Failure）。容錯的核心是「主動製造故障」並驗證恢復。",
  "<strong>負載必須用具體參數描述</strong>：Twitter「家庭時間軸」顯示，相同 QPS 在不同負載模型下會有截然不同的擴展瓶頸。",
  "<strong>延遲要用 percentile、不要用平均</strong>：P50 / P95 / P99 / P999 才能反映尾端使用者的體驗。",
  "<strong>P999 不是隨機慢請求、是高價值客戶的常態</strong>：Amazon 觀察消費量最大的客戶通常落在尾端（資料量大、查詢更耗時、分布偏右）。",
  "<strong>可維護性三要素</strong>：Operability（維運友善）、Simplicity（控制複雜度）、Evolvability（易於演進）。"
]' />

## 1.1 為什麼這三個目標？

現代應用大多是**資料密集型**（data-intensive）而非**計算密集型**（compute-intensive）—— 瓶頸在「資料量、資料複雜度、資料變化速度」，而非 CPU。

一個資料密集型應用通常由多個元件組成：

```
+-----------+   +-----------+   +-----------+
| Database  |   |  Cache    |   |  Search   |
+-----------+   +-----------+   +-----------+
       \           |           /
        \          |          /
         +-------- App --------+
                   |
              +----+----+
              | Message |
              |  Queue  |
              +---------+
```

我們把這些既有元件組合起來建構新系統，但組合的方式決定了系統的**可靠性、可擴展性、可維護性**。這三者構成本書貫穿始終的設計準繩。

---

## 1.2 可靠性 Reliability

> Reliability means continuing to work correctly, even when things go wrong.

### 故障 vs 失效

- <strong><G term="fault">Fault（故障）</G></strong>：一個元件偏離了規格。例如：磁碟讀取錯誤、網路封包遺失、某個<G term="process">行程</G>當機。
- **Failure（失效）**：整個系統無法向使用者提供服務。

容錯系統的目標是「**故障不導致失效**」。注意：100% 容錯是不可能的（隕石撞地球無法防），所以「容錯」通常指「某類故障」。

### 三種故障來源

| 類別 | 範例 | 應對策略 |
|---|---|---|
| **硬體故障** | 磁碟壞、記憶體出錯、停電 | 冗餘（RAID、雙電源、跨機房） |
| **軟體錯誤** | bug、記憶體洩漏、cascading failure | 隔離、process supervisor、行程重啟 |
| **人為錯誤** | 設定錯誤、誤刪資料 | 沙箱環境、快速回滾、詳細監控 |

> **重點**：Netflix 的 Chaos Monkey 主動關閉生產環境的節點，逼迫團隊把容錯做進日常工作。

::: warning Cascading Failure 經典劇本：SRE 最常遇到的 incident 形態
比硬體故障常 10 倍的、是這條鏈：

```
DB 變慢（200ms → 2s）
   ↓
應用層 timeout 觸發重試（一次變三次）
   ↓
DB connection pool 在 30 秒內耗盡
   ↓
上游 API 也因為等不到 DB 連線開始 timeout
   ↓
全站 503
```

**4 個 mitigation 工具**（記名字、production 撞到再深入）：

| 工具 | 解什麼 | 知名實作 |
|---|---|---|
| **Circuit Breaker** | 偵測下游失效率 → 快速熔斷不再呼叫 | Hystrix（已 deprecated）、Resilience4j、Sentinel |
| **Bulkhead** | 不同下游用不同連線池 / thread pool → 一個壞不會拖垮全部 | Hystrix（**已 deprecated**）用 `HystrixThreadPoolProperties` + `executionIsolationSemaphoreMaxConcurrentRequests`、Resilience4j `BulkheadConfig`（推薦） |
| **Exponential Backoff + Jitter** | 重試間隔指數增 + 加隨機抖動 → 避免「重試風暴」同步打爆下游。**Jitter 三種**（[AWS Architecture Blog 2015](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)）：full jitter（`sleep = random(0, base × 2^n)`、最隨機、推薦預設）/ equal jitter（base 一半固定 + 一半隨機）/ decorrelated jitter（前一次 sleep 影響下次、AWS SDK 內部用） | AWS SDK 預設 full jitter、Polly（.NET）支援所有三種 |
| **Load Shedding** | 流量超過某閾值就拒絕新請求（保住既有處理中的請求） | Envoy adaptive concurrency、Netflix concurrency-limits |

**為什麼這條鏈這麼常見**：DDIA 原書 Ch1 §1.2 講「軟體錯誤」+ Google SRE Book Ch22「Addressing Cascading Failures」整章都在解這個。**Cascading failure 是 SRE 值班手冊永遠的第一章**——你管的系統夠大、總有一天會撞。
:::

---

## 1.3 可擴展性 Scalability

<G term="scalability">「可擴展性」</G>不是一個系統的固有屬性（不能說「X 系統很可擴展」），而是要問：**「當負載成長為 N 倍時，這個系統如何因應？」**

### 描述負載：以 Twitter 為例（2012 年數字）

Twitter 的兩個關鍵操作（DDIA 引用 2012 年 Raffi Krikorian "Timelines at Scale" QCon 演講；現代 X 規模已**遠超**這個數量級、但**架構教訓不變**）：

1. **發推文**（write）：平均 4.6k req/s，峰值 12k req/s
2. **看家庭時間軸**（read）：300k req/s

兩種實作方式：

**方法 1：讀時 fan-out**
```sql
SELECT tweets.*, users.* FROM tweets
JOIN users   ON tweets.sender_id = users.id
JOIN follows ON follows.followee_id = users.id
WHERE follows.follower_id = current_user;
```
寫便宜，讀昂貴 → 看時間軸的 300k req/s 會打爆 DB。

**方法 2：寫時 fan-out（推播）**
每次發推文，就把它複製到每個追隨者的「家庭時間軸快取」。
- 讀便宜（O(1) 查快取）
- 寫昂貴（一條推文要寫 N 份，N = 追隨者數）

**真實世界的答案：混合策略**。普通用戶用方法 2 推播；超級大 V（千萬粉絲）用方法 1 拉取，避免 fan-out 爆炸。

> 這個例子告訴我們：**負載的描述參數選錯了，整個擴展策略就會錯**。Twitter 的關鍵參數不是 QPS，而是「每位使用者的粉絲數分布」。

::: tip 本土場景：蝦皮雙 11 直播
**蝦皮雙 11 0 點開賣**是台灣電商最大 fan-out 場景：
- **瞬時 30 萬+ QPS 寫入**（搶購下單）+ **百萬+ QPS 讀取**（庫存查詢、訂單狀態、即時聊天）
- 直播間「點愛心」「搶優惠券」是經典 broadcast：1 個主播動作 → fan-out 到數十萬觀眾畫面
- **大客戶（賣家數萬筆訂單）通常落在 P999**——因為訂單列表查詢的資料量更大、必然查得更慢（這就是 Ch1 講的 tail latency 來源）

DDIA 原書用 Twitter timeline 解釋同樣的問題，本站讀者熟悉的是蝦皮——但底層的 **「讀寫負載特性決定架構選擇」** 是同一套：要選 push（寫入時就 fan-out 到每個 follower 的 inbox）還是 pull（讀取時才聚合所有 following 的最新訊息）。
:::

### 描述性能：使用 Percentile

平均值會被極端值拉動，無法反映**最差的使用者體驗**。應使用 <G term="percentile">percentile</G>：

| 指標 | 意義 | 用途 |
|---|---|---|
| **P50（中位數）** | 一半使用者快於此值 | 一般感受 |
| **P95** | 5% 使用者慢於此值 | 多數慢使用者的體驗 |
| **P99** | 1% 使用者慢於此值 | 尾端使用者的最差體驗 |
| **P999** | 0.1% 使用者慢於此值 | Amazon 的 SLO；**消費量大的客戶資料量大、查詢更慢 → 通常落在尾端**（不是隨機）|

::: tip 頭尾延遲放大
P999 為什麼這麼重要？因為一個請求若需呼叫 100 個下游服務，**最慢的那一個**就決定整體延遲。下游 P99 = 1s（每次有 1% 機率慢過 1s），呼叫 100 次至少碰到一個慢過 1s 的機率 = 1 − 0.99¹⁰⁰ ≈ **63%**。這就是為什麼整體 P99 被尾端拉高。
:::

### 應對負載：縱向 vs 橫向

- **Scale up（縱向）**：換更強的單機。簡單但有上限。
- **Scale out（橫向）**：加更多機器。能無限擴展但**分散式系統的複雜度暴增**（這正是 Part II 的主題）。

直覺先講白話：**應用層加機器**是把「不記住任何事」的副本擺更多份，很容易（加 N 台、流量分散到 N 台就好）；**資料層加機器**要面對「**這 N 份資料怎麼同步**、**某台掛了要切換誰當主**、**寫入該往哪台**」這些問題，**很難**。

也就是 <G term="stateless">無狀態服務（stateless）</G>容易 <G term="scale-out">scale out</G>；<G term="stateful">有狀態的資料系統</G>就難很多 —— **因此 DDIA Part II 五章（Ch5 複製、Ch6 分區、Ch7 交易、Ch8 麻煩、Ch9 共識）整個都在拆解「資料層加機器」的這些難題**。看完 Part I 知道為什麼會難，Part II 才能看懂為什麼設計這麼複雜。

::: tip 實務節奏：先 scale up 推到天花板、再 scale out
DDIA 把 scale up vs scale out 寫成兩個對立選項、但實務 SRE 的決策節奏是循序、不是二選一：

**1. 先 scale up 推到單機合理天花板**
- AWS r6i.32xlarge 有 **128 vCPU / 1 TB RAM**、足以撐多數中型服務的 OLTP 工作負載（PG / MySQL 單機可達 50K+ QPS 寫入）
- **不要為了未來可能要 scale out 而過早分散式化**——分散式系統的維運成本、debug 難度、資料一致性問題遠大於一台大機器

**2. 撞到單機天花板 + 業務確認要再長 5-10× 才 scale out**

典型訊號（任一項撞牆並持續 1 週以上才算）：
- CPU 使用率 > 80%
- IOPS 接近 EBS 上限
- 單機網卡頻寬打滿
- 單機 connection pool 耗盡

**3. scale out 時優先「read replica + cache」、再「分片」**
- **read replica** 讓 OLAP / 報表 / 全文搜尋跑得到單機級資源、不擠主庫
- **cache**（Redis / Memcached）砍掉重複讀
- **只有寫入吞吐撞牆才真的 sharding**——一旦資料分了片、改 schema、跨片查詢、rebalance 都會成為長期負擔

**為什麼這個節奏重要**：過早 sharding 是 SRE 最常後悔的決定。跨片交易、re-sharding、維運複雜度是「**永久成本**」、不是「下次再說的問題」。

**著名案例**：
- **Stack Overflow**：5 億 monthly PV 用 9 台 web server + 4 台 SQL Server（2024 仍是這配置）——比多數新創公司「先上 K8s」的架構簡單 10 倍、效能好 5 倍
- **Shopify**：跑了十多年 modular monolith + Vitess 分片、才上 microservices

**「能 scale up 就不要 scale out」是 senior SRE 的默認偏見**。

**例外**：寫入量 / 資料量天生超出單機（如：全球用戶、社交圖、視訊串流元資料）—— 從一開始就要分散式架構（Ch6 / Ch7）。但「**第一年 MVP**」的場景幾乎沒有這種需求。
:::

---

## 1.4 可維護性 Maintainability

軟體成本的大部分不在開發階段，而在**維護階段**：修 bug、加功能、應付負載、了解祖傳程式碼。三大設計原則：

### Operability（維運友善）

讓維運人員容易做日常工作：
- 監控與遙測（healthy？哪裡慢？）
- 標準化的部署流程
- 良好的文件與行為一致性
- 自癒（self-healing）與可預測的失效模式

### Simplicity（簡潔，控制複雜度）

複雜度的兩種來源：
- **本質複雜度**（essential complexity）：問題本身就難
- **偶發複雜度**（accidental complexity）：實作引入的、可以消除的

對抗偶發複雜度的工具：**抽象**（abstraction），把細節隱藏在乾淨介面後面。

> 例如：高階程式語言對組合語言、<G term="sql">SQL</G> 對檔案系統 I/O —— 都是有用的抽象。

### Evolvability（可演進性）

需求一定會變。讓系統易於演進 —— 這是 Part I 後續討論 schema migration、編碼相容性的動機。

<SectionDivider icon="balance" label="關鍵權衡" />

## 1.5 三者之間的權衡

> 沒有免費的午餐。

- 高可靠性常需冗餘 → 增加成本與複雜度（傷害簡潔性）
- 高可擴展性常需 sharding → 增加維運負擔
- 過度抽象追求簡潔 → 可能犧牲性能或可觀測性

DDIA 全書其實就是在教你：**面對特定情境，如何做這些權衡**。

---

## 章末練習

::: tip 思考題
為一個社群動態（類似 Twitter timeline）設計擴展方案：
1. 假設你的應用有 100 萬使用者，平均每人 200 個追隨者，但有 100 個「網紅」擁有 1000 萬+ 粉絲。
2. 高峰時段每秒 5000 條新推文、每秒 200,000 次時間軸請求。
3. 設計一個混合策略，並估算所需的儲存量、訊息隊列吞吐量。
4. 你的設計在 P99 延遲上會是多少？瓶頸在哪？
:::

::: tip Quiz 題目分級
- **★ 核心題**（basic / applied）：走 FirstReadShortcut「最小可用版」路徑也應答得出來
- **☆ 進階題**（interview）：通常需要讀過該章「第一次可跳」的小節、面試常考；第一次答不出來沒關係、之後回頭再挑戰
:::

<Quiz chapter-id="ch01" :questions='[
  {
    difficulty: "basic",
    question: "★ 下列關於 Reliability 的敘述，何者最準確？",
    options: [
      "可靠系統就是永遠不會故障的系統",
      "可靠系統能在發生故障（fault）時仍作為整體繼續正常工作",
      "可靠系統只需在硬體層面冗餘即可",
      "可靠性與可擴展性可以同時最大化，無需權衡"
    ],
    answer: 1,
    explanation: "Fault 是元件層級的偏差，Failure 是系統層級的失效。容錯設計的目標是「故障發生時不導致失效」，而不是消除故障本身。"
  },
  {
    difficulty: "applied",
    question: "★ 為什麼用平均延遲（mean latency）來衡量系統性能不夠？",
    options: [
      "因為平均值計算太複雜",
      "因為平均值無法反映尾端使用者體驗，少量極慢請求對使用體驗影響極大",
      "因為平均延遲總是低估真實延遲",
      "因為平均值只能用於 OLTP 系統"
    ],
    answer: 1,
    explanation: "平均值被極端值拉動但隱藏了分布。P95/P99/P999 才能揭示最差使用者的體驗，而這些「尾端使用者」通常是消費高、影響大的關鍵客群。"
  },
  {
    difficulty: "applied",
    question: "★ Twitter 的「fan-out on write」（寫時推播）策略，主要解決什麼問題？",
    options: [
      "減少資料庫的儲存空間",
      "避免每次讀取時序列做昂貴的 JOIN，把讀取成本從 O(N) 降為 O(1)",
      "確保資料的強一致性",
      "降低發推文時的延遲"
    ],
    answer: 1,
    explanation: "讀取時序列原本要 JOIN follows + tweets + users，成本與追隨對象成正比。改成寫時把推文推到每個追隨者的時間軸快取，讀取只需單表查詢。代價是寫入變昂貴，且對超級大 V 不適用 —— 因此實務上採混合策略。"
  },
  {
    difficulty: "basic",
    question: "★ 下列何者屬於「偶發複雜度」（accidental complexity）？",
    options: [
      "分散式共識本身的難度",
      "為了繞過某個語言限制而寫的 workaround 程式碼",
      "需要支援多時區的業務邏輯",
      "金融交易需要原子性的需求"
    ],
    answer: 1,
    explanation: "偶發複雜度是因為實作工具或選擇而引入、可以透過更好的抽象消除的複雜度。共識難度、時區、金融原子性都是業務或物理層面的本質複雜度。"
  },
  {
    difficulty: "basic",
    question: "★ Chaos Engineering（混沌工程）的核心想法是？",
    options: [
      "讓開發者寫程式時隨機跳過測試",
      "在生產環境主動製造故障，驗證系統的容錯機制真的有效",
      "用混沌理論預測系統失效",
      "讓使用者體驗到隨機的延遲以分散負載"
    ],
    answer: 1,
    explanation: "Chaos Engineering（如 Netflix 的 Chaos Monkey）在類生產或生產環境中主動關閉節點、注入延遲、模擬網路分區，把「容錯」從紙上設計變成日常驗證 —— 因為未被觸發的容錯機制等於沒有容錯機制。多數團隊會先在 staging 跑成熟後才推到 production。"
  }
]' />

<InterviewBlock chapter-id="ch01" :questions='[
  { "tag": "系統設計", "question": "請說明你如何衡量一個 News Feed 系統的 reliability / scalability / maintainability？三個維度分別舉一個可量化指標。" },
  { "tag": "觀測性", "question": "P50 = 100ms、P99 = 2s 的服務，第 P99 個使用者比平均使用者體驗差多少？為什麼 P99 比平均值更值得監控？" },
  { "tag": "容量規劃", "question": "你公司現有後端要擴展到 10× QPS。請說明你會怎麼做容量規劃、哪些指標必須先量化、可能會撞到什麼瓶頸？" }
]' />

<ChapterNote chapter-id="ch01" />

<Progress chapter-id="ch01" />

::: info 延伸閱讀
- Netflix 的 [Chaos Engineering Principles](https://principlesofchaos.org/)
- Gil Tene 的 ["How NOT to Measure Latency"](https://www.youtube.com/watch?v=lJ8ydIuPFeU)
:::

<NextChapterBridge chapter-id="ch01" />

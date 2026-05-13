---
title: 0.2 衡量指標素養
description: QPS、Latency、P99、Tail Latency、SLA/SLO —— DDIA Ch1 的直接前置
---

# 0.2 · 衡量指標素養

<ChapterMeta part="Part 0 前置知識" :read-time="18" difficulty="入門" :tags="['QPS', 'P99', 'SLA']" />

<TLDR :points='[
  "<strong>吞吐量（Throughput）與延遲（Latency）是兩個不同的軸</strong>：前者問「每秒處理多少」、後者問「單一請求等多久」。",
  "<strong>用平均延遲彙報效能是錯的</strong>：平均被快速請求拉低、看不到尾端使用者的痛苦。要看 P50 / P95 / P99 / P999 分布。",
  "<strong>尾端延遲（tail latency）會被「扇出」（fan-out — 一個請求觸發 N 個下游、要等全部回應）放大</strong>：一個請求若打到 100 個後端各回應一次，整體延遲 = 「100 個之中最慢那個」的延遲。",
  "<strong>SLA（對外合約）vs SLO（對內目標）</strong>：違反 SLA 賠錢、違反 SLO 警報。典型寫法：「99.9% 的請求在過去 5 分鐘 P99 < 200ms」。",
  "<strong>Amazon 的觀察</strong>：延遲最差的請求往往來自帳號資料、消費量最大的高價值客戶 —— 所以把 P999 列為內部 SLO。"
]' />

## 為什麼這章是 Ch1 的前置？

DDIA 第 1 章從第三節開始就直接用「QPS」「P99」「fan-out」「SLA」這些詞，沒有給定義就拿來計算 Twitter 的負載模型。這章先把這些詞講清楚。

---

## 1) Throughput vs Latency 是兩個正交維度

最常見的混淆：

> 「我們系統很快」

「快」是什麼意思？

- **<G term="throughput">吞吐量</G>**：單位時間能處理多少請求。單位 req/s、<G term="throughput">QPS</G>、events/s、MB/s。
- **<G term="latency">延遲</G>**：單一請求從發出到收到回應的時間。單位 ms。

兩者沒有直接關係。一個極端例子：

| 系統 | Throughput | Latency |
|---|---|---|
| 銀行夜間批次：跑 1 億筆交易 | 極高（10⁸/晚） | 極高（單筆 ~8 小時） |
| 心跳監控：每 5 秒一個請求 | 極低（0.2 req/s） | 極低（10ms） |

DDIA Ch1 的 Twitter 例子裡，「4.6k req/s 發推文」是 throughput，「家庭時間軸應該在 X ms 內回應」是 latency——兩個指標要分別設定 SLO。

::: tip 一句話記住
**Throughput 是「容量」問題；Latency 是「體驗」問題。**
:::

---

## 2) 為什麼平均延遲是個騙人指標

假設你的服務 10 個請求的延遲是：

```
10, 12, 14, 11, 13, 10, 12, 11, 14, 2000   (ms)
```

- 平均 = 211 ms
- 中位數（P50）= 12 ms

如果你向老闆彙報「平均延遲 211 ms」，他會以為系統有嚴重問題。
如果你彙報「中位數 12 ms」，他會以為一切正常。

**兩個彙報都騙人。** 真相是：**9 個使用者體驗超好（10–14 ms），但有 1 個等了 2 秒**——那個人可能就是你今天會接到客訴電話的對象。

### 用 <G term="percentile">百分位數</G> 看分布

把全部請求按延遲排序，然後問：

- **P50（中位數）**：把全部請求排序後，第 50% 名那個的延遲。**典型使用者**的體驗。
- **P95**：第 95% 名。**前 5% 慢的人**有多慢。
- **P99**：第 99% 名。**前 1% 慢的人**有多慢。
- **P999**：第 99.9% 名。**前 0.1% 慢的人**有多慢——通常是你的高價值客戶（資料多、操作複雜）。

```
延遲分布（按 P99 視角看）：
                                                 ▲ P99 = 2000ms
P50 = 12ms                                       │
   │                                             │
   ▼                                             │
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
   ↑                                             ↑
   9 個典型使用者                                 1 個倒楣使用者
```

::: warning Amazon 的觀察（DDIA Ch1）
延遲最差的請求往往來自**帳號資料最多、購買也最多**的高價值客戶——他們的購物車有更多商品、推薦演算法要計算更多東西。

所以 Amazon 把 **P999 列為內部 SLO**——不能讓這群最賺錢的客戶體驗惡化。
:::

---

## 3) <G term="tail-latency">尾端延遲</G>會被 fan-out 放大

這是 DDIA Ch1 反覆強調、但很多人第一次讀會卡住的概念。

### 場景

你的首頁要顯示 100 個推薦商品。後端架構：

```
   Client
     │
     ▼
   API Gateway
     │
     ├──→ 推薦服務 A
     ├──→ 推薦服務 B
     ├──→ ... 共 100 個下游
     └──→ 推薦服務 X
```

每個下游 P99 = 200ms、P50 = 20ms。
**問題**：整體頁面延遲是多少？

### 直覺錯誤

很多人會回答「P99 = 200ms」。**錯。**

頁面要等**全部 100 個下游都回應**才能渲染（這叫 <G term="fan-out">fan-out</G>）。整體延遲 = 100 個延遲中的**最大值**。

### 機率計算

每個下游有 1% 機率落在 P99 區（≥200ms）。100 個之中**至少 1 個落在 P99 區**的機率：

```
P(至少一個慢) = 1 - P(全部都快)
            = 1 - (0.99)^100
            = 1 - 0.366
            ≈ 63%
```

**也就是說：每 3 次頁面請求，就有 2 次會卡在 200ms 以上。**

::: danger 結論
單一服務 P99 看起來很漂亮（1% 慢），但 fan-out 100 個之後，幾乎每個使用者都會被 P99 後端影響。

這叫 **tail latency amplification**。
:::

要解決就要做：
- 降低 P99（不是 P50）
- 減少 fan-out 數量
- 對慢的下游做 hedged request（同時打兩個、用先回的）

---

## 4) <G term="sla">SLA</G> 與 SLO 是兩個東西

實務上極常混用，但意義不同：

| 名詞 | 全名 | 對誰 | 違反後果 |
|---|---|---|---|
| **SLA** | Service Level **Agreement** | 對外（合約） | 賠款、退費、終止合約 |
| **SLO** | Service Level **Objective** | 對內（團隊目標） | 觸發 alert、暫停部署 |
| **SLI** | Service Level **Indicator** | 量測值本身 | 一個數字，例如「目前 P99 = 178ms」 |

### 典型寫法

> *過去 5 分鐘內，99.9% 的 `GET /api/v1/users/:id` 請求 P99 < 200ms*

拆解：
- **SLI**：P99 延遲（一個數字）
- **SLO**：< 200ms（目標閾值）
- **可靠度**：99.9% 的**時間窗口**滿足上述條件（剩 0.1% 叫 error budget）

### Error Budget 的妙用

99.9% = 一個月可以有 43 分鐘違反 SLO。

- 已經用掉 40 分鐘？**凍結部署**，先穩定再說。
- 還沒用掉？放心做激進實驗，反正有 budget。

這把「可靠性」從哲學問題變成可量化的權衡——Google SRE 書的核心觀念，DDIA Ch1 也提到。

---

## 5) 怎麼**正確**量延遲

這節是 DDIA 沒講但實務坑很多。

### 陷阱 1：平均值平均不能合併

10 台機器，每台 P99 都是 100ms。
**整體 P99 ≠ 100ms。** 也不是「100 × 10 = 1000ms」。
P99 不能用算術平均合併，要把所有 raw 樣本合起來重新排序——或用 [HdrHistogram](http://hdrhistogram.org/) 這類資料結構。

### 陷阱 2：Coordinated Omission

如果你的 load generator 用「每秒發 100 個請求」的方式跑，遇到服務慢下來時，**你會少發請求**——這讓你的延遲統計**漏掉了最慢的時段**。

正確做法：用「每 10ms 發一個請求，**不管前一個有沒有回應**」的開放式負載。Gil Tene 的演講 [How NOT to Measure Latency](https://www.youtube.com/watch?v=lJ8ydIuPFeU) 是這個主題的經典。

### 陷阱 3：在哪一層量？

```
Client → CDN → LB → API → Service → DB
```

- 在 API 那一層量：只看到應用層延遲，沒看到網路 RTT。
- 在 Client 那一層量：看到端到端延遲，但混雜了客戶網路抖動。

實務上**兩邊都量**：API 層用 P99 設 SLO，Client 端用 RUM（Real User Monitoring）看真實體驗。

---

## 6) 與 DDIA Ch1 的對應

讀完這章後，回到 [Ch1](/part-1/ch01-reliable)，你會發現：

| Ch1 段落 | 對應這章的哪個概念 |
|---|---|
| 「Twitter 4.6k req/s vs 300k req/s」 | Throughput（第 1 節） |
| 「家庭時間軸的 fan-out」 | Fan-out 與 tail latency 放大（第 3 節） |
| 「P50 / P95 / P999」 | Percentile（第 2 節） |
| 「Amazon 把 P999 列為 SLO」 | SLA / SLO 區分（第 4 節） |
| 「設計目標：Reliability、Scalability、Maintainability」 | 這三個都需要先有量化指標才能討論 |

---

## 想更深入？

| 資源 | 內容 |
|---|---|
| [Google SRE Book Ch4: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/) | SLI / SLO / SLA 的權威定義 |
| [Gil Tene: How NOT to Measure Latency (YouTube)](https://www.youtube.com/watch?v=lJ8ydIuPFeU) | 1 小時，量延遲的所有陷阱 |
| [HdrHistogram](http://hdrhistogram.org/) | 正確聚合 percentile 的開源工具 |
| [Brendan Gregg: USE Method](https://www.brendangregg.com/usemethod.html) | Utilization / Saturation / Errors，效能分析框架 |

---

## 章末測驗

<Quiz chapter-id="p0-metrics" :questions='[
  {
    "difficulty": "applied",
    "question": "你的服務 1000 個請求延遲分布如下：999 個是 10ms、1 個是 5000ms。請問平均延遲與 P99 延遲各是多少？",
    "options": [
      "平均 ≈ 15ms、P99 = 10ms",
      "平均 ≈ 15ms、P99 = 5000ms",
      "平均 = 5000ms、P99 = 5000ms",
      "平均 = 10ms、P99 = 5000ms"
    ],
    "answer": 0,
    "explanation": "平均 = (999×10 + 1×5000) / 1000 = 14.99ms。P99 = 排序後第 990 個（前 99%）的延遲 = 10ms。那個 5000ms 的請求要到 P999 才會出現。這也是為什麼只看 P99 不夠—要看 P999 才會看到真正的尾端。"
  },
  {
    "difficulty": "applied",
    "question": "某服務的 P99 延遲是 100ms。客戶端要 fan-out 給 50 個這樣的後端、等全部回應才能渲染頁面。整體頁面延遲至少落在 100ms 以上的機率最接近？",
    "options": [
      "1%（單一後端的 P99 機率）",
      "39%（1 - 0.99^50）",
      "50%（中位數推論）",
      "100%（必然發生）"
    ],
    "answer": 1,
    "explanation": "1 - (0.99)^50 ≈ 0.395 = 39.5%。Fan-out 把單一後端的「1% 罕見事件」放大成「整體 40% 概率事件」—— 這就是 tail latency amplification。降 P99 比降 P50 對 fan-out 系統更有意義。"
  },
  {
    "difficulty": "basic",
    "question": "下列哪個敘述最準確區分 SLA 與 SLO？",
    "options": [
      "SLA 對外、SLO 對內；SLA 違反通常伴隨合約賠償，SLO 違反觸發內部 alert 與行動",
      "SLA 是 P99 延遲、SLO 是平均延遲",
      "SLA 是新版本、SLO 是舊版本，意義相同",
      "SLO 是公司對外承諾，SLA 是內部目標"
    ],
    "answer": 0,
    "explanation": "SLA = Agreement（合約），對外承諾、違反賠錢；SLO = Objective（目標），對內設定、違反觸發 alert 與部署凍結。SLI 才是「目前實際量到的值」。Google SRE Book 對這三個定義最權威。"
  },
  {
    "difficulty": "interview",
    "question": "你跑 load test 量延遲，發現使用 wrk2 結果和 wrk 差很多——wrk2 報的 P99 高很多。最可能的原因是？",
    "options": [
      "wrk2 比較慢，所以延遲被放大",
      "wrk 有 Coordinated Omission 問題：服務慢下來時 wrk 也少發請求，漏量到最慢的時段",
      "兩個工具在不同協定下測試",
      "wrk2 的 percentile 演算法錯誤"
    ],
    "answer": 1,
    "explanation": "Gil Tene 開發 wrk2 就是為了解決 wrk 的 Coordinated Omission：「我等前一個請求回應才發下一個」會自動避開慢的時段，讓延遲統計失真。wrk2 用「不管回應、按固定速率發」的開放式負載，量到的數字更接近真實生產環境。"
  },
  {
    "difficulty": "interview",
    "question": "為什麼 Amazon 把 P999（而非 P99）列為內部 SLO？",
    "options": [
      "P999 比較難達成，當挑戰用",
      "因為 P999 對應的最慢使用者，往往是資料最多、消費最大的高價值客戶",
      "P99 已經被同業用，P999 比較有差異化",
      "P999 計算成本較低"
    ],
    "answer": 1,
    "explanation": "DDIA Ch1 引用 Amazon 的觀察：延遲最差的請求通常來自帳號活躍、購物車最多、推薦演算法要算最多東西的客戶 —— 他們就是 Amazon 最賺錢的人。把 P999 拉高反而傷到核心收入，所以列為 SLO。"
  }
]' />

<NextChapterBridge next-link="/part-0/sql" next-title="0.3 SQL 與關聯模型速覽">
有了 throughput / latency / P99 / SLA 的詞彙之後，下一步是補上另一個 DDIA 序言明示的硬前置：<strong>SQL 與關聯模型</strong>。Ch2、Ch7 整章都假設你會看 SQL，這章 30 分鐘給你最低門檻。

也可以直接跳到 [Ch1 可靠、可擴展、可維護](/part-1/ch01-reliable)，回頭遇到不熟的詞再回來查。
</NextChapterBridge>

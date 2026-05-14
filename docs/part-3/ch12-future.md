---
title: Ch12 資料系統的未來
---

<ChapterOpener chapter-id="ch12" />

<ChapterMeta part="Part III 衍生資料" :read-time="40" difficulty="中等" :tags="['Lambda', 'Unbundling', '倫理']" prereq="Ch10, Ch11" />

<TLDR :points='[
  "<strong>整合不同的儲存系統是這個時代的核心挑戰</strong>：一個應用通常同時依賴 OLTP DB / search / cache / warehouse —— 如何讓它們同步？",
  "<strong>「Source of truth + 衍生資料」典範</strong>：選一個主資料系統（通常是事件 log 或 OLTP DB），其他全部用 CDC / event 衍生。",
  "<strong>Lambda 架構（批 + 流並行）→ Kappa 架構（只用流）</strong>：用串流統一處理批次與線上，是現代資料平台的主流方向。",
  "<strong>Unbundling 資料庫</strong>：把傳統 DB 內建的 features（索引、replication、materialized view）打散、由多個專門系統用事件 log 拼起來。",
  "<strong>端到端（end-to-end）正確性</strong>：可靠性是端到端問題、不能只在某一層解決；冪等性、唯一識別碼、versioning 要貫穿全鏈。倫理 / 隱私是工程師的責任、不只是合規問題。"
]' />

## 12.1 資料整合：對的工具用在對的地方

現代應用通常用：
- **OLTP DB** 給線上交易
- **Search index** 給全文搜尋
- **Cache** 給熱資料
- **Data warehouse** 給分析
- **Event log** 給跨系統同步

沒有單一系統能做全部 → **整合就是現代資料工程的本質**。

### 雙寫的危險
應用同時寫 DB + Elasticsearch：
```python
db.save(record)      # 成功
es.index(record)     # 失敗
# → DB 有，ES 沒有，永遠不一致
```

**解決方案**：CDC → 從單一可靠來源衍生其他系統。

---

## 12.2 Lambda → Kappa 架構

### Lambda 架構
```
事件流 ──┬─→ Batch layer（每日重算，準確）
        └─→ Speed layer（即時近似結果）
            ↓
        服務層合併兩者
```
- ✓ 容錯（批層糾正流層的近似）
- ✗ 兩套程式碼維護地獄

### Kappa 架構
**只用一套流處理**，需要時就重播歷史事件。
- ✓ 一套程式碼
- ✓ 重播能力 → 修 bug 後重算
- 前提：訊息系統能保留足夠長的歷史（Kafka 設長保留期）

---

## 12.3 Unbundling 資料庫

傳統 DB 把這些功能綁在一起：
- 索引（含次級索引）
- 複製
- Materialized view
- Cache

「<G term="unbundling">Unbundled</G>」想法：用事件 log 當骨幹，每個關注點用最適合的工具：
```
        Event Log (Kafka)
       /     |        \
   Search  Graph  Time-series  ...
   Index   DB     DB
```
這正是 Kafka Streams、Materialize、ksqlDB 走的路線。

::: tip 本土場景：金管會跨行結算 + 街口 / Line Pay
**台灣金融科技遇到的「資料系統未來」議題**：
- **金管會跨行結算（財金公司）**：傳統批次 settle（T+1 結算）正在轉向 near real-time、用 stream processing + idempotent ledger 取代每晚對帳——**這就是 Kleppmann 在 Ch12 §12.2 講的 Lambda → Kappa 演進**
- **街口 / Line Pay 端到端正確性**：你掃 QR Code 付款、店家終端機收到「成功」推播、店家 POS 系統入帳——這條鏈路中**任何一段斷網都不能造成「店家收錢 / 你帳戶沒扣」或反過來**。實務上靠：(1) request_id / idempotency key 去重、(2) 雙向對帳 batch job 找差異、(3) 人工 SOP 補單。**這就是 §12.4 端到端正確性的真實樣貌**
- **倫理面（§12.5）**：金管會對 P2P 借貸、虛擬資產交易所、人臉辨識的監管——「**設計這些系統的人對社會有不對稱責任**」在台灣已經是 KYC / AML / 個資法的實際法規

**DDIA 原書用美式 fintech / 歐盟 GDPR、本站用台灣金管會 / 個資法 / 街口、底層的端到端正確性與資料倫理是同一套**。
:::

---

## 12.4 端到端正確性

DDIA 的核心觀點：**可靠性不是某一層的責任**。

- 即使每一層都「正確」，組合起來仍可能出錯（雙寫不一致、訊息重複、競態）
- 唯一可靠的做法：**端到端的冪等識別碼**

::: tip 思想源頭：Saltzer-Reed-Clark 1984
這個觀念出自系統設計經典論文 **["End-to-End Arguments in System Design"](https://web.mit.edu/Saltzer/www/publications/endtoend/endtoend.pdf)**（Saltzer, Reed, Clark，1984）——任何**最終正確性保證**都必須放在**端點檢查**，中間層只能輔助、不能取代端點驗證。DDIA p.519 直接引用此論點，與 TCP / TLS 對「真正的可靠性」放在哪一層的設計同源。
:::

範例：付款流程
- Client 產生 `request_id`
- 整條鏈路（API、DB、訊息隊列、外部支付）都用同一 ID 去重
- 失敗時任意層重試，總效果仍是「付款一次」

**完整實務手段請見** [Ch11 §11.6 Stripe-style idempotency key](/part-3/ch11-streams#stripe-style-idempotency-key)。

::: tip 本土場景：FISC 跨行清算 + 健保資料中心 + 央行 CBDC
**台灣讀者感受得到的「資料系統未來」三個真實場景**：

- **金管會跨行清算（FISC 財金資訊公司）**：你 ATM 轉帳收的「跨行手續費 17 元」背後是 **財金資訊公司** 的跨行清算系統——每天清算數百萬筆、不能算錯 1 元。這是 Ch12「**端到端正確性**」的真實案例：跨行訊息要走多家銀行的系統、任何一段 corrupt 都要能偵測（CRC + 雙向對帳 batch job + 銀行間 reconciliation 機制）

- **健保署資料中心**：你看醫生 EMR 寫入、健保卡讀寫、健保署中央資料庫、保費計算——這是台灣最大規模的衛福資料系統。Ch12 §12.5 倫理段落講的「**資料持有者對個資的不對稱權力**」就是這個場景：健保署能看見全民醫療紀錄、但你看不見自己的數據怎麼被用、被誰用、被授權給誰研究

- **中央銀行數位貨幣（CBDC）試辦**：台灣央行 2022 起試辦、設計上要解決：(1)「**雙花**」（同一筆錢同時付給兩個對象、Ch7 lost update 的金融版）、(2)「**離線交易**」（沒網路時的去中心化共識、Ch9 共識議題）、(3)「**可追蹤但保護隱私**」（Ch12 §倫理：監管需要 vs 個人金融隱私的張力）——這正是 Ch12 §unbundled databases + Ch11 stream-as-source-of-truth 的真實應用

**DDIA 原書 2017 寫作時舉 Google / Apple / 美國金融案例、本站讀者 2024 的對應場景是 FISC / 健保署 / 央行——技術根本問題一樣、但決策權與監管脈絡不同**。
:::

---

## 12.5 倫理：當資料能傷人

::: tip 為何技術書最後一章談倫理？
DDIA 主文 591 頁、倫理段就佔 10 頁——比例不算小、且是**全書氣質轉折點**。Kleppmann 在 Errata + 訪談多次強調：寫到 Ch12 才意識到「**資料系統的能力已經超出 1970-1990 年代任何工程師預期的權力範圍**」。技術書通常不談倫理是慣例、但 DDIA 主動破壞這個慣例——它把「**能設計這些系統的人對社會有不對稱責任**」當作收束。
:::

### 機器學習的預測性監控

訓練資料反映歷史偏見 → 預測延續甚至**放大**偏見（招募、信貸、司法、預測式警政）：
- **COMPAS** 累犯預測模型對黑人 false positive rate 是白人的兩倍（ProPublica 2016）
- **Amazon 自家招募 AI** 偵測「履歷裡有 "women's" 字眼」就降分（2014-2017、後來廢棄）
- **Apple Card 信用額度** 同一家庭裡丈夫額度是妻子 20 倍、Goldman Sachs 解釋不出來（2019）

DDIA 點出技術根因——模型把過去的歧視當作 ground truth、再以「**演算法是中立的**」包裝後產出新的歧視。

### 監控資本主義與權力不對稱

數位追蹤的能力遠超出多數使用者意識：
- **跨站追蹤**：第三方 cookie + browser fingerprint + ad ID（IDFA / GAID）+ ML 重新辨識「匿名」資料
- **行為剖析**：點擊、停留、滑鼠軌跡、打字節奏 → 個人特徵向量（VPN / 隱身模式都防不了）
- **資料二級市場**：DMP（Data Management Platform）把零散資料整合成完整個人檔案賣給廣告主、保險公司、政府

::: warning「資料是新石油」是危險的比喻
DDIA 在這段做了**關鍵 reframing**——別用「資料是新石油」（石油是中性物質、有經濟價值），改用「**資料是有毒資產**（toxic asset）」：
- **石油外洩** = 環境清理（昂貴但有限）
- **資料外洩** = **不可逆**：洩漏的個資不能「召回」、未來身份盜用 / 詐騙 / 勒索的潛在傷害是終身的

把資料當「toxic asset」會徹底翻轉設計決策：**預設不收集**（不是「收了再決定怎麼用」）、**收集後立即匿名 / 聚合**、**保留期短**、**可刪除**（GDPR 「**被遺忘權**」就是這個哲學）。
:::

### 法規回應與其局限

| 法規 | 地區 | 年 | 核心 |
|---|---|---|---|
| **GDPR** | 歐盟 | 2018 | 同意必須明示、可攜權、被遺忘權、資料保護官、最高罰金 4% 全球營收 |
| **CCPA / CPRA** | 加州 | 2018/2023 | 可詢問「你收集我什麼」、可刪除、opt-out 銷售、未成年人預設加強保護 |
| **個資法**（PDPA） | 台灣 | 2010/2023 | 蒐集需告知、特種個資（病歷、犯罪紀錄、基因）採高保護、跨境傳輸限制 |

但法規有結構性限制：
1. **跨境失效**：美國公司 + 歐盟用戶 + 印度伺服器 → 哪邊法律算？
2. **同意疲勞**：cookie banner 全按「接受」、條款沒人讀
3. **執法滯後**：罰款動輒拖 3-5 年、期間傷害已造成

### 權力不對稱

DDIA 在這節強調的**結構性不對稱**：
- **資料擁有方 vs 被資料化的人**：你能拒絕 Facebook 追蹤嗎？技術上可以、社會上幾乎不行
- **演算法決策 vs 被決策者**：信貸拒絕、招募拒絕的「**演算法理由**」對你不公開、你無法申訴
- **產品工程師 vs 終端使用者**：你寫的 A/B test 框架可能正在被用來最大化某個指標、而那個指標本身傷害使用者

Kleppmann 把這稱作「**工程師作為新的把關者**」——能寫程式部署系統的人、實際上代行了過去政府 / 媒體 / 銀行的把關職能、但**沒有對應的問責機制**。

### 工程師的倫理責任（DDIA 收束的呼籲）

1. **質疑「能做」不等於「該做」**：技術可行性 ≠ 倫理可行性。會議桌上沒人問「該不該做」時、責任落在實作的人身上
2. **預設選項應該保護隱私**：privacy by default、minimum data collection、opt-in 而非 opt-out
3. **拒絕 dark patterns**：誘騙點擊、難以取消訂閱、隱藏退出按鈕——這些都是**技術選擇**、不是「產品決定」
4. **保留專業拒絕權**：被要求做明顯傷害使用者的功能時、**有權說不**。學工程師守則的 ACM / IEEE Code of Ethics 都明確列為義務

> 「**我們有能力設計這些系統、就有責任設計得讓世界更好。**」——Kleppmann 在 DDIA 最後一頁的呼籲、是把技術書帶到**工程師作為公民**的最後一步。

---

## 12.6 12 章世界觀總覽：DDIA 帶你看見的東西

讀完 12 章後回頭看，整本書其實在教**三個層次的判斷力**：

### 層次 1：基礎建構（Part I, Ch1-4）
- **Reliability / Scalability / Maintainability** = 任何系統都該回答的三題（Ch1）
- **資料模型** 決定後續一切（Ch2 — 關聯 / 文件 / 圖、各有適合場景）
- **儲存引擎** 是寫優先還是讀優先的根本分岔（Ch3 — B-Tree 派 vs LSM 派）
- **編碼** 是時間維度的相容（Ch4 — 跨版本、跨語言、跨系統）

### 層次 2：分散式核心（Part II, Ch5-9）
- **複製** 換來可用性 + 讀延遲改善、代價是一致性窗口（Ch5 — single / multi-leader / leaderless）
- **分區** 換來寫吞吐 + 儲存擴容、代價是運維複雜度（Ch6）
- **交易** 是「**對應用層隱藏並發**」的承諾、不同 isolation level 是不同承諾強度（Ch7）
- **分散式系統的麻煩**（Ch8）= partial failure + 不可靠時鐘 + GC pause + 拜占庭風險
- **一致性與共識**（Ch9）= 在那些麻煩之上、能否做出「**所有節點看到相同順序**」這件事

### 層次 3：衍生資料世界觀（Part III, Ch10-12）
- **批次**（Ch10）= unix 哲學在 PB 級資料上的延伸、不可變輸入 + 確定性轉換
- **串流**（Ch11）= 把「事件 log」當系統骨幹、所有狀態都是衍生視圖
- **未來**（Ch12）= 把整個資料系統理解為「**source of truth event log + 多種衍生視圖（DB / 索引 / 快取 / ML 模型）**」、unbundling、端到端正確性、倫理責任

### DDIA 給你的「跨章節判斷力」

讀完之後、面對技術選型 / 系統設計 / 故障排除時、自動會問的問題變成：

1. **這個系統的 source of truth 是什麼？衍生資料是怎麼產生的？**（Ch11 / 12 視角）
2. **這裡的「一致性」實際上指哪一種？線性一致？SI？eventual？**（Ch7 / 9 視角）
3. **這個 RPC 失敗時應用層的 retry 策略是什麼？冪等性怎麼保證？**（Ch4 / 8 視角）
4. **這份資料的訪問模式是什麼？讀多寫少？scan-heavy？這影響 storage / partition 選擇**（Ch3 / 6 視角）
5. **我們在收集這份資料的「人為代價」是什麼？真的需要它嗎？**（Ch12 倫理視角）

這 5 個問題本身、就是 DDIA 留給每一位讀者的**永久工具箱**——書會被合上、概念會帶在身上。

::: tip 從這裡往哪走？
DDIA 寫於 2017、但**思想框架未過期**。延伸閱讀建議：
- **Designing ML Systems**（Chip Huyen, 2022）—— 把 DDIA 思維套用到 ML/AI infra
- **Database Internals**（Alex Petrov, 2019）—— 比 DDIA 更深入 storage engine 細節
- **Streaming Systems**（Akidau et al., 2018）—— Google Dataflow 團隊把 Ch11 寫成一本書
- **"Turning the database inside out"**（Kleppmann 2015 演講）—— Ch12 「Unbundling」的思想源頭、35 分鐘演講
- **Jepsen 部落格**（jepsen.io）—— 把各家 DB 真的測一遍、看誰宣稱的 isolation 是真的
:::

---

## 章末練習

::: tip 思考題
1. **重新設計**：選一個你熟悉的系統（電商、社群、線上學習平台），用 Lambda 或 Kappa 架構重設計，列出 source of truth、衍生系統、CDC 路徑。
2. **道德權衡**：設計一個會員推薦演算法時，你發現用「過去消費」當特徵會強化性別/收入偏見。怎麼處理？
3. **整合思考**：本書 12 章涵蓋了你日常使用的哪些技術？哪些設計權衡你之前沒意識到？
:::

<Quiz chapter-id="ch12" :questions='[
  {
    difficulty: "applied",
    question: "Lambda 架構的最大缺點是？",
    options: [
      "效能不夠",
      "需要同時維護 batch 與 speed 兩套程式碼，邏輯需在兩處實作並保持一致",
      "無法處理串流資料",
      "不支援 SQL"
    ],
    answer: 1,
    explanation: "Lambda 用「批次層保證準確」+「流層保證即時」雙管齊下，但代價是同一邏輯要寫兩遍（不同框架），維護地獄。Kappa 架構提出用單一流處理 + 重播能力來簡化。"
  },
  {
    difficulty: "interview",
    question: "「Unbundling the database」的核心想法是？",
    options: [
      "把資料庫程式拆成多個微服務",
      "用事件 log 當骨幹，傳統 DB 內建的索引/快取/物化視圖等功能改由專門系統消費 log 衍生",
      "讓 DB 不再支援 SQL",
      "完全用 NoSQL 取代關聯式 DB"
    ],
    answer: 1,
    explanation: "傳統 DB 把索引、複製、materialized view 都綁在內部。Unbundling 想法：選一個 source of truth（通常是 Kafka log），由它衍生所有其他系統 —— 每個關注點選最適合的工具。"
  },
  {
    difficulty: "interview",
    question: "為什麼說「端到端的冪等識別碼」是分散式可靠性的關鍵？",
    options: [
      "因為它讓資料庫變快",
      "因為任何一層的可靠性保證都可能在組合時失效，只有端到端的 unique ID 能讓全鏈失敗重試後仍只生效一次",
      "因為它取代了交易",
      "因為它是 SQL 標準"
    ],
    answer: 1,
    explanation: "DDIA 反覆強調：可靠性是端到端問題。即使 DB、隊列、RPC 每層都保證 exactly-once，組合起來仍可能重複（A 已寫但 B 重試）。client 端產生 unique ID 並貫穿全鏈，是唯一可靠的去重方式。"
  },
  {
    difficulty: "applied",
    question: "DDIA Ch12 把「資料是新石油」這個比喻批判為**危險的 reframing**——它主張改用什麼比喻、為什麼？",
    options: [
      "資料是新黃金——稀缺且增值",
      "資料是有毒資產（toxic asset）——洩漏不可逆、未來身份盜用 / 詐騙 / 勒索的潛在傷害是終身的、預設應該不收集",
      "資料是新水源——共享資源、人人有權使用",
      "資料是新貨幣——可以自由交易與流通"
    ],
    answer: 1,
    explanation: "DDIA 在 §12.5 做的關鍵 reframing：「石油外洩」可清理、「資料外洩」**不可召回**——洩漏的個資未來造成的傷害是終身的。改用「**toxic asset**（有毒資產）」會徹底翻轉設計決策：**預設不收集**（不是「先收再決定怎麼用」）、**收集後立即匿名 / 聚合**、**保留期短**、**可刪除**。GDPR 的「被遺忘權」就是這個哲學的法律化。這個比喻轉換對工程師的價值在於：把「資料能力」與「資料責任」掛鉤、避免「能存就存」的預設值偏誤。",
    sectionAnchor: "ethics-section"
  },
  {
    difficulty: "interview",
    question: "Kleppmann 在 DDIA 最後一章把「工程師作為新的把關者」放在收束的位置——這個論點的核心是什麼？",
    options: [
      "工程師應該爭取更高薪資以彌補責任",
      "能寫程式部署系統的人實際上代行了過去政府 / 媒體 / 銀行的把關職能、但沒有對應的問責機制；技術可行性 ≠ 倫理可行性、會議桌上沒人問「該不該做」時責任落在實作者身上",
      "工程師應該交由 product manager 決定一切",
      "倫理只是公關問題、不是工程問題"
    ],
    answer: 1,
    explanation: "DDIA §12.5 收束的核心：資料系統的能力已超出 1970-1990 年代工程師的權力預期——招募 AI 篩履歷、信用評分 AI 決定貸款、預測式警政決定誰被監控——**這些是把關決策、但執行者是工程師、卻無對應的問責機制**（傳統把關者如法官、銀行 compliance officer、新聞編輯都有專業守則與問責結構、工程師沒有）。Kleppmann 把這稱作「**工程師作為新的把關者**」、呼籲：(1) 質疑「能做」不等於「該做」；(2) 預設選項保護隱私；(3) 拒絕 dark patterns；(4) 保留專業拒絕權。ACM / IEEE Code of Ethics 把這些列為義務、但實務上很少被引用——這個落差是 DDIA 最後一頁想點出的問題。"
  }
]' />

<ChapterNote chapter-id="ch12" />

<Progress chapter-id="ch12" />

<PartCheckpoint part="3">

**這不是要打勾考過、是讓你檢查 Ch10-12 的詞能不能黏在一起**——能用 Part III 的詞答完下面題目、表示衍生資料 / 批次 / 串流的直覺已經形成。**答錯 ≥ 3 題建議回頭精讀對應章節**。

1. **批次 vs 串流的本質差異是什麼？**「資料界限性」與「失敗語意」兩個維度怎麼分？
   - *提示*：Ch10 §10.1（資料邊界）+ Ch11 §11.0（失敗當常態）

2. **為什麼 Spark / Flink 取代 MapReduce、但 MapReduce 模型沒過時？**
   - *提示*：Ch10 §10.5（dataflow 引擎勝出原因）+ §10.2（map-reduce 不變的抽象）

3. **Event Sourcing 與 CQRS 為什麼通常配對出現？**
   - *提示*：Ch11 §11.2 + 詞彙表 [CQRS](/glossary/#cqrs)

4. **Kafka 的 exactly-once 與 Stripe-style idempotency key 各保證什麼？兩者衝突嗎？**
   - *提示*：Ch11 §11.5 + Ch11 §11.6 Stripe idempotency

5. **Lambda 與 Kappa 架構各自的 trade-off？什麼情況下 Lambda 仍然合理？**
   - *提示*：Ch12 §12.2

6. **「衍生資料」（derived data）為什麼是 Ch11/12 的核心觀念？它與 source-of-truth 的關係是？**
   - *提示*：Ch12 §12.3 unbundling

7. **端到端正確性為什麼不能完全靠 DB？**Stripe idempotency key、雙向對帳 batch job 各補哪個漏洞？
   - *提示*：Ch12 §12.4 + Ch11 §11.6

**答錯 ≥ 3 題**：建議從第一題對應的章節回頭重讀
**全部能答**：恭喜你走完 12 章 DDIA 旅程 — 你已具備設計資料密集系統的核心 mental model

</PartCheckpoint>

<NextChapterBridge next-link="/progress" next-title="檢視我的學習進度">
你完成全書了！這 12 章的內容會在你日後的工程決策中反覆回響 —— 從選 isolation level、設計 read replica、到評估資料平台架構。<strong>建議現在做的事</strong>：選一個你工作 / 學習中的真實系統，用本書詞彙重新描述一次它的架構，並寫下三個你之前沒注意到的設計決策。這就是把 DDIA「真的學會」的開始。
</NextChapterBridge>

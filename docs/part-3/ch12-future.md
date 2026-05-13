---
title: Ch12 資料系統的未來
---

<ChapterOpener chapter-id="ch12" />

<ChapterMeta part="Part III 衍生資料" :read-time="40" difficulty="中等" :tags="['Lambda', 'Unbundling', '倫理']" prereq="Ch10, Ch11" />

<TLDR :points='[
  "<strong>整合不同的儲存系統是這個時代的核心挑戰</strong>。一個應用通常同時依賴 OLTP DB、search、cache、warehouse —— 如何讓它們同步？",
  "<strong>「Source of truth + 衍生資料」典範</strong>：選一個主資料系統（通常是事件 log 或 OLTP DB），其他全部用 CDC / event 衍生。",
  "<strong>Lambda 架構（批+流並行）→ Kappa 架構（只用流）</strong>：用串流統一處理批次與線上，是現代資料平台的主流方向。",
  "<strong>Unbundling 資料庫</strong>：把傳統 DB 內建的 features（索引、replication、materialized view）打散，由多個專門系統用事件 log 拼起來。",
  "<strong>端到端 (end-to-end) 正確性</strong>：可靠性是端到端問題，不能只在某一層解決；冪等性、唯一識別碼、versioning 要貫穿全鏈。倫理 / 隱私是工程師的責任，不只是合規問題。"
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

「Unbundled」想法：用事件 log 當骨幹，每個關注點用最適合的工具：
```
        Event Log (Kafka)
       /     |        \
   Search  Graph  Time-series  ...
   Index   DB     DB
```
這正是 Kafka Streams、Materialize、ksqlDB 走的路線。

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

---

## 12.5 倫理：當資料能傷人

### 機器學習的偏見
訓練資料反映歷史偏見 → 預測延續甚至放大偏見（招募、信貸、司法）。

### 監控與隱私
數位追蹤的能力遠超出多數使用者意識。
- GDPR、CCPA 等法規部分回應
- 「資料是新石油」這個比喻其實是危險的 —— 石油是中性物質，個人資料的累積本身就會傷人

### 工程師的倫理責任
- 質疑「能做」不等於「該做」
- 預設選項應該保護隱私
- 拒絕 dark patterns（誘騙使用者）

> Kleppmann 在最後一章直接呼籲：作為設計這些系統的人，我們對社會有責任。

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
  }
]' />

<ChapterNote chapter-id="ch12" />

<Progress chapter-id="ch12" />

<NextChapterBridge next-link="/progress" next-title="檢視我的學習進度">
你完成全書了！這 12 章的內容會在你日後的工程決策中反覆回響 —— 從選 isolation level、設計 read replica、到評估資料平台架構。<strong>建議現在做的事</strong>：選一個你工作 / 學習中的真實系統，用本書詞彙重新描述一次它的架構，並寫下三個你之前沒注意到的設計決策。這就是把 DDIA「真的學會」的開始。
</NextChapterBridge>

---
title: 容量規劃工作表 — 從業務數字回推基礎建設規模
---

<ChapterMeta part="學習路徑" :read-time="20" difficulty="實務" :tags="['Capacity Planning', 'SRE', '架構設計']" />

# 容量規劃工作表

DDIA 各章告訴你「為什麼這個維度重要」（Ch1 SLO、Ch5 lag、Ch6 partition、Ch11 backpressure），但**沒給「給定業務數字 → 算出基礎建設規模」的工作表**。這頁是把 12 章學到的東西**收斂成一張可填的試算表**。

::: tip 用法
- 把你公司 / 想做的專案的業務數字填進「輸入」欄
- 跟著公式 / 規則跑、得到「輸出」欄
- 跟現有架構對照、看是 over-provisioned 還是吃緊
- **3 個月後重做一次**、看業務成長 vs 容量是否同步
:::

---

## 第一步：業務量化（輸入）

| 欄位 | 你的值 | 範例（電商 OLTP） | 對應 DDIA |
|---|---|---|---|
| 寫 QPS（峰值） | ___ | 500 | Ch1 §1.3 |
| 讀 QPS（峰值、寫的 5-20× 常見） | ___ | 5,000 | Ch5 §5.4 |
| 單筆讀 / 寫資料量 | ___ KB | 2 KB / 1 KB | Ch3 |
| 資料總量（穩態） | ___ GB | 500 GB | Ch6 §6.1 |
| 資料年成長率 | ___ % | 200% | — |
| SLO P99 延遲目標 | ___ ms | 200 ms | Ch1 §1.3 + p0-metrics |
| 可用性 SLO | ___ % | 99.9% | Ch1 §1.1 |
| 跨 region？ | 是 / 否 | 否（單 region） | Ch5 §5.5 |

::: warning 為什麼讀寫要分開估
DDIA Ch5 §5.4 講過：讀寫比例失衡會根本決定架構走向。寫 500 / 讀 5,000 可以靠 replica + cache 解；寫 5,000 / 讀 500 就是另一個世界（要走 LSM + 批次 flush，Ch3）。**先量到比例、再決定方向**。
:::

---

## 第二步：DB 規格回推（輸出）

### 寫吞吐 → DB 規格 / shard 數

**單機 PG / MySQL 寫上限粗估**（同步複製、ACID、含 index 維護）：

| 機型 | vCPU / RAM | 寫吞吐上限 |
|---|---|---|
| r6i.2xlarge | 8 / 64 GB | 1K-2K writes/sec |
| r6i.4xlarge | 16 / 128 GB | 2K-5K writes/sec |
| r6i.8xlarge | 32 / 256 GB | 5K-15K writes/sec |
| r6i.32xlarge | 128 / 1 TB | 20K-50K writes/sec（極限） |

**規則**：
- 寫 QPS < 5K → **單機 PG / MySQL 撐得住、不要過早分片**（Ch6 §6.1 anti-pattern）
- 寫 QPS 5K-20K → **read replica + cache 優先**（Ch5 §5.4）
- 寫 QPS > 20K → **才考慮 sharding**（Citus / Vitess / 應用層 shard）

### 範例計算（電商 OLTP）

業務輸入：500 writes/sec、500 GB 資料、200% 年成長

- 1 年後 1.5 TB、3 年後 4.5 TB → **3 年內單機 storage 撐不住** → 要規劃 sharding
- 但 500 writes/sec 單機完全沒問題 → **不必為了未來 scale 而現在分片**（過早優化）
- **結論**：現在用 r6i.4xlarge 單機 PG、12 個月內規劃 archive 老資料到 S3、24 個月再評估 sharding

→ 配 [ADR 模板](/paths/adr-template) 把「為什麼現在不分片」記下來、避免下任接手又重新討論。

### 讀吞吐 → replica + cache 規格

| 配置 | 適用 | 額外讀 QPS 容量 | 注意 |
|---|---|---|---|
| 0 replica、master 跑全部 | < 5K reads/sec | — | 簡單、無 lag |
| 1-2 replica + 讀分散 | 5K-30K reads/sec | 每 replica +5-10K reads/sec | Ch5 §5.4 replica lag |
| 2-3 replica + Redis cache-aside | 30K-200K reads/sec | hit rate 60%+ 砍 60% DB 讀 | cache invalidation 是難題 |
| 跨 region replica | global app | replica lag 1-5 sec | 容忍 read-your-writes 異常、Ch5 §5.5 |

---

## 第三步：Kafka / 訊息佇列規格

### 訊息 throughput → broker 數

**Kafka 單 broker 吞吐**：~100 MB/sec write（合理 production）/ ~500K events/sec（小事件）

**規則**：
- < 50K events/sec → **3 brokers**（Replication Factor 3、寫一個失效仍 OK）
- 50K-500K events/sec → **6-12 brokers**、按 partition 數 / fan-out 估
- > 500K events/sec → **看 partition 數量規劃**（單 partition 上限 ~10-50 MB/sec）

### Partition 數量公式

```
partition 數 ≥ max(
  目標吞吐 / 單 partition 吞吐,
  consumer parallelism 目標
)
```

**經驗值**：每 broker 不要超過 4,000 partition、整個叢集不要超過 200,000 partition、**過多 partition 會讓 controller failover 慢**（Ch9 §9.5 共識代價）。

### 範例（電商訂單事件流）

業務輸入：訂單事件 10K events/sec、每事件 2 KB

- 寫吞吐 = 10K × 2 KB = 20 MB/sec → **3 brokers 綽綽有餘**
- partition 數：取 12 個（給 consumer 平行處理 + 未來 3× 成長 buffer）
- 保留期：30 天（給 stream replay、Ch11 §11.5）→ 總空間 ≈ 20 MB/sec × 86,400 × 30 ≈ 50 TB（× RF 3 = 150 TB）
- consumer lag 警報：> 60 秒 page、> 10 秒 ticket（Ch11 §11.6 backpressure）

---

## 第四步：Redis cache 規格

**輸入**：熱資料總量 + cache hit rate 目標

- 熱資料總量 = 總資料 × 「熱比例」（通常 80/20、即 20% 熱資料佔 80% 流量）
- Redis 記憶體 ≈ 熱資料 × 1.5（考慮 metadata / fragmentation 開銷）

### 範例（電商 OLTP）

總資料 500 GB、80/20 法則 → 熱資料 100 GB

- Redis 容量 ≈ 150 GB → **r6g.4xlarge × 2（HA、primary + replica）**
- TTL 設 5-15 分鐘（看資料變動頻率）
- eviction policy：`allkeys-lru`（最常見）
- 配 [Ch5 §5.4 read-your-writes 一致性](/part-2/ch05-replication) 思考：cache hit 後寫入 master、下一個讀是否要 invalidate cache？

::: warning Cache stampede 陷阱
熱 key 過期瞬間、N 個讀同時打到 DB → 雪崩。Ch11 §11.4 講 backpressure，cache 層也要：用 **probabilistic early expiration** 或 **single-flight pattern**（同一 key 同時只允許一個請求回源）。
:::

---

## 第五步：連線池規格

### 公式（HikariCP / pgbouncer 級別）

```
連線池大小 = (核數 × 2) + 有效磁碟主軸數
```

**但**這是「單一應用 instance」的數字。多 instance 時要 × instance 數、不能超過 PG `max_connections`（預設 100、production 通常開到 200-500）。

### 範例（電商 OLTP）

4 個應用 instance、每個 8 vCPU：

- 每 instance 連線池 = (8 × 2) + 1 = 17 → **20 連線**（留 buffer）
- 4 instance × 20 = 80 連線 → PG `max_connections` 開 100 OK
- 若要再加 instance、就要上 **pgbouncer transaction pooling**（10× scale、單 PG 後面接 1000+ 應用連線）

::: tip 為什麼不能無限加連線
每個 PG 連線吃 ~10 MB RAM + 一個 forked 行程（process）。200 連線 = 2 GB RAM + 200 個行程競爭 CPU。**連線數 > 核數 × 4 通常開始 thrashing**。
:::

---

## 第六步：SLO 燃燒率警報

99.9% / 月 = **43 分鐘 error budget**

| 燃燒率 | 警報嚴重度 | 例（總流量 100 req/sec） |
|---|---|---|
| 14.4× 燒（1 小時內燒完月 budget 的 5%） | **P0 page** | 1 小時內 ~520 個 5xx |
| 6× 燒（6 小時燒月 budget 10%） | **P1 ticket** | 6 小時內 ~1,300 個 5xx |
| 3× 燒（3 天燒月 budget 25%） | **P2 review** | 3 天內 ~7,800 個 5xx |

**多視窗多燃燒率（multi-window multi-burn-rate）** 是業界 best practice、詳見 [Google SRE Workbook Ch5「Alerting on SLOs」](https://sre.google/workbook/alerting-on-slos/)。單一閾值警報（例如「5xx > 1%」）會過早 / 過晚發、無法兼顧 fast burn 與 slow burn。

---

## 工作表範例：完整跑一次（電商 OLTP）

**輸入**：500 writes/sec、5K reads/sec、500 GB、200% 年成長、200 ms P99、99.9% SLO、單 region

**輸出**：

| 維度 | 規格 | 依據 |
|---|---|---|
| DB master | r6i.4xlarge × 1 | 500 writes/sec 遠低於 2K-5K 上限 |
| DB replica | r6i.4xlarge × 2 | 5K reads/sec 配 2 replica 平均分擔 |
| Cache | Redis r6g.4xlarge × 2（HA） | 熱資料 100 GB × 1.5 = 150 GB |
| Kafka（訂單事件） | 3 brokers、12 partitions、保留 30 天 | 10K events/sec、20 MB/sec |
| 連線池 | 80 connections（4 instance × 20）、max_connections=100 | (8×2)+1 公式 |
| SLO 警報 | multi-window multi-burn-rate（14.4× page / 6× ticket / 3× review） | Google SRE Workbook Ch5 |
| 月成本估 | $3,000-5,000（AWS、含 Confluent Cloud Kafka） | 估算、不含資料傳輸 |

---

## 3 個月後重做一次

容量規劃**不是一次性**。3 個月後：

1. **對照預估 vs 實際**：哪個維度算對 / 算錯？（例：cache hit rate 預估 60%、實際只有 40% → 熱資料模型錯了）
2. **看業務成長軌跡**：QPS / 資料量是否如預期？年成長 200% 還是 50%？（決定下一輪 sharding 時間表）
3. **重新跑工作表**：可能需要 rebalance / 加 replica / 升 instance size、或反向 downsize（過度供應）
4. **寫一份 ADR**：記下「我們為什麼這樣調」、未來人 / 自己 6 個月後才不會忘

→ 配 [ADR 模板](/paths/adr-template) 把每次調整都留紀錄、容量規劃就從「拍腦袋」進化成「可追溯的工程實踐」。

---

## 延伸閱讀

- [Ch1 §1.3 可擴展性 Scalability（含 P99 延遲與 SLO）](/part-1/ch01-reliable)
- [Ch5 §5.4 Replica lag 的問題](/part-2/ch05-replication)
- [Ch6 §6.1 分區策略](/part-2/ch06-partitioning)
- [Ch11 §11.6 Stripe-style idempotency key](/part-3/ch11-streams)
- [Google SRE Workbook Ch5 — Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [ADR 模板](/paths/adr-template)
- [面試 cheatsheet](/paths/interview-cheatsheet)

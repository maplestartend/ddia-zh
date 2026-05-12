---
title: 詞彙表 Glossary
description: DDIA 全書關鍵術語與本網站 Part 0 補充詞彙的中英對照
---

# 詞彙表 Glossary

DDIA 全書關鍵術語 + Part 0 補充詞彙的中英對照與簡明解釋。**依字母排序**。

<GlossaryIndex />

::: tip 使用提示
- 內文 `<G>` 元件 hover 看到的「精簡定義」與此頁是同一 SSOT。
- 點擊內文詞彙會跳到本頁對應位置。
- 想搜尋某詞：按 `Ctrl+F` 或用上方搜尋框；想跳到字母區用上方索引條。
:::

::: info 詞彙來源與版權
本詞彙表為**個人學習筆記重新整理**——術語選取參考《Designing Data-Intensive Applications》(Kleppmann, O'Reilly 2017)，**定義皆為作者改寫後的中英對照**（非原書翻譯），加入台灣化用詞與 Taiwan-specific 範例。原書著作權屬 Martin Kleppmann 與 O'Reilly Media。
:::

---

## A {.role-h2}

### ACID {#acid}
**中文**：原子性、一致性、隔離性、持久性
傳統資料庫交易的四大保證。注意「Consistency」在 ACID 與分散式系統中是兩種不同的意思——這個詞 DDIA Ch7 開宗明義就吐槽。詳見 [Ch7](/part-2/ch07-transactions)。

### Anti-entropy Process {#anti-entropy}
**中文**：反熵程序
在 leaderless 複製中，背景比對副本差異並修復。Cassandra 的 hinted handoff、Merkle tree 同步。

### Atomic Commit {#atomic-commit}
**中文**：原子提交
要嘛全部提交、要嘛全部回滾。跨節點實作需要兩階段提交（2PC）或共識。

---

## B {.role-h2}

### Backward Compatibility {#backward-compatibility}
**中文**：向後相容
**新讀舊**——新版程式能讀舊版資料。中文「向後／向前」與英文直覺相反，初學者極易混淆；建議記「**backward = 看過去（舊資料）**」。詳見 [Ch4](/part-1/ch04-encoding)。

### Big-O Notation {#big-o}
**中文**：大 O 記號
描述演算法時間 / 空間複雜度的上界。O(1) 常數、O(log n) 二分查找、O(n log n) 排序、O(n²) 巢狀循環。**注意**：Big-O 不告訴你常數因子——小資料量時 O(n) 可能比 O(log n) 快。詳見 [Part 0.6](/part-0/data-structures)。

### Bloom Filter {#bloom-filter}
**中文**：布隆過濾器
機率資料結構，能高效判斷「key 絕對不在集合中」。有 false positive、無 false negative。常見於 LSM-Tree。

### B-Tree {#b-tree}
**中文**：B-Tree
傳統關聯式 DB 的索引結構。n 路平衡樹，每節點是一個磁碟頁（4KB / 16KB）。原地更新（in-place），讀快、寫要 WAL 保 crash recovery。詳見 [Ch3](/part-1/ch03-storage)。

### Byzantine Fault {#byzantine-fault}
**中文**：拜占庭故障
節點不只是當機，可能傳送錯誤或惡意訊息。多數系統不處理這種故障（成本太高），只處理 crash-stop。詳見 [Ch8](/part-2/ch08-trouble)。

---

## C {.role-h2}

### Cache {#cache}
**中文**：快取
把熱資料放在更快的儲存層（記憶體、CDN），減輕後端壓力與延遲。常用 Redis、Memcached；DDIA Ch1 視為「應用拼湊系統」的典型元件之一。

### CAP Theorem {#cap-theorem}
**中文**：CAP 定理
網路分區（P）發生時，必須在 Consistency 與 Availability 之間選擇。**常被誤解為「三選二」**——其實 P 是必選，真正的選擇是 CP vs AP。詳見 [Ch9](/part-2/ch09-consistency)。

### Cascading Failure {#cascading-failure}
**中文**：級聯失效
一個元件失效造成負載轉到其他元件，把它們也壓垮，連鎖反應擴大為全系統故障。常見：DB 慢 → 應用層重試風暴 → DB 完全死。詳見 [Ch1](/part-1/ch01-reliable)。

### Causality {#causality}
**中文**：因果性
「A 因果地早於 B」的偏序關係。Vector clock 用來捕捉。

### CDC (Change Data Capture) {#cdc}
**中文**：變更資料捕獲
從 DB 的 transaction log 抽取變更事件。讓 DB 變成 Kafka 的上游、解鎖即時 analytics。詳見 [Ch11](/part-3/ch11-streams)。

### Consensus {#consensus}
**中文**：共識
N 個節點對某個值達成一致。Paxos、Raft 是典型演算法。FLP 證明純非同步系統無法保證終止。詳見 [Ch9](/part-2/ch09-consistency)。

### Consistent Hashing {#consistent-hashing}
**中文**：一致性雜湊
節點與 key 都映射到雜湊環，加減節點只影響相鄰位置。

### Consistent Prefix Reads {#consistent-prefix-reads}
**中文**：一致前綴讀
**會話保證之一**（Session Guarantee）。若一系列寫入 W1 → W2 → W3 按某順序發生，所有觀察者要嘛看到這個前綴（例如只看到 W1，或 W1+W2），要嘛還沒看到——但**不會看到亂序的中段**（例如看到 W3 卻沒看到 W1）。分區系統最易違反這個保證。詳見 [Ch5](/part-2/ch05-replication)。

### CRDT (Conflict-free Replicated Data Type) {#crdt}
**中文**：無衝突複製資料類型
可自動 merge 並發更新的資料結構。

---

## D {.role-h2}

### Dataflow Engine {#dataflow-engine}
**中文**：資料流引擎
Spark、Flink、Tez。以 DAG 表達運算管線，中間結果記憶體保留。

### Dead Tuple {#dead-tuple}
**中文**：失效列
PostgreSQL MVCC 留下的「舊版本列」——UPDATE / DELETE 並非真的移除舊版本，需要 `VACUUM` 定期回收。詳見 [Ch7](/part-2/ch07-transactions)。

### Dirty Read / Dirty Write {#dirty-read}
**中文**：髒讀 / 髒寫
讀到 / 覆寫未提交的資料。Read Committed 隔離級別防止之。詳見 [Ch7](/part-2/ch07-transactions)。

### Durability {#durability}
**中文**：持久性
資料寫入後不丟失。靠 WAL + fsync + 複製達成。

---

## E {.role-h2}

### Event Sourcing {#event-sourcing}
**中文**：事件溯源
把狀態變更（事件）當主資料，當前狀態是衍生的。可重放歷史、可審計。詳見 [Ch11](/part-3/ch11-streams)。

### Eventual Consistency {#eventual-consistency}
**中文**：最終一致性
無新寫入時，副本最終會收斂相同值。leaderless / multi-leader 複製的典型保證。「最終」可能很久。

### Exactly-Once Semantics {#exactly-once}
**中文**：恰好一次語意
實務上為 effectively-once：透過冪等 + transactional output 達成「最終效果只發生一次」。

---

## F {.role-h2}

### Failover {#failover}
**中文**：故障轉移
主節點掛了選新 leader 的過程。腦裂（split brain）是這裡最危險的情境。詳見 [Ch5](/part-2/ch05-replication)。

### Fan-out {#fan-out}
**中文**：扇出
一個請求觸發多個下游請求。fan-out on write（Twitter 推文寫入時擴散到所有 follower 收件匣）vs fan-out on read（讀時才聚合）。詳見 [Ch1](/part-1/ch01-reliable)。

### Fault {#fault}
**中文**：故障
單個元件偏離規格（硬碟壞、網路斷）。容錯系統能容忍 fault 不變成 failure。**注意 fault ≠ failure**：failure 是整個系統罷工。詳見 [Ch1](/part-1/ch01-reliable)。

### Fencing Token {#fencing-token}
**中文**：防護令牌
分散式鎖搭配的單調遞增號，防止「過期持有者」污染資料。儲存層拒絕比已知最大號還小的請求。詳見 [Ch8](/part-2/ch08-trouble)。

### FLP Impossibility {#flp-impossibility}
**中文**：FLP 不可能性
證明：純非同步 + 可能崩潰節點的系統中，不存在「保證終止」的確定性共識演算法。1985 Fischer-Lynch-Paterson。

### Forward Compatibility {#forward-compatibility}
**中文**：向前相容
**舊讀新**——舊版程式能讀新版資料（遇到陌生新欄位需跳過、不能崩潰）。**forward = 看未來（新資料）**。在滾動部署（rolling deploy）中與 backward compatibility 同樣必要。詳見 [Ch4](/part-1/ch04-encoding)。

### fsync {#fsync}
**中文**：強制同步
強制把 OS page cache 寫回磁碟的系統呼叫。沒呼叫 fsync 的寫入，停電時可能丟失——WAL 的關鍵步驟。詳見 [Part 0.4](/part-0/os)。

---

## G {.role-h2}

### GC (Garbage Collection) {#gc}
**中文**：垃圾回收
程式語言（Java / Go / Python 等）自動釋放不再使用的記憶體。GC 進行時可能讓程式行程**短暫暫停**（stop-the-world），分散式系統中這個暫停會被誤判為「節點失聯」。

---

## H {.role-h2}

### Hash Table {#hash-table}
**中文**：雜湊表
O(1) 平均存取的 KV 結構。記憶體內 KV store（Redis、Memcached）核心；磁碟上的 hash index（Bitcask）。**缺點**：無順序，不支援範圍查詢。詳見 [Part 0.6](/part-0/data-structures)。

### Heuristic Decision {#heuristic-decision}
**中文**：啟發式決定
在 2PC coordinator 失聯時，participants 自行決定提交或回滾——**破壞原子性**，是 2PC 設計上的危險逃生口。

### Hot Spot {#hot-spot}
**中文**：熱點
負載集中在單一分區的問題。常見原因：明星用戶、時間序列資料、單一熱門 key。詳見 [Ch6](/part-2/ch06-partitioning)。

### HTTP {#http}
**中文**：超文本傳輸協定
應用層協定，建立在 TCP 上（HTTP/3 改用 QUIC over UDP）。無狀態、request-response 模型，是 REST API 的基礎。詳見 [Part 0.5](/part-0/network)。

---

## I {.role-h2}

### Idempotent {#idempotent}
**中文**：冪等
同一操作執行多次效果等同一次。分散式系統重試的基本要求——配 exactly-once 語意的根基。

### Isolation Level {#isolation-level}
**中文**：隔離級別
Read Uncommitted / Read Committed / Repeatable Read / Snapshot Isolation / Serializable。**各家 DB 對同名級別實作不同**——別假設 PG 的 RR 跟 MySQL 的 RR 一樣。詳見 [Ch7](/part-2/ch07-transactions)。

---

## J {.role-h2}

### JOIN {#join}
**中文**：聯接
SQL 把兩張表依關聯欄位合併的操作。實作演算法：nested loop、hash join、sort-merge join——選哪個由 query planner 看資料量決定。詳見 [Ch2](/part-1/ch02-data-models) 與 [Part 0.3](/part-0/sql)。

---

## L {.role-h2}

### Lambda Architecture {#lambda-architecture}
**中文**：Lambda 架構
批次層 + 速度層並行處理同一資料流。詳見 [Ch12](/part-3/ch12-future)。

### Latency {#latency}
**中文**：延遲
單一請求從發出到收到回應的時間。**要看 P50/P99 分布，不是平均值**——平均值會被尾端拉偏但也會被快速請求拉平，兩邊都騙人。詳見 [Part 0.2](/part-0/metrics)。

### Linearizability {#linearizability}
**中文**：線性一致
最強一致性保證：系統表現得像只有單一副本，每個操作看起來在某瞬時點原子發生。亦譯「線性化」。

::: warning 「強一致性」是 underspecified 用語
工業界口語常把 linearizability 稱作「強一致性（strong consistency）」，但這個詞**在文獻中沒有嚴格定義**——不同論文可能指 linearizability、serializability、sequential consistency 中的任一個。DDIA p.324 註腳 4 直接說它是「不精確的用法」。寫設計文件時建議直接用 linearizability / serializability / strict serializability 等有精確定義的詞。
:::

注意：**linearizability ≠ serializability**（前者是儲存層級的單一物件操作排序，後者是交易層級的執行排序）。**Strict Serializability** = serializability + linearizability，是 Spanner / CockroachDB 等系統的真正保證。詳見 [Ch9](/part-2/ch09-consistency)。

### Lock / Mutex {#lock}
**中文**：鎖 / 互斥鎖
確保臨界區（critical section）一次只有一個執行緒進入的機制。代價：競爭時等待、設計不當會 deadlock。詳見 [Part 0.7](/part-0/concurrency)。

### Lost Update {#lost-update}
**中文**：更新遺失
並發「讀-改-寫」造成。原子操作或顯式鎖可解。詳見 [Ch7](/part-2/ch07-transactions)。

### LSM-Tree {#lsm-tree}
**中文**：日誌結構合併樹
Log-Structured Merge Tree。寫入只追加、背景 compaction。**順序寫帶來高寫入吞吐**，但**寫放大不一定比 B-Tree 低**——leveled compaction 下實測常達 10–30×（DDIA p.83-84、RocksDB tuning guide）。RocksDB、Cassandra、LevelDB 採用。詳見 [Ch3](/part-1/ch03-storage)。

::: warning 常見誤解
網路上流傳「LSM 寫放大比 B-Tree 低」是**過度簡化**。B-Tree 寫放大 ~3×、LSM 在 leveled compaction 下 10-30×、size-tiered compaction 更高但會犧牲讀效能與空間放大。LSM 真正的優勢是**順序寫入**（B-Tree 是隨機寫），這在 HDD 與 SSD 上都有顯著吞吐優勢，但寫放大本身要看 compaction 策略。
:::

---

## M {.role-h2}

### MapReduce {#mapreduce}
**中文**：MapReduce
Google 提出的批次處理典範。Map + Shuffle + Reduce 三階段。詳見 [Ch10](/part-3/ch10-batch)。

### Materialized View {#materialized-view}
**中文**：物化視圖
把查詢結果預先計算並存起來的「現成答案」；資料源變動時自動更新。Kafka Streams / ksqlDB 大量使用。詳見 [Ch11](/part-3/ch11-streams)。

### Message Queue / Broker {#message-queue}
**中文**：訊息隊列 / 代理
非同步傳遞訊息的中介系統（Kafka、RabbitMQ、SQS）。讓 producer 與 consumer 解耦、削峰填谷、實現 event-driven 架構。詳見 [Ch11](/part-3/ch11-streams)。

### Monotonic Clock {#monotonic-clock}
**中文**：單調時鐘
`System.nanoTime()`。只能用來測 duration，不能跨機器比較。保證單調遞增，不會回跳。詳見 [Ch8](/part-2/ch08-trouble)。

### Monotonic Reads {#monotonic-reads}
**中文**：單調讀
**會話保證之一**。使用者多次讀取**不會時光倒流**——先讀到較新值後，不會再讀到較舊值。常見違反情境：使用者連續刷新頁面、後面那次被路由到一個更舊的 follower。實作：每位使用者 sticky 固定到同一副本，或要求讀取至少滿足某個時間戳。詳見 [Ch5](/part-2/ch05-replication)。

### MVCC (Multi-Version Concurrency Control) {#mvcc}
**中文**：多版本並發控制
每筆寫產生新版本，讀根據 snapshot 過濾。Snapshot Isolation 的實作。

---

## N {.role-h2}

### NoSQL {#nosql}
**中文**：NoSQL
非關聯式資料庫的統稱：document（MongoDB）、KV（Redis）、column-family（Cassandra）、graph（Neo4j）。各有適用場景，**不是 SQL 的全面替代**。詳見 [Ch2](/part-1/ch02-data-models)。

### NTP (Network Time Protocol) {#ntp}
**中文**：網路時間協定
跨機器同步時鐘的網路協定。透過階層式的時間伺服器同步，誤差通常數十毫秒，但 WAN 環境或高負載下可達數百毫秒。**NTP 同步可能造成 wall clock 向後跳**，這是 Ch8 強調「不要用 time-of-day clock 測 duration」的根本原因。詳見 [Ch8](/part-2/ch08-trouble)。

---

## P {.role-h2}

### PACELC {#pacelc}
**中文**：PACELC（CAP 的補完）
**Daniel Abadi 2012** 提出，補完 CAP 的盲點。

- **P**artition 時 → 選 **A**vailability 或 **C**onsistency（這就是 CAP）
- **E**lse（網路正常）時 → 選 **L**atency 或 **C**onsistency

CAP 只談分區時的權衡；PACELC 加上「正常時也要在延遲與一致性之間選」，更貼近實務。典型分類：
- **PA/EL**：Cassandra、Dynamo（兩邊都選 A/L）
- **PC/EC**：Spanner、HBase（兩邊都選 C）
- **PA/EC**：MongoDB 預設、CosmosDB（中間派）

詳見 [Ch9](/part-2/ch09-consistency)。

### Page Cache {#page-cache}
**中文**：頁面快取
OS 把最近讀寫的磁碟頁保留在 RAM。為什麼讀 SSTable 第二次比第一次快很多就是它。fsync 才強制寫回磁碟。詳見 [Part 0.4](/part-0/os)。

### Page Fault {#page-fault}
**中文**：頁面錯誤
程式存取的記憶體頁不在 RAM 中，OS 需從磁碟把它載入——過程中程式行程停下等磁碟。

### Partitioning / Sharding {#sharding}
**中文**：分區 / 分片
把資料集橫向切分到多個節點。常見策略：hash、range、目錄式。詳見 [Ch6](/part-2/ch06-partitioning)。

### Percentile (P50/P95/P99/P999) {#percentile}
**中文**：百分位數
P99 = 把全部請求按延遲排序、第 99% 名那個的延遲。比平均值更能反映尾端使用者體驗，是 SLA 的標準度量。詳見 [Ch1](/part-1/ch01-reliable) 與 [Part 0.2](/part-0/metrics)。

### Phantom Read {#phantom-read}
**中文**：幻讀
查詢條件對應的「列集合」在交易期間被其他交易改變（插入 / 刪除 / 更新使列符合或不符合條件）。**Berenson et al. 1995《A Critique of ANSI SQL Isolation Levels》區分兩種**：
- **A3 / 讀取階段的 phantom**：同交易兩次範圍查詢得不同列集合—— SI 因為讀走快照**能擋住**
- **A5B / 基於不存在性寫入決策**：讀「沒有衝突」→ 寫入 → 另一交易也讀「沒有衝突」→ 也寫入 → commit 後撞突—— SI **擋不住**（它無法鎖「不存在的東西」），是 Write Skew 的特例

要完全擋住第二種需要 Serializable（SSI 或 2PL with predicate lock）。詳見 [Ch7](/part-2/ch07-transactions)。

### Process {#process}
**中文**：行程
作業系統分配資源的單位，有獨立的虛擬記憶體空間。注意：**台灣譯「行程」、中國譯「進程」**，DDIA 中文網站用前者。詳見 [Part 0.4](/part-0/os)。

### Process Pause {#process-pause}
**中文**：行程暫停
GC、VM 遷移、闔上筆電都會造成行程「死一段時間」。在分散式系統中會被誤判為「節點失聯」。詳見 [Ch8](/part-2/ch08-trouble)。

---

## Q {.role-h2}

### Quorum {#quorum}
**中文**：法定人數
W + R > N 公式保證讀寫集有交集。**注意：quorum 不無條件保證讀到最新值**（網路分區、reordering 仍可能讀舊）。詳見 [Ch5](/part-2/ch05-replication)。

---

## R {.role-h2}

### Race Condition {#race-condition}
**中文**：競態條件
多個執行緒 / 行程同時存取共享狀態，結果取決於誰先誰後。lost update、phantom 都是 race condition 的特例。詳見 [Part 0.7](/part-0/concurrency)。

### Read Your Writes {#read-your-writes}
**中文**：讀己寫
**會話保證之一**。使用者寫入後，**自己的後續讀取一定能看到自己的寫**——即使副本還沒同步給其他人。常見違反情境：使用者更新自己的個人資料後立刻刷新，但被路由到一個還沒同步的 follower，看不到自己剛改的內容。實作：寫後該使用者的讀請求路由到 leader、或記下寫入時間戳要求 follower 至少同步到該時間。詳見 [Ch5](/part-2/ch05-replication)。

### Raft {#raft}
**中文**：Raft
易理解的共識演算法（2014）。etcd、Consul、TiKV 採用。比 Paxos 好教學是它的設計目標。詳見 [Ch9](/part-2/ch09-consistency)。

### Read Repair {#read-repair}
**中文**：讀修復
讀取時偵測到舊副本就順便寫回新值。leaderless 複製的修復機制之一。

### Redundancy {#redundancy}
**中文**：冗餘
故意保留多份備援（RAID 多顆磁碟、雙電源、多副本）。容忍個別元件失效——「容錯（fault tolerance）」的實作手段。

### Replication {#replication}
**中文**：複製
把同一份資料保存在多個節點。三種架構：single-leader、multi-leader、leaderless。詳見 [Ch5](/part-2/ch05-replication)。

### Reverse Proxy {#reverse-proxy}
**中文**：反向代理
位於 client 與後端之間，代表後端接收請求並轉發（Nginx、HAProxy）。負責 load balancing、SSL termination、cache、限流。

### RPC (Remote Procedure Call) {#rpc}
**中文**：遠端程序呼叫
偽裝成本地呼叫的網路請求，但永遠無法真正等價於本地（會丟包、會 timeout、有變動延遲）。gRPC、Thrift 是典型實作。詳見 [Ch4](/part-1/ch04-encoding)。

---

## S {.role-h2}

### Scalability {#scalability}
**中文**：可擴展性
「當負載成長時，能否用合理成本撐住效能」的能力。不是抽象的「快」，必須回答「成長到什麼程度、什麼指標還能維持」。詳見 [Ch1](/part-1/ch01-reliable)。

### Scale Up / Scale Out {#scale-up}
**中文**：垂直擴展 / 水平擴展
- **Scale Up（vertical）**：把單台機器升級到更強。簡單，但有單機天花板。
- **Scale Out（horizontal）**：加更多機器分擔負載。可無限擴展，但要面對分散式系統難題。

### Schema-on-read / Schema-on-write {#schema-on-read}
**中文**：讀時 / 寫時 schema
讀時 schema（NoSQL、JSON）vs 寫時 schema（SQL）。詳見 [Ch2](/part-1/ch02-data-models)。

### Serializability {#serializability}
**中文**：可序列化
最強的隔離級別，效果如同所有交易循序執行。實作：2PL、SSI、Actual Serial Execution。詳見 [Ch7](/part-2/ch07-transactions)。

### Sink {#sink}
**中文**：接收端
事件流 / 訊息隊列的「下游目的地」——通常是要把資料寫到的最終系統（如 Elasticsearch、DB、HTTP API）。詳見 [Ch11](/part-3/ch11-streams)。

### SLA / SLO / SLI {#sla-slo}
**中文**：服務水準協定 / 目標 / 指標
- **SLA** = Agreement，對外合約、違反賠錢
- **SLO** = Objective，對內目標、違反觸發 alert
- **SLI** = Indicator，量測值本身（一個數字）

詳見 [Part 0.2](/part-0/metrics)。

### Snapshot Isolation {#snapshot-isolation}
**中文**：快照隔離
每筆交易看到開始時刻的快照。現代 DB 多以 MVCC 實作（PostgreSQL、Oracle、SQL Server snapshot mode）。

**對 phantom 的處理要分兩種**：
- **讀取階段的 phantom**（同交易兩次範圍查詢得不同列集合）—— SI 因為讀走快照**能擋住**
- **基於不存在性寫入決策**（讀「沒有衝突」→ 寫一個；另一交易也讀「沒有衝突」→ 也寫一個 → commit 後**共同違反原本檢查的前提**）—— SI **擋不住**，這是 Write Skew 的特例

要完全擋住第二種需要 Serializable（SSI 或 2PL with predicate lock）。詳見 [Ch7](/part-2/ch07-transactions)。

### Split Brain {#split-brain}
**中文**：腦裂
網路分區後兩邊都自認為 leader，造成資料衝突。多數系統用 fencing token 或共識協定避免。

### SQL {#sql}
**中文**：結構化查詢語言
關聯式資料庫的標準查詢語言（1974 IBM）。**宣告式**：你說「要什麼」，DB 自己想「怎麼拿」（執行計畫由 query planner 決定）。詳見 [Ch2](/part-1/ch02-data-models) 與 [Part 0.3](/part-0/sql)。

### SSTable (Sorted String Table) {#sstable}
**中文**：排序字串表
LSM-Tree 的儲存單位——key 已排序的不可變檔案。詳見 [Ch3](/part-1/ch03-storage)。

### Stateful Service {#stateful}
**中文**：有狀態服務
服務內部保存資料（DB、message broker、Stateful set）。擴展困難得多——這就是 DDIA 整本書在處理的主題。

### Stateless Service {#stateless}
**中文**：無狀態服務
服務本身不保存任何請求之間的狀態，所有狀態都丟給 DB / Cache。橫向擴展時可以隨意加機器、任意請求路由到任一台。詳見 [Part 0.1](/part-0/intro)。

### Strict Serializability {#strict-serializability}
**中文**：嚴格可序列化
**Serializability + Linearizability** 的組合：交易能可序列化執行，**且全局順序與實時順序一致**（A 在 B 之前 commit → 任何後續觀察者看到的順序都是 A → B）。

- 比 Linearizability 多了：跨多物件
- 比 Serializability 多了：尊重實時順序（real-time order）

Spanner、CockroachDB、FoundationDB 提供這個保證——這是工業界目前最強的一致性等級。詳見 [Ch9](/part-2/ch09-consistency)。

### Stop-the-World GC {#stop-the-world-gc}
**中文**：全停式垃圾回收
JVM 老式 GC 進行時整個程式行程暫停，**所有執行緒卡住**。一次可暫停數秒到數十秒，是分散式系統「process pause」的最常見來源。

### Stream-Table Duality {#stream-table-duality}
**中文**：串流-表對偶
表是某時刻流的快照，流是表的變更歷史。Kafka Streams 核心概念。

---

## T {.role-h2}

### Tail Latency {#tail-latency}
**中文**：尾端延遲
延遲分布的高百分位段（P99 以上）。當一個請求要 fan-out 給多個後端，整體延遲被「最慢的那個」決定——這叫 **tail latency amplification**。詳見 [Ch1](/part-1/ch01-reliable) 與 [Part 0.2](/part-0/metrics)。

### TCP (Transmission Control Protocol) {#tcp}
**中文**：傳輸控制協定
可靠、有序、有流量控制的傳輸層協定。三次握手建立連線、超時重傳保證可靠——**但「可靠」是指最終會送到或斷線，不是即時**。詳見 [Part 0.5](/part-0/network)。

### Thread {#thread}
**中文**：執行緒
行程內的執行單元，共享記憶體空間。並行寫共享資料就是 race condition 的溫床。詳見 [Part 0.4](/part-0/os)。

### Throughput / QPS {#throughput}
**中文**：吞吐量
系統每秒能處理的請求或事件數量，單位常見 req/s、QPS（queries per second）、events/s。**與 latency 是不同維度的指標**。詳見 [Part 0.2](/part-0/metrics)。

### Total Order Broadcast {#total-order-broadcast}
**中文**：全序廣播
所有節點按相同順序接收所有訊息。**等同共識、等同線性一致儲存**——這個等價性是 Ch9 的核心結果。

### Two-Phase Commit (2PC) {#two-phase-commit}
**中文**：兩階段提交
Prepare + Commit/Abort。跨節點原子提交的傳統解。**Coordinator 有單點失效風險**。詳見 [Ch9](/part-2/ch09-consistency)。

### Two-Phase Locking (2PL) {#two-phase-locking}
**中文**：兩階段鎖
讀加共享鎖、寫加排他鎖，commit 才釋放。傳統 serializable 實作。

---

## U {.role-h2}

### Unbundling the Database {#unbundling}
**中文**：拆解資料庫
把傳統 DB 內建功能（索引、複製、materialized view）拆散，用事件 log 串接專門系統。詳見 [Ch12](/part-3/ch12-future)。

---

## V {.role-h2}

### Vector Clock {#vector-clock}
**中文**：向量時鐘
向量時鐘（**Fidge 1988、Mattern 1989**——不是 Lamport）。**每個節點**一個計數器組成向量，可判定兩個事件是「因果先後」還是「並發獨立」。

::: warning 常見誤植
中文圈很多教材把 vector clock 歸給 Lamport——這是錯的。Lamport 1978 提出的是**純量** Lamport timestamp（單一計數器、能給因果一致的全序，但**不能判 concurrency**）。Vector clock 真正的作者是 Fidge & Mattern，1988-89 同時獨立提出，比 Lamport timestamp 表達力更強。
:::

### Version Vector {#version-vector}
**中文**：版本向量
版本向量（Dynamo）。**每個 replica** 一個計數器，用於 KV store 的並發寫衝突偵測。形式上與 vector clock 相似但用途不同，口語常被混用；DDIA 與 Dynamo 系列論文中「version vector」指這個——不是 Lamport 的 vector clock。詳見 [Ch5](/part-2/ch05-replication)。

---

## W {.role-h2}

### WAL (Write-Ahead Log) {#wal}
**中文**：預寫日誌
修改前先寫日誌，保證 crash recovery。B-Tree 與許多儲存引擎的基礎。

### Wall Clock {#wall-clock}
**中文**：掛鐘時間
真實世界時間（如 `System.currentTimeMillis()`、`Date.now()`）。**可被 NTP 校正甚至向後跳**，不能用於測量 duration 或排序事件——改用 monotonic clock。詳見 [Ch8](/part-2/ch08-trouble)。

### Watermark {#watermark}
**中文**：水印
串流處理中標記「我認為時間 T 之前的事件都已到齊」的進度指標。用於決定何時關閉 window 並輸出結果。詳見 [Ch11](/part-3/ch11-streams)。

### Write Amplification {#write-amplification}
**中文**：寫放大
每寫入 1 byte 邏輯資料，實際引發更多 byte 的磁碟寫入。LSM 與 B-Tree 的關鍵效能指標。

### Write Skew {#write-skew}
**中文**：寫偏差
兩個交易讀相同前提、各自做不衝突的寫，但破壞跨列約束。**SI 擋不住**，需 Serializable。詳見 [Ch7](/part-2/ch07-transactions)。

---

::: tip 詞彙表怎麼維護
- **精簡定義（hover 用）**：[docs/.vitepress/data/glossary.ts](https://github.com/) —— SSOT
- **完整解釋（本頁）**：本檔
- 新增 / 移除詞彙時兩邊都要同步；修改長定義只動本檔。
:::

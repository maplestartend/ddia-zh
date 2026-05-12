// 詞彙 SSOT（Single Source of Truth）。
// 任何顯示「詞彙 hover tooltip」「詞彙連結」的地方都從這裡 import，
// 嚴禁在 .md / .vue 內重複維護精簡定義。
//
// 與 glossary/index.md 的分工：
//   - 這個檔：精簡定義（≤80 字，給 <G> 元件 hover 用）+ slug + 相關章節
//   - glossary/index.md：人類閱讀的長定義（可有粗體、註解、tip 區塊）
// 規則：新增 / 移除詞彙時必須兩邊同步；修改長定義只動 markdown。

export interface GlossaryEntry {
  readonly term: string         // 主要 key（用於 <G term="X">），通常英文小寫無空格
  readonly slug: string         // URL anchor，glossary/index.md 對應的 #anchor
  readonly chinese: string      // 中文名稱
  readonly english: string      // 完整英文名稱（含全寫）
  readonly shortDef: string     // hover 顯示，建議 ≤ 80 字
  readonly chapter?: string     // 主要章節連結，例如 '/part-2/ch07-transactions'
  readonly aliases?: readonly string[]  // 別名，例如 'p99' 也應指向 percentile
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  // ── 衡量指標素養（Part 0.2 重點，Ch1 直接用）──
  { term: 'throughput', slug: 'throughput', chinese: '吞吐量', english: 'Throughput',
    shortDef: '系統每秒能處理的請求或事件數量，單位常見 req/s、QPS、events/s。與 latency 是不同維度的指標。',
    chapter: '/part-0/metrics', aliases: ['qps'] },
  { term: 'latency', slug: 'latency', chinese: '延遲', english: 'Latency',
    shortDef: '單一請求從發出到收到回應的時間。要看 P50/P99 分布，不是平均值——平均值會被尾端拉偏但也會被快速請求拉平，兩邊都騙人。',
    chapter: '/part-0/metrics' },
  { term: 'percentile', slug: 'percentile', chinese: '百分位數', english: 'Percentile (P50/P95/P99/P999)',
    shortDef: 'P99 = 把全部請求按延遲排序、第 99% 名那個的延遲。比平均值更能反映尾端使用者體驗，是 SLA 的標準度量。',
    chapter: '/part-1/ch01-reliable', aliases: ['p50', 'p99', 'p999'] },
  { term: 'tail-latency', slug: 'tail-latency', chinese: '尾端延遲', english: 'Tail Latency',
    shortDef: '延遲分布的高百分位段（P99 以上）。當一個請求要 fan-out 給多個後端，整體延遲被「最慢的那個」決定——這叫 tail latency amplification。',
    chapter: '/part-1/ch01-reliable' },
  { term: 'sla', slug: 'sla-slo', chinese: 'SLA / SLO', english: 'Service Level Agreement / Objective',
    shortDef: 'SLA 是對外（合約、有賠償），SLO 是對內（目標、無賠償）。典型寫法「99.9% 請求 P99 < 200ms」，違反就觸發 alert 或退款。',
    chapter: '/part-0/metrics', aliases: ['slo'] },
  { term: 'scalability', slug: 'scalability', chinese: '可擴展性', english: 'Scalability',
    shortDef: '「當負載成長時，能否用合理成本撐住效能」的能力。不是抽象的「快」，必須回答「成長到什麼程度、什麼指標還能維持」。',
    chapter: '/part-1/ch01-reliable' },
  { term: 'scale-up', slug: 'scale-up', chinese: '垂直擴展', english: 'Scale Up (Vertical)',
    shortDef: '把單台機器升級到更強（更多 CPU、RAM、SSD）。簡單、無分散式問題，但有單機天花板與單點故障風險。' },
  { term: 'scale-out', slug: 'scale-out', chinese: '水平擴展', english: 'Scale Out (Horizontal)',
    shortDef: '加更多機器分擔負載。可以無上限擴展，但要面對複製、分區、共識等分散式系統難題（DDIA Part II 全書焦點）。' },
  { term: 'stateless', slug: 'stateless', chinese: '無狀態', english: 'Stateless Service',
    shortDef: '服務本身不保存任何請求之間的狀態，所有狀態都丟給 DB / Cache。橫向擴展時可以隨意加機器、任意請求路由到任一台。' },
  { term: 'stateful', slug: 'stateful', chinese: '有狀態', english: 'Stateful Service',
    shortDef: '服務內部保存資料（DB、message broker、Stateful set）。擴展困難得多——這就是 DDIA 整本書在處理的主題。' },

  // ── 系統元件 ──
  { term: 'cache', slug: 'cache', chinese: '快取', english: 'Cache',
    shortDef: '把熱資料放在更快的儲存層（記憶體、CDN），減輕後端壓力與延遲。常用 Redis、Memcached；DDIA Ch1 視為「應用拼湊系統」的典型元件之一。' },
  { term: 'message-queue', slug: 'message-queue', chinese: '訊息隊列', english: 'Message Queue / Broker',
    shortDef: '非同步傳遞訊息的中介系統（Kafka、RabbitMQ、SQS）。讓 producer 與 consumer 解耦、削峰填谷、實現 event-driven 架構。',
    chapter: '/part-3/ch11-streams' },
  { term: 'fan-out', slug: 'fan-out', chinese: '扇出', english: 'Fan-out',
    shortDef: '一個請求觸發多個下游請求。fan-out on write（Twitter 推文寫入時擴散到所有 follower 收件匣）vs fan-out on read（讀時才聚合）。',
    chapter: '/part-1/ch01-reliable' },
  { term: 'reverse-proxy', slug: 'reverse-proxy', chinese: '反向代理', english: 'Reverse Proxy',
    shortDef: '位於 client 與後端之間，代表後端接收請求並轉發（Nginx、HAProxy）。負責 load balancing、SSL termination、cache、限流。' },

  // ── SQL / 資料庫基礎 ──
  { term: 'sql', slug: 'sql', chinese: 'SQL', english: 'Structured Query Language',
    shortDef: '關聯式資料庫的標準查詢語言（1974 IBM）。宣告式：你說「要什麼」，DB 自己想「怎麼拿」（執行計畫由 query planner 決定）。',
    chapter: '/part-1/ch02-data-models' },
  { term: 'join', slug: 'join', chinese: 'JOIN', english: 'JOIN',
    shortDef: 'SQL 把兩張表依關聯欄位合併的操作。實作演算法：nested loop、hash join、sort-merge join——選哪個由 query planner 看資料量決定。',
    chapter: '/part-1/ch02-data-models' },
  { term: 'nosql', slug: 'nosql', chinese: 'NoSQL', english: 'NoSQL (Not Only SQL)',
    shortDef: '非關聯式資料庫的統稱：document（MongoDB）、KV（Redis）、column-family（Cassandra）、graph（Neo4j）。各有適用場景，不是 SQL 的全面替代。',
    chapter: '/part-1/ch02-data-models' },
  { term: 'sharding', slug: 'sharding', chinese: '分片 / 分區', english: 'Sharding / Partitioning',
    shortDef: '把資料集橫向切分到多個節點，每個節點只負責一部分。常見策略：hash、range、目錄式。',
    chapter: '/part-2/ch06-partitioning' },

  // ── 可靠性概念 ──
  { term: 'redundancy', slug: 'redundancy', chinese: '冗餘', english: 'Redundancy',
    shortDef: '故意保留多份備援（RAID 多顆磁碟、雙電源、多副本）。容忍個別元件失效——「容錯（fault tolerance）」的實作手段。' },
  { term: 'cascading-failure', slug: 'cascading-failure', chinese: '級聯失效', english: 'Cascading Failure',
    shortDef: '一個元件失效造成負載轉到其他元件，把它們也壓垮，連鎖反應擴大為全系統故障。常見：DB 慢 → 重試風暴 → 完全死。',
    chapter: '/part-1/ch01-reliable' },
  { term: 'fault', slug: 'fault', chinese: '故障', english: 'Fault',
    shortDef: '單個元件偏離規格（硬碟壞、網路斷）。容錯系統能容忍 fault 不變成 failure。注意 fault ≠ failure：failure 是整個系統罷工。',
    chapter: '/part-1/ch01-reliable' },

  // ── ACID / 交易 ──
  { term: 'acid', slug: 'acid', chinese: 'ACID', english: 'Atomicity, Consistency, Isolation, Durability',
    shortDef: '傳統資料庫交易的四大保證。注意「Consistency」在 ACID 與分散式系統中是兩種不同的意思——這個詞 DDIA Ch7 開宗明義就吐槽。',
    chapter: '/part-2/ch07-transactions' },
  { term: 'isolation-level', slug: 'isolation-level', chinese: '隔離級別', english: 'Isolation Level',
    shortDef: 'Read Uncommitted / Read Committed / Repeatable Read / Snapshot Isolation / Serializable。各家 DB 對同名級別實作不同——別假設 PG 的 RR 跟 MySQL 的 RR 一樣。',
    chapter: '/part-2/ch07-transactions' },
  { term: 'dirty-read', slug: 'dirty-read', chinese: '髒讀 / 髒寫', english: 'Dirty Read / Dirty Write',
    shortDef: '讀到 / 覆寫未提交的資料。Read Committed 隔離級別防止之。',
    chapter: '/part-2/ch07-transactions' },
  { term: 'snapshot-isolation', slug: 'snapshot-isolation', chinese: '快照隔離', english: 'Snapshot Isolation',
    shortDef: '每筆交易看到開始時刻的快照。現代 DB 多以 MVCC 實作。擋得住「讀取階段的 phantom」（快照看不到新插入），但擋不住 write skew 與 phantom-based write skew。',
    chapter: '/part-2/ch07-transactions' },
  { term: 'serializability', slug: 'serializability', chinese: '可序列化', english: 'Serializability',
    shortDef: '最強的隔離級別，效果如同所有交易循序執行。實作：2PL、SSI、Actual Serial Execution。',
    chapter: '/part-2/ch07-transactions' },

  // ── 儲存引擎 ──
  { term: 'b-tree', slug: 'b-tree', chinese: 'B-Tree', english: 'B-Tree',
    shortDef: '傳統關聯式 DB 的索引結構。原地更新（in-place），讀快。',
    chapter: '/part-1/ch03-storage' },
  { term: 'lsm-tree', slug: 'lsm-tree', chinese: 'LSM-Tree', english: 'Log-Structured Merge Tree',
    shortDef: '寫入只追加（append-only）、背景合併（compaction）。順序寫帶來高寫入吞吐；寫放大依 compaction 策略而定，leveled 常達 10–30×（不一定比 B-Tree 低）。RocksDB、Cassandra、LevelDB 採用。',
    chapter: '/part-1/ch03-storage' },
  { term: 'sstable', slug: 'sstable', chinese: 'SSTable', english: 'Sorted String Table',
    shortDef: '排序字串表。LSM-Tree 的儲存單位——key 已排序的不可變檔案。',
    chapter: '/part-1/ch03-storage' },
  { term: 'wal', slug: 'wal', chinese: 'WAL', english: 'Write-Ahead Log',
    shortDef: '預寫日誌。修改前先寫日誌，保證 crash recovery。B-Tree 與許多儲存引擎的基礎。' },
  { term: 'write-amplification', slug: 'write-amplification', chinese: '寫放大', english: 'Write Amplification',
    shortDef: '每寫入 1 byte 邏輯資料，實際引發更多 byte 的磁碟寫入。LSM 與 B-Tree 的關鍵效能指標。' },
  { term: 'bloom-filter', slug: 'bloom-filter', chinese: 'Bloom Filter', english: 'Bloom Filter',
    shortDef: '機率資料結構，能高效判斷「key 絕對不在集合中」——有 false positive、無 false negative。常見於 LSM-Tree。' },

  // ── 編碼 / 演進 ──
  { term: 'backward-compatibility', slug: 'backward-compatibility', chinese: '向後相容', english: 'Backward Compatibility',
    shortDef: '新版程式能讀舊版資料。記憶：backward = 看過去（舊資料）。中文「向後／向前」與英文直覺相反，初學者極易混淆。',
    chapter: '/part-1/ch04-encoding' },
  { term: 'forward-compatibility', slug: 'forward-compatibility', chinese: '向前相容', english: 'Forward Compatibility',
    shortDef: '舊版程式能讀新版資料（遇到陌生新欄位需跳過、不能崩潰）。記憶：forward = 看未來（新資料）。',
    chapter: '/part-1/ch04-encoding' },

  // ── 複製 / 分區 ──
  { term: 'replication', slug: 'replication', chinese: '複製', english: 'Replication',
    shortDef: '把同一份資料保存在多個節點。三種架構：single-leader、multi-leader、leaderless。',
    chapter: '/part-2/ch05-replication' },
  { term: 'failover', slug: 'failover', chinese: '故障轉移', english: 'Failover',
    shortDef: '主節點掛了選新 leader 的過程。腦裂（split brain）是這裡最危險的情境。',
    chapter: '/part-2/ch05-replication' },
  { term: 'split-brain', slug: 'split-brain', chinese: '腦裂', english: 'Split Brain',
    shortDef: '網路分區後兩邊都自認為 leader，造成資料衝突。多數系統用 fencing token 或共識協定避免。' },
  { term: 'quorum', slug: 'quorum', chinese: '法定人數', english: 'Quorum',
    shortDef: 'W + R > N 公式保證讀寫集有交集。注意：quorum 不無條件保證讀到最新值（網路分區、reordering 仍可能讀舊）。',
    chapter: '/part-2/ch05-replication' },
  { term: 'hot-spot', slug: 'hot-spot', chinese: '熱點', english: 'Hot Spot',
    shortDef: '負載集中在單一分區的問題。常見原因：明星用戶、時間序列資料、單一熱門 key。',
    chapter: '/part-2/ch06-partitioning' },

  // ── 分散式系統麻煩 ──
  { term: 'process-pause', slug: 'process-pause', chinese: '行程暫停', english: 'Process Pause',
    shortDef: 'GC、VM 遷移、闔上筆電都會造成行程「死一段時間」。在分散式系統中會被誤判為「節點失聯」。',
    chapter: '/part-2/ch08-trouble' },
  { term: 'wall-clock', slug: 'wall-clock', chinese: '掛鐘時間', english: 'Wall Clock',
    shortDef: '真實世界時間（System.currentTimeMillis()）。可被 NTP 校正甚至向後跳，不能用於測量 duration 或排序事件。',
    chapter: '/part-2/ch08-trouble' },
  { term: 'monotonic-clock', slug: 'monotonic-clock', chinese: '單調時鐘', english: 'Monotonic Clock',
    shortDef: 'System.nanoTime()。只能用來測 duration，不能跨機器比較。保證單調遞增，不會回跳。',
    chapter: '/part-2/ch08-trouble' },
  { term: 'fencing-token', slug: 'fencing-token', chinese: '防護令牌', english: 'Fencing Token',
    shortDef: '分散式鎖搭配的單調遞增號，防止「過期持有者」污染資料。儲存層拒絕比已知最大號還小的請求。',
    chapter: '/part-2/ch08-trouble' },
  { term: 'byzantine-fault', slug: 'byzantine-fault', chinese: '拜占庭故障', english: 'Byzantine Fault',
    shortDef: '節點不只是當機，可能傳送錯誤或惡意訊息。多數系統不處理這種故障（成本太高），只處理 crash-stop。',
    chapter: '/part-2/ch08-trouble' },

  // ── 會話保證（Session Guarantees, Ch5）──
  { term: 'read-your-writes', slug: 'read-your-writes', chinese: '讀己寫', english: 'Read Your Writes',
    shortDef: '使用者寫入後，自己的後續讀取一定能看到自己的寫（即使副本還沒同步給其他人）。實作：讀 leader、或記下時間戳要求 follower 至少同步到該時間。',
    chapter: '/part-2/ch05-replication' },
  { term: 'monotonic-reads', slug: 'monotonic-reads', chinese: '單調讀', english: 'Monotonic Reads',
    shortDef: '使用者多次讀取不會「時光倒流」——讀到較新值後不會再讀到較舊值。實作：每位使用者固定 sticky 到同一副本。',
    chapter: '/part-2/ch05-replication' },
  { term: 'consistent-prefix-reads', slug: 'consistent-prefix-reads', chinese: '一致前綴讀', english: 'Consistent Prefix Reads',
    shortDef: '若一系列寫入按某順序發生，所有觀察者要嘛看到這個前綴、要嘛還沒看到，不會看到亂序的中段。分區系統最易違反。',
    chapter: '/part-2/ch05-replication' },
  { term: 'strict-serializability', slug: 'strict-serializability', chinese: '嚴格可序列化', english: 'Strict Serializability',
    shortDef: 'Serializability + Linearizability。交易能可序列化執行，且全局順序與實時順序一致——Spanner、CockroachDB 的真正保證。比 Linearizable 多了「跨多物件」、比 Serializable 多了「實時順序」。',
    chapter: '/part-2/ch09-consistency' },
  { term: 'pacelc', slug: 'pacelc', chinese: 'PACELC', english: 'PACELC',
    shortDef: 'Daniel Abadi 2012 對 CAP 的補完。Partition 時選 A vs C；Else 網路正常時選 L（latency）vs C。Cassandra 是 PA/EL、Spanner 是 PC/EC。比 CAP 更貼近實務。',
    chapter: '/part-2/ch09-consistency' },

  // ── 一致性 / 共識 ──
  { term: 'linearizability', slug: 'linearizability', chinese: '線性一致', english: 'Linearizability',
    shortDef: '最強一致性保證：系統表現得像只有單一副本，每個操作看起來在某瞬時點原子發生。注意 linearizability ≠ serializability。',
    chapter: '/part-2/ch09-consistency' },
  { term: 'consensus', slug: 'consensus', chinese: '共識', english: 'Consensus',
    shortDef: 'N 個節點對某個值達成一致。Paxos、Raft 是典型演算法。FLP 證明純非同步系統無法保證終止。',
    chapter: '/part-2/ch09-consistency' },
  { term: 'cap-theorem', slug: 'cap-theorem', chinese: 'CAP 定理', english: 'CAP Theorem',
    shortDef: '網路分區（P）發生時，必須在 Consistency 與 Availability 之間選擇。常被誤解為「三選二」——其實 P 是必選。',
    chapter: '/part-2/ch09-consistency' },
  { term: 'eventual-consistency', slug: 'eventual-consistency', chinese: '最終一致性', english: 'Eventual Consistency',
    shortDef: '無新寫入時，副本最終會收斂相同值。leaderless / multi-leader 複製的典型保證。「最終」可能很久。' },
  { term: 'raft', slug: 'raft', chinese: 'Raft', english: 'Raft',
    shortDef: '易理解的共識演算法（2014）。etcd、Consul、TiKV 採用。比 Paxos 好教學是它的設計目標。',
    chapter: '/part-2/ch09-consistency' },
  { term: '2pc', slug: 'two-phase-commit', chinese: '兩階段提交', english: 'Two-Phase Commit (2PC)',
    shortDef: 'Prepare + Commit/Abort。跨節點原子提交的傳統解。Coordinator 有單點失效風險。',
    chapter: '/part-2/ch09-consistency' },

  // ── 串流 / 批次 ──
  { term: 'event-sourcing', slug: 'event-sourcing', chinese: '事件溯源', english: 'Event Sourcing',
    shortDef: '把狀態變更（事件）當主資料，當前狀態是衍生的。可重放歷史、可審計、適合 audit-heavy 領域。',
    chapter: '/part-3/ch11-streams' },
  { term: 'cdc', slug: 'cdc', chinese: 'CDC', english: 'Change Data Capture',
    shortDef: '從 DB 的 transaction log 抽取變更事件。讓 DB 變成 Kafka 的上游、解鎖即時 analytics。',
    chapter: '/part-3/ch11-streams' },
  { term: 'mapreduce', slug: 'mapreduce', chinese: 'MapReduce', english: 'MapReduce',
    shortDef: 'Google 2004 提出的批次處理典範。Map + Shuffle + Reduce 三階段，可擴展到 PB 級資料。',
    chapter: '/part-3/ch10-batch' },

  // ── 並行 ──
  { term: 'race-condition', slug: 'race-condition', chinese: '競態條件', english: 'Race Condition',
    shortDef: '多個執行緒 / 行程同時存取共享狀態，結果取決於誰先誰後。lost update、phantom 都是 race condition 的特例。' },
  { term: 'lock', slug: 'lock', chinese: '鎖', english: 'Lock / Mutex',
    shortDef: '確保臨界區（critical section）一次只有一個執行緒進入的機制。代價：競爭時等待、可能 deadlock。' },
  { term: 'idempotent', slug: 'idempotent', chinese: '冪等', english: 'Idempotent',
    shortDef: '同一操作執行多次效果等同一次。分散式系統重試的基本要求——配 exactly-once 語意的根基。' },

  // ── 作業系統 ──
  { term: 'process', slug: 'process', chinese: '行程', english: 'Process',
    shortDef: '作業系統分配資源的單位，有獨立的虛擬記憶體空間。注意：台灣譯「行程」、中國譯「進程」，DDIA 中文網站用前者。' },
  { term: 'thread', slug: 'thread', chinese: '執行緒', english: 'Thread',
    shortDef: '行程內的執行單元，共享記憶體空間。並行寫共享資料就是 race condition 的溫床。' },
  { term: 'page-cache', slug: 'page-cache', chinese: '頁面快取', english: 'Page Cache',
    shortDef: 'OS 把最近讀寫的磁碟頁保留在 RAM。為什麼讀 SSTable 第二次比第一次快很多就是它。fsync 才強制寫回磁碟。' },
  { term: 'page-fault', slug: 'page-fault', chinese: '頁面錯誤', english: 'Page Fault',
    shortDef: '程式存取的記憶體頁不在 RAM 中，OS 需從磁碟把它載入——過程中程式行程停下等磁碟。' },
  { term: 'fsync', slug: 'fsync', chinese: 'fsync', english: 'fsync',
    shortDef: '強制把 OS page cache 寫回磁碟的系統呼叫。沒呼叫 fsync 的寫入，停電時可能丟失——WAL 的關鍵步驟。' },

  // ── 網路 ──
  { term: 'tcp', slug: 'tcp', chinese: 'TCP', english: 'Transmission Control Protocol',
    shortDef: '可靠、有序、有流量控制的傳輸層協定。三次握手建立連線、超時重傳保證可靠——但「可靠」是指最終會送到或斷線，不是即時。' },
  { term: 'http', slug: 'http', chinese: 'HTTP', english: 'HyperText Transfer Protocol',
    shortDef: '應用層協定，建立在 TCP 上（HTTP/3 改用 QUIC over UDP）。無狀態、request-response 模型，是 REST API 的基礎。' },
  { term: 'rpc', slug: 'rpc', chinese: 'RPC', english: 'Remote Procedure Call',
    shortDef: '偽裝成本地呼叫的網路請求，但永遠無法真正等價於本地（會丟包、會 timeout、有變動延遲）。gRPC、Thrift 是典型實作。',
    chapter: '/part-1/ch04-encoding' },

  // ── 資料結構 ──
  { term: 'hash-table', slug: 'hash-table', chinese: '雜湊表', english: 'Hash Table',
    shortDef: 'O(1) 平均存取的 KV 結構。記憶體內 KV store（Redis、Memcached）核心；磁碟上的 hash index（Bitcask）。' },
  { term: 'big-o', slug: 'big-o', chinese: '大 O 記號', english: 'Big-O Notation',
    shortDef: '描述演算法時間 / 空間複雜度的上界。O(1) 常數、O(log n) 二分查找、O(n log n) 排序、O(n²) 巢狀循環。' }
] as const

// 為了 O(1) 查詢，建立 term → entry 的對照表
const GLOSSARY_INDEX = new Map<string, GlossaryEntry>()
for (const entry of GLOSSARY) {
  GLOSSARY_INDEX.set(entry.term.toLowerCase(), entry)
  if (entry.aliases) {
    for (const alias of entry.aliases) {
      GLOSSARY_INDEX.set(alias.toLowerCase(), entry)
    }
  }
}

export function findTerm(term: string): GlossaryEntry | undefined {
  return GLOSSARY_INDEX.get(term.toLowerCase())
}

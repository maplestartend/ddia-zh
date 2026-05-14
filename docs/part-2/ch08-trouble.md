---
title: Ch8 分散式系統的麻煩
---

<ChapterOpener chapter-id="ch08" />

<ChapterMeta part="Part II 分散式資料" :read-time="50" difficulty="進階" :tags="['Network', 'Clock', 'Failure']" prereq="Ch5" />

<TLDR :points='[
  "<strong>分散式系統的本質是「部分失效」</strong>：單機要麼正常要麼掛掉，分散式系統會處於「某部分掛、某部分正常、誰也不確定」的灰色狀態。",
  "<strong>網路是 unreliable 的</strong>：封包可能丟失、重複、亂序、延遲。Timeout 是唯一的偵測手段，但長短都有代價。",
  "<strong>時鐘有兩種、都不能信</strong>：time-of-day clock（可跳變）vs monotonic clock（單調但無絕對意義）。NTP 同步誤差可達數百 ms、無法用於排序事件。",
  "<strong>Process pause 隨時可能發生</strong>：GC、虛擬機暫停、page fault、CPU 排程都會讓你的行程「死一段時間」、然後復活以為時間沒過。",
  "<strong>「真相由多數決定」</strong>：單一節點不能信任自己（可能已被孤立）；分散式系統用 quorum、fencing token 等機制讓多數決定誰是 leader。"
]' />

<FirstReadShortcut>

這章名字叫「分散式系統的麻煩」、但實際是「**讓你產生對分散式 bug 的直覺**」。**第一次讀建議聚焦三節**：

- **必讀核心**：§8.1 部分失效 + §8.2 不可靠網路 + §8.3 不可靠時鐘
- **第一次可跳**：§8.4 Process pause 的 lease 例子細節（抓住「GC / cgroup throttling 會讓你的時間感覺被偷走」即可）+ §8.5 拜占庭故障（多數工程師職涯不會碰到、抓住「為什麼多數系統假設非拜占庭」即可）

讀完核心三節你會**開始懷疑網路和時鐘**——這是讀 Ch9 共識前必須的心態切換。

</FirstReadShortcut>

::: tip 先備名詞速查（本章會密集出現）
| 名詞 | 一句話 |
|---|---|
| **NTP**（Network Time Protocol） | 跨機器同步時鐘的網路協定。誤差通常數十毫秒，但 WAN 環境可達數百毫秒以上。 |
| **GC**（Garbage Collection） | 程式語言自動回收記憶體的機制；Java / Go 都有。 |
| **Stop-the-world GC** | GC 進行時整個程式行程暫停，所有執行緒卡住。Java 老式 GC 一次可暫停數秒。 |
| **Page fault** | 程式存取的記憶體頁不在 RAM，OS 需從磁碟載入 —— 過程中程式停下等磁碟。 |
| **WAL**（Write-Ahead Log） | 「先寫日誌，再改實際資料」的崩潰恢復機制；磁碟 DB 與檔案系統的標配。 |
| **Wall clock** | 真實世界時間（如 `System.currentTimeMillis()`），可被 NTP 校正甚至向後跳。 |
| **Monotonic clock** | 行程內單調遞增的計時器（如 `System.nanoTime()`），只能測 duration，不能跨機器比較。 |

不熟也沒關係，本章會在用到時再解釋。先建立印象即可。
:::

## 8.1 部分失效（Partial Failure）

單機系統：要麼整體正常，要麼整體當機 —— 容易理解。
分散式系統：**部分節點正常，部分節點異常，而且你不知道是哪些**。

> "Anything that can go wrong, will go wrong." — Murphy's Law
> 分散式系統的設計就是承認這點，並設計讓系統在故障中仍正確運作。

---

## 8.2 不可靠的網路

網路請求可能：
1. 成功送達且回應正常 ✓
2. 請求遺失（網線壞、防火牆丟）
3. 對方排在 queue 太久未處理
4. 對方處理了但回應遺失
5. 對方處理了但回應延遲

**Client 看到的只有「沒收到回應」**，無法分辨上面哪種情況 → 必須用 **timeout** 判斷，但：
- timeout 太短 → 把正常的當失敗（false positive）
- timeout 太長 → 故障偵測慢

### 網路分區（Network Partition）
叢集被切成兩塊互通不到對方 → 各自以為對方掛了 → **split brain**。

::: warning 雲端是更動盪的環境
公有雲環境的網路延遲變化遠大於專屬資料中心。AWS 曾有過 30 秒 + 的封包延遲案例——出處：[Bailis & Kingsbury 2014, ACM Queue "The Network is Reliable"](https://queue.acm.org/detail.cfm?id=2655736) 整理了多家公司觀測到的網路異常，**EC2 上有 30 秒以上延遲的觀測**只是其中一個案例。**這不是只有 cloud——傳統 DC 在 switch 升級、TOR 故障、機架網卡退化時也會看到類似行為**，網路工程不是「上雲才麻煩」的特殊問題。
:::

::: tip 本土場景：HiNet 跨機房斷網 + 中華電信 MOD 直播卡頓
**台灣工程師遇過的 partial failure**：
- **HiNet 跨機房 BGP 抖動**（每年總會有幾次）：A 機房連 B 機房的封包延遲從 1ms 飆到 200ms、持續 30 秒、然後恢復——你的 monitoring dashboard 看不到「斷網」、只看到 P99 延遲尖刺。**這就是 partial failure**：沒有任何節點當機、但系統行為已經錯了
- **MOD 直播突然卡 3 秒、然後自動補上**：原因可能是 CDN 邊緣節點的健康檢查 timeout 太短、把實際只是 GC pause 的後端錯判為當機、流量切到備援，等備援預熱完成才恢復——**這正是 §8.4 process pause 在現實的化身**
- **電信業者 ASR / GR**（Application Server Restart / Graceful Restart）：5G core network 升級時封包會 buffer 1-3 秒再放出——**對應用層看起來像「網路停了一下又恢復」，但實際是有意的 pause**

**DDIA 原書用 Amazon / Google paper、本站用 HiNet / MOD、底層的 partial failure / unreliable network / process pause 都是同一套**。
:::

::: tip 網路常見故障源清單（SRE 自學鋪墊）
書本喜歡寫「網路會丟封包」抽象、但 SRE 遇到的是**有名字的具體故障源**——記得這些字、debug 時直接知道往哪查：

| 故障源 | 症狀 | 偵測 |
|---|---|---|
| **BGP misconfig / hijack** | 跨 ISP 路由突然繞遠 / 黑洞 | BGP route monitoring（Cloudflare Radar、Hurricane Electric） |
| **DNS 失效 / 中毒** | 解析超時、解析到錯誤 IP | `dig +trace` 比對、TTL 觀察 |
| **MTU 黑洞（PMTU discovery 失敗）** | 大封包 silently 丟失、小封包正常 | `ping -M do -s 1472` 測試 |
| **TCP RST 風暴** | 短時間大量連線被重置 | `netstat -s` 看 `connection resets received` |
| **TLS handshake 慢** | 連線成功但 RTT 多 100-300ms | `curl -w "%{time_appconnect}"` |
| **Switch / TOR 升級** | 機架內 IP 短暫不可達 | DC 變更紀錄 + traceroute 路徑變動 |
| **NAT 表耗盡** | 突然大量連線失敗、源端口號 < 32768 | conntrack 表觀察 |
| **Anycast 路由切換** | 用戶從 A 機房切到 B 機房、TCP 連線重置 | CDN provider event log |

**這節是「Ch8 §8.2 從教材延伸到實務」的橋**——不需要全部記、但記得到「**網路故障不是單一現象、是一堆有名字的具體模式**」就夠了。
:::

::: tip TCP keepalive 預設 7200 秒太長、連線池飽和的真兇
SRE 寫 service-to-service 呼叫最常踩的雷：**TCP keepalive 預設 2 小時、應用層 timeout 必須短於這個**。

- **Linux 預設**：`tcp_keepalive_time=7200` 秒（**2 小時**）才開始 probe、之後 `tcp_keepalive_probes=9` × `tcp_keepalive_intvl=75` 才放棄連線 → **最壞要 2 小時 11 分才偵測到對端死亡**
- **問題**：你的 service-to-service 連線池如果有 100 條連線、下游一個 pod 直接 kill `-9`、你的應用程式**完全感知不到**、繼續往那 100 條死連線塞請求 → connection refused / hang
- **解法**：
  - 應用層 timeout（`tcp_user_timeout` 或 framework HTTP client timeout）設 30 秒以內、強制中斷
  - 連線池啟用 idle health check（如 HikariCP `validationTimeout`、urllib3 `Retry`）
  - K8s 服務間用 service mesh（Istio / Linkerd）、它們會處理 transparent health check

**為什麼連線池容易飽和**：典型場景是「下游慢 → connection 卡住 → pool 滿 → 新請求拿不到 connection → 上游也卡」——這就是 Ch1 的 cascading failure 在 connection-level 的化身、配合 keepalive 預設太長放大效果。
:::

---

## 8.3 不可靠的時鐘

### Time-of-day Clock
`System.currentTimeMillis()`、`gettimeofday()`：表示 Unix 時間。
- 由 <G term="ntp">NTP</G> 同步 → **可能向前/向後跳變**
- 不能用來測量「經過多少時間」

### <G term="monotonic-clock">Monotonic Clock</G>
`System.nanoTime()`、`clock_gettime(CLOCK_MONOTONIC)`：
- ✓ 單調遞增
- ✗ 沒有絕對意義（不能跨機器比較）
- ✓ 適合測量 duration

### 時鐘的陷阱
```
T1 在 Node A: 寫 x=1 at t=100
T2 在 Node B: 寫 x=2 at t=99   ← B 的時鐘比 A 慢 5ms
LWW → x=1（保留 T1），但實際上 T2 是「後發生」的
```
**結論**：時間戳不能用來決定事件順序（除非有特殊機制如 TrueTime）。

### Google TrueTime
給每個時間戳一個**信賴區間** `[earliest, latest]`，保證真實時間在這區間內。Spanner 用它做全球一致交易，關鍵機制是 **commit-wait**：

- **write-side（不是 read-side）等待**：交易 commit 時主動 sleep 到 `TT.now().latest > 自己的 commit timestamp` 才回傳給 client，確保「我 commit 後、任何下次的 `TT.now()` 都比我大」
- **讀不需等**：reader 只要 `TT.now().earliest > s` 就能確認 s 對應的交易已成為過去

這把「時鐘不確定性」搬到 write 那一側、用延遲換 external consistency。詳細推導見 [Ch9 §9.6](/part-2/ch09-consistency#spanner-truetime-與-commit-wait)。

---

## 8.4 <G term="process-pause">Process Pause</G>

你的<G term="process">行程</G>可能在執行到一半時被「暫停」：
- JVM 的 stop-the-world GC（可達數秒）
- 虛擬機被遷移到別的 host
- 筆電闔上 → 醒來
- 同機其他行程搶 CPU
- 同步磁碟 I/O
- **Container CPU throttling**：K8s / Docker 設了 cgroup CPU quota（如 `cpu: 500m`），一旦該 100ms slice 用完，**OS 直接把行程暫停到下個 slice 才繼續**。現代 Java / Go 服務在 K8s 上跑遇到「莫名的尾延遲尖刺」常是這原因、不是 GC

```java
while (true) {
  if (lease.expiresAt > now()) {
    doWork();  // ← GC 在這裡停 30 秒
  }            // ← 醒來繼續做事，但 lease 早就過期了
}
```

→ **不能假設 <G term="wall-clock">wall-clock time</G> 在程式碼之間恆等於行程的進度**。

<SectionDivider icon="psychology" label="心智模型" />

## 8.5 知識、真相與謊言

### <G term="quorum">Quorum</G> 是真相的依據
單一節點即使自認為 leader，**可能已被其他節點集體罷免**。要相信「多數決」的結果，而不是自己。

::: tip 從「節點別信自己」到「全系統怎麼一致決定真相」—— Ch9 共識的引線
本節點出的核心觀念是：**單一節點無法可信地宣告事實**——它的時鐘可能漂、它可能 GC pause 30 秒醒來不知道自己被踢、它可能在網路分區的少數派裡自以為是多數。**Quorum 是把「真相」從個體升級到群體決議**的機制——但僅是起點。

Ch9（一致性與共識）會接著回答更深的問題：
- **線性一致**（Linearizability）：要怎樣讓「全系統看起來像一台機器」？這比 quorum 更強——quorum 保證讀到「最近的多數派寫」、線性一致還要求**尊重 real-time 順序**
- **全序廣播**（Total Order Broadcast）：要怎樣讓**所有節點按相同順序看到所有訊息**？這跟線性一致**等價**，也跟共識等價
- **共識演算法**（Paxos、Raft、ZAB）：在 Ch8 列舉的所有不可靠假設下、如何讓 N 個節點對某個值達成不可逆的一致決定

**讀 Ch9 前帶著這個視角**：Ch8 是「**不可靠的事實**」的清單、Ch9 是「**這些不可靠之上、怎麼建立可靠決議**」的方法論。Fencing token 是 Ch8 的小型應用（單一鎖場景）、Raft 是 Ch9 的全面解（任何決議場景）。
:::

### <G term="fencing-token">Fencing Token</G>
分散式鎖 + Token：
```
1. Client A 拿到 lock，token = 33
2. A 卡住（GC）
3. Lock 過期，Client B 拿到 lock，token = 34
4. A 復活，帶著 token=33 嘗試寫入
5. 儲存系統檢查：當前 token >= 34 → 拒絕 A 的寫入
```

### <G term="byzantine-fault">Byzantine Fault</G>
節點不只是「掛」，而是**故意說謊**（被駭、bug 產生錯誤輸出）。
- 常規分散式系統假設 non-Byzantine：節點要麼正確要麼當機
- Byzantine fault tolerant：軍方、衛星、區塊鏈（PoW、BFT 共識）

---

## 章末練習

::: tip 思考題
1. 寫一個 Python 程式，每秒 print 一次 `time.time()` 與 `time.monotonic()`，觀察 NTP 同步時的差異。
2. 故意觸發 JVM 長 GC，觀察行程「醒來後」的時間誤差。
3. 設計題：你的 SaaS 服務分區了，一個 DC 與外界網路中斷。你的服務是選 CP（停止服務保證一致性）還是 AP（繼續服務允許短期不一致）？理由？
:::

<Quiz chapter-id="ch08" :questions='[
  {
    difficulty: "applied",
    question: "為什麼 timeout 是分散式系統中偵測故障的主要工具，但「不完美」？",
    options: [
      "因為網路太快，沒時間 timeout",
      "因為無法區分對方真的當機 vs 對方很慢但仍會回應，太短誤判太長偵測慢",
      "因為 timeout 浪費電力",
      "因為 timeout 違反 ACID"
    ],
    answer: 1,
    explanation: "「沒收到回應」可能是對方掛了，也可能只是慢。timeout 強制做出二選一的判斷，但這個判斷可能錯，導致重複處理（對方其實成功了）或誤判故障。"
  },
  {
    difficulty: "applied",
    question: "為什麼不能用 `System.currentTimeMillis()` 來測量函式執行時間？",
    options: [
      "因為它太慢",
      "因為 NTP 可能在執行中校正時鐘，造成時間跳變甚至倒退",
      "因為精度太低",
      "因為只在 Windows 上能用"
    ],
    answer: 1,
    explanation: "time-of-day clock 會被 NTP 校正，可能向前跳或向後倒退。測 duration 要用 monotonic clock（`System.nanoTime`），它保證單調遞增。"
  },
  {
    difficulty: "interview",
    question: "Fencing Token 機制要解決的問題是？",
    options: [
      "加密通訊",
      "持有過期 lock 的舊 client 在 GC 醒來後仍嘗試寫入，污染資料",
      "減少網路流量",
      "在沒有時鐘時仍能排序事件"
    ],
    answer: 1,
    explanation: "光靠 timeout-based lock 不夠 —— 因為持有者可能卡住、lock 已轉手卻不知道。Fencing token 是單調遞增號，儲存層拒絕「比目前 token 還舊」的寫入請求。"
  },
  {
    difficulty: "basic",
    question: "「Byzantine fault」與一般的 fail-stop 故障差別在？",
    options: [
      "Byzantine fault 只發生在數學家身上",
      "Byzantine 節點不只是當機，可能傳送任意（包括故意錯誤的）訊息",
      "Byzantine fault 只影響網路層",
      "Byzantine fault 在現代系統已不存在"
    ],
    answer: 1,
    explanation: "Fail-stop：節點要麼正確要麼停止回應。Byzantine：節點可能傳送錯誤訊息、欺騙其他節點。一般雲服務假設非 Byzantine；公開區塊鏈、軍事系統需要 BFT 共識。"
  }
]' />

<ChapterNote chapter-id="ch08" />

<Progress chapter-id="ch08" />

<NextChapterBridge chapter-id="ch08" />

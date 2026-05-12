---
title: Ch8 分散式系統的麻煩
---

# Ch8 · 分散式系統的麻煩

<ChapterMeta part="Part II 分散式資料" :read-time="50" difficulty="進階" :tags="['Network', 'Clock', 'Failure']" prereq="Ch5" />

<TLDR :points='[
  "<strong>分散式系統的本質是「部分失效」</strong>：單機要麼正常要麼掛掉，分散式系統會處於「某部分掛、某部分正常、誰也不確定」的灰色狀態。",
  "<strong>網路是 unreliable 的</strong>：封包可能丟失、重複、亂序、延遲。Timeout 是唯一的偵測手段，但長短都有代價。",
  "<strong>時鐘有兩種，都不能信</strong>：time-of-day clock（可跳變）vs monotonic clock（單調但無絕對意義）。NTP 同步誤差可達數百 ms，無法用於排序事件。",
  "<strong>Process pause 隨時可能發生</strong>：GC、虛擬機暫停、page fault、CPU 排程都會讓你的行程「死一段時間」，然後復活以為時間沒過。",
  "<strong>「真相由多數決定」</strong>：單一節點不能信任自己（可能已被孤立）；分散式系統用 quorum、fencing token 等機制讓多數決定誰是 leader。"
]' />

::: tip 先備名詞速查（本章會密集出現）
| 名詞 | 一句話 |
|---|---|
| **NTP**（Network Time Protocol） | 跨機器同步時鐘的網路協定。誤差通常數十毫秒，但 WAN 環境可達數百毫秒以上。 |
| **GC**（Garbage Collection） | 程式語言自動回收記憶體的機制；Java / Go 都有。 |
| **Stop-the-world GC** | GC 進行時整個程式行程暫停，所有執行緒卡住。Java 老式 GC 一次可暫停數秒。 |
| **Page fault** | 程式存取的記憶體頁不在 RAM，OS 需從磁碟載入 —— 過程中程式停下等磁碟。 |
| **WAL**（Write-Ahead Log） | 「先寫日誌，再改實際資料」的崩潰恢復機制；磁碟 DB 與檔案系統的標配。 |
| **Wall clock** | 真實世界時間（如 `System.currentTimeMillis()`），可被 NTP 校正甚至向後跳。 |
| **Monotonic clock** | 程序內單調遞增的計時器（如 `System.nanoTime()`），只能測 duration，不能跨機器比較。 |

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
公有雲環境的網路延遲變化遠大於專屬資料中心。AWS 曾有過 30 秒 + 的封包延遲案例。
:::

---

## 8.3 不可靠的時鐘

### Time-of-day Clock
`System.currentTimeMillis()`、`gettimeofday()`：表示 Unix 時間。
- 由 NTP 同步 → **可能向前/向後跳變**
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
給每個時間戳一個**信賴區間** `[earliest, latest]`，比較時若兩個區間不重疊才能定序，重疊就等待。Spanner 用它做全球一致交易。

---

## 8.4 <G term="process-pause">Process Pause</G>

你的<G term="process">行程</G>可能在執行到一半時被「暫停」：
- JVM 的 stop-the-world GC（可達數秒）
- 虛擬機被遷移到別的 host
- 筆電闔上 → 醒來
- 同機其他行程搶 CPU
- 同步磁碟 I/O

```java
while (true) {
  if (lease.expiresAt > now()) {
    doWork();  // ← GC 在這裡停 30 秒
  }            // ← 醒來繼續做事，但 lease 早就過期了
}
```

→ **不能假設 wall-clock time 在程式碼之間恆等於行程的進度**。

---

<SectionDivider icon="psychology" label="心智模型" />

## 8.5 知識、真相與謊言

### <G term="quorum">Quorum</G> 是真相的依據
單一節點即使自認為 leader，**可能已被其他節點集體罷免**。要相信「多數決」的結果，而不是自己。

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

<Progress chapter-id="ch08" />

<NextChapterBridge next-link="/part-2/ch09-consistency" next-title="Ch9 一致性與共識">
看完分散式系統的種種地雷，Ch9 給出系統化的應對：<strong>線性一致性</strong>是我們想要的最強保證、<strong>CAP 定理</strong>講為什麼有些保證在分區時必須放棄、<strong>共識演算法（Raft / Paxos）</strong>則是用工程手段在不可靠網路上達成「節點對某個值達成一致」。本章是全書最硬的一章，建議讀完先休息一下。
</NextChapterBridge>

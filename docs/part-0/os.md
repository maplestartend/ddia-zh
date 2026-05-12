---
title: 0.4 作業系統地基
description: 行程、執行緒、虛擬記憶體、page cache、fsync —— Ch3 / Ch7 銜接點
---

# 0.4 · 作業系統地基

<ChapterMeta part="Part 0 前置知識" :read-time="25" difficulty="入門" :tags="['行程', '記憶體', 'fsync']" />

<PrereqBox
  :prereq="['任何一門程式語言寫過 hello world', '知道「程式跑起來叫一個程式」這個直覺']"
  first-read-hint="**沒上過作業系統課的讀者建議 45-60 分鐘**——本章把 OS 課的一學期內容壓到剛好夠看懂 DDIA Ch3 / Ch7。每節讀完試著用自己的話對朋友說一次再進下節"
  :skippable="['§3 虛擬記憶體深入（DDIA 後續章節用不太到、留作補充）', '§5 page fault 詳細流程（看 TLDR + 例子就夠）']"
/>

<TLDR :points='[
  "<strong><G term=\"process\">行程</G> vs <G term=\"thread\">執行緒</G></strong>：行程有獨立虛擬記憶體；執行緒共享行程內記憶體—— 後者並發寫共享資料就是 race condition 的溫床。",
  "<strong><G term=\"page-cache\">Page cache</G></strong> 是 OS 把最近讀寫的磁碟頁保留在 RAM——讀 SSTable 第二次比第一次快很多就是它。",
  "<strong><G term=\"fsync\">fsync</G> 才強制寫回磁碟</strong>。沒呼叫 fsync 的寫入，停電可能丟失——這是 <G term=\"wal\">WAL</G> 為何存在、為何要先 sync log 才 commit 的根本原因。",
  "<strong><G term=\"process-pause\">Process Pause</G></strong> 真實存在：GC、VM 遷移、闔上筆電——分散式系統會把它誤判為「節點失聯」，這是 Ch8 的反覆主題。",
  "<strong><G term=\"page-fault\">Page Fault</G></strong>：程式存取的頁不在 RAM 中—— OS 同步從磁碟載入、程式行程停下等磁碟。這就是為什麼工作集 > RAM 會雪崩。"
]' />

::: warning 這章是骨架
我會逐步擴充。目前只給最低限度、能撐住 DDIA 銜接的內容。完整深入請走 [OSTEP](https://pages.cs.wisc.edu/~remzi/OSTEP/)（免費電子書）。
:::

## 1) <G term="process">行程</G>與<G term="thread">執行緒</G>

| | 行程 Process | 執行緒 Thread |
|---|---|---|
| 記憶體 | **獨立**虛擬記憶體 | 共享行程內記憶體 |
| 切換成本 | 高（換 page table）| 低 |
| 通訊 | IPC、socket、檔案 | 直接讀寫共享變數 |
| 崩潰影響 | 不影響其他行程 | 整個行程一起死 |

::: tip 為什麼 DDIA 在意這個
DB 內部要嘛多行程（PostgreSQL：每連線一個行程）、要嘛多執行緒（MySQL）。Ch7 並發控制根本上是「兩個執行緒同時操作共享狀態」的問題。
:::

## 2) 虛擬記憶體 = 一層抽象

每個行程看到的記憶體位址都是「虛擬的」，OS 透過 page table 對應到實體 RAM。好處：
- 行程之間彼此隔離
- 可以「假裝」記憶體比 RAM 大（swap 到磁碟）
- mmap 可以把檔案「映射」進記憶體位址空間

DDIA Ch3 提到 LMDB 用 mmap 直接操作 B-Tree——這就是利用 OS 已有的虛擬記憶體機制。

## 3) <G term="page-cache">Page Cache</G> 與 <G term="fsync">fsync</G>

### Page Cache 是 OS 自動做的快取

當你 `write(fd, buf, n)`，**OS 不一定立刻寫到磁碟**——可能只放在 page cache 裡。讀的時候也一樣，最近用過的頁會留在 RAM。

```
程式 ── write() ──▶ Page Cache（RAM）──── 背景 flush ─▶ 磁碟
                       ▲
                       │
程式 ── read()  ─── hit 就直接拿
```

### 沒 fsync = 可能丟資料

如果 page cache 還沒 flush 就斷電——資料消失。

```c
write(fd, "ACID 交易已提交", 16);  // 只寫到 page cache
// 此時斷電 → 資料丟失
```

正確做法（WAL 的根本）：

```c
write(log_fd, log_entry, n);
fsync(log_fd);                    // 等 OS 真的寫回磁碟
// 現在才能告訴使用者「交易已提交」
```

::: warning DDIA Ch3 反覆強調
所有「持久性」保證的根源都是 fsync。**fsync 很慢**（要等磁碟），所以 DB 設計核心就是「盡量批次 fsync」「順序寫 log 比隨機寫資料快」。
:::

## 4) <G term="page-fault">Page Fault</G> 與工作集

程式存取的記憶體頁不在 RAM 中—— OS 必須先從磁碟把它載入，**程式同步等待**。

```
程式: data = mem[0x7fff...]  ← 頁不在 RAM
       │
       ▼
OS:    Page Fault → 從磁碟讀 → 載入 → 恢復程式
       （這段時間 CPU 給別人用）
```

如果工作集 > RAM，就會頻繁 page fault——效能雪崩。DDIA Ch3 提到 LSM-Tree 的 SSTable 設計就在優化這個（連續讀比隨機讀快幾個數量級）。

## 5) <G term="process-pause">Process Pause</G>：DDIA Ch8 的核心難題

行程可能「死一段時間」的真實原因：
- **GC**（特別是 stop-the-world GC）：可以暫停數秒到數十秒
- **VM live migration**：可暫停整個 VM 數百毫秒到數秒
- **作業系統把行程 swap 出去**：等下次排程
- **闔上筆電然後打開**：機器時間跳了好幾小時
- **CPU 過熱降頻**：執行速度突然慢 10 倍

分散式系統的麻煩：**這些都會被其他節點誤判為「失聯」**。Ch8 完整處理這個問題（fencing token 是解法之一）。

## 6) 與 DDIA 章節的對應

| DDIA 章節 | 用到的 OS 概念 |
|---|---|
| Ch3 儲存引擎 | page cache、fsync、mmap、順序 vs 隨機 I/O |
| Ch7 交易 | 執行緒、race condition、lock、原子操作 |
| Ch8 分散式麻煩 | process pause、GC、虛擬機遷移 |
| Ch11 串流 | mmap log files、零拷貝（Kafka 的 sendfile）|

---

## 想更深入？

| 資源 | 內容 |
|---|---|
| [OSTEP（Operating Systems: Three Easy Pieces）](https://pages.cs.wisc.edu/~remzi/OSTEP/) | 免費 OS 教科書，比《恐龍書》易讀 |
| [MIT 6.1810 xv6 book](https://pdos.csail.mit.edu/6.1810/) | 用 100 頁實作一個 mini OS，看完通 |
| [Brendan Gregg: Systems Performance](https://www.brendangregg.com/sysperfbook.html) | 效能分析聖經 |
| [Linux Performance](http://www.brendangregg.com/linuxperf.html) | Gregg 的工具圖鑑 |

---

## 章末自評

<Quiz chapter-id="p0-os" :questions='[
  {
    "question": "DB 呼叫 write() 寫入交易日誌後，立刻告訴使用者「交易已提交」。如果此時機器斷電，最可能的結果是？",
    "options": [
      "資料安全，磁碟一定寫好了",
      "資料可能丟失—— write() 可能只寫到 OS page cache，沒 fsync 不保證在磁碟上",
      "資料一定丟失",
      "資料寫到 RAM、機器重開後自動恢復"
    ],
    "answer": 1,
    "explanation": "這就是為什麼 WAL 設計上 commit 前必須 fsync。write() 只把資料丟給 OS——OS 為了效能會合併寫入、可能延遲幾百毫秒才真的寫磁碟。fsync 才強制等磁碟確認。"
  },
  {
    "question": "Java 應用發生 stop-the-world GC 暫停 5 秒，這段期間它持有的分散式鎖會怎樣？",
    "options": [
      "GC 期間鎖自動延期",
      "鎖可能已被其他節點視為過期、被新節點搶走—— 等 GC 結束時這個節點仍認為自己持有，造成資料污染",
      "GC 不影響任何外部狀態",
      "JVM 會通知所有外部系統暫停"
    ],
    "answer": 1,
    "explanation": "這是 DDIA Ch8 的經典例子。GC 5 秒 > lease 超時，其他節點搶到新鎖開始改資料，GC 結束的節點仍以為自己持鎖、繼續寫—— 兩邊都改造成 split brain。解法是 fencing token：儲存層拒絕「過期」的請求。"
  },
  {
    "question": "你的 DB 工作集是 10GB、RAM 8GB。最可能發生什麼？",
    "options": [
      "效能不變—— OS 會把不常用的資料自動 swap",
      "頻繁 page fault—— 每次存取沒在 RAM 的頁就同步等磁碟，整體吞吐量雪崩",
      "DB 自動報錯停機",
      "資料會丟失"
    ],
    "answer": 1,
    "explanation": "Page fault 的代價：磁碟 SSD 約 100μs、HDD 約 10ms—— 比 RAM 慢 1000~100000 倍。工作集超過 RAM 後 page fault 頻率急升，throughput 不是線性下降而是斷崖。DDIA Ch3 為什麼強調「順序 I/O 與快取友善」就是為了避免這個。"
  }
]' />

<NextChapterBridge next-link="/part-0/network" next-title="0.5 網路地基">
OS 層之後是網路層—— TCP、HTTP、RPC、為什麼「網路會丟包延遲」是 Ch4 / Ch8 的全部前提。
</NextChapterBridge>

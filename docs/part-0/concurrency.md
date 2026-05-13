---
title: 0.7 並行控制直覺
description: Race condition、lock、原子性、隔離級別 —— Ch7 / Ch9 銜接點
---

# 0.7 · 並行控制直覺

<ChapterMeta part="Part 0 前置知識" :read-time="20" difficulty="入門" :tags="['Race', 'Lock', 'Isolation']" />

<TLDR :points='[
  "<strong>Race Condition</strong>：兩個執行緒同時操作共享狀態，結果取決於誰先誰後 —— 銀行帳戶丟錢、計數器少算都是它。",
  "<strong>Lock / Mutex</strong>：確保臨界區一次只有一個執行緒進入。代價是競爭時等待、設計不當會 deadlock。",
  "<strong>「原子操作」= 不可被打斷的操作</strong>：CPU 有 atomic instruction（compare-and-swap）、DB 有 atomic transaction —— 兩者層級不同但精神相同：要嘛全做、要嘛沒做。",
  "<strong>隔離級別 = 兩個並發交易彼此能看見多少</strong>：Read Uncommitted / Read Committed / RR / SI / Serializable。",
  "<strong>Ch7 拆「SI 為何擋不住 write skew」、Ch9 問「跨節點如何達成共識」</strong> —— 兩者的根都是並發。"
]' />

::: tip 如果你是前端開發者
你大概想：「JS 是 single-threaded、沒有共享記憶體 race condition，這章跟我有什麼關係？」

**有關係**——前端的 race 雖然不是 OS 執行緒的 race，但**業務層 race 一樣會出現**：
- 使用者**按兩次送出**：兩個 `fetch(POST /orders)` 同時到後端 → 重複建單
- **樂觀更新撞到 server 回應**：UI 已顯示「已按讚」、但 server 回 conflict → 該回滾還是接受？
- **多分頁同時操作**：兩分頁同時讀 `localStorage` → 各改各的 → 寫回時誰贏？
- **管理後台兩個小編同時按「發佈」**：各自基於「沒人在改」前提 → write skew

本章講的「鎖、原子性、隔離級別」，**最終決定後端有沒有正確擋住你前端送出來的並發請求**。看懂這章 = 知道哪些情境**不能假設後端會擋**、前端得自己做 idempotency token / 樂觀 UI 補償。
:::

## 1) 銀行帳戶的經典例子

兩個 ATM 同時對同一帳戶 +100：

```python
# Thread A           # Thread B
balance = read()     balance = read()    # 兩邊都讀到 1000
balance += 100       balance += 100      # 兩邊都算成 1100
write(balance)       write(balance)      # 兩邊都寫 1100
# 預期 1200、實際 1100 → 丟了 100 元
```

**這就是 <G term="race-condition">race condition</G>**。兩個操作的「讀-改-寫」交錯了。

## 2) <G term="lock">Lock</G>：把競爭序列化

```python
# Thread A                   # Thread B
lock.acquire()
balance = read()
balance += 100
write(balance)
lock.release()
                             lock.acquire()  # 等 A 釋放
                             balance = read()
                             balance += 100
                             write(balance)
                             lock.release()
```

A 做完、B 才開始—— 結果 1200，正確。

### Lock 的代價
- **競爭時等待**：高並發下 lock contention 是效能殺手
- **Deadlock**：A 拿著 lock1 等 lock2、B 拿著 lock2 等 lock1—— 永遠卡住
- **保護不全**：忘記 lock 一個地方就破功

## 3) Atomic Operation：硬體層的「不可分割」

CPU 提供 atomic instruction—— 一條指令完成「比較並交換」（CAS）或「加一」（fetch-and-add），中間不被打斷。

```python
# 原子的「+= 1」—— 不需要 lock
atomic_counter.fetch_add(1)
```

Redis 的 `INCR`、Java 的 `AtomicInteger`、Go 的 `sync/atomic`—— 都建立在 CPU atomic instruction 上。

::: tip 與 ACID 的 A 的關聯
ACID 的 atomicity 是「**交易層級**的不可分割」（多個 SQL 全做或全不做）；CPU atomic instruction 是「**單一指令層級**的不可分割」。兩個層次、相同精神。
:::

## 4) 隔離級別：DB 對並發交易的承諾

並發交易 T1、T2 同時跑：

```sql
-- T1                       -- T2
BEGIN;                      BEGIN;
SELECT balance              SELECT balance
  FROM accounts;              FROM accounts;
UPDATE accounts             UPDATE accounts
  SET balance = balance       SET balance = balance
      - 100;                      - 50;
COMMIT;                     COMMIT;
```

T1 與 T2 彼此能看見對方的中間狀態嗎？這由**隔離級別**決定：

| 級別 | 能擋住的異常 | 擋不住的 |
|---|---|---|
| **Read Uncommitted** | （什麼都擋不住） | 髒讀、髒寫… |
| **Read Committed** | 髒讀、髒寫 | 不可重複讀、phantom |
| **Repeatable Read** | + 不可重複讀 | phantom（依實作）、write skew |
| **<G term="snapshot-isolation">Snapshot Isolation</G>** | + phantom（部分） | write skew |
| **<G term="serializability">Serializable</G>** | 全部 | （效能代價最高） |

::: warning DDIA Ch7 的核心訊息
**很多人以為自己用了 "Serializable"，其實只用到 RR 或 SI。** 預設級別各家 DB 不同：
- PostgreSQL 預設 Read Committed
- MySQL InnoDB 預設 Repeatable Read（但 MySQL 的 RR ≠ SQL 標準的 RR）
- Oracle 預設 Read Committed
:::

## 5) 跨節點的並行：CAP 與共識的伏筆

單機並行（threads 共享記憶體）已經很難。
**跨節點並行**（節點之間靠網路通訊）更難——
- 訊息可能丟、可能延遲、可能重複
- 節點可能掛、可能 GC pause 5 秒
- 沒有「全域時鐘」可信任

這就是 DDIA Ch9 共識整章在處理的事。Raft 與 Paxos 都是「在這種混亂環境下，讓 N 個節點對某個值達成一致」的演算法。

## 6) 與 DDIA 章節的對應

| DDIA 章節 | 用到的並行概念 |
|---|---|
| Ch7 交易 | Race condition、lock、隔離級別、SI、Serializability |
| Ch8 麻煩 | Process pause、fencing token、partial failure |
| Ch9 一致性與共識 | Linearizability vs serializability、Raft / Paxos、全序廣播 |
| Ch11 串流 | Exactly-once semantics、idempotent processing |

---

## 想更深入？

| 資源 | 內容 |
|---|---|
| [Jepsen Consistency Models](https://jepsen.io/consistency) | 一張圖看懂所有 consistency 級別 |
| [The Little Book of Semaphores](https://greenteapress.com/wp/semaphores/) | 並行同步問題經典，免費 |
| [Hermitage tests](https://github.com/ept/hermitage) | Kleppmann 自己做的隔離級別實驗，看各 DB 在哪些 anomaly 上會破功 |
| [Raft 視覺化](https://raft.github.io/) | 共識演算法動畫，Ch9 必看 |

---

## 章末自評

<Quiz chapter-id="p0-concur" :questions='[
  {
    "difficulty": "applied",
    "question": "兩個 ATM 同時對同一帳戶 +100，銀行最終餘額少了 100。這個現象的名字是？",
    "options": [
      "Phantom read",
      "Lost update—— 兩個並發的「讀-改-寫」交錯造成",
      "Dirty read",
      "Write skew"
    ],
    "answer": 1,
    "explanation": "Lost update 是並發 read-modify-write 的經典 race。解法：原子操作（DB 內 UPDATE balance = balance + 100 直接寫）、顯式 lock（SELECT ... FOR UPDATE）、CAS 樂觀並發。DDIA Ch7 把 lost update 列為要交易層級隔離才能擋的異常之一。"
  },
  {
    "difficulty": "applied",
    "question": "你用 PostgreSQL 的預設隔離級別（Read Committed），下列哪個異常 PG 已經幫你擋掉？",
    "options": [
      "Lost update",
      "Write skew",
      "Phantom read",
      "髒讀（讀到未 commit 的資料）"
    ],
    "answer": 3,
    "explanation": "Read Committed 只擋髒讀與髒寫。Lost update、write skew、phantom 都擋不住—— 要升級到 Repeatable Read / Snapshot Isolation / Serializable 才能擋更多。實務上很多人以為 PG 預設「夠安全」，其實只擋最初級異常。"
  },
  {
    "difficulty": "applied",
    "question": "本章把「並發」分成單機（lock / atomic ops）與多機（隔離級別 / 共識）兩個層次。為什麼 Ch7（交易）與 Ch9（共識）都會建立在這章的基礎上？",
    "options": [
      "Ch9 共識主要處理網路訊息傳遞，跟並發是兩條獨立的線、不必先讀本章",
      "Ch7 隔離級別、Ch9 跨節點共識，本質都是「多個動作同時發生時的正確性」—— 單機 race condition 的直覺擴展到多機就變成 write skew 與 consensus 問題",
      "Ch7 是單機交易、Ch9 是分散式架構，跟本章「單機並發」是無關的兩條主題、放在一起只是 Part II 順序",
      "Ch7 與 Ch9 是 ACID / CAP 兩個獨立理論框架，並發只在本章用一次後續就不再出現"
    ],
    "answer": 1,
    "explanation": "並發是貫穿 DDIA 三大難題的線：(1) 單機 race condition → lock / atomic ops（本章）；(2) 同一 DB 內並發交易 → Snapshot Isolation / Serializable（Ch7）；(3) 跨節點並發決策 → Raft / Paxos 共識（Ch9）。三個層次面對的本質都是「動作交錯、結果依順序」—— 規模與失敗模式不同，但概念連續。常見迷思：把「並發」當作只在單機 OS 層次的議題、把 Ch9「共識」當作「網路訊息排序」—— 其實 Raft / Paxos 都在處理「多個 proposer 同時提案、誰先誰後」這種並發決策，本質是並發問題擴展到網路規模。"
  }
]' />

<NextChapterBridge next-link="/part-1/ch01-reliable" next-title="Ch1 可靠、可擴展、可維護">
Part 0 的 7 個前置主題到此告一段落。現在你已經有：衡量指標、SQL、OS、網路、資料結構、並行 —— 進入 DDIA 正文不會卡。
</NextChapterBridge>

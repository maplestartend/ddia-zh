---
title: Part II 分散式資料
---

# Part II · 分散式資料

> 把資料分布到多台機器：複製、分區、交易、共識

這是 DDIA 全書最硬核的部分，也是把你從「會用 DB」升級為「懂分散式系統」的關鍵五章。Ch8 與 Ch9 尤其燒腦，建議連續、不分心地讀。

## 學習目標

讀完 Part II，你應該能：
- 解釋為什麼「強一致」與「高可用」在網路分區時不能兼得（CAP 的正確版）
- 知道何時用 single-leader、multi-leader、leaderless 複製
- 看到一筆 SQL 交易就知道它在 Read Committed / Snapshot Isolation / Serializable 下會發生什麼
- 描述 Raft 是怎麼選 leader、怎麼複製 log 的
- 對「分散式鎖」抱持健康的懷疑（fencing token）

## 章節地圖

```
Ch5 複製 ──┐
            ├─→ Ch6 分區 ──┐
            │              │
            │              ↓
            └──────────────→ Ch7 交易
                            ↓
            Ch8 分散式系統的麻煩（網路、時鐘、暫停）
                            ↓
            Ch9 一致性與共識（必須先讀 Ch8）

強依賴：Ch8 → Ch9
建議順序：Ch5 → Ch6 → Ch7 → Ch8 → Ch9（線性，全部讀完）
```

<div class="ddia-chapter-grid">
  <ChapterCard id="ch05" num="CH 05" title="複製 Replication" summary="Leader/Follower、多主、無主；同步 vs 非同步；Quorum 與版本向量" link="/part-2/ch05-replication" :read-time="55" />
  <ChapterCard id="ch06" num="CH 06" title="分區 Partitioning" summary="Sharding 策略、二級索引、Rebalancing、請求路由與 ZooKeeper" link="/part-2/ch06-partitioning" :read-time="40" />
  <ChapterCard id="ch07" num="CH 07" title="交易 Transactions" summary="ACID 真相、Snapshot Isolation、Write Skew、SSI" link="/part-2/ch07-transactions" :read-time="60" />
  <ChapterCard id="ch08" num="CH 08" title="分散式系統的麻煩" summary="部分失效、不可靠網路、時鐘漂移、Process Pause" link="/part-2/ch08-trouble" :read-time="50" />
  <ChapterCard id="ch09" num="CH 09" title="一致性與共識" summary="Linearizability、CAP、2PC、Raft、ZooKeeper" link="/part-2/ch09-consistency" :read-time="65" />
</div>

::: warning Part II 的閱讀建議
- Ch8 與 Ch9 概念密度極高，**不要試圖一天讀完**。每章拆 2-3 個時段。
- 建議搭配 [Raft 的視覺化動畫](https://raft.github.io/) 一起讀 Ch9。
- 如果你只能挑三章：**Ch5、Ch7、Ch9**。
:::

## 讀完這部分，你應該能做的決策 {.role-h2 .icon-account_tree}

Part II 五章對應五類「**該怎麼選**」的決策。下面 4 棵獨立決策樹分別對應其中四類最常被問到的——

### 1. 要不要用 read replica?（Ch5）

<DecisionTree :root='{
  q: "讀多寫少？",
  branches: [
    {
      label: "是",
      child: {
        q: "能接受讀到舊資料？",
        branches: [
          {
            label: "不行",
            child: { kind: "leaf", tone: "danger", text: "同步複製或讀 leader" }
          },
          {
            label: "可以",
            child: {
              kind: "leaf",
              tone: "safe",
              text: "非同步複製 — 注意 read-your-writes 問題（自己剛寫的可能看不到）"
            }
          }
        ]
      }
    },
    {
      label: "否",
      child: { kind: "leaf", tone: "neutral", text: "沒必要 / 改用快取" }
    }
  ]
}' />

### 2. 寫太多單機扛不住要怎麼分區?（Ch6）

<DecisionTree :root='{
  q: "需要範圍查詢？",
  branches: [
    {
      label: "是",
      child: { kind: "leaf", tone: "warn", text: "Key Range 分區 — 注意熱點" }
    },
    {
      label: "否",
      child: { kind: "leaf", tone: "safe", text: "Hash 分區 — 用 virtual nodes" }
    }
  ]
}' />

### 3. 業務有跨筆原子性需求 → 選哪個隔離級別?（Ch7）

<DecisionTree :root='{
  q: "怕哪種異常？",
  branches: [
    {
      label: "怕 dirty read",
      child: { kind: "leaf", tone: "safe", text: "Read Committed — 多數 DB 預設" }
    },
    {
      label: "怕 non-repeatable read",
      child: { kind: "leaf", tone: "neutral", text: "Snapshot Isolation" }
    },
    {
      label: "怕 write skew / phantom",
      child: { kind: "leaf", tone: "danger", text: "真 Serializable — SSI 或 2PL" }
    }
  ]
}' />

::: warning ⚠ 各 DB 對隔離級別名稱不一致（Ch7 §7.2.3 重點）
| 你寫的 SQL | PostgreSQL 實際給你 | MySQL InnoDB 實際給你 | Oracle 實際給你 |
|---|---|---|---|
| `REPEATABLE READ` | **= Snapshot Isolation** ✓ | **MVCC**、但**不偵測 lost update** | n/a（語法不支援） |
| `SERIALIZABLE` | **SSI（真 serializable）** | 2PL（真 serializable） | **= Snapshot Isolation** ❗ |

**「Snapshot Isolation」不是標準 SQL 等級**——它在 PG 叫 `REPEATABLE READ`、在 Oracle 叫 `SERIALIZABLE`、在 MySQL 沒有。**寫 application code 時要看的是行為、不是名字**。
:::

### 4. 需要強一致 + 跨節點 → CP 還是 AP?（Ch8 / Ch9）

<DecisionTree :root='{
  q: "分區發生時的選擇？",
  branches: [
    {
      label: "寧可拒服務也要強一致",
      child: {
        kind: "leaf",
        tone: "danger",
        text: "CP 系統 — etcd / ZooKeeper + Raft"
      }
    },
    {
      label: "寧可繼續服務、允許舊資料",
      child: {
        kind: "leaf",
        tone: "safe",
        text: "AP 系統 — Dynamo / Cassandra 最終一致"
      }
    }
  ]
}' />

::: tip CAP 不是「常常拒服務」vs「常常不一致」
**無分區時兩者都正常服務**——CAP 只描述「分區那一刻」的取捨。實際運作上、CP 系統 99% 時間照常讀寫，只在偶發的網路分區事件時才有 reader 拿不到回應；AP 系統則繼續服務但可能短暫讀到舊副本。詳見 Ch9 §9.2 對 CAP 的重新詮釋。
:::

Part II 訓練的核心能力：**遇到分散式資料情境時，能說出取捨在哪、有哪些選項、選錯的代價是什麼**。Part III 我們會把這些放大到「資料平台」尺度討論。

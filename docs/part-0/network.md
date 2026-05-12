---
title: 0.5 網路地基
description: TCP/IP、HTTP、RPC、延遲 vs 頻寬、partial failure
---

# 0.5 · 網路地基

<ChapterMeta part="Part 0 前置知識" :read-time="22" difficulty="入門" :tags="['TCP', 'HTTP', 'RPC']" />

<TLDR :points='[
  "<strong><G term=\"tcp\">TCP</G> 提供「可靠、有序、有流量控制」的傳輸</strong>—— 但「可靠」是指最終會送到或斷線，不是即時。timeout 與重傳會引入不可預測的延遲。",
  "<strong><G term=\"http\">HTTP</G> 建立在 TCP 上</strong>，無狀態、request-response。REST API 是它的應用層慣例。",
  "<strong><G term=\"rpc\">RPC</G> 假裝成本地呼叫，但本質仍是網路</strong>—— 永遠會遇到 timeout、變動延遲、partial failure。這是 DDIA Ch4 與 Ch8 反覆強調的「漏抽象」。",
  "<strong>延遲 vs 頻寬是不同維度</strong>。光速是延遲的物理下界（跨美國 RTT ~70ms 是物理限制），頻寬可以加錢買、延遲不行。",
  "<strong><G term=\"fault\">Partial failure</G></strong> 是分散式系統最難的事—— 不像單機「整個壞」，網路斷一半時你不知道對方還在不在、自己的訊息有沒有送到。"
]' />

::: warning 這章是骨架
完整深入請走 [Beej's Guide to Network Programming](https://beej.us/guide/bgnet/) 與 [High Performance Browser Networking](https://hpbn.co/)。
:::

## 1) TCP/IP 的分層心智模型

```
應用層    HTTP, gRPC, Postgres wire protocol, SMTP, ...
   ↕
傳輸層    TCP（可靠、有序）或 UDP（不保證）
   ↕
網路層    IP（封包路由）
   ↕
鏈結層    Ethernet, WiFi, ...
```

對 DDIA 來說，傳輸層的 TCP 與應用層的 HTTP / RPC 才是焦點。

## 2) <G term="tcp">TCP</G>：可靠不等於即時

### 三次握手

```
Client                    Server
  │       SYN              │
  │ ────────────────────▶  │
  │       SYN-ACK          │
  │ ◀────────────────────  │
  │       ACK              │
  │ ────────────────────▶  │
  │                        │
  │     建立連線             │
```

只是建立連線就要 1 個 RTT—— 跨美國 RTT ~70ms，意味建立 TCP 連線最少 70ms 後才能傳資料。這是 HTTP/2 為什麼要重用連線、HTTP/3 (QUIC) 為什麼換 UDP 的原因。

### 超時重傳：「可靠」的代價

TCP 保證資料最終到達——做法是：沒收到 ACK 就**重傳**。重傳間隔指數退避（exponential backoff）：100ms → 200ms → 400ms → ...

**問題**：應用層看到的「延遲」可能是 1ms、也可能是 30 秒（重傳了好幾次）—— 高度不可預測。

::: warning DDIA Ch8 的核心訊息
**TCP 的可靠保證不能擋住 partial failure 的麻煩**——你不知道對方有沒有收到、你的訊息有沒有送出去。設定 timeout 是必要的，但 timeout 多長都會錯：太短誤判活的節點為死、太長拖累整體效能。
:::

## 3) <G term="http">HTTP</G>：無狀態的 request-response

```http
GET /api/users/1 HTTP/1.1
Host: example.com
Accept: application/json

→ 

HTTP/1.1 200 OK
Content-Type: application/json

{"id": 1, "name": "Alice"}
```

### 「無狀態」的真實含義

伺服器不在記憶體裡保留「上一個請求做了什麼」—— 所有上下文要嘛在 cookie、要嘛在 DB。這是為什麼後端應用通常 stateless（[0.1 講過](/part-0/intro)）。

### REST：HTTP 的應用層慣例

- `GET /resources` 取列表
- `GET /resources/:id` 取單筆
- `POST /resources` 建立
- `PUT /resources/:id` 替換
- `DELETE /resources/:id` 刪除

REST 不是協定，是**慣例**。DDIA Ch4 對比 REST 與 RPC 兩種風格。

## 4) <G term="rpc">RPC</G>：偽裝成函式呼叫的網路請求

```python
# 看起來像函式呼叫
result = remote_service.get_user(id=1)
```

底層其實是：
1. 序列化參數（Protobuf / Avro / JSON）
2. 發 TCP / HTTP 請求
3. 等回應
4. 反序列化結果

::: danger DDIA Ch4 的吐槽
RPC 想偽裝成本地函式呼叫，但**永遠做不到**。本地函式：
- 不會 timeout
- 延遲 ns 級
- 不會「呼叫成功但結果丟失」

網路：
- 隨時 timeout
- 延遲 ms 級且不可預測
- 「對方收到了但我沒收到 ACK」是真實情境—— 重試會造成重複執行（→ 需要 idempotent）
:::

主流 RPC：gRPC（HTTP/2 + Protobuf）、Thrift、Avro RPC。

## 5) 延遲 vs 頻寬

**完全不同維度**：

- **延遲（latency）**：一個 bit 從 A 到 B 要多久。**物理下界是光速。**
  - 跨美國（5000 km）真空中光速最快 ~17ms 單程、~34ms RTT
  - **但訊號在光纖中速度約是真空中的 2/3**——所以光纖實際物理下界 ~25ms 單程、~50ms RTT
  - 加上路由跳數、序列化延遲，實測 ~70–90ms RTT
  - **這是物理常數，加錢不能買低於這個的數字。**
- **頻寬（bandwidth）**：單位時間能送多少 bit。可以加錢買、可以平行傳。

```
比喻：高速公路
- 延遲 = 從台北開到高雄的最短時間
- 頻寬 = 高速公路有幾條車道
```

設計分散式系統時：
- 跨地域服務的「最少 100ms 延遲」是物理限制——你的 SLA 必須容納它
- 大批次資料傳輸瓶頸通常是頻寬，可以並行壓縮加速
- 「即時通訊」永遠不能即時—— 只能接近物理下界

## 6) Partial Failure：分散式系統最難的事

單機程式：要嘛跑、要嘛不跑——清楚。

分散式：A 想跟 B 通訊，但網路斷一半——
- A 不知道訊息有沒有送出去
- A 不知道 B 是不是還活著
- 即使收到 B 的回應，A 不知道是「B 處理完了」還是「B 處理一半就掛了」

::: warning 一個經典思考題
你發 HTTP POST `/api/transfer`，等了 30 秒沒回應—— 你該重試嗎？

- **重試**：可能造成「轉帳兩次」——除非 server 支援 idempotency key
- **不重試**：可能原請求其實沒送到、轉帳沒發生

**沒有正確答案——這就是分散式系統的本質難題**。DDIA Ch8 全章在拆這個。
:::

## 7) 與 DDIA 章節的對應

| DDIA 章節 | 用到的網路概念 |
|---|---|
| Ch4 編碼與演進 | RPC vs 訊息傳遞、HTTP API、Protobuf 編碼 |
| Ch5 複製 | 同步 vs 非同步複製（取決於網路 RTT） |
| Ch8 麻煩 | TCP timeout、partial failure、unreliable network |
| Ch9 共識 | 訊息傳遞語意、訊息順序、訊息可能丟失 |

---

## 想更深入？

| 資源 | 內容 |
|---|---|
| [Beej's Guide to Network Programming](https://beej.us/guide/bgnet/) | 從 socket API 學起，免費 |
| [High Performance Browser Networking](https://hpbn.co/) | Ilya Grigorik 經典，免費線上版 |
| [Cloudflare Learning: How DNS works](https://www.cloudflare.com/learning/dns/what-is-dns/) | 命名系統入門 |
| [The Fallacies of Distributed Computing](https://en.wikipedia.org/wiki/Fallacies_of_distributed_computing) | Peter Deutsch 1994 列的 8 個謬誤，DDIA Ch8 直接引用 |

---

## 章末自評

<Quiz chapter-id="p0-net" :questions='[
  {
    "question": "你的服務 A 向服務 B 發 RPC，等了 5 秒沒收到回應。下列哪個推論最準確？",
    "options": [
      "B 一定還沒處理請求—— 重試是安全的",
      "B 一定已經處理完—— 不該重試",
      "無法判斷 B 是否處理：訊息可能還沒到、可能 B 處理完但 ACK 在路上、可能 B 處理一半就掛了—— 這就是 partial failure",
      "等更久就會知道答案"
    ],
    "answer": 2,
    "explanation": "這是 DDIA Ch8 反覆強調的：timeout 並不告訴你對方做了什麼、沒做什麼。要安全重試只能靠 idempotency key（同 key 重複請求只執行一次效果）。"
  },
  {
    "question": "你發現跨美國服務間呼叫 P99 延遲 130ms，老闆問能不能降到 10ms。最準確的回答是？",
    "options": [
      "升級伺服器 CPU 可以做到",
      "不行—— 跨美國光速 RTT 至少 ~34ms，加上路由 ~70ms 是物理下界，10ms 違反物理限制",
      "升級網卡到 100Gbps 可以做到",
      "用 UDP 可以做到"
    ],
    "answer": 1,
    "explanation": "光速是延遲的物理下界。頻寬可以加錢買、延遲不行。要降跨美國呼叫延遲只能：放置 edge 節點靠近使用者、減少 RPC 跳數、提前算好。增 CPU / 頻寬都救不了延遲。"
  },
  {
    "question": "DDIA Ch4 強調 RPC 不能等同本地函式呼叫，最根本的原因是？",
    "options": [
      "RPC 比較慢",
      "本地函式呼叫不會 timeout、不會「呼叫送達但結果丟失」、延遲可預測；RPC 全部都會，這些差異無法用語法糖隱藏",
      "RPC 語法比較醜",
      "RPC 不支援泛型"
    ],
    "answer": 1,
    "explanation": "Kleppmann 在 Ch4 直接引述「The Fallacies of Distributed Computing」—— 假裝網路是可靠的會在生產環境付出代價。RPC 的真實語意需要 timeout、retry、idempotency key、partial failure 處理—— 都是本地呼叫沒有的東西。"
  }
]' />

<NextChapterBridge next-link="/part-0/data-structures" next-title="0.6 資料結構地基">
網路 + OS 之後，補一下 Ch3 storage 直接用的資料結構：Hash table、B-Tree、外部排序。
</NextChapterBridge>

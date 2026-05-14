---
title: Ch4 編碼與演進
---

<ChapterOpener chapter-id="ch04" />

<ChapterMeta part="Part I 資料系統基礎" :read-time="35" difficulty="入門" :tags="['Protobuf', 'Avro', 'RPC']" />

<TLDR :points='[
  "<strong>編碼 = 把記憶體物件序列化為 byte 串</strong>：常見格式 JSON / XML（人類可讀、肥）vs Protobuf / Thrift / Avro（二進位、緊湊、有 schema）。",
  "<strong>向後相容 = 新程式能讀舊資料；向前相容 = 舊程式能讀新資料</strong>。後者更難，但在滾動部署中必要。",
  "<strong>Protobuf / Thrift 用欄位標籤（tag number）容忍欄位增刪</strong>；<strong>Avro 用「writer schema vs reader schema」</strong>，特別適合資料倉儲（schema 變動頻繁）。",
  "<strong>三大跨服務溝通模式</strong>：資料庫（透過 DB）、RPC（同步呼叫）、訊息傳遞（非同步隊列）。",
  "<strong>RPC 不是本地函式呼叫的透明替代品</strong>：網路會失敗、會延遲、會逾時。優秀的 RPC 框架要承認這個事實（Future / Promise、明確錯誤碼）。"
]' />

## 4.1 為什麼需要編碼

記憶體中的物件（指標、樹狀結構）無法直接寫入磁碟或網路 —— 必須**序列化（serialize / encode）** 成 byte 序列。

### 語言內建格式的坑
- Java Serializable、Python pickle、Ruby Marshal
- **不要用於跨系統**：跨語言不通、難版本控制、可能執行任意程式碼（反序列化漏洞）

---

## 4.2 文字格式：JSON、XML、CSV

優點：人類可讀、語言中立
缺點：
- 數字精度問題（JS 的數字都是 float64）
- 字串 vs 二進位混淆（JSON 沒原生 binary）
- 沒有強型別 schema → 應用層要自己驗證
- 體積大（欄位名重複出現）

---

## 4.3 二進位編碼：Protobuf、Thrift、Avro

### Protobuf / Thrift

用 IDL 定義 schema：
```protobuf
message Person {
  required string user_name = 1;
  optional int64 favorite_number = 2;
  repeated string interests = 3;
}
```

每個欄位有 **tag number**。編碼後只寫 tag + type + value，**欄位名不出現在編碼中**。

### Schema 演進規則

兩套格式都要同時顧到 <G term="backward-compatibility">向後相容</G> 與 <G term="forward-compatibility">向前相容</G>，差別在「如何識別欄位」：

| 變更 | Protobuf | Avro |
|---|---|---|
| 加欄位 | ✓（新欄位 optional） | ✓（需有 default） |
| 刪欄位 | ✓（只能刪 optional） | ✓ |
| 改欄位名 | ✓ 隨意（tag 不變） | ⚠ 需 `aliases` 註明舊名（讀舊資料時靠 alias 對齊；缺 alias 則破壞相容） |
| 改 tag number | ✗ 破壞性變更 | N/A |
| 改型別 | ⚠️ 部分相容 | ⚠️ 部分相容 |

### Avro 的特色

- **無 tag number**：直接按 schema 順序編碼
- **Writer schema + Reader schema**：解碼時兩個 schema 比對
- 適合**動態產生的 schema**（如資料倉儲，每張表 schema 自動產生）—— 這也是 <G term="schema-on-read">schema-on-read</G> 風格容易接上的格式

### 沒有 schema 的二進位格式：MessagePack / BSON / CBOR

DDIA 主要對比 Protobuf / Thrift / Avro 三套**有 schema** 的格式，但實務上還有一類「**JSON 的二進位變體**」很常見——保留 JSON 的自我描述（self-describing）特性、只把編碼從文字換成二進位以壓榨體積：

| 格式 | 設計重點 | 用在哪 |
|---|---|---|
| **MessagePack** | JSON-superset、最緊湊（小整數 1 byte、無 schema 仍可省 30-50% 空間） | Redis serialization、Fluentd、Pinterest 服務間 |
| **BSON** | JSON-superset + 加日期 / ObjectId / binary 型別 + 內嵌長度標記（為隨機讀設計） | MongoDB wire / 儲存格式 |
| **CBOR** | RFC 8949 標準、設計目標是 IoT / constrained device、與 COSE 簽章配套 | WebAuthn / FIDO2、Matter、IoT 協定 |

::: tip 何時用 schema-less 二進位？
- **沒有跨團隊 schema 控管的條件**（內部 sandbox、IoT 廠商各自為政）
- **訊息結構頻繁變動、不想養 schema registry**
- **要保留 JSON 的隨意性、只想省體積**

但代價：**演進規則靠約定、沒有編譯期型別檢查、跨團隊容易踩相容性坑**。要走「Kafka + 大組織」就回頭選 Protobuf / Avro + <G term="schema-registry">Schema Registry</G>。
:::

---

## 4.4 資料流模式

### 1. 透過資料庫
寫入者與讀取者解耦時間（資料可能由不同版本程式寫入/讀取）→ **<G term="forward-compatibility">向前</G> + <G term="backward-compatibility">向後相容</G>都必要**。

::: warning 經典陷阱
```python
# 舊程式讀新欄位 → 不認識，可能直接丟棄
record = db.fetch(id)
record.name = 'updated'
db.save(record)  # 把不認識的新欄位也覆蓋掉了！
```
這叫 **"data outliving code"** —— 處理時要保留未知欄位。
:::

### 2. 透過服務（REST / RPC）

**REST**：基於 <G term="http">HTTP</G>，URL = 資源、verb = 操作。
**<G term="rpc">RPC</G>**：偽裝成本地<G term="process">行程</G>內函式呼叫的跨機呼叫（gRPC、Thrift、Avro RPC）。

**為何 RPC 永遠不會像本地呼叫一樣可靠**：
- 網路可能丟封包 → 不知道是否成功
- 對方可能變慢、卡住、當機
- 同樣請求可能要重試 → 必須 <strong><G term="idempotent">冪等（idempotent）</G></strong>

#### 前端常見三套：REST / GraphQL / gRPC-Web 與 tRPC

DDIA 出版時 GraphQL / tRPC 尚不普及，這裡補上前端最常碰到的三種風格：

| 風格 | 代表 | Schema | 編碼 | 風味 |
|---|---|---|---|---|
| **REST** | OpenAPI / Swagger | 用 OpenAPI YAML 描述路徑與 schema | JSON | 資源導向、宣告式 URL |
| **GraphQL** | Apollo、Relay | SDL（type 定義 + queries / mutations） | JSON | 形式上像 RPC（單一 endpoint + named operation），但**查詢部分宣告式**（client 指定要哪些欄位） |
| **gRPC-Web / tRPC** | Cloudflare、Vercel | Protobuf / TS type | Binary / JSON | 兩者都提供型別安全：**gRPC 主打跨語言效能**、**tRPC 主打 TS 端對端零 codegen** |

::: tip 三個容易混淆的選型問題
- **GraphQL 算 RPC 嗎？** 規範作者立場是 **query language 而非 RPC**。形式上看起來像 RPC（單一 endpoint + named operation）只是觀察、不是定義。它的查詢部分是宣告式（你說「要 user 的 name 與 posts.title」、server 自由選 resolver 順序）—— 介於 RPC 與 SQL 之間。
- **OpenAPI = REST 嗎？** OpenAPI 是 REST 的「描述格式」（像 Protobuf 之於 RPC）—— **但不強制 RESTful**（HATEOAS 那層 OpenAPI 不管）。它讓型別與文件能機器讀。
- **tRPC 跟 gRPC 是同類嗎？** **不完全是**。gRPC 主打「跨語言、高效能 RPC」（Protobuf + HTTP/2 binary）—— 端對端型別只是副產品；tRPC 主打「TypeScript 端對端零 codegen」（JSON over HTTP/1.1，TS-only）。看似同類但設計目標不同。

不管哪種風格，**本章核心訊息不變**：所有跨服務通訊都涉及編碼選擇與相容性權衡（schema-on-write vs schema-on-read、forward / backward compatibility）。GraphQL schema 演進的「@deprecated 標記 + 新欄位非破壞性新增」、Protobuf 的「reserved field number」、OpenAPI 的「semver」，本質上都在處理同一個問題。
:::

### 3. 透過非同步訊息

<G term="message-queue">訊息代理</G>（Kafka、RabbitMQ）：
- 生產者寫入 topic
- 消費者訂閱、按需處理
- **解耦時間 + 解耦負載 + 自然支援廣播**

### 4.4.4 微服務邊界、Strangler Fig 與 Contract Testing

DDIA 原書 2017 出版時、微服務剛流行、Kleppmann 提到但沒深入。2024 業界已累積出明確的「**怎麼劃服務邊界 + 怎麼演進**」三條主軸。

**1. 服務拆分粒度（business capability vs technical capability）**

- **錯誤直覺**：「越小越好」「每個 entity 一個服務」——按技術層次切（「user service / auth service / db service」）或按 entity 表切（user / order / item 各一個）只是把 monolith 內部切片再加上 RPC 開銷、做出 **distributed monolith**（叫微服務、行為跟巨石一樣、所有服務必須一起發版）
- **正確直覺**（DDD 與 Sam Newman《Building Microservices》共識）：按 **Bounded Context** 切——一個服務負責一個業務能力（「訂單」「付款」「庫存」「會員」），擁有自己的 DB schema、不跨服務 JOIN
- **二披薩團隊（two-pizza rule）**：一個服務的開發 + 維運 = 一個 6-8 人團隊能 handle 的份量、再大就拆
- **發版獨立性的試金石**：「我要修 bug 不需要協調其他人 deploy」是好邊界、「想改個 schema 要先開協調會」是壞邊界
- **啟動策略：modular monolith first, microservices later**——2024 業界從「全微服務」走回「先 modular monolith、有壓力再拆」（Shopify / Basecamp / [Service Weaver](https://serviceweaver.dev/) Google 2023 / [Encore](https://encore.dev/) 等）。**過早拆分微服務的代價遠大於過晚拆**——程式碼層次的模組化、部署時還是一個 binary、避免微服務 overhead 但保留拆分潛力

**2. Strangler Fig pattern（漸進拆 monolith）**

Martin Fowler 命名的演進策略：
1. 在 monolith 前面放一個 **proxy / API gateway**
2. 新功能寫成新服務、proxy 把對應的 path 路由過去
3. 舊功能慢慢從 monolith 搬出、proxy 路由更新
4. 全部搬完、舊 monolith 退役

**為什麼這比「重寫」好**：重寫期間業務還在跑、需求還在變、舊系統 bug fix 必須兩邊都改——絞殺榕讓「**新 + 舊 並存運行**」變成預設狀態、不是過渡。Ch4 講 schema 演進的同樣道理——**新舊版本必須能在 wire 上對話一段時間**、不能一次替換。「大爆炸式 rewrite」歷史上幾乎都失敗（Netscape 6 重寫、Twitter Rails → JVM 都吃過大虧）。

**前端對等模式**：你做 React 升級時的「**新頁面用 hooks、老頁面留 class component**」、新舊共存逐步遷移就是 Strangler Fig 在前端的化身。

**3. Consumer-Driven Contract Testing（Pact / Spring Cloud Contract）**

微服務最大痛點：**A 改了 API、B 沒注意到、production 才炸**。Contract testing 把這變成 CI 防線：
- **Consumer**（client 端）寫測試聲明「我預期 service B 的 `/orders/:id` 回 `{id, status, items}`」
- **這份契約**自動產生 mock 給 consumer 跑、也自動上傳到 Pact Broker
- **Provider**（service B）的 CI 從 broker 拉所有 consumer 的契約、**自己跑這些契約測試**——B 想改 API、CI 立刻告訴你哪個 consumer 會壞

跟 Ch4 §4.1 schema evolution 的關係：**Protobuf / Avro 解決「同個服務不同版本」的相容；contract testing 解決「不同服務之間」的相容**。兩者互補、不是取代。

**4. BFF（Backend for Frontend）**

**問題**：手機 app 想要的資料形狀 ≠ 網頁前端要的 ≠ 第三方 API 要的。讓後端微服務各自提供「對齊每種 client」的 endpoint 很煩、也讓 service 邊界被 client 細節污染。

**BFF 解法**：每種 client 一個 BFF 層（手機 BFF、Web BFF、Partner BFF），BFF 內部呼叫多個 microservice、聚合 + 重塑成該 client 想要的形狀。**GraphQL / tRPC 部分取代 BFF**（schema-driven、由 client 自己挑欄位），但 BFF 在「**呼叫多個下游 + 補商業邏輯（鑑權、限流、版本適配）**」場景仍有價值。

::: tip 與 Ch1 maintainability 的呼應
微服務粒度 / Strangler Fig / Contract Testing / BFF 四個工具都是 [Ch1 §1.4](/part-1/ch01-reliable#_1-4-可維護性) 「**可演化性（evolvability）**」在多服務世界的具體手段。Ch1 講「為什麼要可演化」、Ch4 講「在編碼層與服務邊界層怎麼做」。
:::

**延伸閱讀**：
- Sam Newman *Building Microservices* 第 2 版（2021）
- microservices.io patterns（Chris Richardson 整理）
- Martin Fowler "[Strangler Fig Application](https://martinfowler.com/bliki/StranglerFigApplication.html)"
- Sam Newman "[Pattern: Backends For Frontends](https://samnewman.io/patterns/architectural/bff/)"

---

## 4.5 Actor model：訊息傳遞的程式設計模型

到目前為止 4.4 的三種資料流（DB / RPC / 訊息代理）談的是**系統間**怎麼傳資料。把這個想法**內化到單一程式內**就是 **Actor model**：

每個 actor 是獨立的計算單元、**只有 mailbox**（接收訊息）、收到訊息後可以：
1. 改自己的狀態
2. 送訊息給其他 actor
3. 創造新 actor

Actor 之間**沒有共享記憶體**——所有互動透過訊息。這把「local function call vs remote function call」之間的鴻溝抹平：本來 RPC 跟函式呼叫的差距是「網路會失敗」、actor model 直接把「**訊息可能丟、可能延遲、可能順序錯**」當作預設，**本地與遠端用同一套寫法**。

### 代表實作

| 框架 | 語言 | 風格 |
|---|---|---|
| **Akka** | Scala / Java | JVM 老牌、Cluster 模組可跨機 |
| **Erlang / OTP** | Erlang | 語言層原生 actor、telecom 等級可靠性（Ericsson 1986） |
| **Elixir** | Elixir | 跑在 Erlang VM、Phoenix LiveView 用 actor 撐 WebSocket |
| **Microsoft Orleans** | C# | "Virtual actor"——actor 是 logical entity、執行位置由 runtime 決定 |
| **Cloudflare Durable Objects** | JS (Workers) | 雲端版本：每個 object 是全球唯一 actor、有自己的 storage |

::: tip Actor model 怎麼接到 Ch4 編碼？
Actor 之間的訊息**跨機時要編碼**——Akka 預設 Java serialization（被官方建議改 Protobuf / Jackson）、Orleans 用自家 binary、Erlang 用 ETF（External Term Format）。**訊息 schema 演進就變回本章 §4.3 的問題**：actor v1 收到 v2 的訊息時、若用 Protobuf 加新欄位無事、若用 Java serialization 就可能炸。
:::

訊息傳遞的世界觀（actor 內、<G term="message-queue">訊息隊列</G>外）會延續到 **Ch11 streams**——event log + <G term="stateful">stateful</G> operator 本質上就是「**長壽 + 持久化的 actor**」。

---

## 章末練習

::: tip 思考題
設計一個 Protobuf schema 表達使用者個人檔案，然後模擬以下情境：
1. v1 → v2 加一個 `optional string email`：v1 程式能讀 v2 資料嗎？反之？
2. v2 → v3 把 `name` 拆成 `first_name` + `last_name`：怎麼做才能保證向前相容？
3. 與用 JSON 重做一次比較：哪一個更安全？哪一個更彈性？
:::

<Quiz chapter-id="ch04" :questions='[
  {
    difficulty: "basic",
    question: "「向前相容（forward compatibility）」的定義是？",
    options: [
      "新版本程式能讀取舊版本資料",
      "舊版本程式能讀取新版本資料",
      "資料能在不同語言之間互通",
      "資料能壓縮到更小"
    ],
    answer: 1,
    explanation: "向後相容（backward）= 新讀舊，向前相容（forward）= 舊讀新。在滾動部署中，新舊版本同時跑、互相寫入對方的儲存，因此兩者都必要。"
  },
  {
    difficulty: "applied",
    question: "Protobuf 為什麼能在加欄位時保持相容？",
    options: [
      "因為它用 JSON 結構",
      "因為每個欄位由 tag number 識別，舊程式遇到不認識的 tag 會跳過",
      "因為它有自動 schema migration",
      "因為它支援動態型別"
    ],
    answer: 1,
    explanation: "Protobuf 編碼是 tag + type + value 的串列。舊解析器看到陌生 tag 就跳過，不影響其他欄位 —— 但前提是新欄位必須是 optional（否則舊端產生的資料缺少 required 欄位，新端解析失敗）。"
  },
  {
    difficulty: "applied",
    question: "下列關於 RPC 的敘述何者正確？",
    options: [
      "用 HTTP/2 + Protobuf 的 gRPC，因為 TCP 已保證可靠送達、業務層可以省去冪等設計",
      "RPC 呼叫可能因網路問題逾時或重試，因此業務需設計為冪等",
      "只要 client 與 server 用同一語言（如皆為 Go），RPC 就能保證如同本地呼叫",
      "RPC 框架自動處理 partial failure，呼叫端可當作普通函式"
    ],
    answer: 1,
    explanation: "「網路是 RPC 的本質」—— 它可能慢、可能失敗、可能重複。冪等性（同一請求被重試多次仍只生效一次）是分散式呼叫的基本設計要求。選項 A 是最容易誤解的迷思——TCP 保證的是「位元組到達就不亂序」、不保證「請求被處理到結束」（server 在 commit 前 crash、回應在傳輸中丟失、都會發生）。選項 C/D 都假設「同語言/同框架可消除網路」，這違反 §4.4 的核心訊息。"
  },
  {
    difficulty: "applied",
    question: "你的團隊在 IoT 裝置上選編碼格式，下列何者最合理？",
    options: [
      "Java serialization——成熟、有現成 library",
      "Protobuf + Schema Registry——強型別、可演進、跨語言",
      "CBOR / MessagePack——保留 JSON 風格但更省 bytes，IoT 受限資源環境常見",
      "XML——可讀性最高、利於除錯"
    ],
    answer: 2,
    explanation: "IoT 場景的限制是**電量 / 頻寬 / 韌體更新困難**——CBOR（RFC 8949，Matter / WebAuthn 用）與 MessagePack 比 JSON 省 30-50% 空間、保留自我描述特性（不必養 Schema Registry）。Protobuf + Registry 在大型雲端架構優秀，但 IoT 廠商各自為政、跑 Registry 不切實際。Java serialization 跨平台差且有安全漏洞、XML 太肥。**選型題重點是「環境約束」、不是「哪個技術最強」**。"
  },
  {
    difficulty: "interview",
    question: "你在做 Avro schema 演進，把欄位 `username` 改名為 `user_name`。下列做法何者正確、能保證讀舊資料？",
    options: [
      "Avro 不允許改欄位名、必須新增 user_name 然後讀時雙路 fallback",
      "在新 schema 加 `aliases: [\"username\"]` 屬性、reader 用新 schema 解碼舊資料時靠 alias 對齊",
      "Avro 不需要做任何事——它按欄位順序解碼、改名不影響",
      "Avro 與 Protobuf 一樣有 tag number、改名只要 tag 不變即可"
    ],
    answer: 1,
    explanation: "Avro **無 tag number**、是「writer schema vs reader schema」靠**欄位名與順序**對齊。改名時：若 reader schema 加 `aliases` 屬性宣告舊名、就能正確解碼舊資料；缺 alias 則破壞相容（讀舊資料時找不到 username、用預設值或報錯）。選項 C 把 Avro 跟「純按位置」混淆——Avro 雖按 schema 順序編碼、但解碼時靠**名稱對齊**，順序對不上會出錯。選項 D 把 Avro 跟 Protobuf 混為一談（Protobuf 才有 tag number、Avro 沒有）。"
  }
]' />

<ChapterNote chapter-id="ch04" />

<Progress chapter-id="ch04" />

<PartCheckpoint part="1">

**這不是要打勾考過、是讓你檢查 Ch1-4 的詞能不能黏在一起**——能用 Part I 的詞答完下面題目、表示單機資料系統的直覺已經形成。**答錯 ≥ 3 題建議回頭精讀對應章節**。

1. **怎麼判斷一個系統「可靠 / 可擴展 / 可維護」？** Reliability / Scalability / Maintainability 三軸各對應什麼具體衡量指標？
   - *提示*：Ch1 §1.1-1.4

2. **P99 延遲 200ms 與 P50 延遲 200ms 的差別、業務上的意義是？** 為什麼大客戶通常落在 P999？
   - *提示*：Ch1 §1.3 + Part 0.2 metrics

3. **SQL / 文件 / 圖三種資料模型各自的勝出場景？** 為什麼「先選 MongoDB 之後遇到 JOIN 才知道後悔」是經典反 pattern？
   - *提示*：Ch2 §2.1-2.2

4. **LSM-Tree 與 B-Tree 的核心 trade-off？** 為什麼 RocksDB / Cassandra 選 LSM、PostgreSQL / MySQL 選 B-Tree？
   - *提示*：Ch3 §3.4

5. **OLTP 與 OLAP 為什麼走向不同引擎？** 欄式儲存的「壓縮率」與「向量化」分別解了什麼問題？
   - *提示*：Ch3 §3.6

6. **JSON / Protobuf / Avro / GraphQL / tRPC 各自的 schema 演進策略？** 為什麼「forward / backward compatibility」是 API 設計的核心紀律？
   - *提示*：Ch4 §4.1-4.3

7. **微服務拆分粒度怎麼判斷？** Strangler Fig 與 Contract Testing 各解什麼問題？
   - *提示*：Ch4 §4.4.4 新加段

**答錯 ≥ 3 題**：建議從第一題對應的章節回頭重讀
**全部能答**：恭喜你完成 Part I — 你已掌握單機資料系統的核心；接下來 Part II 進入分散式世界

</PartCheckpoint>

<NextChapterBridge chapter-id="ch04" />

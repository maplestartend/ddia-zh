---
title: Ch4 編碼與演進
---

# Ch4 · 編碼與演進

<ChapterMeta part="Part I 資料系統基礎" :read-time="35" difficulty="入門" :tags="['Protobuf', 'Avro', 'RPC']" />

<TLDR :points='[
  "<strong>編碼 = 把記憶體物件序列化為 byte 串</strong>。常見格式：JSON/XML（人類可讀，肥）vs Protobuf/Thrift/Avro（二進位，緊湊有 schema）。",
  "<strong>向後相容（backward compatibility）= 新程式能讀舊資料</strong>；<strong>向前相容（forward compatibility）= 舊程式能讀新資料</strong>。後者更難，但在滾動部署（rolling deploy）中必要。",
  "<strong>Protobuf/Thrift 用欄位標籤（tag number）</strong>容忍欄位增刪；<strong>Avro 用「writer schema vs reader schema」</strong>，特別適合資料倉儲（schema 變動頻繁）。",
  "<strong>三大跨服務溝通模式</strong>：資料庫（透過 DB）、RPC（同步呼叫）、訊息傳遞（非同步隊列）。",
  "<strong>RPC 不是本地函式呼叫的透明替代品</strong>：網路會失敗、會延遲、會逾時。優秀的 RPC 框架要承認這個事實（Future、Promise、明確錯誤碼）。"
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

| 變更 | Protobuf | Avro |
|---|---|---|
| 加欄位 | ✓（新欄位 optional） | ✓（需有 default） |
| 刪欄位 | ✓（只能刪 optional） | ✓ |
| 改欄位名 | ✓ 隨意（tag 不變） | ✗ 需 alias |
| 改 tag number | ✗ 破壞性變更 | N/A |
| 改型別 | ⚠️ 部分相容 | ⚠️ 部分相容 |

### Avro 的特色

- **無 tag number**：直接按 schema 順序編碼
- **Writer schema + Reader schema**：解碼時兩個 schema 比對
- 適合**動態產生的 schema**（如資料倉儲，每張表 schema 自動產生）

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
**<G term="rpc">RPC</G>**：偽裝成本地函式呼叫（gRPC、Thrift、Avro RPC）。

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

訊息代理（Kafka、RabbitMQ）：
- 生產者寫入 topic
- 消費者訂閱、按需處理
- **解耦時間 + 解耦負載 + 自然支援廣播**

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
    question: "下列關於 RPC 的敘述何者正確？",
    options: [
      "RPC 與本地函式呼叫在效能與可靠性上完全等價",
      "RPC 呼叫可能因網路問題逾時或重試，因此業務需設計為冪等",
      "用 RPC 就不需要錯誤處理",
      "RPC 只能用同一種程式語言"
    ],
    answer: 1,
    explanation: "「網路是 RPC 的本質」—— 它可能慢、可能失敗、可能重複。冪等性（同一請求被重試多次仍只生效一次）是分散式呼叫的基本設計要求。"
  }
]' />

<Progress chapter-id="ch04" />

<NextChapterBridge next-link="/part-2/ch05-replication" next-title="Ch5 複製 Replication">
Part I 都在講「單機」資料系統。從 Ch5 開始進入 <strong>Part II 分散式資料</strong> —— 為什麼需要把資料放到多台機器？三種主流複製拓樸（單主、多主、無主）各自解決什麼問題、各自有什麼地獄？這條路會一路鋪到 Ch9 的共識演算法。
</NextChapterBridge>

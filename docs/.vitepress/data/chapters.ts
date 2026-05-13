// 章節資料的 SSOT（Single Source of Truth）。
// 任何顯示章節清單的地方（首頁、進度頁、Dashboard、sidebar）都從這裡 import，
// 嚴禁在 .md / .vue / config.mts 內重複維護章節陣列。

export interface Chapter {
  readonly id: string         // 'ch01' ~ 'ch12' / 'p0-xx'，與 localStorage / 路徑對應
  readonly num: string        // 'CH 01' / '0.1' 用於卡片顯示
  readonly part: 0 | 1 | 2 | 3
  readonly title: string      // 顯示用全名
  readonly shortTitle: string // sidebar 用較短的名
  readonly summary: string    // 卡片描述
  readonly link: string       // 路由
  readonly readTime: number   // 預估閱讀分鐘
  // F7 ChapterOpener 用：章首引言（可選）+ 引言來源
  readonly epigraph?: string
  readonly epigraphSource?: string
  // F8 NextChapterBridge 用：對下章的一句 teaser（可選）
  readonly teaser?: string
}

export const CHAPTERS: readonly Chapter[] = [
  // Part I
  { id: 'ch01', num: 'CH 01', part: 1,
    title: '可靠、可擴展、可維護的應用', shortTitle: 'Ch1 可靠、可擴展、可維護',
    summary: '什麼讓系統「可靠」？「擴展」是要擴展什麼？為什麼平均延遲是騙人指標？',
    link: '/part-1/ch01-reliable', readTime: 35,
    epigraph: '可靠不是不出錯——是出錯時、整個系統仍能繼續為使用者工作。',
    epigraphSource: '本站章首引',
    teaser: '可靠之後、下一個問題是——資料該怎麼擺？關聯、文件、圖各有所長。' },
  { id: 'ch02', num: 'CH 02', part: 1,
    title: '資料模型與查詢語言', shortTitle: 'Ch2 資料模型與查詢語言',
    summary: '為什麼有 SQL、文件、圖三種模型？什麼時候各自勝出？',
    link: '/part-1/ch02-data-models', readTime: 40,
    epigraph: '沒有完美的資料模型，只有 trade-off 最少撞牆的模型。',
    epigraphSource: '本站章首引',
    teaser: '選好模型後、底下是怎麼存的？LSM-Tree 與 B-Tree 各自有 trade-off。' },
  { id: 'ch03', num: 'CH 03', part: 1,
    title: '儲存與檢索', shortTitle: 'Ch3 儲存與檢索',
    summary: '為什麼 LSM-Tree 與 B-Tree 在不同負載下勝負互換？OLTP 與 OLAP 為何走向不同引擎？',
    link: '/part-1/ch03-storage', readTime: 45,
    epigraph: '寫快還是讀快？這道題沒有答案、只有負載決定的解。',
    epigraphSource: '本站章首引',
    teaser: '存得下了、要怎麼讓服務升版時不打爆舊客戶？編碼演進是 API 設計的隱身英雄。' },
  { id: 'ch04', num: 'CH 04', part: 1,
    title: '編碼與演進', shortTitle: 'Ch4 編碼與演進',
    summary: 'API 升版怎麼不打到舊客戶？JSON / Protobuf / GraphQL / tRPC 各有什麼坑？',
    link: '/part-1/ch04-encoding', readTime: 35,
    epigraph: '演進是常態、相容是責任：新舊版本必須能在同一條 wire 上對話。',
    epigraphSource: '本站章首引',
    teaser: '單機講完了——資料要跨機器擺，第一步就遇到複製延遲三大問題。' },

  // Part II
  { id: 'ch05', num: 'CH 05', part: 2,
    title: '複製 Replication', shortTitle: 'Ch5 複製',
    summary: '為什麼 read replica 有時讀到舊資料？多副本怎麼最終一致？',
    link: '/part-2/ch05-replication', readTime: 55,
    epigraph: '複製解決可用性、製造一致性問題。',
    epigraphSource: '本站章首引',
    teaser: '複本擺多了還是塞不下——下一步是把資料切片、分到不同節點上去。' },
  { id: 'ch06', num: 'CH 06', part: 2,
    title: '分區 Partitioning', shortTitle: 'Ch6 分區',
    summary: '資料量大到單機撐不下怎麼辦？分片後跨分片查詢怎麼處理？',
    link: '/part-2/ch06-partitioning', readTime: 40,
    epigraph: '資料量大了要分片、分片了要查詢、查詢了又要結果一致——分區的代價總在後面追上來。',
    epigraphSource: '本站章首引',
    teaser: '分了片、跨片要併操作就遇到「並發改同一筆怎麼不丟錢」——交易的世界。' },
  { id: 'ch07', num: 'CH 07', part: 2,
    title: '交易 Transactions', shortTitle: 'Ch7 交易',
    summary: '並發改同一筆資料怎麼避免丟錢？ACID 各家 DB 到底實作多少？',
    link: '/part-2/ch07-transactions', readTime: 60,
    epigraph: 'ACID 是承諾，每家 DB 兌現的細節不同——讀文件比讀書名重要。',
    epigraphSource: '本站章首引',
    teaser: '交易在單機上不容易、放到分散式系統上更難——下一章先講為什麼這麼難。' },
  { id: 'ch08', num: 'CH 08', part: 2,
    title: '分散式系統的麻煩', shortTitle: 'Ch8 分散式系統的麻煩',
    summary: '服務之間網路斷一半怎麼辦？為什麼不能信任時鐘？',
    link: '/part-2/ch08-trouble', readTime: 50,
    epigraph: '網路會慢、時鐘會偏、節點會說謊——別把單機的直覺帶到這裡。',
    epigraphSource: '本站章首引',
    teaser: '知道分散式有多坑了——共識演算法就是在這片地雷區裡仍然能達成一致的方案。' },
  { id: 'ch09', num: 'CH 09', part: 2,
    title: '一致性與共識', shortTitle: 'Ch9 一致性與共識',
    summary: '怎麼讓 N 台機器對一個值達成共識？線性一致到底有多貴？',
    link: '/part-2/ch09-consistency', readTime: 65,
    epigraph: '線性一致很貴；共識更貴；但有些場景，付不起這個代價的後果更貴。',
    epigraphSource: '本站章首引',
    teaser: 'OLTP 講完了——資料還能怎麼用？批次處理把「失敗」當「重來」、是另一種典範。' },

  // Part III
  { id: 'ch10', num: 'CH 10', part: 3,
    title: '批次處理 Batch', shortTitle: 'Ch10 批次處理',
    summary: '怎麼一夜跑完 1 億筆交易？MapReduce 與 Spark / Flink 怎麼運作？',
    link: '/part-3/ch10-batch', readTime: 55,
    epigraph: '批次處理的優雅：把「失敗」當「重來」、不當「災難」。',
    epigraphSource: '本站章首引',
    teaser: '批次是「一整批」的世界——下一章把資料變成「連續流」、即時處理。' },
  { id: 'ch11', num: 'CH 11', part: 3,
    title: '串流處理 Stream', shortTitle: 'Ch11 串流處理',
    summary: 'Kafka pipeline 怎麼設計？即時計算怎麼做到 exactly-once？',
    link: '/part-3/ch11-streams', readTime: 55,
    epigraph: '串流是把「現在」變成「連續的過去」——每個事件不重複也不漏失。',
    epigraphSource: '本站章首引',
    teaser: '12 章走到尾聲——Kleppmann 對資料系統的未來看法、是學習旅程的最後一站。' },
  { id: 'ch12', num: 'CH 12', part: 3,
    title: '資料系統的未來', shortTitle: 'Ch12 資料系統的未來',
    summary: '未來的資料系統長什麼樣？端到端正確性與倫理該怎麼設計？',
    link: '/part-3/ch12-future', readTime: 40,
    epigraph: '資料系統的未來不在更快的硬體、在更誠實的承諾。',
    epigraphSource: '本站章首引' }
] as const

export const TOTAL_CHAPTERS = CHAPTERS.length

// Part 0 前置知識：選讀章節，不計入 12 章主進度。
// 為什麼獨立成另一個陣列：CHAPTERS 是進度系統的 SSOT（Dashboard / TOTAL_CHAPTERS / quizIndex），
// 把前置知識混進去會讓「整體進度」失真——這是補強而非主課程。
export const PREREQUISITES: readonly Chapter[] = [
  { id: 'p0-basics', num: '0.0', part: 0,
    title: '三分鐘看懂後端世界', shortTitle: '0.0 三分鐘看懂後端',
    summary: '給沒寫過後端的人：一張全景圖 + 10 個最基本的詞',
    link: '/part-0/basics', readTime: 3 },
  { id: 'p0-intro', num: '0.1', part: 0,
    title: '為什麼需要資料密集系統', shortTitle: '0.1 為什麼需要資料系統',
    summary: '從一個簡單後端講起：stateless 服務、典型元件（DB / Cache / MQ）、為什麼需要 DDIA',
    link: '/part-0/intro', readTime: 12 },
  { id: 'p0-metrics', num: '0.2', part: 0,
    title: '衡量指標素養', shortTitle: '0.2 衡量指標素養',
    summary: 'QPS、Latency、P50/P99、Tail Latency、SLA/SLO —— Ch1 的銜接點',
    link: '/part-0/metrics', readTime: 18 },
  { id: 'p0-sql', num: '0.3', part: 0,
    title: 'SQL 與關聯模型 30 分鐘速覽', shortTitle: '0.3 SQL 速覽',
    summary: 'SELECT/JOIN/索引/交易直覺 —— Kleppmann 序言列為硬需求',
    link: '/part-0/sql', readTime: 30 },
  { id: 'p0-ds', num: '0.4', part: 0,
    title: '資料結構地基', shortTitle: '0.4 資料結構地基',
    summary: 'Hash、B-Tree、外部排序、Big-O —— 接 0.3 SQL 索引、Ch3 銜接點',
    link: '/part-0/data-structures', readTime: 25 },
  { id: 'p0-os', num: '0.5', part: 0,
    title: '作業系統地基', shortTitle: '0.5 作業系統地基',
    summary: '行程、執行緒、虛擬記憶體、page cache、fsync —— Ch3 / Ch7 銜接點',
    link: '/part-0/os', readTime: 25 },
  { id: 'p0-net', num: '0.6', part: 0,
    title: '網路地基', shortTitle: '0.6 網路地基',
    summary: 'TCP/IP、HTTP、RPC、延遲 vs 頻寬、partial failure —— Ch4 / Ch8 銜接點',
    link: '/part-0/network', readTime: 22 },
  { id: 'p0-concur', num: '0.7', part: 0,
    title: '並行控制直覺', shortTitle: '0.7 並行控制直覺',
    summary: 'Race condition、lock、原子性、隔離級別 —— Ch7 / Ch9 銜接點',
    link: '/part-0/concurrency', readTime: 20 }
] as const

export const PARTS = {
  0: { title: 'Part 0 · 前置知識', icon: 'foundation',
       desc: '進入 DDIA 前的暖身：作業系統、網路、SQL、資料結構、並行控制——選讀但能省下後續每章 30% 的卡關時間' },
  1: { title: 'Part I · 資料系統基礎', icon: 'dataset',
       desc: '單機資料系統的核心概念：可靠性、資料模型、儲存引擎、編碼格式' },
  2: { title: 'Part II · 分散式資料', icon: 'hub',
       desc: '跨機器的資料分布：複製、分區、交易、共識——分散式系統的核心難題' },
  3: { title: 'Part III · 衍生資料', icon: 'waves',
       desc: '批次與串流處理：從原始資料導出新資料的兩種典範' }
} as const

export function chaptersByPart(part: 0 | 1 | 2 | 3): readonly Chapter[] {
  if (part === 0) return PREREQUISITES
  return CHAPTERS.filter(c => c.part === part)
}

// 給「學習循環」block 用：依當前章節 id 推算下一章。
// Part 0 章節（'p0-xx'）在 PREREQUISITES 內依序往下；
// 主課程章節（'chXX'）在 CHAPTERS 內依序往下；
// 沒有下一章（Part 0 的最後一章、Ch12）回傳 null。
//
// 注意：Part 0 結束「不會」自動接到 Ch1——前置知識是選讀補強、
// 讀者可能在任何時點離開 Part 0 跳去主課程；硬接會誤導學習路徑。
export function nextChapter(currentId: string): Chapter | null {
  const list = currentId.startsWith('p0-') ? PREREQUISITES : CHAPTERS
  const idx = list.findIndex(c => c.id === currentId)
  if (idx < 0 || idx >= list.length - 1) return null
  return list[idx + 1] ?? null
}

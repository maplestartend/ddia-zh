// 進度與測驗紀錄的統一存取層。
// 任何元件需要讀 / 寫進度，都透過這裡 —— 不要直接碰 localStorage。

import { computed, onMounted } from 'vue'
import { useStorage } from './useStorage'
import { TOTAL_CHAPTERS, CHAPTERS } from '../data/chapters'

// 「已通關」門檻：Quiz 首次作答達 60% 視為通關。
// 60% 是學習動機友善值——比 80% 寬鬆、不會讓答對 4/5 = 80% 的讀者覺得「我沒通關」。
// 「已讀」與「已通關」是獨立狀態：手動標記已讀 vs 用 Quiz 表現自動推導通關。
const PASS_THRESHOLD = 0.6

export interface ProgressEntry {
  done: boolean
  at: string  // 'YYYY/M/D' 完成日期
}

export interface QuizEntry {
  answers: (number | null)[]
  submitted: boolean
  score: number
  total: number
  timestamp: number
  // Wave 17 加入：首次作答分數（重做不會覆蓋、用於「錯題本」「首次答對率」）
  firstAttemptScore?: number
  firstAttemptAt?: number
  attemptCount?: number
}

const PROGRESS_KEY = 'ddia-progress'
// v1 是 string[]、v2 是 QuizSummary[]。改用獨立 key 名稱讓兩版本可共存，
// 升級路徑：偵測 v1 key 存在 → migrate 到 v2 → 刪 v1 key。
const QUIZ_INDEX_KEY_V1 = 'ddia-quiz-index'
const QUIZ_INDEX_KEY_V2 = 'ddia-quiz-index-v2'
const QUIZ_PREFIX = 'ddia-quiz-'

type ProgressMap = Record<string, ProgressEntry>

// QuizIndex 從 v1（string[]）升級為 v2（QuizSummary[]）—— 把 score/total 一起存進來，
// 讓 accuracy computed 不必每次 reactivity 重算時去 parse localStorage（fix Dashboard 不更新 bug）。
export interface QuizSummary {
  chapterId: string
  score: number
  total: number
  ts: number
  // Wave 17：首次答對分數（追蹤學習真實表現、不被重做沖洗）
  firstAttemptScore?: number
  attemptCount?: number
}
type QuizIndex = QuizSummary[]

function isProgressMap(v: unknown): v is ProgressMap {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
function isQuizSummary(v: unknown): v is QuizSummary {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return typeof o.chapterId === 'string'
    && typeof o.score === 'number'
    && typeof o.total === 'number'
    && typeof o.ts === 'number'
}
function isQuizIndex(v: unknown): v is QuizIndex {
  return Array.isArray(v) && v.every(isQuizSummary)
}

// v1 → v2 升級：讀舊 string[] key、查每章的 quiz raw、補上 score/total/ts 變成 QuizSummary[]。
// 副作用安全：所有 localStorage 存取都在這個函式內、由呼叫者保證 onMounted 才呼叫。
function migrateV1ToV2(): QuizIndex {
  try {
    const raw = localStorage.getItem(QUIZ_INDEX_KEY_V1)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.every(x => typeof x === 'string')) return []
    const upgraded: QuizIndex = []
    for (const chId of parsed as string[]) {
      try {
        const qRaw = localStorage.getItem(QUIZ_PREFIX + chId)
        if (!qRaw) continue
        const q = JSON.parse(qRaw) as QuizEntry
        if (typeof q.score === 'number' && typeof q.total === 'number') {
          upgraded.push({ chapterId: chId, score: q.score, total: q.total, ts: q.timestamp || Date.now() })
        }
      } catch { /* ignore single chapter parse failure */ }
    }
    return upgraded
  } catch {
    return []
  }
}

export function useProgress() {
  const progress = useStorage<ProgressMap>(PROGRESS_KEY, {}, { validate: isProgressMap })
  const quizIndex = useStorage<QuizIndex>(QUIZ_INDEX_KEY_V2, [], { validate: isQuizIndex })

  // 升級流程：mount 後若 v2 還是空 + v1 raw 存在 → migrate、寫回、刪 v1。
  // 在 onMounted 內執行 → 守住 CLAUDE.md 規則 #4（副作用不在 setup 頂層）。
  //
  // ⚠️ Invariant：本 onMounted **必須在 useStorage 的 onMounted 之後執行**，
  //   否則 quizIndex.value 還沒從 localStorage 載入、看起來是空、會誤觸發 migrate
  //   覆蓋掉真正 v2 資料。Vue 對 setup() 註冊順序是 FIFO：
  //   `useStorage(...)` 先呼叫、它先註冊 onMounted；本 onMounted 後註冊 → 順序對。
  //   修改此檔時若新增 onMounted 在 useStorage 呼叫前，會破壞此 invariant。
  //
  // 另外為了雙保險：升級前再讀一次 v2 raw 直接確認、不只依賴 reactive state。
  onMounted(() => {
    let v2HasData = quizIndex.value.length > 0
    if (!v2HasData) {
      try {
        const v2Raw = localStorage.getItem(QUIZ_INDEX_KEY_V2)
        if (v2Raw && JSON.parse(v2Raw)?.length > 0) v2HasData = true
      } catch { /* ignore */ }
    }
    if (v2HasData) return
    const upgraded = migrateV1ToV2()
    if (upgraded.length === 0) return
    quizIndex.value = upgraded  // useStorage watch 會自動寫回 v2 key
    try { localStorage.removeItem(QUIZ_INDEX_KEY_V1) } catch { /* ignore */ }
  })

  const doneCount = computed(() =>
    Object.values(progress.value).filter(v => v.done).length
  )

  const progressPct = computed(() =>
    Math.round((doneCount.value / TOTAL_CHAPTERS) * 100)
  )

  function isDone(chapterId: string): boolean {
    return !!progress.value[chapterId]?.done
  }

  function getDoneAt(chapterId: string): string {
    return progress.value[chapterId]?.at ?? ''
  }

  function markDone(chapterId: string) {
    const now = new Date().toLocaleDateString('zh-TW')
    progress.value = { ...progress.value, [chapterId]: { done: true, at: now } }
  }

  function unmarkDone(chapterId: string) {
    const next = { ...progress.value }
    delete next[chapterId]
    progress.value = next
  }

  function saveQuiz(chapterId: string, entry: QuizEntry) {
    const prevIndex = quizIndex.value
    const existingSummary = prevIndex.find(s => s.chapterId === chapterId)
    // 首次作答：firstAttemptScore = score。重做時保留原 firstAttemptScore（不被沖洗）。
    const firstAttemptScore = existingSummary?.firstAttemptScore
      ?? entry.firstAttemptScore
      ?? entry.score
    const firstAttemptAt = existingSummary
      ? undefined  // 已有首次紀錄，保留 entry 原值（如有）
      : entry.firstAttemptAt ?? entry.timestamp
    const attemptCount = (existingSummary?.attemptCount ?? 0) + 1
    // 寫進詳細 entry（保留首次答對率資訊）
    const fullEntry: QuizEntry = {
      ...entry,
      firstAttemptScore,
      firstAttemptAt: firstAttemptAt ?? existingSummary?.ts,
      attemptCount
    }
    const summary: QuizSummary = {
      chapterId,
      score: entry.score,
      total: entry.total,
      ts: entry.timestamp,
      firstAttemptScore,
      attemptCount
    }
    const existing = prevIndex.findIndex(s => s.chapterId === chapterId)
    if (existing >= 0) {
      const next = [...prevIndex]
      next[existing] = summary
      quizIndex.value = next
    } else {
      quizIndex.value = [...prevIndex, summary]
    }
    try {
      localStorage.setItem(QUIZ_PREFIX + chapterId, JSON.stringify(fullEntry))
    } catch {
      quizIndex.value = prevIndex
    }
  }

  function loadQuiz(chapterId: string): QuizEntry | null {
    try {
      const raw = localStorage.getItem(QUIZ_PREFIX + chapterId)
      if (!raw) {
        // self-heal：saveQuiz 在 quota exceeded 時 summary 進了 reactive index、
        // 但詳細答案沒寫進 localStorage（孤兒）。loadQuiz 找不到時順手把 index 也清掉，
        // 避免 Dashboard accuracy 永遠算這筆「孤兒成績」。
        const orphan = quizIndex.value.findIndex(s => s.chapterId === chapterId)
        if (orphan >= 0) {
          quizIndex.value = quizIndex.value.filter(s => s.chapterId !== chapterId)
        }
        return null
      }
      const parsed = JSON.parse(raw) as QuizEntry
      if (typeof parsed.score !== 'number' || !Array.isArray(parsed.answers)) return null
      return parsed
    } catch { return null }
  }

  function clearQuiz(chapterId: string) {
    // reactive 先更新（不依賴 localStorage 成功）、之後再刪 localStorage。
    quizIndex.value = quizIndex.value.filter(s => s.chapterId !== chapterId)
    try { localStorage.removeItem(QUIZ_PREFIX + chapterId) } catch { /* ignore */ }
  }

  const quizCount = computed(() => quizIndex.value.length)

  // 純從 reactive quizIndex 算 —— 不再 parse localStorage，
  // 任何一筆 summary 更新都會自動觸發重算。
  const accuracy = computed(() => {
    let totalScore = 0
    let totalQ = 0
    for (const s of quizIndex.value) {
      totalScore += s.score
      totalQ += s.total
    }
    return totalQ === 0 ? 0 : Math.round((totalScore / totalQ) * 100)
  })

  // 首次答對率（誠實的學習表現指標、不會被「答完看答案再重做」沖洗）
  const firstAttemptAccuracy = computed(() => {
    let totalScore = 0
    let totalQ = 0
    for (const s of quizIndex.value) {
      const first = s.firstAttemptScore ?? s.score  // 舊資料 fallback 用當前 score
      totalScore += first
      totalQ += s.total
    }
    return totalQ === 0 ? 0 : Math.round((totalScore / totalQ) * 100)
  })

  // 「已通關」狀態：Quiz 首次作答 >= 60%（與「已讀」獨立）
  function isPassed(chapterId: string): boolean {
    const summary = quizIndex.value.find(s => s.chapterId === chapterId)
    if (!summary || summary.total === 0) return false
    const first = summary.firstAttemptScore ?? summary.score
    return first / summary.total >= PASS_THRESHOLD
  }

  // 首次作答百分比（用於 ChapterCard 等 UI 顯示「首次 75%」這類具體數值）
  // 沒做 Quiz 或 total = 0 回 null（讓 UI 知道沒資料、不要顯示 0%）
  function getFirstAttemptPct(chapterId: string): number | null {
    const summary = quizIndex.value.find(s => s.chapterId === chapterId)
    if (!summary || summary.total === 0) return null
    const first = summary.firstAttemptScore ?? summary.score
    return Math.round((first / summary.total) * 100)
  }

  // 已通關章節數（只算主 12 章、不算 Part 0）
  const passedCount = computed(() => {
    return CHAPTERS.filter(c => {
      const summary = quizIndex.value.find(s => s.chapterId === c.id)
      if (!summary || summary.total === 0) return false
      const first = summary.firstAttemptScore ?? summary.score
      return first / summary.total >= PASS_THRESHOLD
    }).length
  })

  const passedPct = computed(() =>
    Math.round((passedCount.value / TOTAL_CHAPTERS) * 100)
  )

  // 錯題本：列出首次未滿分的章節（依當前 quiz state、可重做以後就會脫離）
  const incorrectChapters = computed(() => {
    return quizIndex.value
      .filter(s => (s.firstAttemptScore ?? s.score) < s.total)
      .map(s => ({
        chapterId: s.chapterId,
        firstAttemptScore: s.firstAttemptScore ?? s.score,
        currentScore: s.score,
        total: s.total,
        attemptCount: s.attemptCount ?? 1
      }))
  })

  return {
    progress,
    doneCount,
    progressPct,
    isDone,
    getDoneAt,
    markDone,
    unmarkDone,
    quizCount,
    accuracy,
    firstAttemptAccuracy,
    incorrectChapters,
    saveQuiz,
    loadQuiz,
    clearQuiz,
    // 通關狀態（Wave 34）：與「已讀」獨立、Quiz 首次 >= 60% 自動通關
    isPassed,
    passedCount,
    passedPct,
    getFirstAttemptPct
  }
}

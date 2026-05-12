// 簡化版 SRS（spaced repetition）—— 基於 Ebbinghaus 遺忘曲線。
// 設計取捨：不做 SM-2 / Anki 等複雜演算法、只做固定間隔遞增。
//
// 規則：
//   - 每章在「標已讀」或「點過『我複習了』」後記錄一個 lastAt + intervalIdx
//   - 間隔序列：1d → 3d → 7d → 14d → 30d → 60d → 120d
//   - now - lastAt > 當前 interval → 該複習
//   - 「我複習了」按鈕 → intervalIdx += 1（上限到序列末）
//   - 「我又忘了」按鈕 → intervalIdx 重置為 0

import { computed, onMounted } from 'vue'
import { useStorage } from './useStorage'
import { CHAPTERS, PREREQUISITES, type Chapter } from '../data/chapters'

const KEY = 'ddia-srs-v1'
export const INTERVAL_DAYS = [1, 3, 7, 14, 30, 60, 120] as const
const DAY_MS = 24 * 60 * 60 * 1000

export interface ReviewState {
  lastAt: number      // 上次複習時間（Unix ms）
  intervalIdx: number // 對應 INTERVAL_DAYS 的索引
}

type ReviewMap = Record<string, ReviewState>

function isReviewMap(v: unknown): v is ReviewMap {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export interface DueChapter {
  chapter: Chapter
  state: ReviewState
  overdueDays: number  // 已過期幾天（> 0 才會出現在 due 清單）
}

export function useReview() {
  const reviews = useStorage<ReviewMap>(KEY, {}, { validate: isReviewMap })

  // 把所有章節（主課 + Part 0）合併查找
  const allChapters = computed(() => [...PREREQUISITES, ...CHAPTERS])

  /** 章節是否被使用者「啟動」（曾經標已讀或主動觸發過 review）*/
  function getState(chapterId: string): ReviewState | undefined {
    return reviews.value[chapterId]
  }

  /** 第一次標已讀時呼叫：建立 baseline */
  function seedReview(chapterId: string) {
    if (reviews.value[chapterId]) return  // 已有就不覆蓋
    reviews.value = {
      ...reviews.value,
      [chapterId]: { lastAt: Date.now(), intervalIdx: 0 }
    }
  }

  /** 使用者點「複習完了、還記得」→ 拉長間隔 */
  function markReviewed(chapterId: string) {
    const prev = reviews.value[chapterId]
    const nextIdx = Math.min(
      (prev?.intervalIdx ?? 0) + 1,
      INTERVAL_DAYS.length - 1
    )
    reviews.value = {
      ...reviews.value,
      [chapterId]: { lastAt: Date.now(), intervalIdx: nextIdx }
    }
  }

  /** 使用者點「忘了」→ 間隔重置為最短 */
  function markForgotten(chapterId: string) {
    reviews.value = {
      ...reviews.value,
      [chapterId]: { lastAt: Date.now(), intervalIdx: 0 }
    }
  }

  /** 該複習的章節（過期 > 0 天） */
  const dueChapters = computed<DueChapter[]>(() => {
    const now = Date.now()
    const result: DueChapter[] = []
    for (const ch of allChapters.value) {
      const state = reviews.value[ch.id]
      if (!state) continue
      const intervalDays = INTERVAL_DAYS[state.intervalIdx] ?? INTERVAL_DAYS[INTERVAL_DAYS.length - 1]!
      const elapsedDays = (now - state.lastAt) / DAY_MS
      if (elapsedDays >= intervalDays) {
        result.push({
          chapter: ch,
          state,
          overdueDays: Math.floor(elapsedDays - intervalDays)
        })
      }
    }
    // 過期最多的排前面
    result.sort((a, b) => b.overdueDays - a.overdueDays)
    return result
  })

  // 自動 seed：useProgress 標已讀時、本 composable 在 onMounted 同步狀態
  // 設計：在 Progress 元件 markDone 時呼叫 seedReview()
  // 這裡只提供 API，不主動 hook —— 避免循環依賴

  onMounted(() => {})  // placeholder：保留供未來擴充

  return {
    reviews,
    getState,
    seedReview,
    markReviewed,
    markForgotten,
    dueChapters,
    INTERVAL_DAYS
  }
}

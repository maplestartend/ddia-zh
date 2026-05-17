// 「上次讀的章節」reactive 紀錄 — ChapterOpener 寫入、Dashboard 讀取。
// W48：抽自 ChapterOpener + Dashboard 內 localStorage 直寫、走 useStorage 統一介面
// W51：加 hasLastVisited helper，消 caller-side non-null 斷言

import { computed, type ComputedRef, type Ref } from 'vue'
import { useStorage } from './useStorage'

export interface LastVisited {
  chapterId: string
  at: number  // Date.now() timestamp
}

function isLastVisited(v: unknown): v is LastVisited {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return typeof o.chapterId === 'string' && typeof o.at === 'number'
}

export function useLastVisited(): {
  lastVisited: Ref<LastVisited | null>
  hasLastVisited: ComputedRef<boolean>
} {
  const lastVisited = useStorage<LastVisited | null>('ddia-last-visited', null, {
    validate: (raw): raw is LastVisited | null => raw === null || isLastVisited(raw)
  })
  const hasLastVisited = computed(() => lastVisited.value !== null)
  return { lastVisited, hasLastVisited }
}

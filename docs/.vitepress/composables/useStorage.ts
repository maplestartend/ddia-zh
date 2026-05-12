// localStorage 統一 composable。
// 元件嚴禁直接呼叫 localStorage.getItem / setItem —— 一律走這裡。
// 處理：SSR 安全、quota / private mode 失敗 fallback、JSON 解析失敗 fallback、
// 跨元件 reactivity（同一個 key 在不同元件取得的 ref 共享同一份 reactive 狀態）。

import { ref, watch, onMounted, type Ref } from 'vue'

// 共享 ref 池：同一個 key 的多個 useStorage 呼叫共用同一個 ref，
// 確保 Progress 切換已讀後 ChapterCard / Dashboard 即時反映。
const sharedRefs = new Map<string, Ref<unknown>>()
// 同步記下每個 key 的 validate，跨分頁 storage event 收到資料時要再驗一次，
// 避免別的分頁亂寫 / 升級失敗造成本分頁狀態污染。
const sharedValidators = new Map<string, (raw: unknown) => boolean>()
// 同步記 fallback：跨分頁刪除（newValue === null）時用來重置 ref。
const sharedFallbacks = new Map<string, unknown>()

export function useStorage<T>(
  key: string,
  fallback: T,
  options: { validate?: (raw: unknown) => raw is T } = {}
): Ref<T> {
  // 同 key 已建立 → 共享同一個 ref
  if (sharedRefs.has(key)) {
    return sharedRefs.get(key) as Ref<T>
  }

  const state = ref(fallback) as Ref<T>
  sharedRefs.set(key, state as Ref<unknown>)
  sharedFallbacks.set(key, fallback)
  if (options.validate) sharedValidators.set(key, options.validate as (raw: unknown) => boolean)

  onMounted(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return
      const parsed = JSON.parse(raw)
      // schema 驗證：失敗則保留 fallback（不崩潰）
      if (options.validate && !options.validate(parsed)) return
      state.value = parsed as T
    } catch {
      // 私密模式、quota exceeded、JSON 損毀 — 一律靜默 fallback
    }
  })

  watch(state, (v) => {
    try {
      localStorage.setItem(key, JSON.stringify(v))
    } catch {
      // 寫入失敗也靜默（quota exceeded）
    }
  }, { deep: true })

  return state
}

// 跨分頁同步：listen `storage` event 讓多分頁切換已讀也即時反映
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key || !sharedRefs.has(e.key)) return
    const ref = sharedRefs.get(e.key)!
    try {
      // newValue === null 表示其他分頁呼叫了 removeItem → 本分頁也應該重置回 fallback
      if (e.newValue === null) {
        ref.value = sharedFallbacks.get(e.key)
        return
      }
      const next = JSON.parse(e.newValue)
      // 套 validate：避免別分頁亂寫 / 升級失敗的資料污染本分頁狀態
      const validate = sharedValidators.get(e.key)
      if (validate && !validate(next)) return
      ref.value = next
    } catch {
      // 忽略
    }
  })
}

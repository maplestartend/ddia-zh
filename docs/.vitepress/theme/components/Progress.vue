<template>
  <div class="ddia-chapter-loop">
    <div class="ddia-chapter-loop-eyebrow">
      <Icon name="autorenew" :size="14" />
      學習循環
    </div>
    <div class="ddia-chapter-loop-actions">
      <button class="ddia-loop-btn" :class="{ 'is-done': isDone }" @click="toggle">
        <Icon :name="isDone ? 'task_alt' : 'check_circle'" :size="18" :filled="!isDone" />
        <span class="ddia-loop-btn-text">
          <span class="ddia-loop-btn-label">{{ isDone ? '已讀完' : '標記已讀' }}</span>
          <span v-if="isDone" class="ddia-loop-btn-sub">{{ doneAt }} 完成</span>
        </span>
      </button>

      <button v-if="hasQuiz" class="ddia-loop-btn" @click="scrollToQuiz">
        <Icon :name="quizDone ? 'replay' : 'quiz'" :size="18" :filled="!quizDone" />
        <span class="ddia-loop-btn-text">
          <span class="ddia-loop-btn-label">{{ quizDone ? '看測驗答案' : '做測驗' }}</span>
          <span v-if="quizDone && quizResult" class="ddia-loop-btn-sub">
            {{ quizResult.score }} / {{ quizResult.total }}
          </span>
        </span>
      </button>

      <a v-if="next" :href="withBase(next.link)" class="ddia-loop-btn is-next">
        <span class="ddia-loop-btn-text">
          <span class="ddia-loop-btn-sub">下一章</span>
          <span class="ddia-loop-btn-label">{{ next.shortTitle }}</span>
        </span>
        <Icon name="arrow_forward" :size="18" filled />
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { withBase } from 'vitepress'
import Icon from './Icon.vue'
import { useProgress } from '../../composables/useProgress'
import { useReview } from '../../composables/useReview'
import { nextChapter } from '../../data/chapters'

const props = defineProps<{ chapterId: string }>()

const { isDone: checkDone, getDoneAt, markDone, unmarkDone, loadQuiz } = useProgress()
const { seedReview } = useReview()
const isDone = computed(() => checkDone(props.chapterId))
const doneAt = computed(() => getDoneAt(props.chapterId))
const next = computed(() => nextChapter(props.chapterId))

// 偵測本頁是否有 Quiz 元件（部分章節沒有測驗、就不顯示「做測驗」按鈕）
const hasQuiz = ref(false)
// reactive：quiz 答完之後切到「看測驗答案」+ 顯示分數
const quizDoneTick = ref(0)
const quizResult = computed(() => {
  quizDoneTick.value  // 依賴 tick 觸發重算
  return loadQuiz(props.chapterId)
})
const quizDone = computed(() => !!quizResult.value?.submitted)

function toggle() {
  if (isDone.value) {
    unmarkDone(props.chapterId)
  } else {
    markDone(props.chapterId)
    // 第一次標已讀時建立 SRS baseline；後續複習由 progress 頁面控制
    seedReview(props.chapterId)
  }
}

function scrollToQuiz() {
  const el = document.querySelector('.ddia-quiz')
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 80
  window.scrollTo({ top, behavior: 'smooth' })
}

// Quiz 元件 mount 後本 DOM 才有 .ddia-quiz、需在下一個 paint 偵測
let quizPoll: number | undefined
onMounted(() => {
  hasQuiz.value = !!document.querySelector('.ddia-quiz')
  // 答題完成觸發 storage 寫入、loadQuiz 結果會變；定時 tick 讓 quizResult 重算
  quizPoll = window.setInterval(() => { quizDoneTick.value++ }, 1500)
})
onUnmounted(() => {
  if (quizPoll) window.clearInterval(quizPoll)
})
</script>

<style scoped>
/* Editorial 章末學習循環：書末頁腳列（髮絲線分隔 + 連體按鈕格） */
.ddia-chapter-loop {
  margin: 56px 0 32px;
  padding: 24px 0;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--rule-hairline);
  border-bottom: 1px solid var(--rule-hairline);
  border-radius: 0;
}

.ddia-chapter-loop-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-display);
  font-variation-settings: "opsz" 24, "SOFT" 60, "wght" 500;
  font-style: italic;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: var(--text-tertiary);
  margin-bottom: 16px;
}
.ddia-chapter-loop-eyebrow :deep(.material-symbols-rounded) {
  display: none;
}

.ddia-chapter-loop-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0;
  border-top: 1px solid var(--rule-hairline);
  border-left: 1px solid var(--rule-hairline);
}

.ddia-loop-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px;
  background: transparent;
  border: 0;
  border-right: 1px solid var(--rule-hairline);
  border-bottom: 1px solid var(--rule-hairline);
  border-radius: 0;
  font-family: var(--font-display);
  font-variation-settings: "opsz" 24, "SOFT" 30, "wght" 500;
  font-size: 14px;
  color: var(--text-primary);
  text-decoration: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.ddia-loop-btn :deep(.material-symbols-rounded) {
  display: none;
}
.ddia-loop-btn:hover,
.ddia-loop-btn:focus-visible {
  background: var(--bg-surface);
  outline: none;
}

.ddia-loop-btn-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.ddia-loop-btn-label {
  font-family: var(--font-display);
  font-variation-settings: "opsz" 24, "SOFT" 30, "wght" 600;
  font-weight: 600;
  font-size: 15px;
  line-height: 1.3;
  letter-spacing: 0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ddia-loop-btn-sub {
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: "opsz" 24, "SOFT" 60, "wght" 400;
  font-size: 12px;
  color: var(--text-tertiary);
  letter-spacing: 0.04em;
}

/* 已讀狀態：左邊 3px brand 印記 */
.ddia-loop-btn.is-done {
  background: var(--brand-tint-soft);
  color: var(--brand-500);
  position: relative;
}
.ddia-loop-btn.is-done::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--brand-500);
}
.ddia-loop-btn.is-done .ddia-loop-btn-sub {
  color: var(--brand-500);
  opacity: 0.75;
}
:global(.dark) .ddia-loop-btn.is-done {
  color: var(--info-fg);
}
:global(.dark) .ddia-loop-btn.is-done::before {
  background: var(--info-fg);
}
:global(.dark) .ddia-loop-btn.is-done .ddia-loop-btn-sub {
  color: var(--info-fg);
}

/* 下一章 primary CTA */
.ddia-loop-btn.is-next {
  background: var(--brand-500);
  color: var(--text-inverse);
}
.ddia-loop-btn.is-next .ddia-loop-btn-sub {
  color: rgba(255, 255, 255, 0.75);
}
.ddia-loop-btn.is-next:hover,
.ddia-loop-btn.is-next:focus-visible {
  background: var(--brand-700);
}
.ddia-loop-btn.is-next::after {
  content: "→";
  margin-left: auto;
  font-size: 18px;
}
:global(.dark) .ddia-loop-btn.is-next {
  background: var(--info-fg);
  color: var(--bg-canvas);
}
:global(.dark) .ddia-loop-btn.is-next:hover {
  background: var(--accent-200);
}
</style>

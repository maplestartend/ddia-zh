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
/* 章末「學習循環」block：把分散在頁尾的標已讀 / 跳測驗 / 下一章三件事合在同一卡片
   讓 TLDR → 讀 → Quiz → Progress → 下一章 的學習循環視覺上閉環 */
.ddia-chapter-loop {
  margin: 40px 0 24px;
  padding: 18px 20px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-left: 3px solid var(--brand-500);
  border-radius: 12px;
}

.ddia-chapter-loop-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--brand-500);
  margin-bottom: 12px;
}
:global(.dark) .ddia-chapter-loop-eyebrow {
  color: var(--brand-300);
}

.ddia-chapter-loop-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.ddia-loop-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--bg-canvas);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  font-family: inherit;
  font-size: 14px;
  color: var(--text-primary);
  text-decoration: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.05s ease;
}
.ddia-loop-btn:hover,
.ddia-loop-btn:focus-visible {
  background: var(--bg-surface);
  border-color: var(--brand-300);
  outline: none;
}
.ddia-loop-btn:active {
  transform: translateY(1px);
}

.ddia-loop-btn-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.ddia-loop-btn-label {
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ddia-loop-btn-sub {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 400;
}

/* 已讀狀態：用 brand 邊 + 淡 brand 底，與「未讀」明確區分 */
.ddia-loop-btn.is-done {
  background: var(--info-bg);
  border-color: var(--brand-300);
  color: var(--brand-500);
}
.ddia-loop-btn.is-done .ddia-loop-btn-sub {
  color: var(--brand-500);
  opacity: 0.75;
}
:global(.dark) .ddia-loop-btn.is-done {
  color: var(--brand-300);
}
:global(.dark) .ddia-loop-btn.is-done .ddia-loop-btn-sub {
  color: var(--brand-300);
}

/* 下一章：primary CTA 視覺，引導讀者繼續 */
.ddia-loop-btn.is-next {
  background: var(--brand-500);
  border-color: var(--brand-500);
  color: var(--text-inverse);
}
.ddia-loop-btn.is-next .ddia-loop-btn-sub {
  color: rgba(255, 255, 255, 0.7);
}
.ddia-loop-btn.is-next:hover,
.ddia-loop-btn.is-next:focus-visible {
  background: var(--brand-600);
  border-color: var(--brand-600);
}
</style>

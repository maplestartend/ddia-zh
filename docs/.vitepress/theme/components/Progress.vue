<template>
  <div class="ddia-chapter-loop">
    <div class="ddia-chapter-loop-eyebrow">
      <Icon name="autorenew" :size="14" />
      學習循環
      <span v-if="quizDone" class="ddia-pass-pill" :class="{ 'is-passed': passed }">
        <Icon
          :name="passed ? 'workspace_premium' : 'pending'"
          :size="12"
          :filled="passed"
        />
        {{ passed ? `已通關 · 首次 ${firstPct}%` : `待通關 · 首次 ${firstPct}%` }}
      </span>
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
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { withBase } from 'vitepress'
import Icon from './Icon.vue'
import { useProgress } from '../../composables/useProgress'
import { useReview } from '../../composables/useReview'
import { nextChapter } from '../../data/chapters'

const props = defineProps<{ chapterId: string }>()

const { isDone: checkDone, getDoneAt, markDone, unmarkDone, isPassed, getFirstAttemptPct, getQuizSummary } = useProgress()
const { seedReview } = useReview()
const isDone = computed(() => checkDone(props.chapterId))
const doneAt = computed(() => getDoneAt(props.chapterId))
const next = computed(() => nextChapter(props.chapterId))

// 偵測本頁是否有 Quiz 元件（部分章節沒有測驗、就不顯示「做測驗」按鈕）
const hasQuiz = ref(false)

// P0-9 Wave 42：改用 reactive quizIndex（getQuizSummary），取代 setInterval 1.5s 輪詢
// quizIndex 是 useStorage ref、saveQuiz 寫入後同分頁 reactive、跨分頁靠 storage event
// 多分頁開著也不再有多個 timer 持續燒 CPU
const quizSummary = computed(() => getQuizSummary(props.chapterId))
const quizDone = computed(() => !!quizSummary.value)
const quizResult = computed(() => quizSummary.value
  ? { score: quizSummary.value.score, total: quizSummary.value.total }
  : null)
const passed = computed(() => isPassed(props.chapterId))
const firstPct = computed(() => getFirstAttemptPct(props.chapterId) ?? 0)

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
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' })
}

// Quiz 元件 mount 後本 DOM 才有 .ddia-quiz、需在下一個 paint 偵測
// R3-P1-10 Wave 42.3：用 nextTick 避免 Progress 比 Quiz 先 mount 時 hasQuiz 永遠 false
// W43-3 Wave 43：加 MutationObserver、SPA 換章後若 Quiz 元件變動仍能即時更新
onMounted(async () => {
  await nextTick()
  const refresh = () => { hasQuiz.value = !!document.querySelector('.ddia-quiz') }
  refresh()
  // 主 .vp-doc tree 變動（章節切換 SSG hydrate）後 re-check Quiz 是否仍在
  const vpDoc = document.querySelector('.vp-doc')
  if (!vpDoc || typeof MutationObserver === 'undefined') return
  const obs = new MutationObserver(() => {
    requestAnimationFrame(refresh)
  })
  obs.observe(vpDoc, { childList: true, subtree: false })
  onUnmounted(() => obs.disconnect())
})
</script>

<style scoped>
/* Editorial 章末學習循環：書末頁腳列（髮絲線分隔 + 連體按鈕格） */
.ddia-chapter-loop {
  margin: var(--space-5-5) 0 32px;
  padding: var(--space-4) 0;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--rule-hairline);
  border-bottom: 1px solid var(--rule-hairline);
  border-radius: 0;
}

.ddia-chapter-loop-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-eyebrow-warm);
  font-size: var(--type-eyebrow);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--ls-eyebrow);
  color: var(--text-tertiary);
  margin-bottom: var(--space-3);
}
.ddia-chapter-loop-eyebrow :deep(.material-symbols-rounded) {
  display: none;
}

/* 通關 pill：附在 eyebrow 旁、輕量無框、italic + small caps + 髮絲線分隔的 dinkus mark */
.ddia-pass-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: var(--space-2);
  padding: 2px 8px;
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-italic-warm);
  font-style: italic;
  font-size: var(--type-eyebrow);
  letter-spacing: var(--ls-loose);
  color: var(--text-tertiary);
  border-left: 2px solid var(--rule-hairline);
  background: transparent;
  text-transform: none;
}
.ddia-pass-pill.is-passed {
  color: var(--mark-fg);
  border-left-color: var(--mark-fg);
}
.ddia-pass-pill :deep(.material-symbols-rounded) {
  display: none;
}
.ddia-pass-pill::before {
  content: "·";
  margin-right: 2px;
  color: var(--rule-hairline);
}
.ddia-pass-pill.is-passed::before {
  content: "◆";
  color: var(--mark-fg);
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
  gap: var(--space-2-5);
  padding: var(--space-3) var(--space-3-5);
  background: transparent;
  border: 0;
  border-right: 1px solid var(--rule-hairline);
  border-bottom: 1px solid var(--rule-hairline);
  border-radius: 0;
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-section-mid);
  font-size: var(--type-small);
  color: var(--text-primary);
  text-decoration: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.ddia-loop-btn :deep(.material-symbols-rounded) {
  display: none;
}
.ddia-loop-btn:hover {
  background: var(--bg-surface);
}
/* :focus-visible 保留全域 outline 規則（base.css），加上 hover 同樣的背景反饋 */
.ddia-loop-btn:focus-visible {
  background: var(--bg-surface);
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
  font-variation-settings: var(--fvar-section-tight);
  font-weight: 600;
  font-size: var(--type-body-mid);
  line-height: 1.3;
  letter-spacing: var(--ls-tight);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ddia-loop-btn-sub {
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-italic-warm);
  font-size: var(--type-eyebrow);
  color: var(--text-tertiary);
  letter-spacing: var(--ls-loose);
}

/* 已讀狀態：左邊 3px brand 印記 */
.ddia-loop-btn.is-done {
  background: var(--brand-tint-soft);
  color: var(--mark-fg);
  position: relative;
}
.ddia-loop-btn.is-done::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--cta-bg);
}
.ddia-loop-btn.is-done .ddia-loop-btn-sub {
  color: var(--mark-fg);
  opacity: 0.75;
}

/* 下一章 primary CTA */
.ddia-loop-btn.is-next {
  background: var(--cta-bg);
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
  font-size: var(--type-body-lg);
}
:global(.dark) .ddia-loop-btn.is-next:hover {
  background: var(--accent-200);
}
</style>

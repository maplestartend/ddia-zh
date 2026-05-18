<template>
  <div class="ddia-quiz">
    <div class="ddia-quiz-header">
      <span class="ddia-quiz-header-title">
        <Icon name="quiz" :size="20" filled />
        章末測驗 · {{ chapterId }}
      </span>
      <span v-if="submitted" class="ddia-quiz-score">
        {{ correctCount }} / {{ questions.length }}
      </span>
    </div>

    <div v-if="submitted && attemptCount > 1" class="ddia-quiz-attempt-note">
      <Icon name="history" :size="14" />
      第 {{ attemptCount }} 次作答（首次答對 {{ firstAttemptScore }} / {{ questions.length }}）
    </div>

    <div v-for="(q, qIdx) in questions" :key="qIdx">
      <div class="ddia-quiz-question">
        Q{{ qIdx + 1 }}.
        <span v-if="q.difficulty" class="ddia-quiz-difficulty" :class="`is-${q.difficulty}`">
          {{ difficultyLabel(q.difficulty) }}
        </span>
        {{ q.question }}
      </div>

      <label
        v-for="(opt, oIdx) in q.options"
        :key="oIdx"
        class="ddia-quiz-option"
        :class="optionClass(qIdx, oIdx)"
      >
        <input
          type="radio"
          :name="`q-${chapterId}-${qIdx}`"
          :value="oIdx"
          v-model="answers[qIdx]"
          :disabled="submitted"
        />
        <span><strong>{{ String.fromCharCode(65 + oIdx) }}.</strong> {{ opt }}</span>
      </label>

      <div v-if="submitted" class="ddia-quiz-explanation">
        <strong>
          <Icon
            :name="answers[qIdx] === q.answer ? 'check_circle' : 'cancel'"
            :size="16"
            filled
            :style="{ color: answers[qIdx] === q.answer ? 'var(--success-fg)' : 'var(--error-fg)' }"
          />
          {{ answers[qIdx] === q.answer ? '答對' : '答錯' }}
        </strong>
        — 正解：{{ String.fromCharCode(65 + q.answer) }}。{{ q.explanation }}
        <a v-if="q.sectionAnchor"
           :href="`#${q.sectionAnchor}`"
           class="ddia-quiz-anchor-link"
           @click="onAnchorClick(q.sectionAnchor, $event)">
          <Icon name="north_west" :size="14" />
          回到對應章節
        </a>
      </div>
    </div>

    <div class="ddia-quiz-actions">
      <button
        v-if="!submitted"
        class="ddia-btn primary"
        :disabled="!allAnswered"
        @click="submit"
      >
        <Icon name="send" :size="16" />
        交卷
      </button>
      <template v-else>
        <button class="ddia-btn" @click="retry" title="重新作答、保留首次答對率紀錄">
          <Icon name="replay" :size="16" />
          重新作答（保留首次紀錄）
        </button>
        <button class="ddia-btn ddia-btn-ghost-danger" @click="reset" title="徹底清空、首次答對率也歸零">
          <Icon name="delete_outline" :size="16" />
          徹底清空
        </button>
      </template>
    </div>

    <!-- W45 Wave 45：刪除 Quiz 內 inline「下一站」區塊 —— 與下方 <NextChapterBridge> 重複 -->

  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import Icon from './Icon.vue'
import { useProgress } from '../../composables/useProgress'
import { useReview } from '../../composables/useReview'

type Difficulty = 'basic' | 'applied' | 'interview'

interface Question {
  question: string
  options: string[]
  answer: number
  explanation: string
  // Wave 17：optional 標籤、不破壞既有題庫
  difficulty?: Difficulty
  sectionAnchor?: string  // 用於「回到對應章節」連結
}

const props = defineProps<{
  chapterId: string
  questions: Question[]
}>()

const { saveQuiz, loadQuiz, clearQuiz } = useProgress()
const { seedReview } = useReview()

const answers = ref<(number | null)[]>(props.questions.map(() => null))
const submitted = ref(false)
const attemptCount = ref(1)
const firstAttemptScore = ref<number | null>(null)

// W45 Wave 45：刪除 Quiz inline「下一站」邏輯 —— 與下方 NextChapterBridge 重複
onMounted(() => {
  const saved = loadQuiz(props.chapterId)
  if (saved && saved.answers.length === props.questions.length) {
    answers.value = saved.answers
    submitted.value = saved.submitted
    attemptCount.value = saved.attemptCount ?? 1
    firstAttemptScore.value = saved.firstAttemptScore ?? saved.score
  }
})

const allAnswered = computed(() =>
  props.questions.length > 0 && answers.value.every(a => a !== null)
)

const correctCount = computed(() =>
  props.questions.reduce((sum, q, i) => sum + (answers.value[i] === q.answer ? 1 : 0), 0)
)

function difficultyLabel(d: Difficulty): string {
  // ◆ 面試 與 Glossary ★ 面試常考視覺刻意拆兩個 mark，避免「題的常考」與「詞的常考」語意混淆
  return d === 'basic' ? '基礎' : d === 'applied' ? '應用' : '◆ 面試'
}

function optionClass(qIdx: number, oIdx: number) {
  if (!submitted.value) {
    return { selected: answers.value[qIdx] === oIdx }
  }
  const q = props.questions[qIdx]
  if (!q) return {}
  if (oIdx === q.answer) return { correct: true }
  if (answers.value[qIdx] === oIdx) return { wrong: true }
  return {}
}

function onAnchorClick(anchor: string, e: MouseEvent) {
  e.preventDefault()
  const el = document.getElementById(anchor)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 80
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' })
  history.replaceState(null, '', `#${anchor}`)
}

function submit() {
  submitted.value = true
  const score = correctCount.value
  const total = props.questions.length
  saveQuiz(props.chapterId, {
    answers: answers.value,
    submitted: true,
    score,
    total,
    timestamp: Date.now()
  })
  // saveQuiz 內部會處理首次答對率，這裡僅 reload 取最新狀態
  const updated = loadQuiz(props.chapterId)
  if (updated) {
    attemptCount.value = updated.attemptCount ?? 1
    firstAttemptScore.value = updated.firstAttemptScore ?? updated.score
  }
  // B2：首次作答未達 80% → 自動 seed SRS 複習。
  // 已 seed 過的章（先標已讀 / 之前作答過）seedReview 內部會跳過、不會重置 interval。
  // 條件改成「首次作答」用 attemptCount === 1 判定，避免重做時又被 seed。
  if ((updated?.attemptCount ?? 1) === 1 && score / total < 0.8) {
    seedReview(props.chapterId)
  }
  // W52 CLS guard：reveal 後每題下方插入 explanation、後續題目整體位移、用戶眼線從 Q3 變 Q5。
  // 提交完自動 smooth scroll 回 Quiz 標頭、給用戶「重看自己作答結果」清楚錨點。
  // 用 nextTick 等 DOM render 完 explanation 才捲、避免捲後位置仍跳。
  nextTick(() => {
    const quizHeader = document.querySelector(`.ddia-quiz-header`)
    if (!quizHeader) return
    const top = quizHeader.getBoundingClientRect().top + window.scrollY - 24
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' })
  })
}

/** 重新作答、保留首次答對率紀錄（適合複習場景） */
function retry() {
  answers.value = props.questions.map(() => null)
  submitted.value = false
  // 不呼叫 clearQuiz——讓 useStorage 的 firstAttemptScore / attemptCount 保留
  // 下次 submit 時 saveQuiz 邏輯會自動 attemptCount += 1、firstAttemptScore 不沖洗
}

/** 徹底清空（含首次紀錄）—— 「我要從零開始假裝沒做過這章」場景 */
function reset() {
  if (!confirm('確定徹底清空？首次答對率與所有作答紀錄都會被刪除、無法復原。')) return
  answers.value = props.questions.map(() => null)
  submitted.value = false
  clearQuiz(props.chapterId)
  attemptCount.value = 1
  firstAttemptScore.value = null
}
</script>

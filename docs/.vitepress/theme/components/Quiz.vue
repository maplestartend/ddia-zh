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
      <button v-else class="ddia-btn" @click="reset">
        <Icon name="restart_alt" :size="16" />
        重新作答
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Icon from './Icon.vue'
import { useProgress } from '../../composables/useProgress'

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

const answers = ref<(number | null)[]>(props.questions.map(() => null))
const submitted = ref(false)
const attemptCount = ref(1)
const firstAttemptScore = ref<number | null>(null)

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
  return d === 'basic' ? '基礎' : d === 'applied' ? '應用' : '面試'
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
  window.scrollTo({ top, behavior: 'smooth' })
  history.replaceState(null, '', `#${anchor}`)
}

function submit() {
  submitted.value = true
  saveQuiz(props.chapterId, {
    answers: answers.value,
    submitted: true,
    score: correctCount.value,
    total: props.questions.length,
    timestamp: Date.now()
  })
  // saveQuiz 內部會處理首次答對率，這裡僅 reload 取最新狀態
  const updated = loadQuiz(props.chapterId)
  if (updated) {
    attemptCount.value = updated.attemptCount ?? 1
    firstAttemptScore.value = updated.firstAttemptScore ?? updated.score
  }
}

function reset() {
  answers.value = props.questions.map(() => null)
  submitted.value = false
  // 注意：clearQuiz 會把首次答對率一併清掉。新版改為「保留 firstAttempt 紀錄、只清當前作答」
  // 但目前 clearQuiz 設計是徹底重置——如果想保留紀錄、改成手動 unsubmit 才合理。
  // 此版本維持「重新作答 = 徹底重置」的語意，使用者要保留首次紀錄就不要按「重新作答」
  clearQuiz(props.chapterId)
  attemptCount.value = 1
  firstAttemptScore.value = null
}
</script>

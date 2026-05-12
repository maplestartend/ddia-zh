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

    <div v-for="(q, qIdx) in questions" :key="qIdx">
      <div class="ddia-quiz-question">Q{{ qIdx + 1 }}. {{ q.question }}</div>

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

interface Question {
  question: string
  options: string[]
  answer: number
  explanation: string
}

const props = defineProps<{
  chapterId: string
  questions: Question[]
}>()

const { saveQuiz, loadQuiz, clearQuiz } = useProgress()

const answers = ref<(number | null)[]>(props.questions.map(() => null))
const submitted = ref(false)

onMounted(() => {
  const saved = loadQuiz(props.chapterId)
  // schema 驗證：陣列長度需與當前題目數一致，避免題目改版後索引錯位
  if (saved && saved.answers.length === props.questions.length) {
    answers.value = saved.answers
    submitted.value = saved.submitted
  }
})

const allAnswered = computed(() =>
  props.questions.length > 0 && answers.value.every(a => a !== null)
)

const correctCount = computed(() =>
  props.questions.reduce((sum, q, i) => sum + (answers.value[i] === q.answer ? 1 : 0), 0)
)

function optionClass(qIdx: number, oIdx: number) {
  if (!submitted.value) {
    return { selected: answers.value[qIdx] === oIdx }
  }
  const q = props.questions[qIdx]
  if (!q) return {}  // noUncheckedIndexedAccess 提示：questions[qIdx] 可能 undefined（理論上不會發生）
  if (oIdx === q.answer) return { correct: true }
  if (answers.value[qIdx] === oIdx) return { wrong: true }
  return {}
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
}

function reset() {
  answers.value = props.questions.map(() => null)
  submitted.value = false
  clearQuiz(props.chapterId)
}
</script>

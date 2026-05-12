<template>
  <div class="ddia-interview">
    <div class="ddia-interview-eyebrow">
      <Icon name="campaign" :size="14" filled />
      面試怎麼問
    </div>
    <p class="ddia-interview-intro">
      想像面試官問你這幾題、自己心裡演練 90 秒講清楚。不必寫得長、能把關鍵字串起來就行。textarea 自動存。
    </p>
    <ol class="ddia-interview-list">
      <li v-for="(q, idx) in questions" :key="idx" class="ddia-interview-q">
        <div class="ddia-interview-q-head">
          Q{{ idx + 1 }}.
          <span v-if="q.tag" class="ddia-interview-q-tag">{{ q.tag }}</span>
          {{ q.question }}
        </div>
        <textarea
          v-model="answers[idx]!"
          class="ddia-interview-textarea"
          :placeholder="q.hint || '寫下你會怎麼回答…（自動存、Cheat Sheet 匯出時會帶出）'"
          rows="3"
        />
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import Icon from './Icon.vue'
import { useStorage } from '../../composables/useStorage'

interface InterviewQ {
  question: string
  hint?: string
  tag?: string  // 「轉帳系統」「分散式 KV」之類的面試題型標籤
}

const props = defineProps<{
  chapterId: string
  questions: InterviewQ[]
}>()

const key = computed(() => `ddia-interview-${props.chapterId}`)
// 用 string[] 儲存每題答案（與題目 index 對應）
const stored = useStorage<string[]>(key.value, [])

// 與當前題目數量對齊（題目改版後不沖洗、就 padding）
const answers = computed<string[]>({
  get() {
    const arr = [...stored.value]
    while (arr.length < props.questions.length) arr.push('')
    return arr
  },
  set(v) {
    stored.value = v
  }
})

// 因為 v-model 直接綁 answers[idx]、computed setter 不會觸發；改成 watch + 寫回
watch(answers, (v) => {
  if (v.length !== stored.value.length || v.some((a, i) => a !== stored.value[i])) {
    stored.value = [...v]
  }
}, { deep: true })
</script>

<style scoped>
.ddia-interview {
  margin: 28px 0;
  padding: 18px 22px;
  background: var(--warning-bg);
  border: 1px solid color-mix(in srgb, var(--warning-fg) 30%, transparent);
  border-left: 3px solid var(--warning-fg);
  border-radius: 12px;
}
.ddia-interview-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--warning-fg);
  margin-bottom: 10px;
}
.ddia-interview-intro {
  margin: 0 0 14px;
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.7;
}
.ddia-interview-list {
  margin: 0;
  padding-left: 22px;
  list-style: decimal;
}
.ddia-interview-q {
  margin: 14px 0;
}
.ddia-interview-q-head {
  margin-bottom: 6px;
  font-weight: 600;
  font-size: 14px;
  line-height: 1.65;
  color: var(--text-primary);
}
.ddia-interview-q-tag {
  display: inline-block;
  margin-right: 4px;
  padding: 1px 6px;
  background: var(--bg-surface);
  border: 1px solid color-mix(in srgb, var(--warning-fg) 30%, transparent);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: var(--warning-fg);
}
.ddia-interview-textarea {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-canvas);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  font-family: var(--vp-font-family-base);
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--text-primary);
  resize: vertical;
  outline: none;
}
.ddia-interview-textarea:focus {
  border-color: var(--warning-fg);
}
</style>

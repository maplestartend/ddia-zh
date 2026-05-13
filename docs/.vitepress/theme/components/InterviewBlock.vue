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
/* Editorial 面試題：書末練習題排版 + 手稿質感答題格 */
.ddia-interview {
  margin: var(--space-5) 0;
  padding: var(--space-3-5) 0;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--rule-hairline);
  border-bottom: 1px solid var(--rule-hairline);
  border-radius: 0;
}
.ddia-interview-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-eyebrow-warm);
  /* Wave 30a：功能性元件 eyebrow 去 italic（italic 留給儀式：Hero/ChapterOpener/Bridge/TLDR/Quiz） */
  font-size: var(--type-eyebrow);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--ls-eyebrow);
  color: var(--warning-fg);
  margin-bottom: var(--space-2-5);
}
.ddia-interview-eyebrow :deep(.material-symbols-rounded) {
  display: none;
}
.ddia-interview-intro {
  margin: 0 0 var(--space-3-5);
  font-family: var(--font-display);
  /* Wave 30a：功能性元件 intro 去 italic（fvar-italic-note 保留 — 控制 wght/SOFT，視覺仍偏柔軟） */
  font-variation-settings: var(--fvar-italic-note);
  font-size: var(--type-body-tight);
  color: var(--text-secondary);
  line-height: 1.75;
}
.ddia-interview-list {
  margin: 0;
  padding-left: 1.5em;
  list-style: none;
  counter-reset: q;
}
.ddia-interview-q {
  margin: var(--space-3-5) 0;
  counter-increment: q;
  position: relative;
}
.ddia-interview-q::before {
  content: "Q" counter(q);
  position: absolute;
  left: -2em;
  top: 1px;
  font-family: var(--font-display);
  font-variation-settings: "opsz" 24, "wght" 600;
  font-feature-settings: "onum" 1;
  font-size: var(--type-small-tight);
  letter-spacing: var(--ls-loose);
  color: var(--warning-fg);
}
.ddia-interview-q-head {
  margin-bottom: var(--space-2);
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-section-tight);
  font-weight: 600;
  font-size: var(--type-body-sm);
  line-height: 1.6;
  color: var(--text-primary);
}
.ddia-interview-q-tag {
  display: inline-block;
  margin-right: var(--space-2);
  padding: 0;
  background: transparent;
  border: 0;
  border-bottom: 1px dotted var(--warning-fg);
  border-radius: 0;
  font-family: var(--font-display);
  /* Wave 30a：功能性 tag 去 italic */
  font-variation-settings: var(--fvar-eyebrow-warm);
  font-size: var(--type-eyebrow);
  font-weight: 500;
  letter-spacing: var(--ls-mid);
  color: var(--warning-fg);
}
.ddia-interview-textarea {
  width: 100%;
  padding: var(--space-2-5) var(--space-3);
  background: var(--bg-surface);
  border: 0;
  border-bottom: 1px solid var(--rule-hairline);
  border-radius: 0;
  font-family: var(--font-body);
  font-size: var(--type-small);
  line-height: 1.75;
  color: var(--text-primary);
  resize: vertical;
  outline: none;  /* :focus 用 border-bottom 變色當滑鼠 affordance；:focus-visible 走鍵盤 outline */
  letter-spacing: var(--ls-tight);
}
.ddia-interview-textarea:focus {
  border-bottom-color: var(--warning-fg);
  background: var(--bg-subtle);
}
.ddia-interview-textarea:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: -2px;
}
</style>

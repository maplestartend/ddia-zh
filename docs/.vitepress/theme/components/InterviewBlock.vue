<template>
  <!-- P1-11 Wave 42：章末元件序列「滿出來」共識——
       InterviewBlock 改用 <details> 預設收起，省去 5 件套之中佔最大量的 Q&A 框框。
       讀者想練習就點開、否則章末視覺只剩 Quiz → Bridge 兩件主元件，明顯瘦身 -->
  <details class="ddia-interview" :open="defaultOpen">
    <summary class="ddia-interview-summary">
      <span class="ddia-interview-eyebrow">面試怎麼問</span>
      <span class="ddia-interview-count">{{ questions.length }} 題 · 點開練習</span>
    </summary>
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
  </details>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useStorage } from '../../composables/useStorage'

interface InterviewQ {
  question: string
  hint?: string
  tag?: string  // 「轉帳系統」「分散式 KV」之類的面試題型標籤
}

const props = withDefaults(defineProps<{
  chapterId: string
  questions: InterviewQ[]
  /** P1-11：預設收起（false）— 章末瘦身。讀者若已寫過答案、Quiz Cheat Sheet 仍可帶出。
   *  少數想預設展開的章節（如面試準備路徑專題）可覆寫 :default-open="true" */
  defaultOpen?: boolean
}>(), { defaultOpen: false })

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
  /* Wave 44 border audit：刪 border-bottom、章末序列由相鄰元件接 border-top */
  border-radius: 0;
}
/* P1-11 Wave 42：summary 折疊頭 — italic eyebrow + 題數提示 */
.ddia-interview-summary {
  display: flex;
  align-items: baseline;
  gap: var(--space-2-5);
  padding: var(--space-2) 0;
  cursor: pointer;
  list-style: none;
  font-family: var(--font-display);
  user-select: none;
  position: relative;
  padding-left: 1.2em;
}
.ddia-interview-summary::-webkit-details-marker { display: none; }
.ddia-interview-summary::before {
  content: "▸";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  font-size: var(--type-eyebrow);
  color: var(--warning-fg);
  transition: transform 0.18s ease;
}
.ddia-interview[open] > .ddia-interview-summary::before {
  transform: translateY(-50%) rotate(90deg);
}
.ddia-interview-summary:hover {
  color: var(--mark-fg);
}
.ddia-interview-summary:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}
.ddia-interview-eyebrow {
  font-variation-settings: var(--fvar-eyebrow-warm);
  font-size: var(--type-eyebrow);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--ls-eyebrow);
  color: var(--warning-fg);
}
.ddia-interview-count {
  font-variation-settings: var(--fvar-italic-warm);
  font-style: italic;
  font-size: var(--type-eyebrow);
  letter-spacing: var(--ls-loose);
  color: var(--text-tertiary);
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

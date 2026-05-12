<template>
  <details class="ddia-note" :open="hasContent">
    <summary class="ddia-note-summary">
      <Icon name="edit_note" :size="16" filled />
      我的筆記
      <span v-if="hasContent" class="ddia-note-badge">{{ charCount }} 字</span>
      <span class="ddia-note-hint">{{ savedHint }}</span>
    </summary>
    <textarea
      ref="taRef"
      v-model="content"
      class="ddia-note-textarea"
      placeholder="寫下你對這章的個人理解、自己的例子、想連結的工作場景、想問的問題……（自動存在這個瀏覽器、換瀏覽器會不見）"
      @input="onInput"
    />
    <div class="ddia-note-actions">
      <button v-if="content" class="ddia-btn" @click="clear">
        <Icon name="delete" :size="14" />
        清空
      </button>
      <span class="ddia-note-meta">儲存於：localStorage · 換瀏覽器不會同步</span>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Icon from './Icon.vue'
import { useStorage } from '../../composables/useStorage'

const props = defineProps<{ chapterId: string }>()

const key = computed(() => `ddia-note-${props.chapterId}`)
// 用 useStorage 統一管 localStorage（與其他元件一致）
const content = useStorage<string>(key.value, '')

const charCount = computed(() => content.value.length)
const hasContent = computed(() => charCount.value > 0)

const taRef = ref<HTMLTextAreaElement | null>(null)
const savedHint = ref('')
let saveTimer: number | undefined

function onInput() {
  savedHint.value = '輸入中…'
  if (saveTimer) clearTimeout(saveTimer)
  // useStorage watch 立即寫入；這裡只是給使用者「已存」回饋
  saveTimer = window.setTimeout(() => {
    savedHint.value = '已存'
    window.setTimeout(() => (savedHint.value = ''), 1500)
  }, 400)
}

function clear() {
  if (!confirm('確定清空本章筆記？此動作無法復原。')) return
  content.value = ''
}

// 自動高度調整（textarea 隨內容長度增長）
watch(content, () => {
  const ta = taRef.value
  if (!ta) return
  ta.style.height = 'auto'
  ta.style.height = Math.min(ta.scrollHeight, 600) + 'px'
}, { flush: 'post' })
</script>

<style scoped>
.ddia-note {
  margin: 24px 0;
  padding: 14px 18px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: 12px;
}
.ddia-note[open] {
  border-color: var(--brand-300);
}
.ddia-note-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
  user-select: none;
  list-style: none;
}
.ddia-note-summary::-webkit-details-marker {
  display: none;
}
.ddia-note-summary::after {
  content: '▾';
  margin-left: auto;
  color: var(--text-tertiary);
  font-size: 12px;
  transition: transform 0.15s;
}
.ddia-note[open] .ddia-note-summary::after {
  transform: rotate(180deg);
}
.ddia-note-badge {
  padding: 1px 8px;
  background: var(--info-bg);
  color: var(--info-fg);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
}
.ddia-note-hint {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 400;
}
.ddia-note-textarea {
  width: 100%;
  min-height: 120px;
  max-height: 600px;
  margin-top: 12px;
  padding: 12px 14px;
  background: var(--bg-canvas);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  font-family: var(--vp-font-family-base);
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;
}
.ddia-note-textarea:focus {
  border-color: var(--brand-500);
}
.ddia-note-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}
.ddia-note-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-left: auto;
}
</style>

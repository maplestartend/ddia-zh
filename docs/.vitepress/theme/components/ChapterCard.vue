<template>
  <a :href="resolvedHref" class="ddia-chapter-card"
     :class="{ done: isChapterDone, passed: isChapterPassed }"
     :aria-label="ariaLabel">
    <div class="ddia-chapter-card-head" aria-hidden="true">
      <span class="ddia-chapter-card-num">{{ num }}</span>
      <Icon
        v-if="isChapterPassed"
        name="workspace_premium"
        :size="18"
        filled
        :style="{ color: 'var(--mark-fg)' }"
      />
      <Icon
        v-else-if="isChapterDone"
        name="check_circle"
        :size="18"
        filled
        :style="{ color: 'var(--status-done-fg)' }"
      />
    </div>
    <div class="ddia-chapter-card-title" aria-hidden="true">{{ title }}</div>
    <div class="ddia-chapter-card-summary" aria-hidden="true">{{ summary }}</div>
    <div class="ddia-chapter-card-status" aria-hidden="true">
      <span class="ddia-chapter-card-status-tag" :class="statusTagClass">
        <Icon
          :name="statusIcon"
          :size="14"
          :filled="isChapterDone || isChapterPassed"
        />
        {{ statusLabel }}
      </span>
      <span class="ddia-chapter-card-status-tag">
        <Icon name="schedule" :size="14" />
        {{ readTime }} 分鐘
      </span>
    </div>
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import Icon from './Icon.vue'
import { useProgress } from '../../composables/useProgress'

const props = defineProps<{
  id: string
  num: string
  title: string
  summary: string
  link: string
  readTime: number
}>()

const { isDone, isPassed, getFirstAttemptPct } = useProgress()
const isChapterDone = computed(() => isDone(props.id))
const isChapterPassed = computed(() => isPassed(props.id))
const firstPct = computed(() => getFirstAttemptPct(props.id))

// 3 態：已通關 > 已閱讀 > 尚未開始（通關優先 — Quiz 通過比手動標記更強的學習證據）
const statusLabel = computed(() => {
  if (isChapterPassed.value) {
    return firstPct.value !== null ? `已通關 · 首次 ${firstPct.value}%` : '已通關'
  }
  if (isChapterDone.value) return '已閱讀'
  return '尚未開始'
})
const statusIcon = computed(() => {
  if (isChapterPassed.value) return 'workspace_premium'
  if (isChapterDone.value) return 'task_alt'
  return 'radio_button_unchecked'
})
const statusTagClass = computed(() => ({
  'is-passed': isChapterPassed.value,
  'is-done': isChapterDone.value && !isChapterPassed.value
}))

// 包 withBase 以支援 GitHub Pages 子路徑（base = '/ddia-zh/'）
const resolvedHref = computed(() => withBase(props.link))

// a11y：把卡片內 4 段 div 整合成單句 aria-label、避免 sr 朗讀 5-6 段冗長
const ariaLabel = computed(() =>
  `${props.num} ${props.title}：${props.summary}。預計 ${props.readTime} 分鐘、${statusLabel.value}`
)
</script>

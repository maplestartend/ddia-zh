<template>
  <a :href="resolvedHref" class="ddia-chapter-card" :class="{ done: isChapterDone }"
     :aria-label="ariaLabel">
    <div class="ddia-chapter-card-head" aria-hidden="true">
      <span class="ddia-chapter-card-num">{{ num }}</span>
      <Icon
        v-if="isChapterDone"
        name="check_circle"
        :size="18"
        filled
        :style="{ color: 'var(--status-done-fg)' }"
      />
    </div>
    <div class="ddia-chapter-card-title" aria-hidden="true">{{ title }}</div>
    <div class="ddia-chapter-card-summary" aria-hidden="true">{{ summary }}</div>
    <div class="ddia-chapter-card-status" aria-hidden="true">
      <span class="ddia-chapter-card-status-tag">
        <Icon
          :name="isChapterDone ? 'task_alt' : 'radio_button_unchecked'"
          :size="14"
          :filled="isChapterDone"
        />
        {{ isChapterDone ? '已讀完' : '尚未開始' }}
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

const { isDone } = useProgress()
const isChapterDone = computed(() => isDone(props.id))
// 包 withBase 以支援 GitHub Pages 子路徑（base = '/ddia-zh/'）
const resolvedHref = computed(() => withBase(props.link))

// a11y：把卡片內 4 段 div 整合成單句 aria-label、避免 sr 朗讀 5-6 段冗長
const ariaLabel = computed(() =>
  `${props.num} ${props.title}：${props.summary}。預計 ${props.readTime} 分鐘、${isChapterDone.value ? '已讀完' : '尚未開始'}`
)
</script>

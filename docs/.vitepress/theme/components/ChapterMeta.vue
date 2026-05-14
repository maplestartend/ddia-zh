<template>
  <div class="ddia-meta">
    <div class="ddia-meta-item">
      <strong>{{ part }}</strong>
    </div>
    <div class="ddia-meta-item">
      <!-- P1-16 Wave 42：與 PrereqBox first-read-hint 對齊
           原本 ChapterMeta 只顯示 readTime（如 35 分），PrereqBox 卻寫「60-90 分」—— 兩個數字打架。
           現在：有 deep-read-range 時顯示「快讀 35 分／深讀 60-90 分」、無則只顯示 readTime -->
      <template v-if="deepReadRange">
        <strong>快讀 {{ readTime }} 分</strong>
        <span class="ddia-meta-dot">／</span>
        <strong>深讀 {{ deepReadRange }} 分</strong>
      </template>
      <template v-else>
        預估 <strong>{{ readTime }} 分鐘</strong>
      </template>
    </div>
    <div class="ddia-meta-item">
      難度：<strong>{{ difficulty }}</strong>
    </div>
    <div v-if="prereq" class="ddia-meta-item">
      前置：<span class="ddia-badge">{{ prereq }}</span>
    </div>
    <div v-for="(tag, i) in tags" :key="i" class="ddia-meta-item">
      <span class="ddia-badge accent">{{ tag }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  part: string
  readTime: number
  difficulty: string
  prereq?: string
  tags?: string[]
  /** P1-16：深讀預估時間範圍，例如 "60-90"。設定後 ChapterMeta 顯示「快讀 X 分／深讀 Y-Z 分」 */
  deepReadRange?: string
}>()
</script>

<style scoped>
.ddia-meta-dot {
  margin: 0 0.18em;
  color: var(--text-tertiary);
}
</style>

<template>
  <div class="ddia-meta">
    <div class="ddia-meta-item">
      <Icon name="menu_book" :size="16" />
      <strong>{{ part }}</strong>
    </div>
    <div class="ddia-meta-item">
      <Icon name="schedule" :size="16" />
      預估 <strong>{{ readTime }} 分鐘</strong>
    </div>
    <div class="ddia-meta-item">
      <Icon name="speed" :size="16" />
      難度：<strong>{{ difficulty }}</strong>
    </div>
    <div v-if="prereq" class="ddia-meta-item">
      <Icon name="link" :size="16" />
      前置：<span class="ddia-badge">{{ prereq }}</span>
    </div>
    <div v-for="(tag, i) in tags" :key="i" class="ddia-meta-item">
      <span class="ddia-badge accent">{{ tag }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue'
defineProps<{
  part: string
  readTime: number
  difficulty: string
  prereq?: string
  tags?: string[]
}>()
</script>

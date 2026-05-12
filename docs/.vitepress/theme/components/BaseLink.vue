<template>
  <a :href="resolved" :class="ctaClass">
    <Icon v-if="icon" :name="icon" :size="iconSize" :filled="filled" />
    <slot />
  </a>
</template>

<script setup lang="ts">
// 包 VitePress withBase 的連結元件 —— 避免 hard-coded `<a href="/...">`
// 在 GitHub Pages 部署到子路徑（base = '/ddia-zh/'）時失效。
// 用法：<BaseLink to="/part-0/basics" icon="foundation" filled variant="primary">...</BaseLink>
import { computed } from 'vue'
import { withBase } from 'vitepress'
import Icon from './Icon.vue'

const props = withDefaults(defineProps<{
  to: string
  icon?: string
  filled?: boolean
  iconSize?: number
  variant?: 'primary' | 'ghost' | 'plain'
  /** 額外的 class，會附加到內建 ddia-cta 樣式之後 */
  class?: string
}>(), {
  filled: false,
  iconSize: 18,
  variant: 'plain'
})

const resolved = computed(() => withBase(props.to))
const ctaClass = computed(() => {
  const cls = []
  if (props.variant === 'primary') cls.push('ddia-cta', 'primary')
  else if (props.variant === 'ghost') cls.push('ddia-cta', 'ghost')
  if (props.class) cls.push(props.class)
  return cls.join(' ')
})
</script>

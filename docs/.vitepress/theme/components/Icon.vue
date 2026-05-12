<template>
  <span
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : true"
    class="material-symbols-rounded shrink-0"
    :style="style"
  >{{ name }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  name: string                                  // Material Symbols 名稱
  size?: number                                  // px
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700
  filled?: boolean                                // FILL 軸
  grade?: -25 | 0 | 200                           // GRAD 軸（對比度）
  label?: string                                  // 有則 role="img"，否則 aria-hidden
}>(), {
  size: 20,
  weight: 400,
  filled: false,
  grade: 0
})

const style = computed(() => ({
  fontSize: `${props.size}px`,
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontVariationSettings:
    `'FILL' ${props.filled ? 1 : 0}, 'wght' ${props.weight}, ` +
    `'GRAD' ${props.grade}, 'opsz' ${Math.min(48, Math.max(20, props.size))}`,
  verticalAlign: 'middle'
}))
</script>

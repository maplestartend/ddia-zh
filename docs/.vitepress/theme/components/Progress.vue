<template>
  <div class="ddia-progress-wrapper">
    <button class="ddia-btn" :class="{ primary: !isDone }" @click="toggle">
      <Icon :name="isDone ? 'replay' : 'check_circle'" :size="16" :filled="!isDone" />
      {{ isDone ? '已讀完，標記為未讀' : '標記為已讀完' }}
    </button>
    <span v-if="isDone" class="ddia-progress-done-at">
      <Icon name="event_available" :size="14" />
      完成於 {{ doneAt }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { useProgress } from '../../composables/useProgress'

const props = defineProps<{ chapterId: string }>()

const { isDone: checkDone, getDoneAt, markDone, unmarkDone } = useProgress()
const isDone = computed(() => checkDone(props.chapterId))
const doneAt = computed(() => getDoneAt(props.chapterId))

function toggle() {
  if (isDone.value) {
    unmarkDone(props.chapterId)
  } else {
    markDone(props.chapterId)
  }
}
</script>

<style scoped>
.ddia-progress-done-at {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--status-done-fg);
  font-size: 13px;
  font-weight: 500;
}
</style>

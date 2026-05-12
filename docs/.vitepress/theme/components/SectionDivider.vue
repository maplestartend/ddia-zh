<template>
  <div class="ddia-section-divider" :class="{ 'is-cjk': isCjk }" role="separator">
    <span v-if="icon" class="ddia-section-divider-icon">
      <Icon :name="icon" :size="16" filled />
    </span>
    <span v-if="label" class="ddia-section-divider-label">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
// 章節中段視覺地標 —— 避免長章節文字牆。
// 用法：<SectionDivider icon="bolt" label="關鍵權衡" />
//   - 自動偵測 label 是中文還是英文，中文不套 uppercase（避免字字疏開反而難讀）
import { computed } from 'vue'
import Icon from './Icon.vue'

const props = defineProps<{
  icon?: string
  label?: string
}>()

const isCjk = computed(() => /[一-鿿]/.test(props.label ?? ''))
</script>

<style scoped>
.ddia-section-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 36px 0 24px;
  padding-left: 10px;
  border-left: 3px solid var(--brand-500);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

:global(.dark) .ddia-section-divider {
  border-left-color: var(--brand-300);
}

.ddia-section-divider-icon {
  color: var(--brand-500);
  display: inline-flex;
}

:global(.dark) .ddia-section-divider-icon {
  color: var(--brand-300);
}

.ddia-section-divider-label {
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* 中文 label 不套 uppercase —— 中文沒大小寫概念，uppercase 會被當英文字距處理，反而字字疏開 */
.ddia-section-divider.is-cjk .ddia-section-divider-label {
  text-transform: none;
  letter-spacing: 0.02em;
  font-size: 14px;
}
</style>

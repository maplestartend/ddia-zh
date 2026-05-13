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
/* Editorial section divider：置中 ◆◆◆ dinkus 取代左邊條 + small caps label 在 dinkus 下方 */
.ddia-section-divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1-5);
  margin: 48px 0 32px;
  text-align: center;
  border: 0;
  padding: 0;
  color: var(--text-tertiary);
}

.ddia-section-divider::before {
  content: "◆ ◆ ◆";
  font-family: var(--font-display);
  font-size: var(--type-eyebrow);
  color: var(--rule-soft);
  letter-spacing: 0.8em;
  padding-left: 0.8em;
  line-height: 1;
}

:global(.dark) .ddia-section-divider {
  color: var(--text-tertiary);
}

.ddia-section-divider-icon {
  display: none; /* dinkus 取代圖示 */
}

.ddia-section-divider-label {
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: var(--fvar-eyebrow-warm);
  text-transform: uppercase;
  font-size: var(--type-eyebrow);
  font-weight: 500;
  letter-spacing: var(--ls-eyebrow);
  color: var(--text-tertiary);
}

/* 中文 label 不套 uppercase */
.ddia-section-divider.is-cjk .ddia-section-divider-label {
  text-transform: none;
  letter-spacing: 0.08em;
  font-size: 13px;
  font-style: normal;
}
</style>

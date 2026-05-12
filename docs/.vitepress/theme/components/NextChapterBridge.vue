<template>
  <div class="ddia-bridge">
    <div class="ddia-bridge-eyebrow">
      <Icon name="arrow_forward" :size="14" />
      接下來
    </div>
    <p class="ddia-bridge-text">
      <slot />
    </p>
    <a v-if="nextLink" :href="resolvedHref" class="ddia-bridge-link">
      前往 {{ nextTitle }}
      <Icon name="chevron_right" :size="16" />
    </a>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import Icon from './Icon.vue'
const props = defineProps<{
  nextLink?: string
  nextTitle?: string
}>()
// 內部相對路徑包 withBase 以處理 GitHub Pages 子路徑；外部 URL 直接放行
const resolvedHref = computed(() => {
  if (!props.nextLink) return undefined
  if (/^https?:\/\//.test(props.nextLink)) return props.nextLink
  return withBase(props.nextLink)
})
</script>

<style scoped>
/* Editorial 章末橋接：書頁注腳樣式 — 髮絲線分隔 + italic eyebrow */
.ddia-bridge {
  margin: 40px 0 24px;
  padding: 22px 0 18px;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--rule-hairline);
  border-bottom: 1px solid var(--rule-hairline);
  border-radius: 0;
}

.ddia-bridge-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-display);
  font-variation-settings: "opsz" 24, "SOFT" 60, "wght" 500;
  font-style: italic;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: var(--text-tertiary);
  margin-bottom: 10px;
}
.ddia-bridge-eyebrow :deep(.material-symbols-rounded) {
  display: none;
}

.ddia-bridge-text {
  margin: 0;
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.75;
  color: var(--text-primary);
  letter-spacing: 0.01em;
}

.ddia-bridge-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 14px;
  font-family: var(--font-display);
  font-variation-settings: "opsz" 24, "SOFT" 30, "wght" 600;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-500);
  text-decoration: none;
  border-bottom: 1px solid var(--accent-500);
  padding-bottom: 2px;
}

:global(.dark) .ddia-bridge-link {
  color: var(--info-fg);
  border-bottom-color: var(--info-fg);
}

.ddia-bridge-link:hover {
  color: var(--brand-500);
  border-bottom-color: var(--brand-500);
}

.ddia-bridge-link :deep(.material-symbols-rounded) {
  display: none;
}
.ddia-bridge-link::after {
  content: "→";
  margin-left: 2px;
}
</style>

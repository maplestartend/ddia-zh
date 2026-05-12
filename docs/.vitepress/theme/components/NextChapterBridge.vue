<template>
  <div class="ddia-bridge">
    <div class="ddia-bridge-eyebrow">
      <Icon name="arrow_forward" :size="14" />
      接下來
    </div>
    <p class="ddia-bridge-text">
      <slot />
    </p>
    <a v-if="nextLink" :href="nextLink" class="ddia-bridge-link">
      前往 {{ nextTitle }}
      <Icon name="chevron_right" :size="16" />
    </a>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue'
defineProps<{
  nextLink?: string
  nextTitle?: string
}>()
</script>

<style scoped>
.ddia-bridge {
  margin: 32px 0 16px;
  padding: 18px 22px;
  background: var(--info-bg);
  border: 1px solid var(--info-border);
  border-left: 3px solid var(--brand-500);
  border-radius: 12px;
}

.ddia-bridge-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--brand-500);
  margin-bottom: 8px;
}

:global(.dark) .ddia-bridge-eyebrow {
  color: var(--brand-300);
}

.ddia-bridge-text {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--text-primary);
}

.ddia-bridge-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--brand-500);
  text-decoration: none;
}

:global(.dark) .ddia-bridge-link {
  color: var(--brand-300);
}

.ddia-bridge-link:hover {
  text-decoration: underline;
}
</style>

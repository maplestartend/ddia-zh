<template>
  <div class="ddia-prereq">
    <div class="ddia-prereq-eyebrow">
      <Icon name="info" :size="14" filled />
      讀前須知
    </div>
    <dl class="ddia-prereq-list">
      <template v-if="prereq && prereq.length">
        <dt><Icon name="checklist" :size="14" /> 需要先會</dt>
        <dd>
          <span v-for="(p, i) in prereq" :key="i" class="ddia-prereq-item">{{ p }}</span>
        </dd>
      </template>
      <template v-if="firstReadHint">
        <dt><Icon name="schedule" :size="14" /> 第一次讀預估</dt>
        <dd>{{ firstReadHint }}</dd>
      </template>
      <template v-if="skippable && skippable.length">
        <dt><Icon name="fast_forward" :size="14" /> 可跳過的小節</dt>
        <dd>
          <ul>
            <li v-for="(s, i) in skippable" :key="i">{{ s }}</li>
          </ul>
        </dd>
      </template>
    </dl>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue'
defineProps<{
  prereq?: string[]
  firstReadHint?: string
  skippable?: string[]
}>()
</script>

<style scoped>
.ddia-prereq {
  margin: 16px 0 28px;
  padding: 14px 18px;
  background: var(--bg-subtle);
  border: 1px solid var(--border-default);
  border-left: 3px solid var(--accent-500);
  border-radius: 10px;
}
.ddia-prereq-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent-500);
  margin-bottom: 10px;
}
:global(.dark) .ddia-prereq-eyebrow {
  color: var(--brand-300);
}
.ddia-prereq-list {
  margin: 0;
  display: grid;
  grid-template-columns: minmax(140px, auto) 1fr;
  gap: 6px 16px;
  font-size: 13.5px;
  line-height: 1.6;
}
.ddia-prereq-list dt {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-secondary);
  font-weight: 600;
  white-space: nowrap;
}
.ddia-prereq-list dd {
  margin: 0;
  color: var(--text-primary);
}
.ddia-prereq-list dd ul {
  margin: 0;
  padding-left: 18px;
}
.ddia-prereq-list dd ul li {
  margin: 2px 0;
}
.ddia-prereq-item {
  display: inline-block;
  padding: 1px 8px;
  margin: 0 4px 4px 0;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: 999px;
  font-size: 12.5px;
  color: var(--text-secondary);
}
@media (max-width: 640px) {
  .ddia-prereq-list {
    grid-template-columns: 1fr;
    gap: 4px 0;
  }
  .ddia-prereq-list dt {
    margin-top: 8px;
  }
}
</style>

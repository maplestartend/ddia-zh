<template>
  <div class="ddia-review">
    <div class="ddia-review-eyebrow">
      <Icon name="schedule" :size="14" filled />
      該複習的章節
    </div>

    <div v-if="dueChapters.length === 0" class="ddia-review-empty">
      <Icon name="check_circle" :size="16" filled />
      目前沒有待複習的章節
      <span class="ddia-review-empty-hint">標已讀的章節會依 1d → 3d → 7d → 14d → 30d → 60d → 120d 漸進間隔出現在這</span>
    </div>

    <ul v-else class="ddia-review-list">
      <li v-for="d in dueChapters" :key="d.chapter.id" class="ddia-review-item">
        <div class="ddia-review-item-info">
          <a :href="withBase(d.chapter.link)" class="ddia-review-item-title">
            {{ d.chapter.shortTitle }}
          </a>
          <span class="ddia-review-item-meta">
            上次 {{ formatDate(d.state.lastAt) }} · 間隔 {{ intervalLabel(d.state.intervalIdx) }} · 已過期 {{ d.overdueDays }} 天
          </span>
        </div>
        <div class="ddia-review-item-actions">
          <button class="ddia-review-btn primary" @click="onReviewed(d.chapter.id)" title="拉長下次複習間隔">
            <Icon name="task_alt" :size="14" filled />
            還記得
          </button>
          <button class="ddia-review-btn" @click="onForgotten(d.chapter.id)" title="間隔重置、明天再來">
            <Icon name="replay" :size="14" />
            忘了
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { withBase } from 'vitepress'
import Icon from './Icon.vue'
import { useReview, INTERVAL_DAYS } from '../../composables/useReview'

const { dueChapters, markReviewed, markForgotten } = useReview()

function intervalLabel(idx: number): string {
  const days = INTERVAL_DAYS[idx] ?? INTERVAL_DAYS[INTERVAL_DAYS.length - 1]!
  return `${days} 天`
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-TW')
}

function onReviewed(chapterId: string) {
  markReviewed(chapterId)
}

function onForgotten(chapterId: string) {
  markForgotten(chapterId)
}
</script>

<style scoped>
/* Editorial 複習清單：書末錯題本 errata 樣式 */
.ddia-review {
  margin: var(--space-4-5) 0;
  padding: var(--space-3-5) 0;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--rule-hairline);
  border-bottom: 1px solid var(--rule-hairline);
  border-radius: 0;
}
.ddia-review-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-eyebrow-warm);
  font-size: var(--type-eyebrow);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--ls-eyebrow);
  color: var(--text-tertiary);
  margin-bottom: 14px;
}
.ddia-review-eyebrow :deep(.material-symbols-rounded) {
  display: none;
}
.ddia-review-empty {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  color: var(--text-secondary);
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-italic-note);
  font-size: 14.5px;
}
.ddia-review-empty :deep(.material-symbols-rounded) {
  display: none;
}
.ddia-review-empty::before {
  content: "·";
  font-family: var(--font-display);
  font-size: var(--type-body-lg);
  color: var(--success-fg);
  font-weight: 700;
}
.ddia-review-empty-hint {
  font-size: var(--type-meta);
  margin-left: auto;
  color: var(--text-tertiary);
}
.ddia-review-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.ddia-review-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: var(--space-2-5) 0;
  border-top: 1px solid var(--border-default);
  flex-wrap: wrap;
}
.ddia-review-item:first-child {
  border-top: none;
}
.ddia-review-item-info {
  flex: 1;
  min-width: 0;
}
.ddia-review-item-title {
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-section-tight);
  font-weight: 600;
  font-size: 15.5px;
  color: var(--text-primary);
  text-decoration: none;
}
.ddia-review-item-title:hover {
  color: var(--mark-fg);
  border-bottom: 1px solid var(--brand-500);
}
:global(.dark) .ddia-review-item-title:hover {
  color: var(--brand-fg);
  border-bottom-color: var(--brand-fg);
}
.ddia-review-item-meta {
  display: block;
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-italic-warm);
  font-size: var(--type-meta);
  color: var(--text-tertiary);
  margin-top: var(--space-1);
  letter-spacing: 0.01em;
}
.ddia-review-item-actions {
  display: inline-flex;
  gap: 14px;
}
.ddia-review-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1-5) var(--space-2-5);
  background: transparent;
  border: 1px solid var(--text-primary);
  border-radius: 0;
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-section-tight);
  font-size: var(--type-meta);
  letter-spacing: 0.04em;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.ddia-review-btn :deep(.material-symbols-rounded) {
  display: none;
}
.ddia-review-btn:hover {
  background: var(--text-primary);
  color: var(--bg-canvas);
}
.ddia-review-btn.primary {
  background: var(--cta-bg);
  border-color: var(--mark-fg);
  color: var(--text-inverse);
}
.ddia-review-btn.primary:hover {
  background: var(--brand-700);
  border-color: var(--brand-700);
}
/* dark mode：brand-500 mahogany 在暗底會顯髒、改用 brand-fg 暖橙 */
:global(.dark) .ddia-review-btn.primary {
  background: var(--brand-fg);
  border-color: var(--brand-fg);
  color: var(--bg-canvas);
}
:global(.dark) .ddia-review-btn.primary:hover {
  background: var(--accent-200);
  border-color: var(--accent-200);
}
</style>

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
.ddia-review {
  margin: 24px 0;
  padding: 18px 22px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-left: 3px solid var(--accent-500);
  border-radius: 12px;
}
.ddia-review-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent-500);
  margin-bottom: 12px;
}
:global(.dark) .ddia-review-eyebrow {
  color: var(--brand-300);
}
.ddia-review-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  color: var(--text-tertiary);
  font-size: 13.5px;
}
.ddia-review-empty-hint {
  font-size: 12px;
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
  gap: 12px;
  padding: 10px 0;
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
  font-weight: 600;
  font-size: 14.5px;
  color: var(--text-primary);
  text-decoration: none;
}
.ddia-review-item-title:hover {
  color: var(--brand-500);
}
.ddia-review-item-meta {
  display: block;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}
.ddia-review-item-actions {
  display: inline-flex;
  gap: 6px;
}
.ddia-review-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  background: var(--bg-canvas);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  font-size: 12.5px;
  color: var(--text-primary);
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s;
}
.ddia-review-btn:hover {
  border-color: var(--brand-300);
}
.ddia-review-btn.primary {
  background: var(--brand-500);
  border-color: var(--brand-500);
  color: var(--text-inverse);
}
.ddia-review-btn.primary:hover {
  background: var(--brand-600);
  border-color: var(--brand-600);
}
</style>

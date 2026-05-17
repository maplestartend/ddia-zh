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
          <span v-for="(p, i) in prereq" :key="i" class="ddia-prereq-item" v-html="renderInline(p)" />
        </dd>
      </template>
      <template v-if="firstReadHint">
        <dt><Icon name="schedule" :size="14" /> 第一次讀預估</dt>
        <dd v-html="renderInline(firstReadHint)" />
      </template>
      <template v-if="skippable && skippable.length">
        <dt><Icon name="fast_forward" :size="14" /> 可跳過的小節</dt>
        <dd>
          <ul>
            <li v-for="(s, i) in skippable" :key="i" v-html="renderInline(s)" />
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

// 安全的 inline markdown 解析：只支援 **bold** / [text](url) / `code`
// 流程：先 HTML escape 避免 XSS、再用 regex 把 markdown 符號轉成 tag
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderInline(raw: string): string {
  if (!raw) return ''
  let s = escapeHtml(raw)
  // `code` → <code>
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  // [text](url) → <a> — text 與 url 已 HTML-escape 過、不會有 XSS
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  // **bold** → <strong>（要在 link 之後處理避免破壞 link 內 ** 標記）
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  return s
}
</script>

<style scoped>
/* Editorial 讀前須知：書頁譯註欄樣式 */
.ddia-prereq {
  margin: var(--space-4) 0 36px;
  padding: var(--space-3-5) 0;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--rule-hairline);
  /* Wave 44 border audit：刪 border-bottom */
  border-radius: 0;
}
.ddia-prereq-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-eyebrow-warm);
  /* Wave 28f：功能性元件 eyebrow 去 italic、保留 uppercase + letter-spacing 撐 small-caps 感
     italic 留給儀式點位（Hero / ChapterOpener / NextChapterBridge / TLDR / Quiz） */
  font-size: var(--type-eyebrow);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--ls-eyebrow);
  color: var(--text-tertiary);
  margin-bottom: var(--space-2-5);
}
.ddia-prereq-list {
  margin: 0;
  display: grid;
  grid-template-columns: minmax(160px, auto) 1fr;
  gap: var(--space-2-5) var(--space-4);
  font-family: var(--font-body);
  font-size: var(--type-small);
  line-height: 1.7;
}
.ddia-prereq-list dt {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: var(--fvar-eyebrow);
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
  letter-spacing: var(--ls-loose);
}
.ddia-prereq-list dd {
  margin: 0;
  color: var(--text-primary);
}
.ddia-prereq-list dd ul {
  margin: 0;
  padding-left: 1.2em;
  list-style: none;
}
.ddia-prereq-list dd ul li {
  margin: var(--space-1) 0;
  position: relative;
}
.ddia-prereq-list dd ul li::before {
  content: "·";
  position: absolute;
  left: -0.9em;
  font-family: var(--font-display);
  color: var(--text-tertiary);
  font-size: var(--type-body-lg);
  line-height: 1;
}
.ddia-prereq-item {
  display: inline-block;
  padding: 1px 0;
  margin: 0 14px var(--space-1) 0;
  background: transparent;
  border: 0;
  border-bottom: 1px dotted var(--border-default);
  border-radius: 0;
  font-size: 13.5px;  /* lint-typography-allow: prereq item 中文小字 */
  color: var(--text-secondary);
}
@media (max-width: 640px) {
  .ddia-prereq-list {
    grid-template-columns: 1fr;
    gap: var(--space-1) 0;
  }
  .ddia-prereq-list dt {
    margin-top: var(--space-2-5);
  }
}
</style>

<template>
  <span v-if="!entry" class="ddia-g-missing" :title="`詞彙表未收錄：${term}`">
    <slot>{{ term }}</slot>
  </span>
  <a v-else
     ref="anchorRef"
     :href="glossaryHref"
     class="ddia-g"
     :aria-describedby="tooltipId"
     @mouseenter="onHover(true)"
     @mouseleave="onHover(false)"
     @focus="show = true"
     @blur="show = false"
     @click="onClick">
    <slot>{{ entry.chinese }}</slot><!--
    --><Transition name="ddia-g-fade">
      <span v-if="show" :id="tooltipId" class="ddia-g-tooltip" role="tooltip">
        <span class="ddia-g-tooltip-head">
          <span class="ddia-g-tooltip-en">{{ entry.english }}</span>
          <span class="ddia-g-tooltip-zh">{{ entry.chinese }}</span>
        </span>
        <span class="ddia-g-tooltip-def">{{ entry.shortDef }}</span>
        <span class="ddia-g-tooltip-cta-row">
          <span class="ddia-g-tooltip-cta-btn">
            <span class="ddia-g-arrow">→</span>
            {{ isTouch ? '再點一次跳詞彙表' : '看完整定義' }}
          </span>
          <span v-if="entry.chapter" class="ddia-g-tooltip-chapter">
            ↗ 對應章節
          </span>
        </span>
      </span>
    </Transition>
  </a>
</template>

<script setup lang="ts">
// 詞彙連結化元件：用法 <G term="quorum">法定人數</G>
// - 桌面：hover 顯示精簡定義、點擊跳 /glossary#<slug>
// - 觸控裝置：第一次點顯示 tooltip、第二次點跳轉；點外部關閉
// - 資料 SSOT：docs/.vitepress/data/glossary.ts
// - term 找不到時退化為純文字 + 橘色虛線（提醒作者）—— 不阻擋頁面渲染
import { computed, ref, onMounted, onUnmounted, useId } from 'vue'
import { withBase } from 'vitepress'
import { findTerm } from '../../data/glossary'

const props = defineProps<{ term: string }>()

const entry = computed(() => findTerm(props.term))
// withBase 處理部署到子路徑（GitHub Pages /ddia-zh/）時的 base 前綴；hard-code 絕對路徑會在 Pages 上 404
const glossaryHref = computed(() => entry.value ? withBase(`/glossary/#${entry.value.slug}`) : undefined)
const show = ref(false)
const isTouch = ref(false)
const anchorRef = ref<HTMLAnchorElement | null>(null)
// useId 保證同一頁多個同 term 的 <G> 元件不會撞 id（修 a11y bug：違反 HTML id 唯一性）
const tooltipId = `ddia-g-tt-${useId()}`

function onHover(visible: boolean) {
  if (isTouch.value) return  // 觸控模式不依賴 hover
  show.value = visible
}

function onClick(e: MouseEvent) {
  if (!isTouch.value) return  // 桌面：保持原本連結行為
  if (!show.value) {
    e.preventDefault()  // 第一次點：開 tooltip 不跳轉
    show.value = true
  }
  // 第二次點 (show=true)：不擋預設，瀏覽器跳 href
}

function onDocClick(e: MouseEvent) {
  if (!show.value || !anchorRef.value) return
  if (!anchorRef.value.contains(e.target as Node)) {
    show.value = false
  }
}

onMounted(() => {
  // 偵測觸控裝置：無 hover 能力（更可靠，比 'ontouchstart' 對混合裝置友善）
  isTouch.value = window.matchMedia('(hover: none)').matches
  document.addEventListener('click', onDocClick, true)
})
onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', onDocClick, true)
  }
})
</script>

<style scoped>
/* Editorial 詞彙連結：dotted underline + tooltip 書頁譯註樣式 */
.ddia-g {
  position: relative;
  display: inline;
  color: inherit;
  text-decoration: none;
  border-bottom: 1px dotted var(--accent-500);
  cursor: help;
  padding-bottom: 1px;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.ddia-g:hover, .ddia-g:focus-visible {
  background-color: var(--accent-tint-soft);
  border-bottom-style: solid;
  /* 不再 outline: none — :focus-visible 由 base.css 全域 outline 處理 */
}

.ddia-g-missing {
  background: var(--warning-bg);
  border-bottom: 1px dashed var(--warning-fg);
  cursor: help;
}

.ddia-g-tooltip {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(100% + var(--space-2-5));
  z-index: 50;
  width: max-content;
  max-width: min(320px, 90vw);
  padding: var(--space-2-5) var(--space-3);
  background: var(--bg-surface);
  border: 0;
  border-top: 1px solid var(--rule-hairline);
  border-bottom: 1px solid var(--rule-hairline);
  border-radius: 0;
  box-shadow: 0 8px 24px -8px rgba(28, 26, 23, 0.18);
  font-family: var(--font-body);
  font-size: var(--type-small-tight);
  line-height: 1.65;
  color: var(--text-primary);
  text-align: left;
  white-space: normal;
  pointer-events: auto;
}

.ddia-g-tooltip-head {
  display: flex;
  gap: var(--space-2);
  align-items: baseline;
  margin-bottom: var(--space-1-5);
  padding-bottom: var(--space-1-5);
  border-bottom: 1px solid var(--border-default);
}
.ddia-g-tooltip-en {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: var(--type-eyebrow);
  color: var(--mark-fg);
}
.ddia-g-tooltip-zh {
  font-family: var(--font-display);
  font-size: var(--type-eyebrow);
  color: var(--text-tertiary);
  letter-spacing: var(--ls-loose);
}
.ddia-g-tooltip-def {
  display: block;
  font-size: var(--type-small-tight);
}
.ddia-g-tooltip-cta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: var(--space-2-5);
  padding-top: var(--space-2);
  border-top: 1px dotted var(--border-default);
}
.ddia-g-tooltip-cta-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 1px 0;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--accent-500);
  border-radius: 0;
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-section-tight);
  font-size: var(--type-eyebrow);
  font-weight: 600;
  letter-spacing: var(--ls-loose);
  color: var(--accent-500);
}
.ddia-g-arrow {
  font-weight: 700;
}
.ddia-g-tooltip-chapter {
  font-family: var(--font-display);
  font-size: var(--type-mini);
  color: var(--text-tertiary);
  white-space: nowrap;
  letter-spacing: var(--ls-loose);
}
:global(.dark) .ddia-g-tooltip-cta-btn {
  color: var(--brand-fg);
  border-bottom-color: var(--brand-fg);
}

.ddia-g-fade-enter-active, .ddia-g-fade-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.ddia-g-fade-enter-from, .ddia-g-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(2px);
}

:global(.dark) .ddia-g-tooltip {
  background: var(--bg-surface);
  border-top-color: var(--rule-hairline);
  border-bottom-color: var(--rule-hairline);
  color: var(--text-primary);
}
:global(.dark) .ddia-g {
  border-bottom-color: var(--brand-fg);
}
:global(.dark) .ddia-g:hover, :global(.dark) .ddia-g:focus-visible {
  background-color: rgba(227, 160, 106, 0.12);
}
:global(.dark) .ddia-g-tooltip-en {
  color: var(--brand-fg);
}
</style>

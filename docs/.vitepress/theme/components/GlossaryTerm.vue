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
.ddia-g {
  position: relative;
  display: inline;
  color: inherit;
  text-decoration: none;
  border-bottom: 1px dotted var(--brand-500, #2F4A80);
  cursor: help;
  padding-bottom: 1px;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.ddia-g:hover, .ddia-g:focus-visible {
  background-color: color-mix(in srgb, var(--brand-500, #2F4A80) 8%, transparent);
  border-bottom-style: solid;
  outline: none;
}

.ddia-g-missing {
  background: color-mix(in srgb, orange 15%, transparent);
  border-bottom: 1px dashed orange;
  cursor: help;
}

.ddia-g-tooltip {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(100% + 8px);
  z-index: 50;
  width: max-content;
  max-width: min(320px, 90vw);
  padding: 10px 12px;
  background: var(--vp-c-bg-soft, #f6f6f7);
  border: 1px solid var(--vp-c-divider, #e2e2e3);
  border-radius: 10px;
  box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.18);
  font-size: 13px;
  line-height: 1.55;
  color: var(--vp-c-text-1, #213547);
  text-align: left;
  white-space: normal;
  pointer-events: none;
}

.ddia-g-tooltip-head {
  display: flex;
  gap: 6px;
  align-items: baseline;
  margin-bottom: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--vp-c-divider, #e2e2e3);
}
.ddia-g-tooltip-en {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 600;
  font-size: 12px;
  color: var(--brand-500, #2F4A80);
}
.ddia-g-tooltip-zh {
  font-size: 12px;
  color: var(--vp-c-text-2, #5c6066);
}
.ddia-g-tooltip-def {
  display: block;
  font-size: 13px;
}
.ddia-g-tooltip-cta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--vp-c-divider, #e2e2e3);
}
.ddia-g-tooltip-cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: color-mix(in srgb, var(--brand-500, #2F4A80) 12%, transparent);
  border-radius: 4px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--brand-500, #2F4A80);
}
.ddia-g-arrow {
  font-weight: 700;
}
.ddia-g-tooltip-chapter {
  font-size: 10.5px;
  color: var(--vp-c-text-3, #999);
  white-space: nowrap;
}
:global(.dark) .ddia-g-tooltip-cta-btn {
  background: color-mix(in srgb, var(--brand-300, #7E93BE) 18%, transparent);
  color: var(--brand-300, #7E93BE);
}

.ddia-g-fade-enter-active, .ddia-g-fade-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.ddia-g-fade-enter-from, .ddia-g-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(2px);
}

/* 暗色模式 */
:global(.dark) .ddia-g-tooltip {
  background: var(--vp-c-bg-elv, #202127);
  border-color: var(--vp-c-divider, #2e2e32);
  color: var(--vp-c-text-1, #dfdfd6);
}
:global(.dark) .ddia-g {
  border-bottom-color: color-mix(in srgb, var(--brand-500, #2F4A80) 70%, white);
}
:global(.dark) .ddia-g:hover, :global(.dark) .ddia-g:focus-visible {
  background-color: color-mix(in srgb, var(--brand-500, #2F4A80) 25%, transparent);
}
</style>

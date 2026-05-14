<template>
  <span v-if="!entry" class="ddia-g-missing" :title="`詞彙表未收錄：${term}`">
    <slot>{{ term }}</slot>
  </span>
  <a v-else
     ref="anchorRef"
     :href="glossaryHref"
     class="ddia-g"
     :aria-describedby="show ? tooltipId : undefined"
     @mouseenter="onHover(true)"
     @mouseleave="onHover(false)"
     @focus="onFocus"
     @blur="show = false"
     @click="onClick">
    <slot>{{ entry.chinese }}</slot>
  </a>
  <!-- P1-18 Wave 42：tooltip Teleport 到 body — 修 ARIA APG 慣例：tooltip 不該嵌在 anchor 內
       原本 NVDA + Firefox 會把整塊（anchor + tooltip 內容）朗讀一次、體驗破壞
       R3-P0-C Wave 42.3：teleport SSR 期 body 不存在 → 用 :disabled="!mounted" 跳過 SSR 階段、
       避免 build 時 hydration mismatch；mounted 後才實際 teleport 到 body -->
  <Teleport v-if="entry" to="body" :disabled="!mounted">
    <Transition name="ddia-g-fade">
      <span v-if="show"
            :id="tooltipId"
            class="ddia-g-tooltip"
            role="tooltip"
            :style="tooltipStyle"
            @mouseenter="onHover(true)"
            @mouseleave="onHover(false)">
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
  </Teleport>
</template>

<script setup lang="ts">
// 詞彙連結化元件：用法 <G term="quorum">法定人數</G>
// - 桌面：hover 顯示精簡定義、點擊跳 /glossary#<slug>
// - 觸控裝置：第一次點顯示 tooltip、第二次點跳轉；點外部關閉
// - 資料 SSOT：docs/.vitepress/data/glossary.ts
// - term 找不到時退化為純文字 + 橘色虛線（提醒作者）—— 不阻擋頁面渲染
import { computed, ref, onMounted, onUnmounted, useId, nextTick } from 'vue'
import { withBase } from 'vitepress'
import { findTerm } from '../../data/glossary'

const props = defineProps<{ term: string }>()

const entry = computed(() => findTerm(props.term))
// withBase 處理部署到子路徑（GitHub Pages /ddia-zh/）時的 base 前綴；hard-code 絕對路徑會在 Pages 上 404
const glossaryHref = computed(() => entry.value ? withBase(`/glossary/#${entry.value.slug}`) : undefined)
const show = ref(false)
const isTouch = ref(false)
const mounted = ref(false)  // R3-P0-C：Teleport SSR safe — 只在 client 後啟用
const anchorRef = ref<HTMLAnchorElement | null>(null)
// useId 保證同一頁多個同 term 的 <G> 元件不會撞 id（修 a11y bug：違反 HTML id 唯一性）
const tooltipId = `ddia-g-tt-${useId()}`

// P1-18 Wave 42：tooltip 被 teleport 到 body 後 — 用 fixed positioning + anchor.getBoundingClientRect
// 每次 show 變 true 時重算 top/left；scroll 期間透明、scroll 結束才更新（避免 jank）
const tooltipStyle = ref<Record<string, string>>({})
async function updateTooltipPosition() {
  await nextTick()
  if (!anchorRef.value) return
  const r = anchorRef.value.getBoundingClientRect()
  // tooltip 預設居中於 anchor 上方、距離 anchor 12px
  // 之後若 viewport 邊界調整：max-width 已設、translate-X 控置中
  tooltipStyle.value = {
    position: 'fixed',
    top: `${r.top - 12}px`,           // tooltip 底部對齊 anchor top - 12px gap
    left: `${r.left + r.width / 2}px`,
    transform: 'translate(-50%, -100%)'
  }
}

function onHover(visible: boolean) {
  if (isTouch.value) return
  show.value = visible
  if (visible) updateTooltipPosition()
}

function onFocus() {
  show.value = true
  updateTooltipPosition()
}

function onClick(e: MouseEvent) {
  if (!isTouch.value) return
  if (!show.value) {
    e.preventDefault()
    show.value = true
    updateTooltipPosition()
  }
}

function onDocClick(e: MouseEvent) {
  if (!show.value || !anchorRef.value) return
  if (!anchorRef.value.contains(e.target as Node)) {
    show.value = false
  }
}

function onScroll() {
  // R3-P1-7 Wave 42.3：原本 scroll 立刻隱藏太激進、讀者微滾就要重 hover
  // 改成 scroll 期間重新定位（fixed 本來就跟 viewport、只要重算 anchor rect）
  if (show.value) updateTooltipPosition()
}

onMounted(() => {
  mounted.value = true  // R3-P0-C：teleport `:disabled="!mounted"` 解除
  isTouch.value = window.matchMedia('(hover: none)').matches
  document.addEventListener('click', onDocClick, true)
  window.addEventListener('scroll', onScroll, { passive: true })
})
onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', onDocClick, true)
    window.removeEventListener('scroll', onScroll)
  }
})
</script>

<style scoped>
/* Editorial 詞彙連結：dotted underline + tooltip 書頁譯註樣式
   P1-18：tooltip 改 teleport 到 body，anchor 不再需要 position: relative */
.ddia-g {
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

/* P1-18 Wave 42：tooltip 被 teleport 到 body、位置由 inline style 控（fixed + 動態 top/left）
   這裡只保留外觀規則、不再寫 absolute / left:50% 等定位（會與 inline style fixed 打架） */
.ddia-g-tooltip {
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

/* P1-18：teleport 後 fade transition 不該重設 transform（會覆蓋 inline 的 translate）
   只 fade opacity 即可、定位完全交給 inline style */
.ddia-g-fade-enter-active, .ddia-g-fade-leave-active {
  transition: opacity 0.12s ease;
}
.ddia-g-fade-enter-from, .ddia-g-fade-leave-to {
  opacity: 0;
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
</style>

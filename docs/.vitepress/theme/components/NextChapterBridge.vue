<template>
  <a v-if="resolvedHref" :href="resolvedHref" class="ddia-bridge">
    <div class="ddia-bridge-eyebrow">The Next Chapter</div>
    <div class="ddia-bridge-num" v-if="displayNum">{{ displayNum }}</div>
    <div class="ddia-bridge-title" v-if="displayTitle">{{ displayTitle }}</div>
    <p v-if="displayTeaser || hasSlotContent" class="ddia-bridge-teaser">
      <slot>{{ displayTeaser }}</slot>
    </p>
    <!-- P1-11 Wave 42：加預估時數 + 更明顯的 continue CTA — 章末瘦身後 Bridge 變主元件、需更穩重 -->
    <div v-if="displayReadTime" class="ddia-bridge-meta">
      <span class="ddia-bridge-meta-time">預估 {{ displayReadTime }} 分鐘</span>
    </div>
    <div class="ddia-bridge-cta">
      <span class="ddia-bridge-cta-text">Continue Reading</span>
      <span class="ddia-bridge-cta-arrow">→</span>
    </div>
    <div class="ddia-bridge-rule" aria-hidden="true" />
  </a>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { withBase } from 'vitepress'
import { CHAPTERS, PREREQUISITES, type Chapter } from '../../data/chapters'

// 兩種用法：
// 1. chapter-id 自動模式（推薦）：
//      <NextChapterBridge chapter-id="ch05" />
//    從 chapters.ts 拉下一章資訊；本章是 chapter-id 對應章、自動跳下一章。
// 2. 手動模式（向後相容、Part 概覽 / 自訂橋接時用）：
//      <NextChapterBridge next-link="/part-2/" next-title="Part II 分散式資料" />
//      <slot> 內可放自訂 teaser 文字 </slot>
const props = defineProps<{
  chapterId?: string           // 本章 id；下一章自動找
  nextLink?: string            // 手動 link
  nextTitle?: string           // 手動 title
}>()

const slots = useSlots()
const hasSlotContent = computed(() => !!slots.default?.())

const nextChap = computed<Chapter | undefined>(() => {
  if (!props.chapterId) return undefined
  // 主課 12 章序列
  const idx = CHAPTERS.findIndex(c => c.id === props.chapterId)
  if (idx >= 0 && idx < CHAPTERS.length - 1) return CHAPTERS[idx + 1]
  // Part 0 序列
  const pIdx = PREREQUISITES.findIndex(c => c.id === props.chapterId)
  if (pIdx >= 0 && pIdx < PREREQUISITES.length - 1) return PREREQUISITES[pIdx + 1]
  return undefined
})

const resolvedHref = computed(() => {
  const link = props.nextLink ?? nextChap.value?.link
  if (!link) return undefined
  if (/^https?:\/\//.test(link)) return link
  return withBase(link)
})

const displayNum = computed(() => nextChap.value?.num ?? '')
const displayTitle = computed(() => props.nextTitle ?? nextChap.value?.shortTitle ?? '')
// teaser 來自前一章（即 chapter-id 對應章）的 teaser 欄位——它寫的是「對下章的預告」
const currentChap = computed<Chapter | undefined>(() => {
  if (!props.chapterId) return undefined
  return [...CHAPTERS, ...PREREQUISITES].find(c => c.id === props.chapterId)
})
const displayTeaser = computed(() => currentChap.value?.teaser)
// P1-11：下一章的預估閱讀時間（從 chapters.ts SSOT 拉）—— 章末瘦身後 Bridge 主元件需更多資訊密度
const displayReadTime = computed(() => nextChap.value?.readTime)
</script>

<style scoped>
/* Editorial 章末橋接：書頁儀式 — dinkus + italic eyebrow + 章號 + 章名 + teaser
   整塊可點、不靠按鈕；觸發 hover 用左 3px 印記取代 lift shadow */
.ddia-bridge {
  display: block;
  margin: var(--space-5-5) 0 32px;
  padding: var(--space-4-5) 0 32px;
  text-align: center;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--rule-hairline);
  border-radius: 0;
  color: inherit;
  text-decoration: none;
  position: relative;
  transition: background-color 0.2s ease;
}
.ddia-bridge:hover {
  background-color: var(--bg-surface);
}
.ddia-bridge:active {
  background-color: var(--brand-tint-soft);  /* Wave 28d：按下瞬間壓凹 */
}
/* Wave 29d：自訂 :focus-visible 取代 base.css 全域 box-shadow、整塊 <a> 銳利環 */
.ddia-bridge:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
  box-shadow: none;
}
.ddia-bridge:hover .ddia-bridge-title {
  color: var(--mark-fg);
}

.ddia-bridge-eyebrow {
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-eyebrow-warm);
  font-style: italic;
  font-size: var(--type-eyebrow);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--ls-eyebrow);
  color: var(--text-tertiary);
  margin-bottom: var(--space-3);
  padding-left: 0.3em;
}

.ddia-bridge-num {
  font-family: var(--font-display);
  font-feature-settings: "onum" 1;
  font-variation-settings: "opsz" 48, "SOFT" 60, "wght" 500;
  font-size: var(--type-display-2);
  letter-spacing: var(--ls-eyebrow);
  color: var(--mark-fg);
  margin-bottom: var(--space-1-5);
  padding-left: 0.18em;
}

.ddia-bridge-title {
  font-family: var(--font-display);
  font-variation-settings: "opsz" 48, "SOFT" 70, "wght" 500;
  font-size: var(--type-h2);
  font-weight: 500;
  line-height: 1.25;
  color: var(--text-primary);
  margin: 0 0 var(--space-3);
  transition: color 0.2s ease;
  text-wrap: balance;
}

.ddia-bridge-teaser {
  margin: var(--space-1-5) auto 0;
  max-width: 38em;
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: var(--fvar-italic-note);
  font-size: var(--type-body-mid);
  line-height: 1.7;
  color: var(--text-secondary);
}

/* P1-11 Wave 42：read-time meta + 強化 CTA — 章末瘦身後 Bridge 是主元件，視覺重量需更穩重 */
.ddia-bridge-meta {
  margin-top: var(--space-2-5);
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-italic-warm);
  font-style: italic;
  font-size: var(--type-eyebrow);
  letter-spacing: var(--ls-eyebrow);
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.ddia-bridge-cta {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-2);
  margin: var(--space-4) auto 0;
  padding: var(--space-2) var(--space-4);
  /* Wave 44 border audit：Bridge CTA 改單線、不再框中框 */
  border-bottom: 1px solid var(--rule-hairline);
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-section-tight);
  font-weight: 600;
  font-size: var(--type-small);
  letter-spacing: var(--ls-eyebrow);
  text-transform: uppercase;
  color: var(--mark-fg);
  transition: color 0.2s ease, background-color 0.2s ease;
}
.ddia-bridge:hover .ddia-bridge-cta {
  background: var(--brand-tint-soft);
}
.ddia-bridge-cta-arrow {
  font-size: var(--type-body-mid);
  transition: transform 0.2s ease;
}
.ddia-bridge:hover .ddia-bridge-cta-arrow {
  transform: translateX(3px);
}

/* 底部 dinkus 細線：對應原本書頁段落收尾 */
.ddia-bridge-rule {
  height: 1px;
  background: var(--rule-hairline);
  margin: var(--space-4-5) auto 0;
  max-width: 6em;
}

@media (max-width: 640px) {
  .ddia-bridge { padding: 22px 0 var(--space-4); }
  .ddia-bridge-num { font-size: var(--type-h2-tight); }
  .ddia-bridge-title { font-size: var(--type-h2-tight); }
}
</style>

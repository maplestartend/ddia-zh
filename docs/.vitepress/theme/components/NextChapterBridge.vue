<template>
  <a v-if="resolvedHref" :href="resolvedHref" class="ddia-bridge">
    <div class="ddia-bridge-eyebrow">The Next Chapter</div>
    <div class="ddia-bridge-num" v-if="displayNum">{{ displayNum }}</div>
    <div class="ddia-bridge-title" v-if="displayTitle">{{ displayTitle }}</div>
    <p v-if="displayTeaser || hasSlotContent" class="ddia-bridge-teaser">
      <slot>{{ displayTeaser }}</slot>
    </p>
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
</script>

<style scoped>
/* Editorial 章末橋接：書頁儀式 — dinkus + italic eyebrow + 章號 + 章名 + teaser
   整塊可點、不靠按鈕；觸發 hover 用左 3px 印記取代 lift shadow */
.ddia-bridge {
  display: block;
  margin: 56px 0 32px;
  padding: 28px 0 32px;
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
.ddia-bridge:hover .ddia-bridge-title {
  color: var(--brand-500);
}
:global(.dark) .ddia-bridge:hover .ddia-bridge-title {
  color: var(--info-fg);
}

.ddia-bridge-eyebrow {
  font-family: var(--font-display);
  font-variation-settings: "opsz" 24, "SOFT" 60, "wght" 500;
  font-style: italic;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.32em;
  color: var(--text-tertiary);
  margin-bottom: 14px;
  padding-left: 0.3em;
}

.ddia-bridge-num {
  font-family: var(--font-display);
  font-feature-settings: "onum" 1;
  font-variation-settings: "opsz" 48, "SOFT" 60, "wght" 500;
  font-size: 28px;
  letter-spacing: 0.18em;
  color: var(--brand-500);
  margin-bottom: 6px;
  padding-left: 0.18em;
}
:global(.dark) .ddia-bridge-num {
  color: var(--info-fg);
}

.ddia-bridge-title {
  font-family: var(--font-display);
  font-variation-settings: "opsz" 48, "SOFT" 70, "wght" 500;
  font-size: 26px;
  font-weight: 500;
  line-height: 1.25;
  color: var(--text-primary);
  margin: 0 0 14px;
  transition: color 0.2s ease;
  text-wrap: balance;
}

.ddia-bridge-teaser {
  margin: 6px auto 0;
  max-width: 38em;
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: "opsz" 24, "SOFT" 50, "wght" 400;
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.ddia-bridge-rule {
  height: 1px;
  background: var(--rule-hairline);
  margin: 28px auto 0;
  max-width: 6em;
}

@media (max-width: 640px) {
  .ddia-bridge { padding: 22px 0 24px; }
  .ddia-bridge-num { font-size: 22px; }
  .ddia-bridge-title { font-size: 22px; }
}
</style>

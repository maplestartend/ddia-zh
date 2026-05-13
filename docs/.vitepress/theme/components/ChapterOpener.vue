<template>
  <header class="ddia-chapter-opener">
    <div class="ddia-chapter-opener-mark">{{ displayNum }}</div>
    <div class="ddia-chapter-opener-eyebrow">{{ displayEyebrow }}</div>
    <h1 class="ddia-chapter-opener-title">{{ displayTitle }}</h1>
    <blockquote v-if="displayEpigraph" class="ddia-chapter-opener-epigraph">
      <p class="ddia-chapter-opener-quote">{{ displayEpigraph }}</p>
      <cite v-if="displayEpigraphSource" class="ddia-chapter-opener-cite">— {{ displayEpigraphSource }}</cite>
    </blockquote>
    <div class="ddia-chapter-opener-rule" />
  </header>
</template>

<script setup lang="ts">
// Editorial 章首儀式元件：大號章節編號 + italic eyebrow + 章名 + （可選）引言
// 兩種用法：
// 1. 以 chapter-id 自動帶（推薦）：
//      <ChapterOpener chapter-id="ch05" />
//    從 chapters.ts 拉 num / shortTitle / epigraph / epigraphSource。
// 2. 手動覆寫（特殊章首、Part 概覽等）：
//      <ChapterOpener num="V" eyebrow="Chapter · Five" title="..." epigraph="..." />
//    手動 prop 覆寫自動值。
//
// 用在章節 markdown 檔最上方，**取代原本的 h1**（不要重複）。
import { computed, onMounted } from 'vue'
import { CHAPTERS, PREREQUISITES, PARTS, type Chapter } from '../../data/chapters'

// F3 lastVisited 紀錄：本元件在每章首掛載、記錄使用者最近進的章節，給 Dashboard
// 用「繼續 · ChXX」顯示。比起原本「找下一個未讀章節」更誠實——使用者可能讀到中段就關掉。
const LAST_VISITED_KEY = 'ddia-last-visited'

const props = defineProps<{
  chapterId?: string           // 自動模式：'ch05' / 'p0-os' 對映 chapters.ts
  num?: string                 // 手動覆寫：「V」「12」「0.3」都行
  eyebrow?: string             // 手動覆寫 eyebrow 行
  title?: string               // 手動覆寫章名
  epigraph?: string
  epigraphSource?: string
}>()

const resolved = computed<Chapter | undefined>(() => {
  if (!props.chapterId) return undefined
  return [...CHAPTERS, ...PREREQUISITES].find(c => c.id === props.chapterId)
})

const displayNum = computed(() => props.num ?? resolved.value?.num ?? '')
const displayTitle = computed(() => props.title ?? resolved.value?.shortTitle ?? '')
const displayEyebrow = computed(() => {
  if (props.eyebrow) return props.eyebrow
  const ch = resolved.value
  if (!ch) return ''
  return PARTS[ch.part]?.title ?? ''
})
const displayEpigraph = computed(() => props.epigraph ?? resolved.value?.epigraph)
const displayEpigraphSource = computed(() =>
  props.epigraphSource ?? resolved.value?.epigraphSource
)

onMounted(() => {
  // 只在 chapter-id 自動模式記錄；手動模式（Part 概覽等）不算章節閱讀
  if (!props.chapterId) return
  try {
    localStorage.setItem(LAST_VISITED_KEY, JSON.stringify({
      chapterId: props.chapterId,
      at: Date.now()
    }))
  } catch { /* quota / 私密模式 ignore */ }
})
</script>

<style scoped>
.ddia-chapter-opener {
  margin: var(--space-4) 0 48px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--rule-hairline);
  text-align: left;
}

/* 章節編號：Fraunces SemiBold + oldstyle figures
   字級從 96px 改 56px——書頁慣例「章名 > 章號」，原 96px > 章名 42px 是階層倒置 */
.ddia-chapter-opener-mark {
  font-family: var(--font-display);
  font-feature-settings: "onum" 1, "kern" 1;
  font-variation-settings: "opsz" 48, "SOFT" 60, "wght" 500;
  font-size: var(--type-chapter-mark);
  line-height: 1;
  color: var(--brand-fg);
  letter-spacing: -0.005em;
  margin-bottom: var(--space-2);
}

.ddia-chapter-opener-eyebrow {
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: var(--fvar-eyebrow-warm);
  font-size: 13px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--ls-eyebrow);
  color: var(--text-tertiary);
  margin-bottom: 18px;
}

.ddia-chapter-opener-title {
  font-family: var(--font-display);
  font-feature-settings: "onum" 1, "kern" 1, "calt" 1;
  font-variation-settings: "opsz" 72, "SOFT" 70, "wght" 500;
  font-size: var(--type-h1);
  font-weight: 500;
  line-height: 1.18;
  letter-spacing: -0.008em;
  color: var(--text-primary);
  margin: 0 0 var(--space-4);
  text-wrap: balance;
  /* override base.css 的 h1 規則 — 不要重複底部 hairline rule */
  border-bottom: 0;
  padding-bottom: 0;
}

.ddia-chapter-opener-epigraph {
  margin: 28px 0 0;
  padding: 6px 0 6px var(--space-4);
  border: 0;
  border-left: 3px solid var(--rule-hairline);
  background: transparent;
}
.ddia-chapter-opener-quote {
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: "opsz" 48, "SOFT" 60, "wght" 400;
  font-size: 17px;
  line-height: 1.7;
  color: var(--text-secondary);
  margin: 0 0 var(--space-2);
}
.ddia-chapter-opener-cite {
  display: block;
  font-family: var(--font-display);
  font-style: normal;
  font-variation-settings: var(--fvar-section-mid);
  font-size: 12.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.dark .ddia-chapter-opener-mark {
  color: var(--brand-fg);   /* dark = 暖橙 brand 替身、非 info-fg 米咖 */
}

@media (max-width: 640px) {
  .ddia-chapter-opener-mark { font-size: 28px; }
  .ddia-chapter-opener-title { font-size: var(--type-display-2); }
}
</style>

<template>
  <!-- W43-6 Wave 43：章節頁專用 floating 進度 chip（捲過章首後右上角浮現）-->
  <ChapterFloatingProgress />
  <header class="ddia-chapter-opener">
    <div class="ddia-chapter-opener-mark">{{ displayNum }}</div>
    <div class="ddia-chapter-opener-eyebrow">{{ displayEyebrow }}</div>
    <h1 class="ddia-chapter-opener-title">{{ displayTitle }}</h1>
    <blockquote v-if="displayEpigraph" class="ddia-chapter-opener-epigraph">
      <p class="ddia-chapter-opener-quote">{{ displayEpigraph }}</p>
      <cite v-if="displayEpigraphSource" class="ddia-chapter-opener-cite">— {{ displayEpigraphSource }}</cite>
    </blockquote>

    <!-- 整本進度條：UX P0 #2 — 章首顯眼處讓讀者知道「我在哪 / 還剩多遠」
         只主課程 12 章顯示（Part 0 是選讀補強、不計入主進度） -->
    <div v-if="progressBar" class="ddia-opener-progress" :aria-label="`第 ${progressBar.idx} 章 / 共 ${progressBar.total} 章；整本已讀 ${progressBar.donePct}%`">
      <div class="ddia-opener-progress-meta">
        <span class="ddia-opener-progress-pos">Ch <strong>{{ progressBar.idx }}</strong> / {{ progressBar.total }}</span>
        <span class="ddia-opener-progress-dot">·</span>
        <span class="ddia-opener-progress-overall">整本已讀 <strong>{{ progressBar.donePct }}%</strong>（{{ progressBar.doneCount }} / {{ progressBar.total }}）</span>
      </div>
      <div class="ddia-opener-progress-track">
        <div class="ddia-opener-progress-fill" :style="{ width: progressBar.donePct + '%' }" />
        <div class="ddia-opener-progress-marker" :style="{ left: progressBar.posPct + '%' }" :title="`你在這裡：Ch ${progressBar.idx}`" />
      </div>
    </div>

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
import { CHAPTERS, PREREQUISITES, PARTS, TOTAL_CHAPTERS, type Chapter } from '../../data/chapters'
import { useProgress } from '../../composables/useProgress'
import ChapterFloatingProgress from './ChapterFloatingProgress.vue'

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

// 整本進度條資料：只主課程 12 章（ch01-ch12）顯示
// - idx: 當前章在 12 章內的位置（1-based）
// - donePct: 整本已讀百分比（reactive、響應 markDone/unmarkDone）
// - posPct: 「你在這裡」marker 的水平位置（idx / total * 100）
const { doneCount } = useProgress()
const progressBar = computed(() => {
  if (!props.chapterId) return null
  const idx = CHAPTERS.findIndex(c => c.id === props.chapterId)
  if (idx < 0) return null  // Part 0 章節（PREREQUISITES）不算主進度
  const oneBased = idx + 1
  return {
    idx: oneBased,
    total: TOTAL_CHAPTERS,
    doneCount: doneCount.value,
    donePct: Math.round((doneCount.value / TOTAL_CHAPTERS) * 100),
    posPct: Math.round((oneBased / TOTAL_CHAPTERS) * 100)
  }
})

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
  padding-bottom: var(--space-4-5);
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
  font-size: var(--type-small-tight);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--ls-eyebrow);
  color: var(--text-tertiary);
  margin-bottom: var(--space-3-5);
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
  margin: var(--space-4-5) 0 0;
  padding: 6px 0 6px var(--space-4);
  border: 0;
  border-left: 3px solid var(--rule-hairline);
  background: transparent;
}
.ddia-chapter-opener-quote {
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: "opsz" 48, "SOFT" 60, "wght" 400;
  font-size: var(--type-section);
  line-height: 1.7;
  color: var(--text-secondary);
  margin: 0 0 var(--space-2);
}
.ddia-chapter-opener-cite {
  display: block;
  font-family: var(--font-display);
  font-style: normal;
  font-variation-settings: var(--fvar-section-mid);
  font-size: var(--type-meta);
  letter-spacing: var(--ls-eyebrow);
  text-transform: uppercase;
  color: var(--text-tertiary);
}

/* 整本進度條：書脊書籤的 Editorial 詮釋——髮絲線軌、mahogany 已讀、accent ▾ 標目前位置
   R3-P0-E Wave 42.3：視覺權重升一階——track 從 4px 拉到 6px、上下加 hairline 框、字級從 eyebrow→small */
.ddia-opener-progress {
  margin-top: var(--space-4-5);
  padding: var(--space-3) 0;
  border-top: 1px solid var(--rule-hairline);
  /* Wave 44 border audit：刪 border-bottom、章首 progress band 由下方 ChapterMeta 接 border-top */
}
.ddia-opener-progress-meta {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: var(--space-2-5);
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-italic-warm);
  font-style: italic;
  font-size: var(--type-small);
  letter-spacing: var(--ls-loose);
  text-transform: uppercase;
  color: var(--text-secondary);
}
.ddia-opener-progress-pos strong,
.ddia-opener-progress-overall strong {
  font-style: normal;
  font-variation-settings: var(--fvar-section-tight);
  font-feature-settings: "onum" 1;
  color: var(--text-primary);
  letter-spacing: 0;
}
.ddia-opener-progress-dot {
  color: var(--rule-hairline);
}
.ddia-opener-progress-overall {
  margin-left: auto;
  text-transform: none;
}
.ddia-opener-progress-track {
  position: relative;
  height: 6px;
  background: var(--bg-subtle);
  overflow: visible;
}
.ddia-opener-progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--brand-500);
  transition: width 0.3s ease;
}
.ddia-opener-progress-marker {
  position: absolute;
  top: -4px;
  width: 3px;
  height: 14px;
  background: var(--accent-500);
  transform: translateX(-1.5px);
}
.ddia-opener-progress-marker::after {
  content: "▾";
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px; /* lint-typography-allow: ▾ marker 字級、視覺刻意小於 eyebrow 12px 不破壞主階層 */
  color: var(--accent-500);
  line-height: 1;
}

@media (max-width: 640px) {
  .ddia-chapter-opener-mark { font-size: var(--type-display-2); }
  .ddia-chapter-opener-title { font-size: var(--type-display-2); }
  .ddia-opener-progress-meta { flex-wrap: wrap; }
  .ddia-opener-progress-overall { margin-left: 0; width: 100%; }
}
</style>

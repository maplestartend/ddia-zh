<template>
  <Teleport to="body" :disabled="!mounted">
    <Transition name="ddia-floating-progress-fade">
      <div v-if="mounted && show && chapter" class="ddia-floating-progress" role="status" aria-live="polite">
        <a :href="withBase('/progress')" class="ddia-floating-progress-link" aria-label="跳到我的進度頁">
          <span class="ddia-floating-progress-mark">Ch</span>
          <span class="ddia-floating-progress-num">{{ chapter.idx }}</span>
          <span class="ddia-floating-progress-sep">/</span>
          <span class="ddia-floating-progress-total">{{ chapter.total }}</span>
        </a>
        <div class="ddia-floating-progress-bar">
          <div class="ddia-floating-progress-fill" :style="{ width: chapter.donePct + '%' }" />
        </div>
        <div class="ddia-floating-progress-meta">整本已讀 <strong>{{ chapter.donePct }}%</strong></div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
// W43-6 Wave 43：章節頁專用 floating 進度 chip
// - 自動依當前 URL 偵測是否在主課程章節頁（ch01-ch12）
// - 捲動超過 280px（章首 ChapterOpener 已捲離畫面）才顯示
// - 點擊跳「我的進度」頁
// - 整套用 Teleport 到 body、避免被章節頁的 max-width container 截斷
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { withBase } from 'vitepress'
import { CHAPTERS, TOTAL_CHAPTERS } from '../../data/chapters'
import { useProgress } from '../../composables/useProgress'

const { doneCount } = useProgress()
const mounted = ref(false)
const show = ref(false)
const currentPath = ref<string>('')

const chapter = computed(() => {
  // 只對主課程 ch01-ch12 顯示；Part 0 / 工具頁不顯示
  const m = currentPath.value.match(/\/part-[123]\/(ch\d{2})-/)
  if (!m) return null
  const id = m[1]
  const idx = CHAPTERS.findIndex(c => c.id === id)
  if (idx < 0) return null
  return {
    idx: idx + 1,
    total: TOTAL_CHAPTERS,
    donePct: Math.round((doneCount.value / TOTAL_CHAPTERS) * 100)
  }
})

function updateOnScroll() {
  show.value = window.scrollY > 280
}

function updatePath() {
  currentPath.value = window.location.pathname
}

onMounted(() => {
  mounted.value = true
  updatePath()
  updateOnScroll()
  window.addEventListener('scroll', updateOnScroll, { passive: true })
  // SPA route change → 重抓 path（VitePress 不會重 mount 全頁、但 URL 變了）
  window.addEventListener('popstate', updatePath)
  // 用 MutationObserver 兜底（title 變化代表頁面切了）
  if (typeof MutationObserver !== 'undefined') {
    const ob = new MutationObserver(updatePath)
    const titleEl = document.querySelector('title')
    if (titleEl) ob.observe(titleEl, { childList: true })
    onUnmounted(() => ob.disconnect())
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateOnScroll)
  window.removeEventListener('popstate', updatePath)
})
</script>

<style scoped>
.ddia-floating-progress {
  position: fixed;
  top: calc(var(--vp-nav-height, 64px) + 16px);
  right: 24px;
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-surface);
  border-top: 1px solid var(--rule-hairline);
  border-bottom: 1px solid var(--rule-hairline);
  box-shadow: 0 4px 12px -6px rgba(28, 26, 23, 0.12);
  font-family: var(--font-display);
  pointer-events: auto;
}
.ddia-floating-progress-link {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  text-decoration: none;
  color: var(--text-primary);
}
.ddia-floating-progress-mark {
  font-variation-settings: var(--fvar-italic-warm);
  font-style: italic;
  font-size: var(--type-eyebrow);
  letter-spacing: var(--ls-eyebrow);
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin-right: var(--space-1);
}
.ddia-floating-progress-num {
  font-variation-settings: var(--fvar-section-tight);
  font-feature-settings: "onum" 1;
  font-size: var(--type-body-lg);
  color: var(--mark-fg);
  letter-spacing: 0;
}
.ddia-floating-progress-sep {
  color: var(--text-tertiary);
  margin: 0 1px;
}
.ddia-floating-progress-total {
  font-feature-settings: "onum" 1;
  font-size: var(--type-small);
  color: var(--text-secondary);
}
.ddia-floating-progress-bar {
  position: relative;
  width: 100%;
  height: 3px;
  background: var(--bg-subtle);
}
.ddia-floating-progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--brand-500);
  transition: width 0.3s ease;
}
.ddia-floating-progress-meta {
  font-variation-settings: var(--fvar-italic-warm);
  font-style: italic;
  font-size: var(--type-eyebrow);
  letter-spacing: var(--ls-loose);
  color: var(--text-tertiary);
}
.ddia-floating-progress-meta strong {
  font-style: normal;
  font-variation-settings: var(--fvar-section-tight);
  font-feature-settings: "onum" 1;
  color: var(--text-secondary);
}

.ddia-floating-progress-fade-enter-active,
.ddia-floating-progress-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.ddia-floating-progress-fade-enter-from,
.ddia-floating-progress-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 1024px) {
  .ddia-floating-progress { display: none; }
}
</style>

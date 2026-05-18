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
// W43：章節頁專用 floating 進度 chip — Teleport 到 body 避免被 max-width 截斷
// W48：改用 VitePress useRoute() 取代 popstate + MutationObserver hack（reviewer #2 Vue Architect）
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, withBase } from 'vitepress'
import { CHAPTERS, TOTAL_CHAPTERS } from '../../data/chapters'
import { useProgress } from '../../composables/useProgress'

const { doneCount } = useProgress()
const route = useRoute()
const mounted = ref(false)
const show = ref(false)

const chapter = computed(() => {
  // 只對主課程 ch01-ch12 顯示；Part 0 / 工具頁不顯示
  const m = route.path.match(/\/part-[123]\/(ch\d{2})-/)
  if (!m) return null
  const idx = CHAPTERS.findIndex(c => c.id === m[1])
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

onMounted(() => {
  mounted.value = true
  updateOnScroll()
  window.addEventListener('scroll', updateOnScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateOnScroll)
})
</script>

<style scoped>
.ddia-floating-progress {
  /* W46：原本固定在右上方會跟 VitePress aside (TOC) 競爭；
     改成右下角浮現，跟 TOC 物理上分離，閱讀時不擋資訊 */
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-surface);
  /* Wave 44 border audit：浮動 chip 已有 shadow + bg、雙線過重、只留 bottom */
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
  transform: translateY(6px);
}

/* W52：原 max-width: 1024 把 1024 寬度也隱藏（CLAUDE.md 寫 ≥1024 才顯示、實際是 ≤1024 全藏含 1024）
   改 max-width: 1023 — 1024 桌面寬度恰好顯示、≤1023 平板手機隱藏 */
@media (max-width: 1023px) {
  .ddia-floating-progress { display: none; }
}
</style>

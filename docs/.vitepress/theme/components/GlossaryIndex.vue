<template>
  <!-- 偵測不到字母（H2 改格式或 hydrate 還沒完成）就整個不渲染，避免空 sticky bar 佔位 -->
  <div v-if="letters.length > 0" class="ddia-glossary-index">
    <div class="ddia-glossary-index-label">
      <Icon name="bookmarks" :size="14" />
      <span>跳到字母</span>
    </div>
    <a v-for="letter in letters"
       :key="letter"
       :href="`#${letter.toLowerCase()}`"
       class="ddia-glossary-index-link"
       @click="scrollToLetter(letter, $event)">
      {{ letter }}
    </a>
  </div>
</template>

<script setup lang="ts">
// 詞彙表 A-Z sticky 索引條：點擊跳到對應字母區。
// 字母清單從 H2 標題動態偵測（避免硬寫死、避免新增字母時要改兩處）。
// 失敗（H2 改格式 / hydrate 還沒完成）時整個隱藏，不留空條。
import { onMounted, ref, nextTick } from 'vue'
import Icon from './Icon.vue'

const letters = ref<string[]>([])

function detectLetters() {
  const headings = document.querySelectorAll<HTMLHeadingElement>('h2[id]')
  const found = new Set<string>()
  for (const h of headings) {
    const id = h.id.toUpperCase()
    if (id.length === 1 && /^[A-Z]$/.test(id)) {
      found.add(id)
    }
  }
  letters.value = [...found].sort()
}

onMounted(async () => {
  // nextTick 確保 markdown DOM 已 hydrate；同時 retry 一次防 VitePress client navigation 時序差
  await nextTick()
  detectLetters()
  if (letters.value.length === 0) {
    setTimeout(detectLetters, 200)
  }
})

function scrollToLetter(letter: string, e: MouseEvent) {
  e.preventDefault()
  const el = document.getElementById(letter.toLowerCase())
  if (!el) return
  // sticky index 自己占 ~52px，扣掉避免被遮
  const top = el.getBoundingClientRect().top + window.scrollY - 70
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' })
  history.replaceState(null, '', `#${letter.toLowerCase()}`)
}
</script>

<style scoped>
/* Editorial 詞彙表索引條：書邊頁碼樣式 sticky bar */
.ddia-glossary-index {
  position: sticky;
  top: calc(var(--vp-nav-height, 64px) + 8px);
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  padding: 12px 0;
  margin: var(--space-3) 0 32px;
  background: var(--bg-canvas);
  border: 0;
  border-top: 1px solid var(--rule-hairline);
  border-bottom: 1px solid var(--rule-hairline);
  border-radius: 0;
  box-shadow: 0 4px 8px -4px var(--bg-canvas);
}

:global(.dark) .ddia-glossary-index {
  background: var(--bg-canvas);
  box-shadow: 0 4px 8px -4px var(--bg-canvas);
}

.ddia-glossary-index-label {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-1);
  margin-right: 14px;
  padding-right: 14px;
  border-right: 1px solid var(--border-default);
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: var(--fvar-eyebrow-warm);
  color: var(--text-tertiary);
  font-size: var(--type-eyebrow);
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.ddia-glossary-index-label :deep(.material-symbols-rounded) {
  display: none;
}

.ddia-glossary-index-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 2px;
  font-family: var(--font-display);
  font-feature-settings: "onum" 1;
  font-variation-settings: var(--fvar-section-mid);
  font-size: var(--type-small);
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 0;
  border-bottom: 1px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}

.ddia-glossary-index-link:hover,
.ddia-glossary-index-link:focus-visible {
  background: transparent;
  color: var(--brand-500);
  border-bottom-color: var(--brand-500);
}
/* 鍵盤導航 outline 走全站 token；不要 outline: none 蓋掉 base.css 全域規則 */
.ddia-glossary-index-link:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

:global(.dark) .ddia-glossary-index-link:hover,
:global(.dark) .ddia-glossary-index-link:focus-visible {
  color: var(--brand-fg);
  border-bottom-color: var(--brand-fg);
}

@media (max-width: 600px) {
  .ddia-glossary-index {
    padding: var(--space-2) 10px;
    gap: 2px;
  }
  .ddia-glossary-index-label {
    width: 100%;
    margin: 0 0 var(--space-1);
    padding: 0 0 var(--space-1);
    border-right: none;
    border-bottom: 1px solid var(--border-default);
  }
  .ddia-glossary-index-link {
    min-width: 22px;
    height: 22px;
    font-size: 11px;
  }
}
</style>

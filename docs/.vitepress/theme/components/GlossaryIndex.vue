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
  window.scrollTo({ top, behavior: 'smooth' })
  history.replaceState(null, '', `#${letter.toLowerCase()}`)
}
</script>

<style scoped>
.ddia-glossary-index {
  position: sticky;
  top: calc(var(--vp-nav-height, 64px) + 8px);
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 10px 14px;
  margin: 16px 0 24px;
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: 10px;
  box-shadow: 0 2px 8px -4px rgba(0, 0, 0, 0.08);
}

:global(.dark) .ddia-glossary-index {
  box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.4);
}

.ddia-glossary-index-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 6px;
  padding-right: 8px;
  border-right: 1px solid var(--border-default);
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 500;
}

.ddia-glossary-index-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  padding: 0 6px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 6px;
  transition: background 0.15s ease, color 0.15s ease;
}

.ddia-glossary-index-link:hover,
.ddia-glossary-index-link:focus-visible {
  background: var(--brand-tint);
  color: var(--brand-500);
  outline: none;
}

:global(.dark) .ddia-glossary-index-link:hover,
:global(.dark) .ddia-glossary-index-link:focus-visible {
  color: var(--brand-300);
}

@media (max-width: 600px) {
  .ddia-glossary-index {
    padding: 8px 10px;
    gap: 2px;
  }
  .ddia-glossary-index-label {
    width: 100%;
    margin: 0 0 4px;
    padding: 0 0 4px;
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

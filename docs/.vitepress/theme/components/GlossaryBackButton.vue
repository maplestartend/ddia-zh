<template>
  <!-- 從本站章節跳過來才顯示；外部進入或直連不顯示 -->
  <div v-if="backLink" class="ddia-glossary-back">
    <a :href="backLink" class="ddia-glossary-back-link">
      <span class="ddia-glossary-back-arrow">←</span>
      <span class="ddia-glossary-back-text">回剛才的章節</span>
      <span v-if="backLabel" class="ddia-glossary-back-label">{{ backLabel }}</span>
    </a>
  </div>
</template>

<script setup lang="ts">
// P1-12 Wave 42：詞彙表跳回章節 — UX 共識的「使用流斷裂」修復
// 讀者從章節點 <G> 跳來查詞、看完想回去原章節接著讀。瀏覽器 back 可以但讀者不一定信任。
// 策略：mount 時讀 document.referrer，若是同源（本站章節）就顯示「← 回剛才章節」連結。
// 直連或外部進入不顯示（避免空狀態）。
import { ref, onMounted } from 'vue'
import { CHAPTERS, PREREQUISITES } from '../../data/chapters'

const backLink = ref<string | null>(null)
const backLabel = ref<string | null>(null)

onMounted(() => {
  try {
    const ref_url = document.referrer
    if (!ref_url) return
    const u = new URL(ref_url)
    // 同源檢查（避免 open redirect / phishing）
    if (u.origin !== window.location.origin) return
    // 路徑必須在 /part-X/ 或 /paths/ 或 /bridges/ 等「內容頁」、不是 /glossary/* 自身
    const path = u.pathname
    if (path.startsWith('/glossary')) return  // 自己跳自己不算
    // 比對章節 SSOT —— 找出對應 shortTitle 作為 label
    const stripped = path.replace(/\/+$/, '').replace(/\.html$/, '')
    const matched = [...CHAPTERS, ...PREREQUISITES].find(c => stripped.endsWith(c.link.replace(/\/+$/, '')))
    backLink.value = ref_url
    backLabel.value = matched?.shortTitle ?? null
  } catch { /* 解析失敗就靜默不顯示 */ }
})
</script>

<style scoped>
.ddia-glossary-back {
  margin: var(--space-3) 0;
}
.ddia-glossary-back-link {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-1-5) 0;
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-section-tight);
  font-size: var(--type-small);
  font-weight: 600;
  color: var(--text-secondary);
  text-decoration: none;
  border-bottom: 1px solid var(--rule-hairline);
  letter-spacing: var(--ls-tight);
  transition: color 0.15s, border-bottom-color 0.15s;
}
.ddia-glossary-back-link:hover,
.ddia-glossary-back-link:focus-visible {
  color: var(--mark-fg);
  border-bottom-color: var(--mark-fg);
}
.ddia-glossary-back-link:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}
.ddia-glossary-back-arrow {
  color: var(--mark-fg);
  font-weight: 700;
}
.ddia-glossary-back-label {
  font-variation-settings: var(--fvar-italic-warm);
  font-style: italic;
  font-size: var(--type-eyebrow);
  letter-spacing: var(--ls-loose);
  color: var(--text-tertiary);
}
</style>

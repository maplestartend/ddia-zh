<template>
  <nav class="ddia-glossary-stars" aria-label="面試常考 7 條快速連結">
    <div class="ddia-glossary-stars-eyebrow">
      <span class="ddia-glossary-stars-mark">★</span>
      <span>面試常考 · 7 條快速連結</span>
    </div>
    <div class="ddia-glossary-stars-row">
      <a v-for="t in starredTerms"
         :key="t.slug"
         :href="`#${t.slug}`"
         class="ddia-glossary-stars-link">
        {{ t.label }}
      </a>
    </div>
    <p class="ddia-glossary-stars-note">
      面試前 1-2 小時複習這 7 條、勝過讀整本詞彙表
    </p>
  </nav>
</template>

<script setup lang="ts">
// P1-12 Wave 42：詞彙表頁首「面試常考 ★ 7 條」quick links
// SSOT 是 glossary/index.md 內標記 <Badge ... text="面試常考 ★" /> 的詞條
// 此處 hard-code 對應的 7 個 slug —— 詞彙表 ★ 新增/移除時要同步本檔（git grep "面試常考 ★" 可掃）
const starredTerms = [
  { slug: 'cqrs',                  label: 'CQRS' },
  { slug: 'event-driven-workflow', label: 'Event-Driven Workflow' },
  { slug: 'exactly-once',          label: 'Exactly-Once Semantics' },
  { slug: 'idempotent',            label: 'Idempotent' },
  { slug: 'linearizability',       label: 'Linearizability' },
  { slug: 'quorum',                label: 'Quorum' },
  { slug: 'saga',                  label: 'Saga' }
]
</script>

<style scoped>
.ddia-glossary-stars {
  margin: var(--space-3) 0 var(--space-4);
  padding: var(--space-3) 0;
  border-top: 1px solid var(--rule-hairline);
  border-bottom: 1px solid var(--rule-hairline);
}
.ddia-glossary-stars-eyebrow {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-2);
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-eyebrow-warm);
  font-style: italic;
  font-size: var(--type-eyebrow);
  letter-spacing: var(--ls-eyebrow);
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin-bottom: var(--space-2-5);
}
.ddia-glossary-stars-mark {
  color: var(--accent-500);
  font-style: normal;
  font-size: var(--type-small);
}
:global(.dark) .ddia-glossary-stars-mark {
  color: var(--brand-fg);
}
.ddia-glossary-stars-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1-5) var(--space-3);
}
.ddia-glossary-stars-link {
  display: inline-flex;
  align-items: center;
  padding: 2px 0;
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-section-tight);
  font-weight: 600;
  font-size: var(--type-small);
  color: var(--text-primary);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: color 0.15s, border-bottom-color 0.15s;
  letter-spacing: var(--ls-tight);
}
.ddia-glossary-stars-link:hover,
.ddia-glossary-stars-link:focus-visible {
  color: var(--mark-fg);
  border-bottom-color: var(--mark-fg);
}
.ddia-glossary-stars-link:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}
.ddia-glossary-stars-note {
  margin: var(--space-2) 0 0;
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-italic-note);
  font-style: italic;
  font-size: var(--type-eyebrow);
  letter-spacing: var(--ls-loose);
  color: var(--text-tertiary);
}
</style>

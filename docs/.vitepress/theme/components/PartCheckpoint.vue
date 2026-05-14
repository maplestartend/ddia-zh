<template>
  <section class="ddia-part-checkpoint" role="region" :aria-label="`Part ${part} 中段自評`">
    <header class="ddia-pc-eyebrow">
      <span class="pc-num">PART {{ part }} · CHECKPOINT</span>
      <em>中段自評 · 你會了嗎</em>
    </header>
    <div class="ddia-pc-body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
// Part-level 中段自評元件 — 林老師（教育設計師）W38 建議：
// Spaced Repetition + Productive Failure 要求 cross-chapter integration check、
// 章末 Quiz 只 cover within-chapter；Part 末尾應有 6-8 題「你能用 Ch1-4 的詞答這些設計題嗎」
// 答錯 ≥ 3 題提示具體該回頭哪章哪節。
//
// 設計：slot-based、所有內容由 markdown 提供、元件只控樣式
// 視覺：書頁「Part 收束」氣質——上下三髮絲線夾住、no shadow、no radius
defineProps<{ part: 1 | 2 | 3 }>()
</script>

<style scoped>
.ddia-part-checkpoint {
  margin: 64px 0 var(--space-5);
  padding: var(--space-5) 0 var(--space-4);
  /* lint-border-density-allow: 跨 Part 自評（Ch4/9/12）刻意「重儀式」雙線 framing；
     資訊設計師指出此處是站台唯一「重分隔」訊號、不應降階 */
  border-top: 3px double var(--rule-hairline);
  border-bottom: 1px solid var(--rule-hairline);
  background: transparent;
}
.ddia-pc-eyebrow {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: var(--space-3-5);
  font-family: var(--font-display);
}
.pc-num {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 13.5px;  /* lint-typography-allow: part checkpoint label small-caps */
  text-transform: uppercase;
  letter-spacing: 0.26em;
  color: var(--brand-500);
}
.ddia-pc-eyebrow em {
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: var(--fvar-eyebrow);
  font-size: var(--type-body-lg);
  font-weight: 500;
  color: var(--text-primary);
  letter-spacing: var(--ls-tight);
}
.ddia-pc-body {
  font-family: var(--font-body);
  font-size: var(--type-body);
  line-height: 1.75;
  color: var(--text-primary);
}
.ddia-pc-body :deep(p) { margin: var(--space-2-5) 0; }
.ddia-pc-body :deep(p:first-child) { margin-top: 0; }
.ddia-pc-body :deep(ol) {
  margin: var(--space-2-5) 0;
  padding-left: 1.5em;
  counter-reset: pc-question;
  list-style: none;
}
.ddia-pc-body :deep(ol > li) {
  margin: var(--space-2) 0;
  position: relative;
  counter-increment: pc-question;
}
.ddia-pc-body :deep(ol > li::before) {
  content: counter(pc-question, decimal) ".";
  position: absolute;
  left: -1.5em;
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--brand-500);
  font-feature-settings: "onum" 1, "tnum" 1;
}
.ddia-pc-body :deep(ul) {
  margin: var(--space-2) 0;
  padding-left: 1.25em;
  list-style: none;
}
.ddia-pc-body :deep(ul > li) {
  margin: var(--space-1-5) 0;
  position: relative;
}
.ddia-pc-body :deep(ul > li::before) {
  content: "·";
  position: absolute;
  left: -0.9em;
  font-family: var(--font-display);
  color: var(--text-tertiary);
  font-size: var(--type-body-lg);
}
.ddia-pc-body :deep(strong) { color: var(--brand-500); font-weight: 600; }
</style>

<template>
  <aside class="ddia-first-read-shortcut" role="note">
    <div class="ddia-frs-eyebrow">
      <span class="frs-mark" aria-hidden="true">⚑</span>
      <em>第一次讀的捷徑</em>
    </div>
    <div class="ddia-frs-body">
      <slot />
    </div>
    <div class="ddia-frs-quiz-hint">
      <strong>章末 Quiz 分級對應</strong>：<code>basic</code> 題 = 走完上面「必讀核心」就該答得出 · <code>applied</code> 題 = 把觀念套到真實場景 · <code>interview</code> 題 = senior 面試級加碼（第一次讀答不出來不要緊）
    </div>
  </aside>
</template>

<script setup lang="ts">
// 純結構元件 — slot 內容由 markdown 提供。
// 設計意圖：比 admonition `::: warning` 更醒目、讓「死亡章節」的退場機制
// 從 PrereqBox 的 skippable 欄位（隱蔽）升級為章首獨立區塊（明顯）。
// 林老師（教育設計師）審視建議：Ch7 / Ch8 / Ch9 三章資訊密度峰值、
// 需要在章首明確標「最小可用版」，避免讀者撞牆放棄。
</script>

<style scoped>
.ddia-first-read-shortcut {
  position: relative;
  margin: var(--space-5) 0 var(--space-6);
  padding: var(--space-3-5) var(--space-4) var(--space-4) calc(var(--space-4) + 12px);
  background: var(--bg-surface);
  border-top: 1px solid var(--rule-hairline);
  border-bottom: 1px solid var(--rule-hairline);
  border-left: 3px solid var(--brand-500);
  border-radius: 0;
}
.ddia-frs-eyebrow {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: var(--space-2-5);
}
.frs-mark {
  font-family: var(--font-display);
  font-size: 18px;
  color: var(--brand-500);
  line-height: 1;
}
.ddia-frs-eyebrow em {
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: var(--fvar-eyebrow-warm);
  font-size: var(--type-eyebrow);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--ls-eyebrow);
  color: var(--brand-500);
}
.ddia-frs-body {
  font-family: var(--font-body);
  font-size: var(--type-small);
  line-height: 1.75;
  color: var(--text-primary);
}
.ddia-frs-body :deep(ul) {
  margin: var(--space-2) 0;
  padding-left: 1.25em;
  list-style: none;
}
.ddia-frs-body :deep(li) {
  margin: var(--space-1-5) 0;
  position: relative;
}
.ddia-frs-body :deep(li::before) {
  content: "→";
  position: absolute;
  left: -1.1em;
  color: var(--brand-500);
  font-family: var(--font-display);
  font-weight: 600;
}
.ddia-frs-body :deep(p) {
  margin: var(--space-2) 0;
}
.ddia-frs-body :deep(p:first-child) { margin-top: 0; }
.ddia-frs-body :deep(p:last-child) { margin-bottom: 0; }
.ddia-frs-body :deep(strong) {
  color: var(--brand-500);
  font-weight: 600;
}
.ddia-frs-quiz-hint {
  margin-top: var(--space-3);
  padding-top: var(--space-2-5);
  border-top: 1px dashed var(--rule-hairline);
  font-family: var(--font-body);
  font-size: 13px;  /* lint-typography-allow: FRS Quiz hint 小字 */
  line-height: 1.65;
  color: var(--text-secondary);
}
.ddia-frs-quiz-hint strong {
  color: var(--brand-500);
  font-weight: 600;
}
.ddia-frs-quiz-hint code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  padding: 0 4px;
  background: var(--bg-canvas);
  border-radius: 0;
}
</style>

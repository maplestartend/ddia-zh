<template>
  <header class="ddia-chapter-opener">
    <div class="ddia-chapter-opener-mark">{{ num }}</div>
    <div class="ddia-chapter-opener-eyebrow">{{ eyebrow }}</div>
    <h1 class="ddia-chapter-opener-title">{{ title }}</h1>
    <blockquote v-if="epigraph" class="ddia-chapter-opener-epigraph">
      <p class="ddia-chapter-opener-quote">{{ epigraph }}</p>
      <cite v-if="epigraphSource" class="ddia-chapter-opener-cite">— {{ epigraphSource }}</cite>
    </blockquote>
    <div class="ddia-chapter-opener-rule" />
  </header>
</template>

<script setup lang="ts">
// Editorial 章首儀式元件：大號章節編號 + italic eyebrow + 章名 + （可選）引言
// 用法：
//   <ChapterOpener
//     num="V"
//     eyebrow="Chapter · Five"
//     title="複製 Replication"
//     epigraph="The major difference between a thing that might go wrong..."
//     epigraph-source="Douglas Adams" />
// 用在章節 markdown 檔最上方（取代或補在現有 h1 / TLDR / ChapterMeta 之前）。
// 若該章不想要引言，省略 epigraph 即可。
defineProps<{
  num: string                  // 「V」「12」「5」都行
  eyebrow: string              // 「Chapter · Five」「Part 0 · §0.2」
  title: string                // 章節主標
  epigraph?: string            // 引言（可選）
  epigraphSource?: string      // 引言來源 / 作者（可選）
}>()
</script>

<style scoped>
.ddia-chapter-opener {
  margin: 24px 0 48px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--rule-hairline);
  text-align: left;
}

/* 大號章節編號：Fraunces SemiBold + oldstyle figures + 大字級 */
.ddia-chapter-opener-mark {
  font-family: var(--font-display);
  font-feature-settings: "onum" 1, "kern" 1;
  font-variation-settings: "opsz" 144, "SOFT" 80, "wght" 500;
  font-size: 96px;
  line-height: 1;
  color: var(--brand-500);
  letter-spacing: -0.02em;
  margin-bottom: 12px;
}

.ddia-chapter-opener-eyebrow {
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: "opsz" 24, "SOFT" 60, "wght" 500;
  font-size: 13px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.32em;
  color: var(--text-tertiary);
  margin-bottom: 18px;
}

.ddia-chapter-opener-title {
  font-family: var(--font-display);
  font-feature-settings: "onum" 1, "kern" 1, "calt" 1;
  font-variation-settings: "opsz" 72, "SOFT" 70, "wght" 500;
  font-size: 42px;
  font-weight: 500;
  line-height: 1.18;
  letter-spacing: -0.008em;
  color: var(--text-primary);
  margin: 0 0 24px;
  text-wrap: balance;
  /* override base.css 的 h1 規則 — 不要重複底部 hairline rule */
  border-bottom: 0;
  padding-bottom: 0;
}

.ddia-chapter-opener-epigraph {
  margin: 28px 0 0;
  padding: 6px 0 6px 24px;
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
  margin: 0 0 8px;
}
.ddia-chapter-opener-cite {
  display: block;
  font-family: var(--font-display);
  font-style: normal;
  font-variation-settings: "opsz" 24, "SOFT" 30, "wght" 500;
  font-size: 12.5px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.dark .ddia-chapter-opener-mark {
  color: var(--info-fg);
}

@media (max-width: 640px) {
  .ddia-chapter-opener-mark { font-size: 64px; }
  .ddia-chapter-opener-title { font-size: 32px; }
}
</style>

<template>
  <div class="ddia-meta">
    <div class="ddia-meta-item">
      <strong>{{ part }}</strong>
    </div>
    <div class="ddia-meta-item">
      <!-- P1-16 Wave 42：與 PrereqBox first-read-hint 對齊
           原本 ChapterMeta 只顯示 readTime（如 35 分），PrereqBox 卻寫「60-90 分」—— 兩個數字打架。
           現在：有 deep-read-range 時顯示「快讀 35 分／深讀 60-90 分」、無則只顯示 readTime -->
      <template v-if="deepReadRange">
        <strong>快讀 {{ readTime }} 分</strong>
        <span class="ddia-meta-dot">／</span>
        <strong>深讀 {{ deepReadRange }} 分</strong>
      </template>
      <template v-else>
        預估 <strong>{{ readTime }} 分鐘</strong>
      </template>
    </div>
    <div class="ddia-meta-item">
      難度：<strong>{{ difficulty }}</strong>
    </div>
    <div v-if="prereq" class="ddia-meta-item">
      前置：<span class="ddia-badge">{{ prereq }}</span>
    </div>
    <!-- W46：tag 若有對應 glossary anchor 自動變連結 + 顯示 ? icon、讓初學者一鍵跳定義
         無對應則 fallback 純文字 badge（向下相容） -->
    <div v-for="(tag, i) in tags" :key="i" class="ddia-meta-item">
      <a v-if="tagAnchors[tag]"
         :href="withBase(`/glossary/#${tagAnchors[tag]}`)"
         class="ddia-badge accent ddia-badge-link"
         :title="`跳到詞彙表查看：${tag}`">
        {{ tag }}<span class="ddia-badge-help" aria-hidden="true">?</span>
      </a>
      <span v-else class="ddia-badge accent">{{ tag }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { withBase } from 'vitepress'

defineProps<{
  part: string
  readTime: number
  difficulty: string
  prereq?: string
  tags?: string[]
  /** P1-16：深讀預估時間範圍，例如 "60-90"。設定後 ChapterMeta 顯示「快讀 X 分／深讀 Y-Z 分」 */
  deepReadRange?: string
}>()

// W46：tag → glossary anchor 對照（對齊 docs/glossary/index.md {#id}）
// W48：as const 給編譯期 key/value literal、anchor 正確性由 lint:tag-anchors guard
// （glossary.ts 是 hover SSOT、glossary/index.md 是 anchor SSOT、兩者不完全一致）
const TAG_ANCHORS = {
  'SLA': 'sla-slo',
  'SLO': 'sla-slo',
  'P99': 'percentile',
  'Linearizability': 'linearizability',
  '線性一致': 'linearizability',
  'Quorum': 'quorum',
  'Raft': 'raft',
  '2PC': 'two-phase-commit',
  'CRDT': 'crdt',
  'Leader/Follower': 'replication',
  'CQRS': 'cqrs',
  'Saga': 'saga',
  'CAP': 'cap-theorem',
  'ACID': 'acid'
} as const

const tagAnchors: Record<string, string | undefined> = TAG_ANCHORS
</script>

<style scoped>
.ddia-meta-dot {
  margin: 0 0.18em;
  color: var(--text-tertiary);
}
.ddia-badge-link {
  text-decoration: none;
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}
.ddia-badge-link:hover {
  background: var(--brand-tint-soft);
}
.ddia-badge-help {
  font-style: italic;
  font-weight: 600;
  opacity: 0.55;
}
</style>

<script setup lang="ts">
// SequenceFlow —— Wave 38 取代 mermaid sequenceDiagram 的客製元件。
// 為什麼客製：mermaid sequenceDiagram 在 6+ actor 場景會撐到 viewBox 1800+、
// 縮在 .vp-doc 624px 容器內字 ~5-7px 不可讀；且 dark mode 對 actor 文字色處理不一致。
// 改用 HTML + CSS Grid 渲染：每 actor 一 column、step 一 row、actor 名 sticky 頂、
// 訊息箭頭用 CSS border 短線（不是整圖 SVG）。
//
// Grid 結構：grid-template-columns = [36px num] [1fr actor0] [1fr actor1] ... [1fr actorN-1]
//   header 第一格留白佔 num 位、actor 名從 col 2 開始
//   step row 第一格放 num 編號、arrow grid-column-start = from+2、end = to+3
//   note 跨多 actor 用 actors[0..1] index 計算 column span

import { computed } from 'vue'

export type SeqStep = {
  from?: number
  to?: number
  msg?: string
  kind?: 'msg' | 'return' | 'note' | 'self'
  tone?: 'warn' | 'danger' | 'safe' | 'neutral'
  text?: string  // 給 note 用
  actors?: [number, number]  // note 跨越的 actor index 範圍（含）
}

export type SeqPhase = {
  name?: string
  caption?: string
  tone?: 'warn' | 'danger' | 'safe' | 'neutral'
  steps: SeqStep[]
}

const props = defineProps<{
  actors: string[]
  phases: SeqPhase[]
  caption?: string
}>()

// 預計算每 step 全域序號（跨 phase 連續、note 不編號）
const numberedPhases = computed(() => {
  let counter = 0
  return props.phases.map(phase => ({
    ...phase,
    steps: phase.steps.map(step => {
      const isNote = step.kind === 'note'
      if (!isNote) counter += 1
      return { ...step, num: isNote ? null : counter }
    })
  }))
})

// 計算 arrow grid-column（num col 在 1、actor 0 在 2、actor N-1 在 N+1）
function arrowCols(step: SeqStep) {
  const from = step.from ?? 0
  const to = step.to ?? 0
  const start = Math.min(from, to) + 2
  const end = Math.max(from, to) + 3
  return { gridColumnStart: String(start), gridColumnEnd: String(end) }
}

function selfCol(step: SeqStep) {
  const from = step.from ?? 0
  return {
    gridColumnStart: String(from + 2),
    gridColumnEnd: String(from + 3),
  }
}

function noteCols(step: SeqStep) {
  const start = (step.actors?.[0] ?? 0) + 2
  const end = (step.actors?.[1] ?? props.actors.length - 1) + 3
  return { gridColumnStart: String(start), gridColumnEnd: String(end) }
}

function arrowDirection(step: SeqStep): 'forward' | 'backward' {
  return (step.to ?? 0) >= (step.from ?? 0) ? 'forward' : 'backward'
}
</script>

<template>
  <figure class="ddia-seq-figure" :style="{ '--actor-count': actors.length }">
    <!-- Actor header：第一格留白佔 num column、actor 名跟著從 col 2 開始 -->
    <div class="ddia-seq-header">
      <div class="ddia-seq-num-placeholder" aria-hidden="true"></div>
      <div
        v-for="(actor, i) in actors"
        :key="i"
        class="ddia-seq-actor"
      >
        {{ actor }}
      </div>
    </div>

    <!-- Phases -->
    <div
      v-for="(phase, pi) in numberedPhases"
      :key="pi"
      class="ddia-seq-phase"
      :class="phase.tone ? `is-tone-${phase.tone}` : ''"
    >
      <div v-if="phase.name" class="ddia-seq-phase-title">{{ phase.name }}</div>

      <div
        v-for="(step, si) in phase.steps"
        :key="si"
        class="ddia-seq-step"
        :class="`is-kind-${step.kind || 'msg'}`"
      >
        <!-- Note 跨多 actor -->
        <template v-if="step.kind === 'note'">
          <div
            class="ddia-seq-note"
            :class="step.tone ? `is-tone-${step.tone}` : ''"
            :style="noteCols(step)"
          >
            {{ step.text }}
          </div>
        </template>

        <!-- self loop -->
        <template v-else-if="step.kind === 'self'">
          <div class="ddia-seq-num">{{ step.num }}</div>
          <div class="ddia-seq-self" :style="selfCol(step)">
            <span class="ddia-seq-self-msg">↻ {{ step.msg }}</span>
          </div>
        </template>

        <!-- 一般 msg / return：橫跨兩 actor 的線 -->
        <template v-else>
          <div class="ddia-seq-num">{{ step.num }}</div>
          <div
            class="ddia-seq-arrow"
            :class="[
              step.kind === 'return' ? 'is-return' : 'is-forward',
              `is-dir-${arrowDirection(step)}`,
            ]"
            :style="arrowCols(step)"
          >
            <span class="ddia-seq-arrow-msg">{{ step.msg }}</span>
          </div>
        </template>
      </div>

      <div v-if="phase.caption" class="ddia-seq-phase-caption">{{ phase.caption }}</div>
    </div>

    <figcaption v-if="caption" class="ddia-seq-caption">{{ caption }}</figcaption>
  </figure>
</template>

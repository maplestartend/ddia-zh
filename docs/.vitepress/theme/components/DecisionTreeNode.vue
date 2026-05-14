<script setup lang="ts">
import type { DecisionNode, DecisionLeaf, DecisionQuestion } from './DecisionTree.vue'

const props = defineProps<{
  node: DecisionNode
  depth: number
}>()

function isLeaf(node: DecisionNode): node is DecisionLeaf {
  return (node as DecisionLeaf).kind === 'leaf'
}

function asQuestion(node: DecisionNode): DecisionQuestion {
  return node as DecisionQuestion
}

function toneClass(node: DecisionNode): string {
  if (!isLeaf(node)) return ''
  return `is-tone-${node.tone || 'neutral'}`
}
</script>

<template>
  <!-- 葉節點：結論卡 -->
  <div v-if="isLeaf(node)" class="ddia-dtree-leaf" :class="toneClass(node)">
    <div class="ddia-dtree-leaf-text" v-html="(node as DecisionLeaf).text.replace(/\n/g, '<br/>')" />
    <div v-if="(node as DecisionLeaf).note" class="ddia-dtree-leaf-note">
      {{ (node as DecisionLeaf).note }}
    </div>
  </div>

  <!-- 問題節點：question box + branches -->
  <div v-else class="ddia-dtree-question-block">
    <div class="ddia-dtree-question">
      <span class="ddia-dtree-question-eyebrow">Q</span>
      <span class="ddia-dtree-question-text">{{ asQuestion(node).q }}</span>
      <span v-if="asQuestion(node).hint" class="ddia-dtree-question-hint">
        （{{ asQuestion(node).hint }}）
      </span>
    </div>
    <div class="ddia-dtree-branches">
      <div
        v-for="(branch, i) in asQuestion(node).branches"
        :key="i"
        class="ddia-dtree-branch"
      >
        <div class="ddia-dtree-edge">{{ branch.label }}</div>
        <div class="ddia-dtree-child">
          <DecisionTreeNode :node="branch.child" :depth="depth + 1" />
        </div>
      </div>
    </div>
  </div>
</template>

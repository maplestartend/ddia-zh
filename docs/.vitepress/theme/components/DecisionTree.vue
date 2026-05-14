<script setup lang="ts">
// DecisionTree —— Wave 38 取代 mermaid 決策樹的客製元件。
// 為什麼客製：mermaid + CJK 在 .vp-doc 624px 容器內反覆出現「viewBox 太寬縮成 5px 字」/
// 「foreignObject 對中文 sizing 不準、節點 label 跑版」/「暗色 inline style fill 跟 CSS override 打架」
// 三類問題。改用 HTML + CSS Grid / Flex 渲染，文字自然 wrap、容器寬永遠 fit、暗色用 token 控制。
//
// 樹型：question node（決策點）→ 多個 branch（每個帶 label + child）；child 可以是另一個 question 或 leaf（結論）
// 視覺：indented tree 風格（往下流 + 左側髮絲線標深度）、葉節點按 tone 上色

export type DecisionLeaf = {
  kind: 'leaf'
  tone?: 'danger' | 'safe' | 'warn' | 'neutral'
  text: string
  note?: string
}

export type DecisionQuestion = {
  q: string
  hint?: string
  branches: { label: string; child: DecisionNode }[]
}

export type DecisionNode = DecisionLeaf | DecisionQuestion

defineProps<{
  root: DecisionNode
  caption?: string
}>()
</script>

<template>
  <figure class="ddia-dtree-figure">
    <DecisionTreeNode :node="root" :depth="0" />
    <figcaption v-if="caption" class="ddia-dtree-caption">{{ caption }}</figcaption>
  </figure>
</template>

<style>
/* 元件樣式統一放 components.css 以維持 4-檔 CSS 拆法（tokens / base / components / layout）。
   參見 components.css 內 .ddia-dtree-* 規則。 */
</style>

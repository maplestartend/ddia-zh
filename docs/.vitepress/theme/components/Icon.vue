<template>
  <!-- P1-19 Wave 42：Editorial 模式下 Icon 已被 base.css `.material-symbols-rounded { display: none }` 視覺隱藏
       元件仍存在於 DOM tree、佔 hydrate 成本。現在改成「有 label 才 render sr-only span、否則 render nothing」
       —— 完整保留 a11y（label 餵 screen reader）、無視覺負擔、減 ~150+ Icon node hydrate cost。
       未來若要回到圖示模式（恢復 Material Symbols），只需把 v-if 條件砍掉 + 回 base.css 移除 display:none。 -->
  <span
    v-if="label"
    role="img"
    :aria-label="label"
    class="ddia-icon-sr-only"
  />
</template>

<script setup lang="ts">
// 沒 label 時整個 component render nothing —— 不發 DOM、不佔 hydrate。
defineProps<{
  name: string                                    // 保留（外部呼叫端不必同步刪）
  size?: number
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700
  filled?: boolean
  grade?: -25 | 0 | 200
  label?: string                                  // 唯一仍有作用：sr-only a11y
}>()
</script>

<style scoped>
/* sr-only：螢幕閱讀器看得到、視覺看不到（標準 a11y 模式）
   R3-P2 Wave 42.3：加 clip-path（取代 deprecated clip）+ inset(50%) 標準寫法
   也避免 position:absolute 在父元素 static 時錨到祖先元素的副作用 */
.ddia-icon-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
</style>

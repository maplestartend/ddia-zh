<template>
  <!-- Editorial 模式：所有 Material Symbols 圖示都用 typographic mark（§ · ◆ →）取代
       本元件只剩 sr-only a11y 用途、當 label 有設定才 render 螢幕閱讀器專用 span
       未來若要回到圖示模式，需 (1) 補回 name/size/filled 等 props
       (2) 加 <span class="material-symbols-rounded"> 渲染、(3) base.css 移除 display:none -->
  <span
    v-if="label"
    role="img"
    :aria-label="label"
    class="ddia-icon-sr-only"
  />
</template>

<script setup lang="ts">
// W43-1 Wave 43：清掉 dead props（name/size/weight/filled/grade）— Editorial 模式下這 5 個 prop 都不影響渲染
// 保留 label 作為 sr-only a11y 朗讀文字。所有舊呼叫端如 <Icon name="x" :size="16" filled />
// 仍能正常工作 —— Vue 3 對未知 attr 走 fallthrough、由於本元件 root 是 conditional span、
// 沒有 root 時 attrs 會被吞掉、不會有 warning
defineProps<{
  /** sr-only a11y 朗讀文字（唯一仍生效的 prop）。沒設定時整個元件 render nothing */
  label?: string
}>()
</script>

<style scoped>
/* sr-only：螢幕閱讀器看得到、視覺看不到（標準 a11y 模式）
   clip-path inset(50%) 取代 deprecated clip，避免 position:absolute 錨到祖先 */
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

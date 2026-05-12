<template>
  <div class="ddia-tldr">
    <div class="ddia-tldr-title">
      <Icon name="bolt" :size="16" filled />
      <span>TL;DR · 本章重點</span>
    </div>
    <ul>
      <li v-for="(point, i) in points" :key="i" v-html="point" />
    </ul>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue'
defineProps<{ points: string[] }>()
</script>

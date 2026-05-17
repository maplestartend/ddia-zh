declare module '*.css';
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}

// W48：常用 .md 內 Vue 元件補精準 props 型別 — 讓 vue-tsc 抓 markdown 內 props 拼錯
// 其他 .vue 維持上方寬鬆 fallback（最便宜版、reviewer #4 建議）
declare module './theme/components/ChapterMeta.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{
    part: string;
    readTime: number;
    difficulty: string;
    prereq?: string;
    tags?: string[];
    deepReadRange?: string;
  }>;
  export default component;
}

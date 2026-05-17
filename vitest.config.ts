import { defineConfig } from 'vitest/config'

// W51：unit test 入口。最小設定、Node 環境（純函式 / 資料 SSOT 測試）
// 需 DOM 的元件 / composable 測試（useStorage、useProgress）暫不接、留 backlog
export default defineConfig({
  test: {
    include: ['docs/.vitepress/**/*.test.ts'],
    environment: 'node',
    reporters: 'default'
  }
})

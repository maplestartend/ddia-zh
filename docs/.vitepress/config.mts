import { defineConfig } from 'vitepress'
import markdownItAttrs from 'markdown-it-attrs'
import { chaptersByPart, PARTS, type Chapter } from './data/chapters'

// base 路徑：本地 dev 用 '/'；GitHub Pages 部署用 '/ddia-zh/'
// CI workflow 設定 GITHUB_PAGES=true 時才切換，避免本地 dev 也用子路徑造成路由失敗
const base = process.env.GITHUB_PAGES === 'true' ? '/ddia-zh/' : '/'

// sidebar 從 chapters.ts SSOT 動態產出：新增 / 改章節順序只動 chapters.ts 一處
const PART_INDEX_LINK: Record<0 | 1 | 2 | 3, string> = {
  0: '/part-0/',
  1: '/part-1/',
  2: '/part-2/',
  3: '/part-3/'
}
const PART_SIDEBAR_TEXT: Partial<Record<0 | 1 | 2 | 3, string>> = {
  0: 'Part 0 前置知識（選讀）'
}

function partGroup(part: 0 | 1 | 2 | 3, opts: { collapsed: boolean }) {
  return {
    text: PART_SIDEBAR_TEXT[part] ?? PARTS[part].title,
    link: PART_INDEX_LINK[part],
    collapsed: opts.collapsed,
    items: chaptersByPart(part).map((c: Chapter) => ({ text: c.shortTitle, link: c.link }))
  }
}

// 全 Part sidebar：當前 part expanded、其他 collapsed
// 讓讀者在章節頁也能看到全書地圖（跨 part 跳轉不必先回首頁）
function fullSidebar(activePart: 0 | 1 | 2 | 3) {
  return ([0, 1, 2, 3] as const).map(p => partGroup(p, { collapsed: p !== activePart }))
}

export default defineConfig({
  title: 'DDIA 中文學習',
  description: '《Designing Data-Intensive Applications》個人非官方學習筆記 · 繁體中文',
  lang: 'zh-TW',
  base,
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    // Editorial 模式不使用 Material Symbols（典型 icon 已替換成 typographic mark：§ · ◆ →）
    // Icon.vue 元件保留但全站 .material-symbols-rounded { display: none }（base.css），
    // 不再從 Google Fonts 載入 ~150KB 字型 payload
    // 字型分三層：
    //   Display（標題 / hero / 章節編號）：Fraunces + Noto Serif TC（單一 weight 600）
    //   Body（內文）：Noto Sans TC weight 400 / 500（700 由瀏覽器合成 — 省 ~600KB CJK）
    //   Mono（數字 / 程式碼）：JetBrains Mono weight 400 / 500
    // Fraunces 軸：opsz 9-144、wght 400-700、SOFT 40-80（W48 收斂、實際只用三點、字檔省 ~25%）
    // W50：preload URL 與 stylesheet URL 必須一致才能命中（W48 兩條 URL 不同 = 白做工）
    ['link', { rel: 'preload', as: 'style', href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,400..700,40..80&family=Noto+Serif+TC:wght@600&family=Noto+Sans+TC:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,400..700,40..80&family=Noto+Serif+TC:wght@600&family=Noto+Sans+TC:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap' }],
    ['meta', { name: 'theme-color', content: '#8C3A2A' }]
  ],

  themeConfig: {
    siteTitle: 'DDIA 中文學習',
    outline: { level: [2, 3], label: '本章大綱' },
    docFooter: { prev: '上一章', next: '下一章' },
    lastUpdatedText: '最後更新',
    darkModeSwitchLabel: '主題',
    sidebarMenuLabel: '選單',
    returnToTopLabel: '回到頂端',
    externalLinkIcon: true,

    nav: [
      { text: '首頁', link: '/' },
      {
        text: '章節',
        items: [
          { text: 'Part 0 前置知識', link: '/part-0/' },
          { text: 'Part I 資料系統基礎', link: '/part-1/' },
          { text: 'Part II 分散式資料', link: '/part-2/' },
          { text: 'Part III 衍生資料', link: '/part-3/' }
        ]
      },
      { text: '詞彙表', link: '/glossary/' },
      {
        // R3-P2 Wave 42.3：UX 指出 nav 8 項過多、撐長 dropdown 讀者不知道點哪
        // 精簡到 4 項核心、進階工具（ADR / 容量規劃 / 事故 / OLTP↔DE）已在 paths/index.md
        // 「進階：從學到做」section + 視角橋一節連結、不必重複進 nav
        text: '學習路徑',
        items: [
          { text: '依角色（後端 / DE / 架構師 / 面試）', link: '/paths/' },
          { text: '30 天讀通計畫（完整版）', link: '/paths/30-day-summer-plan' },
          { text: '30 天初學者暑假計畫', link: '/paths/30-day-beginner' },
          { text: '面試 cheatsheet', link: '/paths/interview-cheatsheet' }
        ]
      },
      { text: '我的進度', link: '/progress' } // VitePress cleanUrls：無尾斜線
    ],

    sidebar: {
      '/part-0/': fullSidebar(0),
      '/part-1/': fullSidebar(1),
      '/part-2/': fullSidebar(2),
      '/part-3/': fullSidebar(3)
    },

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: '搜尋', buttonAriaLabel: '搜尋' },
              modal: {
                noResultsText: '找不到相關結果',
                resetButtonTitle: '清除查詢',
                footer: {
                  selectText: '選擇',
                  navigateText: '切換',
                  closeText: '關閉'
                }
              }
            }
          }
        },
        miniSearch: {
          options: {
            tokenize: (text: string) => text.split(/[\s\n\r,.;:!?'"()\[\]{}<>\/\\|\-—–。，、；：！？「」『』（）【】《》]+/u).filter(Boolean)
          },
          searchOptions: {
            combineWith: 'AND',
            fuzzy: 0.2,
            prefix: true,
            boost: { title: 4, text: 2, titles: 1 }
          }
        }
      }
    },

    footer: {
      message: '非官方個人學習筆記 · 非商業用途 · 程式碼 MIT、內容 CC BY-NC-SA 4.0',
      copyright: '《Designing Data-Intensive Applications》原書著作權 © Martin Kleppmann & O\'Reilly Media · 本站與原作者及出版社無從屬關係'
    }
  },

  markdown: {
    lineNumbers: true,
    // dark 模式 syntax theme：避免 github-dark 的冷藍紫色 leak 進暖色頁面
    // vitesse-dark 是暖灰底 + 米色字、與 Editorial 暖炭墨頁面協調
    theme: { light: 'github-light', dark: 'vitesse-dark' },
    config(md) {
      // 讓 markdown 標題能加 class，例如：## 後端工程師 {.role-h2-backend}
      md.use(markdownItAttrs)
    }
  },

  vite: {
    build: {
      // search index ~680 KB 拆獨立 chunk；其餘大於 700 KB 才警告
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks: (id) => id.includes('localSearchIndex') ? 'search-index' : undefined
        }
      }
    }
  },

  // W50/W51：防護網 — Vite manualChunks 拆 search-index 後、Rollup 因 dynamic-import
  // 預設不 emit preload；但 VP 升級可能引入 preload，這個 hook 主動過濾掉。
  transformHtml(code) {
    return code.replace(/<link rel="modulepreload"[^>]*search-index[^>]*>/g, '')
  }
})

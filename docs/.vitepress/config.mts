import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
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

export default withMermaid(defineConfig({
  title: 'DDIA 中文學習',
  description: '《Designing Data-Intensive Applications》個人非官方學習筆記 · 繁體中文',
  lang: 'zh-TW',
  base,
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    // Material Symbols Rounded：縮窄 axis 範圍降低字型 payload（過去全範圍 ~7 個字重 × 全 FILL × 全 GRAD）
    // 實際只用：opsz=20、wght=400 / 500、FILL=0 / 1、GRAD=0；axis range 縮到剛好覆蓋
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..24,400..500,0..1,0&display=swap' }],
    // 字型：Noto Sans TC（中文）+ JetBrains Mono（數字/程式碼）
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=JetBrains+Mono:wght@400;500;700&display=swap' }],
    ['meta', { name: 'theme-color', content: '#2F4A80' }]
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
      { text: '學習路徑', link: '/paths/' },
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
    theme: { light: 'github-light', dark: 'github-dark' },
    config(md) {
      // 讓 markdown 標題能加 class，例如：## 後端工程師 {.role-h2-backend}
      // 配合 CSS ::before 注入 Material Symbols icon，保持 outline 文字乾淨
      md.use(markdownItAttrs)
    }
  },

  mermaid: {
    // 對齊深鋼藍 brand
    theme: 'default'
  }
}))

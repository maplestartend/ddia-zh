import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import markdownItAttrs from 'markdown-it-attrs'

export default withMermaid(defineConfig({
  title: 'DDIA 中文學習',
  description: '《Designing Data-Intensive Applications》個人學習筆記與互動式學習網站',
  lang: 'zh-TW',
  base: '/',
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
      '/part-0/': [
        {
          text: 'Part 0 前置知識（選讀）',
          link: '/part-0/',
          items: [
            { text: '0.0 三分鐘看懂後端世界', link: '/part-0/basics' },
            { text: '0.1 為什麼需要資料密集系統', link: '/part-0/intro' },
            { text: '0.2 衡量指標素養', link: '/part-0/metrics' },
            { text: '0.3 SQL 與關聯模型速覽', link: '/part-0/sql' },
            { text: '0.4 作業系統地基', link: '/part-0/os' },
            { text: '0.5 網路地基', link: '/part-0/network' },
            { text: '0.6 資料結構地基', link: '/part-0/data-structures' },
            { text: '0.7 並行控制直覺', link: '/part-0/concurrency' }
          ]
        }
      ],
      '/part-1/': [
        {
          text: 'Part I 資料系統基礎',
          link: '/part-1/',
          items: [
            { text: 'Ch1 可靠、可擴展、可維護', link: '/part-1/ch01-reliable' },
            { text: 'Ch2 資料模型與查詢語言', link: '/part-1/ch02-data-models' },
            { text: 'Ch3 儲存與檢索', link: '/part-1/ch03-storage' },
            { text: 'Ch4 編碼與演進', link: '/part-1/ch04-encoding' }
          ]
        }
      ],
      '/part-2/': [
        {
          text: 'Part II 分散式資料',
          link: '/part-2/',
          items: [
            { text: 'Ch5 複製', link: '/part-2/ch05-replication' },
            { text: 'Ch6 分區', link: '/part-2/ch06-partitioning' },
            { text: 'Ch7 交易', link: '/part-2/ch07-transactions' },
            { text: 'Ch8 分散式系統的麻煩', link: '/part-2/ch08-trouble' },
            { text: 'Ch9 一致性與共識', link: '/part-2/ch09-consistency' }
          ]
        }
      ],
      '/part-3/': [
        {
          text: 'Part III 衍生資料',
          link: '/part-3/',
          items: [
            { text: 'Ch10 批次處理', link: '/part-3/ch10-batch' },
            { text: 'Ch11 串流處理', link: '/part-3/ch11-streams' },
            { text: 'Ch12 資料系統的未來', link: '/part-3/ch12-future' }
          ]
        }
      ]
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

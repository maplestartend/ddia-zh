import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
// CSS 拆 4 檔避免單檔失控（原本 custom.css 接近 1000 行）
// 順序重要：tokens 先（定義 CSS 變數）→ base（消費變數）→ components → layout
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/layout.css'

import Icon from './components/Icon.vue'
import TLDR from './components/TLDR.vue'
import Quiz from './components/Quiz.vue'
import Progress from './components/Progress.vue'
import ChapterMeta from './components/ChapterMeta.vue'
import Dashboard from './components/Dashboard.vue'
import ChapterCard from './components/ChapterCard.vue'
import NextChapterBridge from './components/NextChapterBridge.vue'
import GlossaryTerm from './components/GlossaryTerm.vue'
import GlossaryIndex from './components/GlossaryIndex.vue'
import SectionDivider from './components/SectionDivider.vue'
import BaseLink from './components/BaseLink.vue'
import PrereqBox from './components/PrereqBox.vue'
import ChapterNote from './components/ChapterNote.vue'
import ChapterOpener from './components/ChapterOpener.vue'
import CheatSheetExport from './components/CheatSheetExport.vue'
import Part0SelfAssessment from './components/Part0SelfAssessment.vue'
import ReviewDue from './components/ReviewDue.vue'
import InterviewBlock from './components/InterviewBlock.vue'

// Editorial 模式不再載 Material Symbols、不再需要 FOUT 防護 hook
// 字型載入由 font-display: swap 處理（Fraunces / Noto Serif TC / Noto Sans TC / JetBrains Mono）

// Reading progress 髮絲線：在章節頁頂部 fixed 1px 線、隨 scroll 變寬
// 只在 layout: doc 的長頁（章節 / Part 概覽 / 詞彙表 / paths）出現；layout: page 首頁不出現
if (typeof window !== 'undefined') {
  let bar: HTMLDivElement | null = null
  let rafId = 0
  const update = () => {
    if (!bar) return
    const main = document.querySelector('.vp-doc') as HTMLElement | null
    if (!main) { bar.style.width = '0%'; return }
    const h = document.documentElement
    const scrollable = h.scrollHeight - h.clientHeight
    if (scrollable < 100) { bar.style.width = '0%'; return }
    const pct = Math.min(100, (h.scrollTop / scrollable) * 100)
    bar.style.width = pct + '%'
  }
  const onScroll = () => {
    cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(update)
  }
  const ensureBar = () => {
    if (!bar) {
      bar = document.createElement('div')
      bar.className = 'ddia-reading-progress'
      document.body.appendChild(bar)
    }
    update()
  }
  // a11y skip link：第一個 Tab 鍵浮現「跳到主要內容」，協助鍵盤導航者繞過 nav / sidebar
  const ensureSkipLink = () => {
    if (document.querySelector('.ddia-skip-link')) return
    const link = document.createElement('a')
    link.className = 'ddia-skip-link'
    link.href = '#VPContent'
    link.textContent = '跳到主要內容'
    document.body.insertBefore(link, document.body.firstChild)
  }
  // a11y mermaid <title> 注入：SR 朗讀 mermaid SVG 時提供語境而非 raw graph data
  // 規則：找 svg[id*="mermaid"]、若無 <title> 子元素、用「前一個 element 的文字（最多 80 字）」當 title；
  // 沒有前一個 element 則 fallback「Mermaid 流程圖」
  const injectMermaidTitles = () => {
    const svgs = document.querySelectorAll<SVGSVGElement>('svg[id*="mermaid"]')
    svgs.forEach(svg => {
      if (svg.querySelector(':scope > title')) return  // already has
      const parent = svg.closest('p, div')
      const prev = parent?.previousElementSibling
      const prevText = (prev?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80)
      const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'title')
      titleEl.textContent = prevText || 'Mermaid 流程圖'
      svg.insertBefore(titleEl, svg.firstChild)
    })
  }
  // 用 MutationObserver 監聽 SVG 加入（mermaid plugin 是動態渲染、不在初始 DOM）
  let mermaidObserver: MutationObserver | null = null
  const watchMermaid = () => {
    if (mermaidObserver) return
    mermaidObserver = new MutationObserver(() => {
      // debounce：等 mermaid render 穩定後再注入
      requestAnimationFrame(injectMermaidTitles)
    })
    mermaidObserver.observe(document.body, { childList: true, subtree: true })
    // 初次也跑一次（處理已 hydrate 的內容）
    requestAnimationFrame(injectMermaidTitles)
  }
  // 等 DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ensureBar(); ensureSkipLink(); watchMermaid()
    })
  } else {
    ensureBar()
    ensureSkipLink()
    watchMermaid()
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
}

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Icon', Icon)
    app.component('TLDR', TLDR)
    app.component('Quiz', Quiz)
    app.component('Progress', Progress)
    app.component('ChapterMeta', ChapterMeta)
    app.component('Dashboard', Dashboard)
    app.component('ChapterCard', ChapterCard)
    app.component('NextChapterBridge', NextChapterBridge)
    // 詞彙連結化：<G term="quorum">法定人數</G>
    // 短別名 G 為了不污染 markdown 視覺，等同 GlossaryTerm
    app.component('GlossaryTerm', GlossaryTerm)
    app.component('G', GlossaryTerm)
    app.component('GlossaryIndex', GlossaryIndex)
    app.component('SectionDivider', SectionDivider)
    app.component('BaseLink', BaseLink)
    app.component('PrereqBox', PrereqBox)
    app.component('ChapterNote', ChapterNote)
    app.component('ChapterOpener', ChapterOpener)
    app.component('CheatSheetExport', CheatSheetExport)
    app.component('Part0SelfAssessment', Part0SelfAssessment)
    app.component('ReviewDue', ReviewDue)
    app.component('InterviewBlock', InterviewBlock)
  }
} satisfies Theme

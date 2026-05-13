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
  // 等 DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureBar)
  } else {
    ensureBar()
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

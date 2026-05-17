import DefaultTheme from 'vitepress/theme'
import { defineAsyncComponent } from 'vue'
import type { Theme } from 'vitepress'
// CSS 順序：tokens → base → components/* → layout
// W49：components.css 2772 行拆 6 子檔（CLAUDE.md §9 上限 500 / 風險最小化 / dev HMR 切片）
import './styles/tokens.css'
import './styles/base.css'
import './styles/components/editorial-marks.css'      // TLDR / ChapterMeta / Badge / Quiz / 按鈕
import './styles/components/disclaimer-scenario.css'  // Hero disclaimer / Scenario badge / Hero nav
import './styles/components/dashboard.css'            // Progress / Dashboard / Stats / 錯題本
import './styles/components/chapter-cards.css'        // Chapter cards / Part header / Hero / custom-block / Card status
import './styles/components/vp-overrides.css'         // VP nav/sidebar/outline/search/footer + Mermaid override + resume/ceremony + reading-progress
import './styles/components/diagrams-paths.css'       // figures / DecisionTree / SequenceFlow / path-decision / path-cards / em-mark / glossary-h2 / recent-update
import './styles/layout.css'

// W48：常駐元件（首頁 / 章首 / 詞彙等多處用）走同步 import
import Icon from './components/Icon.vue'
import TLDR from './components/TLDR.vue'
import ChapterMeta from './components/ChapterMeta.vue'
import ChapterCard from './components/ChapterCard.vue'
import GlossaryTerm from './components/GlossaryTerm.vue'
import SectionDivider from './components/SectionDivider.vue'
import BaseLink from './components/BaseLink.vue'
import PrereqBox from './components/PrereqBox.vue'
import ChapterOpener from './components/ChapterOpener.vue'
import NextChapterBridge from './components/NextChapterBridge.vue'
import ChapterFloatingProgress from './components/ChapterFloatingProgress.vue'
import FirstReadShortcut from './components/FirstReadShortcut.vue'

// W48：章末 / 特殊頁元件走 async import — 首頁不載、章節頁需要才下載 chunk
// 預估省 app.js 60-100 KB（reviewer #1 建議）
const Quiz = defineAsyncComponent(() => import('./components/Quiz.vue'))
const Progress = defineAsyncComponent(() => import('./components/Progress.vue'))
const Dashboard = defineAsyncComponent(() => import('./components/Dashboard.vue'))
const DashboardStats = defineAsyncComponent(() => import('./components/DashboardStats.vue'))
const GlossaryIndex = defineAsyncComponent(() => import('./components/GlossaryIndex.vue'))
const GlossaryStarLinks = defineAsyncComponent(() => import('./components/GlossaryStarLinks.vue'))
const GlossaryBackButton = defineAsyncComponent(() => import('./components/GlossaryBackButton.vue'))
const ChapterNote = defineAsyncComponent(() => import('./components/ChapterNote.vue'))
const CheatSheetExport = defineAsyncComponent(() => import('./components/CheatSheetExport.vue'))
const Part0SelfAssessment = defineAsyncComponent(() => import('./components/Part0SelfAssessment.vue'))
const ReviewDue = defineAsyncComponent(() => import('./components/ReviewDue.vue'))
const InterviewBlock = defineAsyncComponent(() => import('./components/InterviewBlock.vue'))
const PartCheckpoint = defineAsyncComponent(() => import('./components/PartCheckpoint.vue'))
const DecisionTree = defineAsyncComponent(() => import('./components/DecisionTree.vue'))
const DecisionTreeNode = defineAsyncComponent(() => import('./components/DecisionTreeNode.vue'))
const SequenceFlow = defineAsyncComponent(() => import('./components/SequenceFlow.vue'))

// Editorial 模式不再載 Material Symbols、不再需要 FOUT 防護 hook
// 字型載入由 font-display: swap 處理（Fraunces / Noto Serif TC / Noto Sans TC / JetBrains Mono）

// Reading progress 髮絲線 + a11y skip link：永久 DOM 元件、跨 SPA navigation 不重建
// progress bar 寫 width 不該再觸發 mermaid MutationObserver — Wave 30d 修法把 observer 從 body 移到 .vp-doc 解決
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
  // Wave 30d：keyboard Enter / Space 視覺回饋（瀏覽器 :active 在 Enter 觸發 click 時持續 <50ms 難看到）
  //   - 焦點在 button / a / [role=button] 時按 Enter or Space，加 .ddia-click-flash 短暫呈現 active 視覺
  //   - CSS 規則在 components.css，用 cubic-bezier 淡出 ~180ms
  const onKeyFlash = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    const target = e.target as HTMLElement | null
    if (!target || !target.matches?.('button, a, [role="button"]')) return
    target.classList.add('ddia-click-flash')
    setTimeout(() => target.classList.remove('ddia-click-flash'), 180)
  }
  // 等 DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { ensureBar(); ensureSkipLink() })
  } else {
    ensureBar()
    ensureSkipLink()
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  document.addEventListener('keydown', onKeyFlash)
}

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router }) {
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
    app.component('GlossaryStarLinks', GlossaryStarLinks)
    app.component('GlossaryBackButton', GlossaryBackButton)
    app.component('DashboardStats', DashboardStats)
    app.component('ChapterFloatingProgress', ChapterFloatingProgress)
    app.component('SectionDivider', SectionDivider)
    app.component('BaseLink', BaseLink)
    app.component('PrereqBox', PrereqBox)
    app.component('ChapterNote', ChapterNote)
    app.component('ChapterOpener', ChapterOpener)
    app.component('CheatSheetExport', CheatSheetExport)
    app.component('Part0SelfAssessment', Part0SelfAssessment)
    app.component('ReviewDue', ReviewDue)
    app.component('InterviewBlock', InterviewBlock)
    app.component('FirstReadShortcut', FirstReadShortcut)
    app.component('PartCheckpoint', PartCheckpoint)
    app.component('DecisionTree', DecisionTree)
    app.component('DecisionTreeNode', DecisionTreeNode)
    app.component('SequenceFlow', SequenceFlow)

    if (typeof window === 'undefined') return  // SSG safe（Node build 時 router 為 undefined）

    // W48：mermaid <title> 注入器已隨 plugin 拔除（DecisionTree / SequenceFlow 不需要）
    const routerWithGuard = router as unknown as Record<string, unknown>

    // ====================================================================
    // drop cap 中英混排首字防護（Wave 42）
    // ====================================================================
    // ::first-letter 在「The」這種英文起頭段會把整個 leading word 放大、視覺破碎。
    // 策略：page hydrate 後檢查 .vp-doc 內第一個 <p>（緊接 h1 或 div>h1）的第一個字、
    //       不是 CJK 漢字就在 .vp-doc 加 .no-drop-cap class，跳過 CSS drop cap rule。
    // CJK 範圍：U+4E00–U+9FFF 基本漢字 + U+3400–U+4DBF 擴展 A
    // ====================================================================
    const CJK_RE = /^[㐀-䶿一-鿿]/
    const refreshDropCap = () => {
      const root = document.querySelector('.vp-doc')
      if (!root) return
      // 找出第一個 <p> —— 緊接 h1 或在 div>h1 之後
      let p: HTMLParagraphElement | null = null
      const h1 = root.querySelector(':scope > h1')
      if (h1) p = h1.nextElementSibling as HTMLParagraphElement
      if (!p || p.tagName !== 'P') {
        const wrappedH1 = root.querySelector(':scope > div > h1')
        if (wrappedH1) p = wrappedH1.nextElementSibling as HTMLParagraphElement
      }
      if (!p || p.tagName !== 'P') {
        root.classList.remove('no-drop-cap')
        return
      }
      const firstChar = (p.textContent ?? '').trimStart().charAt(0)
      if (firstChar && !CJK_RE.test(firstChar)) {
        root.classList.add('no-drop-cap')
      } else {
        root.classList.remove('no-drop-cap')
      }
    }
    if (router && !(routerWithGuard as Record<string, unknown>).__ddiaDropCapHooked) {
      ;(routerWithGuard as Record<string, unknown>).__ddiaDropCapHooked = true
      const prevDropHook = router.onAfterRouteChanged
      router.onAfterRouteChanged = (to: string) => {
        refreshDropCap()
        if (typeof prevDropHook === 'function') prevDropHook(to)
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', refreshDropCap)
    } else {
      refreshDropCap()
    }
  }
} satisfies Theme

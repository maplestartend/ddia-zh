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
    app.component('SectionDivider', SectionDivider)
    app.component('BaseLink', BaseLink)
    app.component('PrereqBox', PrereqBox)
    app.component('ChapterNote', ChapterNote)
    app.component('ChapterOpener', ChapterOpener)
    app.component('CheatSheetExport', CheatSheetExport)
    app.component('Part0SelfAssessment', Part0SelfAssessment)
    app.component('ReviewDue', ReviewDue)
    app.component('InterviewBlock', InterviewBlock)

    // ====================================================================
    // a11y mermaid <title> 注入（Wave 29d 引入、Wave 30d 大改修效能問題）
    // ====================================================================
    // 為什麼要 inject：mermaid plugin render 出來的 <svg> 沒有 <title>，
    //   screen reader 朗讀只能讀 raw graph data，無語境。
    //   策略：用「前一個 element 的文字」當 fallback title（最多 80 字）。
    //
    // Wave 30d 修法（取代 Wave 29d observe document.body 全 subtree 的效能洩漏）：
    //   1. observe .vp-doc 而非 document.body：progress bar 寫 width / skip link
    //      / VP nav state 變動不再觸發 callback
    //   2. mutations.some 過濾：只有真有 element 加入時才掃描，跳過樣式變更等噪音
    //   3. route change 時 disconnect + 重綁新的 .vp-doc：VP SPA navigation
    //      會 unmount/remount .vp-doc，舊 observer 失效需重建
    //   4. 短裝飾字串（dinkus ◆/·/§/→ / hr / 純符號）不當 title fallback、
    //      避免 SR 朗讀「◆ ◆ ◆」或「---」
    // ====================================================================
    if (typeof window === 'undefined') return  // SSG safe（Node build 時 router 為 undefined）

    let mermaidObserver: MutationObserver | null = null
    // 純裝飾性短字（dinkus / hr / 空白 / 全形破折號 / box-drawing chars）：不可作朗讀 title
    // Wave 31b 擴充：補 box-drawing `─━│┃` + 全形破折號 `─━` + 雙引號 `「」『』` 開頭噪音
    const DECORATIVE_RE = /^[\s\-—–◆·§→·•．。、，\.\*─━│┃「」『』〈〉《》【】「」]+$/u

    const injectMermaidTitles = () => {
      const root = document.querySelector('.vp-doc')
      if (!root) return
      const svgs = root.querySelectorAll<SVGSVGElement>('svg[id*="mermaid"]')
      svgs.forEach(svg => {
        if (svg.querySelector(':scope > title')) return  // already has
        const parent = svg.closest('p, div')
        const prev = parent?.previousElementSibling
        let prevText = (prev?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80)
        if (DECORATIVE_RE.test(prevText) || prevText.length < 2) prevText = ''
        const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'title')
        titleEl.textContent = prevText || 'Mermaid 流程圖'
        svg.insertBefore(titleEl, svg.firstChild)
      })
    }

    const attachObserver = () => {
      if (mermaidObserver) { mermaidObserver.disconnect(); mermaidObserver = null }
      const root = document.querySelector('.vp-doc')
      if (!root) return
      mermaidObserver = new MutationObserver(mutations => {
        // 只有 mutation 真有 element 加入時才 inject — 跳過樣式 / 屬性 / scroll 變更等噪音
        const hasAdditions = mutations.some(m => m.type === 'childList' && m.addedNodes.length > 0)
        if (!hasAdditions) return
        requestAnimationFrame(injectMermaidTitles)
      })
      mermaidObserver.observe(root, { childList: true, subtree: true })
      requestAnimationFrame(injectMermaidTitles)
    }

    // SPA navigation：VP 在 route change 後會 unmount/remount .vp-doc
    // onAfterRouteChanged 在新 page hydrate 完才觸發，此時可安全 query 新的 .vp-doc
    //
    // Wave 31b：加 guard flag 防 HMR / dev hot reload 反覆執行 enhanceApp 時 prevHook chain
    // 無限延長（每次 reload 都會把舊 onAfterRouteChanged 包進 prevHook、最終 N 次 reload 後一次
    // route change 會觸發 N 次 attachObserver。雖然每次 attach 都 disconnect 舊的不會 leak observer，
    // 但 prevHook closure chain 會堆積 memory）。
    const routerWithGuard = router as unknown as Record<string, unknown>
    if (router && !routerWithGuard.__ddiaMermaidHooked) {
      routerWithGuard.__ddiaMermaidHooked = true
      const prevHook = router.onAfterRouteChanged
      router.onAfterRouteChanged = (to: string) => {
        attachObserver()
        if (typeof prevHook === 'function') prevHook(to)
      }
    }

    // 初次也要綁（首次載入時 router 尚未觸發 onAfterRouteChanged）
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attachObserver)
    } else {
      attachObserver()
    }
  }
} satisfies Theme

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
import CheatSheetExport from './components/CheatSheetExport.vue'
import Part0SelfAssessment from './components/Part0SelfAssessment.vue'
import ReviewDue from './components/ReviewDue.vue'
import InterviewBlock from './components/InterviewBlock.vue'

// FOUT 防護：Material Symbols 字型載入完成後才顯示圖示文字，
// 避免首屏短暫露出「schedule」「menu_book」這類字面 fallback。
// 必須包 typeof document 檢查以避免 SSG build 時報錯。
if (typeof document !== 'undefined' && 'fonts' in document) {
  document.fonts.ready.then(() => {
    document.documentElement.classList.add('fonts-loaded')
  })
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
    app.component('CheatSheetExport', CheatSheetExport)
    app.component('Part0SelfAssessment', Part0SelfAssessment)
    app.component('ReviewDue', ReviewDue)
    app.component('InterviewBlock', InterviewBlock)
  }
} satisfies Theme

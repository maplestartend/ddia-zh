<template>
  <div class="ddia-export">
    <div class="ddia-export-eyebrow">
      <Icon name="download" :size="14" filled />
      Cheat Sheet 匯出
    </div>
    <p class="ddia-export-text">
      把你的學習進度、章末測驗分數、各章個人筆記匯出成 Markdown，可印出帶去面試前一晚複習。
    </p>
    <div class="ddia-export-actions">
      <button class="ddia-btn primary" @click="downloadCheatSheet">
        <Icon name="file_download" :size="16" />
        匯出我的學習 Cheat Sheet（Markdown）
      </button>
      <button class="ddia-btn" @click="resetAll">
        <Icon name="restart_alt" :size="16" />
        重設我的進度
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from './Icon.vue'
import { CHAPTERS, PREREQUISITES } from '../../data/chapters'
import { useProgress } from '../../composables/useProgress'

const { isDone, getDoneAt, loadQuiz } = useProgress()

function readNote(chapterId: string): string {
  try {
    const raw = localStorage.getItem(`ddia-note-${chapterId}`)
    if (!raw) return ''
    return JSON.parse(raw)
  } catch {
    return ''
  }
}

function downloadCheatSheet() {
  const now = new Date()
  const dateStr = now.toLocaleString('zh-TW')

  const lines: string[] = []
  lines.push('# 我的 DDIA 學習 Cheat Sheet')
  lines.push('')
  lines.push(`> 匯出時間：${dateStr}  `)
  lines.push('> 來源：<https://maplestartend.github.io/ddia-zh/>')
  lines.push('')
  lines.push('---')
  lines.push('')

  function dumpList(label: string, list: readonly { id: string; num: string; shortTitle: string }[]) {
    lines.push(`## ${label}`)
    lines.push('')
    for (const c of list) {
      const done = isDone(c.id)
      const doneAt = getDoneAt(c.id)
      const quiz = loadQuiz(c.id)
      const note = readNote(c.id)

      const statusParts: string[] = []
      if (done) statusParts.push(`✓ 已讀（${doneAt}）`)
      else statusParts.push('☐ 未讀')
      if (quiz) {
        const first = quiz.firstAttemptScore ?? quiz.score
        const attempts = quiz.attemptCount ?? 1
        statusParts.push(`測驗：${quiz.score}/${quiz.total}（首次 ${first}/${quiz.total}、共 ${attempts} 次）`)
      }
      lines.push(`### ${c.num} ${c.shortTitle}`)
      lines.push('')
      lines.push(statusParts.join(' · '))
      lines.push('')
      if (note) {
        lines.push('**我的筆記**：')
        lines.push('')
        // 縮排 note 內容讓 markdown 視覺分明（用 > 引用塊）
        for (const ln of note.split(/\r?\n/)) {
          lines.push(`> ${ln}`)
        }
        lines.push('')
      }
    }
  }

  dumpList('Part 0 前置知識', PREREQUISITES)
  dumpList('主課程 12 章', CHAPTERS)

  const md = lines.join('\n')
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ddia-cheat-sheet-${now.toISOString().slice(0, 10)}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function resetAll() {
  if (!confirm('確定重設所有學習進度、測驗紀錄、筆記？此動作無法復原。')) return
  // 清掉 ddia- 前綴的所有 localStorage key
  const toRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('ddia-')) toRemove.push(k)
  }
  for (const k of toRemove) localStorage.removeItem(k)
  location.reload()
}
</script>

<style scoped>
/* Editorial CheatSheet 匯出區：書末附錄樣式 */
.ddia-export {
  margin: 32px 0;
  padding: 22px 0;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--rule-hairline);
  border-bottom: 1px solid var(--rule-hairline);
  border-radius: 0;
}
.ddia-export-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-display);
  font-variation-settings: "opsz" 24, "SOFT" 60, "wght" 500;
  font-style: italic;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: var(--text-tertiary);
  margin-bottom: 12px;
}
.ddia-export-eyebrow :deep(.material-symbols-rounded) {
  display: none;
}
.ddia-export-text {
  margin: 0 0 18px;
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: "opsz" 24, "SOFT" 50, "wght" 400;
  font-size: 15px;
  line-height: 1.75;
  color: var(--text-secondary);
}
.ddia-export-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
</style>

<template>
  <div class="ddia-export">
    <div class="ddia-export-eyebrow">
      <Icon name="download" :size="14" filled />
      Cheat Sheet 匯出
    </div>
    <p class="ddia-export-text">
      把你的學習進度、章末測驗分數、各章個人筆記匯出成 Markdown，可印出帶去面試前一晚複習；或匯出完整 JSON 備份，換瀏覽器 / 清快取前先抓一份。
    </p>
    <div class="ddia-export-actions">
      <button class="ddia-btn primary" @click="downloadCheatSheet">
        <Icon name="file_download" :size="16" />
        匯出 Cheat Sheet（Markdown）
      </button>
      <button class="ddia-btn" @click="downloadBackup">
        <Icon name="cloud_download" :size="16" />
        匯出完整進度（JSON 備份）
      </button>
      <button class="ddia-btn" @click="onImportClick">
        <Icon name="cloud_upload" :size="16" />
        匯入備份
      </button>
      <input ref="fileInput" type="file" accept="application/json,.json" style="display: none" @change="onFileChosen" />
    </div>

    <details class="ddia-export-danger">
      <summary>
        <span class="ddia-export-danger-mark">+</span>
        <span class="ddia-export-danger-label">危險區：重設我的進度</span>
      </summary>
      <p class="ddia-export-danger-text">
        重設會清掉所有 <code>ddia-*</code> localStorage 鍵（已讀紀錄、測驗分數、筆記、SRS 排程）。**動作不可復原**。
        建議先點上面「匯出完整進度（JSON 備份）」存一份再執行。
      </p>
      <button class="ddia-btn ddia-btn-ghost-danger" @click="resetAll">
        <Icon name="restart_alt" :size="16" />
        我確定要重設（會再確認一次）
      </button>
    </details>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Icon from './Icon.vue'
import { CHAPTERS, PREREQUISITES } from '../../data/chapters'
import { useProgress } from '../../composables/useProgress'

const { isDone, getDoneAt, loadQuiz } = useProgress()
const fileInput = ref<HTMLInputElement | null>(null)

const BACKUP_SCHEMA = 1
const PREFIX = 'ddia-'
interface BackupPayload {
  schema: number
  exportedAt: string
  source: string
  data: Record<string, string>  // localStorage key → raw string (JSON.stringify 已內含)
}

function collectBackup(): BackupPayload {
  const data: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k || !k.startsWith(PREFIX)) continue
    const v = localStorage.getItem(k)
    if (v != null) data[k] = v
  }
  return {
    schema: BACKUP_SCHEMA,
    exportedAt: new Date().toISOString(),
    source: 'https://maplestartend.github.io/ddia-zh/',
    data
  }
}

function downloadBackup() {
  const payload = collectBackup()
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ddia-progress-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function onImportClick() {
  fileInput.value?.click()
}

function isBackupPayload(v: unknown): v is BackupPayload {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return typeof o.schema === 'number'
    && typeof o.data === 'object' && o.data !== null
}

async function onFileChosen(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''  // 清空 input 讓使用者能重選同檔
  if (!file) return
  try {
    const text = await file.text()
    const parsed = JSON.parse(text)
    if (!isBackupPayload(parsed)) {
      alert('檔案格式不符。請選 ddia-progress-backup-*.json 備份檔。')
      return
    }
    if (parsed.schema !== BACKUP_SCHEMA) {
      // 未來若 schema 升版、這裡接 migration；目前只有 v1
      if (!confirm(`備份檔 schema=${parsed.schema}、目前版本=${BACKUP_SCHEMA}。仍要嘗試匯入嗎？舊版本可能含已棄用 key、新版邏輯讀到會自動忽略。`)) return
    }
    if (!confirm('匯入會覆蓋目前所有學習進度、測驗紀錄、筆記。確定繼續？')) return
    // 先刪掉現有 ddia-* keys、再寫入備份內容
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) toRemove.push(k)
    }
    for (const k of toRemove) localStorage.removeItem(k)
    for (const [k, v] of Object.entries(parsed.data)) {
      if (typeof v === 'string' && k.startsWith(PREFIX)) {
        try { localStorage.setItem(k, v) } catch { /* quota — 跳過 */ }
      }
    }
    alert('匯入完成、即將重新載入頁面。')
    location.reload()
  } catch (err) {
    alert(`匯入失敗：${err instanceof Error ? err.message : '未知錯誤'}`)
  }
}

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
  font-variation-settings: var(--fvar-eyebrow-warm);
  font-style: italic;
  font-size: var(--type-eyebrow);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--ls-eyebrow);
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
  font-variation-settings: var(--fvar-italic-note);
  font-size: 15px;
  line-height: 1.75;
  color: var(--text-secondary);
}
.ddia-export-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

/* 危險區：摺疊式 details、italic 印刷感 + / − 印記取代 ▾ 三角箭頭 */
.ddia-export-danger {
  margin-top: 28px;
  padding-top: 18px;
  border-top: 1px dashed var(--rule-hairline);
}
.ddia-export-danger summary {
  list-style: none;
  cursor: pointer;
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-2);
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: var(--fvar-eyebrow);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--text-tertiary);
}
.ddia-export-danger summary::-webkit-details-marker {
  display: none;
}
.ddia-export-danger-mark {
  font-family: var(--font-display);
  font-style: normal;
  font-size: 18px;
  line-height: 1;
  color: var(--text-tertiary);
  width: 16px;
  display: inline-flex;
  justify-content: center;
}
.ddia-export-danger[open] .ddia-export-danger-mark::before {
  content: "−";
}
.ddia-export-danger:not([open]) .ddia-export-danger-mark::before {
  content: "+";
}
.ddia-export-danger-mark {
  /* hide the literal "+" character — show via ::before based on [open] */
  visibility: hidden;
  position: relative;
}
.ddia-export-danger-mark::before {
  visibility: visible;
  position: absolute;
  left: 0;
  right: 0;
}
.ddia-export-danger-text {
  margin: 12px 0 14px;
  font-family: var(--font-body);
  font-size: var(--type-small);
  line-height: 1.75;
  color: var(--text-secondary);
}
</style>

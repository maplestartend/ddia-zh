// 詞彙連結化 lint。
// 掃描 docs/**/*.md，找出「詞彙表已收錄、但內文是純文字、沒包 <G>」的位置。
//
// 用法：
//   node scripts/lint-glossary.mjs              全部章節
//   node scripts/lint-glossary.mjs part-1/      只掃某目錄
//   node scripts/lint-glossary.mjs --json       輸出 JSON 給後續工具吃
//
// 設計原則：
//   - 只「提醒」、不自動改—— 中文無空格分詞，誤殺風險高（例：「行程」匹配「執行程式碼」）
//   - 一個詞每檔案最多回報 3 次（避免雜訊）
//   - 跳過 code block、已有 <G>、已有 markdown link
//   - 排序：每章按「最常出現的未標記詞」優先列出
//
// 預期用法：先看回報、人工挑值得標的詞、手動在文章首次出現處加 <G>—— 不必每處都加。

import { readFile, readdir } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..')
const DOCS = join(ROOT, 'docs')

// .ts 不能直接 import；改為解析檔內容抓 term/chinese/english
const glossarySrc = await readFile(join(DOCS, '.vitepress', 'data', 'glossary.ts'), 'utf-8')

// 從 glossary.ts 內容解析出所有 entry 的 term / chinese / english
// 修正：用「先抓 entry block、再從 block 內逐欄位 match」避免 `[\s\S]*?` 跨 entry 抓錯。
function parseGlossary() {
  const entries = []
  // 抓每個 GlossaryEntry 物件字面值（從 `{ term:` 到下一個 `}`）
  const blockRe = /\{\s*term:[^}]*\}/g
  let block
  while ((block = blockRe.exec(glossarySrc)) !== null) {
    const body = block[0]
    const term    = (body.match(/term:\s*'([^']+)'/)    || [])[1]
    const chinese = (body.match(/chinese:\s*'([^']+)'/) || [])[1]
    const english = (body.match(/english:\s*'([^']+)'/) || [])[1]
    if (!term || !chinese || !english) continue
    const m = [null, term, chinese, english]
    // english 可能含括號（如 "Two-Phase Commit (2PC)"），生出多種偵測 pattern
    const englishCore = english.replace(/\s*\([^)]*\)\s*/g, '').trim()
    const englishParen = (english.match(/\(([^)]+)\)/) || [])[1]
    const patterns = [chinese, englishCore]
    if (englishParen && englishParen !== englishCore) patterns.push(englishParen)
    // 去掉太短（< 3 字）的純英文 pattern，誤殺率太高
    const filtered = patterns.filter(p => {
      if (/^[A-Za-z]+$/.test(p) && p.length < 3) return false
      return true
    })
    entries.push({ key: term, patterns: filtered })
  }
  return entries
}

const TERMS = parseGlossary()

// 找出檔案中「不在 code block、不在 <G>、不在 markdown link 內」的純文字區段
function strippedRanges(content) {
  // 移除 fenced code block ```...```
  let s = content.replace(/```[\s\S]*?```/g, m => ' '.repeat(m.length))
  // 移除 inline code `...`
  s = s.replace(/`[^`\n]+`/g, m => ' '.repeat(m.length))
  // 移除 <G ...>...</G>
  s = s.replace(/<G\s[^>]*>[\s\S]*?<\/G>/g, m => ' '.repeat(m.length))
  // 移除 markdown link [text](url)
  s = s.replace(/\[[^\]]+\]\([^)]+\)/g, m => ' '.repeat(m.length))
  // 移除 HTML 標籤本體（保留純文字）
  s = s.replace(/<[^>]+>/g, m => ' '.repeat(m.length))
  // 移除 frontmatter
  s = s.replace(/^---[\s\S]*?---\n/, m => ' '.repeat(m.length))
  return s
}

function lineOf(content, idx) {
  return content.slice(0, idx).split('\n').length
}

async function walk(dir) {
  const out = []
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name.startsWith('.')) continue
      out.push(...await walk(p))
    } else if (ent.name.endsWith('.md')) {
      out.push(p)
    }
  }
  return out
}

const filterArg = process.argv.slice(2).find(a => !a.startsWith('--'))
const wantJson = process.argv.includes('--json')

const files = (await walk(DOCS)).filter(f => {
  // 詞彙表本身就是定義來源，不需要把詞彙都包成 <G>（會循環）
  if (f.includes(`${sep}glossary${sep}`)) return false
  if (!filterArg) return true
  return f.includes(filterArg.replace(/\//g, sep))
})

const PER_TERM_LIMIT = 3
const report = []

for (const file of files) {
  const content = await readFile(file, 'utf-8')
  const stripped = strippedRanges(content)
  const hits = []

  for (const t of TERMS) {
    let hitCount = 0
    for (const pat of t.patterns) {
      if (hitCount >= PER_TERM_LIMIT) break
      // 簡單 indexOf 掃描所有出現位置
      let from = 0
      while (true) {
        const idx = stripped.indexOf(pat, from)
        if (idx < 0) break
        // 中文 pattern 前後必須不是中英文字母（避開「執行程式碼」誤殺「行程」）
        if (/[一-鿿]/.test(pat[0])) {
          const before = stripped[idx - 1] || ''
          const after = stripped[idx + pat.length] || ''
          if (/[一-鿿A-Za-z0-9]/.test(before) || /[一-鿿A-Za-z0-9]/.test(after)) {
            from = idx + 1
            continue
          }
        } else {
          // 英文 pattern 前後必須不是字母（避開 "TCP" 誤殺 "rTCPx"）
          const before = stripped[idx - 1] || ''
          const after = stripped[idx + pat.length] || ''
          if (/[A-Za-z0-9_]/.test(before) || /[A-Za-z0-9_]/.test(after)) {
            from = idx + 1
            continue
          }
        }
        hits.push({ term: t.key, pattern: pat, line: lineOf(content, idx) })
        hitCount++
        if (hitCount >= PER_TERM_LIMIT) break
        from = idx + pat.length
      }
    }
  }

  if (hits.length === 0) continue
  // 同檔內按 term 排序
  hits.sort((a, b) => a.term.localeCompare(b.term) || a.line - b.line)
  report.push({ file: relative(ROOT, file), hits })
}

if (wantJson) {
  console.log(JSON.stringify(report, null, 2))
} else {
  if (report.length === 0) {
    console.log('✅ 沒有發現未標記的詞彙——所有出現的詞都已包 <G> 或在 code/link 中')
    process.exit(0)
  }
  // 統計：哪個詞被漏最多次
  const termStats = new Map()
  for (const r of report) {
    for (const h of r.hits) {
      termStats.set(h.term, (termStats.get(h.term) || 0) + 1)
    }
  }
  const sortedTerms = [...termStats.entries()].sort((a, b) => b[1] - a[1])

  console.log(`📋 詞彙連結化 lint 報告\n`)
  console.log(`掃描 ${files.length} 個 markdown 檔，找到 ${report.length} 個檔有未標記詞彙\n`)
  console.log(`─── 最常漏標的詞 (Top 15) ───`)
  for (const [term, count] of sortedTerms.slice(0, 15)) {
    console.log(`  ${count.toString().padStart(3)} × ${term}`)
  }
  console.log(`\n─── 各檔詳細 ───`)
  for (const r of report) {
    console.log(`\n📄 ${r.file}`)
    for (const h of r.hits) {
      console.log(`   L${h.line.toString().padStart(4)}  ${h.pattern.padEnd(24)} → <G term="${h.term}">`)
    }
  }
  console.log(`\n總計 ${report.reduce((s, r) => s + r.hits.length, 0)} 個位置可以套 <G>。`)
  console.log(`提醒：不必每處都改，只需在每章「首次有意義出現」加上 <G> 即可。`)
}

// 詞彙連結化 lint：掃 docs/**/*.md，找出「詞彙表已收錄、但內文是純文字、沒用 <G> 包」的位置。
//
// 為什麼不自動修：
//   - 中文沒空格分詞，純 regex 自動替換容易誤殺（例：「行程」會匹配到「執行程式」）
//   - 同一詞彙在一篇中通常只第一次出現要包 <G>（避免每段都標、視覺太雜）
//   - 在程式碼區塊、URL、已存在的 link 內不該替換
//
// 輸出：每章列出「應該考慮包 <G> 的位置」，作者再人工挑要不要補。
//
// 用法：node scripts/glossary-lint.mjs [--all]
//   --all：列出每章所有命中（預設只列每章每詞第一次出現）

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, relative, join } from 'node:path'

function walkMd(dir, results = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules') continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walkMd(full, results)
    else if (name.endsWith('.md')) results.push(full)
  }
  return results
}

const ROOT = resolve(process.cwd())
const ARG_ALL = process.argv.includes('--all')

// 動態載入 glossary SSOT（.ts 檔——用 tsx 跑或先 build；這裡直接讀 source 用 regex 抽 term 清單）
// 比依賴 tsx 簡單、夠用。
const glossaryRaw = readFileSync(resolve(ROOT, 'docs/.vitepress/data/glossary.ts'), 'utf-8')

// 抽出每個 entry 的關鍵字串：term + chinese + english + aliases
// 形式：{ term: 'quorum', ..., chinese: '法定人數', english: 'Quorum', aliases: ['q'] }
const entries = []
const entryBlocks = glossaryRaw.match(/\{\s*term:[^}]+\}/gs) || []
for (const block of entryBlocks) {
  const term = block.match(/term:\s*'([^']+)'/)?.[1]
  const chinese = block.match(/chinese:\s*'([^']+)'/)?.[1]
  const english = block.match(/english:\s*'([^']+)'/)?.[1]
  if (!term) continue
  const keywords = new Set()
  // 中文名稱：常見最容易匹配，但要小心歧義（例如「鎖」太短）
  if (chinese && chinese.length >= 2) keywords.add(chinese)
  // 英文全名：通常專有名詞、不太歧義
  if (english) {
    // english 可能含括號、空格——先抽主名稱
    const main = english.replace(/\s*\([^)]+\)\s*/g, '').trim()
    if (main.length >= 2) keywords.add(main)
  }
  entries.push({ term, keywords: [...keywords] })
}

console.log(`已載入 ${entries.length} 個詞彙、共 ${entries.reduce((s,e)=>s+e.keywords.length,0)} 個關鍵字串\n`)

// 掃 markdown，跳過 .vitepress 與 glossary 本身（glossary 內容是定義詞彙、本來就會出現詞彙名）
const mdFiles = walkMd(resolve(ROOT, 'docs'))
  .filter(f => !f.includes(`docs${'\\'}.vitepress`) && !f.includes(`docs/.vitepress`))
  .filter(f => !f.includes(`docs${'\\'}glossary`) && !f.includes(`docs/glossary`))
const findings = []

for (const full of mdFiles) {
  const file = relative(ROOT, full)
  let content = readFileSync(full, 'utf-8')

  // 移除程式碼區塊（避免在 ```...``` 內匹配）
  content = content.replace(/```[\s\S]*?```/g, m => ' '.repeat(m.length))
  // 移除 inline code
  content = content.replace(/`[^`\n]+`/g, m => ' '.repeat(m.length))
  // 移除 markdown link 的 url 部分（保留可見文字）：[text](url) → text
  //   但保留前面的 text 以便偵測詞彙
  content = content.replace(/\[([^\]]+)\]\([^)]+\)/g, (_, t) => t + '  ')
  // 移除已存在的 <G ...>...</G>：避免重複報已包的
  content = content.replace(/<G[^>]*>[^<]*<\/G>/gi, m => ' '.repeat(m.length))
  // 移除 HTML 屬性區（避免在 prop 值內匹配）
  content = content.replace(/<[^>]+>/g, m => ' '.repeat(m.length))
  // 移除 frontmatter（檔頭 ---...--- 之間）
  content = content.replace(/^---[\s\S]*?---\n/, m => ' '.repeat(m.length))

  const fileFindings = new Map()  // term → [positions]

  for (const entry of entries) {
    for (const kw of entry.keywords) {
      // 中文 keyword 直接 indexOf；英文 keyword 加 word boundary
      let pos = -1
      const isChinese = /[一-鿿]/.test(kw)
      if (isChinese) {
        pos = content.indexOf(kw)
      } else {
        const m = content.match(new RegExp(`(?<![A-Za-z0-9_-])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9_-])`))
        pos = m ? m.index : -1
      }
      if (pos !== -1) {
        if (!fileFindings.has(entry.term)) fileFindings.set(entry.term, [])
        fileFindings.get(entry.term).push({ kw, pos })
        if (!ARG_ALL) break  // 預設一個詞只回報第一個 keyword 命中
      }
    }
  }

  if (fileFindings.size > 0) {
    findings.push({ file: relative(ROOT, full), terms: fileFindings, source: content })
  }
}

// 報告
let totalSuggestions = 0
for (const { file, terms, source } of findings) {
  console.log(`\n=== ${file} ===`)
  const sorted = [...terms.entries()].sort((a, b) => a[1][0].pos - b[1][0].pos)
  for (const [term, hits] of sorted) {
    const { kw, pos } = hits[0]
    // 取上下文 30 字
    const start = Math.max(0, pos - 15)
    const end = Math.min(source.length, pos + kw.length + 15)
    const ctx = source.slice(start, end).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
    console.log(`  [${term}]  …${ctx}…`)
    totalSuggestions++
  }
}

console.log(`\n\n--- 總計：${findings.length} 個檔案、${totalSuggestions} 個建議補 <G> 的位置 ---`)
console.log(`用 --all 看每章所有命中（含同詞多次）`)

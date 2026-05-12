// TLDR 禁字 lint：偵測「某章 TLDR 用了該章之後才會講的詞」。
//
// 用法：
//   node scripts/lint-tldr.mjs              全部章節（Part 0 預設 ignore forward refs）
//   node scripts/lint-tldr.mjs --strict     不啟用 prereq-mode、包含 Part 0
//   node scripts/lint-tldr.mjs --json       JSON 輸出
//
// 設計：
//   - 章節順序定義在 data/chapters.ts（PREREQUISITES + CHAPTERS）
//   - 詞彙的「主要章節」定義在 data/glossary.ts 的 `chapter` 欄位
//   - 偵測：章 X 的 TLDR 內出現詞 W、但 W.chapter 指向 X 之後的章 → flag
//
// **Prereq-mode**（預設啟用）：
//   Part 0 章是設計為「為後續章節做暖身」、TLDR 引用 Part 1+ 詞是合理的
//   forward reference（學習者讀完該章後在 Part 1+ 才會看到完整定義）。
//   預設 ignore 這類 case；要看 Part 0 內部問題請加 --strict。
//
// 範例：0.2 metrics.md 的 TLDR 用了 fan-out / SLA，這兩個詞 chapter 也指 0.2，OK。
// 但若 0.4 os.md 的 TLDR 用 SSTable，而 SSTable.chapter 指 Ch3 → 預設 ignore（Part 0 章預告 Ch3），
// 在 --strict 模式下才會 flag。

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const ROOT = process.cwd()
const wantJson = process.argv.includes('--json')
const strictMode = process.argv.includes('--strict')

// 解析 glossary.ts 抽出 term / patterns / chapter
const glossarySrc = await readFile(resolve(ROOT, 'docs/.vitepress/data/glossary.ts'), 'utf-8')
function parseGlossary() {
  const entries = []
  const blockRe = /\{\s*term:[^}]*\}/g
  let block
  while ((block = blockRe.exec(glossarySrc)) !== null) {
    const body = block[0]
    const term = (body.match(/term:\s*'([^']+)'/) || [])[1]
    const chinese = (body.match(/chinese:\s*'([^']+)'/) || [])[1]
    const english = (body.match(/english:\s*'([^']+)'/) || [])[1]
    const chapter = (body.match(/chapter:\s*'([^']+)'/) || [])[1]
    if (!term) continue
    const englishCore = (english || '').replace(/\s*\([^)]*\)\s*/g, '').trim()
    const englishParen = ((english || '').match(/\(([^)]+)\)/) || [])[1]
    const patterns = [chinese, englishCore].filter(Boolean)
    if (englishParen && englishParen !== englishCore) patterns.push(englishParen)
    entries.push({ term, patterns, chapter })
  }
  return entries
}
const TERMS = parseGlossary()

// 解析 chapters.ts 拿章節順序：PREREQUISITES 邏輯上**在前**（雖然原檔寫在後）
// 因此分別解析 CHAPTERS 與 PREREQUISITES 兩塊、組裝順序為 [...PREREQUISITES, ...CHAPTERS]
//
// 注意陷阱：用 indexOf('[') 會抓到 `readonly Chapter[]` 型別註解的空方括號、不是真陣列開頭。
// 因此用 `= [` 當錨點、且用括號平衡掃描找配對 `]`（entry 內可能還有巢狀方括號）。
const chaptersSrc = await readFile(resolve(ROOT, 'docs/.vitepress/data/chapters.ts'), 'utf-8')
function parseChapters() {
  function extractBlock(arrayName) {
    const decl = chaptersSrc.indexOf(`${arrayName}:`)
    if (decl < 0) return []
    const eqBracket = chaptersSrc.indexOf('= [', decl)
    if (eqBracket < 0) return []
    let depth = 0
    let bodyStart = eqBracket + 2  // 指向 '['
    let bodyEnd = -1
    for (let i = bodyStart; i < chaptersSrc.length; i++) {
      const c = chaptersSrc[i]
      if (c === '[') depth++
      else if (c === ']') {
        depth--
        if (depth === 0) { bodyEnd = i; break }
      }
    }
    if (bodyEnd < 0) return []
    const body = chaptersSrc.slice(bodyStart + 1, bodyEnd)
    const out = []
    // entry 內 id / link 都是 string 字面值、不會被 `}` 隔開（entry 沒有巢狀物件）
    // 但保險用 [\s\S]*? 而非 [^}]*?，且要求 link 必須在 id 之後
    const re = /id:\s*'([^']+)'[\s\S]*?link:\s*'([^']+)'/g
    let m
    while ((m = re.exec(body)) !== null) {
      out.push({ id: m[1], link: m[2] })
    }
    return out
  }
  const prereq = extractBlock('PREREQUISITES')
  const chapters = extractBlock('CHAPTERS')
  return [...prereq, ...chapters]
}
const CHAPTER_ORDER = parseChapters()  // PREREQUISITES → CHAPTERS
const linkToOrder = new Map(CHAPTER_ORDER.map((c, i) => [c.link, i]))

// 從一個 md 檔抽所有 TLDR 內 raw text（同檔多個 TLDR 都要檢查）。
// 直接抓 <TLDR ... :points='...' /> 那個單引號內容當文字搜尋目標即可。
function extractTldr(content) {
  const all = []
  // /g 抓所有 TLDR 區塊
  const re = /<TLDR[\s\S]*?:points='\[([\s\S]*?)\]'\s*\/?>/g
  let m
  while ((m = re.exec(content)) !== null) {
    all.push(m[1])
  }
  return all
}

// 對每個有 TLDR 的 markdown 檔：找 TLDR 內提到的詞、若詞主章在本章之後 → flag
const { readdir } = await import('node:fs/promises')
async function walk(dir) {
  const out = []
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue
    const p = `${dir}/${ent.name}`
    if (ent.isDirectory()) out.push(...await walk(p))
    else if (ent.name.endsWith('.md')) out.push(p)
  }
  return out
}

const files = await walk(resolve(ROOT, 'docs'))
const report = []

// PREREQUISITES 區段（Part 0）—— 在預設 prereq-mode 下不檢查 forward refs
const PREREQ_LINKS = new Set(CHAPTER_ORDER.filter(c => c.link.startsWith('/part-0/')).map(c => c.link))

for (const file of files) {
  const content = await readFile(file, 'utf-8')
  const tldr = extractTldr(content)
  if (tldr.length === 0) continue
  // 從檔名 → link → order
  const rel = file.replace(/\\/g, '/').replace(/^.*\/docs/, '').replace(/\.md$/, '')
  const myOrder = linkToOrder.get(rel)
  if (myOrder === undefined) continue
  // Prereq-mode：Part 0 章本來就是為後續章節暖身，預設不檢查 forward refs
  if (!strictMode && PREREQ_LINKS.has(rel)) continue
  const tldrText = tldr.join(' ')
  const issues = []
  for (const t of TERMS) {
    if (!t.chapter) continue
    const termOrder = linkToOrder.get(t.chapter)
    if (termOrder === undefined || termOrder <= myOrder) continue  // 本章或之前的詞 OK
    // 偵測 TLDR 是否含這個詞（用任一 pattern）
    for (const pat of t.patterns) {
      if (tldrText.includes(pat)) {
        issues.push({ term: t.term, pattern: pat, definedAt: t.chapter })
        break
      }
    }
  }
  if (issues.length > 0) report.push({ file: rel, issues })
}

if (wantJson) {
  console.log(JSON.stringify(report, null, 2))
} else {
  if (report.length === 0) {
    console.log('✅ TLDR 沒有用到「本章之後才會講的詞」')
    process.exit(0)
  }
  console.log(`⚠️  TLDR 禁字 lint：${report.length} 個檔案的 TLDR 用了後續章節才講的詞\n`)
  for (const r of report) {
    console.log(`📄 ${r.file}.md`)
    for (const i of r.issues) {
      console.log(`   ${i.pattern.padEnd(24)} ← <G term="${i.term}">  (定義在 ${i.definedAt})`)
    }
    console.log('')
  }
  console.log(`提醒：TLDR 是讀者第一眼看的內容、應該都是本章會展開的概念。`)
  console.log(`處理：(a) 改用更白話的詞、或 (b) 直接在 TLDR 內用括號定義、或 (c) 把詞挪到後段。`)
}

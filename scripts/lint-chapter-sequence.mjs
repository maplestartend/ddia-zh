// 驗證 12 章 + Part 0 markdown 的章末元件序列、避免 Wave 30e 那種「憑印象判定死代碼」重演。
//
// 偵測：docs/part-{0,1,2,3}/*.md 內 <Quiz / <InterviewBlock / <ChapterNote / <Progress
//   / <NextChapterBridge 出現順序、callout (:::) 是否夾在序列中。
//
// 允許的序列模式（與 base.css adjacency 規則對應、Wave 30.1 hotfix 後 4 種）：
//   A. Quiz → Bridge                                          (Part 0 七章)
//   B. Quiz → Note → Progress → Bridge                        (ch02/04/06/08/10/12)
//   C. Quiz → Note → Progress → Callout → Bridge              (ch03)
//   D. Quiz → Interview → Note → Progress → Callout → Bridge  (ch01/05/07/09/11)
//
// 用法：
//   node scripts/lint-chapter-sequence.mjs           列出每章序列（exit 0）
//   node scripts/lint-chapter-sequence.mjs --strict  未匹配任何模式即 exit 1

import { readFile, readdir } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..')
const PARTS_DIR = join(ROOT, 'docs')

const argv = process.argv.slice(2)
const STRICT = argv.includes('--strict')
const VERBOSE = argv.includes('--verbose') || argv.includes('-v')

const ALLOWED = [
  { name: 'A · Part 0 短序列',         seq: ['Quiz', 'Bridge'] },
  { name: 'B · 主課省 Interview + callout', seq: ['Quiz', 'Note', 'Progress', 'Bridge'] },
  { name: 'C · 主課省 Interview',       seq: ['Quiz', 'Note', 'Progress', 'Callout', 'Bridge'] },
  { name: 'D · 主課完整',               seq: ['Quiz', 'Interview', 'Note', 'Progress', 'Callout', 'Bridge'] },
  { name: 'E · 暖身導讀（無 Quiz）',     seq: ['Callout', 'Bridge'] }  // Part 0 basics 等暖身章節
]

async function walk(dir, depth = 0) {
  const out = []
  let entries
  try { entries = await readdir(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      // 只往 docs/part-X 子目錄遞迴、不爬 .vitepress / glossary / paths / bridges 等
      if (depth === 0 && /^part-[0-3]$/.test(e.name)) out.push(...await walk(p, depth + 1))
      else if (depth > 0) out.push(...await walk(p, depth + 1))
    } else if (depth > 0 && e.isFile() && e.name.endsWith('.md') && e.name !== 'index.md') {
      // 只在 part-X 內收集 .md（排除 progress.md / paths/index.md 等根目錄檔）
      out.push(p)
    }
  }
  return out
}

// 偵測順序：找每個 marker 第一次出現的位置
const MARKERS = [
  { tag: 'Quiz',      re: /^<Quiz\b/m },
  { tag: 'Interview', re: /^<InterviewBlock\b/m },
  { tag: 'Note',      re: /^<ChapterNote\b/m },
  { tag: 'Progress',  re: /^<Progress\b/m },
  { tag: 'Bridge',    re: /^<NextChapterBridge\b/m }
]

function extractSequence(text) {
  // 找每個 marker 第一次出現位置
  const positions = []
  for (const { tag, re } of MARKERS) {
    const m = re.exec(text)
    if (m) positions.push({ tag, pos: m.index })
  }
  // 找最後一個章末 callout（::: info / ::: warning ...）位置 — 必須在 Quiz 之後且在 Bridge 之前
  const quizPos = positions.find(p => p.tag === 'Quiz')?.pos ?? -1
  const bridgePos = positions.find(p => p.tag === 'Bridge')?.pos ?? Infinity
  // ::: 開頭、且 ::: 後不是緊接 :::（避免結尾 :::）
  const calloutRe = /^:::\s*(?:info|tip|warning|danger)\b/gm
  let callout = null
  let cm
  while ((cm = calloutRe.exec(text)) !== null) {
    if (cm.index > quizPos && cm.index < bridgePos) {
      callout = { tag: 'Callout', pos: cm.index }
      // 不 break：找到 quiz<→bridge 之間最早的 callout
      break
    }
  }
  if (callout) positions.push(callout)
  positions.sort((a, b) => a.pos - b.pos)
  return positions.map(p => p.tag)
}

function matchesPattern(seq) {
  return ALLOWED.find(p =>
    p.seq.length === seq.length &&
    p.seq.every((s, i) => s === seq[i])
  )
}

const files = await walk(PARTS_DIR)
const results = []
for (const file of files) {
  const text = await readFile(file, 'utf8')
  const seq = extractSequence(text)
  if (seq.length === 0) continue  // index.md 或無章末元件的檔
  const matched = matchesPattern(seq)
  const rel = relative(ROOT, file).split(sep).join('/')
  results.push({ file: rel, seq, matched })
}

const unmatched = results.filter(r => !r.matched)

if (VERBOSE || unmatched.length > 0) {
  console.log(`\n  ${results.length} 章末序列偵測結果：\n`)
  for (const r of results) {
    const mark = r.matched ? '✓' : '✗'
    const pattern = r.matched ? `(${r.matched.name})` : '(未對映任何已知模式)'
    console.log(`    ${mark} ${r.file}: [${r.seq.join(' → ')}] ${pattern}`)
  }
}

if (unmatched.length === 0) {
  console.log(`\n✓ lint:chapter-sequence — 全 ${results.length} 章末序列符合 ${ALLOWED.length} 種已知模式（A-${String.fromCharCode(64 + ALLOWED.length)}）`)
  console.log('  base.css adjacency 規則 fully cover 所有實際章節')
  process.exit(0)
}

console.log(`\n✗ lint:chapter-sequence — ${unmatched.length} 章末序列未對映任何已知模式\n`)
console.log('  新章節需要更新 base.css adjacency 規則。已知 4 種：')
for (const p of ALLOWED) {
  console.log(`    ${p.name}: ${p.seq.join(' → ')}`)
}
process.exit(STRICT ? 1 : 0)

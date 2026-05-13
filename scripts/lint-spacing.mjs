// Spacing token ratchet：偵測 raw `margin: Npx` 與 `padding: Npx` 在 theme/styles 與
// theme/components 內 — 應使用 --space-* / --gap-* token。
//
// 用法：
//   node scripts/lint-spacing.mjs           全掃、warning 模式（exit 0）
//   node scripts/lint-spacing.mjs --strict  發現即 exit 1（CI 阻擋）
//
// 偵測規則：
//   - 任何 .css / .vue scoped style 內的 `margin: <px values>;` / `padding: <px values>;`
//   - 排除 tokens.css（token 定義本身）
//   - 排除 1px / 2px / 3px（border / outline 用、不是 spacing）
//
// 設計目標：non-blocking 訊號；--strict 才阻擋。

import { readFile, readdir } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..')
const ROOTS = [
  join(ROOT, 'docs', '.vitepress', 'theme', 'styles'),
  join(ROOT, 'docs', '.vitepress', 'theme', 'components')
]

const argv = process.argv.slice(2)
const STRICT = argv.includes('--strict')

const EXCLUDE = new Set(['tokens.css'])

async function walk(dir) {
  const out = []
  let entries
  try { entries = await readdir(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...await walk(p))
    else if (e.isFile() && /\.(css|vue)$/.test(e.name) && !EXCLUDE.has(e.name)) out.push(p)
  }
  return out
}

// 偵測 margin / padding 帶 raw px、且該 px 值 >= 4（< 4 通常是 border 或微調）
const MP_RE = /(margin|padding)(?:-(?:top|right|bottom|left|block|inline))?:\s*([^;\n]+?);/g

function hasRawPx(value) {
  // 拆 value 內每個 token、看是不是 raw px ≥ 4
  const tokens = value.split(/\s+/)
  for (const t of tokens) {
    const m = /^(\d+(?:\.\d+)?)px$/.exec(t)
    if (!m) continue
    const n = parseFloat(m[1])
    if (n >= 4) return true
  }
  return false
}

const findings = []
for (const r of ROOTS) {
  for (const file of await walk(r)) {
    const text = await readFile(file, 'utf8')
    const rel = relative(ROOT, file).split(sep).join('/')
    let m
    while ((m = MP_RE.exec(text)) !== null) {
      const prop = m[1]
      const value = m[2].trim()
      // var(--*) 直接跳過、已收
      if (/var\(/.test(value)) continue
      if (!hasRawPx(value)) continue
      const line = text.slice(0, m.index).split('\n').length
      findings.push({ file: rel, line, prop, value })
    }
  }
}

if (findings.length === 0) {
  console.log('✓ lint:spacing — 沒有 raw margin/padding px 反模式')
  process.exit(0)
}

console.log(`✗ lint:spacing — 偵測到 ${findings.length} 處 raw spacing 值（建議改 var(--space-*) / var(--gap-*)）`)
const byFile = new Map()
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, [])
  byFile.get(f.file).push(f)
}
for (const [file, list] of byFile) {
  console.log(`\n  ${file}:`)
  for (const f of list) {
    console.log(`    L${f.line}: ${f.prop}: ${f.value}`)
  }
}
console.log(`\n  共 ${findings.length} 處於 ${byFile.size} 檔。spacing 對映：4→--space-1, 8→--space-2, 16→--space-3, 24→--space-4, 40→--space-5, 64→--space-6`)
process.exit(STRICT ? 1 : 0)

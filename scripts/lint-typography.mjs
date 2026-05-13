// Typography token ratchet：偵測 raw `font-size: Npx` 與 raw `letter-spacing: N.Nem` 是否
// 在 theme/styles 與 theme/components 內 — 應使用 --type-* / --ls-* token。
//
// 用法：
//   node scripts/lint-typography.mjs           全掃、warning 模式（exit 0）
//   node scripts/lint-typography.mjs --strict  發現即 exit 1（CI 阻擋）
//
// 偵測規則：
//   - 任何 .css / .vue scoped style 內的 `font-size: \d+(\.\d+)?px;`
//   - 任何 `letter-spacing: 0\.\d+em;`（除 0.005em 之類「微調」）
//   - 排除 tokens.css（token 定義本身）
//
// 設計目標：non-blocking 訊號（預設 exit 0）給 CI summary 看；
//   --strict 才阻擋，等 sweep 接近完成後接進 ci.yml。

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

// 跳過 tokens.css —— 那是 token 本體定義
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

const FONT_SIZE_RE = /font-size:\s*(\d+(?:\.\d+)?)px/g
const LS_RE = /letter-spacing:\s*0\.\d+em/g
// Wave 33d allowlist：行內 `/* lint-typography-allow: reason */` 註解 skip 該行
// 用於：書本印刷設計級值（dinkus 0.8em / ceremony 0.6em / quiz-difficulty 0.12em / 9px dot 等）
const ALLOW_RE = /\/\*\s*lint-typography-allow\b/

function lineOf(text, idx) {
  return text.slice(0, idx).split('\n').length
}
function lineText(text, idx) {
  const start = text.lastIndexOf('\n', idx) + 1
  const end = text.indexOf('\n', idx)
  return text.slice(start, end === -1 ? text.length : end)
}

const findings = []
for (const r of ROOTS) {
  for (const file of await walk(r)) {
    const text = await readFile(file, 'utf8')
    const rel = relative(ROOT, file).split(sep).join('/')
    let m
    while ((m = FONT_SIZE_RE.exec(text)) !== null) {
      if (ALLOW_RE.test(lineText(text, m.index))) continue
      findings.push({ file: rel, line: lineOf(text, m.index), type: 'font-size', match: m[0] })
    }
    while ((m = LS_RE.exec(text)) !== null) {
      if (ALLOW_RE.test(lineText(text, m.index))) continue
      findings.push({ file: rel, line: lineOf(text, m.index), type: 'letter-spacing', match: m[0] })
    }
  }
}

if (findings.length === 0) {
  console.log('✓ lint:typography — 沒有 raw font-size / letter-spacing 反模式')
  process.exit(0)
}

console.log(`✗ lint:typography — 偵測到 ${findings.length} 處 raw typography 值（建議改 var(--type-*) / var(--ls-eyebrow)）`)
const byFile = new Map()
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, [])
  byFile.get(f.file).push(f)
}
for (const [file, list] of byFile) {
  console.log(`\n  ${file}:`)
  for (const f of list) {
    console.log(`    L${f.line}: ${f.type} → ${f.match}`)
  }
}
console.log(`\n  共 ${findings.length} 處於 ${byFile.size} 檔。建議：font-size → var(--type-eyebrow/small/body/h3/h2/display-2/h1/display-1)；letter-spacing → var(--ls-eyebrow)`)
process.exit(STRICT ? 1 : 0)

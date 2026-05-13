// 防止 Wave 31a 的 dark alias 重綁機制被未來 PR 慢慢蛀回去。
//
// 偵測：theme/styles + theme/components 內所有 .dark .xxx { ... } 規則內、
//   body 含 var(--mark-fg) / var(--rule-active) / var(--cta-bg) 三 alias 任一。
//   這三個 alias 在 tokens.css 的 .dark scope 已重綁為 var(--brand-fg)（暖橙），
//   元件內 `.dark .xxx { color: var(--mark-fg) }` 純屬冗餘補釘、light 規則
//   `.xxx { color: var(--mark-fg) }` 就會 cascade 出正確暖橙 dark 值。
//
// 用法：
//   node scripts/lint-dark-patch.mjs           warning 模式（exit 0）
//   node scripts/lint-dark-patch.mjs --strict  發現即 exit 1（CI 阻擋）
//
// 排除：tokens.css 內 .dark block 自己的 alias 重綁定義（這是機制本體、不算 patch）

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

// 偵測 selector 含 .dark + body 用 alias 之一
// 容忍 :global(.dark) 包裝（Vue scoped style）
const RULE_RE = /(?:^|\n)([^{}\n]*?(?::global\()?\.dark[^{}\n]*?)\{([^{}]*?)\}/g
const ALIAS_RE = /var\(--(mark-fg|rule-active|cta-bg)\)/g

const findings = []
for (const r of ROOTS) {
  for (const file of await walk(r)) {
    const text = await readFile(file, 'utf8')
    const rel = relative(ROOT, file).split(sep).join('/')
    let m
    while ((m = RULE_RE.exec(text)) !== null) {
      const selector = m[1].trim()
      const body = m[2]
      let am
      while ((am = ALIAS_RE.exec(body)) !== null) {
        const line = text.slice(0, m.index + m[0].indexOf(am[0])).split('\n').length
        findings.push({ file: rel, line, selector, alias: am[1] })
      }
      ALIAS_RE.lastIndex = 0
    }
  }
}

if (findings.length === 0) {
  console.log('✓ lint:dark-patch — 沒有 alias-redundant 的 .dark 補釘規則')
  process.exit(0)
}

console.log(`✗ lint:dark-patch — 偵測到 ${findings.length} 處 alias-redundant .dark 補釘\n`)
console.log('  這些 .dark .xxx { color: var(--mark-fg|rule-active|cta-bg) } 規則在 Wave 31a 後是冗餘：')
console.log('  tokens.css .dark scope 已重綁 alias 到 var(--brand-fg)、light 端的 .xxx 規則會自動 cascade 出暖橙 dark 值。\n')
const byFile = new Map()
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, [])
  byFile.get(f.file).push(f)
}
for (const [file, list] of byFile) {
  console.log(`  ${file}:`)
  for (const f of list) {
    console.log(`    L${f.line}: ${f.selector.slice(0, 60)} → var(--${f.alias})`)
  }
  console.log('')
}
console.log('  修法：刪掉 .dark 規則整塊；若 :hover 等 state 有非 alias 的差異化、保留 :hover 規則、只刪 base。')
process.exit(STRICT ? 1 : 0)

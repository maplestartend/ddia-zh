// 偵測 border-top + border-bottom 同時使用 var(--rule-hairline) 的 anti-pattern。
//
// 由來：Wave 44 兩位 border audit 專家發現「每個元件自畫上下 hairline」是站台
// border 氾濫主因。相鄰元件 collision、視覺柵欄、:has() 補釘規則證明設計失職。
//
// 規則：在同一個 selector 內、緊鄰兩行同時宣告 `border-top: ...rule-hairline...`
//      與 `border-bottom: ...rule-hairline...` → 警告。
//
// 例外（whitelist）：
// - GlossaryTerm tooltip：浮動元素 + shadow、雙線是 framing
// - Part0SelfAssessment score banner：emphasis banner、刻意雙線
// - 顯式 `lint-border-density-allow` 行內註解

import { readFileSync } from 'node:fs'
import { glob } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const ALLOW_RE = /\/\*\s*lint-border-density-allow\b/

// 明確允許 双線的元件（容器是 sticky/floating + 內含實質視覺強調）
const WHITELIST_SELECTORS = new Set([
  '.ddia-g-tooltip',           // GlossaryTerm tooltip 浮動 + shadow
  '.ddia-self-assess-score',   // Part 0 X/7 banner emphasis
])

const TARGETS = [
  'docs/.vitepress/theme/styles/components.css',
  'docs/.vitepress/theme/styles/base.css',
]

async function collectVue() {
  const out = []
  for await (const f of glob('docs/.vitepress/theme/components/*.vue', { cwd: ROOT })) {
    out.push(f)
  }
  return out
}

function lintFile(absPath, relPath) {
  const src = readFileSync(absPath, 'utf8')
  const lines = src.split(/\r?\n/)
  const findings = []

  // 簡易解析：找 `border-top: ...rule-hairline...` 後 5 行內若有 `border-bottom: ...rule-hairline...`
  // 同 selector 內（無 `}` 中斷）→ 警告
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!/border-top:\s*[^;]*rule-hairline/.test(line)) continue
    // 同行或上方最多 3 行內（CSS 多行註解 /* ... */）有 allow 標記都接受
    if (ALLOW_RE.test(line)) continue
    if (i > 0 && ALLOW_RE.test(lines[i - 1])) continue
    if (i > 1 && ALLOW_RE.test(lines[i - 2])) continue
    if (i > 2 && ALLOW_RE.test(lines[i - 3])) continue
    // 往前找最近的 selector 開頭（不含 @media / 嵌套）
    let selector = ''
    for (let j = i - 1; j >= 0 && j > i - 30; j--) {
      const m = lines[j].match(/^([.#&][^{,]+)\s*\{\s*$/)
      if (m) { selector = m[1].trim(); break }
    }
    if (WHITELIST_SELECTORS.has(selector)) continue
    // 往下找 border-bottom rule-hairline、5 行內、未遇到 `}`
    for (let k = i + 1; k < Math.min(i + 6, lines.length); k++) {
      const next = lines[k]
      if (/^\s*\}\s*$/.test(next)) break
      if (ALLOW_RE.test(next)) break
      if (/border-bottom:\s*[^;]*rule-hairline/.test(next)) {
        findings.push({
          file: relPath,
          line: i + 1,
          selector: selector || '(unknown selector)',
          top: line.trim(),
          bottom: next.trim()
        })
        break
      }
    }
  }
  return findings
}

async function main() {
  const files = [...TARGETS, ...(await collectVue())]
  let all = []
  for (const rel of files) {
    const abs = resolve(ROOT, rel)
    try {
      const found = lintFile(abs, rel)
      all = all.concat(found)
    } catch {
      // ignore missing file
    }
  }

  if (all.length === 0) {
    console.log('✓ lint:border-density — 沒有「同時用 border-top + border-bottom hairline」反模式')
    process.exit(0)
  }

  console.log(`⚠ 發現 ${all.length} 處 border-top + border-bottom hairline 雙線 anti-pattern（Wave 44）：\n`)
  for (const f of all) {
    console.log(`  ${f.file}:${f.line}  ${f.selector}`)
    console.log(`    ${f.top}`)
    console.log(`    ${f.bottom}\n`)
  }
  console.log('建議：刪 border-bottom、由相鄰元件接 border-top；或加 /* lint-border-density-allow */ 註解說明例外。')
  process.exit(1)
}

main().catch(err => { console.error(err); process.exit(2) })

// hard-coded <a href="/..."> 反模式偵測。
// CLAUDE.md §11 規則：部署到 GitHub Pages 時 base = '/ddia-zh/'，
// inline HTML `<a href="/...">` 不會自動加 base、在 Pages 上會 404。
//
// 用法：
//   node scripts/lint-hardcoded-base.mjs           發現即 exit 1（CLAUDE.md §14 BLOCKING）
//   node scripts/lint-hardcoded-base.mjs --warn    僅警告、exit 0（local dev 暫時放行用）
//
// 偵測規則：
//   - <a href="/...">：以 / 開頭的絕對路徑、且不是 //（protocol-relative）也不是 //http
//   - 排除 markdown 連結 [text](/path) —— VitePress 會自動加 base ✓
//   - 排除 <BaseLink to="/...">、:href="withBase(...)" —— 已包 withBase ✓
//   - 排除外部 URL <a href="https://..."> ✓
//
// W51：預設改為 BLOCKING（exit 1 on findings）— CLAUDE.md §14 早承諾、CI 沒兌現是 sleeping bug。
// 想 local 暫時放行用 --warn flag；CI 不該用此 flag。

import { readFile, readdir } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..')
const DOCS = join(ROOT, 'docs')

const argv = process.argv.slice(2)
// W51：預設 BLOCKING（CLAUDE.md §14 承諾）。--warn 才退回 warning-only
const WARN_ONLY = argv.includes('--warn')

// 偵測：<a 開頭、any 屬性、href 是 / 開頭（不是 //）的字串
// 注意：用 [^"'/] 排除 // 雙斜線（protocol-relative URL）
const PATTERN = /<a\s+(?:[^>]*?\s)?href\s*=\s*["']\/(?![/])/gi

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.vitepress' || entry.name.startsWith('.')) continue
      out.push(...await walk(full))
    } else if (/\.(md|vue)$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

// 同時掃 docs 與 .vitepress/theme（Vue 元件可能有 hard-coded href）
const themeDir = join(DOCS, '.vitepress', 'theme')
const files = [
  ...await walk(DOCS),
  ...await walk(themeDir)
]

let hits = 0
const findings = []

// 排除規則：跳過註解 / inline code 內的「範例字串」匹配
function isInsideCommentOrCode(line, matchIndex) {
  const before = line.slice(0, matchIndex)
  // JS / TS / Vue script line comment: `//` 之後（須是行內、不在字串內）
  const slashSlash = before.indexOf('//')
  if (slashSlash >= 0) {
    // 簡化判斷：如果 `//` 之前沒有未閉合的引號 / 反引號，視為註解
    const beforeSlash = before.slice(0, slashSlash)
    const quoteCount = (beforeSlash.match(/['"`]/g) || []).length
    if (quoteCount % 2 === 0) return true
  }
  // HTML / Vue template comment: <!-- ... -->（簡化：行內出現 <!-- 之後）
  if (before.includes('<!--')) return true
  // markdown inline code: 反引號數量為奇數表示在 `...` 內
  const backticks = (before.match(/`/g) || []).length
  if (backticks % 2 === 1) return true
  // JS block comment 行起首 ` * `（@param 等格式）
  if (/^\s*\*\s/.test(line)) return true
  return false
}

for (const file of files) {
  const src = await readFile(file, 'utf-8')
  const lines = src.split(/\r?\n/)
  // markdown fenced code block 內的範例 ```html <a href="/x"> ``` 也跳過
  let inFence = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^```/.test(line.trim())) { inFence = !inFence; continue }
    if (inFence) continue
    const matches = [...line.matchAll(PATTERN)]
    if (matches.length === 0) continue
    for (const m of matches) {
      if (isInsideCommentOrCode(line, m.index ?? 0)) continue
      hits++
      findings.push({
        file: relative(ROOT, file).split(sep).join('/'),
        line: i + 1,
        snippet: line.trim().slice(0, 120)
      })
    }
  }
}

if (findings.length === 0) {
  console.log('✓ lint:base — 沒有 hard-coded <a href="/..."> 反模式')
  process.exit(0)
}

console.warn(`⚠ 發現 ${hits} 個 hard-coded <a href="/..."> 反模式（CLAUDE.md §11）：\n`)
for (const f of findings) {
  console.warn(`  ${f.file}:${f.line}`)
  console.warn(`    ${f.snippet}`)
}
console.warn(`\n建議改用：`)
console.warn(`  - markdown 寫法 [文字](/path) — VitePress 自動加 base ✓`)
console.warn(`  - <BaseLink to="/path"> Vue 元件 — 包 withBase() ✓`)
console.warn(`  - 或在 setup 內用 withBase('/path') 後 bind 到 :href`)

process.exit(WARN_ONLY ? 0 : 1)

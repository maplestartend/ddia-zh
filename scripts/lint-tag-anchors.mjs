// ChapterMeta tagAnchors → glossary anchor 對齊驗證
//
// 用法：
//   node scripts/lint-tag-anchors.mjs           warn-only（exit 0）
//   node scripts/lint-tag-anchors.mjs --strict  發現即 exit 1
//
// 緣由（W47 senior reviewer #4 建議）：
//   ChapterMeta.vue 內 hard-coded tagAnchors map 14 條、若 glossary {#xxx} 重排或重命名
//   會無聲 404、無此 lint 就要等讀者點擊才發現。建議納 CI（先 warn、收乾淨後 strict）。

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..')
const COMPONENT = `${ROOT}/docs/.vitepress/theme/components/ChapterMeta.vue`
const GLOSSARY = `${ROOT}/docs/glossary/index.md`
const STRICT = process.argv.includes('--strict')

const compSrc = await readFile(COMPONENT, 'utf8')
const glossSrc = await readFile(GLOSSARY, 'utf8')

// 抓 tagAnchors map 的 value（不關心 key、key 是中英 tag 名）
//   形如 `'SLA': 'sla-slo',`
const tagAnchorRe = /'[^']+'\s*:\s*'([^']+)'/g
const mapStart = compSrc.indexOf('const tagAnchors')
const mapEnd = compSrc.indexOf('}', mapStart)
if (mapStart < 0 || mapEnd < 0) {
  console.error('✗ lint:tag-anchors — 找不到 ChapterMeta.vue 的 tagAnchors 宣告')
  process.exit(1)
}
const mapBlock = compSrc.slice(mapStart, mapEnd)
const declared = new Set()
let m
while ((m = tagAnchorRe.exec(mapBlock)) !== null) declared.add(m[1])

// 抓 glossary {#anchor} 全部
const existing = new Set()
const anchorRe = /\{#([\w-]+)\}/g
while ((m = anchorRe.exec(glossSrc)) !== null) existing.add(m[1])

const missing = [...declared].filter(a => !existing.has(a))

if (missing.length === 0) {
  console.log(`✓ lint:tag-anchors — ${declared.size} 個 tagAnchors 全部在 glossary 找得到`)
  process.exit(0)
}

console.log(`✗ lint:tag-anchors — ${missing.length} 個 anchor 在 ChapterMeta 宣告但 glossary 找不到：`)
for (const a of missing) console.log(`    - #${a}`)
console.log(`\n  修正：對齊 docs/glossary/index.md 的 {#xxx} 或更新 ChapterMeta.vue tagAnchors。`)
process.exit(STRICT ? 1 : 0)

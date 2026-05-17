// 台灣化用語 / 簡體字檢查 —— 防止對岸用語混入內文與元件文字
//
// 用法：
//   node scripts/lint-taiwan-terms.mjs           掃完印出位置、warning 模式 (exit 0)
//   node scripts/lint-taiwan-terms.mjs --strict  發現即 exit 1（CI blocking）
//
// 緣由：
//   - 對岸技術用語混入會破壞「在地化技術書」信任（CLAUDE.md §8 鐵則）
//   - third-party UI default 字串地雷已有 tokens.css override；此 lint 補正文向
//   - 案例：Wave 45 後 reviewer agent 在 docs/part-3/ch12-future.md:215 抓到「合上」漏改為「闔上」
//
// 檢測範圍：
//   - docs/**/*.md
//   - docs/.vitepress/**/*.{vue,ts,mts}（元件文字、設定）
//   - scripts/**/*.mjs（截圖 / lint 工具 console message）
//   - 排除：node_modules / dist / .vitepress/cache / screenshots

import { readFile, readdir } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..')
const SELF = fileURLToPath(import.meta.url)
const SCAN_ROOTS = [
  join(ROOT, 'docs'),
  join(ROOT, 'scripts')
]
const FILE_RE = /\.(md|vue|ts|mts|mjs|css)$/
const EXCLUDE_DIR_RE = /(node_modules|dist|\.vitepress[\\/]cache|screenshots|\.git)/
// 行內 allow 註解（同 lint-typography.mjs 慣例）：該行含此 marker 即略過
// 用於：tokens.css 內示範 VP 對岸預設字串作為對照、agent script 文件名
const ALLOW_RE = /lint-taiwan-terms-allow/

const argv = process.argv.slice(2)
const STRICT = argv.includes('--strict')

// 對岸高頻用語 / 簡體字 → 台灣建議用法
// W47 擴 28 → 65 詞（reviewer #5 建議擴 70-90）。原則：
//   - 只列「無歧義」的詞（程序 / 文件 / 信息 / 默認 / 質量 在台灣語境有合法用法、不入列）
//   - 簡體字逐字列、phrase 列確定的片語
//   - 對岸繁體形對岸用語（軟件 / 硬件 / 視頻）入列：技術寫作 99% 是對岸詞
const BANNED = [
  // 詞彙差異（術語）
  { bad: '集群', good: '叢集', kind: 'term' },
  { bad: '队列', good: '佇列', kind: 'term' },
  { bad: '变量', good: '變數', kind: 'term' },
  { bad: '运维', good: '維運', kind: 'term' },
  { bad: '搬迁', good: '遷移', kind: 'term' },
  { bad: '线性化', good: '線性一致', kind: 'term' },
  // 對岸繁體形對岸用語（W47 新增 — 技術寫作 99% 對岸詞）
  { bad: '軟件', good: '軟體', kind: 'pc-term' },
  { bad: '硬件', good: '硬體', kind: 'pc-term' },
  { bad: '視頻', good: '影片', kind: 'pc-term' },
  { bad: '回調', good: '回呼', kind: 'pc-term' },
  { bad: '函數', good: '函式', kind: 'pc-term' },
  // 註：「對象」在台灣語境也常指「目標受眾 / 對話對象」（如「路徑 | 對象」表頭、「客訴對象」）— 不入 BANNED 避免誤殺
  { bad: '模塊', good: '模組', kind: 'pc-term' },
  { bad: '組件', good: '元件', kind: 'pc-term' },
  { bad: '屏幕', good: '螢幕', kind: 'pc-term' },
  // 註：「菜單」在台灣餐廳脈絡（菜單 = menu of dishes）合法；UI 才該用「選單」— 太脈絡相關不入 BANNED
  // 高頻片語
  { bad: '合上书', good: '闔上書', kind: 'phrase' },
  { bad: '会被合上', good: '會被闔上', kind: 'phrase' },
  { bad: '把书合上', good: '把書闔上', kind: 'phrase' },
  // 純簡體字（句中混入）— W47 從 16 擴到 39 字
  { bad: '设计', good: '設計', kind: 'simplified' },
  { bad: '实现', good: '實現', kind: 'simplified' },
  { bad: '应该', good: '應該', kind: 'simplified' },
  { bad: '复制', good: '複製', kind: 'simplified' },
  { bad: '数据库', good: '資料庫', kind: 'simplified' },
  { bad: '网络', good: '網路', kind: 'simplified' },
  { bad: '缓存', good: '快取', kind: 'simplified' },
  { bad: '视频', good: '影片', kind: 'simplified' },
  { bad: '远程', good: '遠端', kind: 'simplified' },
  { bad: '连接', good: '連線', kind: 'simplified' },
  { bad: '默认', good: '預設', kind: 'simplified' },
  { bad: '错误', good: '錯誤', kind: 'simplified' },
  { bad: '复杂', good: '複雜', kind: 'simplified' },
  { bad: '验证', good: '驗證', kind: 'simplified' },
  { bad: '检测', good: '檢測', kind: 'simplified' },
  { bad: '层级', good: '層級', kind: 'simplified' },
  { bad: '传输', good: '傳輸', kind: 'simplified' },
  // W47 新增 22 字（reviewer #5 建議高頻簡體字族）
  { bad: '过程', good: '過程', kind: 'simplified' },
  { bad: '问题', good: '問題', kind: 'simplified' },
  { bad: '关系', good: '關係', kind: 'simplified' },
  { bad: '显示', good: '顯示', kind: 'simplified' },
  { bad: '应用', good: '應用', kind: 'simplified' },
  { bad: '参考', good: '參考', kind: 'simplified' },
  { bad: '报错', good: '報錯', kind: 'simplified' },
  { bad: '视图', good: '視圖', kind: 'simplified' },
  { bad: '监控', good: '監控', kind: 'simplified' },
  { bad: '解决', good: '解決', kind: 'simplified' },
  { bad: '获取', good: '獲取', kind: 'simplified' },
  { bad: '执行', good: '執行', kind: 'simplified' },
  { bad: '状态', good: '狀態', kind: 'simplified' },
  { bad: '环境', good: '環境', kind: 'simplified' },
  { bad: '终端', good: '終端', kind: 'simplified' },
  { bad: '镜像', good: '鏡像', kind: 'simplified' },
  { bad: '支持', good: '支援', kind: 'simplified' },
  { bad: '保存', good: '儲存', kind: 'simplified' },
  { bad: '优化', good: '最佳化', kind: 'simplified' },
  { bad: '加载', good: '載入', kind: 'simplified' },
  { bad: '登录', good: '登入', kind: 'simplified' },
  { bad: '屏蔽', good: '封鎖', kind: 'simplified' },
  { bad: '响应', good: '回應', kind: 'simplified' },
  { bad: '调试', good: '除錯', kind: 'simplified' },
  { bad: '调用', good: '呼叫', kind: 'simplified' }
  // 註：「刷新」「配置」在台灣語境也常見（按 F5 刷新、PG 配置文件）— 不入 BANNED 避免誤殺
]

async function walk(dir, out = []) {
  let entries
  try { entries = await readdir(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (EXCLUDE_DIR_RE.test(p)) continue
    if (e.isDirectory()) await walk(p, out)
    else if (e.isFile() && FILE_RE.test(e.name)) out.push(p)
  }
  return out
}

function lineOf(text, idx) {
  return text.slice(0, idx).split('\n').length
}
function lineText(text, idx) {
  const start = text.lastIndexOf('\n', idx) + 1
  const end = text.indexOf('\n', idx)
  return text.slice(start, end === -1 ? text.length : end)
}

const findings = []
for (const r of SCAN_ROOTS) {
  for (const file of await walk(r)) {
    if (file === SELF) continue  // 跳過本檔（BANNED 陣列含字面對岸詞會誤觸）
    const text = await readFile(file, 'utf8')
    const rel = relative(ROOT, file).split(sep).join('/')
    for (const { bad, good, kind } of BANNED) {
      let idx = 0
      while ((idx = text.indexOf(bad, idx)) !== -1) {
        if (!ALLOW_RE.test(lineText(text, idx))) {
          findings.push({ file: rel, line: lineOf(text, idx), bad, good, kind })
        }
        idx += bad.length
      }
    }
  }
}

if (findings.length === 0) {
  console.log('✓ lint:taiwan-terms — 沒有對岸用語 / 簡體字混入')
  process.exit(0)
}

console.log(`✗ lint:taiwan-terms — 偵測到 ${findings.length} 處對岸用語 / 簡體字`)
const byFile = new Map()
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, [])
  byFile.get(f.file).push(f)
}
for (const [file, list] of byFile) {
  console.log(`\n  ${file}:`)
  for (const f of list) {
    console.log(`    L${f.line}: 「${f.bad}」→ 應為「${f.good}」  [${f.kind}]`)
  }
}
console.log(`\n  共 ${findings.length} 處於 ${byFile.size} 檔。${STRICT ? '阻擋（--strict）' : '建議修正、CI 預設 non-blocking'}`)
process.exit(STRICT ? 1 : 0)

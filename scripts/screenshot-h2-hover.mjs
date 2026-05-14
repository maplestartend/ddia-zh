// 專拍 h2 / h3 hover 顯示 # 時的對齊截圖。
// 用法：node scripts/screenshot-h2-hover.mjs [tag]
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const tag = process.argv[2] || 'h2hover'
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'scripts', 'screenshots')
await mkdir(OUT, { recursive: true })

const DEV_URL = 'http://localhost:5173'
try {
  const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(2000) })
  if (!res.ok) throw new Error(`status ${res.status}`)
} catch (err) {
  console.error(`✗ dev server 沒在 ${DEV_URL} 回應（${err.message}）`)
  process.exit(2)
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()

const SHOTS = [
  { name: 'ch01-h2',  url: '/part-1/ch01-reliable',  selector: 'h2#_1-1-為什麼這三個目標' },
  { name: 'ch01-h3',  url: '/part-1/ch01-reliable',  selector: 'h3' },
  { name: 'metrics-h2', url: '/part-0/metrics', selector: 'h2#_1-throughput-vs-latency-是兩個正交維度' },
]

for (const s of SHOTS) {
  console.log(`[shot] ${s.name} ...`)
  await page.goto(`${DEV_URL}${s.url}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.vp-doc', { timeout: 15000 })
  await page.waitForTimeout(2000)

  // 找到目標 heading
  let heading
  if (s.selector.includes('#')) {
    heading = await page.$(s.selector)
  } else {
    // generic：找第一個 h3
    heading = await page.$('.vp-doc h3')
  }
  if (!heading) {
    console.warn(`[skip] ${s.name} no heading found`)
    continue
  }

  // 捲到 heading 位置（中央），再 hover 觸發 .header-anchor 顯示
  await heading.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await heading.hover()
  await page.waitForTimeout(600) // wait for anchor opacity transition

  // 抓 heading 的 bounding box、裁剪截圖（含 # anchor 的左側 padding）
  const box = await heading.boundingBox()
  if (!box) {
    console.warn(`[skip] ${s.name} no boundingBox`)
    continue
  }
  // 擴大左邊 100px 抓 # 字、上下各加 24px buffer
  const clip = {
    x: Math.max(0, box.x - 100),
    y: Math.max(0, box.y - 24),
    width: Math.min(1440, box.width + 120),
    height: box.height + 48
  }
  await page.screenshot({ path: `${OUT}/${tag}-${s.name}.png`, clip })
  console.log(`[ok] ${s.name} → clip(${clip.x},${clip.y},${clip.width}x${clip.height})`)
}

await browser.close()
console.log(`\n輸出於 scripts/screenshots/、前綴 = ${tag}`)

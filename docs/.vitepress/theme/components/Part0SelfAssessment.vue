<template>
  <div class="ddia-self-assess">
    <div class="ddia-self-assess-header">
      <Icon name="checklist" :size="18" filled />
      <h3>互動自評：勾選你「答得出來」的題目</h3>
    </div>
    <p class="ddia-self-assess-desc">
      每題勾起來表示「我能在 30 秒內向別人講清楚這題答案」。**沒勾**的題目下方會自動列出建議讀的章節。
    </p>

    <ol class="ddia-self-assess-list">
      <li v-for="item in items" :key="item.id" class="ddia-self-assess-item">
        <label>
          <input
            type="checkbox"
            :checked="checked[item.id]"
            @change="toggle(item.id)"
          />
          <span class="ddia-self-assess-q" v-html="item.q" />
        </label>
      </li>
    </ol>

    <div class="ddia-self-assess-result">
      <div v-if="recommendations.length === 0" class="ddia-self-assess-pass">
        <Icon name="celebration" :size="20" filled />
        <strong>7 題全勾</strong>——直接跳到 <a :href="withBase('/part-1/ch01-reliable')">Ch1 可靠、可擴展、可維護</a>。Part 0 隨時可以回頭翻當參考。
      </div>
      <div v-else class="ddia-self-assess-todo">
        <div class="ddia-self-assess-todo-head">
          <Icon name="auto_fix_high" :size="16" filled />
          <strong>建議補強清單（{{ recommendations.length }} 章）</strong>
        </div>
        <ul>
          <li v-for="r in recommendations" :key="r.id">
            <a :href="withBase(r.link)">{{ r.label }}</a>
            <span class="ddia-self-assess-reason">— 對應你勾不下去的：{{ r.reason }}</span>
          </li>
        </ul>
        <p class="ddia-self-assess-hint">
          建議讀順序：依清單上下排序。讀完一章回來重新勾、列表自動縮短。
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import Icon from './Icon.vue'
import { useStorage } from '../../composables/useStorage'

interface AssessItem {
  id: string
  q: string  // 題目（可含 HTML）
  link: string
  label: string
  reason: string  // 「對應你勾不下去的：」後的短描述
}

const items: AssessItem[] = [
  { id: 'q1', q: '後端服務的「無狀態（stateless）」是什麼意思？為什麼設計成這樣？',
    link: '/part-0/intro', label: '0.1 為什麼需要資料密集系統', reason: 'stateless 設計與資料系統典型元件' },
  { id: 'q2', q: '為什麼 P99 延遲比平均延遲更能反映使用者體驗？',
    link: '/part-0/metrics', label: '0.2 衡量指標素養', reason: 'QPS / Latency / P99 / SLA / SLO' },
  { id: 'q3', q: '<code>SELECT u.name, COUNT(o.id) FROM users u LEFT JOIN orders o ON o.user_id = u.id GROUP BY u.id</code> 這個查詢做什麼？',
    link: '/part-0/sql', label: '0.3 SQL 與關聯模型速覽', reason: 'SELECT / JOIN / 索引 / 交易直覺' },
  { id: 'q4', q: '行程（process）與執行緒（thread）的差別是什麼？fsync 為什麼存在？',
    link: '/part-0/os', label: '0.4 作業系統地基', reason: 'process / thread / page cache / fsync' },
  { id: 'q5', q: 'TCP 三次握手中如果第二個 SYN-ACK 丟了會怎樣？HTTP 與 RPC 的本質差異？',
    link: '/part-0/network', label: '0.5 網路地基', reason: 'TCP / HTTP / RPC / partial failure' },
  { id: 'q6', q: 'B-Tree 為什麼平衡？Hash table 衝突怎麼處理？外部排序為什麼能用？',
    link: '/part-0/data-structures', label: '0.6 資料結構地基', reason: 'Hash / B-Tree / 外部排序 / Big-O' },
  { id: 'q7', q: '兩個執行緒同時對銀行帳戶 +100 為什麼會丟錢？什麼是隔離級別？',
    link: '/part-0/concurrency', label: '0.7 並行控制直覺', reason: 'race condition / lock / 隔離級別' }
]

type CheckMap = Record<string, boolean>
function isCheckMap(v: unknown): v is CheckMap {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
const checked = useStorage<CheckMap>('ddia-part0-assess', {}, { validate: isCheckMap })

function toggle(id: string) {
  checked.value = { ...checked.value, [id]: !checked.value[id] }
}

const recommendations = computed(() => items.filter(i => !checked.value[i.id]))
</script>

<style scoped>
/* Editorial Part 0 自評：書末讀者測驗樣式 */
.ddia-self-assess {
  margin: 32px 0;
  padding: 24px 0;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--rule-hairline);
  border-bottom: 1px solid var(--rule-hairline);
  border-radius: 0;
}
.ddia-self-assess-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  color: var(--brand-500);
  margin-bottom: 10px;
}
.ddia-self-assess-header :deep(.material-symbols-rounded) {
  display: none;
}
.ddia-self-assess-header::before {
  content: "§";
  font-family: var(--font-display);
  font-style: italic;
  font-size: 20px;
  color: var(--brand-500);
}
:global(.dark) .ddia-self-assess-header {
  color: var(--info-fg);
}
:global(.dark) .ddia-self-assess-header::before {
  color: var(--info-fg);
}
.ddia-self-assess-header h3 {
  margin: 0;
  font-family: var(--font-display);
  font-variation-settings: "opsz" 48, "SOFT" 30, "wght" 600;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.005em;
}
.ddia-self-assess-desc {
  margin: 0 0 20px;
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: "opsz" 24, "SOFT" 50, "wght" 400;
  font-size: 14.5px;
  color: var(--text-secondary);
  line-height: 1.75;
}
.ddia-self-assess-list {
  margin: 0 0 22px;
  padding-left: 0;
  list-style: none;
}
.ddia-self-assess-item {
  margin: 6px 0;
  padding: 10px 14px;
  background: transparent;
  border: 0;
  border-left: 2px solid transparent;
  border-radius: 0;
  transition: background 0.15s, border-left-color 0.15s;
}
.ddia-self-assess-item:hover {
  background: var(--brand-tint-soft);
  border-left-color: var(--brand-500);
}
.ddia-self-assess-item:has(input:checked) {
  background: var(--success-bg);
  border-left-color: var(--success-fg);
  opacity: 0.75;
}
.ddia-self-assess-item label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 14.5px;
  line-height: 1.7;
  letter-spacing: 0.01em;
}
.ddia-self-assess-item input[type='checkbox'] {
  margin-top: 5px;
  accent-color: var(--brand-500);
  cursor: pointer;
}
.ddia-self-assess-q :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.9em;
  padding: 0 4px;
  background: var(--brand-tint-soft);
  border: 1px solid var(--brand-tint-border);
  color: var(--brand-500);
  border-radius: 3px;
}

.ddia-self-assess-result {
  margin-top: 22px;
}
.ddia-self-assess-pass {
  display: flex;
  align-items: baseline;
  gap: 10px;
  background: transparent;
  border-left: 3px solid var(--success-fg);
  color: var(--success-fg);
  padding: 12px 0 12px 20px;
  border-radius: 0;
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: "opsz" 24, "SOFT" 50, "wght" 500;
  font-size: 15px;
  line-height: 1.75;
}
.ddia-self-assess-pass :deep(.material-symbols-rounded) {
  display: none;
}
.ddia-self-assess-pass::before {
  content: "·";
  font-size: 20px;
  font-weight: 700;
  margin-right: 2px;
}
.ddia-self-assess-pass a {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 0.2em;
  font-weight: 600;
  font-style: normal;
}

.ddia-self-assess-todo {
  background: transparent;
  border: 0;
  border-left: 3px solid var(--accent-500);
  border-radius: 0;
  padding: 6px 0 6px 20px;
}
.ddia-self-assess-todo-head {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-family: var(--font-display);
  font-variation-settings: "opsz" 24, "SOFT" 30, "wght" 600;
  color: var(--accent-500);
  margin-bottom: 10px;
  letter-spacing: 0.04em;
}
.ddia-self-assess-todo-head :deep(.material-symbols-rounded) {
  display: none;
}
:global(.dark) .ddia-self-assess-todo-head {
  color: var(--accent-200);
}
:global(.dark) .ddia-self-assess-todo {
  border-left-color: var(--accent-200);
}
.ddia-self-assess-todo ul {
  margin: 0 0 10px;
  padding-left: 1.2em;
  list-style: none;
}
.ddia-self-assess-todo li {
  margin: 8px 0;
  line-height: 1.75;
  position: relative;
}
.ddia-self-assess-todo li::before {
  content: "·";
  position: absolute;
  left: -0.9em;
  font-family: var(--font-display);
  font-size: 18px;
  color: var(--accent-500);
}
.ddia-self-assess-reason {
  color: var(--text-tertiary);
  font-family: var(--font-display);
  font-style: italic;
  font-size: 13px;
}
.ddia-self-assess-hint {
  margin: 6px 0 0;
  font-family: var(--font-display);
  font-style: italic;
  font-size: 12.5px;
  color: var(--text-tertiary);
}
</style>

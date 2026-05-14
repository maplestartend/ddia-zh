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
      <!-- W43-7 Wave 43：result block 加總分顯示、第一眼讓讀者看到「X / 7 答得出來」 -->
      <div class="ddia-self-assess-score">
        <span class="ddia-self-assess-score-eyebrow">自評結果</span>
        <span class="ddia-self-assess-score-num">{{ checkedCount }} <span class="ddia-self-assess-score-of">/ {{ items.length }}</span></span>
        <span class="ddia-self-assess-score-label">答得出來</span>
      </div>
      <div v-if="recommendations.length === 0" class="ddia-self-assess-pass">
        <strong>7 題全勾</strong>——直接跳到 <a :href="withBase('/part-1/ch01-reliable')">Ch1 可靠、可擴展、可維護</a>。Part 0 隨時可以回頭翻當參考。
      </div>
      <div v-else class="ddia-self-assess-todo">
        <div class="ddia-self-assess-todo-head">
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
  { id: 'q4', q: 'B-Tree 為什麼平衡？Hash table 衝突怎麼處理？外部排序為什麼能用？',
    link: '/part-0/data-structures', label: '0.4 資料結構地基', reason: 'Hash / B-Tree / 外部排序 / Big-O' },
  { id: 'q5', q: '行程（process）與執行緒（thread）的差別是什麼？fsync 為什麼存在？',
    link: '/part-0/os', label: '0.5 作業系統地基', reason: 'process / thread / page cache / fsync' },
  { id: 'q6', q: 'TCP 三次握手中如果第二個 SYN-ACK 丟了會怎樣？HTTP 與 RPC 的本質差異？',
    link: '/part-0/network', label: '0.6 網路地基', reason: 'TCP / HTTP / RPC / partial failure' },
  { id: 'q7', q: '兩個執行緒同時對銀行帳戶 +100 為什麼會丟錢？什麼是隔離級別？',
    link: '/part-0/concurrency', label: '0.7 並行控制直覺', reason: 'race condition / lock / 隔離級別' }
]

type CheckMap = Record<string, boolean>
function isCheckMap(v: unknown): v is CheckMap {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
// v2 (Wave 35)：Part 0 重排後 q4-q6 內容互換，舊 v1 checked 在新題目上意義錯位、必須失效
const checked = useStorage<CheckMap>('ddia-part0-assess-v2', {}, { validate: isCheckMap })

function toggle(id: string) {
  checked.value = { ...checked.value, [id]: !checked.value[id] }
}

const recommendations = computed(() => items.filter(i => !checked.value[i.id]))
const checkedCount = computed(() => items.filter(i => checked.value[i.id]).length)
</script>

<style scoped>
/* Editorial Part 0 自評：書末讀者測驗樣式 */
.ddia-self-assess {
  margin: var(--space-4-5) 0;
  padding: var(--space-4) 0;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--rule-hairline);
  border-bottom: 1px solid var(--rule-hairline);
  border-radius: 0;
}
.ddia-self-assess-header {
  display: flex;
  align-items: baseline;
  gap: var(--space-2-5);
  color: var(--mark-fg);
  margin-bottom: var(--space-2-5);
}
.ddia-self-assess-header :deep(.material-symbols-rounded) {
  display: none;
}
.ddia-self-assess-header::before {
  content: "§";
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--type-h3);
  color: var(--mark-fg);
}
.ddia-self-assess-header h3 {
  margin: 0;
  font-family: var(--font-display);
  font-variation-settings: "opsz" 48, "SOFT" 30, "wght" 600;
  font-size: var(--type-h3);
  font-weight: 600;
  letter-spacing: -0.005em;
}
.ddia-self-assess-desc {
  margin: 0 0 var(--space-3-5);
  font-family: var(--font-display);
  /* Wave 30a：功能性 desc 去 italic（保留 fvar-italic-note 變體只控 wght/SOFT） */
  font-variation-settings: var(--fvar-italic-note);
  font-size: var(--type-body-tight);
  color: var(--text-secondary);
  line-height: 1.75;
}
.ddia-self-assess-list {
  margin: 0 0 var(--space-3-5);
  padding-left: 0;
  list-style: none;
}
.ddia-self-assess-item {
  margin: var(--space-1-5) 0;
  padding: var(--space-2-5) var(--space-3);
  background: transparent;
  border: 0;
  border-left: 2px solid transparent;
  border-radius: 0;
  transition: background 0.15s, border-left-color 0.15s;
}
.ddia-self-assess-item:hover {
  background: var(--brand-tint-soft);
  border-left-color: var(--mark-fg);
}
.ddia-self-assess-item:has(input:checked) {
  background: var(--success-bg);
  border-left-color: var(--success-fg);
  opacity: 0.75;
}
.ddia-self-assess-item label {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2-5);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: var(--type-body-tight);
  line-height: 1.7;
  letter-spacing: var(--ls-tight);
}
.ddia-self-assess-item input[type='checkbox'] {
  margin-top: var(--space-1);  /* Wave 31d：5→4 checkbox baseline align（1px 差人眼不可辨） */
  accent-color: var(--mark-fg);
  cursor: pointer;
}
.ddia-self-assess-q :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.9em;
  padding: 0 var(--space-1);
  background: var(--brand-tint-soft);
  border: 1px solid var(--brand-tint-border);
  color: var(--mark-fg);
  border-radius: 3px;
}

.ddia-self-assess-result {
  margin-top: var(--space-3-5);
}

/* W43-7 Wave 43：總分 banner — 第一眼讓讀者看到「X / 7 答得出來」
   Editorial：左右髮絲線 + 大字 Fraunces oldstyle figures + italic eyebrow */
.ddia-self-assess-score {
  display: flex;
  align-items: baseline;
  gap: var(--space-2-5);
  padding: var(--space-2-5) 0;
  margin-bottom: var(--space-3);
  border-top: 1px solid var(--rule-hairline);
  border-bottom: 1px solid var(--rule-hairline);
}
.ddia-self-assess-score-eyebrow {
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-italic-warm);
  font-style: italic;
  font-size: var(--type-eyebrow);
  letter-spacing: var(--ls-eyebrow);
  text-transform: uppercase;
  color: var(--text-tertiary);
}
.ddia-self-assess-score-num {
  font-family: var(--font-display);
  font-feature-settings: "onum" 1, "tnum" 1;
  font-variation-settings: "opsz" 36, "SOFT" 60, "wght" 500;
  font-size: var(--type-h2);
  line-height: 1;
  color: var(--mark-fg);
}
.ddia-self-assess-score-of {
  font-size: var(--type-body);
  color: var(--text-tertiary);
}
.ddia-self-assess-score-label {
  margin-left: auto;
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-italic-warm);
  font-style: italic;
  font-size: var(--type-small);
  letter-spacing: var(--ls-loose);
  color: var(--text-secondary);
}
.ddia-self-assess-pass {
  display: flex;
  align-items: baseline;
  gap: var(--space-2-5);
  background: transparent;
  border-left: 3px solid var(--success-fg);
  color: var(--success-fg);
  padding: var(--space-2-5) 0 var(--space-2-5) var(--space-3-5);
  border-radius: 0;
  font-family: var(--font-display);
  font-style: italic;
  font-variation-settings: var(--fvar-eyebrow);
  font-size: var(--type-body-mid);
  line-height: 1.75;
}
.ddia-self-assess-pass :deep(.material-symbols-rounded) {
  display: none;
}
.ddia-self-assess-pass::before {
  content: "·";
  font-size: var(--type-h3);
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
  padding: var(--space-1-5) 0 var(--space-1-5) var(--space-3-5);
}
.ddia-self-assess-todo-head {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-1-5);
  font-family: var(--font-display);
  font-variation-settings: var(--fvar-section-tight);
  color: var(--accent-500);
  margin-bottom: var(--space-2-5);
  letter-spacing: var(--ls-loose);
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
  margin: 0 0 var(--space-2-5);
  padding-left: 1.2em;
  list-style: none;
}
.ddia-self-assess-todo li {
  margin: var(--space-2) 0;
  line-height: 1.75;
  position: relative;
}
.ddia-self-assess-todo li::before {
  content: "·";
  position: absolute;
  left: -0.9em;
  font-family: var(--font-display);
  font-size: var(--type-body-lg);
  color: var(--accent-500);
}
.ddia-self-assess-reason {
  color: var(--text-tertiary);
  font-family: var(--font-display);
  /* Wave 30a：功能性 reason 去 italic */
  font-size: var(--type-small-tight);
}
.ddia-self-assess-hint {
  margin: var(--space-1-5) 0 0;
  font-family: var(--font-display);
  /* Wave 30a：功能性 hint 去 italic */
  font-size: var(--type-meta);
  color: var(--text-tertiary);
}
</style>

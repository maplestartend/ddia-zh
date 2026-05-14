<template>
  <div>
    <div class="ddia-dashboard">
      <div class="ddia-stat-card">
        <div class="ddia-stat-label">
          已閱讀章節 <span class="ddia-stat-tag" title="手動標記為已讀的章節（自我宣告）">自我宣告</span>
        </div>
        <div class="ddia-stat-value brand numeric">{{ doneCount }} / {{ totalChapters }}</div>
        <div class="ddia-progress-bar ddia-progress-bar-top">
          <div class="ddia-progress-fill" :style="{ width: progressPct + '%' }" />
        </div>
        <div class="ddia-stat-sub">在章末「標記已讀」按鈕手動勾選</div>
      </div>

      <div class="ddia-stat-card">
        <div class="ddia-stat-label">
          已通關章節 <span class="ddia-stat-tag" title="章末測驗首次作答 ≥ 60% 自動視為通關（不被重做沖洗）">Quiz 首次 ≥ 60%</span>
        </div>
        <div class="ddia-stat-value brand numeric">{{ passedCount }} / {{ totalChapters }}</div>
        <div class="ddia-progress-bar ddia-progress-bar-top">
          <div class="ddia-progress-fill" :style="{ width: passedPct + '%' }" />
        </div>
        <div class="ddia-stat-sub">章末測驗首次答 ≥ 60% 自動通關、重做不沖洗</div>
      </div>

      <div class="ddia-stat-card">
        <div class="ddia-stat-label">已完成測驗</div>
        <div class="ddia-stat-value numeric">{{ quizCount }}</div>
      </div>

      <div class="ddia-stat-card">
        <div class="ddia-stat-label">
          首次答對率 <span class="ddia-stat-tag" title="首次作答得分／總題數，重做不沖洗">誠實版</span>
        </div>
        <div class="ddia-stat-value numeric" :class="{ 'is-empty': quizCount === 0 }">
          {{ quizCount === 0 ? '—' : `${firstAttemptAccuracy}%` }}
        </div>
        <div v-if="quizCount > 0 && accuracy !== firstAttemptAccuracy" class="ddia-stat-sub">
          目前 {{ accuracy }}%（含重做）
        </div>
      </div>
    </div>

    <!-- 錯題本：列出首次未滿分的章節；無錯題時整個 details 隱藏 -->
    <details v-if="incorrectChapters.length > 0" class="ddia-incorrect-book">
      <summary class="ddia-incorrect-summary">
        <Icon name="rule" :size="16" filled />
        錯題本（{{ incorrectChapters.length }} 章首次未滿分）
        <span class="ddia-incorrect-hint">點開看清單、回去重做能拉高當前分數（首次分數不會被沖洗）</span>
      </summary>
      <ul class="ddia-incorrect-list">
        <li v-for="ic in incorrectChapters" :key="ic.chapterId" class="ddia-incorrect-item">
          <a :href="chapterLinkOf(ic.chapterId)" class="ddia-incorrect-link">
            <strong>{{ chapterTitleOf(ic.chapterId) }}</strong>
            <span class="ddia-incorrect-meta">
              首次 {{ ic.firstAttemptScore }} / {{ ic.total }}
              · 當前 {{ ic.currentScore }} / {{ ic.total }}
              · {{ ic.attemptCount }} 次作答
            </span>
          </a>
        </li>
      </ul>
    </details>
  </div>
</template>

<script setup lang="ts">
// P0-8：Dashboard stats partial — 把原本 Dashboard.vue 內被 mode='stats' 與
// v-else（已讀者預設）重複貼兩份的 4 stat cards + 錯題本抽出來。
// 修改文案 / a11y / 結構只改這一處、不會 drift。
import { computed } from 'vue'
import { withBase } from 'vitepress'
import Icon from './Icon.vue'
import { useProgress } from '../../composables/useProgress'
import { CHAPTERS, PREREQUISITES, TOTAL_CHAPTERS } from '../../data/chapters'

const {
  doneCount, progressPct, quizCount, accuracy, firstAttemptAccuracy,
  incorrectChapters, passedCount, passedPct
} = useProgress()
const totalChapters = TOTAL_CHAPTERS

const allChaptersById = computed(() => {
  const m = new Map<string, { link: string; shortTitle: string }>()
  for (const c of [...PREREQUISITES, ...CHAPTERS]) m.set(c.id, { link: c.link, shortTitle: c.shortTitle })
  return m
})
function chapterLinkOf(chapterId: string): string {
  return withBase(allChaptersById.value.get(chapterId)?.link ?? '/')
}
function chapterTitleOf(chapterId: string): string {
  return allChaptersById.value.get(chapterId)?.shortTitle ?? chapterId
}
</script>

<template>
  <div>
    <!-- 全新訪客：顯示書頁暖身段落（不顯示 0/12 stat 空格 — 避免新讀者第一眼挫敗） -->
    <div v-if="isFresh" class="ddia-dashboard-welcome">
      <div class="ddia-dashboard-welcome-eyebrow">扉頁 · 從這裡開始</div>
      <p class="ddia-dashboard-welcome-text">
        你還沒讀過任何章節。讀完任一章後，這裡會變成你的閱讀進度紀錄。
      </p>
      <div class="ddia-dashboard-welcome-cta">
        <a :href="withBase('/part-0/basics')" class="ddia-cta primary">新手起步 · 0.0 三分鐘看懂後端</a>
        <a :href="withBase('/part-1/ch01-reliable')" class="ddia-cta ghost">已熟悉 SQL／後端 · 直接讀 Ch 1 →</a>
      </div>
    </div>

    <!-- F2 完成 Ceremony：12 章全讀完換結語 + 三個延伸選項 -->
    <div v-else-if="isComplete" class="ddia-dashboard-ceremony">
      <div class="ddia-dashboard-ceremony-dinkus" aria-hidden="true">◆ ◆ ◆</div>
      <div class="ddia-dashboard-ceremony-eyebrow">Reader · Colophon</div>
      <p class="ddia-dashboard-ceremony-text">
        你已讀完《設計資料密集型應用》全 12 章。接下來呢？
      </p>
      <div class="ddia-dashboard-ceremony-links">
        <a :href="withBase('/part-1/ch01-reliable')" class="ddia-dashboard-ceremony-link">重讀 Ch 1 · 帶著現在的觀點再走一遍 →</a>
        <a :href="withBase('/part-3/ch12-future')" class="ddia-dashboard-ceremony-link">回到 Ch 12 · 思考資料系統的未來 →</a>
        <a href="https://github.com/maplestartend/ddia-zh/issues/new?template=general.yml" target="_blank" rel="noopener" class="ddia-dashboard-ceremony-link">把學完的心得寫成 GitHub Issue 留念 →</a>
      </div>
    </div>

    <!-- F3 已讀過的讀者：顯示「繼續 · ChXX」（用 lastVisited 而非「下一個未讀」） -->
    <div v-else-if="resumeChapter" class="ddia-dashboard-resume">
      <div class="ddia-dashboard-resume-eyebrow">{{ resumeEyebrow }}</div>
      <a :href="withBase(resumeChapter.link)" class="ddia-dashboard-resume-link">
        <span class="ddia-dashboard-resume-num">{{ resumeChapter.num }}</span>
        <span class="ddia-dashboard-resume-title">{{ resumeChapter.shortTitle }}</span>
        <span class="ddia-dashboard-resume-arrow">→</span>
      </a>
    </div>

    <template v-else>
      <div class="ddia-dashboard">
        <div class="ddia-stat-card">
          <div class="ddia-stat-label">已讀完章節</div>
          <div class="ddia-stat-value brand numeric">{{ doneCount }} / {{ totalChapters }}</div>
          <div class="ddia-progress-bar" style="margin-top: var(--space-2-5);">
            <div class="ddia-progress-fill" :style="{ width: progressPct + '%' }" />
          </div>
        </div>

        <div class="ddia-stat-card">
          <div class="ddia-stat-label">整體進度</div>
          <div class="ddia-stat-value brand numeric">{{ progressPct }}%</div>
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

    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import Icon from './Icon.vue'
import { useProgress } from '../../composables/useProgress'
import { CHAPTERS, PREREQUISITES, TOTAL_CHAPTERS } from '../../data/chapters'

const {
  doneCount, progressPct, quizCount, accuracy, firstAttemptAccuracy,
  incorrectChapters, isDone
} = useProgress()
const totalChapters = TOTAL_CHAPTERS

const isFresh = computed(() => doneCount.value === 0 && quizCount.value === 0)
const isComplete = computed(() => doneCount.value >= totalChapters)

// F3：讀 ChapterOpener 寫入的 ddia-last-visited、用「繼續上次讀的章」優先於「下一個未讀」
interface LastVisited { chapterId: string; at: number }
const lastVisited = ref<LastVisited | null>(null)
onMounted(() => {
  try {
    const raw = localStorage.getItem('ddia-last-visited')
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.chapterId === 'string') {
      lastVisited.value = parsed
    }
  } catch { /* ignore */ }
})

const allChaptersForResume = computed(() => [...CHAPTERS, ...PREREQUISITES])
const resumeChapter = computed(() => {
  // 1. 有 lastVisited 紀錄、且非全讀完 → 用該章（讓使用者繼續上次中斷的地方）
  if (lastVisited.value) {
    const lv = allChaptersForResume.value.find(c => c.id === lastVisited.value!.chapterId)
    if (lv) return lv
  }
  // 2. 否則用「下一個未讀」（舊行為 fallback）
  return CHAPTERS.find(c => !isDone(c.id)) ?? null
})
const resumeEyebrow = computed(() =>
  lastVisited.value && allChaptersForResume.value.some(c => c.id === lastVisited.value!.chapterId)
    ? '繼續上次讀的章節'
    : '下一個未讀章節'
)

// 錯題本：依 chapterId 查 chapter 元資料（連結 / 短標題）
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

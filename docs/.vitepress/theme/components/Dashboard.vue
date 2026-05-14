<template>
  <div>
    <!-- mode="stats"（progress.md 用）：總是顯示 4 stat cards + 錯題本，跳過 fresh/complete/resume switching。
         專屬給「我的學習進度」頁、那邊讀者就是來看數字的。 -->
    <DashboardStats v-if="mode === 'stats'" />

    <!-- 全新訪客：顯示書頁暖身段落（CTA 已在 hero 顯示、此處不再重複）
         W43-5 Wave 43：加 3 步「怎麼開始」mini guide、給「第一次來」讀者明確路徑 -->
    <div v-else-if="isFresh" class="ddia-dashboard-welcome">
      <div class="ddia-dashboard-welcome-eyebrow">扉頁 · 從這裡開始</div>
      <p class="ddia-dashboard-welcome-text">
        你還沒讀過任何章節。<br>
        讀完任一章後，這裡會變成你的<span class="ddia-em-mark">閱讀進度紀錄</span>（手動標記已讀 / Quiz 首次答對率 / 錯題本）。
      </p>
      <ol class="ddia-dashboard-welcome-steps">
        <li><strong>① 選路徑</strong> · 不知道從哪讀 → 看 <a :href="withBase('/paths/')">學習路徑頁的 PATH·01「兩週速成」</a>（多數讀者建議）</li>
        <li><strong>② 讀第一章</strong> · 直接從 <a :href="withBase('/part-1/ch01-reliable')">Ch 1 可靠、可擴展、可維護</a> 開始，章首有預估時數</li>
        <li><strong>③ 完成測驗</strong> · 章末 Quiz 首次答對 ≥ 60% 自動通關、進度自動寫入本機（不必註冊）</li>
      </ol>
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

    <!-- F3 已讀過的讀者：顯示「繼續 · ChXX」（用 lastVisited 而非「下一個未讀」）
         W43-5 Wave 43：加「整本 X/12」與「上次讀於 Y 天前」frame、讓回訪者立刻看到自己的位置 -->
    <div v-else-if="resumeChapter" class="ddia-dashboard-resume">
      <div class="ddia-dashboard-resume-eyebrow">{{ resumeEyebrow }}</div>
      <a :href="withBase(resumeChapter.link)" class="ddia-dashboard-resume-link">
        <span class="ddia-dashboard-resume-num">{{ resumeChapter.num }}</span>
        <span class="ddia-dashboard-resume-title">{{ resumeChapter.shortTitle }}</span>
        <span class="ddia-dashboard-resume-arrow">→</span>
      </a>
      <div class="ddia-dashboard-resume-meta">
        <span>整本已讀 <strong>{{ doneCount }} / {{ totalChapters }}</strong> 章</span>
        <span v-if="lastVisitedAgo" class="ddia-dashboard-resume-ago">· 上次讀於 {{ lastVisitedAgo }}</span>
      </div>
    </div>

    <!-- 已讀過、但未完成、且沒有 lastVisited：fallback 顯示完整 stats -->
    <DashboardStats v-else />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import DashboardStats from './DashboardStats.vue'
import { useProgress } from '../../composables/useProgress'
import { CHAPTERS, PREREQUISITES, TOTAL_CHAPTERS } from '../../data/chapters'

const props = withDefaults(defineProps<{
  // mode='auto'（home 預設）：依 isFresh / isComplete / resumeChapter 決定畫面
  // mode='stats'（progress.md 用）：總是顯示 4 stat cards + 錯題本
  mode?: 'auto' | 'stats'
}>(), { mode: 'auto' })

const { doneCount, quizCount, isDone } = useProgress()
const totalChapters = TOTAL_CHAPTERS

// W43-5 Wave 43：「上次讀於 X 天前」相對時間（讀者語言、不顯示 timestamp）
const lastVisitedAgo = computed<string | null>(() => {
  if (!lastVisited.value) return null
  const diffMs = Date.now() - lastVisited.value.at
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return '剛剛'
  if (diffMin < 60) return `${diffMin} 分鐘前`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} 小時前`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay} 天前`
  return `${Math.floor(diffDay / 30)} 個月前`
})

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
</script>

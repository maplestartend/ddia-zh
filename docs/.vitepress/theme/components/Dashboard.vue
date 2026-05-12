<template>
  <div>
    <!-- 全新訪客：顯示歡迎卡而非「4 個零」的成績單空格（負向回饋） -->
    <div v-if="isFresh" class="ddia-dashboard-welcome">
      <div class="ddia-dashboard-welcome-eyebrow">
        <Icon name="waving_hand" :size="16" filled />
        歡迎！從這裡起步
      </div>
      <p class="ddia-dashboard-welcome-text">
        讀完任一章後，這裡會變成你的閱讀進度儀表板，追蹤已讀章節、測驗成績與下一個入口。
      </p>
      <div class="ddia-dashboard-welcome-cta">
        <a :href="withBase('/part-0/basics')" class="ddia-cta primary">
          <Icon name="foundation" :size="18" filled />
          新手起步 · 0.0 三分鐘看懂後端
        </a>
        <a :href="withBase('/part-1/ch01-reliable')" class="ddia-cta ghost">
          <Icon name="arrow_forward" :size="18" />
          直接讀 Ch1
        </a>
      </div>
    </div>

    <template v-else>
      <div class="ddia-dashboard">
        <div class="ddia-stat-card">
          <div class="ddia-stat-label">
            <Icon name="checklist" :size="16" />
            已讀完章節
          </div>
          <div class="ddia-stat-value brand numeric">{{ doneCount }} / {{ totalChapters }}</div>
          <div class="ddia-progress-bar" style="margin-top: 12px;">
            <div class="ddia-progress-fill" :style="{ width: progressPct + '%' }" />
          </div>
        </div>

        <div class="ddia-stat-card">
          <div class="ddia-stat-label">
            <Icon name="trending_up" :size="16" />
            整體進度
          </div>
          <div class="ddia-stat-value brand numeric">{{ progressPct }}%</div>
        </div>

        <div class="ddia-stat-card">
          <div class="ddia-stat-label">
            <Icon name="quiz" :size="16" />
            已完成測驗
          </div>
          <div class="ddia-stat-value numeric">{{ quizCount }}</div>
        </div>

        <div class="ddia-stat-card">
          <div class="ddia-stat-label">
            <Icon name="track_changes" :size="16" />
            測驗平均正確率
          </div>
          <!-- 沒做過測驗時顯示 — 而非 0%，避免誤判為「全錯」 -->
          <!-- empty class 讓 `—` 字級對齊其他三格（不會視覺塌空一格） -->
          <div class="ddia-stat-value numeric" :class="{ 'is-empty': quizCount === 0 }">
            {{ quizCount === 0 ? '—' : `${accuracy}%` }}
          </div>
        </div>
      </div>

      <div v-if="lastRead" style="text-align: center; margin: 24px 0;">
        <a :href="withBase(lastRead.link)" class="ddia-cta primary">
          <Icon name="arrow_forward" :size="18" filled />
          繼續閱讀 · {{ lastRead.shortTitle }}
        </a>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import Icon from './Icon.vue'
import { useProgress } from '../../composables/useProgress'
import { CHAPTERS, TOTAL_CHAPTERS } from '../../data/chapters'

const { doneCount, progressPct, quizCount, accuracy, isDone } = useProgress()
const totalChapters = TOTAL_CHAPTERS

// 全新訪客：「4 個零」是負向回饋。改顯示歡迎卡 + 兩個入口
const isFresh = computed(() => doneCount.value === 0 && quizCount.value === 0)
const lastRead = computed(() => CHAPTERS.find(c => !isDone(c.id)) ?? null)
</script>

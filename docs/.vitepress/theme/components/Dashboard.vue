<template>
  <div>
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
        <div class="ddia-stat-value numeric">{{ quizCount === 0 ? '—' : `${accuracy}%` }}</div>
      </div>
    </div>

    <div v-if="lastRead" style="text-align: center; margin: 24px 0;">
      <a :href="lastRead.link" class="ddia-cta primary">
        <Icon name="play_arrow" :size="18" filled />
        繼續閱讀 · {{ lastRead.shortTitle }}
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { useProgress } from '../../composables/useProgress'
import { CHAPTERS, TOTAL_CHAPTERS } from '../../data/chapters'

const { doneCount, progressPct, quizCount, accuracy, isDone } = useProgress()
const totalChapters = TOTAL_CHAPTERS

const lastRead = computed(() => CHAPTERS.find(c => !isDone(c.id)) ?? null)
</script>

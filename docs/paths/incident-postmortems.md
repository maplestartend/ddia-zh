---
title: 真實事故 × DDIA 章節對照
---

<ChapterMeta part="學習路徑" :read-time="25" difficulty="實務" :tags="['Postmortem', 'Incident', 'SRE']" />

# 真實事故 × DDIA 章節對照

DDIA 講「為什麼會壞」、這頁講「**壞掉了長什麼樣、怎麼救、事後 5-Whys 怎麼寫**」。8 個業界公開 postmortem 對應 DDIA 章節、配 1 個本土假想案例示範 blameless postmortem 模板。

> 方法論基礎：Google SRE Book Ch15「Postmortem Culture: Learning from Failure」。核心是 **blameless**（對事不對人）、**timeline 客觀化**、**action items 可驗收**。

---

## Postmortem 模板：5 段式

1. **Summary**（≤ 100 字）：什麼壞了 / 多久 / 影響範圍 / 對使用者的觀感
2. **Timeline**：UTC 時間軸、誰看到什麼、怎麼處置（用客觀事實、不用「我以為」）
3. **Root Cause**（5-Whys）：症狀 → why → why → why → why → why → 根因
4. **Resolution & Recovery**：怎麼救回來、要多久才完整復原（含 partial recovery 與 full recovery 區分）
5. **Action Items**：短期 hotfix + 長期 prevention + 監控 / 警報補強（每條要可指派、可驗收）

---

## 8 個業界公開事故對照

### 1. AWS S3 outage（2017-02-28、4 小時、US-EAST-1）

- **對應 DDIA**：Ch1 §1.2 cascading failure、Ch8 §8.1 partial failure
- **症狀**：S3 在 US-EAST-1 region 全面降級 4 小時、S3 console / 多數 AWS service（含 EC2 / Lambda / 第三方如 Trello / Slack）連帶當機
- **5-Whys**：
  1. 為何 S3 不可用？→ index 與 placement 子系統重啟、需要重建狀態
  2. 為何要重啟？→ 工程師執行 debug runbook、指令參數誤打、刪除過多 capacity
  3. 為何指令會誤刪？→ runbook 工具沒有保護機制（minimum capacity guard）
  4. 為何重建很慢？→ 子系統多年未做 full restart、scale 已遠超原設計
  5. 為何沒人知道會這麼慢？→ 沒有定期演練 cold-start，「能跑就不要動」的隱性假設
- **學到的**：runbook 工具要有 sanity check、子系統要定期 chaos test cold-start
- **官方 postmortem**：<https://aws.amazon.com/message/41926/>

### 2. Cloudflare 2019-07-02 全球 27 分鐘 outage（WAF rule regex catastrophic backtracking）

- **對應 DDIA**：Ch1 §1.2 reliability、Ch10 §10.3 batch job 與 production 隔離
- **症狀**：一條 WAF 規則部署後、全球 edge 的 CPU 100%、HTTP 502 滿天飛、27 分鐘後 rollback 才恢復
- **5-Whys**：
  1. 為何 CPU 100%？→ 新 WAF regex 有 catastrophic backtracking
  2. 為何 regex 會 catastrophic？→ `.*(?:.*=.*)` 巢狀量詞、worst-case 指數爆炸
  3. 為何 review 沒抓到？→ 人工 review 看不出 regex 複雜度
  4. 為何沒灰度部署？→ WAF 規則被視為「設定」、走 fast path 全球推
  5. 為何 fast path 沒煞車？→ 沒有 CPU 守門員、信任 regex 都是 O(n)
- **學到的**：所有 regex 必須過 ReDoS 檢測（如 re2 取代 PCRE）、設定變更也要灰度
- **官方 postmortem**：<https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/>

### 3. Fastly 2021-06-08 全球 49 分鐘 outage

- **對應 DDIA**：Ch1 cascading failure、Ch11 §11.5 stream rebalance storm
- **症狀**：49 分鐘內全球大量網站（Reddit / Twitch / NYT / UK gov）回 503、起因是一個客戶的合法 config 觸發潛伏 bug
- **5-Whys**：
  1. 為何 edge 全部 503？→ 5 月部署的軟體有潛伏 bug、特定 config 會 trigger
  2. 為何特定 config 才 trigger？→ bug 在罕見 code path、需要客戶 config 命中
  3. 為何客戶推 config 才爆？→ 該 config 6/8 才被啟用、之前不存在
  4. 為何 bug 沒被測到？→ 測試 matrix 覆蓋不到所有 customer config 組合
  5. 為何 bug 沒被隔離？→ 單一 customer config 能影響全球 edge（共享狀態）
- **學到的**：customer config 變更也要 canary、共享狀態要爆破半徑（blast radius）控制
- **官方 postmortem**：<https://www.fastly.com/blog/summary-of-june-8-outage>

### 4. Knight Capital 2012-08-01「45 分鐘賠 $440M」

- **對應 DDIA**：Ch4 §4.4 schema 與程式碼演進、Ch1 §1.4 maintainability
- **症狀**：8 台交易伺服器部署新交易演算法、1 台漏更（舊 code 留著）→ 舊功能 flag `Power Peg` 被新訊號觸發 → 45 分鐘狂送錯單 → 公司破產被收購
- **5-Whys**：
  1. 為何狂送錯單？→ 舊 dead code「Power Peg」被新 flag 名稱誤觸
  2. 為何舊 code 還在？→ 該功能 2003 年下架後、code 沒刪、只把 flag 改名
  3. 為何 flag 名重用？→ 新功能改用同名 flag、認為舊 code 已死
  4. 為何 1 台漏更？→ 手動部署、沒有自動化驗證所有節點版本一致
  5. 為何沒監控？→ alert 系統有發信、但 email subject 沒標 critical、被忽略
- **學到的**：dead code 要清乾淨（不是 comment 掉）、feature flag 名稱不能重用、部署要驗證版本一致性
- **參考**：<https://en.wikipedia.org/wiki/Knight_Capital_Group#2012_stock_trading_disruption>

### 5. GitHub 2018-10-21 split-brain（24h 降級）

- **對應 DDIA**：Ch5 §5.2 failover、Ch9 §9.2 CAP 在分區下選 CP 還 AP
- **症狀**：跨 DC 網路抖動 43 秒、MySQL Orchestrator 自動 failover、東西岸 DC 各自接受寫入、後續 24h 人工 reconciliation
- **5-Whys**：
  1. 為何兩 DC 都在寫？→ failover 把 US-East primary 升為 master、原 master 沒被 fence 掉
  2. 為何沒 fence？→ Orchestrator 假設網路恢復後舊 master 會自己降級、實際沒有
  3. 為何 43 秒就 failover？→ 健康檢查 threshold 太敏感、把短暫抖動當永久故障
  4. 為何沒人類介入？→ 自動 failover 設定 aggressive、追求 RTO 秒級
  5. 為何選 AP 而非 CP？→ 沒有明確寫下 trade-off、預設行為偏 AP
- **學到的**：跨 DC failover 要人類確認、orchestrator 要支援 fencing token、明確選定 CP/AP 並寫進 ADR
- **官方 postmortem**：<https://github.blog/2018-10-30-oct21-post-incident-analysis/>

### 6. GitLab 2017-01-31 誤刪 production DB（6h 資料遺失）

- **對應 DDIA**：Ch5 §5.1 replication、Ch1 §1.4 maintainability、Ch10 backup
- **症狀**：工程師夜間維護、`rm -rf /var/opt/gitlab/postgresql/data` 打在 production 而非 staging、5 種備份機制全失效、最後從 6h 前的 snapshot 復原
- **5-Whys**：
  1. 為何資料遺失？→ 工程師在 production 執行刪除指令
  2. 為何在 production？→ SSH session 開了兩個視窗、左右搞錯
  3. 為何 5 種備份都失效？→ pg_dump 版本不符靜默失敗、S3 bucket 空、Azure snapshot 沒對該 server 開、LVM snapshot 6h 一次、replication 也被刪
  4. 為何沒人發現備份失效？→ 沒有「成功備份」的監控警報（只有失敗才報、但 pg_dump 是 exit 0 配空檔）
  5. 為何沒演練復原？→「備份能跑」≠「能復原」、從沒做過 restore drill
- **學到的**：備份必須驗證可復原（restore drill）、production 與 staging shell prompt 必須視覺差異化、刪除指令要二次確認
- **官方 postmortem**：<https://about.gitlab.com/blog/2017/02/10/postmortem-of-database-outage-of-january-31/>

### 7. Roblox 2021-10-28 至 10-31 三日 outage（73 小時）

- **對應 DDIA**：Ch9 §9.5 共識（etcd / Consul 規模觸頂）、Ch11 cascading
- **症狀**：73 小時全球無法登入 / 遊玩、起因是 Consul 5K-node 叢集寫吞吐撞牆、leader election 風暴自我放大
- **5-Whys**：
  1. 為何 Consul 不穩？→ leader election 不斷切換、寫請求堆積
  2. 為何 election 不停？→ Consul 流量超過叢集寫容量、heartbeat 被淹沒
  3. 為何寫流量暴增？→ 新啟用 streaming feature 大量寫 KV
  4. 為何沒測到上限？→ 沒做容量規劃壓測、信任 Consul「自己會 scale」
  5. 為何修這麼久？→ Consul 寫入有 BoltDB 鎖死、需要 HashiCorp + Roblox 工程師協同 debug
- **學到的**：共識系統有硬性吞吐上限（典型 etcd ~10K writes/sec）、容量規劃要定期壓測、不要在 control plane 上跑高頻 data plane 流量
- **官方 postmortem**：<https://blog.roblox.com/2022/01/roblox-return-to-service-10-28-10-31-2021/>

### 8. Slack 2022-02-22「整天 spinner」（cascading replication lag）

- **對應 DDIA**：Ch5 §5.4 read-your-writes、Ch1 cascading failure
- **症狀**：使用者整天看到載入轉圈圈、訊息送不出去、起因是 MySQL primary slowdown 後 fallback 機制放大流量
- **5-Whys**：
  1. 為何 UI 轉圈圈？→ read 落到 replica、replica lag 太大、讀不到剛寫的資料
  2. 為何 replica lag 暴衝？→ primary 慢、寫 binlog 也慢、replica 跟不上
  3. 為何 primary 慢？→ 部分 query 沒走 index、CPU 撐高
  4. 為何沒走 index？→ 早上推了 schema migration、optimizer 統計過期
  5. 為何 fallback 把問題放大？→ 讀失敗重試 + 寫失敗重試 = 重試風暴
- **學到的**：schema migration 後要強制 `ANALYZE TABLE` 更新 optimizer 統計、重試要有 jitter + circuit breaker、讀寫分離要有 staleness 上限
- **官方 postmortem**：<https://slack.engineering/slacks-incident-on-2-22-22/>

---

## 本土假想案例：街口轉帳 2024 雙 11 partial failure（教學示範）

> 此為**虛構教學案例**、僅作為 blameless postmortem 模板示範、與街口支付實際營運狀況無關。

### Summary

2024-11-11 00:00:00 至 00:32:14（UTC+8）、街口轉帳服務在雙 11 開賣瞬間因 DB connection pool 耗盡 + 客戶端重試風暴、全站約 32 分鐘無法完成轉帳、影響估計 180 萬筆交易、partial recovery 於 00:18 開始、full recovery 於 00:32。

### Timeline（UTC+8）

| 時間 | 事件 |
|---|---|
| 2024-11-10 23:58 | 行銷推播「00:00 開搶」送出 1,200 萬封通知 |
| 00:00:00 | 流量瞬間從 base 2K TPS 衝到 38K TPS（19 倍） |
| 00:00:08 | MySQL primary connection pool 到上限 5000 |
| 00:00:15 | API server 開始回 503、客戶端啟動 exponential retry（無 jitter） |
| 00:00:42 | 重試流量讓實際請求達 90K TPS、connection pool 100% 等待 |
| 00:01:30 | PagerDuty 觸發 P1、on-call SRE 看到 dashboard |
| 00:03:00 | 第一個 hypothesis：DB 慢、決定加 read replica（錯誤判斷） |
| 00:08:00 | 加 replica 沒救、發現是 connection pool 不是 DB CPU |
| 00:12:00 | 決定 enable rate limit、把入口流量壓到 15K TPS |
| 00:14:00 | rate limit 生效、DB pool 開始回收 |
| 00:18:00 | partial recovery、部分轉帳成功率回 80% |
| 00:25:00 | 客戶端重試風暴退去、成功率回 95% |
| 00:32:14 | full recovery、成功率 99.5%、incident 收尾 |

### Root Cause（5-Whys）

1. **為何 32 分鐘無法轉帳？** → connection pool 耗盡、新請求拿不到 DB 連線
2. **為何 pool 會耗盡？** → 流量瞬間 19 倍、超過 connection pool 容量規劃
3. **為何容量規劃沒涵蓋？** → 雙 11 壓測用的是平均流量 4 倍、不是 peak 19 倍
4. **為何壓測模型錯了？** → 沒有把行銷推播 1,200 萬封同時送出的 thundering herd 納入模型
5. **為何 thundering herd 沒被預期？** → 行銷團隊與 SRE 團隊之間沒有 capacity review 流程

**根因**：跨團隊（行銷 ↔ SRE）的 capacity review 流程缺失、加上客戶端重試沒 jitter 放大故障。對應 DDIA Ch1 cascading failure、Ch8 §8.3 timeout + retry 反 pattern。

### Resolution & Recovery

- **即時止血（00:12-00:18）**：在入口 Nginx 啟動 rate limit 15K TPS、丟掉超量請求
- **partial recovery（00:18）**：DB pool 開始回收、part of users 能轉帳
- **full recovery（00:32）**：客戶端重試風暴自然退去、無需手動清理
- **資料完整性**：無資料遺失、未完成轉帳全部 rollback（quorum 寫入未達門檻就不算成功）

### Action Items

| # | 動作 | 負責人 | 驗收標準 | 截止 |
|---|---|---|---|---|
| 1 | 行銷推播 ↔ SRE capacity review 流程 | PM Lily | 雙週 sync、推播 ≥100 萬封強制 review | 2024-11-30 |
| 2 | 客戶端 retry 加 jitter（±30%）+ circuit breaker | Mobile Alex | App 1.8.0 上線、jitter 抓 log 驗證 | 2024-12-15 |
| 3 | DB connection pool 自動 scale（從 5K 到 15K） | SRE Ben | 壓測 90K TPS 不掉 | 2024-12-31 |
| 4 | 入口 rate limit 自動觸發（不需人工） | SRE Cathy | 流量 > 30K TPS 自動開、告警通知 | 2024-12-31 |
| 5 | thundering herd 壓測模型納入年度演練 | SRE Lead | 2025 Q1 演練報告涵蓋 | 2025-03-31 |

---

## 怎麼寫好 blameless postmortem

三個關鍵原則（出自 Google SRE Book Ch15「Postmortem Culture」）：

1. **對事不對人（blameless）**
   - ❌「Alex 沒檢查容量規劃」
   - ✅「容量規劃流程未涵蓋 thundering herd 場景」
   - 理由：人會犯錯、好的系統設計能容錯。指責個人會讓未來事故被掩蓋、組織學不到東西。

2. **timeline 用 UTC + 客觀事實**
   - ❌「我以為是 DB CPU 撐高」
   - ✅「00:03 SRE 觀察 dashboard CPU 60%、判斷為 DB bottleneck（事後證實判斷錯誤）」
   - 理由：postmortem 是給未來人看的、主觀心理活動不可驗證。

3. **action items 要可指派、可驗收**
   - ❌「以後要小心 connection pool」
   - ✅「DB connection pool 自動 scale、SRE Ben 負責、壓測 90K TPS 不掉、2024-12-31 前完成」
   - 理由：沒有負責人 / 沒有驗收標準的 action item = 沒有 action item。

---

## 連結到 DDIA 章節

| DDIA 章節 | 對應事故 |
|---|---|
| Ch1 §1.2 cascading failure | S3 / Fastly / Slack / 街口假想 |
| Ch1 §1.4 maintainability | Knight Capital / GitLab |
| Ch4 §4.4 schema 演進 | Knight Capital |
| Ch5 §5.1 replication / backup | GitLab |
| Ch5 §5.2 failover | GitHub |
| Ch5 §5.4 read-your-writes | Slack |
| Ch8 §8.1 partial failure | S3 |
| Ch8 §8.2 unreliable network | GitHub / Cloudflare |
| Ch8 §8.3 timeout / retry | Slack / 街口假想 |
| Ch9 §9.2 CAP（分區下選擇） | GitHub |
| Ch9 §9.5 共識吞吐上限 | Roblox |
| Ch10 §10.3 batch / config 隔離 | Cloudflare |
| Ch11 §11.5 stream rebalance | Fastly / Roblox |

---

## 怎麼用這頁

1. 讀完任何一章、回來查對應的事故、用 5-Whys 模板自己分析一遍
2. 試著把某個事故改寫成「**如果是你的團隊遇到、你會怎麼處理 timeline / action items？**」
3. 把街口假想案例的模板拿去套你自己工作上看過的小事故（內部 wiki 不公開即可）

> **核心信念**：DDIA 講「為什麼會壞」是知識、postmortem 練習「壞掉了怎麼救」是技能。**讀一章 + 練一份 postmortem、你會記得這章 5 年以上**。

# Security Policy

## 範圍

本 repo 是靜態網站（VitePress SSG + GitHub Pages），**無後端、無資料庫、不收集任何使用者資料**——進度與測驗紀錄都存在使用者瀏覽器的 `localStorage`。

因此安全議題的範圍主要是：

- **建構腳本**：`scripts/*.mjs`、`docs/.vitepress/config.mts`、`package.json` 內的 npm scripts
- **Vue 元件**：`docs/.vitepress/theme/components/*.vue` 與相依的 composables
- **依賴**：`package.json` 中的 npm 套件（dependabot 已配置 weekly 更新）
- **GitHub Actions workflows**：`.github/workflows/*.yml`

**不在範圍**：

- 原書內容本身的事實錯誤（請走 [Issue content-error template](https://github.com/maplestartend/ddia-zh/issues/new?template=01-content-error.yml)）
- GitHub Pages / VitePress / Vue 等上游套件的漏洞（請回報給上游）

## 回報方式

**不要直接開公開 Issue**（避免漏洞細節在修補前被惡意利用）。

請走以下私下管道：

📧 **`asercv14632@gmail.com`**

回報時請附：

1. **漏洞位置**：哪個檔案 / 哪個 workflow
2. **重現步驟**：可重現的最小步驟
3. **影響範圍**：可能造成的後果（資訊洩漏、CI 被劫持、build 注入等）
4. **建議修法**（如果有）

## 處理時程

- **24 小時內**：作者確認收到
- **7 天內**：初步評估、確認是否屬於本 repo 範圍
- **30 天內**：修補並公開揭露（除非有合理理由延長）

## 致謝

如果你的回報導致實際修補，作者會在 SECURITY.md 「致謝」段落具名感謝（除非你要求匿名）。

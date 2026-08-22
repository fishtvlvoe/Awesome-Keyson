# ⌨️【Key神 / Awesome-Keyson】自動 Key 單與表單填寫助手

> **消滅重複手打！貼上網址自動語意填表 · 零知識本機安全金庫 · 雙重審批人工防線**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux-green.svg)]()

---

## 💡 這東西是做什麼的？（給小白的大白話）

你有沒有遇過這種煩人的狀況：

1. **每天都在重複填寫基本資料**：註冊各類海外 SaaS 服務、申請雲端平台帳號、填寫金流或企業認證，每次都要手動複製貼上統一編號、公司英文名稱、登記地址、負責人姓名、護照號碼...
2. **欄位名稱都不一樣**：有的網站叫 `VAT Number`、有的叫 `Tax ID`、有的叫 `統一編號`，每個表單格式都不同，複製到眼花手痠。
3. **擔心敏感資料外洩**：不想把敏感證件或密碼交給來路不明的雲端擴充套件。

**Key神 (Awesome-Keyson)** 就是為了解決這件事而生的 **「智慧自動 Key 單助手」**。

👉 **貼上表單網址 ➔ 智慧語意辨識中英文欄位 ➔ 本機 AES-256 零知識安全金庫自動填入 ➔ 彈出視窗等你確認後才送出**！


---

<!-- GODS-FAMILY:START -->
## 👑 「神」系列家族：彼此怎麼接力合作？

「神」系列不是各自為政的工具，而是一條從**商務接案、工程開發到成果交付**的完整流水線：

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                       👑 「神」系列家族完整協同接力鏈                         │
└─────────────────────────────────────────────────────────────────────────┘

【第一棒：接案與商務需求】
  📋 案神 (Awesome-Anson) ➔ 丟進客戶會議逐字稿與資料，自動拆解需求、產出報價單與簡報。
         │
         ▼ (客戶成交，需求確認，交棒給工程總管)
【第二棒：自動化工程開發】
  🏗️ 蓋神 (Awesome-Gason) ➔ 把需求轉成 Spectra 規格，指揮多 Agent 在隔離房間寫碼與驗收。
         │
         ├─► 🗣️ 譯神 (Awesome-Eason) ➔ 過程中遇到看不懂的技術名詞？對外文案太假？
         │                               隨時叫「譯神」出來翻譯成白話、去 AI 味。
         │
         ├─► ⌨️ Key神 (Awesome-Keyson) ➔ 專案需註冊第三方平台、申請 API Key、填寫繁瑣企業表單？
         │                               貼上網址交給「Key神」安全自動填表，不用手打。
         │
         ▼ (系統開發完成，功能已驗收上線)
【第三棒：產品交付與行銷宣傳】
  🎬 剪神 (Awesome-Janson) ➔ 錄好的系統操作教學、發表會影片，一鍵自動精修成長片與爆款短影音。
```

### 家族成員倉庫速查

* 📋 **[案神 Awesome-Anson](https://github.com/fishtvlvoe/Awesome-Anson)**：接案分析、商務報價、合約拆解與提案簡報架構
* 🏗️ **[蓋神 Awesome-Gason](https://github.com/fishtvlvoe/Awesome-Gason)**：Spectra SDD 全自動開發總管（規格→TDD→多代理派工→CR→驗收）
* 🗣️ **[譯神 Awesome-Eason](https://github.com/fishtvlvoe/Awesome-Eason)**：小白技術降維、台灣繁中去 AI 味與翻譯急救
* ⌨️ **[Key神 Awesome-Keyson](https://github.com/fishtvlvoe/Awesome-Keyson)**（本倉庫）：自動 Key 單、智慧語意對齊與跨平台表單自動填寫
* 📊 **[待神 Awesome-Dyson](https://github.com/fishtvlvoe/Awesome-Dyson)**：跨專案開發儀表板：固定網址看現況、進度、待確認事項與歷史紀錄，換 CLI/AI 接手不用重新對焦
* 🎬 **[剪神 Awesome-Janson](https://github.com/fishtvlvoe/Awesome-Janson)**：全能 AI 影片剪輯 Agent（長片精修、爆款短影音與動效）
<!-- GODS-FAMILY:END -->

---
### 家族成員倉庫速查

* 📋 **[案神 Awesome-Anson](https://github.com/fishtvlvoe/Awesome-Anson)**：接案分析、商務報價、合約拆解與提案簡報
* 🏗️ **[蓋神 Awesome-Gason](https://github.com/fishtvlvoe/Awesome-Gason)**：Spectra SDD 全自動開發總管
* 🗣️ **[譯神 Awesome-Eason](https://github.com/fishtvlvoe/Awesome-Eason)**：小白模式技術降維、台灣繁中去 AI 味與翻譯急救
* ⌨️ **[Key神 Awesome-Keyson](https://github.com/fishtvlvoe/Awesome-Keyson)**（本倉庫）：自動 Key 單、智慧語意對齊與跨平台表單自動填寫
* 🎬 **[剪神 Awesome-Janson](https://github.com/fishtvlvoe/Awesome-Janson)**：全能 AI 影片剪輯 Agent（長片精修、短影音與動效）

---

## 🌟 核心特色與安全架構

1. 🔐 **零知識本機安全金庫 (Zero-Knowledge Vault)**：
   - 一般公開資料（L1：公司名、網址、公開統編）存放本機 JSON。
   - 敏感資料（L2：負責人身分證、護照、個人手機）使用 **AES-256-GCM** 本機加密，需要密碼才解密。
   - 極度危險資料（L3：信用卡 CVV、銀行密碼）**永久禁止持久化儲存**，嚴格遵守安全底線。
2. 🧠 **智慧語意欄位對齊 (Semantic Field Matcher)**：
   - 自動辨識中英文變體（統編 / VAT / Tax ID / EIN、公司名 / Company Name / DBA、負責人 / Representative）。
   - 不猜測未辨識欄位，避免誤填。
3. 🛑 **雙重人工審批 (2FA Confirmation Loop)**：
   - 填完表單後停在畫面，終端提示確認：`Submit form now? (y/N)`。
   - 使用者點頭同意前，**絕不自動點擊送出或付款**。

---

## 🚀 快速上手

### 1. 安裝依賴與編譯

```bash
git clone https://github.com/fishtvlvoe/Awesome-Keyson.git Awesome-Keyson
cd Awesome-Keyson
npm install
npm run build
```

### 2. 設定你的個人／企業基本資料

初次使用時，在本地建立設定檔（支援加密金庫）：

```bash
# 查看幫助說明
npm run autofill -- --help
```

### 3. 一鍵自動填表

```bash
npm run autofill -- --url "https://example.com/signup"
```

---

## 📚 文檔索引

- [系統架構設計 (docs/ARCHITECTURE.md)](docs/ARCHITECTURE.md)
- [安全與隱私防護策略 (docs/SECURITY-AND-PRIVACY.md)](docs/SECURITY-AND-PRIVACY.md)
- [開發路線圖與 MVP 規劃 (docs/ROADMAP-AND-MVP.md)](docs/ROADMAP-AND-MVP.md)

---

## 📄 開源授權

本專案採用 [MIT License](LICENSE) 開源授權。

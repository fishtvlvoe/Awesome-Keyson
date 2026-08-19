---
name: form-filler
description: 智慧自動填表助手 Key神（Awesome-Keyson）。根據使用者提供的網址，解析網頁表單欄位並依分級規則（L1 一般公開、L2 加密金庫、L3 拒寫磁碟）安全自動填入資料。
---

# Key神 Form Filler Skill

當使用者要求自動填寫網頁表單、登記資料、申請帳號時，調用本 Skill。

## 常用指令

### 1. 填寫目標網頁表單
```bash
node dist/src/cli/index.js fill <URL>
```
- 自動辨識公司名、統編、負責人、地址、電話、Email 等欄位
- 若含有身分證字號等 L2 敏感資料，會提示輸入 Master Password 解密
- 填寫完畢後會**停留並截圖**供使用者確認，絕不擅自按下送出

### 2. 初始化 / 編輯本機資料檔
```bash
node dist/src/cli/index.js init
```
- 設定本機一般資料（`profile.json`）與加密金庫（`vault.enc`）

### 3. 清除所有本機資料（銷毀金庫）
```bash
node dist/src/cli/index.js vault purge
```

# Key神 Awesome-Keyson — 系統架構設計

## 1. 系統全貌架構

```text
┌─────────────────┐       (1) LINE 貼連結: "幫我填這個申請表 https://..."
│  使用者 LINE    │ ───────────────────────────────────┐
└─────────────────┘                                    │
        ▲                                              ▼
        │ (4) 回傳填寫摘要/截圖                 ┌───────────────┐
        │     "已填完 8 個欄位，請確認"          │ LINE Webhook  │
        │     [確認送出] [放棄]                │ (雲端中繼站)  │
        └───────────────────────────────────┐  └───────────────┘
                                            │          │ (2) 派發任務 (Task Dispatch)
                                            │          ▼
┌──────────────────────────────────────────────────────────────┐
│ 使用者本機 (Mac / Windows / Linux)                           │
│                                                              │
│  [安全金庫 Local Vault] (~/.keyson/vault.enc)                │
│  • AES-256-GCM 本機加密，金鑰由使用者掌控                     │
│  • 支援 L1 常用資料、L2 證件隱私、L3 金流加密                │
│                                                              │
│  [語意欄位比對器 (Semantic Field Matcher)]                   │
│  • DOM 抽取 (label, placeholder, name, aria, context)        │
│  • LLM 中英對齊 (VAT/EIN -> 統編, DBA -> 品牌名)             │
│                                                              │
│  [瀏覽器自動化引擎 (ego-browser / Playwright)]               │
│  • (3) 自動開啟網頁、填寫表單、處理下拉選單與檔案上傳         │
│  • 停在送出按鈕前，截圖並等待確認                            │
└──────────────────────────────────────────────────────────────┘
```

## 2. 核心模組

### 2.1 語意欄位映射器 (Semantic Field Matcher)
* **輸入**：HTML DOM 樹內所有 `<input>`, `<textarea>`, `<select>` 元素及其關聯 label / placeholder / aria-label。
* **映射邏輯**：
  * **公司/商業類**：
    * `公司名稱` / `Legal Business Name` / `Company` → `company.name`
    * `統一編號` / `統編` / `VAT` / `EIN` / `Tax ID` / `BRN` → `company.tax_id`
    * `營業別名` / `品牌名稱` / `DBA` / `Trade Name` → `company.dba`
    * `登記地址` / `公司地址` / `Registered Address` → `company.registered_address`
  * **個人/負責人類**：
    * `負責人` / `姓名` / `Representative` / `Full Name` → `user.name`
    * `身分證字號` / `ID Number` / `National ID` → `user.id_number`
    * `護照號碼` / `Passport No.` → `user.passport_number`
    * `聯絡電話` / `手機` / `Phone` / `Mobile` → `user.phone`
    * `電子信箱` / `Email` → `user.email`

### 2.2 本機執行中繼 (Local Runner / Sidecar)
* 使用者電腦啟動一個輕量背景服務（Daemon / CLI），透過 WebSocket 與 LINE Webhook 連線。
* **無公開 IP 要求**：本機主動向雲端建立 Secure WebSocket，無需設定 Router Port Forwarding。
* 當收到 LINE 任務時，本機啟動 `ego-browser` 進行自動填寫。

### 2.3 安全審批閉環 (2FA Confirmation Loop)
1. 填寫完成後，Agent 不會自動點擊「送出 / 付款」。
2. Agent 自動截圖填寫完成畫面，並生成摘要（例如：`已自動填入 6 個欄位：統編、公司名、地址、負責人、身分證號、業務描述`）。
3. LINE 收到摘要與截圖，提供按鈕：
   * **[確認點擊送出]** ➔ 本機 Agent 點擊送出並回傳完成狀態。
   * **[手動接手]** ➔ 保留瀏覽器視窗供使用者自行微調。

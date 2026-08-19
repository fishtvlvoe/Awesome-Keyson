# 開發路線圖與 MVP 規劃 (Roadmap & MVP)

## Phase 1: 本地 Profile CLI & 填表核心 (MVP)
* **目標**：在本地 CLI 中實現給予網址即自動填表。
* **交付物**：
  1. `~/.autofill/profile.json` 結構定義與 CLI 設定精靈。
  2. `ego-browser` / Playwright 自動表單探索與語意映射腳本。
  3. 單一指令執行：`form-filler fill <url>`。

## Phase 2: LINE Bot 遠端觸發與安全中繼
* **目標**：實現透過 LINE 對話貼網址，電腦自動在背景填表並回報。
* **交付物**：
  1. LINE Messaging API Webhook 服務。
  2. 本地 Agent Daemon（WebSocket 連線中繼）。
  3. LINE 互動式卡片（確認填寫項目、截圖預覽、送出按鈕）。

## Phase 3: 智慧學習與異常處理
* **目標**：提升對複雜表單、驗證碼、多頁式步驟表單的支援。
* **交付物**：
  1. 遇到未知欄位時，主動詢問使用者並將對應關係記憶至個人規則庫。
  2. 圖片/檔案上傳自動化（如營業執照、身分證正反面）。
  3. 支援 Chrome Extension / 桌面 GUI。

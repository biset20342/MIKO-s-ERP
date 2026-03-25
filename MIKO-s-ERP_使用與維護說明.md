# MIKO-s-ERP 使用與維護說明

> **🤖 給 AI 助手 (For AI Assistants) 的閱讀與編輯指南**：
> 1. **架構**：本專案為 **Node.js + Express + better-sqlite3** 架構，透過 `npm start` 啟動後，用瀏覽器開啟 `http://localhost:3000`。
> 2. **全域變數**：所有宣告於 `public/js/` 資料夾內的模組化腳本，其函數與變數皆暴露於 Window 全域環境，請確保命名無衝突。
> 3. **開發約定**：前端使用 `q(sql, args)` 與 `exec(sql, args)`（`public/js/02_db.js`）透過同步 XHR 呼叫後端 `/api/query` 與 `/api/exec`。後端 `server.js` 使用 `better-sqlite3` 同步寫入 `data/erp.db`。
> 4. **版號更新約定**：當您對系統的邏輯或介面總結修改完畢後，**請務必修改 `public/index.html` 左上角 `<div class="logo-ver">` 裡的版號**（如：從 v2.1.0 升為 v2.1.1 等），並於 `server.js` 頂部的 `package.json` 同步更新。

---

本系統為**本機單機架構** ERP 系統，專為設計與委外加工流程打造。資料儲存於後端實體的 SQLite 檔案中，**每次資料變動後自動寫盤**，無需手動儲存。

---

## 🚀 1. 快速啟動

### 首次安裝 (Windows / Mac 皆適用)

```bash
cd 專案資料夾路徑 (例如 D:\暫存區 或 Mac 上的實際目錄)
npm install
```
*(Mac 用戶請確保已安裝 [Node.js](https://nodejs.org/)，並透過「終端機」進入目錄後執行)*

### 日常啟動

**🍎 Mac 用戶（二選一）**：
1. **最簡單**：在 Finder 中直接雙擊 `start.command` 檔案。（系統會自動開啟終端機並執行）
   > *(註：首次使用時如果沒有反應或提示無權限，請先開啟一次「終端機」，輸入 `chmod +x ` 後加上空格，然後把 `start.command` 拖曳到終端機視窗並按下 Enter 賦予執行權限)*
2. **終端機指令**：請開啟「終端機」(Terminal) 進入專案目錄，執行 `npm start`

**🪟 Windows 用戶（二選一）**：
1. **最簡單**：在檔案總管中直接雙擊 `start.bat`
2. **終端機指令**：在專案目錄下執行 `npm start`

啟動成功後，終端機會顯示：
```
🚀 ProjectERP Server 已啟動
   ➜  http://localhost:3000
   📁 資料庫：D:\暫存區\data\erp.db
```

瀏覽器開啟 `http://localhost:3000` 即可使用。建議使用 Google Chrome 或 Microsoft Edge。

---

## 💾 2. 資料儲存與備份機制

### 自動存檔（無需任何操作）

- **觸發時機**：任何新增、編輯、刪除操作，後端收到請求後**立即同步寫入** `data/erp.db`。
- **存檔確認**：左側邊欄底部常駐顯示「**✓ 自動存檔**」。
- **安全性**：就算瀏覽器當機、清除快取，資料依然完好保存在 `data/erp.db`。

### 手動備份（建議定期操作）

至「設定 → 資料備份」頁面：
- **💾 下載備份**：下載一份 `project-erp-backup.db`，可存入隨身碟/NAS。
- **📂 從備份還原**：上傳先前下載的 `.db` 備份，伺服器會以此覆蓋 `data/erp.db`（需重啟伺服器）。

> 💡 備份檔為標準 SQLite 格式，可用 [DB Browser for SQLite](https://sqlitebrowser.org/) 直接開啟查閱。

### 跨電腦轉移資料

1. 在 A 電腦：「設定 → 資料備份 → 下載備份」，取得 `project-erp-backup.db`。
2. 複製整個 `MIKO-s-ERP` 專案資料夾到 B 電腦。
3. 在 B 電腦執行 `npm install` 後啟動，若需恢復 A 電腦的資料，將備份檔放入 `data/` 目錄並命名為 `erp.db` 覆蓋即可。

---

## 📁 3. 檔案架構說明（開發者與維護者適用）

```text
MIKO-s-ERP/
├── server.js           # 後端主程式：Express + better-sqlite3 + REST API
├── start.bat           # 一鍵啟動腳本（Windows）
├── package.json        # Node.js 依賴設定
├── data/
│   └── erp.db          # SQLite 資料庫（自動建立，勿手動刪除）
└── public/             # 前端靜態資源（由 Express 提供）
    ├── index.html      # 系統入口骨架
    ├── css/
    │   └── style.css   # 所有視覺樣式、色彩主題宣告
    └── js/             # 系統核心邏輯（共 22 個前端模組）
        ├── 02_db.js    # 前端 DB API 層（同步 XHR 呼叫後端）
        ├── 03_autosave.js  # 自動存檔狀態指示器（後端已自動寫盤）
        ├── 04_utils.js # 通用工具函數
        ... (各業務模組，例如 09_quotes.js 處理報價單)
        ├── 21_csv.js   # CSV 報表匯出
        ├── 22_pdf.js   # PDF 報表列印
        └── 23_init.js  # 系統啟動進入點（載入快取、套用主題）
```

> **⚠️ 注意：** 前端修改請編輯 `public/js/` 與 `public/css/` 中的檔案。根目錄的 `js/` 與 `css/` 為舊版備份目錄，已不再使用。

---

## 🛠️ 4. 日常功能修改與維護指南

### Q1: 如何新增一個欄位（例如在「客戶資料」新增「統一編號」）？

1. **修改後端 Schema（`server.js`）**：找到 `db.exec(...)` 的 Schema 建表字串，在 `CREATE TABLE IF NOT EXISTS customers` 中加入 `tax_id TEXT`。
2. **加入 Migration**：找到 `const migrations = [...]` 陣列，加入：`"ALTER TABLE customers ADD COLUMN tax_id TEXT"`（伺服器每次啟動時會安全地嘗試執行）。
3. **修改儲存邏輯**：打開 `public/js/17_master.js` 找到 `saveCustomer` 的 `exec()` 語句，加入相應參數。
4. **修改介面 HTML**：同時在 `showAddCustomer` 與 `showEditCustomer` 方法中加入 `tax_id` 的 `<input>` 輸入框。

### Q2: 如何新增一個後端 API 路由？

在 `server.js` 中仿照現有路由格式新增：
```js
app.post('/api/my-feature', (req, res) => {
  const result = db.prepare('SELECT ...').all();
  res.json(result);
});
```

### Q3: 如何改變系統的 UI 顏色？

打開 `public/css/style.css` 頂部的 `:root` 或 `[data-theme="xxx"]` 區塊，修改 CSS 變數（如 `--bg`、`--accent` 等）。修改後重新整理瀏覽器（`F5`）即可立即生效。

### Q4: 如何加掛新的外部函式庫？

在 `public/index.html` 底部的 `<script>` 區段中新增 CDN 連結，請確保放置在 `23_init.js` 上方。

---

## 🚑 5. 常見問題排除

| 問題狀況 | 原因與解決方法 |
| --- | --- |
| **`npm start` 後無法開啟頁面** | 確認終端機顯示「Server 已啟動」再開瀏覽器；確認 port 3000 未被占用（`netstat -ano \| findstr :3000`）。 |
| **畫面一直停在「連線至本機伺服器...」** | 確認 `node server.js` 仍在執行中，未被關閉。重新執行 `npm start` 或雙擊 `start.bat`。 |
| **資料消失了** | 確認 `data/erp.db` 仍存在（可用檔案總管確認）。若曾複製專案資料夾，確保把 `data/` 目錄一同複製過去。 |
| **想要將資料帶到另一台電腦** | 在設定頁面下載備份 `.db`，在另一台電腦覆蓋 `data/erp.db`，重啟伺服器即可。 |
| **Node.js 未安裝** | 前往 [https://nodejs.org](https://nodejs.org) 下載 LTS 版本安裝，安裝後重新執行 `npm install`。 |

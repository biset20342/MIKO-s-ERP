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



## 🚑 3. 常見問題排除

| 問題狀況 | 原因與解決方法 |
| --- | --- |
| **`npm start` 後無法開啟頁面** | 確認終端機顯示「Server 已啟動」再開瀏覽器；確認 port 3000 未被占用（`netstat -ano \| findstr :3000`）。 |
| **畫面一直停在「連線至本機伺服器...」** | 確認 `node server.js` 仍在執行中，未被關閉。重新執行 `npm start` 或雙擊 `start.bat`。 |
| **資料消失了** | 確認 `data/erp.db` 仍存在（可用檔案總管確認）。若曾複製專案資料夾，確保把 `data/` 目錄一同複製過去。 |
| **想要將資料帶到另一台電腦** | 在設定頁面下載備份 `.db`，在另一台電腦覆蓋 `data/erp.db`，重啟伺服器即可。 |
| **Node.js 未安裝** | 前往 [https://nodejs.org](https://nodejs.org) 下載 LTS 版本安裝，安裝後重新執行 `npm install`。 |

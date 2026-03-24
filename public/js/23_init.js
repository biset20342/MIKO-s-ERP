/**
 * 23_init.js — 應用程式啟動入口（Node.js 後端版）
 * 資料庫由後端 server.js + better-sqlite3 管理
 * 前端啟動只需：載入快取 → 套用主題 → 導覽至 dashboard
 */

function initApp() {
  // 套用已儲存的主題
  initTheme();

  // 預載快取陣列（供下拉選單等使用）
  _custs = q('SELECT id,name FROM customers ORDER BY name');
  _svcs  = q('SELECT id,name,unit,default_price,category FROM services ORDER BY category,name');
  _supps = q('SELECT id,name FROM suppliers ORDER BY name');

  // 套用使用者姓名職稱
  applyUserSettings();

  // 顯示介面
  document.getElementById('loading').classList.remove('show');
  go('dashboard');
}

window.addEventListener('DOMContentLoaded', initApp);

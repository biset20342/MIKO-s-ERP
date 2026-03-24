/**
 * 23_init.js — 應用程式啟動入口
 * 執行順序：
 *   1. sql-wasm.js 載入完成後初始化 SQL.Database
 *   2. 嘗試從 localStorage 恢復資料（loadFromLocalStorage）
 *   3. 若無資料，建立新 DB 並執行 SCHEMA
 *   4. 套用已儲存的 theme
 *   5. 載入快取資料（_custs, _svcs, _supps）
 *   6. 導航至 dashboard
 *   7. 隱藏 loading 畫面
 */

async function initSQL() {
  SQL = await initSqlJs({
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`
  });

  // 嘗試從 localStorage 恢復，失敗則建立新 DB
  const restored = loadFromLocalStorage();
  if (!restored) {
    db = new SQL.Database();
    db.run(SCHEMA);
    console.log('[Init] 建立全新資料庫');
  }

  // 套用主題
  const theme = getSetting('theme', '');
  if (theme) document.documentElement.setAttribute('data-theme', theme);

  // 預載快取陣列
  _custs = q("SELECT id,name FROM customers ORDER BY name");
  _svcs  = q("SELECT id,name,unit,default_price,category FROM services ORDER BY category,name");
  _supps = q("SELECT id,name FROM suppliers ORDER BY name");

  // 啟動畫面
  document.getElementById('loading').classList.remove('show');
  go('dashboard');
}

window.addEventListener('DOMContentLoaded', initSQL);

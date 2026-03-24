/**
 * 03_autosave.js — 自動存檔與資料持久化
 * 機制：每次 exec() 後 800ms 防抖觸發，並在頁面關閉前強制存檔
 * 儲存位置：localStorage['erp_db_autosave']（Base64 編碼的 SQLite 二進位）
 * 對外暴露：autoSave(), loadFromLocalStorage()
 */

const AUTOSAVE_DELAY_MS = 800;
const LS_KEY_DB = 'erp_db_autosave';
const LS_KEY_TS = 'erp_db_autosave_ts';

/**
 * 將 in-memory SQLite 序列化存入 localStorage
 * 成功後在 sidebar footer 顯示「✓ 已儲存」與時間戳
 */
function autoSave() {
  if (!db) return;
  try {
    const data = db.export();                           // Uint8Array
    const b64 = btoa(String.fromCharCode(...data));
    localStorage.setItem(LS_KEY_DB, b64);
    localStorage.setItem(LS_KEY_TS, new Date().toISOString());
    
    // 同步寫入 NAS/實體硬碟 (確保清除快取不會遺失資料)
    if(typeof autoSaveWithBackup === 'function') {
      autoSaveWithBackup().then(() => {
        _updateSaveIndicator('saved');
      }).catch(e => {
        _updateSaveIndicator('error');
      });
    } else {
      _updateSaveIndicator('saved');
    }
  } catch (e) {
    console.error('[AutoSave] 失敗:', e);
    _updateSaveIndicator('error');
  }
}

/**
 * 啟動時從 localStorage 恢復資料庫
 * @returns {boolean} 是否成功恢復
 */
function loadFromLocalStorage() {
  const b64 = localStorage.getItem(LS_KEY_DB);
  if (!b64) return false;
  try {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    db = new SQL.Database(bin);
    const ts = localStorage.getItem(LS_KEY_TS);
    console.log('[AutoSave] 從 localStorage 恢復，上次儲存：', ts);
    return true;
  } catch (e) {
    console.error('[AutoSave] 恢復失敗:', e);
    return false;
  }
}

/** 更新 sidebar footer 的儲存狀態提示文字 */
function _updateSaveIndicator(state) {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  const map = { saving: '⏳ 儲存中...', saved: '✓ 已儲存', error: '⚠ 儲存失敗' };
  const ts = localStorage.getItem(LS_KEY_TS);
  const timeStr = ts ? new Date(ts).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '';
  el.textContent = (map[state] || '') + (timeStr ? ' ' + timeStr : '');
}

// 頁面關閉前強制存檔（不等防抖計時器）
window.addEventListener('beforeunload', () => {
  clearTimeout(window._autoSaveTimer);
  autoSave();
});

/**
 * 03_autosave.js — 自動儲存狀態指示（Node.js 後端版）
 * 實際儲存由 server.js better-sqlite3 每次 exec 後立即寫盤
 * 此檔案只負責更新 sidebar 的儲存狀態文字
 */

/** 更新 sidebar footer 的儲存狀態提示文字 */
function _updateSaveIndicator(state) {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  const map = { saving: '⏳ 儲存中...', saved: '✓ 自動存檔', error: '⚠ 儲存失敗' };
  el.textContent = map[state] || '';
}

// 定期顯示「自動存檔」狀態（視覺回饋）
setInterval(() => _updateSaveIndicator('saved'), 5000);

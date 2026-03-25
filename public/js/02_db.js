/**
 * 02_db.js — 資料庫 API 層（Node.js 後端版）
 * 透過同步 XMLHttpRequest 呼叫 Express 後端
 * 對外介面與原 sql.js 版本相同，其餘模組無需修改
 */

let cur = 'dashboard';
const _sort = {};

// ─── 排序輔助 ────────────────────────────────
function getSort(sec, defCol, defDir = 'desc') {
  if (!_sort[sec]) _sort[sec] = { col: defCol, dir: defDir };
  return _sort[sec];
}

function setSort(sec, col) {
  const s = getSort(sec, col);
  if (s.col === col) s.dir = s.dir === 'asc' ? 'desc' : 'asc';
  else { s.col = col; s.dir = 'asc'; }
  const fns = {
    quotes: renderQuotes, orders: renderOrders, analytics: renderAnalytics,
    outsource: renderOS, receivables: renderReceivables, payables: renderPayables,
    quote_history: renderQuoteHistory, actlog: renderActivityLog,
  };
  if (fns[sec]) document.getElementById('content').innerHTML = fns[sec]() || '';
}

function sortArr(arr, col, dir) {
  const isDateCol = /(date|_at|_on)$/i.test(col);
  return [...arr].sort((a, b) => {
    let av = a[col] ?? '', bv = b[col] ?? '';
    if (isDateCol) { av = String(av); bv = String(bv); }
    else if (typeof av === 'number' || typeof bv === 'number' || (!isNaN(+av) && av !== '' && !String(av).includes('-'))) {
      av = parseFloat(av) || 0; bv = parseFloat(bv) || 0;
    } else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

function sth(sec, col, label, extraStyle = '') {
  const s = getSort(sec, col);
  const active = s.col === col;
  const arrow = active ? (s.dir === 'asc' ? ' ↑' : ' ↓') : '';
  const style = 'cursor:pointer;user-select:none;white-space:nowrap;' + (active ? 'color:var(--accent5);' : '') + extraStyle;
  return `<th style="${style}" onclick="setSort('${sec}','${col}')">${label}${arrow}</th>`;
}

// ─── 核心 API 函式（同步 XHR，本機請求幾乎無延遲）────
function q(sql, p = []) {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/query', false); // 同步
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ sql, params: p }));
    if (xhr.status !== 200) { console.error('[q] HTTP', xhr.status, sql); return []; }
    return JSON.parse(xhr.responseText);
  } catch (e) { console.error('[q]', e, sql); return []; }
}

function q1(sql, p = []) {
  return q(sql, p)[0] || null;
}

function exec(sql, p = []) {
  // 用 fetch（非同步），不阻塞 UI，後端立即寫盤
  fetch('/api/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params: p }),
  }).catch(e => console.error('[exec]', e, sql));
}

function execBatch(statements) {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/exec-batch', false); // 同步執行以確保後續的重新渲染能抓到新資料
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ statements }));
    if (xhr.status !== 200) { console.error('[execBatch] HTTP', xhr.status); return false; }
    return true;
  } catch (e) { console.error('[execBatch]', e); return false; }
}

function lastId() {
  // 同步查詢最後插入的 rowid
  return q1('SELECT last_insert_rowid() as id')?.id || 0;
}

// ─── 快取陣列（init 時填充）─────────────────
let _svcs = [], _custs = [], _supps = [];
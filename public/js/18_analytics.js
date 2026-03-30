/**
 * 18_analytics.js — 自動分拆模組
 * 對外暴露：...
 * 依賴：...
 */

let _analyticsTab='profit';
let _analyticsStartDate='';
let _analyticsEndDate='';
let _analyticsQuickRange='';

function getAnalyticsDateFilter(col){
  if(_analyticsStartDate && _analyticsEndDate) {
    return ` AND ${col} >= '${_analyticsStartDate}' AND ${col} <= '${_analyticsEndDate}'`;
  }
  return '';
}

function setAnalyticsQuickRange(val){
  _analyticsQuickRange = val;
  if(val==='all'){
    _analyticsStartDate='';
    _analyticsEndDate='';
  } else if(val){
    const end = new Date();
    const start = new Date();
    if(val==='1m') start.setMonth(start.getMonth()-1);
    else if(val==='6m') start.setMonth(start.getMonth()-6);
    else if(val==='1y') start.setFullYear(start.getFullYear()-1);
    else if(val==='2y') start.setFullYear(start.getFullYear()-2);
    _analyticsEndDate=end.toISOString().split('T')[0];
    _analyticsStartDate=start.toISOString().split('T')[0];
  }
  document.getElementById('analytics-start').value=_analyticsStartDate||'';
  document.getElementById('analytics-end').value=_analyticsEndDate||'';
  applyAnalyticsSettings();
}

function applyAnalyticsSettings() {
  _analyticsStartDate = document.getElementById('analytics-start').value;
  _analyticsEndDate = document.getElementById('analytics-end').value;
  // Clear quick range if dates don't match exactly. But for simplicity, just let it be handled onchange.
  go('analytics');
}

/** 處理 renderAnalytics 相關操作。 */
function renderAnalytics(){
  // 全域 KPI 數據
  const dtFilt = getAnalyticsDateFilter('o.date');
  const rows=q(`SELECT o.id,o.order_no,o.title,c.name as cn,o.date,o.phase,o.total,COALESCE((SELECT SUM(os.total) FROM outsource_orders os WHERE os.order_id=o.id AND os.deleted_at IS NULL),0) as cost FROM orders o LEFT JOIN customers c ON o.customer_id=c.id WHERE o.phase NOT IN('cancelled') AND o.deleted_at IS NULL ${dtFilt} ORDER BY o.date DESC`);
  const totalRev=rows.reduce((s,r)=>s+r.total,0);
  const totalCost=rows.reduce((s,r)=>s+r.cost,0);
  const totalPft=totalRev-totalCost;
  const avgPct=totalRev>0?Math.round(totalPft/totalRev*100):0;
  const activeCount=rows.filter(r=>r.phase!=='completed').length;

  const tabs=[
    {key:'profit',icon:'💰',label:'成本與利潤'},
    {key:'project',icon:'📋',label:'專案損益'},
    {key:'monthly',icon:'📅',label:'月度營收'},
    {key:'customer',icon:'👥',label:'客戶貢獻'},
    {key:'supplier',icon:'🏭',label:'廠商成本'},
  ];

  return `<div style="display:flex;gap:12px;align-items:center;margin-bottom:18px;background:var(--surface);padding:12px 16px;border-radius:10px;border:1px solid var(--border);box-shadow:0 2px 8px rgba(0,0,0,0.1)">
    <label style="font-size:13px;color:var(--text2);margin-bottom:0;font-weight:600;display:flex;align-items:center;gap:6px;"><span style="font-size:15px">📅</span> 時間範圍：</label>
    <select id="analytics-quick-range" onchange="setAnalyticsQuickRange(this.value)" style="padding:6px 10px;font-size:13px;border-radius:6px;border:1px solid var(--border);outline:none;background:var(--surface2);color:var(--text);cursor:pointer;min-width:110px;font-family:inherit;">
      <option value="" ${_analyticsQuickRange===''?'selected':''}>自訂範圍</option>
      <option value="1m" ${_analyticsQuickRange==='1m'?'selected':''}>近一個月</option>
      <option value="6m" ${_analyticsQuickRange==='6m'?'selected':''}>近半年</option>
      <option value="1y" ${_analyticsQuickRange==='1y'?'selected':''}>近一年</option>
      <option value="2y" ${_analyticsQuickRange==='2y'?'selected':''}>近兩年</option>
      <option value="all" ${_analyticsQuickRange==='all'?'selected':''}>全部時間</option>
    </select>
    <div style="display:flex;align-items:center;gap:8px;background:var(--surface2);padding:2px;border-radius:6px;border:1px solid var(--border)">
      <input type="date" id="analytics-start" value="${_analyticsStartDate}" style="padding:5px 8px;font-size:13px;border:none;outline:none;background:transparent;color:var(--text);border-radius:4px;font-family:inherit;" onchange="document.getElementById('analytics-quick-range').value=''">
      <span style="color:var(--text3);font-weight:bold;font-size:12px">~</span>
      <input type="date" id="analytics-end" value="${_analyticsEndDate}" style="padding:5px 8px;font-size:13px;border:none;outline:none;background:transparent;color:var(--text);border-radius:4px;font-family:inherit;" onchange="document.getElementById('analytics-quick-range').value=''">
    </div>
    <button class="btn btn-sm" style="background:var(--accent5);color:#fff;border:none;padding:6px 14px;border-radius:6px;font-size:13px;margin-left:auto;font-weight:600;cursor:pointer;transition:opacity 0.2s" onclick="applyAnalyticsSettings()">套用過濾</button>
  </div>
  <div class="kpi-grid">
    <div class="kpi-card blue"><div class="kpi-label">總收入（含稅）</div><div class="kpi-value blue">$${fmt(totalRev)}</div><div class="kpi-delta">${rows.length} 個專案</div></div>
    <div class="kpi-card red"><div class="kpi-label">總委外成本</div><div class="kpi-value red">$${fmt(totalCost)}</div><div class="kpi-delta">${totalRev>0?Math.round(totalCost/totalRev*100):0}% 成本佔比</div></div>
    <div class="kpi-card green"><div class="kpi-label">毛利合計</div><div class="kpi-value green">$${fmt(totalPft)}</div><div class="kpi-delta ${totalPft>=0?'up':'dn'}">${totalPft>=0?'▲':'▼'} 淨利</div></div>
    <div class="kpi-card purple"><div class="kpi-label">平均毛利率</div><div class="kpi-value purple">${avgPct}%</div><div class="kpi-delta">${activeCount} 個進行中</div></div>
  </div>
  <div class="analytics-tabs">
    ${tabs.map(t=>`<button class="analytics-tab${_analyticsTab===t.key?' active':''}" onclick="switchAnalyticsTab('${t.key}')"><span class="tab-icon">${t.icon}</span>${t.label}</button>`).join('')}
  </div>
  <div id="analytics-content" class="analytics-section">${renderAnalyticsTabContent(_analyticsTab)}</div>`;
}

/** 處理 switchAnalyticsTab 相關操作。 */
function switchAnalyticsTab(key){
  _analyticsTab=key;
  // 更新 Tab 高亮
  document.querySelectorAll('.analytics-tab').forEach(el=>{
    el.classList.toggle('active',el.textContent.includes({profit:'成本與利潤',project:'專案損益',monthly:'月度營收',customer:'客戶貢獻',supplier:'廠商成本'}[key]||''));
  });
  const c=document.getElementById('analytics-content');
  if(c){c.innerHTML=renderAnalyticsTabContent(key);c.className='analytics-section';}
}

/** 處理 renderAnalyticsTabContent 相關操作。 */
function renderAnalyticsTabContent(key){
  switch(key){
    case 'profit': return renderAnalyticsTab_profit();
    case 'project': return renderAnalyticsTab_project();
    case 'monthly': return renderAnalyticsTab_monthly();
    case 'customer': return renderAnalyticsTab_customer();
    case 'supplier': return renderAnalyticsTab_supplier();
    default: return '';
  }
}

/** 處理 renderAnalyticsTab_profit 相關操作。 */
function renderAnalyticsTab_profit(){
  const s=getSort('analytics','date');
  const dtFilt = getAnalyticsDateFilter('o.date');
  let rows=q(`SELECT o.id,o.order_no,o.title,c.name as cn,o.date,o.phase,o.total,COALESCE((SELECT SUM(os.total) FROM outsource_orders os WHERE os.order_id=o.id AND os.deleted_at IS NULL),0) as cost FROM orders o LEFT JOIN customers c ON o.customer_id=c.id WHERE o.phase NOT IN('cancelled') AND o.deleted_at IS NULL ${dtFilt} ORDER BY o.date DESC`);
  rows=sortArr(rows,s.col==='cn'?'cn':s.col,s.dir);
  return `<div class="panel"><div class="panel-header"><div class="panel-title">逐案利潤分析</div><button class="btn btn-ghost btn-sm" onclick="exportProfitCSV()">↓ CSV</button></div>
  <div class="filter-bar"><input type="text" placeholder="搜尋專案號、標題、客戶..." oninput="filterPft(this.value)"><span class="filter-count" id="pft-count">${rows.length} 筆</span></div>
  <table><thead><tr>${sth('analytics','order_no','專案號')}${sth('analytics','title','標題')}${sth('analytics','cn','客戶')}${sth('analytics','date','日期')}${sth('analytics','total','收入')}<th>委外成本</th><th>毛利</th><th>毛利率</th><th>階段</th></tr></thead>
  <tbody id="pft-tbody">${renderPftRows(rows)}</tbody></table></div>`;
}

/** 處理 renderAnalyticsTab_project 相關操作。 */
function renderAnalyticsTab_project(){
  const dtFilt = getAnalyticsDateFilter('o.date');
  const orders=q(`SELECT o.id,o.order_no,o.title,c.name as cn FROM orders o LEFT JOIN customers c ON o.customer_id=c.id WHERE o.phase NOT IN('cancelled') AND o.deleted_at IS NULL ${dtFilt} ORDER BY o.date DESC`);
  return `<div class="proj-select-bar">
    <span style="font-size:13px;color:var(--text2);white-space:nowrap">📋 選擇專案：</span>
    <select id="proj-pnl-select" onchange="renderProjectDetail(this.value)">
      <option value="">— 請選擇要分析的專案 —</option>
      ${orders.map(o=>`<option value="${o.id}">[${o.order_no}] ${o.title||''} — ${o.cn||'未指定客戶'}</option>`).join('')}
    </select>
  </div>
  <div id="proj-pnl-detail"><div style="text-align:center;padding:50px 0;color:var(--text3);font-size:13px">⬆ 請從上方選擇專案以查看損益明細</div></div>`;
}

/** 處理 renderAnalyticsTab_monthly 相關操作。 */
function renderAnalyticsTab_monthly(){
  const months=[];
  let endD = new Date();
  let startD = new Date(endD.getFullYear(),endD.getMonth()-11,1);
  if(_analyticsStartDate && _analyticsEndDate) {
    endD = new Date(_analyticsEndDate);
    startD = new Date(_analyticsStartDate);
    startD.setDate(1); 
  }

  let curD = new Date(startD);
  while(curD <= endD) {
    months.push(curD.getFullYear()+'-'+String(curD.getMonth()+1).padStart(2,'0'));
    curD.setMonth(curD.getMonth()+1);
  }

  const data=months.map(m=>{
    const rev=q1("SELECT COALESCE(SUM(total),0) as v FROM orders WHERE strftime('%Y-%m',date)=? AND phase NOT IN('cancelled') AND deleted_at IS NULL",[m])?.v||0;
    const cost=q1("SELECT COALESCE(SUM(total),0) as v FROM outsource_orders WHERE strftime('%Y-%m',date)=? AND deleted_at IS NULL",[m])?.v||0;
    const cnt=q1("SELECT COUNT(*) as c FROM orders WHERE strftime('%Y-%m',date)=? AND phase NOT IN('cancelled') AND deleted_at IS NULL",[m])?.c||0;
    return {month:m,rev,cost,profit:rev-cost,pct:rev>0?Math.round((rev-cost)/rev*100):0,count:cnt};
  });
  const maxRev=Math.max(...data.map(d=>d.rev),1);

  // 年度合計 (範圍合計)
  const yearRev=data.reduce((s,d)=>s+d.rev,0);
  const yearCost=data.reduce((s,d)=>s+d.cost,0);
  const yearProfit=yearRev-yearCost;
  const yearPct=yearRev>0?Math.round(yearProfit/yearRev*100):0;
  const yearCount=data.reduce((s,d)=>s+d.count,0);

  return `<div class="stat-mini-grid">
    <div class="stat-mini"><div class="stat-mini-label">範圍內總收入</div><div class="stat-mini-val" style="color:var(--accent)">$${fmt(yearRev)}</div></div>
    <div class="stat-mini"><div class="stat-mini-label">範圍內總成本</div><div class="stat-mini-val" style="color:var(--accent4)">$${fmt(yearCost)}</div></div>
    <div class="stat-mini"><div class="stat-mini-label">範圍內毛利</div><div class="stat-mini-val" style="color:var(--accent2)">$${fmt(yearProfit)}</div></div>
    <div class="stat-mini"><div class="stat-mini-label">總案量</div><div class="stat-mini-val" style="color:var(--accent5)">${yearCount}</div></div>
  </div>
  <div class="panel"><div class="panel-header"><div class="panel-title">月度趨勢（${months.length} 個月）</div>
    <button class="btn btn-ghost btn-sm" onclick="exportMonthlyCSV()">↓ CSV</button>
  </div>
  <table><thead><tr><th>月份</th><th>案件數</th><th>營收</th><th style="width:180px">營收趨勢</th><th>成本</th><th>毛利</th><th>毛利率</th></tr></thead><tbody>
  ${data.map(d=>{
    const barW=maxRev>0?Math.round(d.rev/maxRev*100):0;
    return `<tr><td class="td-mono td-main">${d.month}</td><td class="td-mono">${d.count}</td><td class="td-mono">$${fmt(d.rev)}</td>
    <td><div style="display:flex;align-items:center;gap:6px"><div style="width:120px;height:6px;background:var(--surface2);border-radius:3px;overflow:hidden"><div class="monthly-bar" style="width:${barW}%;background:var(--accent)"></div></div></div></td>
    <td class="td-mono" style="color:var(--accent4)">$${fmt(d.cost)}</td>
    <td class="td-mono ${d.profit>=0?'profit-pos':'profit-neg'}">$${fmt(d.profit)}</td>
    <td><span class="td-mono" style="font-size:11px;color:${d.pct>=30?'var(--accent2)':d.pct>=0?'var(--accent3)':'var(--accent4)'}">${d.pct}%</span></td></tr>`;
  }).join('')}
  <tr style="font-weight:700;border-top:2px solid var(--border)"><td class="td-mono">合計</td><td class="td-mono">${yearCount}</td><td class="td-mono" style="color:var(--accent)">$${fmt(yearRev)}</td><td></td><td class="td-mono" style="color:var(--accent4)">$${fmt(yearCost)}</td><td class="td-mono ${yearProfit>=0?'profit-pos':'profit-neg'}">$${fmt(yearProfit)}</td><td class="td-mono" style="color:var(--accent5)">${yearPct}%</td></tr>
  </tbody></table></div>`;
}

/** 處理 renderCustAnalyticsRows 相關操作。 */
function renderCustAnalyticsRows(rows,grandRev,maxRev){
  return rows.map(r=>{
    const profit=r.total_rev-r.total_cost;
    const pct=r.total_rev>0?Math.round(profit/r.total_rev*100):0;
    const share=grandRev>0?Math.round(r.total_rev/grandRev*100):0;
    const barW=maxRev>0?Math.round(r.total_rev/maxRev*100):0;
    const avg=r.order_count>0?Math.round(r.total_rev/r.order_count):0;
    return `<tr><td class="td-main">${r.name||'—'}</td><td class="td-mono">${r.order_count}</td><td class="td-mono">$${fmt(r.total_rev)}</td>
    <td><div style="display:flex;align-items:center;gap:6px"><div style="width:80px;height:6px;background:var(--surface2);border-radius:3px;overflow:hidden"><div style="width:${barW}%;height:100%;background:var(--accent5);border-radius:3px"></div></div><span class="td-mono" style="font-size:10px;color:var(--text3)">${share}%</span></div></td>
    <td class="td-mono" style="color:var(--accent4)">$${fmt(r.total_cost)}</td>
    <td class="td-mono ${profit>=0?'profit-pos':'profit-neg'}">$${fmt(profit)}</td>
    <td><span class="td-mono" style="font-size:11px;color:${pct>=30?'var(--accent2)':pct>=0?'var(--accent3)':'var(--accent4)'}">${pct}%</span></td>
    <td class="td-mono">$${fmt(avg)}</td></tr>`;
  }).join('');
}

/** 處理 filterCustAnalytics 相關操作。 */
function filterCustAnalytics(sq){
  const dtFilt = getAnalyticsDateFilter('o.date');
  let rows=q(`SELECT c.id,c.name,COUNT(o.id) as order_count,COALESCE(SUM(o.total),0) as total_rev,COALESCE(SUM((SELECT COALESCE(SUM(os.total),0) FROM outsource_orders os WHERE os.order_id=o.id AND os.deleted_at IS NULL)),0) as total_cost FROM customers c LEFT JOIN orders o ON o.customer_id=c.id AND o.phase NOT IN('cancelled') AND o.deleted_at IS NULL ${dtFilt} GROUP BY c.id ORDER BY total_rev DESC`);
  const grandRev=rows.reduce((s,r)=>s+r.total_rev,0);
  const maxRev=Math.max(...rows.map(r=>r.total_rev),1);
  if(sq){const s=sq.toLowerCase();rows=rows.filter(r=>String(r.name||'').toLowerCase().includes(s));}
  document.getElementById('ca-tbody').innerHTML=renderCustAnalyticsRows(rows,grandRev,maxRev);
  document.getElementById('ca-count').textContent=rows.length+' 位';
}

/** 處理 exportCustomerAnalyticsCSV 相關操作。 */
function exportCustomerAnalyticsCSV(){
  const dtFilt = getAnalyticsDateFilter('o.date');
  const rows=q(`SELECT c.name,COUNT(o.id) as order_count,COALESCE(SUM(o.total),0) as total_rev,COALESCE(SUM((SELECT COALESCE(SUM(os.total),0) FROM outsource_orders os WHERE os.order_id=o.id AND os.deleted_at IS NULL)),0) as total_cost FROM customers c LEFT JOIN orders o ON o.customer_id=c.id AND o.phase NOT IN('cancelled') AND o.deleted_at IS NULL ${dtFilt} GROUP BY c.id ORDER BY total_rev DESC`);
  exportCSV('customer-analytics-'+today()+'.csv',['客戶','訂單數','總收入','總成本','總毛利','毛利率%'],rows.map(r=>{const p=r.total_rev-r.total_cost;return[r.name,r.order_count,r.total_rev,r.total_cost,p,r.total_rev>0?Math.round(p/r.total_rev*100):0];}));
}

/** 處理 renderSuppAnalyticsRows 相關操作。 */
function renderSuppAnalyticsRows(rows,grandCost,maxCost){
  return rows.map(r=>{
    const share=grandCost>0?Math.round(r.total_cost/grandCost*100):0;
    const barW=maxCost>0?Math.round(r.total_cost/maxCost*100):0;
    const avg=r.os_count>0?Math.round(r.total_cost/r.os_count):0;
    return `<tr><td class="td-main">${r.name||'—'}</td><td style="font-size:12px;color:var(--text2)">${r.specialty||'—'}</td><td class="td-mono">${r.os_count}</td><td class="td-mono" style="color:var(--accent4)">$${fmt(r.total_cost)}</td>
    <td><div style="display:flex;align-items:center;gap:6px"><div style="width:100px;height:6px;background:var(--surface2);border-radius:3px;overflow:hidden"><div style="width:${barW}%;height:100%;background:var(--accent3);border-radius:3px"></div></div><span class="td-mono" style="font-size:10px;color:var(--text3)">${share}%</span></div></td>
    <td class="td-mono">$${fmt(avg)}</td></tr>`;
  }).join('');
}

/** 處理 filterSuppAnalytics 相關操作。 */
function filterSuppAnalytics(sq){
  const dtFilt = getAnalyticsDateFilter('os.date');
  let rows=q(`SELECT s.id,s.name,s.specialty,COUNT(os.id) as os_count,COALESCE(SUM(os.total),0) as total_cost FROM suppliers s LEFT JOIN outsource_orders os ON os.supplier_id=s.id AND os.deleted_at IS NULL ${dtFilt} GROUP BY s.id ORDER BY total_cost DESC`);
  const grandCost=rows.reduce((s,r)=>s+r.total_cost,0);
  const maxCost=Math.max(...rows.map(r=>r.total_cost),1);
  if(sq){const s=sq.toLowerCase();rows=rows.filter(r=>String(r.name||'').toLowerCase().includes(s));}
  document.getElementById('sa-tbody').innerHTML=renderSuppAnalyticsRows(rows,grandCost,maxCost);
  document.getElementById('sa-count').textContent=rows.length+' 家';
}

/** 處理 exportSupplierAnalyticsCSV 相關操作。 */
function exportSupplierAnalyticsCSV(){
  const dtFilt = getAnalyticsDateFilter('os.date');
  const rows=q(`SELECT s.name,s.specialty,COUNT(os.id) as os_count,COALESCE(SUM(os.total),0) as total_cost FROM suppliers s LEFT JOIN outsource_orders os ON os.supplier_id=s.id AND os.deleted_at IS NULL ${dtFilt} GROUP BY s.id ORDER BY total_cost DESC`);
  exportCSV('supplier-analytics-'+today()+'.csv',['廠商','專長','採購單數','總成本','成本佔比%'],rows.map(r=>{const grand=rows.reduce((s2,r2)=>s2+r2.total_cost,0);return[r.name,r.specialty,r.os_count,r.total_cost,grand>0?Math.round(r.total_cost/grand*100):0];}));
}
/**
 * 16_finance.js — 自動分拆模組
 * 對外暴露：...
 * 依賴：...
 */

/** 處理 renderReceivables 相關操作。 */
function renderReceivables(){
  const s=getSort('receivables','due_date','asc');
  let rows=q("SELECT r.*,o.order_no,o.title,c.name as cn FROM receivables r LEFT JOIN orders o ON r.order_id=o.id LEFT JOIN customers c ON o.customer_id=c.id ORDER BY r.due_date ASC");
  rows=sortArr(rows,s.col,s.dir);
  const unpaid=q1("SELECT SUM(amount) as v FROM receivables WHERE status='unpaid'")?.v||0;
  const over=rows.filter(r=>r.status==='unpaid'&&r.due_date<today()).length;
  const paid=q1("SELECT SUM(amount) as v FROM receivables WHERE status='paid'")?.v||0;
  return `<div class="stat-mini-grid">
    <div class="stat-mini"><div class="stat-mini-label">未收總額</div><div class="stat-mini-val" style="color:var(--accent3)">$${fmt(unpaid)}</div></div>
    <div class="stat-mini"><div class="stat-mini-label">逾期筆數</div><div class="stat-mini-val" style="color:var(--accent4)">${over} 筆</div></div>
    <div class="stat-mini"><div class="stat-mini-label">已收總額</div><div class="stat-mini-val" style="color:var(--accent2)">$${fmt(paid)}</div></div>
  </div>
  <div class="panel"><div class="panel-header"><div class="panel-title">應收帳款 <span class="auto-tag">含分期里程碑</span></div><button class="btn btn-ghost btn-sm" onclick="exportARCSV()">↓ CSV</button></div>
  <div class="filter-bar"><input type="text" id="far" placeholder="搜尋專案號、里程碑名稱、客戶..." oninput="filterAR(this.value,document.getElementById('farst').value)">
  <select id="farst" onchange="filterAR(document.getElementById('far').value,this.value)"><option value="">全部</option><option value="unpaid">未收款</option><option value="paid">已收款</option></select>
  <span class="filter-count" id="ar-count">${rows.length} 筆</span></div>
  <table><thead><tr>${sth('receivables','order_no','專案號')}${sth('receivables','title','標題')}<th>里程碑</th>${sth('receivables','cn','客戶')}${sth('receivables','amount','金額')}${sth('receivables','due_date','到期日')}${sth('receivables','paid_date','付款日')}<th>狀態</th><th>操作</th></tr></thead>
  <tbody id="ar-tbody">${renderARRows(rows)}</tbody></table></div>`;
}

/** 處理 markPaid 相關操作。 */
function markPaid(table,id,orderId){
  const rec=q1("SELECT r.*,o.order_no,o.title,c.name as cn FROM receivables r LEFT JOIN orders o ON r.order_id=o.id LEFT JOIN customers c ON o.customer_id=c.id WHERE r.id=?",[id]);
  const pay=q1("SELECT p.*,os.os_no,os.description,s.name as sn FROM payables p LEFT JOIN outsource_orders os ON p.os_id=os.id LEFT JOIN suppliers s ON os.supplier_id=s.id WHERE p.id=?",[id]);
  exec(`UPDATE ${table} SET status='paid',paid_date=date('now') WHERE id=?`,[id]);
  if(table==='receivables'&&rec){
    logActivity('receivable','收款：'+rec.milestone_name,rec.order_id,rec.order_no,rec.title,rec.amount,rec.cn,'');
  } else if(table==='payables'&&pay){
    logActivity('payable','付款：'+pay.os_no,pay.os_id,pay.os_no,pay.description,pay.amount,pay.sn,'');
  }
  toast('已標記付款','success');
  if(orderId)showOrderDetail(orderId);else go(cur);
}

/** 處理 renderPayables 相關操作。 */
function renderPayables(){
  const rows=q("SELECT p.*,os.os_no,os.description,s.name as sn FROM payables p LEFT JOIN outsource_orders os ON p.os_id=os.id LEFT JOIN suppliers s ON os.supplier_id=s.id ORDER BY p.due_date ASC");
  const unpaid=q1("SELECT SUM(amount) as v FROM payables WHERE status='unpaid'")?.v||0;
  const over=rows.filter(r=>r.status==='unpaid'&&r.due_date<today()).length;
  const paid=q1("SELECT SUM(amount) as v FROM payables WHERE status='paid'")?.v||0;
  return `<div class="stat-mini-grid">
    <div class="stat-mini"><div class="stat-mini-label">未付總額</div><div class="stat-mini-val" style="color:var(--accent3)">$${fmt(unpaid)}</div></div>
    <div class="stat-mini"><div class="stat-mini-label">逾期筆數</div><div class="stat-mini-val" style="color:var(--accent4)">${over} 筆</div></div>
    <div class="stat-mini"><div class="stat-mini-label">已付總額</div><div class="stat-mini-val" style="color:var(--accent2)">$${fmt(paid)}</div></div>
  </div>
  <div class="panel"><div class="panel-header"><div class="panel-title">應付帳款 <span class="auto-tag">委外單自動建立</span></div><button class="btn btn-ghost btn-sm" onclick="exportAPCSV()">↓ CSV</button></div>
  <div class="filter-bar"><input type="text" id="fap" placeholder="搜尋委外單號、廠商..." oninput="filterAP(this.value,document.getElementById('fapst').value)">
  <select id="fapst" onchange="filterAP(document.getElementById('fap').value,this.value)"><option value="">全部</option><option value="unpaid">未付款</option><option value="paid">已付款</option></select>
  <span class="filter-count" id="ap-count">${rows.length} 筆</span></div>
  <table><thead><tr>${sth('payables','os_no','委外單號')}${sth('payables','sn','廠商')}<th>說明</th>${sth('payables','amount','金額')}${sth('payables','due_date','到期日')}${sth('payables','paid_date','付款日')}<th>狀態</th><th>操作</th></tr></thead>
  <tbody id="ap-tbody">${renderAPRows(rows)}</tbody></table></div>`;
}
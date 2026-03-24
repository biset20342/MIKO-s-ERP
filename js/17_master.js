/**
 * 17_master.js — 自動分拆模組
 * 對外暴露：...
 * 依賴：...
 */

/** 處理 renderAnalyticsTab_customer 相關操作。 */
function renderAnalyticsTab_customer(){
  const rows=q("SELECT c.id,c.name,COUNT(o.id) as order_count,COALESCE(SUM(o.total),0) as total_rev,COALESCE(SUM((SELECT COALESCE(SUM(os.total),0) FROM outsource_orders os WHERE os.order_id=o.id AND os.deleted_at IS NULL)),0) as total_cost FROM customers c LEFT JOIN orders o ON o.customer_id=c.id AND o.phase NOT IN('cancelled') AND o.deleted_at IS NULL GROUP BY c.id ORDER BY total_rev DESC");
  const grandRev=rows.reduce((s,r)=>s+r.total_rev,0);
  const maxRev=Math.max(...rows.map(r=>r.total_rev),1);

  return `<div class="panel"><div class="panel-header"><div class="panel-title">客戶貢獻排行</div>
    <button class="btn btn-ghost btn-sm" onclick="exportCustomerAnalyticsCSV()">↓ CSV</button>
  </div>
  <div class="filter-bar"><input type="text" placeholder="搜尋客戶名稱..." oninput="filterCustAnalytics(this.value)"><span class="filter-count" id="ca-count">${rows.length} 位</span></div>
  <table><thead><tr><th>客戶</th><th>訂單數</th><th>總收入</th><th style="width:140px">佔比</th><th>總成本</th><th>總毛利</th><th>毛利率</th><th>平均案值</th></tr></thead>
  <tbody id="ca-tbody">${renderCustAnalyticsRows(rows,grandRev,maxRev)}</tbody></table></div>`;
}

/** 處理 renderAnalyticsTab_supplier 相關操作。 */
function renderAnalyticsTab_supplier(){
  const rows=q("SELECT s.id,s.name,s.specialty,COUNT(os.id) as os_count,COALESCE(SUM(os.total),0) as total_cost FROM suppliers s LEFT JOIN outsource_orders os ON os.supplier_id=s.id AND os.deleted_at IS NULL GROUP BY s.id ORDER BY total_cost DESC");
  const grandCost=rows.reduce((s,r)=>s+r.total_cost,0);
  const maxCost=Math.max(...rows.map(r=>r.total_cost),1);

  return `<div class="panel"><div class="panel-header"><div class="panel-title">廠商成本分析</div>
    <button class="btn btn-ghost btn-sm" onclick="exportSupplierAnalyticsCSV()">↓ CSV</button>
  </div>
  <div class="filter-bar"><input type="text" placeholder="搜尋廠商名稱..." oninput="filterSuppAnalytics(this.value)"><span class="filter-count" id="sa-count">${rows.length} 家</span></div>
  <table><thead><tr><th>廠商</th><th>專長領域</th><th>採購單數</th><th>總成本</th><th style="width:160px">成本佔比</th><th>平均單價</th></tr></thead>
  <tbody id="sa-tbody">${renderSuppAnalyticsRows(rows,grandCost,maxCost)}</tbody>
  <tfoot><tr style="font-weight:700;border-top:2px solid var(--border)"><td>合計</td><td></td><td class="td-mono">${rows.reduce((s,r)=>s+r.os_count,0)}</td><td class="td-mono" style="color:var(--accent4)">$${fmt(grandCost)}</td><td></td><td></td></tr></tfoot>
  </table></div>`;
}

/** 處理 renderCustomers 相關操作。 */
function renderCustomers(){
  const rows=q("SELECT * FROM customers ORDER BY id DESC");
  return `<div class="panel"><div class="panel-header"><div class="panel-title">客戶清單</div><button class="btn btn-ghost btn-sm" onclick="exportCustomersCSV()">↓ CSV</button></div>
  <div class="filter-bar"><input type="text" placeholder="搜尋名稱、電話、聯絡人..." oninput="fTbl(this.value,'cust-tbody',()=>q('SELECT * FROM customers ORDER BY id DESC'),renderCustRows,['name','phone','email','contact_person','tax_id'],'cust-count','位')"><span class="filter-count" id="cust-count">${rows.length} 位</span></div>
  <table><thead><tr><th>客戶名稱</th><th>統一編號</th><th>聯絡人</th><th>職稱</th><th>電話</th><th>Email</th><th>地址</th><th>操作</th></tr></thead>
  <tbody id="cust-tbody">${renderCustRows(rows)}</tbody></table></div>`;
}

/** 處理 renderSuppliers 相關操作。 */
function renderSuppliers(){
  const rows=q("SELECT * FROM suppliers ORDER BY id");
  return `<div class="panel"><div class="panel-header"><div class="panel-title">合作廠商</div><button class="btn btn-ghost btn-sm" onclick="exportSuppliersCSV()">↓ CSV</button></div>
  <div class="filter-bar"><input type="text" placeholder="搜尋廠商、專長、統一編號..." oninput="fTbl(this.value,'supp-tbody',()=>q('SELECT * FROM suppliers ORDER BY id'),renderSuppRows,['name','contact','specialty','tax_id'],'supp-count','家')"><span class="filter-count" id="supp-count">${rows.length} 家</span></div>
  <table><thead><tr><th>廠商名稱</th><th>統一編號</th><th>電話</th><th>Email</th><th>聯絡人</th><th>專長</th><th>操作</th></tr></thead>
  <tbody id="supp-tbody">${renderSuppRows(rows)}</tbody></table></div>`;
}

/** 處理 renderServices 相關操作。 */
function renderServices(){
  const rows=q("SELECT * FROM services ORDER BY category,name");
  return `<div class="panel"><div class="panel-header"><div class="panel-title">服務項目（報價快速帶入）</div><button class="btn btn-ghost btn-sm" onclick="exportServicesCSV()">↓ CSV</button></div>
  <div class="filter-bar"><input type="text" placeholder="搜尋服務名稱、類別、備註..." oninput="filterSvc(this.value)"><span class="filter-count" id="svc-count">${rows.length} 項</span></div>
  <table><thead><tr><th>服務名稱</th><th>類別</th><th>單位</th><th>預設單價(未稅)</th><th>備註</th><th>操作</th></tr></thead>
  <tbody id="svc-tbody">${renderSvcRows(rows)}</tbody></table></div>`;
}

/** 處理 filterSvc 相關操作。 */
function filterSvc(sq){
  let rows=q("SELECT * FROM services ORDER BY category,name");
  if(sq){const s=sq.toLowerCase();rows=rows.filter(r=>['name','category','notes'].some(f=>String(r[f]||'').toLowerCase().includes(s)));}
  document.getElementById('svc-tbody').innerHTML=renderSvcRows(rows);
  document.getElementById('svc-count').textContent=rows.length+' 項';
}

/** 處理 showAddCustomer 相關操作。 */
function showAddCustomer(){
  openModal('新增客戶',`<div class="form-row"><label>客戶名稱 *</label><input type="text" id="f-name"></div><div class="form-row"><label>統一編號</label><input type="text" id="f-taxid" placeholder="12345678"></div><div class="form-row-2"><div class="form-row"><label>聯絡人</label><input type="text" id="f-contact"></div><div class="form-row"><label>職稱</label><input type="text" id="f-jobtitle" placeholder="專案經理、採購主管..."></div></div><div class="form-row-2"><div class="form-row"><label>電話</label><input type="text" id="f-phone"></div><div class="form-row"><label>Email</label><input type="email" id="f-email"></div></div><div class="form-row"><label>地址</label><input type="text" id="f-addr"></div><div class="form-row"><label>備註</label><textarea id="f-notes" placeholder="行業、需求偏好..."></textarea></div>`,
    ()=>{const name=document.getElementById('f-name').value.trim();if(!name){toast('請填寫名稱','error');return;}exec("INSERT INTO customers(name,phone,email,address,contact_person,job_title,tax_id,notes) VALUES(?,?,?,?,?,?,?,?)",[name,document.getElementById('f-phone').value,document.getElementById('f-email').value,document.getElementById('f-addr').value,document.getElementById('f-contact').value,document.getElementById('f-jobtitle').value,document.getElementById('f-taxid').value,document.getElementById('f-notes').value]);toast('客戶已新增','success');closeModal();go(cur);});
}

/** 處理 showEditCustomer 相關操作。 */
function showEditCustomer(id){
  const c=q1("SELECT * FROM customers WHERE id=?",[id]);
  openModal('編輯客戶',`<div class="form-row"><label>名稱 *</label><input type="text" id="f-name" value="${escQ(c.name||'')}"></div><div class="form-row"><label>統一編號</label><input type="text" id="f-taxid" value="${escQ(c.tax_id||'')}" placeholder="12345678"></div><div class="form-row-2"><div class="form-row"><label>聯絡人</label><input type="text" id="f-contact" value="${escQ(c.contact_person||'')}"></div><div class="form-row"><label>職稱</label><input type="text" id="f-jobtitle" value="${escQ(c.job_title||'')}" placeholder="專案經理、採購主管..."></div></div><div class="form-row-2"><div class="form-row"><label>電話</label><input type="text" id="f-phone" value="${escQ(c.phone||'')}"></div><div class="form-row"><label>Email</label><input type="email" id="f-email" value="${escQ(c.email||'')}"></div></div><div class="form-row"><label>地址</label><input type="text" id="f-addr" value="${escQ(c.address||'')}"></div><div class="form-row"><label>備註</label><textarea id="f-notes">${escQ(c.notes||'')}</textarea></div>`,
    ()=>{const name=document.getElementById('f-name').value.trim();if(!name){toast('請填寫名稱','error');return;}exec("UPDATE customers SET name=?,phone=?,email=?,address=?,contact_person=?,job_title=?,tax_id=?,notes=? WHERE id=?",[name,document.getElementById('f-phone').value,document.getElementById('f-email').value,document.getElementById('f-addr').value,document.getElementById('f-contact').value,document.getElementById('f-jobtitle').value,document.getElementById('f-taxid').value,document.getElementById('f-notes').value,id]);toast('已更新','success');closeModal();go(cur);});
}

/** 處理 showAddSupplier 相關操作。 */
function showAddSupplier(){
  openModal('新增合作廠商',`<div class="form-row"><label>廠商名稱 *</label><input type="text" id="f-name"></div><div class="form-row"><label>統一編號</label><input type="text" id="f-taxid" placeholder="12345678"></div><div class="form-row-2"><div class="form-row"><label>電話</label><input type="text" id="f-phone"></div><div class="form-row"><label>Email</label><input type="email" id="f-email"></div></div><div class="form-row-2"><div class="form-row"><label>聯絡人</label><input type="text" id="f-contact"></div><div class="form-row"><label>專長</label><input type="text" id="f-spec" placeholder="CNC/鈑金/PCB..."></div></div><div class="form-row"><label>備註</label><textarea id="f-notes"></textarea></div>`,
    ()=>{const name=document.getElementById('f-name').value.trim();if(!name){toast('請填寫名稱','error');return;}exec("INSERT INTO suppliers(name,phone,email,contact,specialty,tax_id,notes) VALUES(?,?,?,?,?,?,?)",[name,document.getElementById('f-phone').value,document.getElementById('f-email').value,document.getElementById('f-contact').value,document.getElementById('f-spec').value,document.getElementById('f-taxid').value,document.getElementById('f-notes').value]);toast('廠商已新增','success');closeModal();go(cur);});
}

/** 處理 showEditSupplier 相關操作。 */
function showEditSupplier(id){
  const s=q1("SELECT * FROM suppliers WHERE id=?",[id]);
  openModal('編輯廠商',`<div class="form-row"><label>廠商名稱 *</label><input type="text" id="f-name" value="${escQ(s.name||'')}"></div><div class="form-row"><label>統一編號</label><input type="text" id="f-taxid" value="${escQ(s.tax_id||'')}" placeholder="12345678"></div><div class="form-row-2"><div class="form-row"><label>電話</label><input type="text" id="f-phone" value="${escQ(s.phone||'')}"></div><div class="form-row"><label>Email</label><input type="email" id="f-email" value="${escQ(s.email||'')}"></div></div><div class="form-row-2"><div class="form-row"><label>聯絡人</label><input type="text" id="f-contact" value="${escQ(s.contact||'')}"></div><div class="form-row"><label>專長</label><input type="text" id="f-spec" value="${escQ(s.specialty||'')}"></div></div><div class="form-row"><label>備註</label><textarea id="f-notes">${escQ(s.notes||'')}</textarea></div>`,
    ()=>{const name=document.getElementById('f-name').value.trim();if(!name){toast('請填寫名稱','error');return;}exec("UPDATE suppliers SET name=?,phone=?,email=?,contact=?,specialty=?,tax_id=?,notes=? WHERE id=?",[name,document.getElementById('f-phone').value,document.getElementById('f-email').value,document.getElementById('f-contact').value,document.getElementById('f-spec').value,document.getElementById('f-taxid').value,document.getElementById('f-notes').value,id]);toast('已更新','success');closeModal();go(cur);});
}

/** 處理 showAddService 相關操作。 */
function showAddService(){
  openModal('新增服務項目',`<div class="form-row"><label>服務名稱 *</label><input type="text" id="f-name"></div><div class="form-row-3"><div class="form-row"><label>類別</label><input type="text" id="f-cat" placeholder="設計/加工/顧問..."></div><div class="form-row"><label>單位</label><input type="text" id="f-unit" value="式"></div><div class="form-row"><label>預設單價(未稅)</label><input type="number" id="f-price" value="0" step="100"></div></div><div class="form-row"><label>備註</label><input type="text" id="f-notes"></div>`,
    ()=>{const name=document.getElementById('f-name').value.trim();if(!name){toast('請填寫名稱','error');return;}exec("INSERT INTO services(name,category,unit,default_price,notes) VALUES(?,?,?,?,?)",[name,document.getElementById('f-cat').value,document.getElementById('f-unit').value,parseFloat(document.getElementById('f-price').value)||0,document.getElementById('f-notes').value]);toast('服務項目已新增','success');closeModal();go(cur);});
}

/** 處理 showEditService 相關操作。 */
function showEditService(id){
  const s=q1("SELECT * FROM services WHERE id=?",[id]);
  openModal('編輯服務項目',`<div class="form-row"><label>服務名稱 *</label><input type="text" id="f-name" value="${escQ(s.name||'')}"></div><div class="form-row-3"><div class="form-row"><label>類別</label><input type="text" id="f-cat" value="${escQ(s.category||'')}"></div><div class="form-row"><label>單位</label><input type="text" id="f-unit" value="${escQ(s.unit||'式')}"></div><div class="form-row"><label>預設單價</label><input type="number" id="f-price" value="${s.default_price||0}" step="100"></div></div><div class="form-row"><label>備註</label><input type="text" id="f-notes" value="${escQ(s.notes||'')}"></div>`,
    ()=>{const name=document.getElementById('f-name').value.trim();if(!name){toast('請填寫名稱','error');return;}exec("UPDATE services SET name=?,category=?,unit=?,default_price=?,notes=? WHERE id=?",[name,document.getElementById('f-cat').value,document.getElementById('f-unit').value,parseFloat(document.getElementById('f-price').value)||0,document.getElementById('f-notes').value,id]);toast('已更新','success');closeModal();go(cur);});
}
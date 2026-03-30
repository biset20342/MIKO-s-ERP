/**
 * 09_quotes.js — 自動分拆模組
 * 對外暴露：...
 * 依賴：...
 */

/** 處理 renderQuotes 相關操作。 */
function renderQuotes(){
  const s=getSort('quotes','date');
  let rows=q("SELECT q.*,c.name as cn, p.project_no, p.title as p_title FROM quotes q LEFT JOIN customers c ON q.customer_id=c.id LEFT JOIN projects p ON q.project_id=p.id WHERE q.deleted_at IS NULL AND q.status != 'superseded' ORDER BY q.date DESC");
  rows=sortArr(rows,s.col==='cn'?'cn':s.col,s.dir);
  return `<div class="panel"><div class="panel-header"><div class="panel-title">報價單</div><button class="btn btn-ghost btn-sm" onclick="exportQuotesCSV()">↓ CSV</button></div>
  <div class="filter-bar">
    <input type="text" id="fq" placeholder="搜尋報價號、標題、客戶..." oninput="filterQ(this.value,document.getElementById('fqst').value)">
    <select id="fqst" onchange="filterQ(document.getElementById('fq').value,this.value)">
      <option value="">全部狀態</option><option value="draft">草稿</option><option value="sent">已發送</option><option value="accepted">已接受</option><option value="rejected">已拒絕</option><option value="expired">已過期</option>
    </select>
    <span class="filter-count" id="q-count">${rows.length} 筆</span>
  </div>
  <table><thead><tr>${sth('quotes','quote_no','報價單號')}<th>專案標題</th>${sth('quotes','title','標題')}${sth('quotes','cn','客戶')}${sth('quotes','date','日期')}${sth('quotes','valid_until','有效期')}${sth('quotes','total','含稅金額')}<th>狀態</th><th>操作</th></tr></thead>
  <tbody id="q-tbody">${renderQRows(rows)}</tbody></table></div>`;
}

/** 處理 renderQRows 相關操作。 */
function renderQRows(rows){
  return rows.map(q2=>{
    const canConvert=q2.status==='accepted'&&!q2.converted_order_id;
    const alreadyConverted=q2.status==='accepted'&&q2.converted_order_id;
    const active=q2.status!=='accepted'&&q2.status!=='rejected';
    const canEdit=q2.status!=='rejected'&&q2.status!=='superseded';
    const linkedOrder=q2.converted_order_id?q1("SELECT order_no FROM orders WHERE id=?",[q2.converted_order_id]):null;
    return '<tr>'+
    '<td class="td-mono td-main">'+q2.quote_no+(q2.version>1?'<span class="badge badge-purple" style="margin-left:5px;font-size:9px">v'+q2.version+'</span>':'')+'</td>'+
    '<td class="td-main" style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(q2.p_title?'<span style="color:var(--accent5)" title="'+(q2.p_title.replace(/"/g,'&quot;'))+'">'+q2.p_title+'</span>':'—')+'</td>'+
    '<td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(q2.title||'—')+'</td>'+
    '<td>'+(q2.cn||'—')+'</td>'+
    '<td class="td-mono">'+(q2.date||'')+'</td>'+
    '<td class="td-mono"'+( q2.valid_until&&q2.valid_until<today()&&active?' style="color:var(--accent4)"':'')+'>'+(q2.valid_until||'—')+'</td>'+
    '<td class="td-mono">$'+fmt(q2.total)+'</td>'+
    '<td>'+qsBadge(q2.status)+(alreadyConverted&&linkedOrder?'<span class="badge badge-teal" style="margin-left:4px">→'+linkedOrder.order_no+'</span>':'')+'</td>'+
    '<td><div class="td-actions">'+
    '<button class="btn btn-sm btn-ghost" onclick="showQuoteDetail('+q2.id+')">詳情</button>'+
    (canEdit?'<button class="btn btn-sm btn-ghost" onclick="showEditQuote('+q2.id+')">編輯</button>':'')+
    (q2.status==='draft'?'<button class="btn btn-sm btn-success" onclick="setQStatus('+q2.id+',\'sent\')">發送</button>':'')+
    (q2.status==='sent'?'<button class="btn btn-sm btn-success" onclick="setQStatus('+q2.id+',\'accepted\')">客戶接受</button><button class="btn btn-sm btn-warning" onclick="setQStatus('+q2.id+',\'rejected\')">拒絕</button>':'')+
    (canConvert?'<button class="btn btn-sm btn-convert" onclick="convertQuoteToOrder('+q2.id+')">→ 轉為訂單</button>':'')+
    (active||q2.status==='rejected'?'<button class="btn btn-sm btn-ghost" onclick="reviseQuote('+q2.id+')" title="建立修訂版本">🔄 修訂</button>':'')+
    '<button class="btn btn-sm btn-danger" onclick="softDelete(\'quotes\','+q2.id+',\''+q2.quote_no+'\')">🗑️</button>'+
    '</div></td></tr>';
  }).join('');
}

/** 處理 filterQ 相關操作。 */
function filterQ(sq,st){
  let rows=q("SELECT q.*,c.name as cn, p.project_no, p.title as p_title FROM quotes q LEFT JOIN customers c ON q.customer_id=c.id LEFT JOIN projects p ON q.project_id=p.id WHERE q.deleted_at IS NULL AND q.status != 'superseded' ORDER BY q.date DESC");
  if(st)rows=rows.filter(r=>st==='expired'?(r.valid_until&&r.valid_until<today()):r.status===st);
  if(sq){const s=sq.toLowerCase();rows=rows.filter(r=>['quote_no','project_no','p_title','title','cn'].some(f=>String(r[f]||'').toLowerCase().includes(s)));}
  document.getElementById('q-tbody').innerHTML=renderQRows(rows);
  document.getElementById('q-count').textContent=rows.length+' 筆';
}

/** 處理 setQStatus 相關操作。 */
function setQStatus(id,st){
  const old=q1("SELECT status,quote_no,title,total FROM quotes WHERE id=?",[id]);
  exec("UPDATE quotes SET status=? WHERE id=?",[st,id]);
  logQuoteHistory(id,st,(old?.status?'狀態從「'+old.status+'」變更為「'+st+'」':''));
  const stLabel={sent:'發送報價單',accepted:'客戶接受報價',rejected:'客戶拒絕報價'}[st]||('報價單狀態：'+st);
  logActivity('quote',stLabel,id,old?.quote_no,old?.title,old?.total,null,'');
  toast('報價單狀態已更新','success');go(cur);
}

/** 處理 showQuoteDetail 相關操作。 */
function showQuoteDetail(id){
  const q2=q1("SELECT q.*,c.name as cn,c.phone as cphone,c.email as cemail FROM quotes q LEFT JOIN customers c ON q.customer_id=c.id WHERE q.id=?",[id]);
  const items=q("SELECT qi.*,s.name as sn FROM quote_items qi LEFT JOIN services s ON qi.service_id=s.id WHERE qi.quote_id=?",[id]);
  const history=q("SELECT * FROM quote_history WHERE quote_id=? ORDER BY id ASC",[id]);
  const linkedOrder=q2.converted_order_id?q1("SELECT order_no,title,phase FROM orders WHERE id=?",[q2.converted_order_id]):null;
  const parent=q2.parent_quote_id?q1("SELECT quote_no,version FROM quotes WHERE id=?",[q2.parent_quote_id]):null;
  const revisions=q("SELECT id,quote_no,version,status,date,total FROM quotes WHERE parent_quote_id=? AND deleted_at IS NULL ORDER BY version ASC",[id]);

  openModal('報價單詳情 — '+q2.quote_no+(q2.version>1?' <span class="badge badge-purple">v'+q2.version+'</span>':''),
    '<div class="form-row-3">'+
    '<div class="form-row"><label>客戶</label><div style="color:var(--text);padding:2px 0">'+(q2.cn||'—')+'</div></div>'+
    '<div class="form-row"><label>日期</label><div style="color:var(--text2);padding:2px 0">'+(q2.date||'')+'</div></div>'+
    '<div class="form-row"><label>有效期</label><div style="color:var(--text2);padding:2px 0">'+(q2.valid_until||'—')+'</div></div>'+
    '</div>'+
    '<div class="form-row"><label>標題</label><div style="color:var(--text);font-weight:600;font-size:14px;padding:2px 0">'+(q2.title||'')+'</div></div>'+
    (parent?'<div style="padding:6px 10px;background:var(--surface2);border-radius:6px;font-size:12px;color:var(--text3);margin-bottom:8px">🔗 修訂自：<span style="color:var(--accent5);font-family:\'DM Mono\',monospace">'+parent.quote_no+'</span> (v'+parent.version+')</div>':'')+
    '<div class="form-section-title">報價項目</div>'+
    renderItemsTable(items)+
    '<div class="tax-box">'+
    '<div class="tax-row"><span>未稅金額</span><span>$'+fmt(q2.total_excl)+'</span></div>'+
    '<div class="tax-row"><span>營業稅 ('+q2.tax_rate+'%)</span><span>$'+fmt(q2.tax_amount)+'</span></div>'+
    '<div class="tax-row total"><span>含稅合計</span><span>$'+fmt(q2.total)+'</span></div>'+
    '</div>'+
    '<div style="margin-top:10px;display:flex;align-items:center;gap:8px">狀態：'+qsBadge(q2.status)+
    '<button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="printQuotePDF('+q2.id+')">📄 匯出 PDF</button></div>'+
    (q2.notes?'<div class="form-section-title" style="margin-top:10px">備註</div><div style="font-size:12.5px;color:var(--text2)">'+q2.notes+'</div>':'')+
    // Linked order
    (linkedOrder?'<div class="form-section-title" style="margin-top:12px">轉換的訂單</div>'+
    '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface2);border-radius:8px;border-left:3px solid var(--accent2)">'+
    '<span style="font-size:16px">📁</span>'+
    '<div style="flex:1"><div style="color:var(--text);font-weight:600;font-family:\'DM Mono\',monospace">'+linkedOrder.order_no+'</div>'+
    '<div style="font-size:11.5px;color:var(--text2);margin-top:2px">'+(linkedOrder.title||'')+'</div></div>'+
    '<div>'+phBadge(linkedOrder.phase)+'</div>'+
    '<div style="font-size:11px;color:var(--text3)">轉換於 '+(q2.converted_at||'').substring(0,10)+'</div>'+
    '</div>':'') +
    // Revision chain
    (revisions.length?'<div class="form-section-title" style="margin-top:12px">修訂版本</div>'+
    '<table><thead><tr><th>版本</th><th>報價單號</th><th>日期</th><th>金額</th><th>狀態</th></tr></thead><tbody>'+
    revisions.map(r=>'<tr><td class="td-mono"><span class="badge badge-purple">v'+r.version+'</span></td>'+
    '<td class="td-mono td-main"><a style="color:var(--accent5);cursor:pointer" onclick="closeModal();setTimeout(()=>showQuoteDetail('+r.id+'),100)">'+r.quote_no+'</a></td>'+
    '<td class="td-mono">'+(r.date||'')+'</td><td class="td-mono">$'+fmt(r.total)+'</td><td>'+qsBadge(r.status)+'</td></tr>').join('')+
    '</tbody></table>':'')+
    // Activity timeline
    '<div class="form-section-title" style="margin-top:12px">活動紀錄</div>'+
    (history.length?
    '<div class="notes-timeline">'+
    history.map(h=>{
      const m=QH_ACTIONS[h.action]||{icon:'•',label:h.action,cls:'badge-gray'};
      return '<div class="note-item">'+
        '<div class="note-dot" style="background:var(--accent5)"></div>'+
        '<div class="note-body">'+
        '<div style="display:flex;align-items:center;gap:6px">'+
        '<span class="badge '+m.cls+'" style="font-size:10px">'+m.icon+' '+m.label+'</span>'+
        (h.note?'<span style="font-size:11.5px;color:var(--text2)">'+h.note+'</span>':'')+
        '</div>'+
        '<div class="note-meta">'+(h.created_at||'')+'</div>'+
        '</div></div>';
    }).join('')+
    '</div>':'<div style="color:var(--text3);font-size:12px;padding:8px 0">尚無活動紀錄</div>'),
    null);
}

/** 處理 showAddQuote 相關操作。 */
function showAddQuote(){
  _custs=q("SELECT id,name FROM customers ORDER BY name");
  _svcs=q("SELECT id,name,unit,default_price,category FROM services ORDER BY category,name");
  openModal('新增報價單',quoteForm(),saveQuote,true);
  addQItemRow();
}

/** 處理 quoteForm 相關操作。 */
function quoteForm(q2=null,items=[]){
  const defTax=q2?null:getSetting('default_tax_rate','5');
  const defValid=q2?null:parseInt(getSetting('default_quote_valid_days','30'));
  const _projs=q("SELECT id,project_no,title FROM projects WHERE status='active' AND deleted_at IS NULL ORDER BY date DESC");
  return `<div class="form-row"><label>報價標題 *</label><input type="text" id="f-title" value="${escQ(q2?.title||'')}" placeholder="例：鋁合金支架設計報價"></div>
  <div class="form-row-2">
    <div class="form-row"><label>客戶 *</label><select id="f-cust"><option value="">-- 選擇客戶 --</option>${_custs.map(c=>`<option value="${c.id}"${q2?.customer_id==c.id?' selected':''}>${c.name}</option>`).join('')}</select></div>
    <div class="form-row"><label>歸屬專案</label><select id="f-proj"><option value="">-- 無關聯專案 --</option>${_projs.map(p=>`<option value="${p.id}"${p.id===q2?.project_id?' selected':''}>${p.project_no} - ${p.title}</option>`).join('')}</select></div>
  </div>
  <div class="form-row-3">
    <div class="form-row"><label>報價日期 *</label><input type="date" id="f-date" value="${q2?.date||today()}"></div>
    <div class="form-row"><label>有效期至</label><input type="date" id="f-valid" value="${q2?.valid_until||addDays(today(),defValid||30)}"></div>
    <div class="form-row"><label>營業稅率</label><select id="f-tax" onchange="recalc()"><option value="5"${(q2?.tax_rate||defTax||'5')==='5'||q2?.tax_rate==5?' selected':''}>5%</option><option value="0"${q2?.tax_rate==0||defTax==='0'?' selected':''}>0%（免稅）</option></select></div>
  </div>
  <div class="form-section-title">報價項目</div>
  <div style="display:grid;grid-template-columns:1fr 72px 72px 100px 22px;gap:5px;margin-bottom:5px">
    <div style="font-size:10px;color:var(--text3)">說明</div><div style="font-size:10px;color:var(--text3)">數量</div><div style="font-size:10px;color:var(--text3)">單位</div><div style="font-size:10px;color:var(--text3)">單價(未稅)</div><div></div>
  </div>
  <div id="order-items">${items.map(i=>'<div class="ir'+(i.is_subitem?' ir-sub':'')+'" data-sub="'+(i.is_subitem?'1':'0')+'" '+(i.is_subitem?'style="margin-left:18px"':'')+'><input type="text" class="item-desc" value="'+escQ(i.description)+'" list="svc-list" oninput="onSI(this)"><input type="number" class="item-qty" value="'+i.qty+'" min="0.01" step="0.01" oninput="recalc()"><input type="text" class="item-unit" value="'+i.unit+'"><input type="number" class="item-price" value="'+i.unit_price+'" step="0.01" oninput="recalc()"><button class="rm-btn" onclick="this.parentElement.remove();recalc()">✕</button></div>').join('')}</div>
  <div style="display:flex;gap:5px">
  <button class="add-row-btn" style="flex:1" onclick="addQItemRow()">＋ 新增項目</button>
  <button class="add-row-btn" style="flex:0.5;font-size:11px;color:var(--accent5);border-color:var(--accent5)" onclick="addItemRow('order-items',true)">＋ 子項</button>
</div>
  <div class="tax-box" id="tax-summary"><div class="tax-row"><span>未稅金額</span><span id="ts-excl">$0</span></div><div class="tax-row"><span>營業稅 (5%)</span><span id="ts-tax">$0</span></div><div class="tax-row total"><span>含稅合計</span><span id="ts-total">$0</span></div></div>
  <div class="form-row" style="margin-top:10px"><label>備註</label><textarea id="f-notes">${escQ(q2?.notes||'')}</textarea></div>`;
}

/** 處理 saveQuote 相關操作。 */
function saveQuote(){
  const title=document.getElementById('f-title').value.trim();
  const custId=document.getElementById('f-cust').value;
  const date=document.getElementById('f-date').value;
  const valid=document.getElementById('f-valid').value;
  const taxRate=parseFloat(document.getElementById('f-tax').value||'5');
  const projId=document.getElementById('f-proj').value||null;
  const notes=document.getElementById('f-notes').value;
  if(!title||!custId||!date){toast('請填寫標題、客戶與日期','error');return;}
  const items=getItems();
  const excl=items.reduce((s,i)=>s+i.qty*i.price,0);
  const tax=Math.round(excl*taxRate)/100;
  const qNo=nextNo('QT','quotes');
  exec("INSERT INTO quotes(project_id,quote_no,customer_id,title,date,valid_until,status,total_excl,tax_rate,tax_amount,total,notes) VALUES(?,?,?,?,?,?,?,'draft',?,?,?,?,?)",
    [projId,qNo,custId,title,date,valid||null,excl,taxRate,tax,excl+tax,notes]);
  const qid=lastId();
  items.forEach(i=>{
    const svc=_svcs.find(s=>s.name===i.desc);
    exec("INSERT INTO quote_items(quote_id,service_id,description,qty,unit,unit_price,is_subitem) VALUES(?,?,?,?,?,?,?)",[qid,svc?.id||null,i.desc,i.qty,i.unit,i.price,i.isSub?1:0]);
  });
  toast(`報價單 ${qNo} 已建立`,'success');
  logQuoteHistory(qid,'created','報價單建立');
  logActivity('quote','建立報價單',qid,qNo,title,excl+tax,getSetting('company_name',''),'');
  closeModal();go(cur);
}

/** 處理 showEditQuote 相關操作。 */
function showEditQuote(id){
  const q2=q1("SELECT * FROM quotes WHERE id=?",[id]);
  const items=q("SELECT * FROM quote_items WHERE quote_id=?",[id]);
  _custs=q("SELECT id,name FROM customers ORDER BY name");
  _svcs=q("SELECT id,name,unit,default_price,category FROM services ORDER BY category,name");
  openModal(`編輯報價單 — ${q2.quote_no}`,quoteForm(q2,items),()=>{
    const title=document.getElementById('f-title').value.trim();
    const custId=document.getElementById('f-cust').value;
    const date=document.getElementById('f-date').value;
    const valid=document.getElementById('f-valid').value;
    const taxRate=parseFloat(document.getElementById('f-tax').value||'5');
    const projId=document.getElementById('f-proj').value||null;
    const notes=document.getElementById('f-notes').value;
    if(!title||!custId||!date){toast('請填寫必填欄位','error');return;}
    const items2=getItems();
    const excl=items2.reduce((s,i)=>s+i.qty*i.price,0);
    const tax=Math.round(excl*taxRate)/100;
    exec("UPDATE quotes SET project_id=?,customer_id=?,title=?,date=?,valid_until=?,tax_rate=?,total_excl=?,tax_amount=?,total=?,notes=? WHERE id=?",[projId,custId,title,date,valid||null,taxRate,excl,tax,excl+tax,notes,id]);
    exec("DELETE FROM quote_items WHERE quote_id=?",[id]);
    items2.forEach(i=>{const svc=_svcs.find(s=>s.name===i.desc);exec("INSERT INTO quote_items(quote_id,service_id,description,qty,unit,unit_price,is_subitem) VALUES(?,?,?,?,?,?,?)",[id,svc?.id||null,i.desc,i.qty,i.unit,i.price,i.isSub?1:0]);});
    logQuoteHistory(id,'edited','編輯報價內容');
    toast('報價單已更新','success');closeModal();go(cur);
  },true);
  setTimeout(recalc,50);
}

/** 處理 convertQuoteToOrder 相關操作。 */
function convertQuoteToOrder(qid){
  const q2=q1("SELECT * FROM quotes WHERE id=?",[qid]);
  const items=q("SELECT * FROM quote_items WHERE quote_id=?",[qid]);
  if(!q2){toast('找不到報價單','error');return;}
  const oNo=nextNo('PRJ','orders');
  exec("INSERT INTO orders(order_no,quote_id,customer_id,title,date,due_date,phase,status,total_excl,tax_rate,tax_amount,total,deliverables) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [oNo,qid,q2.customer_id,q2.title,today(),q2.valid_until||null,'pending','active',q2.total_excl,q2.tax_rate,q2.tax_amount,q2.total,'[]']);
  const oid=lastId();
  items.forEach(i=>exec("INSERT INTO order_items(order_id,service_id,description,qty,unit,unit_price) VALUES(?,?,?,?,?,?)",[oid,i.service_id,i.description,i.qty,i.unit,i.unit_price]));
  exec("INSERT INTO receivables(order_id,milestone_name,amount,due_date,status) VALUES(?,?,?,?,'unpaid')",[oid,'全額付款',q2.total,q2.valid_until||addDays(today(),parseInt(getSetting('default_payment_days','30')))]);
  exec("UPDATE quotes SET status='accepted',converted_order_id=?,converted_at=datetime('now','localtime') WHERE id=?",[oid,qid]);
  logQuoteHistory(qid,'converted','轉為專案訂單 '+oNo);
  logActivity('order','報價轉專案訂單',oid,oNo,q2.title,q2.total,null,'來自報價單 '+q2.quote_no);
  toast(`報價單已轉為專案訂單 ${oNo} ✓`,'success');go('orders');
}

/** 處理 showAddSupplierQuote 相關操作。 */
function showAddSupplierQuote(rfqId){
  const r=q1("SELECT * FROM rfqs WHERE id=?",[rfqId]);
  const supps=q("SELECT s.id,s.name FROM rfq_suppliers rs JOIN suppliers s ON rs.supplier_id=s.id WHERE rs.rfq_id=?",[rfqId]);
  const defTax=getSetting('default_tax_rate','5');
  openModal('記錄廠商報價',
    `<div class="form-row"><label>廠商 *</label><select id="f-sq-sup"><option value="">-- 選擇廠商 --</option>${supps.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
    <div class="form-row-2">
      <div class="form-row"><label>回報日期</label><input type="date" id="f-sq-date" value="${today()}"></div>
      <div class="form-row"><label>交期（天）</label><input type="number" id="f-sq-lead" value="14" min="1"></div>
    </div>
    <div class="form-row-3">
      <div class="form-row"><label>未稅金額</label><input type="number" id="f-sq-excl" value="0" step="0.01" oninput="calcSQTax()"></div>
      <div class="form-row"><label>稅率</label><select id="f-sq-tax" onchange="calcSQTax()"><option value="5" ${defTax==='5'?'selected':''}>5%</option><option value="0" ${defTax==='0'?'selected':''}>0%</option></select></div>
      <div class="form-row"><label>含稅合計</label><input type="number" id="f-sq-total" readonly style="background:var(--surface);color:var(--accent2)"></div>
    </div>
    <div class="form-row"><label>報價檔案路徑（NAS）</label><input type="text" id="f-sq-file" placeholder="\\\\NAS\\報價單\\廠商_日期.xlsx"></div>
    <div class="form-row"><label>備註</label><textarea id="f-sq-notes" rows="2" placeholder="特殊條件、備注..."></textarea></div>`,
    ()=>{
      const supId=document.getElementById('f-sq-sup').value;
      const date=document.getElementById('f-sq-date').value;
      const lead=parseInt(document.getElementById('f-sq-lead').value)||0;
      const excl=parseFloat(document.getElementById('f-sq-excl').value)||0;
      const tax=parseFloat(document.getElementById('f-sq-tax').value||'5');
      const total=excl*(1+tax/100);
      const file=document.getElementById('f-sq-file').value.trim();
      const notes=document.getElementById('f-sq-notes').value;
      if(!supId){toast('請選擇廠商','error');return;}
      exec("INSERT INTO supplier_quotes(rfq_id,supplier_id,received_date,total_excl,tax_rate,tax_amount,total,lead_time_days,file_url,notes) VALUES(?,?,?,?,?,?,?,?,?,?)",
        [rfqId,supId,date,excl,tax,Math.round(excl*tax)/100,Math.round(total*100)/100,lead,file||null,notes]);
      toast('廠商報價已記錄','success');closeModal();showRFQDetail(rfqId);
    });
}

/** 處理 selectSupplierQuote 相關操作。 */
function selectSupplierQuote(sqId,rfqId){
  // Unselect others in same RFQ
  exec("UPDATE supplier_quotes SET selected=0 WHERE rfq_id=?",[rfqId]);
  exec("UPDATE supplier_quotes SET selected=1 WHERE id=?",[sqId]);
  toast('已選定此廠商報價','success');showRFQDetail(rfqId);
}

/** 處理 deleteSupplierQuote 相關操作。 */
function deleteSupplierQuote(sqId,rfqId){
  exec("DELETE FROM supplier_quotes WHERE id=?",[sqId]);
  toast('已刪除','success');showRFQDetail(rfqId);
}

/** 處理 osQuoteCell 相關操作。 */
function osQuoteCell(url){
  if(!url) return '<span style="color:var(--text3);font-size:11px">未設定</span>';
  const parts=url.replace(/\\/g,'/').split('/');
  const fname=parts[parts.length-1]||url;
  return '<div style="display:flex;align-items:center;gap:5px">'+
    '<span style="font-size:11px;color:var(--accent2);max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+escQ(url)+'">📄 '+fname+'</span>'+
    '<button class="btn btn-sm btn-ghost" style="padding:2px 7px;font-size:10px;flex-shrink:0" onclick="copyPath(\''+escQ(url).replace(/'/g,"\\'")+'\')" >複製</button>'+
    '</div>';
}
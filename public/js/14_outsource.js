/**
 * 14_outsource.js — 自動分拆模組
 * 對外暴露：...
 * 依賴：...
 */

/** 處理 renderOS 相關操作。 */
function renderOS(){
  const s=getSort('outsource','date');
  let rows=q("SELECT os.*,s.name as sn,o.order_no,o.title,r.rfq_no,p.project_no FROM outsource_orders os LEFT JOIN suppliers s ON os.supplier_id=s.id LEFT JOIN orders o ON os.order_id=o.id LEFT JOIN rfqs r ON os.rfq_id=r.id LEFT JOIN projects p ON os.project_id=p.id WHERE os.deleted_at IS NULL ORDER BY os.date DESC");
  rows=sortArr(rows,s.col==='sn'?'sn':s.col,s.dir);
  return `<div class="panel"><div class="panel-header"><div class="panel-title">採購單管理 <span style="font-size:11px;color:var(--text3);font-weight:400">由詢價單產生或直接建立</span></div><button class="btn btn-ghost btn-sm" onclick="exportOSCSV()">↓ CSV</button></div>
  <div class="filter-bar">
    <input type="text" id="fos" placeholder="搜尋委外單號、廠商..." oninput="filterOS(this.value,document.getElementById('fosst').value)">
    <select id="fosst" onchange="filterOS(document.getElementById('fos').value,this.value)">
      <option value="">全部</option><option value="pending">待確認</option><option value="confirmed">已確認</option><option value="received">已完成</option><option value="cancelled">已取消</option>
    </select>
    <span class="filter-count" id="os-count">${rows.length} 筆</span>
  </div>
  <table><thead><tr>${sth('outsource','os_no','委外單號')}${sth('outsource','sn','廠商')}${sth('outsource','description','說明')}<th>歸屬專案</th><th>關聯訂單</th>${sth('outsource','date','日期')}${sth('outsource','expected_date','預計完成')}${sth('outsource','total','含稅金額')}<th>廠商報價</th><th>狀態</th><th>操作</th></tr></thead>
  <tbody id="os-tbody">${renderOSRows(rows)}</tbody></table></div>`;
}

/** 處理 renderOSRows 相關操作。 */
function renderOSRows(rows){
  return rows.map(os=>{
    const active=os.status!=='received'&&os.status!=='cancelled';
    return '<tr>'+
    '<td class="td-mono td-main">'+os.os_no+'</td>'+
    '<td class="td-main">'+( os.sn||'—')+'</td>'+
    '<td style="max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(os.description||'—')+'</td>'+
    '<td class="td-mono">'+(os.project_no?'<span style="color:var(--accent5)">'+os.project_no+'</span>':'—')+'</td>'+
    '<td class="td-mono">'+(os.order_no?'<span style="color:var(--accent5)">'+os.order_no+'</span>':'—')+(os.rfq_no?'<br><span style="font-size:10px;color:var(--text3)">來自 '+os.rfq_no+'</span>':'')+'</td>'+
    '<td class="td-mono">'+(os.date||'')+'</td>'+
    '<td class="td-mono">'+(os.expected_date||'—')+'</td>'+
    '<td class="td-mono">$'+fmt(os.total)+'</td>'+
    '<td>'+osQuoteCell(os.quote_file_url)+'</td>'+
    '<td>'+stBadge(os.status)+'</td>'+
    '<td><div class="td-actions">'+
    (os.status==='pending'?'<button class="btn btn-sm btn-success" onclick="confirmOS('+os.id+')">確認</button>':'')+
    (os.status==='confirmed'?'<button class="btn btn-sm btn-success" onclick="receiveOS('+os.id+')">完成</button>':'')+
    (active?'<button class="btn btn-sm btn-ghost" onclick="showEditOS('+os.id+')">編輯</button>':'')+
    '<button class="btn btn-sm btn-ghost" onclick="printOSPDF('+os.id+')" title="匯出採購單 PDF">📄 匯出 PDF</button>'+
    (active?'<button class="btn btn-sm btn-warning" onclick="cancelOS('+os.id+')">取消</button>':'')+
    '<button class="btn btn-sm btn-danger" onclick="softDelete(\'outsource_orders\','+os.id+',\''+os.os_no+'\')">🗑️</button>'+
    '</div></td></tr>';
  }).join('');
}

/** 處理 confirmOS 相關操作。 */
function confirmOS(id){
  const os=q1("SELECT os_no,description,total FROM outsource_orders WHERE id=?",[id]);
  exec("UPDATE outsource_orders SET status='confirmed' WHERE id=?",[id]);
  logActivity('outsource','確認採購單',id,os?.os_no,os?.description,os?.total,null,'');
  toast('已確認','success');go(cur);
}

/** 處理 receiveOS 相關操作。 */
function receiveOS(id){
  const os=q1("SELECT os_no,description,total FROM outsource_orders WHERE id=?",[id]);
  exec("UPDATE outsource_orders SET status='received' WHERE id=?",[id]);
  logActivity('outsource','採購單完成收貨',id,os?.os_no,os?.description,os?.total,null,'');
  toast('已完成','success');go(cur);
}

/** 處理 cancelOS 相關操作。 */
function cancelOS(id){confirmDialog('確定取消此委外單？',()=>{exec("UPDATE outsource_orders SET status='cancelled' WHERE id=?",[id]);toast('已取消','success');go(cur);});}

/** 處理 filterOS 相關操作。 */
function filterOS(sq,st){
  let rows=q("SELECT os.*,s.name as sn,o.order_no,r.rfq_no,p.project_no FROM outsource_orders os LEFT JOIN suppliers s ON os.supplier_id=s.id LEFT JOIN orders o ON os.order_id=o.id LEFT JOIN rfqs r ON os.rfq_id=r.id LEFT JOIN projects p ON os.project_id=p.id WHERE os.deleted_at IS NULL ORDER BY os.date DESC");
  if(st)rows=rows.filter(r=>r.status===st);
  if(sq){const s=sq.toLowerCase();rows=rows.filter(r=>['os_no','sn','description','order_no','project_no'].some(f=>String(r[f]||'').toLowerCase().includes(s)));}
  document.getElementById('os-tbody').innerHTML=renderOSRows(rows);
  document.getElementById('os-count').textContent=rows.length+' 筆';
}

/** 處理 showEditOS 相關操作。 */
function showEditOS(id){
  const os=q1("SELECT * FROM outsource_orders WHERE id=?",[id]);
  const items=q("SELECT * FROM os_items WHERE os_id=?",[id]);
  const activeOrders=q("SELECT id,order_no,title FROM orders WHERE status='active' AND phase NOT IN('completed','cancelled') ORDER BY date DESC");
  const _projs=q("SELECT id,project_no,title FROM projects WHERE status='active' AND deleted_at IS NULL ORDER BY date DESC");
  _svcs=q("SELECT id,name,unit,default_price,category FROM services ORDER BY category,name");
  openModal(`編輯委外單 — ${os.os_no}`,
    `<div class="form-row-2">
      <div class="form-row"><label>歸屬專案</label><select id="f-proj"><option value="">無</option>${_projs.map(p=>`<option value="${p.id}"${p.id===os.project_id?' selected':''}>${p.project_no} - ${p.title}</option>`).join('')}</select></div>
      <div class="form-row"><label>關聯訂單</label><select id="f-ord"><option value="">無</option>${activeOrders.map(o=>`<option value="${o.id}"${os.order_id==o.id?' selected':''}>[${o.order_no}] ${o.title}</option>`).join('')}</select></div>
    </div>
    <div class="form-row"><label>委外說明</label><input type="text" id="f-desc" value="${escQ(os.description||'')}"></div>
    <div class="form-row-3">
      <div class="form-row"><label>建立日期</label><input type="date" id="f-date" value="${os.date||today()}"></div>
      <div class="form-row"><label>預計完成日</label><input type="date" id="f-exp" value="${os.expected_date||''}"></div>
      <div class="form-row"><label>營業稅率</label><select id="f-tax" onchange="recalc()"><option value="5"${(os.tax_rate||5)==5?' selected':''}>5%</option><option value="0"${os.tax_rate==0?' selected':''}>0%（免稅）</option></select></div>
    </div>
    <div class="form-section-title">費用明細</div>
    <div style="display:grid;grid-template-columns:1fr 72px 72px 100px 22px;gap:5px;margin-bottom:5px"><div style="font-size:10px;color:var(--text3)">說明</div><div style="font-size:10px;color:var(--text3)">數量</div><div style="font-size:10px;color:var(--text3)">單位</div><div style="font-size:10px;color:var(--text3)">單價(未稅)</div><div></div></div>
    <div id="order-items">${items.map(i=>`<div class="ir"><input type="text" class="item-desc" value="${escQ(i.description)}"><input type="number" class="item-qty" value="${i.qty}" step="0.01" oninput="recalc()"><input type="text" class="item-unit" value="${i.unit}"><input type="number" class="item-price" value="${i.unit_price}" step="0.01" oninput="recalc()"><button class="rm-btn" onclick="this.parentElement.remove();recalc()">✕</button></div>`).join('')}</div>
    <button class="add-row-btn" onclick="addItemRow('order-items')">＋ 新增明細</button>
    <div class="tax-box" id="tax-summary"><div class="tax-row"><span>未稅金額</span><span id="ts-excl">$${fmt(os.total_excl)}</span></div><div class="tax-row"><span>營業稅 (${os.tax_rate}%)</span><span id="ts-tax">$${fmt(os.tax_amount)}</span></div><div class="tax-row total"><span>含稅合計</span><span id="ts-total">$${fmt(os.total)}</span></div></div>
    <div class="form-row"><label>備註</label><textarea id="f-notes">${escQ(os.notes||'')}</textarea></div>
    <div class="form-section-title">廠商報價檔案（NAS 路徑）</div>
    <div class="form-row">
      <label>Excel 報價單路徑 <span style="font-size:10px;color:var(--text3);font-weight:400">（貼上 NAS 或本機完整路徑，例：\\\\NAS\\報價單\\廠商A_20260320.xlsx）</span></label>
      <input type="text" id="f-quote-url" value="${escQ(os.quote_file_url||'')}" placeholder="\\\\NAS\\共用\\報價單\\廠商名稱_日期.xlsx">
    </div>
    ${os.quote_file_url?`<div style="margin-top:-6px;margin-bottom:10px;display:flex;align-items:center;gap:8px">
      <div style="flex:1;font-size:11px;color:var(--text3);font-family:'DM Mono',monospace;background:var(--surface2);padding:6px 10px;border-radius:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escQ(os.quote_file_url)}</div>
      <button class="btn btn-ghost btn-sm" onclick="copyPath('${escQ(os.quote_file_url)}')">📋 複製路徑</button>
    </div>`:''}`,
    ()=>{
      const projId=document.getElementById('f-proj').value||null;
      const ordId=document.getElementById('f-ord').value||null;
      const desc=document.getElementById('f-desc').value.trim();
      const date=document.getElementById('f-date').value;
      const exp=document.getElementById('f-exp').value;
      const taxRate=parseFloat(document.getElementById('f-tax').value||'5');
      const notes=document.getElementById('f-notes').value;
      const quoteUrl=document.getElementById('f-quote-url').value.trim();
      const items2=getItems();
      const excl=items2.reduce((s,i)=>s+i.qty*i.price,0);
      const tax=Math.round(excl*taxRate)/100;
      const total=excl+tax;
      exec("UPDATE outsource_orders SET project_id=?,order_id=?,description=?,date=?,expected_date=?,tax_rate=?,total_excl=?,tax_amount=?,total=?,notes=?,quote_file_url=? WHERE id=?",[projId,ordId,desc,date||null,exp||null,taxRate,excl,tax,total,notes,quoteUrl||null,id]);
      exec("DELETE FROM os_items WHERE os_id=?",[id]);
      items2.forEach(i=>exec("INSERT INTO os_items(os_id,description,qty,unit,unit_price) VALUES(?,?,?,?,?)",[id,i.desc,i.qty,i.unit,i.price]));
      exec("UPDATE payables SET amount=? WHERE os_id=?",[total,id]);
      toast('委外單已更新','success');closeModal();go(cur);
    }, true);
  setTimeout(recalc,50);
}

/** 處理 showAddOS 相關操作。 */
function showAddOS(){
  _supps=q("SELECT id,name,specialty FROM suppliers ORDER BY name");
  _svcs=q("SELECT id,name,unit,default_price FROM services ORDER BY name");
  const _projs=q("SELECT id,project_no,title FROM projects WHERE status='active' AND deleted_at IS NULL ORDER BY date DESC");
  const activeOrders=q("SELECT id,order_no,title FROM orders WHERE status='active' AND phase NOT IN('completed','cancelled') AND deleted_at IS NULL ORDER BY date DESC");
  const defTax=getSetting('default_tax_rate','5');
  const defPay=parseInt(getSetting('default_payment_days','30'));
  openModal('新增委外單',
    `<div class="form-row-2">
      <div class="form-row"><label>歸屬專案（選填）</label><select id="f-proj"><option value="">不關聯</option>${_projs.map(p=>`<option value="${p.id}">${p.project_no} - ${p.title}</option>`).join('')}</select></div>
      <div class="form-row"><label>關聯訂單（選填）</label><select id="f-ord"><option value="">不關聯</option>${activeOrders.map(o=>`<option value="${o.id}">[${o.order_no}] ${o.title}</option>`).join('')}</select></div>
    </div>
    <div class="form-row"><label>合作廠商 *</label><select id="f-supp"><option value="">-- 選擇廠商 --</option>${_supps.map(s=>`<option value="${s.id}">${s.name}${s.specialty?` (${s.specialty})`:''}</option>`).join('')}</select></div>
    <div class="form-row"><label>委外說明 *</label><input type="text" id="f-desc" placeholder="例：CNC車床件 / 鈑金加工..."></div>
    <div class="form-row-3">
      <div class="form-row"><label>建立日期</label><input type="date" id="f-date" value="${today()}"></div>
      <div class="form-row"><label>預計完成日</label><input type="date" id="f-exp" value="${addDays(today(),defPay)}"></div>
      <div class="form-row"><label>營業稅率</label><select id="f-tax" onchange="recalc()"><option value="5" ${defTax==='5'?'selected':''}>5%</option><option value="0" ${defTax==='0'?'selected':''}>0%（免稅）</option></select></div>
    </div>
    <div class="form-section-title">費用明細</div>
    <div style="display:grid;grid-template-columns:1fr 72px 72px 100px 22px;gap:5px;margin-bottom:5px"><div style="font-size:10px;color:var(--text3)">說明</div><div style="font-size:10px;color:var(--text3)">數量</div><div style="font-size:10px;color:var(--text3)">單位</div><div style="font-size:10px;color:var(--text3)">單價(未稅)</div><div></div></div>
    <div id="order-items"></div>
    <button class="add-row-btn" onclick="addItemRow('order-items')">＋ 新增明細</button>
    <div class="tax-box" id="tax-summary"><div class="tax-row"><span>未稅金額</span><span id="ts-excl">$0</span></div><div class="tax-row"><span>營業稅 (${defTax}%)</span><span id="ts-tax">$0</span></div><div class="tax-row total"><span>含稅合計</span><span id="ts-total">$0</span></div></div>
    <div class="form-row" style="margin-top:10px"><label>備註</label><textarea id="f-notes" placeholder="選填"></textarea></div>
    <div class="form-section-title">廠商報價檔案（NAS 路徑，選填）</div>
    <div class="form-row">
      <label>Excel 報價單路徑 <span style="font-size:10px;color:var(--text3);font-weight:400">（例：\\\\NAS\\報價單\\廠商A_20260320.xlsx）</span></label>
      <input type="text" id="f-quote-url" placeholder="\\\\NAS\\共用\\報價單\\廠商名稱_日期.xlsx">
    </div>
    <div class="form-note"><span class="auto-tag">AUTO</span> 儲存後自動建立應付帳款</div>`,
    saveOS, true);
  addItemRow('order-items');
}

/** 處理 saveOS 相關操作。 */
function saveOS(){
  const projId=document.getElementById('f-proj').value||null;
  const ordId=document.getElementById('f-ord').value||null;
  const suppId=document.getElementById('f-supp').value;
  const desc=document.getElementById('f-desc').value.trim();
  const date=document.getElementById('f-date').value;
  const exp=document.getElementById('f-exp').value;
  const taxRate=parseFloat(document.getElementById('f-tax').value||'5');
  const notes=document.getElementById('f-notes').value;
  const quoteUrl=(document.getElementById('f-quote-url')?.value||'').trim();
  if(!suppId||!desc||!date){toast('請填寫廠商、說明與日期','error');return;}
  const items=getItems();
  const excl=items.reduce((s,i)=>s+i.qty*i.price,0);
  const tax=Math.round(excl*taxRate)/100;
  const total=excl+tax;
  const osNo=nextNo('OS','outsource_orders');
  exec("INSERT INTO outsource_orders(project_id,os_no,order_id,supplier_id,date,expected_date,status,total_excl,tax_rate,tax_amount,total,description,notes,quote_file_url) VALUES(?,?,?,?,?,?,?,'pending',?,?,?,?,?,?,?,?)",
    [projId,osNo,ordId,suppId,date,exp||null,excl,taxRate,tax,total,desc,notes,quoteUrl||null]);
  const osid=lastId();
  items.forEach(i=>exec("INSERT INTO os_items(os_id,description,qty,unit,unit_price) VALUES(?,?,?,?,?)",[osid,i.desc,i.qty,i.unit,i.price]));
  const defPayDays=parseInt(getSetting('default_payment_days','30'));
  exec("INSERT OR IGNORE INTO payables(os_id,amount,due_date,status) VALUES(?,?,?,'unpaid')",[osid,total,addDays(exp||date,defPayDays)]);
  logActivity('outsource','建立採購單',osid,osNo,desc,total,q1("SELECT name FROM suppliers WHERE id=?",[suppId])?.name,'');
  toast(`委外單 ${osNo} 已建立 ✓`,'success');closeModal();go(cur);
}

/** 處理 printOSPDF 相關操作。 */
function printOSPDF(id){
  const os=q1("SELECT os.*,s.name as sn,s.phone as sphone,s.email as semail,s.contact as scontact,o.order_no,o.title as otitle FROM outsource_orders os LEFT JOIN suppliers s ON os.supplier_id=s.id LEFT JOIN orders o ON os.order_id=o.id WHERE os.id=?",[id]);
  const items=q("SELECT * FROM os_items WHERE os_id=?",[id]);
  if(!os){toast('找不到委外單','error');return;}
  const coName=getSetting('company_name','');
  const coTax=getSetting('company_tax_id','');
  const coPhone=getSetting('company_phone','');
  const coEmail=getSetting('company_email','');
  const coAddr=getSetting('company_address','');

  // PDF format settings
  const accentColor=getSetting('pdf_accent_color','#1a1a1a');
  const fontSize=getSetting('pdf_font_size','13');
  const headerStyle=getSetting('pdf_header_style','light');
  const pageMargin=getSetting('pdf_margin','normal')==='narrow'?'12mm':getSetting('pdf_margin','normal')==='wide'?'28mm':'20mm';
  const pageSize=getSetting('pdf_page_size','A4');
  const poNote=getSetting('pdf_po_note','');
  const signPurchaser=getSetting('pdf_sign_purchaser','採購方簽章');
  const signSupplier=getSetting('pdf_sign_supplier','供應商確認簽章');
  const extraSigns=getSetting('pdf_extra_signs','').split(',').map(s=>s.trim()).filter(Boolean);
  const purchaserEnabled=getSetting('pdf_sign_purchaser_enabled','1')==='1';
  const supplierEnabled=getSetting('pdf_sign_supplier_enabled','1')==='1';
  const thBg=headerStyle==='dark'?accentColor:headerStyle==='none'?'transparent':'#f0f0f0';
  const thColor=headerStyle==='dark'?'#fff':'#555';
  const thBorder=headerStyle==='dark'?accentColor:'#ddd';
  const allPoSigns=[
    ...(purchaserEnabled?[signPurchaser]:[]),
    ...(supplierEnabled?[signSupplier]:[]),
    ...extraSigns
  ];
  // Signature
  const sigDataOS=getSetting('pdf_signature','');
  const sigSlotOS=getSetting('pdf_sig_slot','seller');
  function stampBoxOS(label,idx){
    const showSig=sigDataOS&&(sigSlotOS==='all'||(sigSlotOS==='seller'&&idx===0));
    return '<div class="stamp-box">'+(showSig?'<img src="'+sigDataOS+'" style="max-width:110px;max-height:40px;display:block;margin:0 auto 4px">':'')+'<div class="stamp-line"></div>'+label+'</div>';
  }

  const html=`<!DOCTYPE html>
<html lang="zh-TW"><head><meta charset="UTF-8">
<title>${os.os_no}_${os.description}_${os.date}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Noto Sans TC',sans-serif;font-size:${fontSize}px;color:#1a1a1a;background:#fff;padding:40px;}
  @page{size:${pageSize};margin:${pageMargin} ${pageMargin};}
  @media print{body{padding:0;}}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid ${accentColor};}
  .co-name{font-size:19px;font-weight:700;color:${accentColor};margin-bottom:5px;}
  .co-info{font-size:11px;color:#666;line-height:1.7;}
  .doc-title h1{font-size:24px;font-weight:700;color:${accentColor};letter-spacing:2px;text-align:right;}
  .doc-no{font-size:12px;color:#888;margin-top:4px;font-family:monospace;text-align:right;}
  .doc-badge{display:inline-block;background:${accentColor};color:#fff;font-size:10px;padding:2px 8px;border-radius:3px;margin-top:5px;letter-spacing:1px;}
  .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;}
  .meta-box{background:#f8f8f8;border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;}
  .meta-label{font-size:10px;color:${accentColor};letter-spacing:.5px;text-transform:uppercase;margin-bottom:7px;font-weight:600;}
  .meta-value{font-size:${fontSize}px;color:#1a1a1a;font-weight:500;}
  .meta-sub{font-size:11px;color:#666;margin-top:3px;line-height:1.6;}
  .ref-box{background:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:10px 14px;margin-bottom:20px;font-size:12px;color:#5d4037;}
  table{width:100%;border-collapse:collapse;margin-bottom:14px;}
  thead th{background:${thBg};padding:8px 11px;text-align:left;font-size:11px;color:${thColor};font-weight:600;border-bottom:2px solid ${thBorder};}
  thead th:last-child{text-align:right;}
  tbody td{padding:9px 11px;border-bottom:1px solid #eee;font-size:${parseInt(fontSize)-0.5}px;vertical-align:top;}
  tbody td:last-child{text-align:right;font-family:monospace;}
  tbody tr:last-child td{border-bottom:none;}
  .totals{margin-left:auto;width:260px;}
  .totals td{padding:6px 11px;font-size:${fontSize}px;}
  .totals .total-row{background:${accentColor};color:#fff;font-weight:700;font-size:${parseInt(fontSize)+1}px;}
  .totals .total-row td{padding:9px 11px;}
  .notes-box{margin-top:20px;padding:12px 14px;background:#f5f5f5;border:1px solid #e0e0e0;border-radius:6px;}
  .notes-label{font-size:10px;font-weight:600;color:#888;letter-spacing:.5px;margin-bottom:5px;}
  .nas-box{margin-top:12px;padding:10px 14px;background:#e8f5e9;border:1px solid #a5d6a7;border-radius:6px;font-size:11.5px;color:#2e7d32;}
  .footer{margin-top:36px;padding-top:14px;border-top:1px solid #e0e0e0;display:flex;justify-content:space-between;font-size:11px;color:#999;}
  .stamp-area{margin-top:28px;display:flex;justify-content:flex-end;gap:${Math.max(20,Math.round(200/allPoSigns.length))}px;}
  .stamp-box{text-align:center;font-size:11px;color:#888;}
  .stamp-line{width:${Math.min(120,Math.round(500/allPoSigns.length))}px;border-top:1px solid #bbb;margin:30px auto 5px;}
</style></head><body>
  <div class="header">
    <div>
      ${coName?`<div class="co-name">${coName}</div>`:'<div class="co-name" style="color:#aaa">（公司名稱未設定）</div>'}
      <div class="co-info">
        ${coTax?`統一編號：${coTax}<br>`:''}
        ${coPhone?`電話：${coPhone}　`:''}${coEmail?`Email：${coEmail}<br>`:''}
        ${coAddr||''}
      </div>
    </div>
    <div class="doc-title">
      <h1>採 購 單</h1>
      <div class="doc-no">PO NO.  ${os.os_no}</div>
      <div><span class="doc-badge">PURCHASE ORDER</span></div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-box">
      <div class="meta-label">供應商</div>
      <div class="meta-value">${os.sn||'—'}</div>
      <div class="meta-sub">
        ${os.scontact?'聯絡人：'+os.scontact+'<br>':''}
        ${os.sphone?'電話：'+os.sphone+'<br>':''}
        ${os.semail?'Email：'+os.semail:''}
      </div>
    </div>
    <div class="meta-box">
      <div class="meta-label">採購資訊</div>
      <div class="meta-sub">
        <strong>採購單號：</strong>${os.os_no}<br>
        <strong>建立日期：</strong>${os.date||'—'}<br>
        <strong>預計完成：</strong>${os.expected_date||'—'}<br>
        <strong>狀態：</strong>${{pending:'待確認',confirmed:'已確認',received:'已完成',cancelled:'已取消'}[os.status]||os.status}
      </div>
    </div>
  </div>

  ${os.order_no?`<div class="ref-box">📁 關聯專案：<strong>${os.order_no}</strong>${os.otitle?' — '+os.otitle:''}</div>`:''}

  <table>
    <thead><tr><th>#</th><th>項目說明</th><th>數量</th><th>單位</th><th>單價（未稅）</th><th>小計</th></tr></thead>
    <tbody>
      ${items.length?items.map((it,i)=>`<tr>
        <td style="color:#999;width:28px">${i+1}</td>
        <td>${it.description||'—'}</td>
        <td style="text-align:right;font-family:monospace">${it.qty}</td>
        <td style="color:#666">${it.unit}</td>
        <td style="font-family:monospace">NT$ ${Number(it.unit_price||0).toLocaleString('zh-TW')}</td>
        <td>NT$ ${Number((it.qty||0)*(it.unit_price||0)).toLocaleString('zh-TW')}</td>
      </tr>`).join(''):
      `<tr><td colspan="6" style="text-align:center;color:#999;padding:20px">（無明細項目）</td></tr>`}
    </tbody>
  </table>

  <div style="display:flex;justify-content:flex-end">
    <div class="totals">
      <table>
        <tr><td style="color:#666">未稅金額</td><td style="font-family:monospace;text-align:right">NT$ ${Number(os.total_excl||0).toLocaleString('zh-TW')}</td></tr>
        <tr><td style="color:#666">營業稅（${os.tax_rate||5}%）</td><td style="font-family:monospace;text-align:right">NT$ ${Number(os.tax_amount||0).toLocaleString('zh-TW')}</td></tr>
        <tr class="total-row"><td>含稅合計</td><td style="font-family:monospace;text-align:right">NT$ ${Number(os.total||0).toLocaleString('zh-TW')}</td></tr>
      </table>
    </div>
  </div>

  ${os.notes?`<div class="notes-box"><div class="notes-label">備註 / 特殊需求</div><div style="font-size:12px;color:#555;line-height:1.6;white-space:pre-wrap;">${os.notes}</div></div>`:''}
  ${poNote?`<div class="notes-box" style="margin-top:10px"><div class="notes-label">採購備注</div><div style="font-size:12px;color:#555;line-height:1.6;white-space:pre-wrap;">${poNote}</div></div>`:''}
  ${os.quote_file_url?`<div class="nas-box">📄 廠商報價檔案路徑：<strong>${os.quote_file_url}</strong></div>`:''}

  <div class="stamp-area">
    ${allPoSigns.map((s,i)=>stampBoxOS(s,i)).join('')}
  </div>

  <div class="footer">
    <span>此採購單由 ProjectERP 系統產生</span>
    <span>列印日期：${new Date().toLocaleDateString('zh-TW')}</span>
  </div>
</body></html>`;

  const w=window.open('','_blank','width=820,height=1000,scrollbars=yes');
  if(!w){toast('請允許彈出視窗以列印 PDF','error');return;}
  w.document.write(html);
  w.document.close();
  w.onload=()=>{w.focus();w.print();};
  toast('採購單列印視窗已開啟 ✓','success');
}
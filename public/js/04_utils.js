/**
 * 04_utils.js — 工具函式（Node.js 後端版）
 * NAS/File Picker 相關功能已移至後端 server.js
 */

/** 處理 fmt 相關操作。 */
function fmt(n){return Number(n||0).toLocaleString('zh-TW');}

/** 處理 fmtN 相關操作。 */
function fmtN(n){return Number(n||0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,',');}

/** 處理 today 相關操作。 */
function today(){return new Date().toISOString().split('T')[0];}

/** 處理 addDays 相關操作。 */
function addDays(d,n){const dt=new Date(d);dt.setDate(dt.getDate()+n);return dt.toISOString().split('T')[0];}

/** 處理 escQ 相關操作。 */
function escQ(s){return String(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');}

const PHASES=[
  {key:'pending',label:'待確認',cls:'badge-yellow'},
  {key:'designing',label:'設計中',cls:'badge-purple'},
  {key:'outsourcing',label:'委外中',cls:'badge-blue'},
  {key:'reviewing',label:'待審核',cls:'badge-yellow'},
  {key:'delivering',label:'待交付',cls:'badge-blue'},
  {key:'completed',label:'已完成',cls:'badge-green'},
  {key:'cancelled',label:'已取消',cls:'badge-gray'},
];

const PM=Object.fromEntries(PHASES.map(p=>[p.key,p]));

/** 處理 phBadge 相關操作。 */
function phBadge(p){const m=PM[p]||{label:p,cls:'badge-gray'};return`<span class="badge ${m.cls}">${m.label}</span>`;}

const QSTATUS={
  draft:     {label:'草稿',    cls:'badge-gray'},
  sent:      {label:'已發送',  cls:'badge-blue'},
  accepted:  {label:'已接受',  cls:'badge-green'},
  rejected:  {label:'已拒絕',  cls:'badge-red'},
  expired:   {label:'已過期',  cls:'badge-gray'},
  superseded:{label:'已被取代',cls:'badge-gray'},
};

/** 處理 qsBadge 相關操作。 */
function qsBadge(s){const m=QSTATUS[s]||{label:s,cls:'badge-gray'};return`<span class="badge ${m.cls}">${m.label}</span>`;}

/** 處理 stBadge 相關操作。 */
function stBadge(s){
  const m={unpaid:'badge-yellow 未付款',paid:'badge-green 已付款',overdue:'badge-red 已逾期',pending:'badge-yellow 待確認',confirmed:'badge-blue 已確認',received:'badge-green 已完成',cancelled:'badge-gray 已取消'};
  const v=m[s]||('badge-gray '+s);const[c,l]=v.split(' ');return`<span class="badge ${c}">${l}</span>`;
}

/** 處理 nextNo 相關操作。 */
function nextNo(type,tbl){
  // type: 'PRJ','QT','OS' — read prefix/padding from settings
  const prefix=getSetting('prefix_'+type.toLowerCase(), type);
  const pad=parseInt(getSetting('no_padding','3'))||3;
  const sep=getSetting('no_separator','-');
  const yearFmt=getSetting('no_year_fmt','YYYY');
  const yr=yearFmt==='YYYY'?new Date().getFullYear():
            yearFmt==='YY'?String(new Date().getFullYear()).slice(-2):'';
  const c=q1(`SELECT COUNT(*) as c FROM ${tbl}`)?.c||0;
  const seq=String(c+1).padStart(pad,'0');
  return yr?`${prefix}${sep}${yr}${seq}`:`${prefix}${seq}`;
}

const ACT_TYPES={
  quote:    {icon:'📋', label:'報價單',   color:'var(--accent5)'},
  order:    {icon:'📁', label:'專案訂單', color:'var(--accent)'},
  outsource:{icon:'🏭', label:'採購單',   color:'var(--accent3)'},
  receivable:{icon:'💰',label:'收款',     color:'var(--accent2)'},
  payable:  {icon:'💳', label:'付款',     color:'var(--accent4)'},
  rfq:      {icon:'📝', label:'詢價',     color:'var(--accent5)'},
};

/** 處理 filterActLog 相關操作。 */
function filterActLog(sq,type){
  let rows=q("SELECT * FROM activity_log ORDER BY id DESC");
  if(type) rows=rows.filter(r=>r.type===type);
  if(sq){const s=sq.toLowerCase();rows=rows.filter(r=>['action','ref_no','ref_title','entity','note'].some(f=>String(r[f]||'').toLowerCase().includes(s)));}
  const from=document.getElementById('fact-from')?.value;
  const to=document.getElementById('fact-to')?.value;
  if(from) rows=rows.filter(r=>(r.created_at||'')>=from);
  if(to)   rows=rows.filter(r=>(r.created_at||'').substring(0,10)<=to);
  document.getElementById('act-tbody').innerHTML=renderActRows(rows);
  document.getElementById('act-count').textContent=rows.length+' 筆';
}

/** 處理 filterPft 相關操作。 */
function filterPft(sq){
  let rows=q("SELECT o.id,o.order_no,o.title,c.name as cn,o.date,o.phase,o.total,COALESCE((SELECT SUM(os.total) FROM outsource_orders os WHERE os.order_id=o.id AND os.deleted_at IS NULL),0) as cost FROM orders o LEFT JOIN customers c ON o.customer_id=c.id WHERE o.phase NOT IN('cancelled') AND o.deleted_at IS NULL ORDER BY o.date DESC");
  if(sq){const s=sq.toLowerCase();rows=rows.filter(r=>['order_no','title','cn'].some(f=>String(r[f]||'').toLowerCase().includes(s)));}
  document.getElementById('pft-tbody').innerHTML=renderPftRows(rows);
  document.getElementById('pft-count').textContent=rows.length+' 筆';
}

/** 處理 showProjectPnL 相關操作。 */
function showProjectPnL(orderId){
  _analyticsTab='project';
  const c=document.getElementById('content');
  if(c) c.innerHTML=renderAnalytics();
  setTimeout(()=>{
    const sel=document.getElementById('proj-pnl-select');
    if(sel){sel.value=orderId;renderProjectDetail(orderId);}
  },50);
}

/** 處理 calcSQTax 相關操作。 */
function calcSQTax(){
  const excl=parseFloat(document.getElementById('f-sq-excl')?.value)||0;
  const tax=parseFloat(document.getElementById('f-sq-tax')?.value||'5');
  const el=document.getElementById('f-sq-total');
  if(el)el.value=(Math.round(excl*(1+tax/100)*100)/100).toFixed(2);
}

/** 處理 filterAR 相關操作。 */
function filterAR(sq,st){
  let rows=q("SELECT r.*,o.order_no,o.title,c.name as cn FROM receivables r LEFT JOIN orders o ON r.order_id=o.id LEFT JOIN customers c ON o.customer_id=c.id ORDER BY r.due_date ASC");
  if(st)rows=rows.filter(r=>r.status===st);
  if(sq){const s=sq.toLowerCase();rows=rows.filter(r=>['order_no','title','cn','milestone_name'].some(f=>String(r[f]||'').toLowerCase().includes(s)));}
  document.getElementById('ar-tbody').innerHTML=renderARRows(rows);
  document.getElementById('ar-count').textContent=rows.length+' 筆';
}

/** 處理 showEditAR 相關操作。 */
function showEditAR(id,amount,dueDate,name,orderId){
  openModal('編輯應收帳款',
    `<div class="form-row"><label>里程碑名稱</label><input type="text" id="f-msname" value="${escQ(name||'')}"></div>
    <div class="form-row-2">
      <div class="form-row"><label>金額</label><input type="number" id="f-amount" value="${amount}" step="0.01"></div>
      <div class="form-row"><label>到期日</label><input type="date" id="f-due" value="${dueDate||''}"></div>
    </div>`,
    ()=>{
      const nm=document.getElementById('f-msname').value.trim();
      const amt=parseFloat(document.getElementById('f-amount').value)||0;
      const due=document.getElementById('f-due').value;
      if(!due){toast('請填寫到期日','error');return;}
      exec("UPDATE receivables SET milestone_name=?,amount=?,due_date=? WHERE id=?",[nm||'付款',amt,due,id]);
      toast('應收帳款已更新','success');closeModal();
      if(orderId)showOrderDetail(orderId);else go(cur);
    });
}

/** 處理 filterAP 相關操作。 */
function filterAP(sq,st){
  let rows=q("SELECT p.*,os.os_no,os.description,s.name as sn FROM payables p LEFT JOIN outsource_orders os ON p.os_id=os.id LEFT JOIN suppliers s ON os.supplier_id=s.id ORDER BY p.due_date ASC");
  if(st)rows=rows.filter(r=>r.status===st);
  if(sq){const s=sq.toLowerCase();rows=rows.filter(r=>['os_no','sn','description'].some(f=>String(r[f]||'').toLowerCase().includes(s)));}
  document.getElementById('ap-tbody').innerHTML=renderAPRows(rows);
  document.getElementById('ap-count').textContent=rows.length+' 筆';
}

/** 處理 showEditAP 相關操作。 */
function showEditAP(id,amount,dueDate){
  openModal('編輯應付帳款',
    `<div class="form-row-2">
      <div class="form-row"><label>金額</label><input type="number" id="f-amount" value="${amount}" step="0.01"></div>
      <div class="form-row"><label>到期日</label><input type="date" id="f-due" value="${dueDate||''}"></div>
    </div>`,
    ()=>{
      const amt=parseFloat(document.getElementById('f-amount').value)||0;
      const due=document.getElementById('f-due').value;
      if(!due){toast('請填寫到期日','error');return;}
      exec("UPDATE payables SET amount=?,due_date=? WHERE id=?",[amt,due,id]);
      toast('應付帳款已更新','success');closeModal();go(cur);
    });
}

/** 處理 fTbl 相關操作。 */
function fTbl(sq,tid,dfn,rfn,fields,cid,unit){
  let rows=dfn();
  if(sq){const s=sq.toLowerCase();rows=rows.filter(r=>fields.some(f=>String(r[f]||'').toLowerCase().includes(s)));}
  document.getElementById(tid).innerHTML=rfn(rows);
  document.getElementById(cid).textContent=rows.length+' '+unit;
}

/** 處理 refreshSvcDatalist 相關操作。 */
function refreshSvcDatalist(){
  // Always remove & recreate so edits pick up latest _svcs
  const old=document.getElementById('svc-list');
  if(old)old.remove();
  if(!_svcs.length)return;
  const dl=document.createElement('datalist');
  dl.id='svc-list';
  _svcs.forEach(s=>{const o=document.createElement('option');o.value=s.name;o.label='$'+Number(s.default_price||0).toLocaleString('zh-TW')+'／'+s.unit;dl.appendChild(o);});
  document.body.appendChild(dl);
}

/** 處理 addMSRow 相關操作。 */
function addMSRow(){
  const c=document.getElementById('ms-inputs');if(!c)return;
  const d=document.createElement('div');
  d.style.cssText='display:grid;grid-template-columns:1fr 110px 110px 22px;gap:5px;align-items:center;margin-bottom:5px';
  d.innerHTML=`<input type="text" class="ms-name" placeholder="里程碑名稱（訂金、尾款...）" style="padding:6px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;font-family:'Noto Sans TC',sans-serif;outline:none">
  <input type="number" class="ms-amount" placeholder="金額" step="0.01" style="padding:6px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;font-family:'Noto Sans TC',sans-serif;outline:none">
  <input type="date" class="ms-due" value="${addDays(today(),30)}" style="padding:6px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;font-family:'Noto Sans TC',sans-serif;outline:none">
  <button class="rm-btn" onclick="this.parentElement.remove()">✕</button>`;
  c.appendChild(d);
}

/** 下載 DB 備份（呼叫後端 /api/export） */
function exportDB(){
  window.open('/api/export','_blank');
  toast('備份下載已開始 ✓','success');
}

/** 取得所有串聯刪除語句 */
function getCascadingDeletes(table, id) {
  let stmts = [];
  if (table === 'orders') {
    stmts.push({ sql: `DELETE FROM receivables WHERE order_id=?`, params: [id] });
    stmts.push({ sql: `DELETE FROM order_items WHERE order_id=?`, params: [id] });
    stmts.push({ sql: `DELETE FROM order_notes WHERE order_id=?`, params: [id] });
    stmts.push({ sql: `DELETE FROM phase_log WHERE order_id=?`, params: [id] });
    const osIds = q(`SELECT id FROM outsource_orders WHERE order_id=?`, [id]).map(r=>r.id);
    osIds.forEach(osId => {
      stmts.push({ sql: `DELETE FROM payables WHERE os_id=?`, params: [osId] });
      stmts.push({ sql: `DELETE FROM os_items WHERE os_id=?`, params: [osId] });
      stmts.push({ sql: `DELETE FROM outsource_orders WHERE id=?`, params: [osId] });
    });
    const rfqIds = q(`SELECT id FROM rfqs WHERE order_id=?`, [id]).map(r=>r.id);
    rfqIds.forEach(rfqId => {
      stmts.push({ sql: `DELETE FROM supplier_quotes WHERE rfq_id=?`, params: [rfqId] });
      stmts.push({ sql: `DELETE FROM rfq_suppliers WHERE rfq_id=?`, params: [rfqId] });
      stmts.push({ sql: `DELETE FROM rfqs WHERE id=?`, params: [rfqId] });
    });
    stmts.push({ sql: `DELETE FROM orders WHERE id=?`, params: [id] });
  } else if (table === 'quotes') {
    stmts.push({ sql: `DELETE FROM quote_items WHERE quote_id=?`, params: [id] });
    stmts.push({ sql: `DELETE FROM quote_history WHERE quote_id=?`, params: [id] });
    stmts.push({ sql: `DELETE FROM quotes WHERE id=?`, params: [id] });
  } else if (table === 'outsource_orders') {
    stmts.push({ sql: `DELETE FROM payables WHERE os_id=?`, params: [id] });
    stmts.push({ sql: `DELETE FROM os_items WHERE os_id=?`, params: [id] });
    stmts.push({ sql: `DELETE FROM outsource_orders WHERE id=?`, params: [id] });
  }
  return stmts;
}

/** 處理 emptyTrash 相關操作。 */
function emptyTrash(){
  confirmDialog('確定要清空整個回收桶嗎？所有資料將永久消失，無法還原。',()=>{
    let stmts = [];
    ['quotes','orders','outsource_orders'].forEach(table => {
      const ids = q(`SELECT id FROM ${table} WHERE deleted_at IS NOT NULL`).map(r=>r.id);
      ids.forEach(id => {
        stmts = stmts.concat(getCascadingDeletes(table, id));
      });
    });
    if (stmts.length > 0) execBatch(stmts);
    toast('回收桶已清空','success');go(cur);
  });
}

/** 處理 restoreFromTrash 相關操作。 */
function restoreFromTrash(table,id){
  exec('UPDATE '+table+' SET deleted_at=NULL WHERE id=?',[id]);
  toast('已還原','success');go(cur);
}

/** 處理 setSetting 相關操作。 */
function setSetting(key,value){exec("INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)",[key,String(value)]);}

/** 處理 switchSettingsTab 相關操作。 */
function switchSettingsTab(id){
  window._settingsTab=id;
  document.querySelectorAll('.s-tab').forEach(el=>{
    el.classList.toggle('active',el.onclick&&el.onclick.toString().includes("'"+id+"'"));
  });
  document.querySelectorAll('.s-panel').forEach(el=>{
    el.classList.toggle('active',el.id==='stab-'+id);
  });
  if(id==='numbering')setTimeout(updateNoPreview,50);
}

/** 處理 loadSignatureImg 相關操作。 */
function loadSignatureImg(input){
  const file=input.files[0];
  if(!file)return;
  if(file.size>200*1024){toast('圖片過大，請使用 200KB 以下的圖片','error');return;}
  const reader=new FileReader();
  reader.onload=e=>{
    const data=e.target.result;
    setSetting('pdf_signature',data);
    const prev=document.getElementById('sig-preview');
    if(prev){prev.outerHTML='<img src="'+data+'" class="sig-img" id="sig-preview">';}
    toast('簽名圖片已上傳並儲存 ✓','success');
  };
  reader.readAsDataURL(file);
}

/** 處理 clearSignature 相關操作。 */
function clearSignature(){
  confirmDialog('確定清除簽名圖片嗎？',()=>{
    setSetting('pdf_signature','');
    const prev=document.getElementById('sig-preview');
    if(prev){prev.outerHTML='<div id="sig-preview" style="font-size:11px;color:var(--text3)">尚未上傳簽名圖片</div>';}
    toast('簽名已清除','success');
  });
}

/** 處理 initTheme 相關操作。 */
function initTheme(){
  const t=getSetting('ui_theme','default');
  if(t&&t!=='default')document.documentElement.setAttribute('data-theme',t);
}

/** 處理 updateNoPreview 相關操作。 */
function updateNoPreview(){
  const el=document.getElementById('no-preview');
  if(!el)return;
  const qtEx=nextNo('QT','quotes');
  const prjEx=nextNo('PRJ','orders');
  const osEx=nextNo('OS','outsource_orders');
  el.textContent=qtEx+' / '+prjEx+' / '+osEx;
}

/** 處理 applyUserSettings 相關操作。 */
function applyUserSettings(){
  const name=getSetting('user_name','王小明');
  const role=getSetting('user_role','負責人');
  const nameEl=document.querySelector('.user-name');
  const roleEl=document.querySelector('.user-role');
  const avatarEl=document.querySelector('.avatar');
  const previewEl=document.getElementById('avatar-preview');
  if(nameEl)nameEl.textContent=name;
  if(roleEl)roleEl.textContent=role;
  if(avatarEl)avatarEl.textContent=(name||'王')[0];
  if(previewEl)previewEl.textContent=(name||'王')[0];
}

const DB_CLEAR_ORDER = [
  'activity_log', 'phase_log', 'quote_history', 'quote_items', 
  'order_notes', 'order_items', 'receivables', 'payables', 'os_items',
  'supplier_quotes', 'rfq_suppliers', 'rfqs',
  'outsource_orders', 'orders', 'quotes', 
  'services', 'suppliers', 'customers'
];

/** 處理 confirmWipeEverything 相關操作。 */
function confirmWipeEverything(){
  openDangerModal(
    '刪除所有資料，讓系統完全為空',
    '此操作將刪除資料庫中<strong>所有</strong>交易明細、基本資料，以及系統設定。<br><br>系統將徹底清空，且重啟伺服器後不會重建範本資料。<br>所有真實資料將永久消失，無法還原。',
    'WIPE-ALL',
    ()=>{
      execBatch([...DB_CLEAR_ORDER, 'settings'].map(t=>({sql:`DELETE FROM ${t}`})));
      setSetting('wiped', '1');
      applyUserSettings();
      toast('系統已完全清空','success');closeModal();go('settings');
    }
  );
}

/** 處理 confirmClearAll 相關操作。 */
function confirmClearAll(){
  openDangerModal(
    '刪除所有資料，但保留設定',
    '此操作將刪除資料庫中<strong>所有</strong>交易記錄與基本資料。系統設定（公司資訊、預設值）將保留不受影響。<br><br>建議執行前先匯出 DB 備份。',
    'CLEAR-DATA',
    ()=>{
      execBatch(DB_CLEAR_ORDER.map(t=>({sql:`DELETE FROM ${t}`})));
      toast('所有業務與基本資料已清除，設定已保留','success');closeModal();go('settings');
    }
  );
}

/** 處理 confirmFullReset 相關操作。 */
function confirmFullReset(){
  openDangerModal(
    '回復到原廠保留範例資料的狀態',
    '此操作將清除<strong>所有資料與設定</strong>，然後重新載入系統範例資料。等同於全新安裝。<br><br>所有真實資料將永久消失，無法還原。',
    'FULL-RESET',
    ()=>{
      execBatch([...DB_CLEAR_ORDER, 'settings'].map(t=>({sql:`DELETE FROM ${t}`})));
      seedData();
      toast('系統已完整重置，範例資料已重新載入','success');closeModal();go('dashboard');
    }
  );
}

/** 處理 openDangerModal 相關操作。 */
function openDangerModal(title,desc,confirmWord,onConfirm){
  openModal(title,
    `<div class="confirm-box" style="border-color:rgba(247,110,110,.3)">
      <div class="confirm-msg">${desc}</div>
    </div>
    <div class="confirm-input-wrap">
      <label>請輸入 <span style="font-family:'DM Mono',monospace;color:var(--accent4);background:rgba(247,110,110,.08);padding:1px 6px;border-radius:4px">${confirmWord}</span> 以確認操作</label>
      <input type="text" id="danger-confirm-input" placeholder="輸入確認碼..." autocomplete="off">
    </div>`,
    ()=>{
      const val=document.getElementById('danger-confirm-input')?.value?.trim();
      if(val!==confirmWord){toast('確認碼錯誤，操作已取消','error');return;}
      onConfirm();
    }
  );
  const btn=document.getElementById('modal-save');
  btn.textContent='確認執行';btn.className='btn btn-danger';
}

// autoSaveWithBackup / setupAutoSaveFile / saveToNAS / importDB 等函式
// 已移至後端 server.js，前端不再需要。

// --- 以下保留結尾空行供後續函式使用 ---

/** (已移除) autoSaveWithBackup */
async function autoSaveWithBackup(){
  // 已移至後端 server.js
}

/** 處理 seedData 相關操作。 */
function seedData(){
  const d=(n=0)=>{const dt=new Date();dt.setDate(dt.getDate()+n);return dt.toISOString().split('T')[0];};
  exec("INSERT INTO customers(name,phone,email,address,notes) VALUES('台灣精機股份有限公司','02-2345-6789','eng@twcnc.com','台北市內湖區','CNC零件設計圖'),('明洋工業有限公司','04-2234-5678','buy@mingyang.com','台中市工業區','客製化鈑金'),('綠能科技','03-5566-7788','rd@green.com','新竹市','PCB設計'),('捷鑄模具','06-2345-6789','mold@jetcast.com','台南市','模具開發'),('晶順電子','07-3344-5566','po@cs-elec.com','高雄市','電子組裝')");
  exec("INSERT INTO suppliers(name,phone,email,contact,specialty,notes) VALUES('廣達精密加工','04-2233-4455','cnc@guangda.com','陳師傅','CNC車床','最快交期3天'),('鴻源鈑金','02-7788-9900','sheet@hongyuan.com','林業務','鈑金成形','最小100件'),('台中3D列印','04-3344-5566','print@tc3d.com','王工','SLA/FDM',''),('科技PCB','03-4455-6677','pcb@techpcb.com','陳業務','PCB製作',''),('智能設計','02-5566-7788','design@smart.com','李工','CAD/機構','可NDA')");
  exec("INSERT INTO services(name,category,unit,default_price,notes) VALUES('機械零件設計圖（2D）','設計','張',8000,'含DWG'),('機械零件設計圖（3D）','設計','件',15000,'含STEP'),('模具設計','設計','套',45000,''),('電路板設計（PCB）','設計','層',20000,'雙層起'),('設計修改','設計','小時',1500,'按工時計'),('CNC加工件','加工','件',5000,'依複雜度'),('鈑金加工','加工','件',3000,'含折彎'),('3D列印樣品','加工','件',2000,'含後處理'),('顧問服務','顧問','小時',2500,''),('規格書撰寫','文件','份',8000,'')");

  // Quote → accepted (with history)
  exec("INSERT INTO quotes(quote_no,customer_id,title,date,valid_until,status,version,total_excl,tax_rate,tax_amount,total) VALUES('QT-2026001',1,'鋁合金支架設計報價','"+d(-35)+"','"+d(-5)+"','accepted',1,47619,5,2381,50000)");
  const qid=lastId();
  exec("INSERT INTO quote_items(quote_id,description,qty,unit,unit_price) VALUES(?,?,?,?,?)",[qid,'機械零件設計圖（2D）',2,'張',15000]);
  exec("INSERT INTO quote_items(quote_id,description,qty,unit,unit_price) VALUES(?,?,?,?,?)",[qid,'規格書撰寫',1,'份',8000]);
  // Seed a revision (v2) of QT-2026001
  exec("INSERT INTO quotes(quote_no,customer_id,title,date,valid_until,status,version,parent_quote_id,total_excl,tax_rate,tax_amount,total) VALUES('QT-2026001-v2',1,'鋁合金支架設計報價（含 3D 加購）','"+d(-28)+"','"+d(-3)+"','accepted',2,"+qid+",61905,5,3095,65000)");
  const qid2=lastId();
  exec("INSERT INTO quote_items(quote_id,description,qty,unit,unit_price) VALUES(?,?,?,?,?)",[qid2,'機械零件設計圖（2D）',2,'張',15000]);
  exec("INSERT INTO quote_items(quote_id,description,qty,unit,unit_price) VALUES(?,?,?,?,?)",[qid2,'機械零件設計圖（3D）',1,'件',15000]);
  exec("INSERT INTO quote_items(quote_id,description,qty,unit,unit_price) VALUES(?,?,?,?,?)",[qid2,'規格書撰寫',1,'份',8000]);
  // Draft sent quote
  exec("INSERT INTO quotes(quote_no,customer_id,title,date,valid_until,status,version,total_excl,tax_rate,tax_amount,total) VALUES('QT-2026002',3,'馬達驅動板 PCB 設計報價','"+d(-3)+"','"+d(27)+"','sent',1,38095,5,1905,40000)");

  // Orders
  const orders=[
    {title:'鋁合金支架設計圖',cid:1,qid:qid2,date:d(-30),due:d(5),phase:'delivering',excl:61905,tax:3095,tot:65000,delivs:[{text:'2D圖(DWG)',done:true},{text:'3D模型(STEP)',done:true},{text:'規格書(PDF)',done:false}],ms:[{n:'訂金 30%',a:19500,d:d(-28)},{n:'尾款 70%',a:45500,d:d(10)}],msPaid:[true,false]},
    {title:'控制箱鈑金外殼',cid:2,qid:null,date:d(-15),due:d(15),phase:'outsourcing',excl:28571,tax:1429,tot:30000,delivs:[{text:'鈑金圖(DWG)',done:true},{text:'加工件',done:false}],ms:[{n:'全額付款',a:30000,d:d(15)}],msPaid:[false]},
    {title:'精密模具開發',cid:4,qid:null,date:d(-45),due:d(-5),phase:'completed',excl:85714,tax:4286,tot:90000,delivs:[],ms:[{n:'訂金 30%',a:27000,d:d(-40)},{n:'完工款 70%',a:63000,d:d(-6)}],msPaid:[true,true]},
    {title:'自動化結構顧問',cid:5,qid:null,date:d(-10),due:d(20),phase:'reviewing',excl:23810,tax:1190,tot:25000,delivs:[{text:'顧問報告',done:true}],ms:[{n:'全額付款',a:25000,d:d(20)}],msPaid:[false]},
  ];
  orders.forEach(o=>{
    exec("INSERT INTO orders(order_no,quote_id,customer_id,title,date,due_date,phase,status,total_excl,tax_rate,tax_amount,total,deliverables) VALUES(?,?,?,?,?,?,?,?,?,5,?,?,?)",
      [nextNo('PRJ','orders'),o.qid||null,o.cid,o.title,o.date,o.due,o.phase,(o.phase==='completed'?'completed':'active'),o.excl,o.tax,o.tot,JSON.stringify(o.delivs)]);
    const oid=lastId();
    o.ms.forEach((m,i)=>{
      exec("INSERT INTO receivables(order_id,milestone_name,amount,due_date,status,paid_date) VALUES(?,?,?,?,?,?)",
        [oid,m.n,m.a,m.d,o.msPaid[i]?'paid':'unpaid',o.msPaid[i]?o.date:null]);
    });
  });

  // Link converted_order_id and seed quote history
  const prj1=q1("SELECT id FROM orders WHERE title='鋁合金支架設計圖'")?.id;
  if(prj1){
    exec("UPDATE quotes SET converted_order_id=?,converted_at=datetime('now','localtime') WHERE id=?",[prj1,qid2]);
    logQuoteHistory(qid,'created','建立草稿');
    logQuoteHistory(qid,'sent','發送給客戶');
    logQuoteHistory(qid,'revised','客戶要求加購 3D 模型，建立 v2 修訂版');
    logQuoteHistory(qid2,'created','修訂版本建立（繼承自 QT-2026001）');
    logQuoteHistory(qid2,'sent','發送修訂版給客戶');
    logQuoteHistory(qid2,'accepted','客戶接受報價');
    logQuoteHistory(qid2,'converted','轉為專案訂單 '+q1("SELECT order_no FROM orders WHERE id=?",[prj1])?.order_no);
  }
  const qt2=q1("SELECT id FROM quotes WHERE quote_no='QT-2026002'")?.id;
  if(qt2){
    logQuoteHistory(qt2,'created','建立草稿');
    logQuoteHistory(qt2,'sent','發送給客戶，等待回覆');
  }

  // Outsource orders
  const os1=q1("SELECT id FROM orders WHERE title='控制箱鈑金外殼'")?.id;
  const os2=q1("SELECT id FROM orders WHERE title='鋁合金支架設計圖'")?.id;
  if(os1){exec("INSERT INTO outsource_orders(os_no,order_id,supplier_id,date,expected_date,status,total_excl,tax_rate,tax_amount,total,description) VALUES(?,?,?,?,?,'confirmed',9524,5,476,10000,'鈑金折彎加工')",[nextNo('OS','outsource_orders'),os1,2,d(-12),d(10)]);const osid=lastId();exec("INSERT OR IGNORE INTO payables(os_id,amount,due_date,status) VALUES(?,?,?,'unpaid')",[osid,10000,addDays(d(10),30)]);}
  if(os2){exec("INSERT INTO outsource_orders(os_no,order_id,supplier_id,date,expected_date,status,total_excl,tax_rate,tax_amount,total,description) VALUES(?,?,?,?,?,'pending',14286,5,714,15000,'設計外包協助')",[nextNo('OS','outsource_orders'),os2,5,d(-5),d(15)]);const osid=lastId();exec("INSERT OR IGNORE INTO payables(os_id,amount,due_date,status) VALUES(?,?,?,'unpaid')",[osid,15000,addDays(d(15),30)]);}
}

/** 處理 init 相關操作。 */
async function init(){
  try{
    SQL=await initSqlJs({locateFile:f=>'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/'+f});
    db=new SQL.Database();
    db.run(SCHEMA);
    // Migration for old DBs
    ['quotes','quote_items'].forEach(t=>{
      try{db.run(`CREATE TABLE IF NOT EXISTS ${t}(id INTEGER PRIMARY KEY AUTOINCREMENT)`);}catch(e){}
    });
    // New migrations
    const migrations=[
      "ALTER TABLE receivables ADD COLUMN milestone_name TEXT DEFAULT '全額付款'",
      "ALTER TABLE orders ADD COLUMN quote_id INTEGER",
      "ALTER TABLE quotes ADD COLUMN deleted_at TEXT DEFAULT NULL",
      "ALTER TABLE quote_items ADD COLUMN is_subitem INTEGER DEFAULT 0",
      "ALTER TABLE order_items ADD COLUMN is_subitem INTEGER DEFAULT 0",
      "ALTER TABLE quotes ADD COLUMN parent_quote_id INTEGER",
      "ALTER TABLE quotes ADD COLUMN converted_order_id INTEGER",
      "ALTER TABLE quotes ADD COLUMN converted_at TEXT",
      `CREATE TABLE IF NOT EXISTS quote_history(id INTEGER PRIMARY KEY AUTOINCREMENT,quote_id INTEGER,action TEXT NOT NULL,note TEXT,created_at TEXT DEFAULT(datetime('now','localtime')),FOREIGN KEY(quote_id)REFERENCES quotes(id))`,
      "ALTER TABLE orders ADD COLUMN deleted_at TEXT DEFAULT NULL",
      "ALTER TABLE outsource_orders ADD COLUMN deleted_at TEXT DEFAULT NULL",
      "ALTER TABLE outsource_orders ADD COLUMN quote_file_url TEXT",
      "ALTER TABLE outsource_orders ADD COLUMN rfq_id INTEGER",
      `CREATE TABLE IF NOT EXISTS rfqs(id INTEGER PRIMARY KEY AUTOINCREMENT,rfq_no TEXT UNIQUE,order_id INTEGER,description TEXT,specs TEXT,date TEXT,deadline TEXT,status TEXT DEFAULT 'open',notes TEXT,deleted_at TEXT DEFAULT NULL,FOREIGN KEY(order_id)REFERENCES orders(id))`,
      `CREATE TABLE IF NOT EXISTS rfq_suppliers(id INTEGER PRIMARY KEY AUTOINCREMENT,rfq_id INTEGER,supplier_id INTEGER,FOREIGN KEY(rfq_id)REFERENCES rfqs(id),FOREIGN KEY(supplier_id)REFERENCES suppliers(id))`,
      `CREATE TABLE IF NOT EXISTS supplier_quotes(id INTEGER PRIMARY KEY AUTOINCREMENT,rfq_id INTEGER,supplier_id INTEGER,received_date TEXT,total_excl REAL DEFAULT 0,tax_rate REAL DEFAULT 5,tax_amount REAL DEFAULT 0,total REAL DEFAULT 0,lead_time_days INTEGER,file_url TEXT,notes TEXT,selected INTEGER DEFAULT 0,FOREIGN KEY(rfq_id)REFERENCES rfqs(id),FOREIGN KEY(supplier_id)REFERENCES suppliers(id))`,
      `CREATE TABLE IF NOT EXISTS activity_log(id INTEGER PRIMARY KEY AUTOINCREMENT,type TEXT NOT NULL,action TEXT NOT NULL,ref_id INTEGER,ref_no TEXT,ref_title TEXT,amount REAL,entity TEXT,note TEXT,created_at TEXT DEFAULT(datetime('now','localtime')))`,
      `CREATE TABLE IF NOT EXISTS phase_log(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER,phase TEXT NOT NULL,entered_at TEXT DEFAULT(datetime('now','localtime')),note TEXT,FOREIGN KEY(order_id)REFERENCES orders(id))`,
      "ALTER TABLE quotes ADD COLUMN version INTEGER DEFAULT 1",
      "ALTER TABLE quotes ADD COLUMN superseded_note TEXT",
      "ALTER TABLE customers ADD COLUMN contact_person TEXT",
      "ALTER TABLE customers ADD COLUMN job_title TEXT",
      "ALTER TABLE customers ADD COLUMN tax_id TEXT",
      "ALTER TABLE suppliers ADD COLUMN tax_id TEXT",
    ];
    migrations.forEach(sql=>{try{db.run(sql);}catch(e){}});
    const check=q1("SELECT COUNT(*) as c FROM customers");
    if(!check||check.c===0)seedData();
    applyUserSettings();
    initTheme();
    document.getElementById('loading').classList.remove('show');
    go('dashboard');
  }catch(e){document.querySelector('.loading-text').textContent='載入失敗：'+e.message;}
}

init();
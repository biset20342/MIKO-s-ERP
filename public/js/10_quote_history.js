/**
 * 10_quote_history.js — 自動分拆模組
 * 對外暴露：...
 * 依賴：...
 */

const QH_ACTIONS={
  created:  {icon:'✏️', label:'建立草稿',    cls:'badge-gray'},
  sent:     {icon:'📤', label:'已發送給客戶', cls:'badge-blue'},
  accepted: {icon:'✅', label:'客戶接受',    cls:'badge-green'},
  rejected: {icon:'❌', label:'客戶拒絕',    cls:'badge-red'},
  revised:  {icon:'🔄', label:'建立修訂版',  cls:'badge-purple'},
  superseded:{icon:'📦',label:'被新版本取代',cls:'badge-gray'},
  converted:{icon:'📁', label:'轉為專案訂單',cls:'badge-green'},
  expired:  {icon:'⏰', label:'逾期',        cls:'badge-yellow'},
  edited:   {icon:'✍️', label:'編輯內容',    cls:'badge-gray'},
};

/** 處理 logQuoteHistory 相關操作。 */
function logQuoteHistory(quoteId, action, note=''){
  exec("INSERT INTO quote_history(quote_id,action,note) VALUES(?,?,?)",[quoteId,action,note||'']);
}

/** 處理 qhBadge 相關操作。 */
function qhBadge(action){
  const m=QH_ACTIONS[action]||{icon:'•',label:action,cls:'badge-gray'};
  return '<span class="badge '+m.cls+'">'+m.icon+' '+m.label+'</span>';
}

/** 處理 reviseQuote 相關操作。 */
function reviseQuote(id){
  const q2=q1("SELECT * FROM quotes WHERE id=?",[id]);
  const items=q("SELECT * FROM quote_items WHERE quote_id=?",[id]);
  if(!q2){toast('找不到報價單','error');return;}
  // Find max version in this chain
  const root=q2.parent_quote_id||id;
  const maxVer=q1("SELECT MAX(version) as v FROM quotes WHERE id=? OR parent_quote_id=?",[root,root])?.v||q2.version;
  const newVer=maxVer+1;
  // Strip any existing -vN suffix and append new version
  const baseNo=q2.quote_no.replace(/-v\d+$/,'');
  const newNo=baseNo+'-v'+newVer;
  const defValid=parseInt(getSetting('default_quote_valid_days','30'));
  exec("INSERT INTO quotes(quote_no,customer_id,title,date,valid_until,status,version,parent_quote_id,total_excl,tax_rate,tax_amount,total,notes) VALUES(?,?,?,?,?,'draft',?,?,?,?,?,?,?)",
    [newNo,q2.customer_id,q2.title,today(),addDays(today(),defValid),newVer,root,q2.total_excl,q2.tax_rate,q2.tax_amount,q2.total,q2.notes]);
  const newId=lastId();
  items.forEach(i=>exec("INSERT INTO quote_items(quote_id,service_id,description,qty,unit,unit_price) VALUES(?,?,?,?,?,?)",[newId,i.service_id,i.description,i.qty,i.unit,i.unit_price]));
  // Mark THIS quote as superseded (it has been replaced by the new revision)
  exec("UPDATE quotes SET status='superseded' WHERE id=?",[id]);
  logQuoteHistory(id,'superseded','已被修訂版本 '+newNo+' 取代');
  logQuoteHistory(newId,'created','修訂版本建立（繼承自 '+q2.quote_no+'）');
  logQuoteHistory(id,'revised','建立修訂版本 '+newNo+' (v'+newVer+')');
  toast('修訂版 '+newNo+' 已建立（草稿），舊版已收納','success');
  closeModal();
  // Open edit immediately
  setTimeout(()=>{
    _custs=q("SELECT id,name FROM customers ORDER BY name");
    _svcs=q("SELECT id,name,unit,default_price,category FROM services ORDER BY category,name");
    showEditQuote(newId);
  },100);
  go(cur);
}

/** 處理 renderQuoteHistory 相關操作。 */
function renderQuoteHistory(){
  const s=getSort('quote_history','date');
  const all=q(`SELECT q.*,c.name as cn,
    (SELECT COUNT(*) FROM quote_history qh WHERE qh.quote_id=q.id) as hist_count,
    (SELECT order_no FROM orders WHERE id=q.converted_order_id) as linked_order_no
    FROM quotes q LEFT JOIN customers c ON q.customer_id=c.id
    WHERE q.deleted_at IS NULL
    ORDER BY COALESCE(q.parent_quote_id,q.id) ASC, q.version ASC, q.id ASC`);

  const total=all.length;
  const accepted=all.filter(r=>r.status==='accepted').length;
  const rejected=all.filter(r=>r.status==='rejected').length;
  const converted=all.filter(r=>r.converted_order_id).length;

  // Chain groups
  const groups={};
  all.forEach(q2=>{
    const root=q2.parent_quote_id||q2.id;
    if(!groups[root])groups[root]=[];
    groups[root].push(q2);
  });

  let cards='';
  Object.values(groups).forEach(chain=>{
    cards+=buildChainCard(chain);
  });

  return '<div class="stat-mini-grid">'+
    '<div class="stat-mini"><div class="stat-mini-label">總報價單</div><div class="stat-mini-val" style="color:var(--accent5)">'+total+'</div></div>'+
    '<div class="stat-mini"><div class="stat-mini-label">客戶接受</div><div class="stat-mini-val" style="color:var(--accent2)">'+accepted+'</div></div>'+
    '<div class="stat-mini"><div class="stat-mini-label">已轉訂單</div><div class="stat-mini-val" style="color:var(--accent)">'+converted+'</div></div>'+
    '<div class="stat-mini"><div class="stat-mini-label">客戶拒絕</div><div class="stat-mini-val" style="color:var(--accent4)">'+rejected+'</div></div>'+
  '</div>'+
  '<div class="panel"><div class="panel-header">'+
    '<div class="panel-title">報價歷史 <span style="font-size:11px;color:var(--text3);font-weight:400">含修訂鏈、活動紀錄</span></div>'+
    '<button class="btn btn-ghost btn-sm" onclick="exportQuoteHistoryCSV()">↓ CSV</button>'+
  '</div>'+
  '<div class="filter-bar">'+
    '<input type="text" id="fqh" placeholder="搜尋報價單號、標題、客戶..." oninput="filterQH(this.value,document.getElementById(\'fqhst\').value)">'+
    '<select id="fqhst" onchange="filterQH(document.getElementById(\'fqh\').value,this.value)">'+
      '<option value="">全部狀態</option>'+
      '<option value="draft">草稿</option><option value="sent">已發送</option>'+
      '<option value="accepted">已接受</option><option value="rejected">已拒絕</option>'+
    '</select>'+
    '<span class="filter-count" id="qh-count">'+total+' 筆</span>'+
  '</div>'+
  '<div id="qh-cards" style="display:flex;flex-direction:column;gap:8px;padding:4px 0">'+cards+'</div>'+
  '</div>';
}

/** 處理 buildChainCard 相關操作。 */
function buildChainCard(chain){
  // Main row = chain[0], children = chain.slice(1)
  const root=chain[0];
  const isConverted=!!root.converted_order_id;
  const hasChildren=chain.length>1;
  const cardId='qhc-'+root.id;

  function quoteRow(qr,indent){
    const hist=q("SELECT * FROM quote_history WHERE quote_id=? ORDER BY id ASC",[qr.id]);
    const lastAct=hist[hist.length-1];
    const isConv=!!qr.converted_order_id;
    const m=lastAct?(QH_ACTIONS[lastAct.action]||{icon:'•',label:lastAct.action,cls:'badge-gray'}):null;
    return '<div style="display:flex;align-items:center;gap:10px;padding:'+(indent?'7px 12px 7px 28px':'10px 12px')+';'+(indent?'border-top:1px solid var(--border);background:rgba(179,136,255,.03)':'')+'">'+
      (indent?'<span style="color:var(--text3);font-size:11px">└</span>':'')+
      '<div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px">'+
        '<span class="td-mono" style="color:var(--accent5);font-size:12.5px;cursor:pointer;flex-shrink:0" onclick="showQuoteDetail('+qr.id+')">'+qr.quote_no+'</span>'+
        (qr.version>1?'<span class="badge badge-purple" style="font-size:9px">v'+qr.version+'</span>':'')+
        '<span style="color:var(--text2);font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(qr.title||'—')+'</span>'+
      '</div>'+
      '<span style="color:var(--text3);font-size:11.5px;flex-shrink:0">'+(qr.cn||'—')+'</span>'+
      '<span class="td-mono" style="color:var(--text3);font-size:11px;flex-shrink:0">'+(qr.date||'')+'</span>'+
      '<span class="td-mono" style="font-size:12px;flex-shrink:0">$'+fmt(qr.total)+'</span>'+
      qsBadge(qr.status)+
      (isConv?'<span class="badge badge-teal" style="flex-shrink:0">→'+qr.linked_order_no+'</span>':'')+
      (m?'<span class="badge '+m.cls+'" style="font-size:10px;flex-shrink:0">'+m.icon+' '+m.label+'</span>':'')+
      '<div class="td-actions" style="flex-shrink:0">'+
        '<button class="btn btn-sm btn-ghost" onclick="showQuoteDetail('+qr.id+')">詳情</button>'+
        '<button class="btn btn-sm btn-ghost" onclick="printQuotePDF('+qr.id+')" title="PDF">📄</button>'+
      '</div>'+
    '</div>';
  }

  let out='<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden">';
  out+=quoteRow(root,false);
  if(hasChildren){
    chain.slice(1).forEach(child=>{out+=quoteRow(child,true);});
  }
  out+='</div>';
  return out;
}

/** 處理 filterQH 相關操作。 */
function filterQH(sq,st){
  const all=q(`SELECT q.*,c.name as cn,
    (SELECT COUNT(*) FROM quote_history qh WHERE qh.quote_id=q.id) as hist_count,
    (SELECT order_no FROM orders WHERE id=q.converted_order_id) as linked_order_no
    FROM quotes q LEFT JOIN customers c ON q.customer_id=c.id
    WHERE q.deleted_at IS NULL
    ORDER BY COALESCE(q.parent_quote_id,q.id) ASC, q.version ASC, q.id ASC`);

  let filtered=all;
  if(st) filtered=filtered.filter(r=>r.status===st);
  if(sq){const s=sq.toLowerCase();filtered=filtered.filter(r=>['quote_no','title','cn'].some(f=>String(r[f]||'').toLowerCase().includes(s)));}

  // Rebuild groups with only matching quotes
  const matchIds=new Set(filtered.map(r=>r.id));
  const groups={};
  all.forEach(q2=>{
    const root=q2.parent_quote_id||q2.id;
    // Include chain if any member matches
    const chainAll=all.filter(r=>(r.parent_quote_id||r.id)===root);
    const chainMatches=chainAll.some(r=>matchIds.has(r.id));
    if(chainMatches){
      if(!groups[root])groups[root]=[];
      groups[root].push(q2);
    }
  });

  let cards='';
  Object.values(groups).forEach(chain=>{cards+=buildChainCard(chain);});

  const el=document.getElementById('qh-cards');
  if(el)el.innerHTML=cards;
  const cnt=document.getElementById('qh-count');
  if(cnt)cnt.textContent=filtered.length+' 筆';
}
/**
 * 11_orders.js — 自動分拆模組
 * 對外暴露：...
 * 依賴：...
 */

/** 處理 renderOrders 相關操作。 */
function renderOrders(){
  const s=getSort('orders','date');
  let rows=q("SELECT o.*,c.name as cn FROM orders o LEFT JOIN customers c ON o.customer_id=c.id WHERE o.deleted_at IS NULL ORDER BY o.date DESC");
  rows=sortArr(rows,s.col==='cn'?'cn':s.col,s.dir);
  return `<div class="panel"><div class="panel-header"><div class="panel-title">專案訂單</div><button class="btn btn-ghost btn-sm" onclick="exportOrdersCSV()">↓ CSV</button></div>
  <div class="filter-bar">
    <input type="text" id="fo" placeholder="搜尋編號、標題、客戶..." oninput="filterOrd(this.value,document.getElementById('foph').value)">
    <select id="foph" onchange="filterOrd(document.getElementById('fo').value,this.value)">
      <option value="">全部階段</option>${PHASES.map(p=>`<option value="${p.key}">${p.label}</option>`).join('')}
    </select>
    <span class="filter-count" id="ord-count">${rows.length} 筆</span>
  </div>
  <table><thead><tr>${sth('orders','order_no','專案號')}${sth('orders','title','標題')}${sth('orders','cn','客戶')}${sth('orders','due_date','截止日')}${sth('orders','total','含稅金額')}<th>已收/應收</th><th>階段</th><th>操作</th></tr></thead>
  <tbody id="ord-tbody">${renderOrdRows(rows)}</tbody></table></div>`;
}

/** 處理 renderOrdRows 相關操作。 */
function renderOrdRows(rows){
  return rows.map(o=>{
    const active=o.phase!=='completed'&&o.phase!=='cancelled';
    const over=o.due_date&&o.due_date<today()&&active;
    const paid=q1("SELECT SUM(amount) as v FROM receivables WHERE order_id=? AND status='paid'",[o.id])?.v||0;
    const paidPct=o.total>0?Math.round(paid/o.total*100):0;
    return `<tr>
    <td class="td-mono td-main">${o.order_no}</td>
    <td class="td-main" style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.title||'—'}</td>
    <td>${o.cn||'—'}</td>
    <td class="td-mono"${over?' style="color:var(--accent4)"':''}>${o.due_date||'—'}</td>
    <td class="td-mono">$${fmt(o.total)}</td>
    <td><div style="display:flex;align-items:center;gap:6px"><div style="width:40px;height:4px;background:var(--surface2);border-radius:2px;overflow:hidden"><div style="width:${paidPct}%;height:100%;background:var(--accent2)"></div></div><span class="td-mono" style="font-size:11px;color:var(--accent2)">${paidPct}%</span></div></td>
    <td id="ph-badge-${o.id}">${phBadge(o.phase)}</td>
    <td><div class="td-actions">
      <button class="btn btn-sm btn-ghost" onclick="showOrderDetail(${o.id})">詳情</button>
      ${active?`<button class="btn btn-sm btn-ghost" onclick="showEditOrder(${o.id})">編輯</button>`:''}
      ${active?`<button class="btn btn-sm btn-warning" onclick="cancelOrder(${o.id})">取消</button>`:''}
      ${o.phase==='cancelled'?`<button class="btn btn-sm btn-success" onclick="reactivateOrder(${o.id})">重新啟用</button>`:''}
      <button class="btn btn-sm btn-danger" onclick="softDelete('orders',${o.id},'${o.order_no}')">🗑️</button>
    </div></td></tr>`;
  }).join('');
}

/** 處理 cancelOrder 相關操作。 */
function cancelOrder(id){
  confirmDialog('確定要取消此專案嗎？取消後可透過「重新啟用」恢復。',()=>{
    const prevPhase=q1("SELECT phase FROM orders WHERE id=?",[id])?.phase||'pending';
    exec("UPDATE orders SET phase='cancelled' WHERE id=?",[id]);
    // Log the cancellation with previous phase stored in note for restoration
    exec("INSERT INTO phase_log(order_id,phase,entered_at,note) VALUES(?,?,datetime('now','localtime'),?)",[id,'cancelled','prev:'+prevPhase]);
    toast('已取消（可重新啟用）','success');go(cur);
  });
}

/** 處理 reactivateOrder 相關操作。 */
function reactivateOrder(id){
  confirmDialog('確定要重新啟用此專案嗎？',()=>{
    // Find last pre-cancel phase from phase_log note
    const cancelLog=q1("SELECT note FROM phase_log WHERE order_id=? AND phase='cancelled' ORDER BY id DESC LIMIT 1",[id]);
    const prevPhase=(cancelLog?.note||'').replace('prev:','')||'pending';
    exec("UPDATE orders SET phase=?,status='active' WHERE id=?",[prevPhase,id]);
    exec("DELETE FROM phase_log WHERE order_id=? AND phase='cancelled'",[id]);
    toast('專案已重新啟用','success');go(cur);
  });
}

/** 處理 filterOrd 相關操作。 */
function filterOrd(sq,ph){
  let rows=q("SELECT o.*,c.name as cn FROM orders o LEFT JOIN customers c ON o.customer_id=c.id WHERE o.deleted_at IS NULL ORDER BY o.date DESC");
  if(ph)rows=rows.filter(r=>r.phase===ph);
  if(sq){const s=sq.toLowerCase();rows=rows.filter(r=>['order_no','title','cn'].some(f=>String(r[f]||'').toLowerCase().includes(s)));}
  document.getElementById('ord-tbody').innerHTML=renderOrdRows(rows);
  document.getElementById('ord-count').textContent=rows.length+' 筆';
}

/** 處理 showOrderDetail 相關操作。 */
function showOrderDetail(id){
  const o=q1("SELECT o.*,c.name as cn FROM orders o LEFT JOIN customers c ON o.customer_id=c.id WHERE o.id=?",[id]);
  const items=q("SELECT oi.*,s.name as sn FROM order_items oi LEFT JOIN services s ON oi.service_id=s.id WHERE oi.order_id=?",[id]);
  const oss=q("SELECT os.*,s.name as sn FROM outsource_orders os LEFT JOIN suppliers s ON os.supplier_id=s.id WHERE os.order_id=? AND os.deleted_at IS NULL",[id]);
  const recs=q("SELECT * FROM receivables WHERE order_id=? ORDER BY id",[id]);
  let delivs=[];try{delivs=JSON.parse(o.deliverables||'[]');}catch(e){}
  const totalCost=oss.reduce((s,os)=>s+(os.total||0),0);
  const profit=o.total-totalCost;
  const pct=o.total>0?Math.round(profit/o.total*100):0;
  const phIdx=PHASES.findIndex(p=>p.key===o.phase);
  const totalPaid=recs.filter(r=>r.status==='paid').reduce((s,r)=>s+r.amount,0);

  const srcQuote=o.quote_id?q1("SELECT id,quote_no,version,title FROM quotes WHERE id=?",[o.quote_id]):null;

  const canEdit=o.phase!=='completed'&&o.phase!=='cancelled';
  openModal(`專案詳情 — ${o.order_no}`,
    `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="font-size:15px;font-weight:600;color:var(--text)">${o.title||''}</div>
      ${canEdit?`<button class="btn btn-ghost btn-sm" onclick="closeModal();setTimeout(()=>showEditOrder(${id}),100)">✏️ 編輯訂單</button>`:''}
    </div>
    <div class="form-row-3">
      <div class="form-row"><label>客戶</label><div style="color:var(--text);padding:2px 0">${o.cn||'—'}</div></div>
      <div class="form-row"><label>建立日期</label><div style="color:var(--text2);padding:2px 0">${o.date||''}</div></div>
      <div class="form-row"><label>截止日</label><div style="color:${o.due_date&&o.due_date<today()?'var(--accent4)':'var(--text2)'};padding:2px 0">${o.due_date||'—'}</div></div>
    </div>
    ${srcQuote?`<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--surface2);border-radius:7px;border-left:3px solid var(--accent5);margin-bottom:10px;font-size:12px">
      <span>📋</span>
      <span style="color:var(--text3)">來源報價單：</span>
      <span class="td-mono" style="color:var(--accent5);cursor:pointer" onclick="closeModal();setTimeout(()=>showQuoteDetail(${srcQuote.id}),100)">${srcQuote.quote_no}${srcQuote.version>1?' (v'+srcQuote.version+')':''}</span>
    </div>`:''}
    <div class="form-section-title">專案進度</div>
    <div id="phase-bar-${id}">${renderPhaseBar(id,phIdx,o.phase)}</div>
    <div class="form-section-title">服務項目</div>
    ${renderItemsTable(items)}
    <div class="tax-box"><div class="tax-row"><span>未稅</span><span>$${fmt(o.total_excl)}</span></div><div class="tax-row"><span>稅 (${o.tax_rate}%)</span><span>$${fmt(o.tax_amount)}</span></div><div class="tax-row total"><span>含稅合計</span><span>$${fmt(o.total)}</span></div></div>
    ${oss.length?`<div class="form-section-title">關聯委外單</div>
    <table><thead><tr><th>委外單號</th><th>廠商</th><th>說明</th><th>金額</th><th>狀態</th></tr></thead>
    <tbody>${oss.map(os=>`<tr><td class="td-mono td-main">${os.os_no}</td><td>${os.sn||'—'}</td><td>${os.description||'—'}</td><td class="td-mono">$${fmt(os.total)}</td><td>${stBadge(os.status)}</td></tr>`).join('')}</tbody></table>`:''}
    <div class="form-section-title">
      收款里程碑
      <button class="btn btn-sm btn-ghost" style="margin-left:8px;font-size:11px" onclick="window._msOrdId=${id};showMilestoneManager(${id})">管理里程碑</button>
    </div>
    <div class="milestone-list" id="ms-list-${id}">
    ${recs.length?recs.map(r=>{const ov=r.status==='unpaid'&&r.due_date<today();return`<div class="milestone-item">
      <div class="milestone-dot" style="background:${r.status==='paid'?'var(--accent2)':ov?'var(--accent4)':'var(--accent3)'}"></div>
      <div class="milestone-name">${r.milestone_name||'付款'}</div>
      <div class="milestone-amount">$${fmt(r.amount)}</div>
      <span class="milestone-due">${r.due_date||''}</span>
      ${stBadge(r.status==='unpaid'&&ov?'overdue':r.status)}
    </div>`;}).join(''):'<div style="color:var(--text3);font-size:12px;padding:8px 0">尚無收款記錄，點「管理里程碑」新增</div>'}
    </div>
    <div class="form-section-title">成本 / 利潤</div>
    <div class="proj-detail">
      <div class="proj-detail-row"><span class="proj-detail-label">收入（含稅）</span><span class="proj-detail-val">$${fmt(o.total)}</span></div>
      <div class="proj-detail-row"><span class="proj-detail-label">已收款</span><span class="proj-detail-val" style="color:var(--accent2)">$${fmt(totalPaid)}</span></div>
      <div class="proj-detail-row"><span class="proj-detail-label">委外成本</span><span class="proj-detail-val" style="color:var(--accent4)">$${fmt(totalCost)}</span></div>
      <div class="proj-detail-row"><span class="proj-detail-label">毛利</span><span class="proj-detail-val ${profit>=0?'profit-pos':'profit-neg'}">$${fmt(profit)} (${pct}%)</span></div>
    </div>
    ${delivs.length?`<div class="form-section-title">交付物清單</div>
    <div id="dlv-${id}">${delivs.map((d,i)=>`<div class="deliv-item"><div class="deliv-check${d.done?' done':''}" onclick="toggleDeliv(${id},${i})">${d.done?'✓':''}</div><div class="deliv-text${d.done?' done':''}">${d.text}</div></div>`).join('')}</div>`:''}
    ${o.notes?`<div class="form-section-title">備註</div><div style="font-size:12.5px;color:var(--text2)">${o.notes}</div>`:''}
    <div class="form-section-title" style="margin-top:12px">
      溝通紀錄
      <span style="font-size:10px;color:var(--text3);font-weight:400;margin-left:6px">按時間排序，自動記錄</span>
    </div>
    <div id="notes-timeline-${id}" class="notes-timeline">${renderOrderNotes(id)}</div>
    <div class="note-add">
      <textarea id="note-input-${id}" placeholder="輸入溝通紀錄、進度更新、客戶反饋..."></textarea>
      <button class="btn btn-primary btn-sm" style="flex-shrink:0;height:36px" onclick="addOrderNote(${id})">新增</button>
    </div>`,null);
}

/** 處理 showEditOrder 相關操作。 */
function showEditOrder(id){
  const o=q1("SELECT * FROM orders WHERE id=?",[id]);
  const items=q("SELECT * FROM order_items WHERE order_id=?",[id]);
  let delivs=[];try{delivs=JSON.parse(o.deliverables||'[]');}catch(e){}
  _svcs=q("SELECT id,name,unit,default_price,category FROM services ORDER BY category,name");
  openModal(`編輯訂單 — ${o.order_no}`,
    `<div class="form-row"><label>專案標題</label><input type="text" id="f-title" value="${escQ(o.title||'')}"></div>
    <div class="form-row-3">
      <div class="form-row"><label>建立日期</label><input type="date" id="f-date" value="${o.date||today()}"></div>
      <div class="form-row"><label>截止日</label><input type="date" id="f-due" value="${o.due_date||''}"></div>
      <div class="form-row"><label>階段</label><select id="f-phase">${PHASES.map(p=>`<option value="${p.key}"${p.key===o.phase?' selected':''}>${p.label}</option>`).join('')}</select></div>
    </div>
    <div class="form-row"><label>營業稅率</label><select id="f-tax" onchange="recalc()"><option value="5"${(o.tax_rate||5)==5?' selected':''}>5%</option><option value="0"${o.tax_rate==0?' selected':''}>0%（免稅）</option></select></div>
    <div class="form-section-title">服務項目（修改後將重新計算金額）</div>
    <div style="display:grid;grid-template-columns:1fr 72px 72px 100px 22px;gap:5px;margin-bottom:5px"><div style="font-size:10px;color:var(--text3)">說明</div><div style="font-size:10px;color:var(--text3)">數量</div><div style="font-size:10px;color:var(--text3)">單位</div><div style="font-size:10px;color:var(--text3)">單價(未稅)</div><div></div></div>
    <div id="order-items">${items.map(i=>'<div class="ir'+(i.is_subitem?' ir-sub':'')+'" data-sub="'+(i.is_subitem?'1':'0')+'" '+(i.is_subitem?'style="margin-left:18px"':'')+'><input type="text" class="item-desc" value="'+escQ(i.description)+'" list="svc-list" oninput="onSI(this)"><input type="number" class="item-qty" value="'+i.qty+'" min="0.01" step="0.01" oninput="recalc()"><input type="text" class="item-unit" value="'+i.unit+'"><input type="number" class="item-price" value="'+i.unit_price+'" step="0.01" oninput="recalc()"><button class="rm-btn" onclick="this.parentElement.remove();recalc()">✕</button></div>').join('')}</div>
    <div style="display:flex;gap:5px">
  <button class="add-row-btn" style="flex:1" onclick="addOrderItemRow()">＋ 新增項目</button>
  <button class="add-row-btn" style="flex:0.5;font-size:11px;color:var(--accent5);border-color:var(--accent5)" onclick="addItemRow('order-items',true)">＋ 子項</button>
</div>
    <div class="tax-box" id="tax-summary"><div class="tax-row"><span>未稅金額</span><span id="ts-excl">$${fmt(o.total_excl)}</span></div><div class="tax-row"><span>營業稅 (${o.tax_rate}%)</span><span id="ts-tax">$${fmt(o.tax_amount)}</span></div><div class="tax-row total"><span>含稅合計</span><span id="ts-total">$${fmt(o.total)}</span></div></div>
    <div class="form-section-title">交付物清單</div>
    <div id="deliv-inputs">${delivs.map(d=>`<div style="display:flex;gap:6px;align-items:center;margin-bottom:5px"><input type="text" class="deliv-input" value="${escQ(d.text)}" style="flex:1;padding:6px 9px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;font-family:'Noto Sans TC',sans-serif;outline:none"><button class="rm-btn" onclick="this.parentElement.remove()">✕</button></div>`).join('')}</div>
    <button class="add-row-btn" onclick="addDelivRow()">＋ 新增交付物</button>
    <div class="form-row" style="margin-top:10px"><label>備註</label><textarea id="f-notes">${escQ(o.notes||'')}</textarea></div>`,
    ()=>{
      const title=document.getElementById('f-title').value.trim();
      const date=document.getElementById('f-date').value;
      const due=document.getElementById('f-due').value;
      const phase=document.getElementById('f-phase').value;
      const taxRate=parseFloat(document.getElementById('f-tax').value||'5');
      const notes=document.getElementById('f-notes').value;
      const items2=getItems();
      const excl=items2.reduce((s,i)=>s+i.qty*i.price,0);
      const tax=Math.round(excl*taxRate)/100;
      const total=excl+tax;
      const delivs2=[];
      document.querySelectorAll('.deliv-input').forEach(inp=>{const t=inp.value.trim();if(t)delivs2.push({text:t,done:false});});
      exec("UPDATE orders SET title=?,date=?,due_date=?,phase=?,tax_rate=?,total_excl=?,tax_amount=?,total=?,deliverables=?,notes=? WHERE id=?",[title,date||null,due||null,phase,taxRate,excl,tax,total,JSON.stringify(delivs2),notes,id]);
      exec("DELETE FROM order_items WHERE order_id=?",[id]);
      items2.forEach(i=>{const svc=_svcs.find(s=>s.name===i.desc);exec("INSERT INTO order_items(order_id,service_id,description,qty,unit,unit_price,is_subitem) VALUES(?,?,?,?,?,?,?)",[id,svc?.id||null,i.desc,i.qty,i.unit,i.price,i.isSub?1:0]);});
      toast('訂單已更新','success');closeModal();go(cur);
    });
  setTimeout(recalc,50);
}

/** 處理 showAddOrder 相關操作。 */
function showAddOrder(){
  _custs=q("SELECT id,name FROM customers ORDER BY name");
  _svcs=q("SELECT id,name,unit,default_price,category FROM services ORDER BY category,name");
  const defTax=getSetting('default_tax_rate','5');
  const defDays=parseInt(getSetting('default_project_days','30'));
  const defPay=parseInt(getSetting('default_payment_days','30'));
  openModal('新增專案訂單',
    `<div class="form-row"><label>專案標題 *</label><input type="text" id="f-title" placeholder="例：鋁合金支架設計圖"></div>
    <div class="form-row"><label>客戶 *</label><select id="f-cust"><option value="">-- 選擇客戶 --</option>${_custs.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
    <div class="form-row-3">
      <div class="form-row"><label>建立日期 *</label><input type="date" id="f-date" value="${today()}"></div>
      <div class="form-row"><label>截止日</label><input type="date" id="f-due" value="${addDays(today(),defDays)}"></div>
      <div class="form-row"><label>初始階段</label><select id="f-phase">${PHASES.filter(p=>p.key!=='cancelled').map(p=>`<option value="${p.key}">${p.label}</option>`).join('')}</select></div>
    </div>
    <div class="form-row"><label>營業稅率</label><select id="f-tax" onchange="recalc()"><option value="5" ${defTax==='5'?'selected':''}>5%</option><option value="0" ${defTax==='0'?'selected':''}>0%（免稅）</option></select></div>
    <div class="form-section-title">服務項目</div>
    <div style="display:grid;grid-template-columns:1fr 72px 72px 100px 22px;gap:5px;margin-bottom:5px"><div style="font-size:10px;color:var(--text3)">說明</div><div style="font-size:10px;color:var(--text3)">數量</div><div style="font-size:10px;color:var(--text3)">單位</div><div style="font-size:10px;color:var(--text3)">單價(未稅)</div><div></div></div>
    <div id="order-items"></div>
    <div style="display:flex;gap:5px">
  <button class="add-row-btn" style="flex:1" onclick="addOrderItemRow()">＋ 新增項目</button>
  <button class="add-row-btn" style="flex:0.5;font-size:11px;color:var(--accent5);border-color:var(--accent5)" onclick="addItemRow('order-items',true)">＋ 子項</button>
</div>
    <div class="tax-box" id="tax-summary"><div class="tax-row"><span>未稅金額</span><span id="ts-excl">$0</span></div><div class="tax-row"><span>營業稅 (5%)</span><span id="ts-tax">$0</span></div><div class="tax-row total"><span>含稅合計</span><span id="ts-total">$0</span></div></div>
    <div class="form-section-title">分期/里程碑付款設定（選填，不填則建立一筆全額應收）</div>
    <div id="ms-inputs"></div>
    <button class="add-row-btn" onclick="addMSRow()">＋ 新增里程碑</button>
    <div class="form-section-title">交付物清單（選填）</div>
    <div id="deliv-inputs"></div>
    <button class="add-row-btn" onclick="addDelivRow()">＋ 新增交付物</button>
    <div class="form-row" style="margin-top:10px"><label>備註</label><textarea id="f-notes" placeholder="特殊需求、溝通紀錄..."></textarea></div>`,
    saveOrder);
  addOrderItemRow();
}

/** 處理 saveOrder 相關操作。 */
function saveOrder(){
  const title=document.getElementById('f-title').value.trim();
  const custId=document.getElementById('f-cust').value;
  const date=document.getElementById('f-date').value;
  const due=document.getElementById('f-due').value;
  const phase=document.getElementById('f-phase').value;
  const taxRate=parseFloat(document.getElementById('f-tax').value||'5');
  const notes=document.getElementById('f-notes').value;
  if(!title||!custId||!date){toast('請填寫標題、客戶與日期','error');return;}
  const items=getItems();
  const delivs=[];
  document.querySelectorAll('.deliv-input').forEach(inp=>{const t=inp.value.trim();if(t)delivs.push({text:t,done:false});});
  const milestones=[];
  document.querySelectorAll('#ms-inputs > div').forEach(row=>{
    const name=row.querySelector('.ms-name')?.value?.trim();
    const amt=parseFloat(row.querySelector('.ms-amount')?.value)||0;
    const dueD=row.querySelector('.ms-due')?.value;
    if(name&&amt>0&&dueD)milestones.push({name,amt,dueD});
  });
  const excl=items.reduce((s,i)=>s+i.qty*i.price,0);
  const tax=Math.round(excl*taxRate)/100;
  const total=excl+tax;
  const oNo=nextNo('PRJ','orders');
  exec("INSERT INTO orders(order_no,customer_id,title,date,due_date,phase,status,total_excl,tax_rate,tax_amount,total,deliverables,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [oNo,custId,title,date,due||null,phase,'active',excl,taxRate,tax,total,JSON.stringify(delivs),notes]);
  const oid=lastId();
  items.forEach(i=>{const svc=_svcs.find(s=>s.name===i.desc);exec("INSERT INTO order_items(order_id,service_id,description,qty,unit,unit_price,is_subitem) VALUES(?,?,?,?,?,?,?)",[oid,svc?.id||null,i.desc,i.qty,i.unit,i.price,i.isSub?1:0]);});
  const defPayDays=parseInt(getSetting('default_payment_days','30'));
  if(milestones.length>0){
    milestones.forEach(m=>exec("INSERT INTO receivables(order_id,milestone_name,amount,due_date,status) VALUES(?,?,?,?,'unpaid')",[oid,m.name,m.amt,m.dueD]));
  }else{
    exec("INSERT INTO receivables(order_id,milestone_name,amount,due_date,status) VALUES(?,?,?,?,'unpaid')",[oid,'全額付款',total,due||addDays(date,defPayDays)]);
  }
  toast(`專案 ${oNo} 已建立 ✓`,'success');
  logActivity('order','建立專案訂單',oid,oNo,title,total,null,'');
  closeModal();go(cur);
}

/** 處理 addOrderNote 相關操作。 */
function addOrderNote(orderId){
  const inp=document.getElementById(`note-input-${orderId}`);
  const content=(inp?.value||'').trim();
  if(!content){toast('請輸入紀錄內容','error');return;}
  const author=getSetting('user_name','負責人');
  exec("INSERT INTO order_notes(order_id,content,author) VALUES(?,?,?)",[orderId,content,author]);
  inp.value='';
  const tl=document.getElementById(`notes-timeline-${orderId}`);
  if(tl)tl.innerHTML=renderOrderNotes(orderId);
  toast('溝通紀錄已新增','success');
}
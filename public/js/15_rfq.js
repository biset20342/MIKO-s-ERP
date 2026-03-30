/**
 * 15_rfq.js — 自動分拆模組
 * 對外暴露：...
 * 依賴：...
 */

/** 處理 renderRFQ 相關操作。 */
function renderRFQ(){
  const rows=q(`SELECT r.*,o.order_no,o.title as otitle, p.project_no,
    (SELECT COUNT(*) FROM rfq_suppliers rs WHERE rs.rfq_id=r.id) as sup_count,
    (SELECT COUNT(*) FROM supplier_quotes sq WHERE sq.rfq_id=r.id) as quote_count,
    (SELECT COUNT(*) FROM supplier_quotes sq WHERE sq.rfq_id=r.id AND sq.selected=1) as selected_count
    FROM rfqs r LEFT JOIN orders o ON r.order_id=o.id LEFT JOIN projects p ON r.project_id=p.id
    WHERE r.deleted_at IS NULL ORDER BY r.date DESC`);
  const statusMap={open:{l:'詢價中',c:'badge-blue'},closed:{l:'已結案',c:'badge-gray'},cancelled:{l:'已取消',c:'badge-gray'}};
  return `<div style="margin-bottom:12px;padding:12px 14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;font-size:12px;color:var(--text3);line-height:1.8">
    流程說明：<span style="color:var(--accent5);font-weight:500">①建立詢價單</span> → 
    <span style="color:var(--accent3);font-weight:500">②廠商回報報價</span> → 
    <span style="color:var(--accent2);font-weight:500">③選定報價並產生採購單</span>
  </div>
  <div class="panel"><div class="panel-header"><div class="panel-title">詢價單管理</div></div>
  <div class="filter-bar"><input type="text" id="frfq" placeholder="搜尋詢價單號、說明、關聯專案..." oninput="filterRFQ(this.value)">
  <span class="filter-count" id="rfq-count">${rows.length} 筆</span></div>
  <table><thead><tr><th>詢價單號</th><th>說明</th><th>歸屬專案</th><th>關聯訂單</th><th>詢價日期</th><th>截止日</th><th>詢價廠商</th><th>已回報</th><th>狀態</th><th>操作</th></tr></thead>
  <tbody id="rfq-tbody">${renderRFQRows(rows)}</tbody></table></div>`;
}

/** 處理 renderRFQRows 相關操作。 */
function renderRFQRows(rows){
  const statusMap={open:{l:'詢價中',c:'badge-blue'},closed:{l:'已結案',c:'badge-green'},cancelled:{l:'已取消',c:'badge-gray'}};
  return rows.map(r=>{
    const sm=statusMap[r.status]||{l:r.status,c:'badge-gray'};
    const expired=r.deadline&&r.deadline<today()&&r.status==='open';
    return '<tr>'+
    '<td class="td-mono td-main">'+r.rfq_no+'</td>'+
    '<td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(r.description||'—')+'</td>'+
    '<td class="td-mono">'+(r.project_no?'<span style="color:var(--accent5)">'+r.project_no+'</span>':'—')+'</td>'+
    '<td class="td-mono">'+(r.order_no?'<span style="color:var(--accent5)">'+r.order_no+'</span>':'—')+'</td>'+
    '<td class="td-mono">'+(r.date||'')+'</td>'+
    '<td class="td-mono"'+(expired?' style="color:var(--accent4)"':'')+'>'+(r.deadline||'—')+'</td>'+
    '<td class="td-mono">'+r.sup_count+' 家</td>'+
    '<td>'+(r.quote_count>0?'<span class="badge badge-green">'+r.quote_count+' 筆</span>':'<span class="badge badge-gray">待回覆</span>')+'</td>'+
    '<td><span class="badge '+sm.c+'">'+sm.l+'</span>'+(expired?'<span class="badge badge-red" style="margin-left:3px">逾期</span>':'')+'</td>'+
    '<td><div class="td-actions">'+
    '<button class="btn btn-sm btn-ghost" onclick="showRFQDetail('+r.id+')">詳情</button>'+
    (r.status==='open'?'<button class="btn btn-sm btn-ghost" onclick="showEditRFQ('+r.id+')">編輯</button>':'')+''+
    (r.status==='open'&&r.quote_count>0?'<button class="btn btn-sm btn-convert" onclick="showSelectRFQQuote('+r.id+')">選定廠商→採購單</button>':'')+
    (r.status==='open'?'<button class="btn btn-sm btn-warning" onclick="closeRFQ('+r.id+')">結案</button>':'')+
    '</div></td></tr>';
  }).join('');
}

/** 處理 filterRFQ 相關操作。 */
function filterRFQ(sq){
  let rows=q(`SELECT r.*,o.order_no,p.project_no,(SELECT COUNT(*) FROM rfq_suppliers rs WHERE rs.rfq_id=r.id) as sup_count,(SELECT COUNT(*) FROM supplier_quotes sq WHERE sq.rfq_id=r.id) as quote_count FROM rfqs r LEFT JOIN orders o ON r.order_id=o.id LEFT JOIN projects p ON r.project_id=p.id WHERE r.deleted_at IS NULL ORDER BY r.date DESC`);
  if(sq){const s=sq.toLowerCase();rows=rows.filter(r=>['rfq_no','description','order_no','project_no'].some(f=>String(r[f]||'').toLowerCase().includes(s)));}
  document.getElementById('rfq-tbody').innerHTML=renderRFQRows(rows);
  document.getElementById('rfq-count').textContent=rows.length+' 筆';
}

/** 處理 showAddRFQ 相關操作。 */
function showAddRFQ(){
  const _projs=q("SELECT id,project_no,title FROM projects WHERE status='active' AND deleted_at IS NULL ORDER BY date DESC");
  const activeOrders=q("SELECT id,order_no,title FROM orders WHERE status='active' AND phase NOT IN('completed','cancelled') AND deleted_at IS NULL ORDER BY date DESC");
  _supps=q("SELECT id,name,specialty FROM suppliers ORDER BY name");
  openModal('新增詢價單',
    `<div class="form-row"><label>詢價說明 *</label><input type="text" id="f-rfq-desc" placeholder="例：CNC 鋁合金零件加工詢價"></div>
    <div class="form-row-2">
      <div class="form-row"><label>歸屬專案（選填）</label><select id="f-rfq-proj"><option value="">不關聯</option>${_projs.map(p=>`<option value="${p.id}">${p.project_no} - ${p.title}</option>`).join('')}</select></div>
      <div class="form-row"><label>關聯訂單（選填）</label><select id="f-rfq-order"><option value="">不關聯</option>${activeOrders.map(o=>`<option value="${o.id}">[${o.order_no}] ${o.title}</option>`).join('')}</select></div>
    </div>
    <div class="form-row-2">
      <div class="form-row"><label>詢價日期 *</label><input type="date" id="f-rfq-date" value="${today()}"></div>
      <div class="form-row"><label>回覆截止日</label><input type="date" id="f-rfq-deadline" value="${addDays(today(),7)}"></div>
    </div>
    <div class="form-row"><label>技術規格 / 需求說明</label><textarea id="f-rfq-specs" rows="3" placeholder="材質、尺寸、公差、數量、交期要求等..."></textarea></div>
    <div class="form-section-title">詢價廠商（可複選）</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:150px;overflow-y:auto;padding:4px">
      ${_supps.map(s=>`<label style="display:flex;align-items:center;gap:7px;padding:5px 8px;background:var(--surface2);border-radius:5px;cursor:pointer;font-size:12.5px"><input type="checkbox" class="rfq-sup-cb" value="${s.id}" style="accent-color:var(--accent5)">${s.name}${s.specialty?' <span style="font-size:10px;color:var(--text3)">('+s.specialty+')</span>':''}</label>`).join('')}
    </div>
    <div class="form-row" style="margin-top:10px"><label>備註</label><textarea id="f-rfq-notes" placeholder="選填"></textarea></div>`,
    ()=>{
      const desc=document.getElementById('f-rfq-desc').value.trim();
      const projId=document.getElementById('f-rfq-proj').value||null;
      const orderId=document.getElementById('f-rfq-order').value||null;
      const date=document.getElementById('f-rfq-date').value;
      const deadline=document.getElementById('f-rfq-deadline').value;
      const specs=document.getElementById('f-rfq-specs').value;
      const notes=document.getElementById('f-rfq-notes').value;
      const selSupps=[...document.querySelectorAll('.rfq-sup-cb:checked')].map(c=>parseInt(c.value));
      if(!desc||!date){toast('請填寫詢價說明與日期','error');return;}
      const rfqNo=nextNo('RFQ','rfqs');
      exec("INSERT INTO rfqs(project_id,rfq_no,order_id,description,specs,date,deadline,status,notes) VALUES(?,?,?,?,?,?,?,?,'open',?)",
        [projId,rfqNo,orderId,desc,specs,date,deadline||null,notes]);
      const rid=lastId();
      selSupps.forEach(sid=>exec("INSERT INTO rfq_suppliers(rfq_id,supplier_id) VALUES(?,?)",[rid,sid]));
      toast(`詢價單 ${rfqNo} 已建立，已選 ${selSupps.length} 家廠商`,'success');
      closeModal();go(cur);
    }, true);
}

/** 處理 showRFQDetail 相關操作。 */
function showRFQDetail(id){
  const r=q1("SELECT rfq.*,o.order_no,o.title as otitle FROM rfqs rfq LEFT JOIN orders o ON rfq.order_id=o.id WHERE rfq.id=?",[id]);
  const supps=q("SELECT s.id,s.name,s.specialty FROM rfq_suppliers rs JOIN suppliers s ON rs.supplier_id=s.id WHERE rs.rfq_id=?",[id]);
  const sqList=q("SELECT sq.*,s.name as sn FROM supplier_quotes sq LEFT JOIN suppliers s ON sq.supplier_id=s.id WHERE sq.rfq_id=? ORDER BY sq.total ASC",[id]);

  openModal('詢價單詳情 — '+r.rfq_no,
    `<div class="form-row-2">
      <div class="form-row"><label>詢價日期</label><div style="color:var(--text2);padding:2px 0">${r.date||''}</div></div>
      <div class="form-row"><label>截止日</label><div style="color:${r.deadline&&r.deadline<today()?'var(--accent4)':'var(--text2)'};padding:2px 0">${r.deadline||'—'}</div></div>
    </div>
    <div class="form-row"><label>說明</label><div style="color:var(--text);font-weight:600;padding:2px 0">${r.description||''}</div></div>
    ${r.order_no?`<div style="padding:6px 10px;background:var(--surface2);border-radius:6px;font-size:12px;color:var(--text3);margin-bottom:8px">🔗 關聯專案：<span style="color:var(--accent5);font-family:'DM Mono',monospace">${r.order_no}</span> ${r.otitle||''}</div>`:''}
    ${r.specs?`<div class="form-section-title">規格說明</div><div style="font-size:12.5px;color:var(--text2);white-space:pre-wrap">${r.specs}</div>`:''}
    <div class="form-section-title">詢價廠商 (${supps.length} 家)</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${supps.map(s=>`<span class="badge badge-blue">${s.name}</span>`).join('')}
    </div>
    <div class="form-section-title" style="margin-top:12px">
      廠商報價紀錄 (${sqList.length} 筆)
      <button class="btn btn-sm btn-ghost" style="margin-left:8px;font-size:11px" onclick="showAddSupplierQuote(${id})">＋ 記錄報價</button>
    </div>
    ${sqList.length?`<table><thead><tr><th>廠商</th><th>回報日期</th><th>含稅金額</th><th>交期(天)</th><th>報價檔案</th><th>狀態</th><th>操作</th></tr></thead>
    <tbody>${sqList.map(sq=>`<tr style="${sq.selected?'background:rgba(56,217,169,.06)':''}">
      <td class="td-main">${sq.sn||'—'}</td>
      <td class="td-mono">${sq.received_date||'—'}</td>
      <td class="td-mono">$${fmt(sq.total)}</td>
      <td class="td-mono">${sq.lead_time_days||'—'}</td>
      <td style="font-size:11px">${sq.file_url?`<button class="btn btn-sm btn-ghost" onclick="copyPath('${escQ(sq.file_url)}')" style="font-size:10px">📋 複製路徑</button>`:'—'}</td>
      <td>${sq.selected?'<span class="badge badge-green">✓ 已選定</span>':'<span class="badge badge-gray">未選定</span>'}</td>
      <td><div class="td-actions">
        ${!sq.selected?`<button class="btn btn-sm btn-success" onclick="selectSupplierQuote(${sq.id},${id})">選定</button>`:''}
        <button class="btn btn-sm btn-danger" onclick="deleteSupplierQuote(${sq.id},${id})">刪</button>
      </div></td>
    </tr>`).join('')}</tbody></table>`:
    '<div style="color:var(--text3);font-size:12px;padding:8px 0">尚無廠商回報報價</div>'}`,null);
}

/** 處理 showSelectRFQQuote 相關操作。 */
function showSelectRFQQuote(rfqId){
  const sq=q1("SELECT sq.*,s.name as sn FROM supplier_quotes sq LEFT JOIN suppliers s ON sq.supplier_id=s.id WHERE sq.rfq_id=? AND sq.selected=1 LIMIT 1",[rfqId]);
  if(!sq){toast('請先在詢價單詳情中選定廠商報價','error');return;}
  const r=q1("SELECT * FROM rfqs WHERE id=?",[rfqId]);
  const _projs=q("SELECT id,project_no,title FROM projects WHERE status='active' AND deleted_at IS NULL ORDER BY date DESC");
  const activeOrders=q("SELECT id,order_no,title FROM orders WHERE status='active' AND phase NOT IN('completed','cancelled') AND deleted_at IS NULL ORDER BY date DESC");
  const defTax=getSetting('default_tax_rate','5');
  const defPay=parseInt(getSetting('default_payment_days','30'));

  openModal('產生採購單 — 已選定：'+sq.sn,
    `<div style="padding:10px 12px;background:var(--surface2);border-radius:7px;margin-bottom:12px;font-size:12.5px">
      <span style="color:var(--text3)">廠商：</span><strong>${sq.sn}</strong>　
      <span style="color:var(--text3)">報價金額：</span><strong style="color:var(--accent2)">$${fmt(sq.total)}</strong>　
      <span style="color:var(--text3)">交期：</span><strong>${sq.lead_time_days||'—'} 天</strong>
    </div>
    <div class="form-row"><label>採購說明 *</label><input type="text" id="f-os-desc" value="${escQ(r.description||'')}" placeholder="採購說明"></div>
    <div class="form-row-2">
      <div class="form-row"><label>歸屬專案</label><select id="f-os-proj"><option value="">無</option>${_projs.map(p=>`<option value="${p.id}"${r.project_id==p.id?' selected':''}>${p.project_no} - ${p.title}</option>`).join('')}</select></div>
      <div class="form-row"><label>關聯訂單</label><select id="f-os-order"><option value="">無</option>${activeOrders.map(o=>`<option value="${o.id}"${r.order_id==o.id?' selected':''}>[${o.order_no}] ${o.title}</option>`).join('')}</select></div>
    </div>
    <div class="form-row-2">
      <div class="form-row"><label>採購日期</label><input type="date" id="f-os-date" value="${today()}"></div>
      <div class="form-row"><label>預計交貨日</label><input type="date" id="f-os-exp" value="${sq.lead_time_days?addDays(today(),sq.lead_time_days):addDays(today(),14)}"></div>
    </div>
    <div class="form-row-2">
      <div class="form-row"><label>未稅金額</label><input type="number" id="f-os-excl" value="${sq.total_excl}" step="0.01"></div>
      <div class="form-row"><label>稅率</label><select id="f-os-tax"><option value="5" ${(sq.tax_rate||5)==5?'selected':''}>5%</option><option value="0" ${sq.tax_rate==0?'selected':''}>0%</option></select></div>
    </div>
    <div class="form-row"><label>備註</label><textarea id="f-os-notes" placeholder="選填">${escQ(r.notes||'')}</textarea></div>
    <div class="form-note"><span class="auto-tag">AUTO</span> 儲存後自動建立應付帳款，並將詢價單標記為結案</div>`,
    ()=>{
      const suppId=sq.supplier_id;
      const desc=document.getElementById('f-os-desc').value.trim();
      const projId=document.getElementById('f-os-proj').value||null;
      const ordId=document.getElementById('f-os-order').value||null;
      const date=document.getElementById('f-os-date').value;
      const exp=document.getElementById('f-os-exp').value;
      const excl=parseFloat(document.getElementById('f-os-excl').value)||0;
      const taxRate=parseFloat(document.getElementById('f-os-tax').value||'5');
      const notes=document.getElementById('f-os-notes').value;
      if(!desc||!date){toast('請填寫說明與日期','error');return;}
      const tax=Math.round(excl*taxRate)/100;
      const total=excl+tax;
      const osNo=nextNo('PO','outsource_orders');
      exec("INSERT INTO outsource_orders(project_id,os_no,order_id,supplier_id,date,expected_date,status,total_excl,tax_rate,tax_amount,total,description,notes,quote_file_url,rfq_id) VALUES(?,?,?,?,?,?,?,'pending',?,?,?,?,?,?,?,?)",
        [projId,osNo,ordId,suppId,date,exp||null,excl,taxRate,tax,total,desc,notes,sq.file_url||null,rfqId]);
      const osid=lastId();
      const defPayDays=parseInt(getSetting('default_payment_days','30'));
      exec("INSERT OR IGNORE INTO payables(os_id,amount,due_date,status) VALUES(?,?,?,'unpaid')",[osid,total,addDays(exp||date,defPayDays)]);
      exec("UPDATE rfqs SET status='closed' WHERE id=?",[rfqId]);
      logActivity('outsource','詢價轉採購單',osid,osNo,desc,total,sq.sn,'來自詢價單 '+r.rfq_no);
      toast(`採購單 ${osNo} 已產生，詢價單已結案 ✓`,'success');closeModal();go('outsource');
    });
}

/** 處理 showEditRFQ 相關操作。 */
function showEditRFQ(id){
  const r=q1("SELECT * FROM rfqs WHERE id=?",[id]);
  const selSupps=q("SELECT supplier_id FROM rfq_suppliers WHERE rfq_id=?",[id]).map(x=>x.supplier_id);
  _supps=q("SELECT id,name,specialty FROM suppliers ORDER BY name");
  const _projs=q("SELECT id,project_no,title FROM projects WHERE status='active' AND deleted_at IS NULL ORDER BY date DESC");
  openModal('編輯詢價單 — '+r.rfq_no,
    `<div class="form-row-2">
      <div class="form-row"><label>歸屬專案</label><select id="f-rfq-proj"><option value="">不關聯</option>${_projs.map(p=>`<option value="${p.id}"${p.id===r.project_id?' selected':''}>${p.project_no} - ${p.title}</option>`).join('')}</select></div>
      <div class="form-row"><label>詢價說明</label><input type="text" id="f-rfq-desc" value="${escQ(r.description||'')}"></div>
    </div>
    <div class="form-row-3">
      <div class="form-row"><label>建立日期</label><input type="date" id="f-rfq-date" value="${r.date||today()}"></div>
      <div class="form-row"><label>截止日</label><input type="date" id="f-rfq-deadline" value="${r.deadline||''}"></div>
    </div>
    <div class="form-row"><label>規格說明</label><textarea id="f-rfq-specs" rows="3">${escQ(r.specs||'')}</textarea></div>
    <div class="form-section-title">詢價廠商</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:130px;overflow-y:auto;padding:4px">
      ${_supps.map(s=>`<label style="display:flex;align-items:center;gap:7px;padding:5px 8px;background:var(--surface2);border-radius:5px;cursor:pointer;font-size:12.5px"><input type="checkbox" class="rfq-sup-cb" value="${s.id}" ${selSupps.includes(s.id)?'checked':''} style="accent-color:var(--accent5)">${s.name}</label>`).join('')}
    </div>
    <div class="form-row" style="margin-top:8px"><label>備註</label><textarea id="f-rfq-notes">${escQ(r.notes||'')}</textarea></div>`,
    ()=>{
      const projId=document.getElementById('f-rfq-proj').value||null;
      const desc=document.getElementById('f-rfq-desc').value.trim();
      const date=document.getElementById('f-rfq-date').value;
      const deadline=document.getElementById('f-rfq-deadline').value;
      const specs=document.getElementById('f-rfq-specs').value;
      const notes=document.getElementById('f-rfq-notes').value;
      const newSupps=[...document.querySelectorAll('.rfq-sup-cb:checked')].map(c=>parseInt(c.value));
      exec("UPDATE rfqs SET project_id=?,description=?,date=?,deadline=?,specs=?,notes=? WHERE id=?",[projId,desc,date||null,deadline||null,specs,notes,id]);
      exec("DELETE FROM rfq_suppliers WHERE rfq_id=?",[id]);
      newSupps.forEach(sid=>exec("INSERT INTO rfq_suppliers(rfq_id,supplier_id) VALUES(?,?)",[id,sid]));
      toast('詢價單已更新','success');closeModal();go(cur);
    }, true);
}

/** 處理 closeRFQ 相關操作。 */
function closeRFQ(id){
  confirmDialog('確定結案此詢價單嗎？',()=>{
    exec("UPDATE rfqs SET status='closed' WHERE id=?",[id]);
    toast('詢價單已結案','success');go(cur);
  });
}
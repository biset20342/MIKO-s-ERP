/**
 * 24_projects.js — 專案管理模組
 * 對外暴露：renderProjects, showAddProject, exportProjectsCSV
 */

const PROJ_STATUS = [
  {key:'active', label:'進行中'},
  {key:'completed', label:'已結案'},
  {key:'on_hold', label:'暫停中'},
  {key:'cancelled', label:'已取消'}
];

function renderProjects(){
  const s = getSort('projects','date');
  let rows = q("SELECT p.*, c.name as cn FROM projects p LEFT JOIN customers c ON p.customer_id=c.id WHERE p.deleted_at IS NULL ORDER BY p.date DESC");
  rows = sortArr(rows, s.col==='cn'?'cn':s.col, s.dir);
  return `<div class="panel"><div class="panel-header"><div class="panel-title">專案列表</div><button class="btn btn-ghost btn-sm" onclick="exportProjectsCSV()">↓ CSV</button></div>
  <div class="filter-bar">
    <input type="text" id="fpj" placeholder="搜尋編號、標題、客戶..." oninput="filterProj(this.value,document.getElementById('fpj-ph').value)">
    <select id="fpj-ph" onchange="filterProj(document.getElementById('fpj').value,this.value)">
      <option value="">全部狀態</option>${PROJ_STATUS.map(p=>`<option value="${p.key}">${p.label}</option>`).join('')}
    </select>
    <span class="filter-count" id="proj-count">${rows.length} 筆</span>
  </div>
  <table><thead><tr>${sth('projects','project_no','專案編號')}${sth('projects','title','專案標題')}${sth('projects','cn','客戶')}${sth('projects','date','建立日期')}${sth('projects','expected_date','預計完成日')}<th>狀態</th><th>操作</th></tr></thead>
  <tbody id="proj-tbody">${renderProjRows(rows)}</tbody></table></div>`;
}

function renderProjRows(rows){
  return rows.map(p=>{
    let stBadge = '';
    if(p.status === 'active') stBadge = '<span class="status-badge status-sent">進行中</span>';
    else if(p.status === 'completed') stBadge = '<span class="status-badge status-accepted">已結案</span>';
    else if(p.status === 'on_hold') stBadge = '<span class="status-badge" style="background:var(--accent4)">暫停中</span>';
    else if(p.status === 'cancelled') stBadge = '<span class="status-badge status-rejected">已取消</span>';

    return `<tr>
    <td class="td-mono td-main">${p.project_no}</td>
    <td class="td-main" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.title||'—'}</td>
    <td>${p.cn||'—'}</td>
    <td class="td-mono">${p.date||'—'}</td>
    <td class="td-mono">${p.expected_date||'—'}</td>
    <td>${stBadge}</td>
    <td><div class="td-actions">
      <button class="btn btn-sm btn-ghost" onclick="showProjectDetail(${p.id})">詳情</button>
      <button class="btn btn-sm btn-ghost" onclick="showEditProject(${p.id})">編輯</button>
      <button class="btn btn-sm btn-danger" onclick="softDelete('projects',${p.id},'${p.project_no}')">🗑️</button>
    </div></td></tr>`;
  }).join('');
}

function filterProj(sq,st){
  let rows = q("SELECT p.*, c.name as cn FROM projects p LEFT JOIN customers c ON p.customer_id=c.id WHERE p.deleted_at IS NULL ORDER BY p.date DESC");
  if(st) rows = rows.filter(r=>r.status===st);
  if(sq){const s=sq.toLowerCase();rows=rows.filter(r=>['project_no','title','cn'].some(f=>String(r[f]||'').toLowerCase().includes(s)));}
  document.getElementById('proj-tbody').innerHTML=renderProjRows(rows);
  document.getElementById('proj-count').textContent=rows.length+' 筆';
}

function showAddProject(){
  _custs = q("SELECT id,name FROM customers ORDER BY name");
  openModal('新增專案',
    `<div class="form-row"><label>專案標題 *</label><input type="text" id="f-title" placeholder="例：2026年度機台研發專案"></div>
    <div class="form-row-2">
      <div class="form-row"><label>客戶 *</label><select id="f-cust"><option value="">-- 選擇客戶 --</option>${_custs.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
      <div class="form-row"><label>狀態</label><select id="f-status">${PROJ_STATUS.map(p=>`<option value="${p.key}">${p.label}</option>`).join('')}</select></div>
    </div>
    <div class="form-row-2">
      <div class="form-row"><label>建立日期</label><input type="date" id="f-date" value="${today()}"></div>
      <div class="form-row"><label>預期完成日</label><input type="date" id="f-expected" value="${addDays(today(), 90)}"></div>
    </div>
    <div class="form-row"><label>專案描述/備註</label><textarea id="f-desc" placeholder="輸入專案整體概述..."></textarea></div>`,
    ()=>{
      const title = document.getElementById('f-title').value.trim();
      const custId = document.getElementById('f-cust').value;
      const status = document.getElementById('f-status').value;
      const date = document.getElementById('f-date').value;
      const exp = document.getElementById('f-expected').value;
      const desc = document.getElementById('f-desc').value;
      
      if(!title || !custId || !date){ toast('請填寫標題、客戶與日期','error'); return; }
      
      const pNo = nextNo('PRJ_GRP', 'projects'); // Use a generic generator or fallback
      
      exec("INSERT INTO projects(project_no, title, customer_id, status, date, expected_date, description) VALUES(?,?,?,?,?,?,?)",
           [pNo, title, custId, status, date, exp || null, desc]);
      
      toast(`專案 ${pNo} 已建立`,'success');
      closeModal();
      if(cur === 'projects') go('projects');
    }, true);
}

function showEditProject(id){
  const p = q1("SELECT * FROM projects WHERE id=?", [id]);
  _custs = q("SELECT id,name FROM customers ORDER BY name");
  openModal(`編輯專案 — ${p.project_no}`,
    `<div class="form-row"><label>專案標題 *</label><input type="text" id="f-title" value="${escQ(p.title||'')}"></div>
    <div class="form-row-2">
      <div class="form-row"><label>客戶 *</label><select id="f-cust">${_custs.map(c=>`<option value="${c.id}" ${c.id===p.customer_id?'selected':''}>${c.name}</option>`).join('')}</select></div>
      <div class="form-row"><label>狀態</label><select id="f-status">${PROJ_STATUS.map(st=>`<option value="${st.key}" ${st.key===p.status?'selected':''}>${st.label}</option>`).join('')}</select></div>
    </div>
    <div class="form-row-2">
      <div class="form-row"><label>建立日期</label><input type="date" id="f-date" value="${p.date||today()}"></div>
      <div class="form-row"><label>預期完成日</label><input type="date" id="f-expected" value="${p.expected_date||''}"></div>
    </div>
    <div class="form-row"><label>專案描述/備註</label><textarea id="f-desc">${escQ(p.description||'')}</textarea></div>`,
    ()=>{
      const title = document.getElementById('f-title').value.trim();
      const custId = document.getElementById('f-cust').value;
      const status = document.getElementById('f-status').value;
      const date = document.getElementById('f-date').value;
      const exp = document.getElementById('f-expected').value;
      const desc = document.getElementById('f-desc').value;
      
      if(!title || !custId || !date){ toast('請填寫完整資訊','error'); return; }
      
      exec("UPDATE projects SET title=?, customer_id=?, status=?, date=?, expected_date=?, description=? WHERE id=?",
           [title, custId, status, date, exp || null, desc, id]);
      
      toast('專案已更新','success');
      closeModal();
      if(cur === 'projects') go('projects');
    }, true);
}

function showProjectDetail(id){
  const p = q1("SELECT p.*, c.name as cn FROM projects p LEFT JOIN customers c ON p.customer_id=c.id WHERE p.id=?", [id]);
  
  // Fetch linked documents
  const qs = q("SELECT id, quote_no, title, status, total, date FROM quotes WHERE project_id=? AND deleted_at IS NULL ORDER BY date DESC", [id]);
  const ords = q("SELECT id, order_no, title, phase, total, date FROM orders WHERE project_id=? AND deleted_at IS NULL ORDER BY date DESC", [id]);
  const rfqs = q("SELECT id, rfq_no, description, status, date FROM rfqs WHERE project_id=? AND deleted_at IS NULL ORDER BY date DESC", [id]);
  const oss = q("SELECT o.id, o.os_no, o.description, o.status, o.total, o.date, s.name as sn FROM outsource_orders o LEFT JOIN suppliers s ON o.supplier_id=s.id WHERE o.project_id=? AND o.deleted_at IS NULL ORDER BY o.date DESC", [id]);
  
  const totalRev = ords.reduce((sum, o)=>sum+(o.total||0),0);
  const totalCost = oss.reduce((sum, o)=>sum+(o.total||0),0);
  const totalPft = totalRev - totalCost;

  let stLabel = PROJ_STATUS.find(s=>s.key===p.status)?.label || p.status;

  openModal(`頂層專案詳情 — ${p.project_no}`,
    `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="font-size:16px;font-weight:700;color:var(--text)">${p.title||''}</div>
      <button class="btn btn-ghost btn-sm" onclick="closeModal();setTimeout(()=>showEditProject(${id}),100)">✏️ 編輯</button>
    </div>
    <div class="form-row-3" style="margin-bottom:14px">
      <div class="form-row"><label>客戶</label><div style="color:var(--text);padding:2px 0;font-weight:600">${p.cn||'—'}</div></div>
      <div class="form-row"><label>專案狀態</label><div style="color:var(--text2);padding:2px 0">${stLabel}</div></div>
      <div class="form-row"><label>預期完成日</label><div style="color:var(--text2);padding:2px 0">${p.expected_date||'—'}</div></div>
    </div>
    ${p.description?`<div style="font-size:12.5px;color:var(--text2);background:var(--surface2);padding:10px;border-radius:6px;margin-bottom:16px;white-space:pre-wrap;">${p.description}</div>`:''}
    
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px;">
      <div class="kpi-card blue"><div class="kpi-label">已確認訂單總額</div><div class="kpi-value blue" style="font-size:16px">$${fmt(totalRev)}</div></div>
      <div class="kpi-card red"><div class="kpi-label">委外採購總成本</div><div class="kpi-value red" style="font-size:16px">$${fmt(totalCost)}</div></div>
      <div class="kpi-card green"><div class="kpi-label">預估毛利估算</div><div class="kpi-value green" style="font-size:16px">$${fmt(totalPft)}</div></div>
    </div>
    
    <div class="form-section-title">關聯訂單管理</div>
    ${ords.length?`<table><thead><tr><th>單號</th><th>標題</th><th>日期</th><th>含稅金額</th><th>階段</th><th>動作</th></tr></thead>
      <tbody>${ords.map(o=>`<tr><td class="td-mono">${o.order_no}</td><td>${o.title||'—'}</td><td class="td-mono">${o.date}</td><td class="td-mono">$${fmt(o.total)}</td><td>${phBadge(o.phase)}</td><td><button class="btn btn-sm btn-ghost" onclick="closeModal();setTimeout(()=>showOrderDetail(${o.id}),100)">檢視</button></td></tr>`).join('')}</tbody></table>`:'<div style="font-size:12px;color:var(--text3);padding:10px 0;">尚無關聯訂單</div>'}
    
    <div class="form-section-title" style="margin-top:20px">關聯報價單</div>
    ${qs.length?`<table><thead><tr><th>單號</th><th>標題</th><th>日期</th><th>金額</th><th>狀態</th><th>動作</th></tr></thead>
      <tbody>${qs.map(q=>`<tr><td class="td-mono">${q.quote_no}</td><td>${q.title||'—'}</td><td class="td-mono">${q.date}</td><td class="td-mono">$${fmt(q.total)}</td><td>${stBadge(q.status)}</td><td><button class="btn btn-sm btn-ghost" onclick="closeModal();setTimeout(()=>showQuoteDetail(${q.id}),100)">檢視</button></td></tr>`).join('')}</tbody></table>`:'<div style="font-size:12px;color:var(--text3);padding:10px 0;">尚無關聯報價單</div>'}
      
    <div class="form-section-title" style="margin-top:20px">關聯委外採購單</div>
    ${oss.length?`<table><thead><tr><th>單號</th><th>說明</th><th>廠商</th><th>日期</th><th>金額</th><th>狀態</th><th>動作</th></tr></thead>
      <tbody>${oss.map(o=>`<tr><td class="td-mono">${o.os_no}</td><td>${o.description||'—'}</td><td>${o.sn||'—'}</td><td class="td-mono">${o.date}</td><td class="td-mono">$${fmt(o.total)}</td><td>${stBadge(o.status)}</td><td><button class="btn btn-sm btn-ghost" onclick="closeModal();setTimeout(()=>showOSDetail(${o.id}),100)">檢視</button></td></tr>`).join('')}</tbody></table>`:'<div style="font-size:12px;color:var(--text3);padding:10px 0;">尚無關聯採購單</div>'}
      
    <div class="form-section-title" style="margin-top:20px">關聯詢價單</div>
    ${rfqs.length?`<table><thead><tr><th>單號</th><th>說明</th><th>建立日期</th><th>狀態</th><th>動作</th></tr></thead>
      <tbody>${rfqs.map(r=>`<tr><td class="td-mono">${r.rfq_no}</td><td>${r.description||'—'}</td><td class="td-mono">${r.date}</td><td>${stBadge(r.status)}</td><td><button class="btn btn-sm btn-ghost" onclick="closeModal();setTimeout(()=>showRFQDetail(${r.id}),100)">檢視</button></td></tr>`).join('')}</tbody></table>`:'<div style="font-size:12px;color:var(--text3);padding:10px 0;">尚無關聯詢價單</div>'}
    `,
    null);
}

function exportProjectsCSV(){
  const rows = q("SELECT p.project_no, p.title, c.name as cn, p.status, p.date, p.expected_date FROM projects p LEFT JOIN customers c ON p.customer_id=c.id WHERE p.deleted_at IS NULL ORDER BY p.date DESC");
  exportCSV('projects-'+today()+'.csv', ['專案編號','專案標題','客戶','狀態','建立日期','預期完成'], 
    rows.map(r=>[r.project_no, r.title, r.cn, r.status, r.date, r.expected_date]));
}

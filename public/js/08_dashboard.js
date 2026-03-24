/**
 * 08_dashboard.js — 自動分拆模組
 * 對外暴露：...
 * 依賴：...
 */

/** 處理 renderDashboard 相關操作。 */
function renderDashboard(){
  const active=q1("SELECT COUNT(*) as c FROM orders WHERE status='active' AND phase NOT IN('completed','cancelled') AND deleted_at IS NULL")?.c||0;
  const revM=q1("SELECT SUM(total) as v FROM orders WHERE status='active' AND deleted_at IS NULL AND strftime('%Y-%m',date)=strftime('%Y-%m',date('now'))")?.v||0;
  const costM=q1("SELECT SUM(total) as v FROM outsource_orders WHERE deleted_at IS NULL AND strftime('%Y-%m',date)=strftime('%Y-%m',date('now'))")?.v||0;
  const profit=revM-costM;
  const overdueAR=q1("SELECT SUM(amount) as v FROM receivables WHERE status='unpaid' AND due_date<date('now')")?.v||0;
  const pct=revM>0?Math.round(profit/revM*100):0;
  const projects=q("SELECT o.*,c.name as cn FROM orders o LEFT JOIN customers c ON o.customer_id=c.id WHERE o.status='active' AND o.phase NOT IN('completed','cancelled') AND o.deleted_at IS NULL ORDER BY o.due_date ASC LIMIT 8");
  const alerts=[];
  const alertDays=parseInt(getSetting('alert_due_days','3'));
  q(`SELECT o.order_no,o.title,o.due_date,CAST((julianday(o.due_date)-julianday('now'))AS INTEGER) as dl FROM orders o WHERE o.status='active' AND o.phase NOT IN('completed','cancelled') AND o.deleted_at IS NULL AND o.due_date IS NOT NULL AND julianday(o.due_date)-julianday('now')<=${alertDays}`).forEach(o=>{
    alerts.push({dot:o.dl<0?'dot-red':'dot-yellow',text:'專案截止'+(o.dl<0?'已超過 '+Math.abs(o.dl)+' 天':'剩 '+o.dl+' 天')+' — '+o.title,time:o.order_no+' · '+o.due_date});
  });
  q("SELECT r.amount,o.order_no,o.title,c.name as cn,CAST((julianday('now')-julianday(r.due_date))AS INTEGER) as dv FROM receivables r LEFT JOIN orders o ON r.order_id=o.id LEFT JOIN customers c ON o.customer_id=c.id WHERE r.status='unpaid' AND r.due_date<date('now')").forEach(r=>{
    alerts.push({dot:'dot-red',text:'應收逾期 — '+r.cn+' $'+fmt(r.amount)+' ('+r.milestone_name+')',time:'逾期 '+r.dv+' 天 · '+r.order_no});
  });
  q("SELECT os.os_no,os.description,s.name as sn,CAST((julianday('now')-julianday(os.date))AS INTEGER) as days FROM outsource_orders os LEFT JOIN suppliers s ON os.supplier_id=s.id WHERE os.status='pending' AND julianday('now')-julianday(os.date)>5").forEach(o=>{
    alerts.push({dot:'dot-purple',text:'委外待確認 — '+o.sn+'（'+o.description+'）',time:'送出後 '+o.days+' 天 · '+o.os_no});
  });
  q("SELECT q.quote_no,q.title,CAST((julianday('now')-julianday(q.valid_until))AS INTEGER) as dv FROM quotes q WHERE q.status='sent' AND q.valid_until<date('now')").forEach(q2=>{
    alerts.push({dot:'dot-yellow',text:'報價單已過有效期 — '+q2.title,time:q2.quote_no+' · 過期 '+q2.dv+' 天'});
  });
  const totalAR=q1("SELECT SUM(amount) as v FROM receivables WHERE status='unpaid'")?.v||0;
  const totalAP=q1("SELECT SUM(amount) as v FROM payables WHERE status='unpaid'")?.v||0;
  const net=totalAR-totalAP;const mx=Math.max(totalAR,totalAP)||1;
  return `<div class="kpi-grid">
    <div class="kpi-card blue"><div class="kpi-label">進行中專案</div><div class="kpi-value blue">${active}</div><div class="kpi-delta">個專案進行中</div></div>
    <div class="kpi-card green"><div class="kpi-label">本月收入（含稅）</div><div class="kpi-value green">$${fmt(revM)}</div><div class="kpi-delta">訂單合計</div></div>
    <div class="kpi-card purple"><div class="kpi-label">本月毛利</div><div class="kpi-value purple">$${fmt(profit)}</div><div class="kpi-delta ${pct>=0?'up':'dn'}">毛利率 ${pct}%</div></div>
    <div class="kpi-card red"><div class="kpi-label">應收逾期</div><div class="kpi-value red">$${fmt(overdueAR)}</div><div class="kpi-delta dn">${overdueAR>0?'需立即跟催':'目前無逾期'}</div></div>
  </div>
  <div class="two-col"><div>
    <div class="panel"><div class="panel-header"><div class="panel-title">進行中專案</div><span class="panel-link" onclick="go('orders')">全部 →</span></div>
    <table><thead><tr><th>專案號</th><th>標題</th><th>客戶</th><th>截止日</th><th>階段</th></tr></thead><tbody>
    ${projects.length?projects.map(o=>{const ov=o.due_date&&o.due_date<today();return`<tr><td class="td-mono td-main">${o.order_no}</td><td class="td-main" style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.title||'—'}</td><td>${o.cn||'—'}</td><td class="td-mono"${ov?' style="color:var(--accent4)"':''}>${(o.due_date||'').slice(5)||'—'}</td><td id="dash-phase-${o.id}">${phBadge(o.phase)}</td></tr>`;}).join(''):'<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:22px">目前無進行中專案</td></tr>'}
    </tbody></table></div>
  </div>
  <div class="right-col">
    <div class="panel"><div class="panel-header"><div class="panel-title">⚡ 待辦 &amp; 警示</div></div><div class="alert-list">
    ${alerts.length?alerts.map(a=>`<div class="alert-item"><div class="alert-dot ${a.dot}"></div><div><div class="alert-text">${a.text}</div><div class="alert-time">${a.time}</div></div></div>`).join(''):'<div class="no-alert">✓ 目前無待辦事項</div>'}
    </div></div>
    <div class="panel"><div class="panel-header"><div class="panel-title">應收 / 應付</div></div>
    <div class="progress-row"><div class="progress-head"><span class="progress-label">應收（未付）</span><span class="progress-val">$${fmt(totalAR)}</span></div><div class="progress-track"><div class="progress-fill" style="width:${Math.round(totalAR/mx*100)}%;background:var(--accent)"></div></div></div>
    <div class="progress-row"><div class="progress-head"><span class="progress-label">應付（未付）</span><span class="progress-val">$${fmt(totalAP)}</span></div><div class="progress-track"><div class="progress-fill" style="width:${Math.round(totalAP/mx*100)}%;background:var(--accent4)"></div></div></div>
    <div class="progress-row"><div class="progress-head"><span class="progress-label">淨應收</span><span class="progress-val" style="color:${net>=0?'var(--accent2)':'var(--accent4)'}">$${fmt(net)}</span></div><div class="progress-track"><div class="progress-fill" style="width:${Math.min(100,Math.abs(net)/mx*100)}%;background:${net>=0?'var(--accent2)':'var(--accent4)'}"></div></div></div>
    </div>
  </div></div>`;
}

/** 處理 logActivity 相關操作。 */
function logActivity(type,action,refId,refNo,refTitle,amount,entity,note){
  exec("INSERT INTO activity_log(type,action,ref_id,ref_no,ref_title,amount,entity,note) VALUES(?,?,?,?,?,?,?,?)",
    [type,action,refId||null,refNo||null,refTitle||null,amount||null,entity||null,note||null]);
}

/** 處理 renderActivityLog 相關操作。 */
function renderActivityLog(){
  const s=getSort('actlog','created_at','desc');
  let rows=q("SELECT * FROM activity_log ORDER BY id DESC");
  rows=sortArr(rows,'created_at',s.dir);

  // Summary cards
  const totalActs=rows.length;
  const todayActs=rows.filter(r=>(r.created_at||'').startsWith(today())).length;
  const totalRec=rows.filter(r=>r.type==='receivable').reduce((s,r)=>s+(r.amount||0),0);
  const totalPay=rows.filter(r=>r.type==='payable').reduce((s,r)=>s+(r.amount||0),0);

  return '<div class="stat-mini-grid">'+
    '<div class="stat-mini"><div class="stat-mini-label">總紀錄筆數</div><div class="stat-mini-val" style="color:var(--accent5)">'+totalActs+'</div></div>'+
    '<div class="stat-mini"><div class="stat-mini-label">今日活動</div><div class="stat-mini-val" style="color:var(--accent)">'+todayActs+'</div></div>'+
    '<div class="stat-mini"><div class="stat-mini-label">已記錄收款</div><div class="stat-mini-val" style="color:var(--accent2)">$'+fmt(totalRec)+'</div></div>'+
    '<div class="stat-mini"><div class="stat-mini-label">已記錄付款</div><div class="stat-mini-val" style="color:var(--accent4)">$'+fmt(totalPay)+'</div></div>'+
  '</div>'+
  '<div class="panel"><div class="panel-header">'+
    '<div class="panel-title">操作紀錄 <span style="font-size:11px;color:var(--text3);font-weight:400">自動記錄所有交易事件</span></div>'+
    '<button class="btn btn-ghost btn-sm" onclick="exportActivityLogCSV()">↓ CSV</button>'+
  '</div>'+
  '<div class="filter-bar">'+
    '<input type="text" id="fact" placeholder="搜尋動作、單號、標題、對象..." oninput="filterActLog(this.value,document.getElementById(\'fact-type\').value)">'+
    '<select id="fact-type" onchange="filterActLog(document.getElementById(\'fact\').value,this.value)">'+
      '<option value="">全部類型</option>'+
      Object.entries(ACT_TYPES).map(([k,v])=>'<option value="'+k+'">'+v.icon+' '+v.label+'</option>').join('')+
    '</select>'+
    '<input type="date" id="fact-from" onchange="filterActLog(document.getElementById(\'fact\').value,document.getElementById(\'fact-type\').value)" placeholder="起始日">'+
    '<input type="date" id="fact-to" onchange="filterActLog(document.getElementById(\'fact\').value,document.getElementById(\'fact-type\').value)" placeholder="結束日">'+
    '<button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'fact\').value=\'\';document.getElementById(\'fact-type\').value=\'\';document.getElementById(\'fact-from\').value=\'\';document.getElementById(\'fact-to\').value=\'\';filterActLog(\'\',\'\')">清除</button>'+
    '<span class="filter-count" id="act-count">'+rows.length+' 筆</span>'+
  '</div>'+
  '<table><thead><tr>'+
    sth('actlog','created_at','時間')+
    '<th>類型</th>'+
    sth('actlog','action','動作')+
    sth('actlog','ref_no','單號')+
    sth('actlog','ref_title','標題/說明')+
    sth('actlog','amount','金額')+
    sth('actlog','entity','對象')+
    '<th>備注</th>'+
  '</tr></thead>'+
  '<tbody id="act-tbody">'+renderActRows(rows)+'</tbody></table></div>';
}

/** 處理 renderActRows 相關操作。 */
function renderActRows(rows){
  return rows.map(r=>{
    const t=ACT_TYPES[r.type]||{icon:'•',label:r.type,color:'var(--text3)'};
    const dt=(r.created_at||'').replace('T',' ').substring(0,16);
    const hasAmt=r.amount!=null&&r.amount!==0;
    const isIncome=r.type==='receivable';
    const isExpense=r.type==='payable'||r.type==='outsource';
    return '<tr>'+
      '<td class="td-mono" style="font-size:11px;color:var(--text3);white-space:nowrap">'+dt+'</td>'+
      '<td><span class="badge" style="background:'+t.color+'22;color:'+t.color+';border:1px solid '+t.color+'44">'+t.icon+' '+t.label+'</span></td>'+
      '<td style="font-size:12.5px">'+escQ(r.action||'')+'</td>'+
      '<td class="td-mono" style="color:var(--accent5);font-size:12px">'+(r.ref_no||'—')+'</td>'+
      '<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px">'+(r.ref_title||'—')+'</td>'+
      '<td class="td-mono"'+(hasAmt?' style="color:'+(isIncome?'var(--accent2)':isExpense?'var(--accent4)':'var(--text)')+'font-weight:500"':'')+'>'+(hasAmt?(isExpense?'-':'+')+'$'+fmt(Math.abs(r.amount||0)):'—')+'</td>'+
      '<td style="font-size:12px;color:var(--text2)">'+(r.entity||'—')+'</td>'+
      '<td style="font-size:11px;color:var(--text3);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(r.note||'')+'</td>'+
    '</tr>';
  }).join('');
}

/** 處理 renderPftRows 相關操作。 */
function renderPftRows(rows){
  return rows.map(r=>{
    const p=r.total-r.cost;const pct=r.total>0?Math.round(p/r.total*100):0;
    return `<tr onclick="showProjectPnL(${r.id})" style="cursor:pointer"><td class="td-mono td-main">${r.order_no}</td><td class="td-main" style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.title||'—'}</td><td>${r.cn||'—'}</td><td class="td-mono">${r.date||''}</td><td class="td-mono">$${fmt(r.total)}</td><td class="td-mono" style="color:var(--accent4)">$${fmt(r.cost)}</td><td class="td-mono ${p>=0?'profit-pos':'profit-neg'}">$${fmt(p)}</td>
    <td><div style="display:flex;align-items:center;gap:6px"><div style="width:48px;height:5px;background:var(--surface2);border-radius:3px;overflow:hidden"><div style="width:${Math.max(0,Math.min(100,pct))}%;height:100%;background:${pct>=30?'var(--accent2)':pct>=0?'var(--accent3)':'var(--accent4)'}"></div></div><span class="td-mono" style="font-size:11px;color:${pct>=30?'var(--accent2)':pct>=0?'var(--accent3)':'var(--accent4)'}">${pct}%</span></div></td>
    <td>${phBadge(r.phase)}</td></tr>`;
  }).join('');
}

/** 處理 renderProjectDetail 相關操作。 */
function renderProjectDetail(orderId){
  const el=document.getElementById('proj-pnl-detail');
  if(!el)return;
  if(!orderId){el.innerHTML='<div style="text-align:center;padding:50px 0;color:var(--text3);font-size:13px">⬆ 請從上方選擇專案以查看損益明細</div>';return;}

  const o=q1("SELECT o.*,c.name as cn FROM orders o LEFT JOIN customers c ON o.customer_id=c.id WHERE o.id=?",[orderId]);
  if(!o){el.innerHTML='<div style="color:var(--accent4);padding:20px;text-align:center">找不到專案資料</div>';return;}

  // 收入明細
  const oItems=q("SELECT oi.*,s.name as sn FROM order_items oi LEFT JOIN services s ON oi.service_id=s.id WHERE oi.order_id=?",[orderId]);
  // 委外成本明細
  const osOrders=q("SELECT os.*,s.name as sn FROM outsource_orders os LEFT JOIN suppliers s ON os.supplier_id=s.id WHERE os.order_id=? AND os.deleted_at IS NULL",[orderId]);
  const totalCost=osOrders.reduce((s,r)=>s+r.total,0);
  const profit=o.total-totalCost;
  const pct=o.total>0?Math.round(profit/o.total*100):0;
  // 應收帳款進度
  const recs=q("SELECT * FROM receivables WHERE order_id=?",[orderId]);
  const paidAmt=recs.filter(r=>r.status==='paid').reduce((s,r)=>s+r.amount,0);
  const unpaidAmt=recs.filter(r=>r.status!=='paid').reduce((s,r)=>s+r.amount,0);

  el.innerHTML=`
  <div class="stat-mini-grid">
    <div class="stat-mini"><div class="stat-mini-label">專案收入</div><div class="stat-mini-val" style="color:var(--accent)">$${fmt(o.total)}</div></div>
    <div class="stat-mini"><div class="stat-mini-label">委外成本</div><div class="stat-mini-val" style="color:var(--accent4)">$${fmt(totalCost)}</div></div>
    <div class="stat-mini"><div class="stat-mini-label">專案毛利</div><div class="stat-mini-val" style="color:${profit>=0?'var(--accent2)':'var(--accent4)'}">$${fmt(profit)}</div></div>
    <div class="stat-mini"><div class="stat-mini-label">毛利率</div><div class="stat-mini-val" style="color:${pct>=30?'var(--accent2)':pct>=0?'var(--accent3)':'var(--accent4)'}">${pct}%</div></div>
  </div>
  <div class="proj-detail" style="margin-bottom:12px">
    <div class="proj-detail-row"><span class="proj-detail-label">專案名稱</span><span class="proj-detail-val" style="font-weight:600">${o.title||'—'}</span></div>
    <div class="proj-detail-row"><span class="proj-detail-label">專案單號</span><span class="proj-detail-val">${o.order_no}</span></div>
    <div class="proj-detail-row"><span class="proj-detail-label">客戶</span><span class="proj-detail-val">${o.cn||'—'}</span></div>
    <div class="proj-detail-row"><span class="proj-detail-label">階段</span><span>${phBadge(o.phase)}</span></div>
    <div class="proj-detail-row"><span class="proj-detail-label">起始日</span><span class="proj-detail-val">${o.date||'—'}</span></div>
    <div class="proj-detail-row"><span class="proj-detail-label">截止日</span><span class="proj-detail-val">${o.due_date||'—'}</span></div>
  </div>
  <div class="detail-grid">
    <div class="detail-card">
      <div class="detail-card-header">📥 收入明細（訂單項目）</div>
      <table><thead><tr><th>項目</th><th>數量</th><th>單位</th><th>單價</th><th>小計</th></tr></thead><tbody>
      ${oItems.length?oItems.map(i=>`<tr><td class="td-main">${i.description||i.sn||'—'}</td><td class="td-mono">${i.qty}</td><td>${i.unit||'式'}</td><td class="td-mono">$${fmt(i.unit_price)}</td><td class="td-mono">$${fmt(i.qty*i.unit_price)}</td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:14px">無項目資料</td></tr>'}
      </tbody></table>
      <div class="tax-box" style="margin:8px 12px 12px">
        <div class="tax-row"><span>未稅</span><span>$${fmt(o.total_excl)}</span></div>
        <div class="tax-row"><span>稅額 (${o.tax_rate}%)</span><span>$${fmt(o.tax_amount)}</span></div>
        <div class="tax-row total"><span>含稅合計</span><span>$${fmt(o.total)}</span></div>
      </div>
    </div>
    <div class="detail-card">
      <div class="detail-card-header">📤 委外成本明細</div>
      <table><thead><tr><th>採購單號</th><th>供應商</th><th>說明</th><th>金額</th><th>狀態</th></tr></thead><tbody>
      ${osOrders.length?osOrders.map(os=>`<tr><td class="td-mono td-main">${os.os_no}</td><td>${os.sn||'—'}</td><td style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${os.description||'—'}</td><td class="td-mono" style="color:var(--accent4)">$${fmt(os.total)}</td><td>${stBadge(os.status)}</td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:14px">無委外記錄</td></tr>'}
      </tbody></table>
      <div class="tax-box" style="margin:8px 12px 12px">
        <div class="tax-row total"><span>委外成本合計</span><span style="color:var(--accent4)">$${fmt(totalCost)}</span></div>
      </div>
    </div>
  </div>
  <div class="detail-grid" style="margin-top:0">
    <div class="detail-card">
      <div class="detail-card-header">💵 回款進度</div>
      <table><thead><tr><th>款項名稱</th><th>金額</th><th>到期日</th><th>狀態</th></tr></thead><tbody>
      ${recs.length?recs.map(r=>`<tr><td class="td-main">${r.milestone_name||'—'}</td><td class="td-mono">$${fmt(r.amount)}</td><td class="td-mono">${r.due_date||'—'}</td><td>${stBadge(r.status)}</td></tr>`).join(''):'<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:14px">無應收記錄</td></tr>'}
      </tbody></table>
      <div style="padding:8px 12px 12px;display:flex;gap:14px;font-size:12px">
        <span style="color:var(--accent2)">已收：$${fmt(paidAmt)}</span>
        <span style="color:var(--accent3)">未收：$${fmt(unpaidAmt)}</span>
      </div>
    </div>
    <div class="detail-card">
      <div class="detail-card-header">📊 損益摘要</div>
      <div style="padding:14px">
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(42,48,69,.3)"><span style="color:var(--text2)">專案收入</span><span class="td-mono" style="color:var(--accent)">$${fmt(o.total)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(42,48,69,.3)"><span style="color:var(--text2)">委外成本</span><span class="td-mono" style="color:var(--accent4)">- $${fmt(totalCost)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:700;font-size:14px;border-top:2px solid var(--border);margin-top:4px"><span>淨利</span><span class="td-mono ${profit>=0?'profit-pos':'profit-neg'}">$${fmt(profit)}</span></div>
        <div style="margin-top:12px;text-align:center">
          <div style="width:100%;height:10px;background:var(--surface2);border-radius:5px;overflow:hidden"><div style="height:100%;width:${Math.max(0,Math.min(100,pct))}%;background:${pct>=30?'linear-gradient(90deg,var(--accent2),#34d399)':pct>=0?'var(--accent3)':'var(--accent4)'};border-radius:5px;transition:width .4s"></div></div>
          <div style="margin-top:6px;font-size:12px;color:${pct>=30?'var(--accent2)':pct>=0?'var(--accent3)':'var(--accent4)'}">毛利率 ${pct}%</div>
        </div>
      </div>
    </div>
  </div>`;
}

/** 處理 renderARRows 相關操作。 */
function renderARRows(rows){
  return rows.map(r=>{
    const ov=r.status==='unpaid'&&r.due_date<today();
    return `<tr><td class="td-mono td-main">${r.order_no||'—'}</td><td class="td-main" style="max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.title||'—'}</td>
    <td><span class="badge badge-blue">${r.milestone_name||'全額'}</span></td>
    <td>${r.cn||'—'}</td>
    <td class="td-mono">$${fmt(r.amount)}</td>
    <td class="td-mono"${ov?' style="color:var(--accent4)"':''}>${r.due_date||''}</td>
    <td class="td-mono">${r.paid_date||'—'}</td>
    <td>${stBadge(ov?'overdue':r.status)}</td>
    <td><div class="td-actions">
      ${r.status==='unpaid'?`<button class="btn btn-sm btn-ghost" onclick="showEditAR(${r.id},${r.amount},'${r.due_date}','${r.milestone_name||''}',null)">編輯</button>`:''}
      ${r.status==='unpaid'?`<button class="btn btn-sm btn-success" onclick="markPaid('receivables',${r.id},null)">收款</button>`:''}
    </div></td></tr>`;
  }).join('');
}

/** 處理 renderAPRows 相關操作。 */
function renderAPRows(rows){
  return rows.map(p=>{
    const ov=p.status==='unpaid'&&p.due_date<today();
    return `<tr><td class="td-mono td-main">${p.os_no||'—'}</td><td class="td-main">${p.sn||'—'}</td><td>${p.description||'—'}</td>
    <td class="td-mono">$${fmt(p.amount)}</td>
    <td class="td-mono"${ov?' style="color:var(--accent4)"':''}>${p.due_date||''}</td>
    <td class="td-mono">${p.paid_date||'—'}</td>
    <td>${stBadge(ov?'overdue':p.status)}</td>
    <td><div class="td-actions">
      ${p.status==='unpaid'?`<button class="btn btn-sm btn-ghost" onclick="showEditAP(${p.id},${p.amount},'${p.due_date||''}')">編輯</button>`:''}
      ${p.status==='unpaid'?`<button class="btn btn-sm btn-danger" onclick="markPaid('payables',${p.id},null)">付款</button>`:''}
    </div></td></tr>`;
  }).join('');
}

/** 處理 renderCustRows 相關操作。 */
function renderCustRows(rows){
  return rows.map(c=>`<tr><td class="td-main">${c.name}</td><td class="td-mono">${c.tax_id||'—'}</td><td>${c.contact_person||'—'}</td><td>${c.job_title||'—'}</td><td class="td-mono">${c.phone||'—'}</td><td>${c.email||'—'}</td><td>${c.address||'—'}</td>
  <td><div class="td-actions"><button class="btn btn-sm btn-ghost" onclick="showEditCustomer(${c.id})">編輯</button><button class="btn btn-sm btn-danger" onclick="confirmDialog('確定刪除客戶？',()=>{exec('DELETE FROM customers WHERE id=?',[${c.id}]);toast('已刪除','success');go(cur)})">刪除</button></div></td></tr>`).join('');
}

/** 處理 renderSuppRows 相關操作。 */
function renderSuppRows(rows){
  return rows.map(s=>`<tr><td class="td-main">${s.name}</td><td class="td-mono">${s.tax_id||'—'}</td><td class="td-mono">${s.phone||'—'}</td><td>${s.email||'—'}</td><td>${s.contact||'—'}</td><td><span class="badge badge-purple">${s.specialty||'—'}</span></td>
  <td><div class="td-actions"><button class="btn btn-sm btn-ghost" onclick="showEditSupplier(${s.id})">編輯</button><button class="btn btn-sm btn-danger" onclick="confirmDialog('確定刪除廠商？',()=>{exec('DELETE FROM suppliers WHERE id=?',[${s.id}]);toast('已刪除','success');go(cur)})">刪除</button></div></td></tr>`).join('');
}

/** 處理 renderSvcRows 相關操作。 */
function renderSvcRows(rows){
  return rows.map(s=>`<tr><td class="td-main">${s.name}</td><td><span class="badge badge-blue">${s.category||'—'}</span></td><td class="td-mono">${s.unit}</td><td class="td-mono">$${fmt(s.default_price)}</td><td style="color:var(--text3);font-size:12px">${s.notes||'—'}</td>
  <td><div class="td-actions"><button class="btn btn-sm btn-ghost" onclick="showEditService(${s.id})">編輯</button><button class="btn btn-sm btn-danger" onclick="confirmDialog('確定刪除？',()=>{exec('DELETE FROM services WHERE id=?',[${s.id}]);toast('已刪除','success');go(cur)})">刪除</button></div></td></tr>`).join('');
}

/** 處理 renderOrderNotes 相關操作。 */
function renderOrderNotes(orderId){
  const notes=q("SELECT * FROM order_notes WHERE order_id=? ORDER BY id DESC",[orderId]);
  if(!notes.length) return '<div class="no-notes">尚無溝通紀錄，新增第一筆 ↓</div>';
  return notes.map(n=>`<div class="note-item">
    <div class="note-dot"></div>
    <div class="note-body">
      <div class="note-content">${n.content.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
      <div class="note-meta">${n.author||'負責人'}  ·  ${n.created_at||''}</div>
    </div>
  </div>`).join('');
}

/** 處理 renderThemePickerHTML 相關操作。 */
function renderThemePickerHTML(current){
  const themes=[
    {id:'default',  name:'靛青板岩',  sub:'深色 · 冷調藍紫', bg:'#0f1117', sb:'#181c27', bd:'#2a3045', ac:'#4f8ef7'},
    {id:'midnight', name:'午夜藍',    sub:'深色 · GitHub 風', bg:'#0d1117', sb:'#161b22', bd:'#30363d', ac:'#3b82f6'},
    {id:'warm',     name:'暖木炭',    sub:'深色 · 琥珀暖調',  bg:'#13110f', sb:'#1c1916', bd:'#2e2a25', ac:'#e07b39'},
    {id:'light',    name:'珍珠白',    sub:'亮色 · 清爽商務',  bg:'#f4f5f7', sb:'#ffffff', bd:'#d8dce6', ac:'#2563eb'},
  ];
  let out='<div class="s-section" id="theme-picker-container"><div class="s-section-title">介面外觀</div>';
  out+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:4px 0">';
  themes.forEach(t=>{
    const isActive=current===t.id;
    const textColor=t.id==='light'?'#111827':'#e8ecf4';
    const subColor=t.id==='light'?'#6b7280':'#6b7a99';
    out+='<div onclick="applyTheme(\''+t.id+'\')" style="cursor:pointer;border-radius:8px;overflow:hidden;border:2px solid '+(isActive?'var(--accent5)':t.bd)+';transition:all .2s;'+(isActive?'box-shadow:0 0 0 3px rgba(179,136,255,.15)':'')+'">'+
      '<div style="height:56px;background:'+t.bg+';display:flex;padding:8px;gap:5px">'+
        '<div style="width:24px;background:'+t.sb+';border-radius:4px;display:flex;flex-direction:column;align-items:center;padding-top:6px;gap:3px">'+
          '<div style="width:12px;height:5px;border-radius:2px;background:'+t.ac+'"></div>'+
          '<div style="width:12px;height:3px;border-radius:2px;background:'+t.bd+'"></div>'+
          '<div style="width:12px;height:3px;border-radius:2px;background:'+t.bd+'"></div>'+
        '</div>'+
        '<div style="flex:1;display:flex;flex-direction:column;gap:4px">'+
          '<div style="height:8px;width:55%;background:'+t.ac+';border-radius:2px;opacity:.9"></div>'+
          '<div style="height:5px;background:'+t.bd+';border-radius:2px;opacity:.7"></div>'+
          '<div style="height:5px;width:70%;background:'+t.bd+';border-radius:2px;opacity:.5"></div>'+
          '<div style="display:flex;gap:3px;margin-top:2px">'+
            '<div style="height:8px;flex:1;background:'+t.ac+';border-radius:2px;opacity:.25"></div>'+
            '<div style="height:8px;flex:1;background:'+t.ac+';border-radius:2px;opacity:.15"></div>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div style="padding:7px 10px;background:'+t.sb+';display:flex;align-items:center;justify-content:space-between">'+
        '<div>'+
          '<div style="font-size:12px;font-weight:600;color:'+textColor+'">'+t.name+'</div>'+
          '<div style="font-size:10px;color:'+subColor+';margin-top:1px">'+t.sub+'</div>'+
        '</div>'+
        (isActive?'<div style="width:14px;height:14px;border-radius:50%;background:'+t.ac+';display:flex;align-items:center;justify-content:center;font-size:9px;color:white;font-weight:bold">✓</div>':'')+
      '</div>'+
    '</div>';
  });
  out+='</div>';
  out+='<div style="margin-top:8px;font-size:11px;color:var(--text3)">點擊立即套用，設定自動儲存</div>';
  out+='</div>';
  return out;
}
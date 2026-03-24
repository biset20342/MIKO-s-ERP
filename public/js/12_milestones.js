/**
 * 12_milestones.js — 自動分拆模組
 * 對外暴露：...
 * 依賴：...
 */

/** 處理 showMilestoneManager 相關操作。 */
function showMilestoneManager(orderId){
  const o=q1("SELECT total FROM orders WHERE id=?",[orderId]);
  const recs=q("SELECT * FROM receivables WHERE order_id=? ORDER BY id",[orderId]);
  const total=o?.total||0;
  const paidTotal=recs.filter(r=>r.status==='paid').reduce((s,r)=>s+r.amount,0);
  const unpaidTotal=recs.filter(r=>r.status!=='paid').reduce((s,r)=>s+r.amount,0);
  window._msOrdId=orderId;
  window._msTotal=total;
  // Presets stored globally — avoids nested template literal encoding issues
  window._msPresets=[
    [{n:'全額付款',p:100}],
    [{n:'訂金 30%',p:30},{n:'尾款 70%',p:70}],
    [{n:'第一期 34%',p:34},{n:'第二期 33%',p:33},{n:'第三期 33%',p:33}],
    [{n:'訂金 40%',p:40},{n:'期中款 30%',p:30},{n:'尾款 30%',p:30}],
    [{n:'訂金 40%',p:40},{n:'期中款 40%',p:40},{n:'尾款 20%',p:20}],
  ];
  const presetLabels=['全額一次','3/7 兩期','各三分之一','4/3/3 三期','4/4/2 三期'];

  let html='<div style="margin-bottom:12px">'+
    '<div class="form-section-title">快速分配</div>'+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">';
  presetLabels.forEach((label,i)=>{
    html+='<button class="btn btn-ghost btn-sm" onclick="applyMsPreset('+i+')">'+label+'</button>';
  });
  html+='<button class="btn btn-ghost btn-sm" onclick="addCustomMsRow()">＋ 自訂</button>'+
    '</div>'+
    '<div style="font-size:11px;color:var(--text3);margin-bottom:10px">'+
    '已設定：$'+fmt(unpaidTotal+paidTotal)+'　已收：$'+fmt(paidTotal)+'　未收：$'+fmt(unpaidTotal)+
    '</div></div>'+
    '<div class="form-section-title">現有里程碑</div>'+
    '<div id="ms-edit-list">';

  if(recs.length){
    recs.forEach(r=>{
      const ov=r.status==='unpaid'&&r.due_date<today();
      const isPaid=r.status==='paid';
      const dotColor=isPaid?'var(--accent2)':ov?'var(--accent4)':'var(--accent3)';
      const inpStyle='padding:5px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;outline:none;font-family:sans-serif';
      html+='<div style="margin-bottom:8px;border-bottom:1px solid var(--border);padding-bottom:8px">'+
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">'+
        '<div style="width:8px;height:8px;border-radius:50%;background:'+dotColor+';flex-shrink:0"></div>'+
        '<span style="flex:1;font-weight:500;font-size:13px">'+(r.milestone_name||'付款')+'</span>'+
        '<span style="font-family:monospace;font-size:12.5px">$'+fmt(r.amount)+'</span>'+
        stBadge(isPaid?'paid':ov?'overdue':'unpaid');
      if(!isPaid) html+='<button class="btn btn-sm btn-success" onclick="markPaidNoClose('+r.id+','+orderId+')">收款</button>';
      html+='</div>';
      if(!isPaid){
        html+='<div style="display:grid;grid-template-columns:1fr 120px 130px 56px 44px;gap:4px;align-items:center">'+
          '<input type="text" value="'+escQ(r.milestone_name||'')+'" id="msn-'+r.id+'" placeholder="名稱" style="'+inpStyle+'">'+
          '<input type="number" value="'+r.amount+'" id="msa-'+r.id+'" step="0.01" style="'+inpStyle+'">'+
          '<input type="date" value="'+(r.due_date||'')+'" id="msd-'+r.id+'" style="'+inpStyle+'">'+
          '<button class="btn btn-sm btn-ghost" onclick="saveMsRow('+r.id+','+orderId+')">儲存</button>'+
          '<button class="btn btn-sm btn-danger" onclick="deleteMsInline('+r.id+','+orderId+')">刪</button>'+
          '</div>';
      } else {
        // Paid milestone: show paid_date with edit
        html+='<div style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;margin-top:2px">'+
          '<span style="font-size:11px;color:var(--text3)">收款日：</span>'+
          '<input type="date" value="'+(r.paid_date||'')+'" id="mspd-'+r.id+'" style="'+inpStyle+';max-width:150px">'+
          '<button class="btn btn-sm btn-ghost" style="font-size:11px" onclick="savePaidDate('+r.id+','+orderId+')">更新日期</button>'+
          '</div>';
      }
      html+='</div>';
    });
  } else {
    html+='<div style="color:var(--text3);font-size:12px;padding:8px 0">尚無收款記錄</div>';
  }
  html+='</div><div id="ms-new-rows"></div>'+
    '<div class="form-note" style="margin-top:8px">提示：點「快速分配」可自動新增未收款里程碑</div>';

  openModal('收款里程碑管理 — 訂單總額 $'+fmt(total), html, null);
}

/** 處理 saveMsRow 相關操作。 */
function saveMsRow(recId,orderId){
  const nm=document.getElementById('msn-'+recId)?.value?.trim()||'付款';
  const amt=parseFloat(document.getElementById('msa-'+recId)?.value)||0;
  const due=document.getElementById('msd-'+recId)?.value;
  if(!due){toast('請填寫到期日','error');return;}
  exec("UPDATE receivables SET milestone_name=?,amount=?,due_date=? WHERE id=?",[nm,amt,due,recId]);
  toast('已儲存','success');
  showMilestoneManager(orderId);
}

/** 處理 deleteMsInline 相關操作。 */
function deleteMsInline(recId,orderId){
  exec("DELETE FROM receivables WHERE id=?",[recId]);
  toast('里程碑已刪除','success');
  showMilestoneManager(orderId);
}

/** 處理 markPaidNoClose 相關操作。 */
function markPaidNoClose(recId,orderId){
  const rec=q1("SELECT r.*,o.order_no,o.title,c.name as cn FROM receivables r LEFT JOIN orders o ON r.order_id=o.id LEFT JOIN customers c ON o.customer_id=c.id WHERE r.id=?",[recId]);
  exec("UPDATE receivables SET status='paid',paid_date=date('now') WHERE id=?",[recId]);
  if(rec) logActivity('receivable','收款：'+(rec.milestone_name||'付款'),rec.order_id,rec.order_no,rec.title,rec.amount,rec.cn,'');
  toast('已標記收款','success');
  showMilestoneManager(orderId);
}

/** 處理 savePaidDate 相關操作。 */
function savePaidDate(recId,orderId){
  const el=document.getElementById('mspd-'+recId);
  const dt=el?.value||'';
  exec("UPDATE receivables SET paid_date=? WHERE id=?",[dt||null,recId]);
  toast('收款日期已更新','success');
  showMilestoneManager(orderId);
}

/** 處理 addCustomMsRow 相關操作。 */
function addCustomMsRow(){
  const c=document.getElementById('ms-new-rows');if(!c)return;
  const idx=Date.now();
  const defPay=parseInt(getSetting('default_payment_days','30'));
  const d=document.createElement('div');
  d.id='ms-new-'+idx;
  d.style.cssText='display:grid;grid-template-columns:1fr 130px 130px auto auto;gap:5px;align-items:center;margin-bottom:5px';
  d.innerHTML=`<input type="text" class="ms-new-name" placeholder="里程碑名稱" style="padding:5px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;font-family:'Noto Sans TC',sans-serif;outline:none">
    <input type="number" class="ms-new-amt" step="0.01" placeholder="金額" style="padding:5px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;font-family:'Noto Sans TC',sans-serif;outline:none">
    <input type="date" class="ms-new-due" value="${addDays(today(),defPay)}" style="padding:5px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;font-family:'Noto Sans TC',sans-serif;outline:none">
    <button class="btn btn-sm btn-success" onclick="saveNewMsRow(this)">新增</button>
    <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">✕</button>`;
  c.appendChild(d);
}

/** 處理 saveNewMsRow 相關操作。 */
function saveNewMsRow(btn){
  const orderId=window._msOrdId;
  if(!orderId){toast('錯誤：找不到訂單 ID','error');return;}
  const row=btn.parentElement;
  const nm=row.querySelector('.ms-new-name')?.value?.trim();
  const amt=parseFloat(row.querySelector('.ms-new-amt')?.value)||0;
  const due=row.querySelector('.ms-new-due')?.value;
  if(!nm||!amt||!due){toast('請填寫名稱、金額與到期日','error');return;}
  exec("INSERT INTO receivables(order_id,milestone_name,amount,due_date,status) VALUES(?,?,?,?,'unpaid')",[orderId,nm,amt,due]);
  toast('里程碑已新增','success');
  showMilestoneManager(orderId);
}

/** 處理 applyMsPreset 相關操作。 */
function applyMsPreset(idx){
  const orderId=window._msOrdId;
  const total=window._msTotal||0;
  const parts=window._msPresets&&window._msPresets[idx];
  if(!orderId||!parts){toast('錯誤：找不到訂單或預設值','error');return;}
  const defPay=parseInt(getSetting('default_payment_days','30'));
  exec("DELETE FROM receivables WHERE order_id=? AND status='unpaid'",[orderId]);
  parts.forEach((p,i)=>{
    const amt=Math.round(total*p.p/100*100)/100;
    const due=addDays(today(),(i+1)*defPay);
    exec("INSERT INTO receivables(order_id,milestone_name,amount,due_date,status) VALUES(?,?,?,?,'unpaid')",[orderId,p.n,amt,due]);
  });
  toast('里程碑已依比例分配','success');
  showMilestoneManager(orderId);
}

/** 處理 deleteMilestone 相關操作。 */
function deleteMilestone(recId, orderId){
  confirmDialog('確定要刪除此收款里程碑嗎？',()=>{
    exec("DELETE FROM receivables WHERE id=?",[recId]);
    toast('里程碑已刪除','success');
    closeModal();
    showOrderDetail(orderId);
  });
}

/** 處理 showAddMilestone 相關操作。 */
function showAddMilestone(orderId){
  window._msOrdId=orderId;
  showMilestoneManager(orderId);
}
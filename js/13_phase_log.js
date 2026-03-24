/**
 * 13_phase_log.js — 自動分拆模組
 * 對外暴露：...
 * 依賴：...
 */

/** 處理 renderPhaseBar 相關操作。 */
function renderPhaseBar(orderId, phIdx, currentPhase){
  const activePHASES=PHASES.filter(p=>p.key!=='cancelled');
  const isCancelled=currentPhase==='cancelled';

  // Icons for each phase
  const phIcons={pending:'⏳',designing:'✏️',outsourcing:'🏭',reviewing:'🔍',delivering:'📦',completed:'✓'};

  // Calculate progress fill width %
  const fillPct=isCancelled?0:(phIdx/(activePHASES.length-1)*100);

  let out='<div class="ph-track">';
  // Background connector line + fill
  out+='<div class="ph-progress-line">'+
    '<div class="ph-progress-fill" style="width:'+fillPct+'%"></div>'+
    '</div>';
  out+='<div class="ph-nodes">';

  activePHASES.forEach((p,i)=>{
    const done=!isCancelled&&i<phIdx;
    const act=!isCancelled&&p.key===currentPhase;
    const state=done?'done':act?'active':'upcoming';

    const log=q1("SELECT entered_at FROM phase_log WHERE order_id=? AND phase=? ORDER BY id DESC LIMIT 1",[orderId,p.key]);
    const raw=log?.entered_at||'';
    // Format: MM/DD HH:mm
    let display='';
    if(raw){
      const d=raw.substring(5,10); // MM-DD
      const t=raw.substring(11,16); // HH:mm
      display=d.replace('-','/')+' '+t;
    }

    const dotInner=done?'<span style="font-size:13px">✓</span>':
                   act?'<span style="font-size:11px;font-weight:700">●</span>':
                   '<span style="font-size:10px">'+( i+1)+'</span>';

    out+='<div class="ph-node" onclick="setPhase('+orderId+',\''+p.key+'\')" title="點擊切換至 '+p.label+'">';
    out+='<div class="ph-dot '+state+'">'+dotInner+'</div>';
    out+='<div class="ph-node-label '+state+'">'+p.label+'</div>';
    out+='<div class="ph-ts-wrap" id="ptw-'+orderId+'-'+p.key+'">';
    if(display){
      out+='<div class="ph-ts recorded" id="pt-'+orderId+'-'+p.key+'" '+
           'onclick="event.stopPropagation();editPhaseTime('+orderId+',\''+p.key+'\')" '+
           'title="點擊修改時間">'+display+'</div>';
    } else if(done||act){
      out+='<div class="ph-ts-empty" id="pt-'+orderId+'-'+p.key+'" '+
           'onclick="event.stopPropagation();editPhaseTime('+orderId+',\''+p.key+'\')" '+
           'title="點擊記錄時間">記錄時間</div>';
    } else {
      out+='<div id="pt-'+orderId+'-'+p.key+'" style="min-height:20px"></div>';
    }
    out+='</div></div>';
  });

  out+='</div>';

  // Cancelled banner
  if(isCancelled){
    const clog=q1("SELECT entered_at FROM phase_log WHERE order_id=? AND phase='cancelled' ORDER BY id DESC LIMIT 1",[orderId]);
    const ct=clog?.entered_at?clog.entered_at.substring(0,16).replace('T',' '):'';
    out+='<div class="ph-cancelled">'+
      '<span style="font-size:14px">✕</span>'+
      '<span>已取消</span>'+
      (ct?'<span style="opacity:.6;font-size:11px;font-family:\'DM Mono\',monospace;margin-left:auto">'+ct+'</span>':'')+
      '</div>';
  }

  out+='</div>';
  return out;
}

/** 處理 setPhase 相關操作。 */
function setPhase(id,phase){
  const o=q1("SELECT order_no,title,phase FROM orders WHERE id=?",[id]);
  const now=q1("SELECT datetime('now','localtime') as dt")?.dt||today()+' 00:00';
  const oldPhaseIdx=PHASES.findIndex(p=>p.key===(o?.phase||''));
  const newPhaseIdx=PHASES.findIndex(p=>p.key===phase);
  const isRollback=newPhaseIdx<oldPhaseIdx;

  exec("UPDATE orders SET phase=? WHERE id=?",[phase,id]);

  // If rolling back, delete phase_log entries for all phases AFTER the new phase
  if(isRollback){
    const phasesAfter=PHASES.slice(newPhaseIdx+1).map(p=>p.key);
    phasesAfter.forEach(pk=>{
      exec("DELETE FROM phase_log WHERE order_id=? AND phase=?",[id,pk]);
    });
  }

  // Upsert log for the selected phase
  const existing=q1("SELECT id FROM phase_log WHERE order_id=? AND phase=?",[id,phase]);
  if(existing){
    exec("UPDATE phase_log SET entered_at=? WHERE id=?",[now,existing.id]);
  } else {
    exec("INSERT INTO phase_log(order_id,phase,entered_at,note) VALUES(?,?,?,?)",[id,phase,now,'']);
  }

  const phLabel=PHASES.find(p=>p.key===phase)?.label||phase;
  if(typeof logActivity==='function') logActivity('order','更新專案階段：'+phLabel+(isRollback?' （退回）':''),id,o?.order_no,o?.title,null,null,'');
  toast(phLabel+(isRollback?' ↩ 已退回':'  ✓'),'success');

  // Refresh phase bar inside modal
  const bar=document.getElementById('phase-bar-'+id);
  if(bar) bar.innerHTML=renderPhaseBar(id,newPhaseIdx,phase);
  // Refresh list badge
  const badgeCell=document.getElementById('ph-badge-'+id);
  if(badgeCell) badgeCell.innerHTML=phBadge(phase);
  const dashRow=document.getElementById('dash-phase-'+id);
  if(dashRow) dashRow.innerHTML=phBadge(phase);
}

/** 處理 editPhaseTime 相關操作。 */
function editPhaseTime(orderId, phase){
  const elId='pt-'+orderId+'-'+phase;
  const el=document.getElementById(elId);
  if(!el||el.querySelector('input'))return;
  const log=q1("SELECT entered_at FROM phase_log WHERE order_id=? AND phase=? ORDER BY id DESC LIMIT 1",[orderId,phase]);
  const current=(log?.entered_at||'').replace(' ','T').substring(0,16);
  const phLabel=PHASES.find(p=>p.key===phase)?.label||phase;
  el.innerHTML=
    '<input type="datetime-local" class="ph-ts-input" value="'+current+'" '+
    'onblur="savePhaseTime('+orderId+',\''+phase+'\',this.value)" '+
    'onkeydown="if(event.key===\'Enter\')this.blur();if(event.key===\'Escape\'){this.value=\''+current+'\';this.blur();}" '+
    'title="'+phLabel+' 時間">';
  el.querySelector('input').focus();
}

/** 處理 savePhaseTime 相關操作。 */
function savePhaseTime(orderId, phase, value){
  const dt=(value||'').replace('T',' ');
  const el=document.getElementById('pt-'+orderId+'-'+phase);
  if(dt){
    const existing=q1("SELECT id FROM phase_log WHERE order_id=? AND phase=?",[orderId,phase]);
    if(existing){
      exec("UPDATE phase_log SET entered_at=? WHERE id=?",[dt,existing.id]);
    } else {
      exec("INSERT INTO phase_log(order_id,phase,entered_at,note) VALUES(?,?,?,?)",[orderId,phase,dt,'']);
    }
    toast('時間已更新','success');
  }
  if(el){
    const log=q1("SELECT entered_at FROM phase_log WHERE order_id=? AND phase=?",[orderId,phase]);
    const raw=log?.entered_at||'';
    if(raw){
      const d=raw.substring(5,10).replace('-','/');
      const t=raw.substring(11,16);
      el.className='ph-ts recorded';
      el.title='點擊修改時間';
      el.onclick=function(){event.stopPropagation();editPhaseTime(orderId,phase);};
      el.innerHTML=d+' '+t;
    } else {
      el.className='ph-ts-empty';
      el.title='點擊記錄時間';
      el.onclick=function(){event.stopPropagation();editPhaseTime(orderId,phase);};
      el.innerHTML='記錄時間';
    }
  }
}

/** 處理 showPhaseLog 相關操作。 */
function showPhaseLog(orderId){
  const o=q1("SELECT order_no,title,phase FROM orders WHERE id=?",[orderId]);
  const logs=q("SELECT * FROM phase_log WHERE order_id=? ORDER BY entered_at ASC",[orderId]);
  // Build a complete list: all phases, matched with log entries
  const iStyle='padding:4px 8px;background:var(--surface2);border:1px solid var(--border);border-radius:5px;color:var(--text);font-size:12px;font-family:\'DM Mono\',monospace;outline:none;width:155px';

  let rows='';
  PHASES.forEach(ph=>{
    const log=logs.find(l=>l.phase===ph.key);
    const isDone=log||ph.key===o.phase;
    rows+='<tr>'+
      '<td><span class="badge '+(ph.key===o.phase?'badge-blue':isDone?'badge-green':'badge-gray')+'">'+ph.label+'</span></td>'+
      '<td class="td-mono" style="font-size:12px">'+(isDone?'<input type="datetime-local" value="'+(log?.entered_at||'').replace(' ','T')+'" id="phlog-'+ph.key+'" style="'+iStyle+'" onchange="savePhaseLog('+orderId+',\''+ph.key+'\',this.value)">':'<span style="color:var(--text3)">未到達</span>')+'</td>'+
      '<td><input type="text" value="'+(log?.note||'')+'" id="phnote-'+ph.key+'" placeholder="備注（選填）" style="'+iStyle+';width:auto;flex:1" onchange="savePhaseLog('+orderId+',\''+ph.key+'\',document.getElementById(\'phlog-'+ph.key+'\')?.value||\'\')" oninput="void 0"></td>'+
      '<td style="text-align:right">'+
        (isDone&&ph.key!==o.phase?'':'')+ // already rendered via onchange
        (isDone?'<button class="btn btn-sm btn-ghost" onclick="savePhaseLogRow('+orderId+',\''+ph.key+'\')" style="font-size:11px">儲存</button>':
        '<button class="btn btn-sm btn-ghost" style="font-size:11px" onclick="insertPhaseLog('+orderId+',\''+ph.key+'\')">記錄</button>')+
      '</td>'+
    '</tr>';
  });

  openModal('階段時間紀錄 — '+o.order_no+' '+o.title,
    '<div style="font-size:12px;color:var(--text3);margin-bottom:10px">可手動補記或修改各階段完成時間</div>'+
    '<table><thead><tr><th>階段</th><th>完成時間</th><th>備注</th><th></th></tr></thead><tbody>'+rows+'</tbody></table>',
    null);
}

/** 處理 savePhaseLogRow 相關操作。 */
function savePhaseLogRow(orderId,phase){
  const dtEl=document.getElementById('phlog-'+phase);
  const noteEl=document.getElementById('phnote-'+phase);
  const dt=(dtEl?.value||'').replace('T',' ');
  const note=noteEl?.value||'';
  if(!dt){toast('請填寫時間','error');return;}
  const existing=q1("SELECT id FROM phase_log WHERE order_id=? AND phase=?",[orderId,phase]);
  if(existing){
    exec("UPDATE phase_log SET entered_at=?,note=? WHERE id=?",[dt,note,existing.id]);
  } else {
    exec("INSERT INTO phase_log(order_id,phase,entered_at,note) VALUES(?,?,?,?)",[orderId,phase,dt,note]);
  }
  toast('已儲存','success');
}

/** 處理 insertPhaseLog 相關操作。 */
function insertPhaseLog(orderId,phase){
  const now=q1("SELECT datetime('now','localtime') as dt")?.dt||today();
  exec("INSERT OR IGNORE INTO phase_log(order_id,phase,entered_at,note) VALUES(?,?,?,?)",[orderId,phase,now,'']);
  showPhaseLog(orderId);
}

/** 處理 toggleDeliv 相關操作。 */
function toggleDeliv(oid,idx){
  const o=q1("SELECT deliverables FROM orders WHERE id=?",[oid]);
  let d=[];try{d=JSON.parse(o.deliverables||'[]');}catch(e){}
  if(d[idx])d[idx].done=!d[idx].done;
  exec("UPDATE orders SET deliverables=? WHERE id=?",[JSON.stringify(d),oid]);
  const el=document.getElementById(`dlv-${oid}`);
  if(el)el.innerHTML=d.map((dv,i)=>`<div class="deliv-item"><div class="deliv-check${dv.done?' done':''}" onclick="toggleDeliv(${oid},${i})">${dv.done?'✓':''}</div><div class="deliv-text${dv.done?' done':''}">${dv.text}</div></div>`).join('');
}